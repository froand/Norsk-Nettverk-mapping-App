import type { GraphData, GraphNode, GraphLink } from '../types.js';

// Stortinget.no open data API
const STORTINGET_BASE = 'https://data.stortinget.no/eksport';

interface StortingetRepresentant {
  id: string;
  fornavn: string;
  etternavn: string;
  foedselsdato: string;
  kjoenn: number;
  fylke: { id: string; navn: string };
  parti: { id: string; navn: string; representert_parti: boolean };
  vara_representant: boolean;
}

interface DagensRepresentant extends StortingetRepresentant {
  epost?: string;
  komiteer_liste?: { id: string; navn: string }[];
}

interface StortingetResponse {
  representanter_liste: StortingetRepresentant[];
}

interface DagensResponse {
  dagensrepresentanter_liste: DagensRepresentant[];
}

export interface PersonPosition {
  title: string;
  organization: string;
  type: 'political' | 'government' | 'private' | 'board' | 'committee';
  startYear?: number;
  endYear?: number | null; // null = current
  isCurrent: boolean;
  description?: string;
}

export interface PersonDetails {
  id: string;
  name: string;
  party?: string;
  fylke?: string;
  email?: string;
  birthYear?: number;
  imageUrl?: string;
  committees?: string[];
  currentPositions: PersonPosition[];
  pastPositions: PersonPosition[];
}

// Map Stortinget party IDs to our org IDs
const PARTY_ID_MAP: Record<string, { id: string; name: string }> = {
  'A': { id: 'org-arbeiderpartiet', name: 'Arbeiderpartiet' },
  'H': { id: 'org-hoyre', name: 'Høyre' },
  'Sp': { id: 'org-senterpartiet', name: 'Senterpartiet' },
  'FrP': { id: 'org-fremskrittspartiet', name: 'Fremskrittspartiet' },
  'SV': { id: 'org-sosialistisk-venstreparti', name: 'Sosialistisk Venstreparti' },
  'V': { id: 'org-venstre', name: 'Venstre' },
  'KrF': { id: 'org-kristelig-folkeparti', name: 'Kristelig Folkeparti' },
  'MDG': { id: 'org-miljopartiet-de-gronne', name: 'Miljøpartiet De Grønne' },
  'R': { id: 'org-rodt', name: 'Rødt' },
  'PF': { id: 'org-pasientfokus', name: 'Pasientfokus' },
};

// Fallback party affiliation for curated politicians not in Stortinget API
const KNOWN_PARTY_MAP: Record<string, string> = {
  'monica-mæland': 'Høyre',
  'nikolai-astrup': 'Høyre',
  'torbjørn-røe-isaksen': 'Høyre',
  'ketil-solvik-olsen': 'Fremskrittspartiet',
  'bent-høie': 'Høyre',
};

let cachedRepresentatives: StortingetRepresentant[] | null = null;
let cachedDagensRepresentanter: DagensRepresentant[] | null = null;

