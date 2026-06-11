import { Router } from 'express';
import { getKaranteneDecisions, getKaranteneDecisionsByPersonId } from '../services/karantene-data.js';

export const karanteneRoutes = Router();

karanteneRoutes.get('/', async (req, res) => {
  const year = typeof req.query.year === 'string' ? Number.parseInt(req.query.year, 10) : undefined;
  const person = typeof req.query.person === 'string' ? req.query.person : undefined;
  const org = typeof req.query.org === 'string' ? req.query.org : undefined;

  try {
    const decisions = await getKaranteneDecisions({
      year: Number.isFinite(year) ? year : undefined,
      person,
      org,
    });
    res.json(decisions);
  } catch (error) {
    console.error('Failed to fetch karantene decisions:', error);
    res.status(500).json({ error: 'Failed to fetch karantene decisions' });
  }
});

karanteneRoutes.get('/:personId', async (req, res) => {
  const { personId } = req.params;

  try {
    const decisions = await getKaranteneDecisionsByPersonId(personId);
    res.json(decisions);
  } catch (error) {
    console.error('Failed to fetch karantene decisions for person:', error);
    res.status(500).json({ error: 'Failed to fetch person karantene decisions' });
  }
});
