import {
  api,
  type ConflictOfInterest,
  type ConflictSeverity,
  type GraphData,
  type KaranteneDecision,
  type PositionTimeline,
  type TimelinePosition,
} from "./api";

export interface RevolvingDoorTransition {
  personId: string;
  personName: string;
  fromOrg: string;
  fromRole: string;
  fromCategory: TimelinePosition["category"];
  toOrg: string;
  toRole: string;
  toCategory: TimelinePosition["category"];
  endYear: number;
  startYear: number;
}

export interface DashboardStats {
  investigations: number;
  revolvingDoor: number;
  activeAlerts: number;
}

export interface DashboardData {
  stats: DashboardStats;
  feed: RevolvingDoorTransition[];
  ranking: ConflictOfInterest[];
  /** True when at least one section failed to load. */
  partial: boolean;
}

const SEVERITY_RANK: Record<ConflictSeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

/** Years counted as "recent" for the active-alerts stat. */
export const RECENT_TRANSITION_WINDOW_YEARS = 2;

/**
 * Detect revolving-door transitions inside a single person's timeline.
 * Rules:
 *  - both positions need a real endYear/startYear
 *  - the gap must be 0 or 1 year (ended same year or year after)
 *  - prefer transitions where political/government -> board/executive
 *  - dedupe identical (from -> to) pairs in the same year
 */
export function deriveRevolvingDoorFeed(
  timelines: PositionTimeline[],
  limit = 6,
): RevolvingDoorTransition[] {
  const out: RevolvingDoorTransition[] = [];

  for (const tl of timelines) {
    const ended = tl.positions.filter(
      (p): p is TimelinePosition & { endYear: number } => p.endYear != null,
    );

    for (const e of ended) {
      const candidates = tl.positions.filter(
        (s) =>
          s !== e &&
          s.startYear != null &&
          (s.startYear === e.endYear || s.startYear === e.endYear + 1),
      );
      for (const s of candidates) {
        // Prefer the political -> board flow but include all transitions.
        out.push({
          personId: tl.personId,
          personName: tl.personName,
          fromOrg: e.orgName,
          fromRole: e.role,
          fromCategory: e.category,
          toOrg: s.orgName,
          toRole: s.role,
          toCategory: s.category,
          endYear: e.endYear,
          startYear: s.startYear,
        });
      }
    }
  }

  const seen = new Set<string>();
  const unique = out.filter((t) => {
    const k = `${t.personId}|${t.fromOrg}|${t.toOrg}|${t.endYear}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  unique.sort((a, b) => {
    if (b.endYear !== a.endYear) return b.endYear - a.endYear;
    return b.startYear - a.startYear;
  });

  return unique.slice(0, limit);
}

export function topConflicts(
  conflicts: ConflictOfInterest[],
  limit = 8,
): ConflictOfInterest[] {
  return [...conflicts]
    .sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity])
    .slice(0, limit);
}

export function computeStats(
  overview: GraphData | null,
  conflicts: ConflictOfInterest[] | null,
  feed: RevolvingDoorTransition[],
  karantene: KaranteneDecision[] | null,
  now: number = new Date().getFullYear(),
): DashboardStats {
  const people = overview
    ? overview.nodes.filter((n) => n.type === "person").length
    : 0;
  const revolving = (conflicts ?? []).filter(
    (c) => c.conflictType === "revolving_door",
  ).length;
  const recentTransitions = feed.filter(
    (t) => t.endYear >= now - RECENT_TRANSITION_WINDOW_YEARS,
  ).length;
  const activeAlerts = (karantene?.length ?? 0) + recentTransitions;
  return {
    investigations: people,
    revolvingDoor: revolving,
    activeAlerts,
  };
}

/**
 * Fetch all dashboard data with per-section failure isolation. A failed
 * section returns null/[] instead of throwing the whole page.
 */
export async function loadDashboardData(): Promise<DashboardData> {
  const [overviewR, conflictsR, timelinesR, karanteneR] =
    await Promise.allSettled([
      api.overview(),
      api.conflicts(),
      api.timelines(),
      api.karanteneList(),
    ]);

  const overview = overviewR.status === "fulfilled" ? overviewR.value : null;
  const conflicts = conflictsR.status === "fulfilled" ? conflictsR.value : null;
  const timelines = timelinesR.status === "fulfilled" ? timelinesR.value : null;
  const karantene = karanteneR.status === "fulfilled" ? karanteneR.value : null;

  const feed = deriveRevolvingDoorFeed(timelines ?? []);
  const ranking = topConflicts(conflicts ?? []);
  const stats = computeStats(overview, conflicts, feed, karantene);
  const partial =
    overviewR.status === "rejected" ||
    conflictsR.status === "rejected" ||
    timelinesR.status === "rejected" ||
    karanteneR.status === "rejected";

  return { stats, feed, ranking, partial };
}
