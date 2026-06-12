import { API_BASE } from "./api";

/**
 * Frontend data loader for the daily refresh job's diff output, served by
 * the backend's /api/changes/* endpoints. ISR is set to 5 minutes — the job
 * only runs once per day so we don't need anything tighter.
 */

export type ChangeSource = "brreg" | "karantene";

export type ChangeType =
  | "POSITION_ADDED"
  | "POSITION_REMOVED"
  | "KARANTENE_NEW";

export interface ChangeEntry {
  id: string;
  ts: string;
  source: ChangeSource;
  type: ChangeType;
  personId?: string;
  personName?: string;
  summary: string;
  details: Record<string, unknown>;
}

export interface ChangesRecent {
  available: boolean;
  updatedAt: string | null;
  entries: ChangeEntry[];
  total: number;
  days: number;
}

export interface LastRefresh {
  available: boolean;
  ts?: string;
  durationMs?: number;
  success?: boolean;
  brregScanned?: number;
  brregChanges?: number;
  karanteneScanned?: number;
  karanteneNew?: number;
  errors?: string[];
  nextScheduled: string;
}

export interface ChangesData {
  recent: ChangesRecent;
  lastRefresh: LastRefresh;
}

const REVALIDATE_SECONDS = 300;

async function safeGet<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

export async function loadChanges(days = 7): Promise<ChangesData> {
  const [recent, lastRefresh] = await Promise.all([
    safeGet<ChangesRecent>(`/api/changes/recent?days=${days}`, {
      available: false,
      updatedAt: null,
      entries: [],
      total: 0,
      days,
    }),
    safeGet<LastRefresh>(`/api/changes/last-refresh`, {
      available: false,
      nextScheduled: nextFallbackSchedule(),
    }),
  ]);
  return { recent, lastRefresh };
}

function nextFallbackSchedule(now = new Date()): string {
  const next = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 6, 0, 0),
  );
  if (now.getTime() >= next.getTime()) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return next.toISOString();
}

const RELATIVE_DIVISIONS: Array<{ amount: number; unit: Intl.RelativeTimeFormatUnit }> = [
  { amount: 60, unit: "seconds" },
  { amount: 60, unit: "minutes" },
  { amount: 24, unit: "hours" },
  { amount: 7, unit: "days" },
  { amount: 4.34524, unit: "weeks" },
  { amount: 12, unit: "months" },
  { amount: Number.POSITIVE_INFINITY, unit: "years" },
];

/** Norwegian relative time. Past values yield "for X siden", future "om X". */
export function formatRelative(iso: string | null | undefined, now = new Date()): string {
  if (!iso) return "ukjent tid";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "ukjent tid";
  const formatter = new Intl.RelativeTimeFormat("nb", { numeric: "auto" });
  let duration = (t - now.getTime()) / 1000;
  for (const division of RELATIVE_DIVISIONS) {
    if (Math.abs(duration) < division.amount) {
      return formatter.format(Math.round(duration), division.unit);
    }
    duration /= division.amount;
  }
  return formatter.format(Math.round(duration), "years");
}

/** Format a label suitable for grouping rows by day (today/yesterday/short date). */
export function dayBucketLabel(iso: string, now = new Date()): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "Ukjent";
  const d = new Date(t);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const compare = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((today.getTime() - compare.getTime()) / 86_400_000);
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  return d.toLocaleDateString("nb-NO", { day: "numeric", month: "long" });
}

/** Group entries by day bucket, preserving newest-first order. */
export function groupByDay(entries: ChangeEntry[]): Array<{
  label: string;
  bucket: "today" | "yesterday" | "other";
  entries: ChangeEntry[];
}> {
  const buckets: Array<{
    label: string;
    bucket: "today" | "yesterday" | "other";
    entries: ChangeEntry[];
  }> = [];
  const indexByLabel = new Map<string, number>();
  for (const entry of entries) {
    const label = dayBucketLabel(entry.ts);
    const bucket: "today" | "yesterday" | "other" =
      label === "today" ? "today" : label === "yesterday" ? "yesterday" : "other";
    let i = indexByLabel.get(label);
    if (i === undefined) {
      i = buckets.length;
      buckets.push({ label, bucket, entries: [] });
      indexByLabel.set(label, i);
    }
    buckets[i].entries.push(entry);
  }
  return buckets;
}

export function formatTimeOfDay(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  return new Date(t).toLocaleTimeString("nb-NO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
