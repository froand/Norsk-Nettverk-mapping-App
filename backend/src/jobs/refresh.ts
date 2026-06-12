/**
 * Norsk Nettverk v2 — daily refresh job.
 *
 * Re-scans the live data sources, diffs against the previous day's snapshots
 * and appends new ChangeEntry rows to /mnt/data/changes.json. The Varsler
 * page reads those via the `/api/changes/recent` endpoint.
 *
 * Run by an Azure Container Apps Job on a daily cron. Can also be invoked
 * locally via `npm run job:refresh` once a /mnt/data path is mocked through
 * the MNT_PATH env var.
 */

import { createHash, randomUUID } from 'node:crypto';

import { getAllTimelines } from '../services/political-data.js';
import { getLiveBoardMembers, type LiveBoardMember } from '../services/brreg-roller.js';
import {
  scrapeKaranteneDecisions,
  type ScrapedKaranteneEntry,
} from '../services/karantene-scraper.js';
import {
  ensureLocalRoot,
  getStorageMode,
  readJson,
  writeJson,
} from '../services/storage.js';

const CHANGES_FILE = 'changes.json';
const LAST_REFRESH_FILE = 'last-refresh.json';
const BRREG_SNAPSHOT = 'snapshots/brreg.json';
const KARANTENE_SNAPSHOT = 'snapshots/karantene.json';

const BRREG_DELAY_MS = 250;
const CHANGE_RETENTION_DAYS = 30;

export type ChangeType =
  | 'POSITION_ADDED'
  | 'POSITION_REMOVED'
  | 'KARANTENE_NEW';

export interface ChangeEntry {
  id: string;
  ts: string;
  source: 'brreg' | 'karantene';
  type: ChangeType;
  personId?: string;
  personName?: string;
  summary: string;
  details: Record<string, unknown>;
}

interface BrregMemberSnapshot {
  name: string;
  role: string;
  roleCode: string;
  groupCode: string;
  politicianId?: string;
}

interface BrregOrgSnapshot {
  orgNumber: string;
  orgName: string;
  fetchedAt: string;
  members: BrregMemberSnapshot[];
}

interface BrregSnapshotFile {
  seeded: boolean;
  updatedAt: string;
  orgs: Record<string, BrregOrgSnapshot>;
}

interface KaranteneSnapshotFile {
  seeded: boolean;
  updatedAt: string;
  entries: ScrapedKaranteneEntry[];
}

interface RefreshSummary {
  ts: string;
  durationMs: number;
  success: boolean;
  brregScanned: number;
  brregChanges: number;
  karanteneScanned: number;
  karanteneNew: number;
  errors: string[];
}

// ---------- helpers ----------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hashId(parts: Array<string | number | undefined>): string {
  const h = createHash('sha1');
  h.update(parts.map((p) => p ?? '').join('|'));
  return h.digest('hex').slice(0, 16);
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/\s+/)
    .sort()
    .join(' ');
}

/**
 * Extract Norwegian 9-digit org numbers embedded in orgName strings like
 * "DNB ASA (Org.nr. 984 851 006)". The curated dataset includes ~46 such
 * mentions; that's our seed list of orgs to poll Brreg for.
 */
function buildOrgWatchlist(): Array<{ orgNumber: string; orgName: string }> {
  const seen = new Map<string, string>();
  const orgRegex = /Org\.nr\.\s*([\d\s]{9,15})/i;
  for (const t of getAllTimelines()) {
    for (const p of t.positions) {
      const m = orgRegex.exec(p.orgName);
      if (!m) continue;
      const orgNumber = m[1].replace(/\s+/g, '');
      if (!/^\d{9}$/.test(orgNumber)) continue;
      if (!seen.has(orgNumber)) {
        const cleanName = p.orgName.replace(/\s*\(Org\.nr\..*?\)\s*$/i, '').trim();
        seen.set(orgNumber, cleanName);
      }
    }
  }
  return Array.from(seen.entries()).map(([orgNumber, orgName]) => ({
    orgNumber,
    orgName,
  }));
}

/** Resolve "personId / personName" for a Brreg member via the curated index. */
function resolvePerson(
  member: LiveBoardMember,
  curatedIndex: Map<string, { id: string; name: string }>,
): { personId?: string; personName: string } {
  if (member.politicianId) {
    const curated = curatedIndex.get(member.politicianId);
    return { personId: member.politicianId, personName: curated?.name ?? member.name };
  }
  const normalized = normalizeName(member.name);
  for (const [, value] of curatedIndex) {
    if (normalizeName(value.name) === normalized) {
      return { personId: value.id, personName: value.name };
    }
  }
  return { personName: member.name };
}

function memberKey(m: BrregMemberSnapshot): string {
  return `${normalizeName(m.name)}|${m.roleCode}|${m.groupCode}`;
}

// ---------- main scan logic ----------

