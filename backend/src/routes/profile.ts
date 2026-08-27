import { Router } from 'express';
import { parseGoalText, getRoles, matchRoleFromText } from '../engines/profileEngine.js';
import { aiService } from '../services/aiService.js';

export const profileRouter = Router();

profileRouter.get('/roles', (_req, res) => {
  const roles = getRoles().map((r) => ({ id: r.id, title: r.title, description: r.description }));
  res.json({ roles });
});

profileRouter.post('/parse-goal', (req, res) => {
  const { goalText } = req.body ?? {};
  if (typeof goalText !== 'string' || goalText.trim().length === 0) {
    res.status(400).json({ error: 'goalText is required' });
    return;
  }

  const profile = parseGoalText(goalText);
  res.json({ profile });
});

/**
 * AI-enhanced goal extraction. The deterministic parseGoalText() remains the
 * source of truth for `roleId` (which role/skills to assess) — the AI only
 * enriches free-text nuance (preferences, phrasing) that regex can't catch.
 * `experienceLevel` is always forced back to null regardless of what the AI
 * returns, since that must come from the diagnostic assessment.
 */
profileRouter.post('/parse-goal-ai', async (req, res) => {
  const { goalText } = req.body ?? {};
  if (typeof goalText !== 'string' || goalText.trim().length === 0) {
    res.status(400).json({ error: 'goalText is required' });
    return;
  }

  const deterministic = parseGoalText(goalText);
  const result = await aiService.extractGoalProfile(goalText);
  const extracted = result.data;

  const profile = {
    goal: extracted.goal ?? deterministic.goal,
    roleId: deterministic.roleId ?? (extracted.goal ? matchRoleFromText(extracted.goal) : null),
    targetDuration: extracted.timelineMonths != null ? `${extracted.timelineMonths} month${extracted.timelineMonths === 1 ? '' : 's'}` : deterministic.targetDuration,
    currentSkills: extracted.currentSkills.length > 0 ? extracted.currentSkills : deterministic.currentSkills,
    studyTimePerDay: extracted.studyHoursPerDay ?? deterministic.studyTimePerDay,
    learningPreferences: extracted.learningPreferences.length > 0 ? extracted.learningPreferences : deterministic.learningPreferences,
    experienceLevel: null,
  };

  res.json({ profile, aiSource: result.source, aiNotice: result.notice });
});
