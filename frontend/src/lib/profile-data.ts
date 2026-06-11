import {
  api,
  type ConflictOfInterest,
  type ConflictSeverity,
  type GraphData,
  type GraphNode,
  type KaranteneDecision,
  type PersonDetails,
  type PersonPosition,
  type PositionTimeline,
  type TimelinePosition,
} from "./api";

export interface ProfileData {
  personId: string;
  /** Null when the person can't be found at all. */
  details: PersonDetails | null;
  timeline: PositionTimeline | null;
  conflicts: ConflictOfInterest[];
  karantene: KaranteneDecision[];
  network: GraphData | null;
  metrics: ProfileMetrics;
  /** true if any sub-fetch failed. */
  partial: boolean;
}

export interface ProfileMetrics {
  conflictScore: number;
  riskLevel: ConflictSeverity;
  connections: number;
  tenureYears: number;
  boardSeats: number;
  pastRoleCount: number;
  revolvingDoorGapDays: number | null;
  primaryRiskMessage: string | null;
}

const SEVERITY_WEIGHTS: Record<ConflictSeverity, number> = {
  critical: 40,
  high: 25,
  medium: 15,
  low: 5,
};

const KARANTENE_WEIGHT = 12;
const KARANTENE_CAP = 36;
const MAX_SCORE = 100;

/**
 * Compute a 0-100 conflict score from registered conflicts + karantene cases.
 * Pure function — safe to unit test.
 */
export function computeConflictScore(
  conflicts: ConflictOfInterest[],
  karantene: KaranteneDecision[],
): { score: number; risk: ConflictSeverity } {
  let raw = 0;
  for (const c of conflicts) raw += SEVERITY_WEIGHTS[c.severity] ?? 0;
  const karanteneScore = Math.min(karantene.length * KARANTENE_WEIGHT, KARANTENE_CAP);
  raw += karanteneScore;
  const score = Math.min(MAX_SCORE, raw);
  let risk: ConflictSeverity;
  if (score >= 75) risk = "critical";
  else if (score >= 50) risk = "high";
  else if (score >= 25) risk = "medium";
  else risk = "low";
  return { score, risk };
}

/**
 * Find the most consequential public→private revolving-door transition
 * and return the gap between roles in days (negative or zero means overlap).
 */
export function detectRevolvingDoorGap(
  timeline: PositionTimeline | null,
): number | null {
  if (!timeline) return null;
  const positions = timeline.positions;
  const publicLike = (c: TimelinePosition["category"]) =>
    c === "political" || c === "government";
  const privateLike = (c: TimelinePosition["category"]) =>
    c === "board" || c === "executive";

  let bestGap: number | null = null;
  for (const ended of positions) {
    if (!publicLike(ended.category) || ended.endYear == null) continue;
    for (const started of positions) {
      if (started === ended) continue;
      if (!privateLike(started.category) || started.startYear == null) continue;
      const gapYears = started.startYear - ended.endYear;
      if (gapYears < 0 || gapYears > 1) continue;
      const gapDays = gapYears * 365;
      if (bestGap == null || gapDays < bestGap) bestGap = gapDays;
    }
  }
  return bestGap;
}

export function computeTenureYears(
  details: PersonDetails | null,
  timeline: PositionTimeline | null,
): number {
  const all: { startYear?: number; endYear?: number | null }[] = [];
  if (details) {
    all.push(
      ...details.currentPositions.filter(
        (p) => p.type === "political" || p.type === "government",
      ),
      ...details.pastPositions.filter(
        (p) => p.type === "political" || p.type === "government",
      ),
    );
  }
  if (timeline) {
    all.push(
      ...timeline.positions.filter(
        (p) => p.category === "political" || p.category === "government",
      ),
    );
  }
  if (all.length === 0) return 0;
  const now = new Date().getFullYear();
  // Build a set of years to avoid double-counting overlapping mandates.
  const years = new Set<number>();
  for (const p of all) {
    if (!p.startYear) continue;
    const end = p.endYear ?? now;
    for (let y = p.startYear; y <= end; y++) years.add(y);
  }
  return years.size;
}