// Curated dataset of notable politicians' past positions (public information)
const KNOWN_POSITIONS: Record<string, PersonPosition[]> = {
  'erna-solberg': [
    { title: 'Statsminister', organization: 'Regjeringen', type: 'government', startYear: 2013, endYear: 2021, isCurrent: false },
    { title: 'Kommunal- og regionalminister', organization: 'Regjeringen', type: 'government', startYear: 2001, endYear: 2005, isCurrent: false },
    { title: 'Stortingsrepresentant', organization: 'Stortinget', type: 'political', startYear: 1989, endYear: null, isCurrent: true },
    { title: 'Leder', organization: 'Høyre', type: 'political', startYear: 2004, endYear: null, isCurrent: true },
  ],
  'jonas-gahr-støre': [
    { title: 'Statsminister', organization: 'Regjeringen', type: 'government', startYear: 2021, endYear: null, isCurrent: true },
    { title: 'Utenriksminister', organization: 'Regjeringen', type: 'government', startYear: 2005, endYear: 2012, isCurrent: false },
    { title: 'Stabssjef', organization: 'Statsministerens kontor', type: 'government', startYear: 2000, endYear: 2005, isCurrent: false },
    { title: 'Generalsekretær', organization: 'Norges Røde Kors', type: 'private', startYear: 2003, endYear: 2005, isCurrent: false },
    { title: 'Leder', organization: 'Arbeiderpartiet', type: 'political', startYear: 2014, endYear: null, isCurrent: true },
  ],
  'siv-jensen': [
    { title: 'Finansminister', organization: 'Regjeringen', type: 'government', startYear: 2013, endYear: 2020, isCurrent: false },
    { title: 'Leder', organization: 'Fremskrittspartiet', type: 'political', startYear: 2006, endYear: 2021, isCurrent: false },
    { title: 'Stortingsrepresentant', organization: 'Stortinget', type: 'political', startYear: 1997, endYear: 2021, isCurrent: false },
    { title: 'Styremedlem', organization: 'Norges Bank Investment Management', type: 'board', startYear: 2022, endYear: null, isCurrent: true, description: 'Oppnevnt til styret i oljefondet' },
  ],
  'nikolai-astrup': [
    { title: 'Kommunal- og distriktsminister', organization: 'Regjeringen', type: 'government', startYear: 2020, endYear: 2021, isCurrent: false },
    { title: 'Digitaliseringsminister', organization: 'Regjeringen', type: 'government', startYear: 2019, endYear: 2020, isCurrent: false },
    { title: 'Klimaminister', organization: 'Regjeringen', type: 'government', startYear: 2018, endYear: 2019, isCurrent: false },
    { title: 'Partner', organization: 'McKinsey & Company', type: 'private', startYear: 2022, endYear: null, isCurrent: true, description: 'Konsulentselskap' },
    { title: 'Stortingsrepresentant', organization: 'Stortinget', type: 'political', startYear: 2009, endYear: 2021, isCurrent: false },
  ],
  'torbjørn-røe-isaksen': [
    { title: 'Arbeids- og sosialminister', organization: 'Regjeringen', type: 'government', startYear: 2020, endYear: 2021, isCurrent: false },
    { title: 'Næringsminister', organization: 'Regjeringen', type: 'government', startYear: 2018, endYear: 2020, isCurrent: false },
    { title: 'Kunnskapsminister', organization: 'Regjeringen', type: 'government', startYear: 2013, endYear: 2018, isCurrent: false },
    { title: 'Kommunikasjonsdirektør', organization: 'Norsk Hydro', type: 'private', startYear: 2022, endYear: null, isCurrent: true, description: 'Aluminium og energi' },
  ],
  'monica-mæland': [
    { title: 'Justis- og beredskapsminister', organization: 'Regjeringen', type: 'government', startYear: 2020, endYear: 2021, isCurrent: false },
    { title: 'Kommunal- og moderniseringsminister', organization: 'Regjeringen', type: 'government', startYear: 2018, endYear: 2020, isCurrent: false },
    { title: 'Næringsminister', organization: 'Regjeringen', type: 'government', startYear: 2013, endYear: 2018, isCurrent: false },
    { title: 'Partner', organization: 'Advokatfirmaet Thommessen', type: 'private', startYear: 2022, endYear: null, isCurrent: true },
  ],
  'ketil-solvik-olsen': [
    { title: 'Samferdselsminister', organization: 'Regjeringen', type: 'government', startYear: 2013, endYear: 2018, isCurrent: false },
    { title: 'Stortingsrepresentant', organization: 'Stortinget', type: 'political', startYear: 2005, endYear: 2018, isCurrent: false },
    { title: 'Rådgiver/konsulent', organization: 'First House', type: 'private', startYear: 2019, endYear: null, isCurrent: true, description: 'PR og kommunikasjon' },
  ],
  'bent-høie': [
    { title: 'Helse- og omsorgsminister', organization: 'Regjeringen', type: 'government', startYear: 2013, endYear: 2021, isCurrent: false },
    { title: 'Statsforvalter i Rogaland', organization: 'Statsforvalteren', type: 'government', startYear: 2022, endYear: null, isCurrent: true },
    { title: 'Stortingsrepresentant', organization: 'Stortinget', type: 'political', startYear: 2000, endYear: 2013, isCurrent: false },
  ],
  'sylvi-listhaug': [
    { title: 'Energiminister', organization: 'Regjeringen', type: 'government', startYear: 2019, endYear: 2020, isCurrent: false },
    { title: 'Eldre- og folkehelseminister', organization: 'Regjeringen', type: 'government', startYear: 2019, endYear: 2019, isCurrent: false },
    { title: 'Justisminister', organization: 'Regjeringen', type: 'government', startYear: 2018, endYear: 2018, isCurrent: false },
    { title: 'Innvandrings- og integreringsminister', organization: 'Regjeringen', type: 'government', startYear: 2015, endYear: 2018, isCurrent: false },
    { title: 'Landbruksminister', organization: 'Regjeringen', type: 'government', startYear: 2013, endYear: 2015, isCurrent: false },
    { title: 'Seniorrådgiver', organization: 'First House', type: 'private', startYear: 2012, endYear: 2013, isCurrent: false, description: 'PR-byrå' },
    { title: 'Leder', organization: 'Fremskrittspartiet', type: 'political', startYear: 2021, endYear: null, isCurrent: true },
  ],
  'trygve-slagsvold-vedum': [
    { title: 'Finansminister', organization: 'Regjeringen', type: 'government', startYear: 2021, endYear: null, isCurrent: true },
    { title: 'Leder', organization: 'Senterpartiet', type: 'political', startYear: 2014, endYear: null, isCurrent: true },
    { title: 'Stortingsrepresentant', organization: 'Stortinget', type: 'political', startYear: 2005, endYear: null, isCurrent: true },
  ],
  'abid-raja': [
    { title: 'Kultur- og likestillingsminister', organization: 'Regjeringen', type: 'government', startYear: 2020, endYear: 2021, isCurrent: false },
    { title: 'Stortingsrepresentant', organization: 'Stortinget', type: 'political', startYear: 2013, endYear: null, isCurrent: true },
    { title: 'Advokat/Partner', organization: 'Advokatfirmaet Elden', type: 'private', startYear: 2005, endYear: 2013, isCurrent: false },
  ],
  'anniken-huitfeldt': [
    { title: 'Utenriksminister', organization: 'Regjeringen', type: 'government', startYear: 2021, endYear: 2023, isCurrent: false },
    { title: 'Stortingsrepresentant', organization: 'Stortinget', type: 'political', startYear: 2005, endYear: null, isCurrent: true },
    { title: 'Barne- og likestillingsminister', organization: 'Regjeringen', type: 'government', startYear: 2008, endYear: 2009, isCurrent: false },
    { title: 'Arbeidsminister', organization: 'Regjeringen', type: 'government', startYear: 2012, endYear: 2013, isCurrent: false },
  ],
  'jan-christian-vestre': [
    { title: 'Helseminister', organization: 'Regjeringen', type: 'government', startYear: 2024, endYear: null, isCurrent: true },
    { title: 'Næringsminister', organization: 'Regjeringen', type: 'government', startYear: 2021, endYear: 2024, isCurrent: false, description: 'Ansvarlig for næringspolitikk og offentlige anskaffelser' },
    { title: 'Nestleder', organization: 'Arbeiderpartiet', type: 'political', startYear: 2023, endYear: null, isCurrent: true },
    { title: 'Stortingsrepresentant', organization: 'Stortinget', type: 'political', startYear: 2025, endYear: null, isCurrent: true },
    { title: 'Daglig leder og 70% eier', organization: 'Vestre AS', type: 'private', startYear: 2014, endYear: 2021, isCurrent: false, description: 'Møbelprodusent som selger til offentlig sektor — parker, byrom, offentlige bygg' },
    { title: 'Politisk rådgiver', organization: 'Nærings- og fiskeridepartementet', type: 'government', startYear: 2013, endYear: 2013, isCurrent: false },
    { title: 'Politisk rådgiver', organization: 'Arbeiderpartiets stortingsgruppe', type: 'political', startYear: 2010, endYear: 2012, isCurrent: false },
  ],
};

