import { Router } from 'express';
import { attachUser, requireAuth } from '../middleware/auth.js';
import { getRoleById } from '../engines/profileEngine.js';
import { getNextQuestion } from '../engines/assessmentEngine.js';
import {
  getModuleState,
  markModuleLearningStarted,
  markModulePracticeReady,
  startModuleAssessment,
  startPracticeCheck,
} from '../engines/moduleAssessmentEngine.js';
import { getLearner } from '../store/learnerStore.js';

export const moduleRouter = Router();

moduleRouter.use(attachUser, requireAuth);

function sanitizeQuestion(question: { id: string; skill: string; topic: string; difficulty: string; question: string; options: string[] }) {
  return {
    id: question.id,
    skill: question.skill,
    topic: question.topic,
    difficulty: question.difficulty,
    question: question.question,
    options: question.options,
  };
}

/** Resolves the roleId this module belongs to: explicit query/body param, else the learner's currently active goal. */
function resolveRoleId(req: { learnerId?: string }, given: unknown): string | null {
  if (typeof given === 'string' && given.length > 0) return given;
  return getLearner(req.learnerId!)?.activeRoleId ?? null;
}

moduleRouter.get('/:moduleId/state', (req, res) => {
  const { moduleId } = req.params;
  const { skill, roleId: roleIdParam } = req.query;
  if (typeof skill !== 'string') {
    res.status(400).json({ error: 'skill query param is required' });
    return;
  }
  const roleId = resolveRoleId(req, roleIdParam);
  if (!roleId) {
    res.status(400).json({ error: 'roleId is required (no active goal set)' });
    return;
  }
  res.json(getModuleState(req.learnerId!, roleId, moduleId, skill));
});

moduleRouter.post('/:moduleId/start-learning', (req, res) => {
  const { moduleId } = req.params;
  const { skill, roleId: roleIdBody } = req.body ?? {};
  if (typeof skill !== 'string') {
    res.status(400).json({ error: 'skill is required' });
    return;
  }
  const roleId = resolveRoleId(req, roleIdBody);
  if (!roleId) {
    res.status(400).json({ error: 'roleId is required (no active goal set)' });
    return;
  }
  res.json(markModuleLearningStarted(req.learnerId!, roleId, moduleId, skill));
});

moduleRouter.post('/:moduleId/ready-for-assessment', (req, res) => {
  const { moduleId } = req.params;
  const { skill, roleId: roleIdBody } = req.body ?? {};
  if (typeof skill !== 'string') {
    res.status(400).json({ error: 'skill is required' });
    return;
  }
  const roleId = resolveRoleId(req, roleIdBody);
  if (!roleId) {
    res.status(400).json({ error: 'roleId is required (no active goal set)' });
    return;
  }
  res.json(markModulePracticeReady(req.learnerId!, roleId, moduleId, skill));
});

moduleRouter.post('/:moduleId/start-assessment', (req, res) => {
  const { moduleId } = req.params;
  const { skill, roleId } = req.body ?? {};
  if (typeof skill !== 'string' || typeof roleId !== 'string' || !getRoleById(roleId)) {
    res.status(400).json({ error: 'skill and a valid roleId are required' });
    return;
  }

  const session = startModuleAssessment(req.learnerId!, roleId, moduleId, skill);
  const next = getNextQuestion(session.id);

  res.json({
    sessionId: session.id,
    type: session.type,
    attemptNumber: session.attemptNumber,
    totalQuestions: session.plannedQuestions?.length ?? 0,
    next: next ? { question: sanitizeQuestion(next.question as never), skillsRemaining: next.skillsRemaining, totalSkills: next.totalSkills } : null,
  });
});

moduleRouter.post('/:moduleId/start-practice', (req, res) => {
  const { skill, roleId, topics } = req.body ?? {};
  if (typeof skill !== 'string' || typeof roleId !== 'string' || !getRoleById(roleId)) {
    res.status(400).json({ error: 'skill and a valid roleId are required' });
    return;
  }

  const session = startPracticeCheck(req.learnerId!, roleId, skill, Array.isArray(topics) ? topics.filter((t) => typeof t === 'string') : undefined);
  const next = getNextQuestion(session.id);

  res.json({
    sessionId: session.id,
    type: session.type,
    totalQuestions: session.plannedQuestions?.length ?? 0,
    next: next ? { question: sanitizeQuestion(next.question as never), skillsRemaining: next.skillsRemaining, totalSkills: next.totalSkills } : null,
  });
});