export function bucketPositions(details: PersonDetails | null): {
  current: PersonPosition[];
  past: PersonPosition[];
} {
  if (!details) return { current: [], past: [] };
  return { current: details.currentPositions, past: details.pastPositions };
}

export function countBoardSeats(details: PersonDetails | null): number {
  if (!details) return 0;
  return [
    ...details.currentPositions,
    ...details.pastPositions,
  ].filter((p) => p.type === "private" || p.type === "board").length;
}

function countConnections(network: GraphData | null, personId: string): number {
  if (!network) return 0;
  const seen = new Set<string>();
  for (const l of network.links) {
    const src = typeof l.source === "string" ? l.source : (l.source as GraphNode).id;
    const tgt = typeof l.target === "string" ? l.target : (l.target as GraphNode).id;
    if (src === personId) seen.add(tgt);
    else if (tgt === personId) seen.add(src);
  }
  return seen.size;
}

function buildRiskMessage(
  risk: ConflictSeverity,
  conflicts: ConflictOfInterest[],
): string | null {
  if (conflicts.length === 0) return null;
  const sectors = Array.from(new Set(conflicts.map((c) => c.sector))).slice(0, 2);
  const sectorText = sectors.length ? ` i ${sectors.join(", ")}` : "";
  if (risk === "critical" || risk === "high") {
    return `Høy risiko for svingdør${sectorText}`;
  }
  if (risk === "medium") {
    return `Moderat risiko for svingdør${sectorText}`;
  }
  return null;
}

/** Combined load with per-section failure isolation. */
export async function loadProfile(personId: string): Promise<ProfileData> {
  const [detailsR, timelineR, conflictsR, karanteneR, networkR] =
    await Promise.allSettled([
      api.personDetails(personId),
      api.timeline(personId),
      api.conflictsForPerson(personId),
      api.karantene(personId),
      api.personNetwork(personId),
    ]);

  const details = detailsR.status === "fulfilled" ? detailsR.value : null;
  const timeline = timelineR.status === "fulfilled" ? timelineR.value : null;
  const conflictsRaw = conflictsR.status === "fulfilled" ? conflictsR.value : [];
  const conflicts = Array.isArray(conflictsRaw) ? conflictsRaw : [];
  const karanteneRaw = karanteneR.status === "fulfilled" ? karanteneR.value : [];
  const karantene = Array.isArray(karanteneRaw) ? karanteneRaw : [];
  const network = networkR.status === "fulfilled" ? networkR.value : null;

  const { score, risk } = computeConflictScore(conflicts, karantene);
  const tenureYears = computeTenureYears(details, timeline);
  const boardSeats = countBoardSeats(details);
  const pastRoleCount = details?.pastPositions.length ?? 0;
  const connections = countConnections(network, personId);
  const revolvingDoorGapDays = detectRevolvingDoorGap(timeline);
  const primaryRiskMessage = buildRiskMessage(risk, conflicts);

  const partial =
    detailsR.status === "rejected" ||
    timelineR.status === "rejected" ||
    conflictsR.status === "rejected" ||
    karanteneR.status === "rejected" ||
    networkR.status === "rejected";

  return {
    personId,
    details,
    timeline,
    conflicts,
    karantene,
    network,
    metrics: {
      conflictScore: score,
      riskLevel: risk,
      connections,
      tenureYears,
      boardSeats,
      pastRoleCount,
      revolvingDoorGapDays,
      primaryRiskMessage,
    },
    partial,
  };
}

/** Helper used by the timeline view. Sorts ascending by startYear. */
export function sortTimelinePositions(
  positions: TimelinePosition[],
): TimelinePosition[] {
  return [...positions].sort((a, b) => a.startYear - b.startYear);
}
