import { Router } from 'express';
import { attachUser, requireAuth } from '../middleware/auth.js';
import { getLearner, getAssessmentHistory } from '../store/learnerStore.js';
import { getLearnerMasteryForRole } from '../engines/masteryEngine.js';
import { generateRoadmap } from '../engines/roadmapEngine.js';
import { toSkillAnalysisResult } from '../engines/masteryEngine.js';
import { computeNextBestAction } from '../engines/nextBestActionEngine.js';
import type { AssessmentType, LearnerProfile } from '../types/index.js';

export const learnerRouter = Router();

learnerRouter.use(attachUser, requireAuth);

/**
 * Full learner state snapshot: mastery, module progress, and (if a role and
 * profile are known) the single computed Next Best Action. `profile` is
 * accepted as a query-string-unfriendly POST body instead of GET so the full
 * LearnerProfile object (needed to regenerate the roadmap) can be passed
 * without URL-length concerns.
 */
learnerRouter.post('/me', (req, res) => {
  const learnerId = req.learnerId!;
  const learner = getLearner(learnerId);
  const { profile } = req.body ?? {};

  if (!learner || !learner.roleId) {
    res.json({ learnerId, roleId: null, mastery: [], moduleProgress: {}, nextBestAction: null });
    return;
  }

  const mastery = getLearnerMasteryForRole(learnerId, learner.roleId);

  let nextBestAction = null;
  if (isValidProfile(profile)) {
    try {
      const analysis = toSkillAnalysisResult(learnerId, learner.roleId);
      const roadmap = generateRoadmap(analysis, profile);
      nextBestAction = computeNextBestAction(learnerId, roadmap, learner.moduleProgress);
    } catch {
      nextBestAction = null;
    }
  }

  res.json({
    learnerId,
    roleId: learner.roleId,
    mastery,
    moduleProgress: learner.moduleProgress,
    nextBestAction,
  });
});

learnerRouter.get('/assessments', (req, res) => {
  const learnerId = req.learnerId!;
  const skill = typeof req.query.skill === 'string' ? req.query.skill : undefined;
  const type = typeof req.query.type === 'string' ? (req.query.type as AssessmentType) : undefined;
  res.json({ assessments: getAssessmentHistory(learnerId, { skill, type }) });
});

function isValidProfile(profile: unknown): profile is LearnerProfile {
  return typeof profile === 'object' && profile !== null && typeof (profile as LearnerProfile).goal === 'string';
}
