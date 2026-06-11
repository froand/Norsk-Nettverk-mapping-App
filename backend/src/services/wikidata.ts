// Wikidata SPARQL service for Norwegian politician data
// Fetches structured data about politicians, their positions, board memberships, and employment

const WIKIDATA_ENDPOINT = 'https://query.wikidata.org/sparql';
const USER_AGENT = 'NorskNettverk/1.0 (https://github.com/froand/norwegian-board-network)';

interface WikidataBinding {
  type: string;
  value: string;
  'xml:lang'?: string;
  datatype?: string;
}

interface WikidataResult {
  [key: string]: WikidataBinding;
}

export interface WikidataPosition {
  personId: string;
  personName: string;
  position: string;
  organization?: string;
  startDate?: string;
  endDate?: string;
  party?: string;
}

export interface WikidataPerson {
  id: string;
  name: string;
  party?: string;
  birthDate?: string;
  positions: WikidataPosition[];
  boardMemberships: WikidataPosition[];
  description?: string;
}

async function sparqlQuery(query: string): Promise<WikidataResult[]> {
  const url = `${WIKIDATA_ENDPOINT}?format=json&query=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
  });
  if (!res.ok) {
    console.error(`Wikidata SPARQL error: ${res.status}`);
    return [];
  }
  const data = await res.json();
  return data.results?.bindings || [];
}

// Get all Norwegian politicians who have been Stortinget members with their positions
export async function getStortingetMembersFromWikidata(): Promise<WikidataPerson[]> {
  const query = `
SELECT ?person ?personLabel ?partyLabel ?start ?end ?birthDate WHERE {
  ?person wdt:P31 wd:Q5 .
  ?person p:P39 ?stmt .
  ?stmt ps:P39 ?pos .
  ?pos rdfs:label "stortingsrepresentant"@nb .
  OPTIONAL { ?stmt pq:P580 ?start }
  OPTIONAL { ?stmt pq:P582 ?end }
  OPTIONAL { ?person wdt:P102 ?party }
  OPTIONAL { ?person wdt:P569 ?birthDate }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "nb,en" }
} ORDER BY ?personLabel
LIMIT 500`;

  const results = await sparqlQuery(query);
  const personMap = new Map<string, WikidataPerson>();

  for (const r of results) {
    const id = r.person?.value.split('/').pop() || '';
    const name = r.personLabel?.value || '';
    if (!name || !id) continue;

    if (!personMap.has(id)) {
      personMap.set(id, {
        id,
        name,
        party: r.partyLabel?.value,
        birthDate: r.birthDate?.value?.substring(0, 10),
        positions: [],
        boardMemberships: [],
      });
    }

    const person = personMap.get(id)!;
    person.positions.push({
      personId: id,
      personName: name,
      position: 'Stortingsrepresentant',
      startDate: r.start?.value?.substring(0, 10),
      endDate: r.end?.value?.substring(0, 10),
      party: r.partyLabel?.value,
    });
  }

  return Array.from(personMap.values());
}

// Get all positions (political, government, board) for a specific person by name
export async function getPersonPositionsFromWikidata(personName: string): Promise<WikidataPosition[]> {
  const query = `
SELECT ?person ?personLabel ?posLabel ?orgLabel ?start ?end WHERE {
  ?person wdt:P31 wd:Q5 .
  ?person rdfs:label "${personName}"@nb .
  ?person p:P39 ?stmt .
  ?stmt ps:P39 ?pos .
  OPTIONAL { ?stmt pq:P580 ?start }
  OPTIONAL { ?stmt pq:P582 ?end }
  OPTIONAL { ?stmt pq:P642 ?org }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "nb,en" }
}`;

  const results = await sparqlQuery(query);
  return results.map((r) => ({
    personId: r.person?.value.split('/').pop() || '',
    personName: r.personLabel?.value || personName,
    position: r.posLabel?.value || 'Ukjent',
    organization: r.orgLabel?.value,
    startDate: r.start?.value?.substring(0, 10),
    endDate: r.end?.value?.substring(0, 10),
  }));
}

// Get board memberships from Wikidata for Norwegian politicians
export async function getBoardMembershipsFromWikidata(): Promise<WikidataPosition[]> {
  const query = `
SELECT ?person ?personLabel ?orgLabel ?start ?end WHERE {
  ?person wdt:P31 wd:Q5 .
  ?person wdt:P27 wd:Q20 .
  ?person p:P39 ?stmt .
  ?stmt ps:P39 ?pos .
  ?pos rdfs:label "styremedlem"@nb .
  OPTIONAL { ?stmt pq:P642 ?org }
  OPTIONAL { ?stmt pq:P580 ?start }
  OPTIONAL { ?stmt pq:P582 ?end }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "nb,en" }
} LIMIT 200`;

  const results = await sparqlQuery(query);
  return results.map((r) => ({
    personId: r.person?.value.split('/').pop() || '',
    personName: r.personLabel?.value || '',
    position: 'Styremedlem',
    organization: r.orgLabel?.value,
    startDate: r.start?.value?.substring(0, 10),
    endDate: r.end?.value?.substring(0, 10),
  }));
}

// Search Wikidata for a person by name and get all their known positions
export async function searchWikidataPerson(name: string): Promise<WikidataPerson | null> {
  // Try both Norwegian and English labels
  const query = `
SELECT ?person ?personLabel ?partyLabel ?birthDate ?descr WHERE {
  ?person wdt:P31 wd:Q5 .
  { ?person rdfs:label "${name}"@nb } UNION { ?person rdfs:label "${name}"@en }
  ?person wdt:P27 wd:Q20 .
  OPTIONAL { ?person wdt:P102 ?party }
  OPTIONAL { ?person wdt:P569 ?birthDate }
  OPTIONAL { ?person schema:description ?descr . FILTER(LANG(?descr) = "nb") }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "nb,en" }
} LIMIT 1`;

  const results = await sparqlQuery(query);
  if (results.length === 0) return null;

  const r = results[0];
  const id = r.person?.value.split('/').pop() || '';
  const personName = r.personLabel?.value || name;

  // Get all positions for this person
  const positions = await getPersonPositionsFromWikidata(personName);

  const political = positions.filter((p) =>
    ['stortingsrepresentant', 'partileder', 'statsminister', 'statsråd'].some((t) =>
      p.position.toLowerCase().includes(t)
    )
  );

  const board = positions.filter((p) =>
    p.position.toLowerCase().includes('styremedlem') || p.position.toLowerCase().includes('styreleder')
  );

  return {
    id,
    name: personName,
    party: r.partyLabel?.value,
    birthDate: r.birthDate?.value?.substring(0, 10),
    description: r.descr?.value,
    positions: political,
    boardMemberships: board,
  };
}
