import { Router } from 'express';
import { getAllTimelines, getAllConflicts, getPoliticalData } from '../services/political-data.js';

export const companyRoutes = Router();

// Map curated org IDs (without 'org-' prefix) to real Brreg org numbers
const ORG_NUMBER_MAP: Record<string, string> = {
  'nho': '955600436',
  'dnb': '984851006',
  'equinor': '923609016',
  'telenor': '982463718',
  'norsk-hydro': '914778271',
  'mckinsey': '979573587',
  'vestre': '923470565',
  'gambit-hk': '971593865',
  'wikborg-rein': '916782195',
  'aker-asa': '914364900',
  'statkraft': '962986277',
  'kommunalbanken': '981203267',
  'first-house': '993810660',
  'helse-vest-rhf': '983658725',
  'finans-norge': '996549488',
  'nho-logistikk-transport': '970187384',
  'nho-service-handel': '977041707',
  'norges-rederiforbund': '971436190',
  'okea': '915419062',
  'forleggerforeningen': '956609046',
  'legemiddelindustrien': '983956527',
  'sjomat-norge': '974461021',
  'offshore-norge': '987989297',
  'raeder': '914093473',
  'storebrand': '911106396',
  'scatec': '990918546',
  'cloudberry': '821820362',
};

// State ownership percentages (from regjeringen.no/eierskapsmeldingen)
const STATE_OWNERSHIP: Record<string, { percent: number; source: string }> = {
  '923609016': { percent: 67, source: 'Nærings- og fiskeridepartementet' },
  '984851006': { percent: 34, source: 'Nærings- og fiskeridepartementet' },
  '982463718': { percent: 54, source: 'Nærings- og fiskeridepartementet' },
  '914778271': { percent: 34.3, source: 'Nærings- og fiskeridepartementet' },
  '962986277': { percent: 100, source: 'Nærings- og fiskeridepartementet' },
  '981203267': { percent: 100, source: 'Kommunal- og distriktsdepartementet' },
};

interface CompanyDetails {
  orgNumber: string;
  name: string;
  organizationForm: string;
  industry: string[];
  employees: number | null;
  founded: string | null;
  registered: string | null;
  location: string | null;
  website: string | null;
  ownershipSector: string | null;
  purpose: string | null;
  isStateOwned: boolean;
  isPubliclyListed: boolean;
  isBankrupt: boolean;
  lastAnnualReport: string | null;
  phone: string | null;
  stateOwnershipPercent: number | null;
  stateOwnershipSource: string | null;
  politicalConnections: PoliticalConnection[];
  entanglementScore: number;
  revolvingDoorCount: number;
  liveBoard: LiveBoardMember[];
  isDeleted: boolean;
  deletedDate: string | null;
  notFoundInBrreg: boolean;
  brregUrl: string;
  financials: CompanyFinancials | null;
}

interface CompanyFinancials {
  year: string;
  currency: string;
  revenue: number | null;
  operatingResult: number | null;
  netIncome: number | null;
  totalAssets: number | null;
  equity: number | null;
  totalDebt: number | null;
  accountingStandard: string | null;
}

interface PoliticalConnection {
  personId: string;
  personName: string;
  role: string;
  category: 'board' | 'political' | 'government' | 'executive';
  startYear: number;
  endYear?: number;
  isRevolvingDoor: boolean;
  previousPoliticalRole?: string;
}

interface LiveBoardMember {
  name: string;
  role: 'Styreleder' | 'Styremedlem' | 'Daglig leder' | 'Varamedlem';
  personId?: string;
}

interface BrregRollerResponse {
  rollegrupper?: Array<{
    roller?: Array<{
      type?: { beskrivelse?: string };
      person?: {
        navn?: string | { fornavn?: string; etternavn?: string };
      };
      fratraadt?: boolean;
    }>;
  }>;
}

