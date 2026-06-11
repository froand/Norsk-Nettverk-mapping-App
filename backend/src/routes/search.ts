import { Router } from 'express';
import { searchCompanies, searchPersonRoles } from '../services/brreg.js';
import { searchPoliticalPersons } from '../services/political-data.js';
import { searchStortingetPersons } from '../services/stortinget.js';

export const searchRoutes = Router();

searchRoutes.get('/', async (req, res) => {
  const query = (req.query.q as string) || '';
  if (query.length < 2) {
    res.json({ persons: [], companies: [] });
    return;
  }

  try {
    const [companies, politicalPersons, brregPersons, stortingetPersons] = await Promise.all([
      searchCompanies(query),
      Promise.resolve(searchPoliticalPersons(query)),
      searchPersonRoles(query).catch(() => []),
      searchStortingetPersons(query).catch(() => []),
    ]);

    // Merge all person sources, dedup by name
    const seenNames = new Set<string>();
    const allPersons: { id: string; name: string; type: string; source: string }[] = [];

    // Stortinget results first (most relevant for this app)
    for (const p of stortingetPersons) {
      const key = p.name.toLowerCase();
      if (!seenNames.has(key)) {
        seenNames.add(key);
        allPersons.push({ id: p.id, name: p.name, type: 'person', source: 'stortinget' });
      }
    }

    for (const p of politicalPersons) {
      const key = p.name.toLowerCase();
      if (!seenNames.has(key)) {
        seenNames.add(key);
        allPersons.push({ id: p.id, name: p.name, type: 'person', source: 'political' });
      }
    }

    for (const p of brregPersons) {
      const key = p.name.toLowerCase();
      if (!seenNames.has(key)) {
        seenNames.add(key);
        allPersons.push({ id: p.id, name: p.name, type: 'person', source: 'brreg' });
      }
    }

    res.json({
      persons: allPersons,
      companies: companies.map((c) => ({
        id: `org-${c.organisasjonsnummer}`,
        name: c.navn,
        orgNumber: c.organisasjonsnummer,
        type: 'company',
      })),
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});
