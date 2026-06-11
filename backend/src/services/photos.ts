// Person-photo cache loader. Backed by data/photos.json which is built offline by
// src/scripts/fetch-photos.ts. We load it once at module init and expose a tiny
// lookup helper so route handlers can splice imageUrl onto GraphNode payloads
// without hammering Wikidata at runtime.

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface PhotoRecord {
  personId: string;
  personName: string;
  imageUrl?: string;
  thumbUrl?: string;
  wikidataId?: string;
  source?: 'wikidata';
  fetchedAt: string;
}

// Look in a couple of candidate paths because the file lives outside dist/ after
// the TypeScript build. In dev (tsx) __dirname is src/services, in prod it's
// dist/services and we want backend/data either way.
function locatePhotoFile(): string | null {
  const candidates = [
    join(__dirname, '..', '..', 'data', 'photos.json'),
    join(__dirname, '..', '..', '..', 'data', 'photos.json'),
    join(process.cwd(), 'data', 'photos.json'),
  ];
  return candidates.find((p) => existsSync(p)) ?? null;
}

const byId = new Map<string, PhotoRecord>();

(function loadOnce(): void {
  const file = locatePhotoFile();
  if (!file) {
    console.warn('[photos] No data/photos.json found — avatars will fall back to initials');
    return;
  }
  try {
    const records = JSON.parse(readFileSync(file, 'utf8')) as PhotoRecord[];
    for (const r of records) {
      if (r.personId && (r.imageUrl || r.thumbUrl)) {
        byId.set(r.personId, r);
      }
    }
    console.log(`[photos] Loaded ${byId.size} photo records from ${file}`);
  } catch (e) {
    console.error('[photos] Failed to parse photos.json:', e);
  }
})();

export function getPhotoUrl(personId: string): string | undefined {
  return byId.get(personId)?.thumbUrl ?? byId.get(personId)?.imageUrl;
}

export function getPhotoRecord(personId: string): PhotoRecord | undefined {
  return byId.get(personId);
}

export function attachPhotoUrl<T extends { id: string; type?: string; imageUrl?: string }>(
  node: T,
): T {
  if (node.type !== 'person') return node;
  if (node.imageUrl) return node;
  const url = getPhotoUrl(node.id);
  if (!url) return node;
  return { ...node, imageUrl: url };
}
