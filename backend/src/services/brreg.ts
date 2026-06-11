import type { GraphData, GraphNode, GraphLink } from '../types.js';

// Brreg.no API client for fetching company roles
const BRREG_BASE = 'https://data.brreg.no/enhetsregisteret/api';
const BRREG_ROLLER_BASE = 'https://data.brreg.no/rolleregisteret/api/v1';

interface BrregRole {
  type: { kode: string; beskrivelse: string };
  person?: { navn: string; fodselsdato?: string };
  fratraadt: boolean;
}

interface BrregRollegruppe {
  type: { kode: string; beskrivelse: string };
  roller: BrregRole[];
}

interface BrregRollerResponse {
  rollegrupper?: BrregRollegruppe[];
}

interface BrregEnhet {
  organisasjonsnummer: string;
  navn: string;
  organisasjonsform?: { kode: string; beskrivelse: string };
}

interface BrregSearchResponse {
  _embedded?: { enheter: BrregEnhet[] };
}

interface PersonSearchResult {
  id: string;
  name: string;
}

// Search for people by name using brreg roller API
export async function searchPersonRoles(name: string): Promise<PersonSearchResult[]> {
  try {
    // The roller API allows searching by person name
    const url = `${BRREG_ROLLER_BASE}/roller?rolleinnehaver.navn=${encodeURIComponent(name)}&size=20`;
    const res = await fetch(url);
    if (!res.ok) {
      // Fallback: scan companies for matching person names
      return await searchPersonViaCompanies(name);
    }
    const data = await res.json();

    const persons = new Map<string, string>();
    const items = data._embedded?.roller || data.rolleinnehavere || [];
    for (const item of items) {
      const personName = item?.rolleinnehaver?.navn || item?.person?.navn;
      if (personName && personName.toLowerCase().includes(name.toLowerCase())) {
        const id = `person-${personName.toLowerCase().replace(/\s+/g, '-')}`;
        if (!persons.has(id)) {
          persons.set(id, personName);
        }
      }
    }
    return Array.from(persons.entries()).map(([id, n]) => ({ id, name: n }));
  } catch {
    return await searchPersonViaCompanies(name);
  }
}

// Fallback: search companies and extract person names from their roles
async function searchPersonViaCompanies(name: string): Promise<PersonSearchResult[]> {
  try {
    // Search for companies that might have this person
    // We search a few well-known large companies and extract matching names
    const companies = await searchCompanies(name);
    const persons = new Map<string, string>();

    // Also try fetching roles from a few companies to find person names
    // This is a best-effort approach since brreg doesn't have a direct person search
    for (const company of companies.slice(0, 3)) {
      const roles = await getCompanyRoles(company.organisasjonsnummer);
      for (const node of roles.nodes) {
        if (node.type === 'person' && node.name.toLowerCase().includes(name.toLowerCase())) {
          persons.set(node.id, node.name);
        }
      }
    }

    return Array.from(persons.entries()).map(([id, n]) => ({ id, name: n }));
  } catch {
    return [];
  }
}

// Search for a person by name and find ALL their board/role positions across companies
export async function getPersonRolesNetwork(personName: string): Promise<GraphData> {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const seenNodes = new Set<string>();

  const personId = `person-${personName.toLowerCase().replace(/\s+/g, '-')}`;
  nodes.push({ id: personId, name: personName, type: 'person', group: 'person' });
  seenNodes.add(personId);

  try {
    // Use the roller API to find all companies this person is connected to
    const url = `${BRREG_ROLLER_BASE}/roller?rolleinnehaver.navn=${encodeURIComponent(personName)}&size=50`;
    const res = await fetch(url);

    if (res.ok) {
      const data = await res.json();
      const items = data._embedded?.roller || [];

      for (const item of items) {
        const orgNr = item?.enhet?.organisasjonsnummer;
        const orgName = item?.enhet?.navn;
        const roleDesc = item?.type?.beskrivelse || 'Rolle';

        if (orgNr && orgName) {
          const orgId = `org-${orgNr}`;
          if (!seenNodes.has(orgId)) {
            nodes.push({ id: orgId, name: orgName, type: 'company', group: 'company' });
            seenNodes.add(orgId);
          }
          links.push({
            source: personId,
            target: orgId,
            label: roleDesc,
            category: 'board',
          });
        }
      }
    }
  } catch (e) {
    console.error('Failed to fetch person roles from brreg:', e);
  }

  return { nodes, links };
}

export async function searchCompanies(query: string): Promise<BrregEnhet[]> {
  const url = `${BRREG_BASE}/enheter?navn=${encodeURIComponent(query)}&size=10`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data: BrregSearchResponse = await res.json();
  return data._embedded?.enheter || [];
}

export async function getCompanyRoles(orgNumber: string): Promise<GraphData> {
  const [enhetRes, rollerRes] = await Promise.all([
    fetch(`${BRREG_BASE}/enheter/${orgNumber}`),
    fetch(`${BRREG_BASE}/enheter/${orgNumber}/roller`),
  ]);

  if (!enhetRes.ok || !rollerRes.ok) {
    return { nodes: [], links: [] };
  }

  const enhet: BrregEnhet = await enhetRes.json();
  const roller: BrregRollerResponse = await rollerRes.json();

  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const seenNodes = new Set<string>();

  const companyId = `org-${orgNumber}`;
  nodes.push({
    id: companyId,
    name: enhet.navn,
    type: 'company',
    group: 'company',
  });
  seenNodes.add(companyId);

  if (roller.rollegrupper) {
    for (const gruppe of roller.rollegrupper) {
      for (const rolle of gruppe.roller) {
        if (!rolle.person || rolle.fratraadt) continue;
        const personName = rolle.person.navn;
        if (!personName || typeof personName !== 'string') continue;

        const personId = `person-${personName.toLowerCase().replace(/\s+/g, '-')}`;

        if (!seenNodes.has(personId)) {
          nodes.push({
            id: personId,
            name: personName,
            type: 'person',
            group: 'person',
          });
          seenNodes.add(personId);
        }

        links.push({
          source: personId,
          target: companyId,
          label: rolle.type.beskrivelse,
          category: gruppe.type.kode === 'STYR' ? 'board' : 'executive',
        });
      }
    }
  }

  return { nodes, links };
}
