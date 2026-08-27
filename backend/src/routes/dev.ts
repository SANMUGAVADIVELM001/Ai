import { Router } from 'express';
import { getRoleById } from '../engines/profileEngine.js';
import { updateMasteryFromAssessment } from '../engines/masteryEngine.js';
import { getLearner, resetLearner, setLearnerRole } from '../store/learnerStore.js';

export const devRouter = Router();

/**
 * Demo-mode controls only. Mounted in index.ts exclusively when
 * NODE_ENV !== 'production'. Lets the frontend simulate strong/weak
 * assessment outcomes without manually answering every question, so the
 * adaptive roadmap/remedial/unlock behavior can be demonstrated quickly.
 * Writes go through the SAME masteryEngine.updateMasteryFromAssessment used
 * by real assessments — this is a shortcut for producing realistic input,
 * not a bypass of the mastery formula itself.
 */
devRouter.post('/simulate-attempt', (req, res) => {
  const { learnerId, roleId, skill, outcome } = req.body ?? {};
  if (typeof learnerId !== 'string' || typeof roleId !== 'string' || !getRoleById(roleId)) {
    res.status(400).json({ error: 'learnerId and a valid roleId are required' });
    return;
  }
  if (typeof skill !== 'string') {
    res.status(400).json({ error: 'skill is required' });
    return;
  }
  if (outcome !== 'strong' && outcome !== 'weak') {
    res.status(400).json({ error: "outcome must be 'strong' or 'weak'" });
    return;
  }

  setLearnerRole(learnerId, roleId);
  const score = outcome === 'strong' ? 85 + Math.round(Math.random() * 10) : 30 + Math.round(Math.random() * 15);
  const fakeAssessmentId = `dev-sim-${Date.now()}`;
  const record = updateMasteryFromAssessment(learnerId, roleId, skill, score, fakeAssessmentId, 'MODULE_ASSESSMENT');
  res.json({ mastery: record, simulatedScore: score });
});

devRouter.post('/set-mastery', (req, res) => {
  const { learnerId, roleId, overrides } = req.body ?? {};
  if (typeof learnerId !== 'string' || typeof roleId !== 'string' || !getRoleById(roleId)) {
    res.status(400).json({ error: 'learnerId and a valid roleId are required' });
    return;
  }
  if (typeof overrides !== 'object' || overrides === null) {
    res.status(400).json({ error: 'overrides (Record<skill, score>) is required' });
    return;
  }

  setLearnerRole(learnerId, roleId);
  const results = Object.entries(overrides as Record<string, unknown>)
    .filter(([, score]) => typeof score === 'number')
    .map(([skill, score]) =>
      updateMasteryFromAssessment(learnerId, roleId, skill, score as number, `dev-set-${Date.now()}`, 'MODULE_ASSESSMENT')
    );
  res.json({ mastery: results });
});

devRouter.post('/reset', (req, res) => {
  const { learnerId } = req.body ?? {};
  if (typeof learnerId !== 'string') {
    res.status(400).json({ error: 'learnerId is required' });
    return;
  }
  resetLearner(learnerId);
  res.json({ reset: true });
});

devRouter.get('/inspect/:learnerId', (req, res) => {
  const learner = getLearner(req.params.learnerId);
  if (!learner) {
    res.status(404).json({ error: 'Learner not found' });
    return;
  }
  res.json(learner);
});
