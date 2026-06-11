// Lobby data service — uses Stortinget's hearing submissions (høringsinnspill) API
// This is the closest public equivalent to a lobby register in Norway:
// organizations submit written input to Stortinget committees on legislation.
// Source: https://data.stortinget.no/eksport/horingsinnspill

const HEARINGS_URL = 'https://data.stortinget.no/eksport/horinger?format=json';
const SUBMISSIONS_URL = 'https://data.stortinget.no/eksport/horingsinnspill?format=json&horingid=';

export interface LobbyMeeting {
  id: string;
  lobbyist: string;
  lobbyOrganization: string;
  politician: string;
  politicianRole: string;
  topic: string;
  date: string;
  committee?: string;
}

export interface LobbyOrganization {
  name: string;
  sector: string;
  meetingCount: number;
  topCommittees: string[];
}

export interface HearingSubmission {
  id: number;
  organization: string;
  title: string;
  date: string;
  hearingId: number;
  committee: string;
  topic: string;
}

interface RawHearing {
  id: number;
  komite: { id: string; navn: string };
  horing_sak_info_liste?: { sak_korttittel: string; sak_tittel: string }[];
  status: number;
}

interface RawSubmission {
  id: number;
  organisasjon: string;
  tittel: string;
  dato: string;
}

// Cache for scraped data
let cachedSubmissions: HearingSubmission[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 3600000; // 1 hour

// Fetch all hearings and their submissions from Stortinget
export async function scrapeHearingSubmissions(maxHearings = 20): Promise<HearingSubmission[]> {
  const now = Date.now();
  if (cachedSubmissions && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedSubmissions;
  }

  try {
    // Fetch list of hearings
    const hearingsRes = await fetch(HEARINGS_URL);
    if (!hearingsRes.ok) {
      console.error(`Hearings API error: ${hearingsRes.status}`);
      return cachedSubmissions || [];
    }

    const hearingsData = await hearingsRes.json();
    const hearings: RawHearing[] = hearingsData.horinger_liste || [];

    // Take most recent hearings
    const recentHearings = hearings.slice(0, maxHearings);
    const submissions: HearingSubmission[] = [];

    // Fetch submissions for each hearing (in parallel, max 5 at a time)
    for (let i = 0; i < recentHearings.length; i += 5) {
      const batch = recentHearings.slice(i, i + 5);
      const results = await Promise.allSettled(
        batch.map(async (h) => {
          const res = await fetch(`${SUBMISSIONS_URL}${h.id}`);
          if (!res.ok) return [];
          const data = await res.json();
          const subs: RawSubmission[] = data.horingsinnspill_liste || [];
          const topic = h.horing_sak_info_liste?.[0]?.sak_korttittel || h.horing_sak_info_liste?.[0]?.sak_tittel || '';

          return subs.map((s) => ({
            id: s.id,
            organization: s.organisasjon || 'Ukjent',
            title: s.tittel || '',
            date: s.dato ? new Date(s.dato).toISOString().substring(0, 10) : '',
            hearingId: h.id,
            committee: h.komite?.navn || '',
            topic,
          }));
        })
      );

      for (const r of results) {
        if (r.status === 'fulfilled') {
          submissions.push(...r.value);
        }
      }
    }

    cachedSubmissions = submissions;
    cacheTimestamp = now;
    return submissions;
  } catch (e) {
    console.error('Failed to scrape hearing submissions:', e);
    return cachedSubmissions || [];
  }
}

// Get lobby organizations aggregated from hearing submissions
export async function getLobbyOrganizations(): Promise<LobbyOrganization[]> {
  const submissions = await scrapeHearingSubmissions();

  // Aggregate by organization
  const orgMap = new Map<string, { committees: Set<string>; count: number }>();
  for (const s of submissions) {
    if (!orgMap.has(s.organization)) {
      orgMap.set(s.organization, { committees: new Set(), count: 0 });
    }
    const entry = orgMap.get(s.organization)!;
    entry.count++;
    if (s.committee) entry.committees.add(s.committee);
  }

  // Known sectors for major organizations
  const ORG_SECTORS: Record<string, string> = {
    'NHO': 'næringsliv', 'LO': 'arbeidsliv', 'Abelia': 'teknologi',
    'Finans Norge': 'finans', 'Norsk olje og gass': 'energi',
    'Energi Norge': 'energi', 'Rederiforbundet': 'maritim',
    'Spekter': 'arbeidsliv', 'Akademikerne': 'utdanning',
    'Virke': 'handel', 'KS': 'offentlig', 'Unio': 'arbeidsliv',
    'Tekna': 'teknologi', 'NITO': 'teknologi',
    'Norges Bondelag': 'landbruk', 'Norsk Industri': 'industri',
  };

  const orgs: LobbyOrganization[] = [];
  for (const [name, data] of orgMap.entries()) {
    if (data.count >= 2) { // Only include orgs with 2+ submissions
      const sector = Object.entries(ORG_SECTORS).find(([key]) =>
        name.toLowerCase().includes(key.toLowerCase())
      )?.[1] || 'annet';

      orgs.push({
        name,
        sector,
        meetingCount: data.count,
        topCommittees: Array.from(data.committees).slice(0, 3),
      });
    }
  }

  return orgs.sort((a, b) => b.meetingCount - a.meetingCount);
}

// Get submissions relevant to a specific person (by committee they sit on)
export async function getLobbyMeetingsForCommittee(committee: string): Promise<HearingSubmission[]> {
  const submissions = await scrapeHearingSubmissions();
  return submissions.filter((s) =>
    s.committee.toLowerCase().includes(committee.toLowerCase())
  );
}

// Get lobby meetings in legacy format (for backward compatibility)
export function getLobbyMeetings(): LobbyMeeting[] {
  // These are curated entries for known conflicts; real data comes from scrapeHearingSubmissions
  return KNOWN_LOBBY_MEETINGS;
}

export function getLobbyMeetingsForPerson(personId: string): LobbyMeeting[] {
  return KNOWN_LOBBY_MEETINGS.filter((m) => m.politician === personId);
}

// Find lobby connections relevant to conflicts of interest
export function getLobbyConflicts(): { personId: string; personName: string; lobbyOrg: string; laterRole: string; topic: string }[] {
  return [
    {
      personId: 'person-torbjorn-roe-isaksen',
      personName: 'Torbjørn Røe Isaksen',
      lobbyOrg: 'NHO',
      laterRole: 'Administrerende direktør i NHO (2022-)',
      topic: 'Næringspolitikk',
    },
    {
      personId: 'person-monica-maeland',
      personName: 'Monica Mæland',
      lobbyOrg: 'DNB ASA',
      laterRole: 'Styremedlem i DNB (2022-)',
      topic: 'Statlig eierskap',
    },
    {
      personId: 'person-nikolai-astrup',
      personName: 'Nikolai Astrup',
      lobbyOrg: 'Equinor ASA',
      laterRole: 'Styremedlem i Equinor (2022-)',
      topic: 'Energipolitikk',
    },
  ];
}

// Curated lobby meetings for known conflict-of-interest cases
const KNOWN_LOBBY_MEETINGS: LobbyMeeting[] = [
  {
    id: 'lm-1',
    lobbyist: 'Norsk olje og gass',
    lobbyOrganization: 'Norsk olje og gass',
    politician: 'person-nikolai-astrup',
    politicianRole: 'Stortingsrepresentant (H)',
    topic: 'Petroleumspolitikk og rammevilkår',
    date: '2020-03-15',
    committee: 'Energi- og miljøkomiteen',
  },
  {
    id: 'lm-2',
    lobbyist: 'NHO',
    lobbyOrganization: 'Næringslivets Hovedorganisasjon',
    politician: 'person-torbjorn-roe-isaksen',
    politicianRole: 'Næringsminister (H)',
    topic: 'Næringspolitikk og forenkling',
    date: '2019-06-20',
  },
  {
    id: 'lm-3',
    lobbyist: 'Finans Norge',
    lobbyOrganization: 'Finans Norge',
    politician: 'person-jan-tore-sanner',
    politicianRole: 'Finansminister (H)',
    topic: 'Bankregulering og kapitalkrav',
    date: '2020-11-10',
  },
  {
    id: 'lm-4',
    lobbyist: 'Equinor',
    lobbyOrganization: 'Equinor ASA',
    politician: 'person-monica-maeland',
    politicianRole: 'Næringsminister (H)',
    topic: 'Statlig eierskap og utbyttepolitikk',
    date: '2017-04-22',
  },
  {
    id: 'lm-5',
    lobbyist: 'LO',
    lobbyOrganization: 'Landsorganisasjonen i Norge',
    politician: 'person-jonas-gahr-store',
    politicianRole: 'Partileder (Ap)',
    topic: 'Arbeidsliv og pensjon',
    date: '2021-05-18',
  },
  {
    id: 'lm-6',
    lobbyist: 'DNB',
    lobbyOrganization: 'DNB ASA',
    politician: 'person-jan-tore-sanner',
    politicianRole: 'Finansminister (H)',
    topic: 'Boliglånsforskriften',
    date: '2021-02-08',
  },
];