async function fetchRepresentatives(): Promise<StortingetRepresentant[]> {
  if (cachedRepresentatives) return cachedRepresentatives;

  try {
    const res = await fetch(`${STORTINGET_BASE}/representanter?format=json&periodeid=2021-2025`);
    if (!res.ok) throw new Error(`Stortinget API error: ${res.status}`);
    const data: StortingetResponse = await res.json();
    cachedRepresentatives = data.representanter_liste || [];
    return cachedRepresentatives;
  } catch (e) {
    console.error('Failed to fetch from Stortinget API:', e);
    return [];
  }
}

async function fetchDagensRepresentanter(): Promise<DagensRepresentant[]> {
  if (cachedDagensRepresentanter) return cachedDagensRepresentanter;

  try {
    const res = await fetch(`${STORTINGET_BASE}/dagensrepresentanter?format=json`);
    if (!res.ok) throw new Error(`Stortinget API error: ${res.status}`);
    const data: DagensResponse = await res.json();
    cachedDagensRepresentanter = data.dagensrepresentanter_liste || [];
    return cachedDagensRepresentanter;
  } catch (e) {
    console.error('Failed to fetch dagensrepresentanter:', e);
    return [];
  }
}

// Check which historical periods a person served in
async function getPersonPeriods(stortingetId: string): Promise<{ periodId: string; found: boolean }[]> {
  const periods = ['2017-2021', '2013-2017', '2009-2013', '2005-2009'];
  const results: { periodId: string; found: boolean }[] = [];

  for (const period of periods) {
    try {
      const res = await fetch(`${STORTINGET_BASE}/representanter?format=json&periodeid=${period}`);
      if (!res.ok) continue;
      const data: StortingetResponse = await res.json();
      const found = data.representanter_liste?.some((r) => r.id === stortingetId) || false;
      results.push({ periodId: period, found });
    } catch {
      // skip failed period
    }
  }
  return results;
}

