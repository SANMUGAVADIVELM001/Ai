import { Router } from 'express';
import { getSession } from '../engines/assessmentEngine.js';
import { analyzeSession } from '../engines/skillEngine.js';
import { toSkillAnalysisResult } from '../engines/masteryEngine.js';
import { generateRoadmap } from '../engines/roadmapEngine.js';
import { computeTotalHoursNeeded, planOptionsFor } from '../engines/moduleTimeEngine.js';
import { getGoal, getPacing, setPacing } from '../store/learnerStore.js';
import { attachUser, requireAuth } from '../middleware/auth.js';
import type { LearnerProfile, PacingChoice } from '../types/index.js';

export const roadmapRouter = Router();

roadmapRouter.use(attachUser, requireAuth);

function isValidProfile(profile: unknown): profile is LearnerProfile {
  return typeof profile === 'object' && profile !== null && typeof (profile as LearnerProfile).goal === 'string';
}

const VALID_CHOSEN_PLANS: PacingChoice[] = ['recommended', 'accelerated', 'as_requested'];

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

    const pacing = req.learnerId && typeof roleId === 'string' ? getPacing(req.learnerId, roleId) : null;
    const moduleProgressAll =
      req.learnerId && typeof roleId === 'string' ? getGoal(req.learnerId, roleId)?.moduleProgress ?? {} : {};

    const roadmap = generateRoadmap(analysis, profile, pacing, moduleProgressAll);
    res.json({ roadmap });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to generate roadmap' });
  }
});

/**
 * Pure feasibility check for a candidate "available days" number — no
 * persistence, safe to call repeatedly as the learner adjusts the input.
 * Requires the diagnostic to have already run for this role (persisted
 * mastery must exist) since the required-hours total is derived from it.
 */
roadmapRouter.post('/plan-options', (req, res) => {
  const { roleId, availableDays } = req.body ?? {};

  if (typeof roleId !== 'string' || typeof availableDays !== 'number' || !Number.isFinite(availableDays) || availableDays <= 0) {
    res.status(400).json({ error: 'A roleId and a positive availableDays number are required' });
    return;
  }
  if (!req.learnerId || !getGoal(req.learnerId, roleId)) {
    res.status(404).json({ error: 'Complete the diagnostic assessment for this role first' });
    return;
  }

  try {
    const analysis = toSkillAnalysisResult(req.learnerId, roleId);
    const totalHoursNeeded = computeTotalHoursNeeded(analysis);
    const result = planOptionsFor(totalHoursNeeded, Math.floor(availableDays));
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to compute plan options' });
  }
});

/**
 * Persists the learner's chosen pacing and immediately returns the
 * regenerated roadmap, so the caller doesn't need a second /generate
 * round-trip.
 */
roadmapRouter.post('/confirm-pacing', (req, res) => {
  const { roleId, profile, availableDays, studyHoursPerDay, chosenPlan } = req.body ?? {};

  if (
    typeof roleId !== 'string' ||
    !isValidProfile(profile) ||
    typeof availableDays !== 'number' ||
    !Number.isFinite(availableDays) ||
    availableDays <= 0 ||
    typeof studyHoursPerDay !== 'number' ||
    !Number.isFinite(studyHoursPerDay) ||
    studyHoursPerDay <= 0 ||
    !VALID_CHOSEN_PLANS.includes(chosenPlan)
  ) {
    res.status(400).json({ error: 'roleId, profile, a positive availableDays, a positive studyHoursPerDay, and a valid chosenPlan are required' });
    return;
  }
  if (!req.learnerId || !getGoal(req.learnerId, roleId)) {
    res.status(404).json({ error: 'Complete the diagnostic assessment for this role first' });
    return;
  }

  try {
    setPacing(req.learnerId, roleId, {
      availableDays: Math.floor(availableDays),
      studyHoursPerDay,
      chosenPlan,
      confirmedAt: Date.now(),
    });

    const analysis = toSkillAnalysisResult(req.learnerId, roleId);
    const pacing = getPacing(req.learnerId, roleId);
    const moduleProgressAll = getGoal(req.learnerId, roleId)?.moduleProgress ?? {};
    const roadmap = generateRoadmap(analysis, profile, pacing, moduleProgressAll);
    res.json({ roadmap });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to confirm pacing' });
  }
});
