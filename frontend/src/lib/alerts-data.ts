import {
  api,
  type ConflictOfInterest,
  type ConflictSeverity,
  type KaranteneDecision,
  type PositionTimeline,
} from "./api";
import {
  deriveRevolvingDoorFeed,
  type RevolvingDoorTransition,
} from "./dashboard-data";

export type AlertKind = "karantene" | "revolving_door" | "conflict";

export interface AlertItem {
  id: string;
  kind: AlertKind;
  /** YYYY-MM-DD when known, otherwise YYYY-12-31. */
  dateKey: string;
  /** Display string ("2026-02-13", "2024", "Nylig"). */
  dateLabel: string;
  personId: string | null;
  personName: string;
  title: string;
  subtitle: string | null;
  severity: ConflictSeverity | null;
  pdfUrl: string | null;
}

export interface AlertsData {
  items: AlertItem[];
  partial: boolean;
}

const SEVERITY_RANK: Record<ConflictSeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

/** Synthetic dateKey for year-only data so it sorts amongst dated items. */
function yearKey(year: number): string {
  return `${year}-12-31`;
}

function isValidIsoDate(s: string | undefined): boolean {
  if (!s) return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function formatDateLabel(dateKey: string, isExact: boolean, now = new Date()): string {
  if (!isExact) {
    return dateKey.slice(0, 4);
  }
  const d = new Date(`${dateKey}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return dateKey.slice(0, 4);
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const diffDays = Math.floor((today.getTime() - d.getTime()) / 86_400_000);
  if (diffDays === 0) return "i dag";
  if (diffDays === 1) return "i går";
  if (diffDays < 7) return `for ${diffDays} dager siden`;
  if (diffDays < 30) return `for ${Math.floor(diffDays / 7)} uker siden`;
  if (d.getUTCFullYear() === now.getUTCFullYear()) {
    return d.toLocaleDateString("nb-NO", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });
  }
  return d.toLocaleDateString("nb-NO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Try to find a personId for a karantene entry by matching the name. */
function lookupPersonId(
  personName: string,
  nameToId: Map<string, string>,
): string | null {
  const key = personName.trim().toLowerCase();
  return nameToId.get(key) ?? null;
}

export function mapKaranteneToAlerts(
  karantene: KaranteneDecision[],
  nameToId: Map<string, string>,
): AlertItem[] {
  return karantene.map((k) => {
    const isExact = isValidIsoDate(k.date);
    const dateKey = isExact ? k.date : yearKey(k.year ?? new Date().getFullYear());
    const subtitleParts: string[] = [];
    if (k.previousRole) subtitleParts.push(k.previousRole);
    if (k.newOrganization) subtitleParts.push(k.newOrganization);
    return {
      id: `karantene:${k.id}`,
      kind: "karantene",
      dateKey,
      dateLabel: formatDateLabel(dateKey, isExact),
      personId: lookupPersonId(k.personName, nameToId),
      personName: k.personName,
      title: k.personName,
      subtitle:
        subtitleParts.length > 0
          ? subtitleParts.join(" → ")
          : `Karantenenemnda${k.classification ? ` · Klassifisering ${k.classification}` : ""}`,
      severity: null,
      pdfUrl: k.pdfUrl ?? null,
    };
  });
}

export function mapRevolvingDoorToAlerts(
  transitions: RevolvingDoorTransition[],
): AlertItem[] {
  return transitions.map((t) => {
    const dateKey = yearKey(Math.max(t.endYear, t.startYear));
    return {
      id: `revolving:${t.personId}:${t.fromOrg}:${t.toOrg}:${t.endYear}`,
      kind: "revolving_door",
      dateKey,
      dateLabel: `${t.endYear} → ${t.startYear}`,
      personId: t.personId,
      personName: t.personName,
      title: t.personName,
      subtitle: `${t.fromOrg} → ${t.toOrg}`,
      severity: null,
      pdfUrl: null,
    };
  });
}

export function mapConflictsToAlerts(
  conflicts: ConflictOfInterest[],
): AlertItem[] {
  // Only surface medium+ severity to keep the feed focused.
  return conflicts
    .filter((c) => SEVERITY_RANK[c.severity] >= SEVERITY_RANK.medium)
    .map((c, i) => {
      const dateKey = yearKey(new Date().getFullYear());
      return {
        id: `conflict:${c.personId}:${i}`,
        kind: "conflict",
        dateKey,
        dateLabel: "Aktiv",
        personId: c.personId,
        personName: c.personName,
        title: c.personName,
        subtitle: `${c.politicalOrg} → ${c.boardOrg}`,
        severity: c.severity,
        pdfUrl: null,
      };
    });
}

export function mergeAlerts(
  karantene: AlertItem[],
  revolving: AlertItem[],
  conflicts: AlertItem[],
  limit = 80,
): AlertItem[] {
  const all = [...karantene, ...revolving, ...conflicts];
  // Sort by dateKey desc (newest first), tiebreak on severity then personName.
  all.sort((a, b) => {
    if (a.dateKey !== b.dateKey) return a.dateKey < b.dateKey ? 1 : -1;
    const sev = (b.severity ? SEVERITY_RANK[b.severity] : 0) -
      (a.severity ? SEVERITY_RANK[a.severity] : 0);
    if (sev !== 0) return sev;
    return a.personName.localeCompare(b.personName, "nb");
  });
  return all.slice(0, limit);
}

export async function loadAlerts(): Promise<AlertsData> {
  const [overviewR, timelinesR, karanteneR, conflictsR] = await Promise.allSettled([
    api.overview(),
    api.timelines(),
    api.karanteneList(),
    api.conflicts(),
  ]);

  const overview = overviewR.status === "fulfilled" ? overviewR.value : null;
  const timelines = timelinesR.status === "fulfilled" ? timelinesR.value : [];
  const karantene = karanteneR.status === "fulfilled" ? karanteneR.value : [];
  const conflicts = conflictsR.status === "fulfilled" ? conflictsR.value : [];

  // Build a name → personId map from the overview so karantene rows can link.
  const nameToId = new Map<string, string>();
  if (overview) {
    for (const n of overview.nodes) {
      if (n.type === "person") {
        nameToId.set(n.name.trim().toLowerCase(), n.id);
      }
    }
  }

  const revolving = deriveRevolvingDoorFeed(
    (timelines ?? []) as PositionTimeline[],
    30,
  );
  const items = mergeAlerts(
    mapKaranteneToAlerts(karantene, nameToId),
    mapRevolvingDoorToAlerts(revolving),
    mapConflictsToAlerts(conflicts),
  );

  const partial =
    overviewR.status === "rejected" ||
    timelinesR.status === "rejected" ||
    karanteneR.status === "rejected" ||
    conflictsR.status === "rejected";

  return { items, partial };
}