async function scanBrreg(
  prev: BrregSnapshotFile | null,
  summary: RefreshSummary,
): Promise<{ snapshot: BrregSnapshotFile; changes: ChangeEntry[] }> {
  const orgs = buildOrgWatchlist();
  const curatedIndex = new Map<string, { id: string; name: string }>();
  for (const t of getAllTimelines()) {
    curatedIndex.set(t.personId, { id: t.personId, name: t.personName });
  }

  const newOrgs: Record<string, BrregOrgSnapshot> = {};
  const changes: ChangeEntry[] = [];
  const isFirstRun = !prev;
  const ts = new Date().toISOString();

  console.log(`refresh[brreg]: scanning ${orgs.length} org numbers...`);

  for (const { orgNumber, orgName } of orgs) {
    summary.brregScanned += 1;
    try {
      const liveMembers = await getLiveBoardMembers(orgNumber);
      const snapshotMembers: BrregMemberSnapshot[] = liveMembers.map((m) => ({
        name: m.name,
        role: m.role,
        roleCode: m.roleCode,
        groupCode: m.groupCode,
        politicianId: m.politicianId,
      }));

      const orgSnapshot: BrregOrgSnapshot = {
        orgNumber,
        orgName,
        fetchedAt: ts,
        members: snapshotMembers,
      };
      newOrgs[orgNumber] = orgSnapshot;

      if (!isFirstRun) {
        const prevOrg = prev?.orgs[orgNumber];
        const prevKeys = new Set(prevOrg ? prevOrg.members.map(memberKey) : []);
        const currKeys = new Set(snapshotMembers.map(memberKey));

        for (const m of snapshotMembers) {
          const key = memberKey(m);
          if (prevKeys.has(key)) continue;
          // Only surface changes that involve a curated person.
          const resolved = resolvePerson(
            {
              name: m.name,
              role: m.role,
              roleCode: m.roleCode,
              groupCode: m.groupCode,
              isPolitician: !!m.politicianId,
              politicianId: m.politicianId,
            },
            curatedIndex,
          );
          if (!resolved.personId) continue;
          changes.push({
            id: hashId([ts, 'brreg', 'add', resolved.personId, orgNumber, m.roleCode]),
            ts,
            source: 'brreg',
            type: 'POSITION_ADDED',
            personId: resolved.personId,
            personName: resolved.personName,
            summary: `${resolved.personName} har fått ny rolle som ${m.role} i ${orgName}`,
            details: {
              orgNumber,
              orgName,
              role: m.role,
              roleCode: m.roleCode,
              groupCode: m.groupCode,
            },
          });
          summary.brregChanges += 1;
        }

        if (prevOrg) {
          for (const m of prevOrg.members) {
            const key = memberKey(m);
            if (currKeys.has(key)) continue;
            const resolved = resolvePerson(
              {
                name: m.name,
                role: m.role,
                roleCode: m.roleCode,
                groupCode: m.groupCode,
                isPolitician: !!m.politicianId,
                politicianId: m.politicianId,
              },
              curatedIndex,
            );
            if (!resolved.personId) continue;
            changes.push({
              id: hashId([ts, 'brreg', 'rem', resolved.personId, orgNumber, m.roleCode]),
              ts,
              source: 'brreg',
              type: 'POSITION_REMOVED',
              personId: resolved.personId,
              personName: resolved.personName,
              summary: `${resolved.personName} er ikke lenger ${m.role} i ${orgName}`,
              details: {
                orgNumber,
                orgName,
                role: m.role,
                roleCode: m.roleCode,
                groupCode: m.groupCode,
              },
            });
            summary.brregChanges += 1;
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`refresh[brreg]: org ${orgNumber} failed: ${msg}`);
      summary.errors.push(`brreg ${orgNumber}: ${msg}`);
      // Keep previous snapshot for this org if available, so we don't lose state.
      if (prev?.orgs[orgNumber]) {
        newOrgs[orgNumber] = prev.orgs[orgNumber];
      }
    }

    // Be polite to Brreg between calls.
    await sleep(BRREG_DELAY_MS);
  }

  const snapshot: BrregSnapshotFile = {
    seeded: isFirstRun ? true : prev?.seeded ?? true,
    updatedAt: ts,
    orgs: newOrgs,
  };
  return { snapshot, changes };
}

async function scanKarantene(
  prev: KaranteneSnapshotFile | null,
  summary: RefreshSummary,
): Promise<{ snapshot: KaranteneSnapshotFile; changes: ChangeEntry[] }> {
  console.log('refresh[karantene]: scraping regjeringen.no...');
  const result = await scrapeKaranteneDecisions();
  const ts = new Date().toISOString();
  const isFirstRun = !prev;

  if (!result.ok) {
    summary.errors.push(`karantene: ${result.error ?? 'unknown error'}`);
    return {
      snapshot:
        prev ??
        {
          seeded: true,
          updatedAt: ts,
          entries: [],
        },
      changes: [],
    };
  }

  summary.karanteneScanned = result.entries.length;

  const changes: ChangeEntry[] = [];
  if (!isFirstRun) {
    const prevKeys = new Set(prev!.entries.map((e) => `${e.date}|${e.pdfUrl}`));
    for (const entry of result.entries) {
      const key = `${entry.date}|${entry.pdfUrl}`;
      if (prevKeys.has(key)) continue;
      changes.push({
        id: hashId([ts, 'karantene', entry.date, entry.pdfUrl]),
        ts,
        source: 'karantene',
        type: 'KARANTENE_NEW',
        personName: entry.title,
        summary: `Ny avgjørelse fra Karantenenemnda: ${entry.title} (${entry.date})`,
        details: {
          date: entry.date,
          title: entry.title,
          pdfUrl: entry.pdfUrl,
        },
      });
      summary.karanteneNew += 1;
    }
  }

  const snapshot: KaranteneSnapshotFile = {
    seeded: isFirstRun ? true : prev?.seeded ?? true,
    updatedAt: ts,
    entries: result.entries,
  };

  return { snapshot, changes };
}

async function appendChanges(newEntries: ChangeEntry[]): Promise<number> {
  let existing: ChangeEntry[] = [];
  const file = await readJson<{ entries: ChangeEntry[] }>(CHANGES_FILE);
  if (file && Array.isArray(file.entries)) {
    existing = file.entries;
  }
  const combined = [...newEntries, ...existing];

  const cutoff = Date.now() - CHANGE_RETENTION_DAYS * 86_400_000;
  const pruned = combined.filter((e) => {
    const t = Date.parse(e.ts);
    return Number.isFinite(t) ? t >= cutoff : true;
  });

  const dedup = new Map<string, ChangeEntry>();
  for (const e of pruned) {
    if (!dedup.has(e.id)) dedup.set(e.id, e);
  }
  const finalList = Array.from(dedup.values()).sort((a, b) =>
    a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0,
  );

  await writeJson(CHANGES_FILE, {
    updatedAt: new Date().toISOString(),
    entries: finalList,
  });
  return finalList.length;
}

// ---------- entrypoint ----------

async function main(): Promise<void> {
  const startedAt = Date.now();
  const summary: RefreshSummary = {
    ts: new Date().toISOString(),
    durationMs: 0,
    success: false,
    brregScanned: 0,
    brregChanges: 0,
    karanteneScanned: 0,
    karanteneNew: 0,
    errors: [],
  };

  console.log(
    `refresh: starting (mode=${getStorageMode()}, runId=${randomUUID()})`,
  );

  try {
    ensureLocalRoot();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`refresh: cannot prepare storage: ${msg}`);
    summary.errors.push(`storage: ${msg}`);
    summary.durationMs = Date.now() - startedAt;
    try {
      await writeJson(LAST_REFRESH_FILE, summary);
    } catch {
      /* ignore */
    }
    process.exit(1);
  }

  let allChanges: ChangeEntry[] = [];

  try {
    const prevBrreg = await readJson<BrregSnapshotFile>(BRREG_SNAPSHOT);
    const { snapshot, changes } = await scanBrreg(prevBrreg, summary);
    await writeJson(BRREG_SNAPSHOT, snapshot);
    allChanges = allChanges.concat(changes);
    console.log(
      `refresh[brreg]: ${summary.brregScanned} orgs scanned, ${changes.length} change(s)`,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('refresh[brreg]: scan failed:', err);
    summary.errors.push(`brreg-scan: ${msg}`);
  }

  try {
    const prevKar = await readJson<KaranteneSnapshotFile>(KARANTENE_SNAPSHOT);
    const { snapshot, changes } = await scanKarantene(prevKar, summary);
    await writeJson(KARANTENE_SNAPSHOT, snapshot);
    allChanges = allChanges.concat(changes);
    console.log(
      `refresh[karantene]: ${summary.karanteneScanned} entries scraped, ${changes.length} new`,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('refresh[karantene]: scan failed:', err);
    summary.errors.push(`karantene-scan: ${msg}`);
  }

  try {
    const total = await appendChanges(allChanges);
    console.log(
      `refresh: appended ${allChanges.length} change(s); ${total} retained after pruning >${CHANGE_RETENTION_DAYS}d`,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('refresh: failed to write changes.json:', err);
    summary.errors.push(`write-changes: ${msg}`);
  }

  summary.durationMs = Date.now() - startedAt;
  summary.success = summary.errors.length === 0;

  try {
    await writeJson(LAST_REFRESH_FILE, summary);
  } catch (err) {
    console.error('refresh: failed to write last-refresh.json:', err);
  }

  console.log(
    `refresh: done in ${summary.durationMs}ms (success=${summary.success}, errors=${summary.errors.length})`,
  );

  // Only exit 1 if literally nothing succeeded; per-source failures are
  // captured in the summary but should not fail the whole job.
  if (!summary.success && summary.brregScanned === 0 && summary.karanteneScanned === 0) {
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('refresh: uncaught error', err);
  process.exit(1);
});
