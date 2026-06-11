// One-shot script: query Wikidata for portraits of every person in the curated
// political-data set and write the result to data/photos.json so the backend can
// merge imageUrl into its responses without hammering Wikidata at runtime.
//
// Usage (from backend/):
//   npx tsx src/scripts/fetch-photos.ts
//
// Requires the curated dataset to be importable — i.e. run this from the
// backend's working tree, not the compiled dist.

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPoliticalData } from '../services/political-data.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', '..', 'data');
const OUT_FILE = join(OUT_DIR, 'photos.json');

const WIKIDATA_ENDPOINT = 'https://query.wikidata.org/sparql';
const USER_AGENT =
  'NorskNettverk/1.0 (https://github.com/froand/Norsk-Nettverk-mapping-App; photos@example.com)';

interface PhotoRecord {
  personId: string;
  personName: string;
  imageUrl?: string;
  thumbUrl?: string;
  source?: 'wikidata';
  wikidataId?: string;
  fetchedAt: string;
}

async function sparql(query: string): Promise<Record<string, { value: string }>[]> {
  const url = `${WIKIDATA_ENDPOINT}?format=json&query=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  });
  if (!res.ok) {
    console.error(`  SPARQL ${res.status} ${res.statusText}`);
    return [];
  }
  const data = (await res.json()) as {
    results?: { bindings?: Record<string, { value: string }>[] };
  };
  return data.results?.bindings ?? [];
}

function escapeForSparql(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

async function findPhotoForName(name: string): Promise<{ wikidataId?: string; image?: string }> {
  const escaped = escapeForSparql(name);
  // Prefer Norwegian/Nynorsk label, fall back to English, require human + Norwegian
  // citizenship so we don't accidentally match an unrelated person with the same name.
  const query = `
SELECT ?person ?image WHERE {
  ?person wdt:P31 wd:Q5 .
  ?person wdt:P27 wd:Q20 .
  { ?person rdfs:label "${escaped}"@nb }
  UNION { ?person rdfs:label "${escaped}"@nn }
  UNION { ?person rdfs:label "${escaped}"@en }
  OPTIONAL { ?person wdt:P18 ?image }
}
LIMIT 5`;

  const rows = await sparql(query);
  if (rows.length === 0) return {};
  // Prefer the first row that actually has an image; otherwise return the first match
  const withImage = rows.find((r) => r.image?.value);
  const chosen = withImage ?? rows[0];
  const wikidataId = chosen.person?.value.split('/').pop();
  const image = chosen.image?.value;
  return { wikidataId, image };
}

function toThumbUrl(commonsUrl: string, width = 400): string {
  // Wikidata returns canonical Commons URLs like:
  //   http://commons.wikimedia.org/wiki/Special:FilePath/Erna_Solberg.jpg
  // Special:FilePath supports a width query param that returns a thumbnail.
  const https = commonsUrl.replace(/^http:\/\//, 'https://');
  if (https.includes('?')) return `${https}&width=${width}`;
  return `${https}?width=${width}`;
}

async function main(): Promise<void> {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  const existing = new Map<string, PhotoRecord>();
  if (existsSync(OUT_FILE)) {
    try {
      const cached = JSON.parse(readFileSync(OUT_FILE, 'utf8')) as PhotoRecord[];
      cached.forEach((r) => existing.set(r.personId, r));
      console.log(`Loaded ${existing.size} cached photo records`);
    } catch {
      console.warn('Could not parse existing photos.json; rebuilding from scratch');
    }
  }

  const data = getPoliticalData();
  const persons = data.nodes.filter((n) => n.type === 'person');
  console.log(`Resolving photos for ${persons.length} persons`);

  const results: PhotoRecord[] = [];
  let i = 0;
  for (const p of persons) {
    i += 1;
    const cached = existing.get(p.id);
    // Skip if we already have an image and the cache is < 60 days old
    if (cached?.imageUrl) {
      const ageDays = (Date.now() - new Date(cached.fetchedAt).getTime()) / 86_400_000;
      if (ageDays < 60) {
        results.push(cached);
        process.stdout.write(`  [${i}/${persons.length}] ${p.name} (cached)\n`);
        continue;
      }
    }

    try {
      const { wikidataId, image } = await findPhotoForName(p.name);
      const record: PhotoRecord = {
        personId: p.id,
        personName: p.name,
        wikidataId,
        imageUrl: image,
        thumbUrl: image ? toThumbUrl(image) : undefined,
        source: image ? 'wikidata' : undefined,
        fetchedAt: new Date().toISOString(),
      };
      results.push(record);
      const mark = image ? '✓' : '·';
      process.stdout.write(`  [${i}/${persons.length}] ${mark} ${p.name}${wikidataId ? ' (' + wikidataId + ')' : ''}\n`);
    } catch (e) {
      console.error(`  [${i}/${persons.length}] ✗ ${p.name}: ${(e as Error).message}`);
      results.push({
        personId: p.id,
        personName: p.name,
        fetchedAt: new Date().toISOString(),
      });
    }
    // Be polite: Wikidata SPARQL service is rate-limited
    await new Promise((r) => setTimeout(r, 350));
  }

  writeFileSync(OUT_FILE, JSON.stringify(results, null, 2), 'utf8');
  const hits = results.filter((r) => r.imageUrl).length;
  console.log(`\nWrote ${results.length} records (${hits} with image) to ${OUT_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
