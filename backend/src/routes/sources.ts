import { Router } from 'express';
import { getCurrentGovernment } from '../services/regjeringen.js';
import { getPersonPositionsFromWikidata, searchWikidataPerson, getBoardMembershipsFromWikidata } from '../services/wikidata.js';
import { getLobbyMeetings, getLobbyMeetingsForPerson, getLobbyOrganizations, getLobbyConflicts, scrapeHearingSubmissions, getLobbyMeetingsForCommittee } from '../services/lobbyregister.js';

export const sourcesRoutes = Router();

// ==================== REGJERINGEN (Government) ====================

// Get current government members (ministers)
sourcesRoutes.get('/government/current', async (_req, res) => {
  try {
    const members = await getCurrentGovernment();
    res.json({ source: 'data.stortinget.no/regjering', members });
  } catch (e) {
    console.error('Government API error:', e);
    res.status(500).json({ error: 'Failed to fetch government data' });
  }
});

// ==================== WIKIDATA ====================

// Search for a person on Wikidata and get all their positions
sourcesRoutes.get('/wikidata/person/:name', async (req, res) => {
  const { name } = req.params;
  try {
    const person = await searchWikidataPerson(decodeURIComponent(name));
    if (!person) {
      res.status(404).json({ error: 'Person not found on Wikidata' });
      return;
    }
    res.json({ source: 'wikidata.org', person });
  } catch (e) {
    console.error('Wikidata search error:', e);
    res.status(500).json({ error: 'Failed to search Wikidata' });
  }
});

// Get all known positions for a person from Wikidata
sourcesRoutes.get('/wikidata/positions/:name', async (req, res) => {
  const { name } = req.params;
  try {
    const positions = await getPersonPositionsFromWikidata(decodeURIComponent(name));
    res.json({ source: 'wikidata.org', positions });
  } catch (e) {
    console.error('Wikidata positions error:', e);
    res.status(500).json({ error: 'Failed to fetch Wikidata positions' });
  }
});

// Get board memberships for Norwegian politicians from Wikidata
sourcesRoutes.get('/wikidata/boards', async (_req, res) => {
  try {
    const memberships = await getBoardMembershipsFromWikidata();
    res.json({ source: 'wikidata.org', memberships });
  } catch (e) {
    console.error('Wikidata boards error:', e);
    res.status(500).json({ error: 'Failed to fetch board memberships' });
  }
});

// ==================== LOBBY REGISTER ====================

// Get real hearing submissions scraped from Stortinget (live data)
sourcesRoutes.get('/lobby/hearings', async (_req, res) => {
  try {
    const submissions = await scrapeHearingSubmissions();
    res.json({
      source: 'data.stortinget.no/horingsinnspill (live)',
      count: submissions.length,
      submissions: submissions.slice(0, 100), // Return first 100
    });
  } catch (e) {
    console.error('Hearing scrape error:', e);
    res.status(500).json({ error: 'Failed to scrape hearings' });
  }
});

// Get hearing submissions for a specific committee
sourcesRoutes.get('/lobby/hearings/:committee', async (req, res) => {
  const { committee } = req.params;
  try {
    const submissions = await getLobbyMeetingsForCommittee(decodeURIComponent(committee));
    res.json({
      source: 'data.stortinget.no/horingsinnspill (live)',
      committee,
      count: submissions.length,
      submissions,
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch committee hearings' });
  }
});

// Get lobby organizations aggregated from real hearing data
sourcesRoutes.get('/lobby/organizations', async (_req, res) => {
  try {
    const organizations = await getLobbyOrganizations();
    res.json({ source: 'data.stortinget.no/horingsinnspill (live, aggregated)', organizations });
  } catch (e) {
    res.status(500).json({ error: 'Failed to aggregate lobby organizations' });
  }
});

// Get curated lobby meetings (known direct contacts)
sourcesRoutes.get('/lobby/meetings', (_req, res) => {
  const meetings = getLobbyMeetings();
  res.json({ source: 'curated (public records)', meetings });
});

// Get lobby meetings for a specific person
sourcesRoutes.get('/lobby/meetings/:personId', (req, res) => {
  const { personId } = req.params;
  const meetings = getLobbyMeetingsForPerson(personId);
  res.json({ source: 'curated (public records)', meetings });
});

// Get lobby-to-position conflicts (revolving door via lobby)
sourcesRoutes.get('/lobby/conflicts', (_req, res) => {
  const conflicts = getLobbyConflicts();
  res.json({ source: 'curated (public records)', conflicts });
});

// ==================== DATA SOURCES INFO ====================

sourcesRoutes.get('/info', (_req, res) => {
  res.json({
    sources: [
      {
        name: 'Stortinget Open Data',
        url: 'https://data.stortinget.no',
        type: 'live API',
        provides: ['Representatives', 'Government members', 'Committees', 'Photos', 'Historical periods'],
      },
      {
        name: 'Brønnøysundregistrene (brreg.no)',
        url: 'https://data.brreg.no',
        type: 'live API',
        provides: ['Company details', 'Board roles', 'Revenue data', 'Registration info'],
      },
      {
        name: 'Wikidata',
        url: 'https://query.wikidata.org',
        type: 'live SPARQL API',
        provides: ['Politician biographies', 'Historical positions', 'Board memberships', 'Party affiliations'],
      },
      {
        name: 'Regjeringen (via Stortinget)',
        url: 'https://data.stortinget.no/eksport/regjering',
        type: 'live API',
        provides: ['Current ministers', 'Department assignments', 'Government composition'],
      },
      {
        name: 'Lobbyregisteret',
        url: 'https://www.lobbyregisteret.no',
        type: 'curated (no public API)',
        provides: ['Lobby meetings', 'Organization contacts', 'Policy topics'],
      },
      {
        name: 'Karantenenemnda (avgjørelser)',
        url: 'https://www.regjeringen.no/no/dep/dfd/org/styrer-rad-og-utvalg-under-digitaliserings-og-forvaltningsdepartementet/karantenenemnda/avgjorelser-fra-karantenenemnda/id2472135/',
        type: 'official documents',
        provides: ['Quarantine decisions', 'Duration and restrictions', 'Conflict assessments', 'PDF documents per person'],
      },
      {
        name: 'Store norske leksikon (snl.no)',
        url: 'https://snl.no',
        type: 'reference',
        provides: ['Politician biographies', 'Career history', 'Background information'],
      },
      {
        name: 'OpenCorporates',
        url: 'https://api.opencorporates.com',
        type: 'planned (requires API key)',
        provides: ['International board data', 'Officer search across jurisdictions'],
      },
    ],
  });
});