export async function getPersonDetails(personId: string): Promise<PersonDetails | null> {
  // Extract name from personId (person-fornavn-etternavn)
  const nameParts = personId.replace('person-', '').split('-');
  const searchName = nameParts.join(' ').toLowerCase();

  // Find in current representatives
  const reps = await fetchRepresentatives();
  const dagens = await fetchDagensRepresentanter();

  const rep = reps.find(
    (r) => `${r.fornavn} ${r.etternavn}`.toLowerCase().replace(/\s+/g, ' ') === searchName
      || `${r.fornavn}-${r.etternavn}`.toLowerCase().replace(/\s+/g, '-') === nameParts.join('-')
  );

  const dagensRep = dagens.find(
    (r) => `${r.fornavn} ${r.etternavn}`.toLowerCase().replace(/\s+/g, ' ') === searchName
      || `${r.fornavn}-${r.etternavn}`.toLowerCase().replace(/\s+/g, '-') === nameParts.join('-')
  );

  // Check curated KNOWN_POSITIONS by matching the name key
  const nameKey = nameParts.join('-').normalize('NFC');
  // Normalize Norwegian chars for matching: strip æøå to ascii equivalents and vice versa
  function normalizeNorwegian(s: string): string {
    return s.replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/å/g, 'aa');
  }
  const nameKeyNormalized = normalizeNorwegian(nameKey);
  const knownKey = Object.keys(KNOWN_POSITIONS).find((k) => {
    const kNorm = normalizeNorwegian(k);
    return k === nameKey || kNorm === nameKeyNormalized
      || nameKey.includes(k) || k.includes(nameKey)
      || nameKeyNormalized.includes(kNorm) || kNorm.includes(nameKeyNormalized);
  });

  // If person is NOT in Stortinget API, build from curated data
  if (!rep && !dagensRep) {
    if (!knownKey) return null;

    const currentPositions: PersonPosition[] = [];
    const pastPositions: PersonPosition[] = [];
    // Use the knownKey to build a proper display name (preserves æøå)
    const displayName = knownKey.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');

    for (const pos of KNOWN_POSITIONS[knownKey]) {
      if (pos.isCurrent) {
        currentPositions.push(pos);
      } else {
        pastPositions.push(pos);
      }
    }

    // Determine party from political positions or well-known affiliations
    const politicalPos = KNOWN_POSITIONS[knownKey].find(p => p.type === 'political' && p.organization !== 'Stortinget');
    const party = politicalPos?.organization || KNOWN_PARTY_MAP[knownKey];
    pastPositions.sort((a, b) => (b.startYear || 0) - (a.startYear || 0));

    return {
      id: personId,
      name: displayName,
      party,
      fylke: undefined,
      email: undefined,
      birthYear: undefined,
      imageUrl: undefined,
      committees: undefined,
      currentPositions,
      pastPositions,
    };
  }

  const person = dagensRep || rep!;
  const partyInfo = PARTY_ID_MAP[person.parti.id];
  const name = `${person.fornavn} ${person.etternavn}`;
  const birthYear = person.foedselsdato ? new Date(person.foedselsdato).getFullYear() : undefined;

  // Build current positions from live data
  const currentPositions: PersonPosition[] = [];
  const pastPositions: PersonPosition[] = [];

  // Current Stortinget position
  currentPositions.push({
    title: 'Stortingsrepresentant',
    organization: 'Stortinget',
    type: 'political',
    startYear: 2021,
    endYear: null,
    isCurrent: true,
    description: `Representerer ${person.fylke.navn} for ${partyInfo?.name || person.parti.navn}`,
  });

  // Committee memberships (from dagensrepresentanter)
  if (dagensRep?.komiteer_liste) {
    for (const komite of dagensRep.komiteer_liste) {
      currentPositions.push({
        title: 'Komitémedlem',
        organization: komite.navn,
        type: 'committee',
        startYear: 2021,
        endYear: null,
        isCurrent: true,
      });
    }
  }

  // Check curated past positions (reuse knownKey from above)
  if (knownKey) {
    for (const pos of KNOWN_POSITIONS[knownKey]) {
      if (pos.isCurrent) {
        // Don't duplicate the Stortinget position
        if (pos.title !== 'Stortingsrepresentant') {
          currentPositions.push(pos);
        }
      } else {
        pastPositions.push(pos);
      }
    }
  }

  // Check historical periods served
  if (person.id) {
    const periods = await getPersonPeriods(person.id);
    for (const p of periods) {
      if (p.found) {
        const [startStr, endStr] = p.periodId.split('-');
        const alreadyHas = pastPositions.some(
          (pp) => pp.title === 'Stortingsrepresentant' && pp.startYear === parseInt(startStr)
        );
        if (!alreadyHas) {
          pastPositions.push({
            title: 'Stortingsrepresentant',
            organization: 'Stortinget',
            type: 'political',
            startYear: parseInt(startStr),
            endYear: parseInt(endStr),
            isCurrent: false,
            description: person.fylke.navn,
          });
        }
      }
    }
  }

  // Sort past positions by year descending
  pastPositions.sort((a, b) => (b.startYear || 0) - (a.startYear || 0));

  return {
    id: personId,
    name,
    party: partyInfo?.name || person.parti.navn,
    fylke: person.fylke.navn,
    email: dagensRep?.epost,
    birthYear,
    imageUrl: `https://data.stortinget.no/eksport/personbilde?personid=${person.id}&storrelse=middels`,
    committees: dagensRep?.komiteer_liste?.map((k) => k.navn),
    currentPositions,
    pastPositions,
  };
}