async function fetchFinancials(orgNumber: string): Promise<CompanyFinancials | null> {
  try {
    const res = await fetch(`https://data.brreg.no/regnskapsregisteret/regnskap/${orgNumber}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    // Get the latest SELSKAP entry (company-level, not consolidated)
    const latest = data.find((r: any) => r.regnskapstype === 'SELSKAP') || data[0];
    const result = latest.resultatregnskapResultat || {};
    const drift = result.driftsresultat || {};
    const balance = latest.egenkapitalGjeld || {};
    return {
      year: latest.regnskapsperiode?.tilDato?.substring(0, 4) || '',
      currency: latest.valuta || 'NOK',
      revenue: drift.driftsinntekter?.sumDriftsinntekter ?? null,
      operatingResult: drift.driftsresultat ?? null,
      netIncome: result.aarsresultat ?? null,
      totalAssets: latest.eiendeler?.sumEiendeler ?? null,
      equity: balance.egenkapital?.sumEgenkapital ?? null,
      totalDebt: balance.gjeldOversikt?.sumGjeld ?? null,
      accountingStandard: latest.regnkapsprinsipper?.regnskapsregler ?? null,
    };
  } catch {
    return null;
  }
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .split(/\s+/)
    .sort()
    .join(' ');
}

function parseBoardRole(description?: string): LiveBoardMember['role'] | null {
  if (!description) return null;
  const normalized = description.toLowerCase();
  if (normalized.includes('daglig leder')) return 'Daglig leder';
  if (normalized.includes('styrets leder') || normalized.includes('styreleder')) return 'Styreleder';
  if (normalized.includes('varamedlem')) return 'Varamedlem';
  if (normalized.includes('styremedlem')) return 'Styremedlem';
  return null;
}

function getRolePersonName(person?: { navn?: string | { fornavn?: string; etternavn?: string } }): string {
  if (!person?.navn) return '';
  if (typeof person.navn === 'string') return person.navn.trim();
  return [person.navn.fornavn, person.navn.etternavn].filter(Boolean).join(' ').trim();
}

async function fetchBoardMembers(orgNumber: string): Promise<LiveBoardMember[]> {
  const response = await fetch(`https://data.brreg.no/enhetsregisteret/api/enheter/${orgNumber}/roller`);
  if (!response.ok) {
    throw new Error(`Failed roller lookup: ${response.status}`);
  }

  const data = await response.json() as BrregRollerResponse;
  const personNodes = getPoliticalData().nodes.filter((node) => node.type === 'person');
  const personByName = new Map<string, string>();
  for (const node of personNodes) {
    personByName.set(normalizeName(node.name), node.id);
  }

  const members: LiveBoardMember[] = [];
  for (const roleGroup of data.rollegrupper || []) {
    for (const role of roleGroup.roller || []) {
      if (role.fratraadt) continue;
      const parsedRole = parseBoardRole(role.type?.beskrivelse);
      if (!parsedRole) continue;

      const name = getRolePersonName(role.person);
      if (!name) continue;
      const personId = personByName.get(normalizeName(name));

      members.push({
        name,
        role: parsedRole,
        personId,
      });
    }
  }

  return members;
}

function buildStaticBoardFallback(connections: PoliticalConnection[]): LiveBoardMember[] {
  const seen = new Set<string>();
  const fallback: LiveBoardMember[] = [];
  for (const connection of connections) {
    if (connection.category !== 'board' && connection.category !== 'executive') continue;
    const key = `${connection.personId}:${connection.role}`;
    if (seen.has(key)) continue;
    seen.add(key);
    fallback.push({
      name: connection.personName,
      role: connection.category === 'executive' ? 'Daglig leder' : 'Styremedlem',
      personId: connection.personId,
    });
  }
  return fallback;
}

function resolveOrgNumber(input: string): string {
  const mapped = ORG_NUMBER_MAP[input];
  if (mapped) return mapped;
  // Only allow valid 9-digit Norwegian org numbers as pass-through values
  if (/^\d{9}$/.test(input)) return input;
  return '';
}

function getPoliticalConnectionsForOrg(orgId: string): {
  connections: PoliticalConnection[];
  entanglementScore: number;
  revolvingDoorCount: number;
} {
  const timelines = getAllTimelines();
  const conflicts = getAllConflicts();
  const connections: PoliticalConnection[] = [];

  for (const timeline of timelines) {
    for (const pos of timeline.positions) {
      if (pos.orgId === orgId) {
        // Check if this person had a political/government role BEFORE this position
        const politicalRoles = timeline.positions.filter(
          (p) =>
            (p.category === 'political' || p.category === 'government') &&
            p.startYear < pos.startYear
        );

        const isRevolvingDoor = politicalRoles.length > 0 &&
          (pos.category === 'board' || pos.category === 'executive');

        const previousPoliticalRole = isRevolvingDoor
          ? politicalRoles
              .sort((a, b) => b.startYear - a.startYear)[0]
              ?.role + ' (' + politicalRoles.sort((a, b) => b.startYear - a.startYear)[0]?.orgName + ')'
          : undefined;

        connections.push({
          personId: timeline.personId,
          personName: timeline.personName,
          role: pos.role,
          category: pos.category,
          startYear: pos.startYear,
          endYear: pos.endYear,
          isRevolvingDoor,
          previousPoliticalRole,
        });
      }
    }
  }

  const revolvingDoorCount = connections.filter((c) => c.isRevolvingDoor).length;

  // Entanglement score (0-100):
  // - Each political connection: +15
  // - Each revolving door: +25
  // - Each active conflict: +20
  // - Cap at 100
  const orgConflicts = conflicts.filter(
    (c) => c.boardOrg === orgId.replace('org-', '') ||
      connections.some((conn) => conn.personId === c.personId)
  );

  const score = Math.min(
    100,
    connections.length * 15 + revolvingDoorCount * 25 + orgConflicts.length * 20
  );

  return { connections, entanglementScore: score, revolvingDoorCount };
}

companyRoutes.get('/:orgNumber', async (req, res) => {
  const { orgNumber } = req.params;
  const resolvedOrgNumber = resolveOrgNumber(orgNumber);
  const orgId = `org-${orgNumber}`;

  // Look up company name from graph data
  const graphData = getPoliticalData();
  const graphNode = graphData.nodes.find((n) => n.id === orgId);
  const displayName = graphNode?.name || orgNumber;

  // Get political connections regardless of Brreg lookup success
  const { connections, entanglementScore, revolvingDoorCount } =
    getPoliticalConnectionsForOrg(orgId);

  if (!resolvedOrgNumber) {
    // No Brreg org number — return what we know from graph data
    res.json({
      orgNumber: '',
      name: displayName,
      organizationForm: 'Ukjent',
      industry: [],
      employees: null,
      founded: null,
      registered: null,
      location: null,
      website: null,
      ownershipSector: null,
      purpose: null,
      isStateOwned: false,
      isPubliclyListed: false,
      isBankrupt: false,
      lastAnnualReport: null,
      phone: null,
      stateOwnershipPercent: null,
      stateOwnershipSource: null,
      politicalConnections: connections,
      entanglementScore,
      revolvingDoorCount,
      liveBoard: [],
      isDeleted: false,
      deletedDate: null,
      notFoundInBrreg: true,
      brregUrl: '',
      financials: null,
    });
    return;
  }

  // Fetch live board, company details, and financials in parallel
  const [liveBoard, response, financialsResult] = await Promise.allSettled([
    fetchBoardMembers(resolvedOrgNumber),
    fetch(`https://data.brreg.no/enhetsregisteret/api/enheter/${resolvedOrgNumber}`),
    fetchFinancials(resolvedOrgNumber),
  ]);

  const liveBoardMembers = liveBoard.status === 'fulfilled'
    ? liveBoard.value
    : buildStaticBoardFallback(connections);
  const companyResponse = response.status === 'fulfilled' ? response.value : null;
  const financials = financialsResult.status === 'fulfilled' ? financialsResult.value : null;

  try {
    if (!companyResponse || !companyResponse.ok) {
      // Always return at least basic info with Brreg link
      res.json({
        orgNumber: resolvedOrgNumber,
        name: orgNumber,
        organizationForm: 'Ukjent',
        industry: [],
        employees: null,
        founded: null,
        registered: null,
        location: null,
        website: null,
        ownershipSector: null,
        purpose: null,
        isStateOwned: false,
        isPubliclyListed: false,
        isBankrupt: false,
        lastAnnualReport: null,
        phone: null,
        stateOwnershipPercent: null,
        stateOwnershipSource: null,
        politicalConnections: connections,
        entanglementScore,
        revolvingDoorCount,
        liveBoard: liveBoardMembers,
        isDeleted: false,
        deletedDate: null,
        notFoundInBrreg: true,
        brregUrl: `https://data.brreg.no/enhetsregisteret/oppslag/enheter/${resolvedOrgNumber}`,
        financials,
      });
      return;
    }

    const data = await companyResponse.json();

    const industries: string[] = [];
    if (data.naeringskode1) industries.push(data.naeringskode1.beskrivelse);
    if (data.naeringskode2) industries.push(data.naeringskode2.beskrivelse);
    if (data.naeringskode3) industries.push(data.naeringskode3.beskrivelse);

    const address = data.forretningsadresse || data.postadresse;
    const location = address
      ? `${(address.adresse || []).join(', ')}, ${address.postnummer} ${address.poststed}`
      : null;

    const sectorDesc = data.institusjonellSektorkode?.beskrivelse || null;
    const isStateOwned = sectorDesc?.toLowerCase().includes('statlig') || false;

    const stateOwnership = STATE_OWNERSHIP[resolvedOrgNumber];

    const details: CompanyDetails = {
      orgNumber: data.organisasjonsnummer,
      name: data.navn,
      organizationForm: data.organisasjonsform?.beskrivelse || data.organisasjonsform?.kode || 'Ukjent',
      industry: industries,
      employees: data.antallAnsatte ?? null,
      founded: data.stiftelsesdato || null,
      registered: data.registreringsdatoEnhetsregisteret || null,
      location,
      website: data.hjemmeside || null,
      ownershipSector: sectorDesc,
      purpose: data.vedtektsfestetFormaal?.join(' ') || null,
      isStateOwned,
      isPubliclyListed: data.organisasjonsform?.kode === 'ASA',
      isBankrupt: data.konkurs || false,
      lastAnnualReport: data.sisteInnsendteAarsregnskap || null,
      phone: data.telefon || null,
      stateOwnershipPercent: stateOwnership?.percent ?? null,
      stateOwnershipSource: stateOwnership?.source ?? null,
      politicalConnections: connections,
      entanglementScore,
      revolvingDoorCount,
      liveBoard: liveBoardMembers,
      isDeleted: data.slettedato != null,
      deletedDate: data.slettedato || null,
      notFoundInBrreg: false,
      brregUrl: `https://data.brreg.no/enhetsregisteret/oppslag/enheter/${resolvedOrgNumber}`,
      financials,
    };

    res.json(details);
  } catch (error) {
    console.error('Company details error:', error);
    res.status(500).json({ error: 'Failed to fetch company details' });
  }
});
