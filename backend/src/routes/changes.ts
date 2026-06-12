import { Router } from 'express';

import { readJson } from '../services/storage.js';

/**
 * Reads the refresh job's output from blob storage (or local FS fallback) and
 * exposes it as `/api/changes/recent` and `/api/changes/last-refresh`.
 *
 * Never throws — endpoints always return JSON and signal absence via
 * `available: false`.
 */

interface ChangeEntry {
  id: string;
  ts: string;
  source: 'brreg' | 'karantene';
  type: string;
  personId?: string;
  personName?: string;
  summary: string;
  details: Record<string, unknown>;
}

interface ChangesFile {
  updatedAt: string;
  entries: ChangeEntry[];
}

interface LastRefreshFile {
  ts: string;
  durationMs: number;
  success: boolean;
  brregScanned: number;
  brregChanges: number;
  karanteneScanned: number;
  karanteneNew: number;
  errors: string[];
}

/**
 * Compute the next scheduled run. The cron in Bicep is `0 6 * * *` (06:00 UTC
 * every day) — kept in sync with that constant.
 */
function nextScheduledRun(now = new Date()): string {
  const next = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 6, 0, 0),
  );
  if (now.getTime() >= next.getTime()) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return next.toISOString();
}

export const changesRoutes = Router();

changesRoutes.get('/recent', async (req, res) => {
  const daysRaw = typeof req.query.days === 'string' ? Number(req.query.days) : 7;
  const days = Number.isFinite(daysRaw) && daysRaw > 0 && daysRaw <= 30 ? daysRaw : 7;

  let file: ChangesFile | null = null;
  try {
    file = await readJson<ChangesFile>('changes.json');
  } catch (err) {
    console.error('/api/changes/recent: read failed', err);
  }

  if (!file) {
    return res.json({
      available: false,
      updatedAt: null,
      entries: [],
      total: 0,
      days,
    });
  }

  const cutoff = Date.now() - days * 86_400_000;
  const filtered = (file.entries || [])
    .filter((e) => {
      const t = Date.parse(e.ts);
      return Number.isFinite(t) ? t >= cutoff : false;
    })
    .sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0));

  res.json({
    available: true,
    updatedAt: file.updatedAt,
    entries: filtered,
    total: filtered.length,
    days,
  });
});

changesRoutes.get('/last-refresh', async (_req, res) => {
  let file: LastRefreshFile | null = null;
  try {
    file = await readJson<LastRefreshFile>('last-refresh.json');
  } catch (err) {
    console.error('/api/changes/last-refresh: read failed', err);
  }

  if (!file) {
    return res.json({
      available: false,
      nextScheduled: nextScheduledRun(),
    });
  }
  res.json({
    available: true,
    ...file,
    nextScheduled: nextScheduledRun(),
  });
});