export async function getPartyRepresentatives(partyId: string): Promise<GraphData> {
  const reps = await fetchRepresentatives();

  // Map our internal party ID to Stortinget party code
  let stortingetPartyCode: string | null = null;
  for (const [code, info] of Object.entries(PARTY_ID_MAP)) {
    if (info.id === partyId) {
      stortingetPartyCode = code;
      break;
    }
  }

  if (!stortingetPartyCode) return { nodes: [], links: [] };

  const partyReps = reps.filter(
    (r) => r.parti.id === stortingetPartyCode && !r.vara_representant
  );

  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const seenNodes = new Set<string>();

  // Add party node
  const partyInfo = PARTY_ID_MAP[stortingetPartyCode];
  nodes.push({
    id: partyInfo.id,
    name: partyInfo.name,
    type: 'political_party',
    group: 'political',
  });
  seenNodes.add(partyInfo.id);

  // Add Stortinget node
  const stortingetId = 'org-stortinget';
  nodes.push({
    id: stortingetId,
    name: 'Stortinget',
    type: 'government_body',
    group: 'government',
  });
  seenNodes.add(stortingetId);

  // Add representatives
  for (const rep of partyReps) {
    const personId = `person-${rep.fornavn.toLowerCase()}-${rep.etternavn.toLowerCase()}`.replace(/\s+/g, '-');

    if (!seenNodes.has(personId)) {
      nodes.push({
        id: personId,
        name: `${rep.fornavn} ${rep.etternavn}`,
        type: 'person',
        group: 'person',
        imageUrl: `https://data.stortinget.no/eksport/personbilde?personid=${rep.id}&storrelse=middels`,
        meta: {
          party: partyInfo.name,
          fylke: rep.fylke.navn,
          stortingetId: rep.id,
        },
      });
      seenNodes.add(personId);
    }

    // Link to party
    links.push({
      source: personId,
      target: partyInfo.id,
      label: 'Medlem',
      category: 'political',
    });

    // Link to Stortinget
    links.push({
      source: personId,
      target: stortingetId,
      label: `Stortingsrep. (${rep.fylke.navn})`,
      category: 'political',
    });
  }

  return { nodes, links };
}

