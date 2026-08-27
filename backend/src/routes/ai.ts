import { Router } from 'express';
import { getSession } from '../engines/assessmentEngine.js';
import { analyzeSession } from '../engines/skillEngine.js';
import { toSkillAnalysisResult } from '../engines/masteryEngine.js';
import { generateRoadmap } from '../engines/roadmapEngine.js';
import { recommendResourcesForSkill } from '../engines/recommendationEngine.js';
import { buildPrerequisiteGraph } from '../engines/prerequisiteEngine.js';
import { buildLearnerContext } from '../engines/contextEngine.js';
import { aiService } from '../services/aiService.js';
import { isAiConfigured, AI_CONFIG } from '../config.js';
import { attachUser, requireAuth } from '../middleware/auth.js';
import { getAssessmentHistory, getGoal } from '../store/learnerStore.js';
import type { CoachMessage, LearnerProfile, SkillAnalysisResult } from '../types/index.js';

export const aiRouter = Router();

aiRouter.use(attachUser, requireAuth);

function isValidProfile(profile: unknown): profile is LearnerProfile {
  return typeof profile === 'object' && profile !== null && typeof (profile as LearnerProfile).goal === 'string';
}

function isValidHistory(history: unknown): history is CoachMessage[] {
  return (
    Array.isArray(history) &&
    history.every(
      (m) => typeof m === 'object' && m !== null && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string'
    )
  );
}

/**
 * Resolves an analysis preferring persisted mastery (learnerId + roleId) so
 * AI routes work for a returning learner without a live diagnostic session,
 * falling back to the legacy sessionId path.
 */
function resolveAnalysis(req: { learnerId?: string }, sessionId: unknown, roleId: unknown): SkillAnalysisResult | null {
  if (req.learnerId && typeof roleId === 'string' && getGoal(req.learnerId, roleId)) {
    try {
      return toSkillAnalysisResult(req.learnerId, roleId);
    } catch {
      // fall through to sessionId path
    }
  }
  if (typeof sessionId === 'string' && getSession(sessionId)) {
    return analyzeSession(sessionId);
  }
  return null;
}

aiRouter.get('/status', (_req, res) => {
  res.json({ configured: isAiConfigured(), provider: AI_CONFIG.provider, model: isAiConfigured() ? AI_CONFIG.model : null });
});

aiRouter.post('/skill-gap-explanation', async (req, res) => {
  const { sessionId, roleId } = req.body ?? {};
  const analysis = resolveAnalysis(req, sessionId, roleId);
  if (!analysis) {
    res.status(404).json({ error: 'Neither a persisted learner role nor a live session was found' });
    return;
  }

  try {
    const result = await aiService.explainSkillAnalysis(analysis);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to explain skill analysis' });
  }
});

aiRouter.post('/recommendation-explanation', async (req, res) => {
  const { sessionId, roleId, profile, skill, resourceId } = req.body ?? {};

  const analysis = resolveAnalysis(req, sessionId, roleId);
  if (!analysis) {
    res.status(404).json({ error: 'Neither a persisted learner role nor a live session was found' });
    return;
  }
  if (!isValidProfile(profile) || typeof skill !== 'string' || typeof resourceId !== 'string') {
    res.status(400).json({ error: 'profile, skill, and resourceId are required' });
    return;
  }

  try {
    const prereqGraph = buildPrerequisiteGraph(analysis);
    const roadmap = generateRoadmap(analysis, profile);
    const milestone = roadmap.milestones.find((m) => m.skill === skill);
    if (!milestone) {
      res.status(404).json({ error: `No milestone for skill ${skill}` });
      return;
    }

    const scored = recommendResourcesForSkill(skill, analysis, prereqGraph, profile, 20);
    const resource = scored.find((r) => r.resource.id === resourceId);
    if (!resource) {
      res.status(404).json({ error: `Resource ${resourceId} not found for skill ${skill}` });
      return;
    }

    const result = await aiService.explainRecommendation(milestone, resource);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to explain recommendation' });
  }
});

aiRouter.post('/roadmap-explanation', async (req, res) => {
  const { sessionId, roleId, profile } = req.body ?? {};

  const analysis = resolveAnalysis(req, sessionId, roleId);
  if (!analysis) {
    res.status(404).json({ error: 'Neither a persisted learner role nor a live session was found' });
    return;
  }
  if (!isValidProfile(profile)) {
    res.status(400).json({ error: 'A valid learner profile is required' });
    return;
  }

  try {
    const roadmap = generateRoadmap(analysis, profile);
    const result = await aiService.explainRoadmap(roadmap);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to explain roadmap' });
  }
});

aiRouter.post('/coach', async (req, res) => {
  const { sessionId, roleId, profile, history, message } = req.body ?? {};

  const analysis = resolveAnalysis(req, sessionId, roleId);
  if (!analysis) {
    res.status(404).json({ error: 'Neither a persisted learner role nor a live session was found' });
    return;
  }
  if (!isValidProfile(profile)) {
    res.status(400).json({ error: 'A valid learner profile is required' });
    return;
  }
  if (typeof message !== 'string' || message.trim().length === 0) {
    res.status(400).json({ error: 'message is required' });
    return;
  }
  const chatHistory = isValidHistory(history) ? history.slice(-8) : [];

  try {
    const roadmap = generateRoadmap(analysis, profile);
    const assessmentHistory = req.learnerId ? getAssessmentHistory(req.learnerId, analysis.roleId) : [];
    const moduleProgress = req.learnerId ? getGoal(req.learnerId, analysis.roleId)?.moduleProgress ?? {} : {};
    const context = buildLearnerContext(profile, analysis, roadmap, assessmentHistory, moduleProgress);
    const result = await aiService.chatWithLearner(context, chatHistory, message.trim());
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to reach the AI coach' });
  }
});
