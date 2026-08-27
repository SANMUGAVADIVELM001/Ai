import { Router } from 'express';
import { getSession } from '../engines/assessmentEngine.js';
import { analyzeSession } from '../engines/skillEngine.js';
import { toSkillAnalysisResult } from '../engines/masteryEngine.js';
import { generateRoadmap } from '../engines/roadmapEngine.js';
import { getGoal } from '../store/learnerStore.js';
import { attachUser, requireAuth } from '../middleware/auth.js';
import type { LearnerProfile } from '../types/index.js';

export const roadmapRouter = Router();

roadmapRouter.use(attachUser, requireAuth);

function isValidProfile(profile: unknown): profile is LearnerProfile {
  return typeof profile === 'object' && profile !== null && typeof (profile as LearnerProfile).goal === 'string';
}

/**
 * Prefers persisted mastery (learnerId + roleId) so a returning learner sees
 * their roadmap without a live diagnostic session. Falls back to the legacy
 * sessionId path — needed right after finishing the diagnostic, before
 * bootstrapMasteryFromDiagnostic's write is necessarily the caller's only
 * option (and for any client that hasn't adopted learnerId yet).
 */
roadmapRouter.post('/generate', (req, res) => {
  const { sessionId, roleId, profile } = req.body ?? {};

  if (!isValidProfile(profile)) {
    res.status(400).json({ error: 'A valid learner profile is required' });
    return;
  }

  try {
    let analysis;
    if (req.learnerId && typeof roleId === 'string' && getGoal(req.learnerId, roleId)) {
      analysis = toSkillAnalysisResult(req.learnerId, roleId);
    } else if (typeof sessionId === 'string' && getSession(sessionId)) {
      analysis = analyzeSession(sessionId);
    } else {
      res.status(404).json({ error: 'Neither a persisted learner role nor a live session was found' });
      return;
    }

    const roadmap = generateRoadmap(analysis, profile);
    res.json({ roadmap });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to generate roadmap' });
  }
});
