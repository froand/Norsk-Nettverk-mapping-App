import {
  api,
  type ConflictOfInterest,
  type ConflictSeverity,
  type GraphData,
  type GraphLink,
  type GraphNode,
  type KaranteneDecision,
} from "./api";

export type DirectoryTag =
  | "revolving_door"
  | "active_conflict"
  | "karantene"
  | "clean";

export interface DirectoryRow {
  personId: string;
  name: string;
  topRoleLabel: string | null;
  topRoleOrg: string | null;
  party: string | null;
  connections: number;
  boardCount: number;
  politicalCount: number;
  karanteneCount: number;
  conflictCount: number;
  highestSeverity: ConflictSeverity | null;
  score: number;
  tag: DirectoryTag;
}

export interface KatalogData {
  rows: DirectoryRow[];
  partial: boolean;
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
const SEVERITY_RANK: Record<ConflictSeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

function linkEndpoints(l: GraphLink): { source: string; target: string } {
  const source = typeof l.source === "string" ? l.source : (l.source as GraphNode).id;
  const target = typeof l.target === "string" ? l.target : (l.target as GraphNode).id;
  return { source, target };
}

/**
 * Score is the same model as the profile screen so cross-screen numbers match:
 * sum(severityWeight) + min(karantene*12, 36), capped at 100.
 */
function computeScore(
  conflicts: ConflictOfInterest[],
  karanteneCount: number,
): number {
  let raw = 0;
  for (const c of conflicts) raw += SEVERITY_WEIGHTS[c.severity] ?? 0;
  raw += Math.min(karanteneCount * KARANTENE_WEIGHT, KARANTENE_CAP);
  return Math.min(MAX_SCORE, raw);
}

function highestSeverity(conflicts: ConflictOfInterest[]): ConflictSeverity | null {
  let best: ConflictSeverity | null = null;
  for (const c of conflicts) {
    if (!best || SEVERITY_RANK[c.severity] > SEVERITY_RANK[best]) best = c.severity;
  }
  return best;
}

function pickTag(
  conflicts: ConflictOfInterest[],
  karanteneCount: number,
): DirectoryTag {
  if (conflicts.some((c) => c.conflictType === "revolving_door")) {
    return "revolving_door";
  }
  if (karanteneCount > 0) return "karantene";
  if (conflicts.length > 0) return "active_conflict";
  return "clean";
}

/**
 * Find the most senior role label for a person. We prefer political/government
 * over executive/board (the "headline" role for an investigative directory).
 */
function pickTopRole(
  personId: string,
  links: GraphLink[],
  nodeById: Map<string, GraphNode>,
): { label: string | null; orgName: string | null; party: string | null } {
  let topLabel: string | null = null;
  let topOrg: string | null = null;
  let topPriority = -1;
  let party: string | null = null;

  for (const l of links) {
    const { source, target } = linkEndpoints(l);
    if (source !== personId) continue;
    const orgNode = nodeById.get(target);
    if (!orgNode) continue;

    if (orgNode.type === "political_party" && !party) {
      party = orgNode.name;
    }

    const priority = rolePriority(l.category, l.label, orgNode.type);
    if (priority > topPriority) {
      topPriority = priority;
      topLabel = l.label;
      topOrg = orgNode.name;
    }
  }
  return { label: topLabel, orgName: topOrg, party };
}

function rolePriority(
  category: GraphLink["category"],
  label: string,
  orgType: GraphNode["type"],
): number {
  // Government/minister-level beats everything else.
  if (category === "government") return 100;
  if (category === "political") {
    if (/minister|statsråd/i.test(label)) return 95;
    if (orgType === "political_party") return 60; // party membership is less informative
    return 80;
  }
  if (category === "executive") return 70;
  if (category === "board") return 50;
  return 10;
}

function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    // strip diacritics
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .replace(/å/g, "a")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Index karantene records by a derived person key so we can match them to
 * overview persons by name even though karantene records have no personId.
 */
export function indexKaranteneByName(
  karantene: KaranteneDecision[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const k of karantene) {
    const key = slugifyName(k.personName);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/**
 * Build the directory rows. Pure (no I/O) so it can be unit-tested.
 * If a section is missing (e.g. overview failed), returns an empty array.
 */
export function buildDirectoryRows(
  overview: GraphData | null,
  conflicts: ConflictOfInterest[],
  karantene: KaranteneDecision[],
): DirectoryRow[] {
  if (!overview) return [];

  const nodeById = new Map<string, GraphNode>();
  for (const n of overview.nodes) nodeById.set(n.id, n);

  const conflictsByPerson = new Map<string, ConflictOfInterest[]>();
  for (const c of conflicts) {
    const arr = conflictsByPerson.get(c.personId) ?? [];
    arr.push(c);
    conflictsByPerson.set(c.personId, arr);
  }

  const karanteneByNameSlug = indexKaranteneByName(karantene);

  const persons = overview.nodes.filter((n) => n.type === "person");
  const rows: DirectoryRow[] = [];

  for (const person of persons) {
    const personLinks = overview.links.filter((l) => {
      const { source, target } = linkEndpoints(l);
      return source === person.id || target === person.id;
    });

    const outgoing = personLinks.filter((l) => {
      const { source } = linkEndpoints(l);
      return source === person.id;
    });

    const boardCount = outgoing.filter(
      (l) => l.category === "board" || l.category === "executive",
    ).length;
    const politicalCount = outgoing.filter(
      (l) => l.category === "political" || l.category === "government",
    ).length;

    const { label, orgName, party } = pickTopRole(person.id, overview.links, nodeById);
    const personConflicts = conflictsByPerson.get(person.id) ?? [];
    const karanteneCount = karanteneByNameSlug.get(slugifyName(person.name)) ?? 0;
    const score = computeScore(personConflicts, karanteneCount);
    const tag = pickTag(personConflicts, karanteneCount);

    rows.push({
      personId: person.id,
      name: person.name,
      topRoleLabel: label,
      topRoleOrg: orgName,
      party,
      connections: new Set(
        personLinks.map((l) => {
          const { source, target } = linkEndpoints(l);
          return source === person.id ? target : source;
        }),
      ).size,
      boardCount,
      politicalCount,
      karanteneCount,
      conflictCount: personConflicts.length,
      highestSeverity: highestSeverity(personConflicts),
      score,
      tag,
    });
  }

  return rows;
}

export async function loadKatalog(): Promise<KatalogData> {
  const [overviewR, conflictsR, karanteneR] = await Promise.allSettled([
    api.overview(),
    api.conflicts(),
    api.karanteneList(),
  ]);

  const overview = overviewR.status === "fulfilled" ? overviewR.value : null;
  const conflicts = conflictsR.status === "fulfilled" ? conflictsR.value : [];
  const karantene = karanteneR.status === "fulfilled" ? karanteneR.value : [];

  const rows = buildDirectoryRows(overview, conflicts, karantene);
  const partial =
    overviewR.status === "rejected" ||
    conflictsR.status === "rejected" ||
    karanteneR.status === "rejected";

  return { rows, partial };
}
