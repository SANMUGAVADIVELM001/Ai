import { Router } from 'express';
import { attachUser, requireAuth } from '../middleware/auth.js';
import { getLearner, getAssessmentHistory, setActiveGoal, listGoals, resetGoal } from '../store/learnerStore.js';
import { getLearnerMasteryForRole } from '../engines/masteryEngine.js';
import { generateRoadmap } from '../engines/roadmapEngine.js';
import { toSkillAnalysisResult } from '../engines/masteryEngine.js';
import { computeNextBestAction } from '../engines/nextBestActionEngine.js';
import { getRoleById } from '../engines/profileEngine.js';
import type { AssessmentType, LearnerProfile } from '../types/index.js';

export const learnerRouter = Router();

learnerRouter.use(attachUser, requireAuth);

function resolveRoleId(req: { learnerId?: string }, bodyRoleId: unknown): string | null {
  if (typeof bodyRoleId === 'string') return bodyRoleId;
  return getLearner(req.learnerId!)?.activeRoleId ?? null;
}

/**
 * Full learner state snapshot for one goal: mastery, module progress, and
 * (if a profile is known) the single computed Next Best Action. `roleId` is
 * optional in the body — defaults to the learner's currently active goal, so
 * existing callers that only know "my current goal" keep working unchanged.
 * `profile` is accepted as a query-string-unfriendly POST body instead of
 * GET so the full LearnerProfile object (needed to regenerate the roadmap)
 * can be passed without URL-length concerns.
 */
learnerRouter.post('/me', (req, res) => {
  const learnerId = req.learnerId!;
  const roleId = resolveRoleId(req, req.body?.roleId);
  const { profile } = req.body ?? {};

  if (!roleId) {
    res.json({ learnerId, roleId: null, mastery: [], moduleProgress: {}, nextBestAction: null });
    return;
  }

  const learner = getLearner(learnerId);
  const goal = learner?.goals[roleId];
  const mastery = getLearnerMasteryForRole(learnerId, roleId);

  let nextBestAction = null;
  if (isValidProfile(profile)) {
    try {
      const analysis = toSkillAnalysisResult(learnerId, roleId);
      const roadmap = generateRoadmap(analysis, profile);
      nextBestAction = computeNextBestAction(learnerId, roleId, roadmap, goal?.moduleProgress ?? {});
    } catch {
      nextBestAction = null;
    }
  }

  res.json({
    learnerId,
    roleId,
    mastery,
    moduleProgress: goal?.moduleProgress ?? {},
    nextBestAction,
  });
});

learnerRouter.get('/assessments', (req, res) => {
  const learnerId = req.learnerId!;
  const roleId = resolveRoleId(req, req.query.roleId);
  const skill = typeof req.query.skill === 'string' ? req.query.skill : undefined;
  const type = typeof req.query.type === 'string' ? (req.query.type as AssessmentType) : undefined;
  if (!roleId) {
    res.json({ assessments: [] });
    return;
  }
  res.json({ assessments: getAssessmentHistory(learnerId, roleId, { skill, type }) });
});

/**
 * Lists every goal (role) the learner has ever started, each with its own
 * independent mastery-derived progress percentage — switching goals never
 * discards another goal's state, so this is always safe to compute fresh.
 */
learnerRouter.get('/goals', (req, res) => {
  const learnerId = req.learnerId!;
  const learner = getLearner(learnerId);
  const goals = listGoals(learnerId).map((g) => {
    const role = getRoleById(g.roleId);
    const masteryRecords = role ? getLearnerMasteryForRole(learnerId, g.roleId) : [];
    const avgProgress =
      masteryRecords.length > 0
        ? Math.round(masteryRecords.reduce((sum, m) => sum + Math.min(100, (m.current / m.target) * 100), 0) / masteryRecords.length)
        : 0;
    return {
      roleId: g.roleId,
      roleTitle: role?.title ?? g.roleId,
      progressPercent: Math.min(100, avgProgress),
      createdAt: g.createdAt,
      lastActiveAt: g.lastActiveAt,
      isActive: learner?.activeRoleId === g.roleId,
    };
  });
  res.json({ goals, activeRoleId: learner?.activeRoleId ?? null });
});

/** Switches which goal is "active" (shown on Home/Dashboard/Roadmap by default). Does not create or reset any goal's data. */
learnerRouter.post('/goals/activate', (req, res) => {
  const { roleId } = req.body ?? {};
  if (typeof roleId !== 'string' || !getRoleById(roleId)) {
    res.status(400).json({ error: 'A valid roleId is required' });
    return;
  }
  setActiveGoal(req.learnerId!, roleId);
  res.json({ activeRoleId: roleId });
});

learnerRouter.post('/goals/:roleId/reset', (req, res) => {
  const { roleId } = req.params;
  if (!getRoleById(roleId)) {
    res.status(400).json({ error: 'Unknown roleId' });
    return;
  }
  resetGoal(req.learnerId!, roleId);
  res.json({ reset: true });
});

function isValidProfile(profile: unknown): profile is LearnerProfile {
  return typeof profile === 'object' && profile !== null && typeof (profile as LearnerProfile).goal === 'string';
}
