// Regjeringen (Government) data service
// Uses Stortinget's /eksport/regjering endpoint for current government members
// and historical government data

const REGJERING_URL = 'https://data.stortinget.no/eksport/regjering?format=json';

export interface GovernmentMember {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  department: string;
  title: string;
  role: string;
  party: string;
  partyId: string;
  birthDate?: string;
}

interface RawRegjeringsmedlem {
  id: string;
  fornavn: string;
  etternavn: string;
  departement: string;
  tittel: string;
  verv: string;
  foedselsdato: string | null;
  parti: {
    id: string;
    navn: string;
  };
}

function parseDotNetDate(dateStr: string | null): string | undefined {
  if (!dateStr) return undefined;
  const match = dateStr.match(/\/Date\((-?\d+)/);
  if (match) {
    const ts = parseInt(match[1], 10);
    return new Date(ts).toISOString().substring(0, 10);
  }
  return undefined;
}

// Fetch current government members (ministers)
export async function getCurrentGovernment(): Promise<GovernmentMember[]> {
  try {
    const res = await fetch(REGJERING_URL);
    if (!res.ok) {
      console.error(`Government API error: ${res.status}`);
      return [];
    }

    const data = await res.json();
    const members: RawRegjeringsmedlem[] = data.regjeringsmedlemmer_liste || [];

    return members.map((m) => ({
      id: m.id,
      firstName: m.fornavn,
      lastName: m.etternavn,
      fullName: `${m.fornavn} ${m.etternavn}`,
      department: m.departement,
      title: m.tittel,
      role: m.verv,
      party: m.parti?.navn || '',
      partyId: m.parti?.id || '',
      birthDate: parseDotNetDate(m.foedselsdato),
    }));
  } catch (e) {
    console.error('Failed to fetch government data:', e);
    return [];
  }
}

// Get all government members as graph-ready data
export async function getGovernmentGraphData(): Promise<{
  members: GovernmentMember[];
  departments: string[];
}> {
  const members = await getCurrentGovernment();
  const departments = [...new Set(members.map((m) => m.department))];
  return { members, departments };
}