export async function getAllStortingetData(): Promise<GraphData> {
  const reps = await fetchRepresentatives();

  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const seenNodes = new Set<string>();

  // Add Stortinget node
  nodes.push({ id: 'org-stortinget', name: 'Stortinget', type: 'government_body', group: 'government' });
  seenNodes.add('org-stortinget');

  // Add all parties
  for (const [code, info] of Object.entries(PARTY_ID_MAP)) {
    if (!seenNodes.has(info.id)) {
      nodes.push({ id: info.id, name: info.name, type: 'political_party', group: 'political' });
      seenNodes.add(info.id);
    }
  }

  // Add all non-vara representatives
  for (const rep of reps.filter((r) => !r.vara_representant)) {
    const personId = `person-${rep.fornavn.toLowerCase()}-${rep.etternavn.toLowerCase()}`.replace(/\s+/g, '-');
    const partyInfo = PARTY_ID_MAP[rep.parti.id];
    if (!partyInfo) continue;

    if (!seenNodes.has(personId)) {
      nodes.push({
        id: personId,
        name: `${rep.fornavn} ${rep.etternavn}`,
        type: 'person',
        group: 'person',
        imageUrl: `https://data.stortinget.no/eksport/personbilde?personid=${rep.id}&storrelse=middels`,
        meta: {
          party: partyInfo.name,
          fylke: rep.fylke.navn,
          stortingetId: rep.id,
        },
      });
      seenNodes.add(personId);
    }

    links.push({ source: personId, target: partyInfo.id, label: 'Medlem', category: 'political' });
    links.push({ source: personId, target: 'org-stortinget', label: `Stortingsrep. (${rep.fylke.navn})`, category: 'political' });
  }

  return { nodes, links };
}

export async function searchStortingetPersons(query: string): Promise<GraphNode[]> {
  const reps = await fetchRepresentatives();
  const q = query.toLowerCase();

  return reps
    .filter((r) => `${r.fornavn} ${r.etternavn}`.toLowerCase().includes(q))
    .slice(0, 15)
    .map((r) => ({
      id: `person-${r.fornavn.toLowerCase()}-${r.etternavn.toLowerCase()}`.replace(/\s+/g, '-'),
      name: `${r.fornavn} ${r.etternavn}`,
      type: 'person' as const,
      group: 'person',
    }));
}
