import { getAllTimelines } from './political-data.js';

const BRREG_BASE = 'https://data.brreg.no/enhetsregisteret/api';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface BrregRolePerson {
  navn: string;
  fodselsdato?: string;
}

interface BrregRollegruppeMember {
  type: { kode: string; beskrivelse: string };
  person?: BrregRolePerson;
  fratraadt: boolean;
}

interface BrregRollegruppe {
  type: { kode: string; beskrivelse: string };
  roller: BrregRollegruppeMember[];
}

interface BrregRollerResponse {
  rollegrupper?: BrregRollegruppe[];
}

export interface LiveBoardMember {
  name: string;
  role: string;
  roleCode: string;
  groupCode: string;
  isPolitician: boolean;
  politicianId?: string;
}

// In-memory cache: orgNumber → { data, expiresAt }
const cache = new Map<string, { data: LiveBoardMember[]; expiresAt: number }>();

/**
 * Normalize a person name for fuzzy matching across different conventions.
 * Brreg often returns names as "LASTNAME FIRSTNAME" in uppercase; our dataset
 * uses "Firstname Lastname" title-case. We lowercase, strip diacritics and sort
 * the words so both representations match.
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/\s+/)
    .sort()
    .join(' ');
}

/** Build a map of normalized politician name → personId from the curated dataset. */
function buildPoliticianIndex(): Map<string, string> {
  const index = new Map<string, string>();
  for (const timeline of getAllTimelines()) {
    index.set(normalizeName(timeline.personName), timeline.personId);
  }
  return index;
}

/**
 * Fetch live board members for a company from the Brreg Roller API.
 * Results are cached in memory for 1 hour per org number.
 * Returns an empty array on any error so callers always get a usable result.
 */
export async function getLiveBoardMembers(orgNumber: string): Promise<LiveBoardMember[]> {
  // Validate: Norwegian org numbers are exactly 9 digits
  if (!/^\d{9}$/.test(orgNumber)) {
    return [];
  }

  const now = Date.now();

  const cached = cache.get(orgNumber);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  try {
    const res = await fetch(`${BRREG_BASE}/enheter/${orgNumber}/roller`);
    if (!res.ok) {
      return [];
    }

    const data: BrregRollerResponse = await res.json();
    const politicianIndex = buildPoliticianIndex();
    const members: LiveBoardMember[] = [];

    if (data.rollegrupper) {
      for (const gruppe of data.rollegrupper) {
        for (const rolle of gruppe.roller) {
          if (!rolle.person || rolle.fratraadt) continue;
          const name = rolle.person.navn;
          if (!name || typeof name !== 'string') continue;

          const normalized = normalizeName(name);
          const politicianId = politicianIndex.get(normalized);

          members.push({
            name,
            role: rolle.type.beskrivelse,
            roleCode: rolle.type.kode,
            groupCode: gruppe.type.kode,
            isPolitician: !!politicianId,
            politicianId,
          });
        }
      }
    }

    cache.set(orgNumber, { data: members, expiresAt: now + CACHE_TTL_MS });
    return members;
  } catch (err) {
    console.error('Failed to fetch board members for org', orgNumber + ':', err);
    return [];
  }
}
