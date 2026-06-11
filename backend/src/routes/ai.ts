import { Router } from 'express';
import { detectAiConflicts } from '../services/ai-conflicts.js';
import { getPersonSummary } from '../services/ai-summary.js';

export const aiRoutes = Router();

aiRoutes.get('/person-summary/:personId', async (req, res) => {
  const { personId } = req.params;

  try {
    const summary = await getPersonSummary(personId);
    if (!summary) {
      res.status(404).json({ error: 'Person data not found' });
      return;
    }
    res.json(summary);
  } catch (error) {
    console.error('AI person summary error:', error);
    const message = error instanceof Error ? error.message : '';
    if (message.includes('not configured')) {
      res.status(503).json({ error: 'AI summary is not configured' });
      return;
    }
    res.status(500).json({ error: 'Failed to generate AI person summary' });
  }
});

aiRoutes.post('/detect-conflicts', async (_req, res) => {
  try {
    const conflicts = await detectAiConflicts();
    res.json({ conflicts });
  } catch (error) {
    console.error('AI conflict detection failed:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to detect conflicts',
    });
  }
});
