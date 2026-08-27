import { Router } from 'express';
import { getResourceCatalog, getResourcesForSkill, recommendResourcesForSkill } from '../engines/recommendationEngine.js';
import { buildPrerequisiteGraph } from '../engines/prerequisiteEngine.js';
import { getSession } from '../engines/assessmentEngine.js';
import { analyzeSession } from '../engines/skillEngine.js';
import { toSkillAnalysisResult } from '../engines/masteryEngine.js';
import { getGoal } from '../store/learnerStore.js';
import { attachUser, requireAuth } from '../middleware/auth.js';
import type { LearnerProfile } from '../types/index.js';

export const resourcesRouter = Router();

resourcesRouter.use(attachUser, requireAuth);

function isValidProfile(profile: unknown): profile is LearnerProfile {
  return typeof profile === 'object' && profile !== null && typeof (profile as LearnerProfile).goal === 'string';
}

resourcesRouter.get('/', (req, res) => {
  const { skill } = req.query;
  const resources = typeof skill === 'string' && skill.length > 0 ? getResourcesForSkill(skill) : getResourceCatalog();
  res.json({ resources });
});

resourcesRouter.post('/recommended', (req, res) => {
  const { sessionId, roleId, skill, profile } = req.body ?? {};

  if (typeof skill !== 'string' || skill.length === 0) {
    res.status(400).json({ error: 'A valid skill is required' });
    return;
  }
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

    const prereqGraph = buildPrerequisiteGraph(analysis);
    const resources = recommendResourcesForSkill(skill, analysis, prereqGraph, profile, 20);
    res.json({ resources });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to recommend resources' });
  }
});
