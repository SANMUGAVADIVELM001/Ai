import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { createSession, getNextQuestion, submitAnswer, getSession, addGeneratedQuestion } from '../engines/assessmentEngine.js';
import { getRoleById } from '../engines/profileEngine.js';
import { analyzeSession } from '../engines/skillEngine.js';
import { bootstrapMasteryFromDiagnostic } from '../engines/masteryEngine.js';
import { completeAssessment } from '../engines/moduleAssessmentEngine.js';
import { attachUser, requireAuth } from '../middleware/auth.js';
import { aiService } from '../services/aiService.js';
import type { Difficulty } from '../types/index.js';

export const assessmentRouter = Router();

assessmentRouter.use(attachUser, requireAuth);

const VALID_DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

assessmentRouter.post('/start', (req, res) => {
  const { roleId } = req.body ?? {};
  if (typeof roleId !== 'string' || !getRoleById(roleId)) {
    res.status(400).json({ error: 'A valid roleId is required' });
    return;
  }

  const session = createSession(roleId, { learnerId: req.learnerId, type: 'INITIAL_DIAGNOSTIC' });
  const next = getNextQuestion(session.id);

  res.json({
    sessionId: session.id,
    totalSkills: session.skills.length,
    skills: session.skills,
    next: next
      ? {
          question: sanitizeQuestion(next.question),
          skillsRemaining: next.skillsRemaining,
          totalSkills: next.totalSkills,
        }
      : null,
  });
});

assessmentRouter.get('/:sessionId/next', (req, res) => {
  const { sessionId } = req.params;
  if (!getSession(sessionId)) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  const next = getNextQuestion(sessionId);
  if (!next) {
    res.json({ done: true });
    return;
  }

  res.json({
    done: false,
    question: sanitizeQuestion(next.question),
    skillsRemaining: next.skillsRemaining,
    totalSkills: next.totalSkills,
  });
});

assessmentRouter.post('/:sessionId/answer', (req, res) => {
  const { sessionId } = req.params;
  const { questionId, selectedOption } = req.body ?? {};

  const session = getSession(sessionId);
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  if (typeof questionId !== 'string' || typeof selectedOption !== 'number') {
    res.status(400).json({ error: 'questionId (string) and selectedOption (number) are required' });
    return;
  }

  try {
    const result = submitAnswer(sessionId, questionId, selectedOption);

    // Non-diagnostic sessions (module/reassessment/practice) are scored and
    // finalized here, the moment their fixed question set is fully answered —
    // the diagnostic instead finalizes lazily via GET /:sessionId/result.
    if (session.completed && session.type !== 'INITIAL_DIAGNOSTIC' && session.learnerId) {
      const completion = completeAssessment(sessionId);
      res.json({ ...result, assessmentComplete: completion });
      return;
    }

    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to submit answer' });
  }
});

/**
 * Optional AI enhancement: generates one additional question for a skill
 * and adds it to the local question pool so the assessment engine can pick
 * it up like any other question. The AI never sees or influences scoring —
 * it only supplies question content, which is validated before use. If the
 * AI is unavailable or returns an invalid question, this is a no-op and the
 * local question bank is used as-is (silent, since this is a best-effort
 * enrichment, not a required step).
 */
assessmentRouter.post('/generate-question', async (req, res) => {
  const { skill, difficulty, avoidQuestions } = req.body ?? {};

  if (typeof skill !== 'string' || skill.trim().length === 0) {
    res.status(400).json({ error: 'skill is required' });
    return;
  }
  if (typeof difficulty !== 'string' || !VALID_DIFFICULTIES.includes(difficulty as Difficulty)) {
    res.status(400).json({ error: 'A valid difficulty (easy|medium|hard) is required' });
    return;
  }

  const result = await aiService.generateAssessmentQuestion(
    skill,
    difficulty as Difficulty,
    Array.isArray(avoidQuestions) ? avoidQuestions.filter((q) => typeof q === 'string') : []
  );

  if (!result.data) {
    res.json({ added: false, source: result.source });
    return;
  }

  const generated = result.data;
  const question = {
    id: `ai-${randomUUID()}`,
    skill: generated.skill,
    topic: 'AI-generated',
    difficulty: generated.difficulty,
    question: generated.question,
    options: generated.options,
    answer: generated.correctAnswer,
    explanation: generated.explanation,
  };
  addGeneratedQuestion(question);
  res.json({ added: true, source: result.source, questionId: question.id });
});

assessmentRouter.get('/:sessionId/result', (req, res) => {
  const { sessionId } = req.params;
  const session = getSession(sessionId);
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  try {
    const analysis = analyzeSession(sessionId);
    // Bootstrap the persisted mastery store from this diagnostic. Only for
    // INITIAL_DIAGNOSTIC — module/reassessment sessions already write mastery
    // via completeAssessment() when they finish, so this must not double-write.
    if (session.type === 'INITIAL_DIAGNOSTIC' && session.learnerId) {
      bootstrapMasteryFromDiagnostic(session.learnerId, session.roleId, analysis, sessionId);
    }
    res.json({ analysis });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to analyze session' });
  }
});

function sanitizeQuestion(question: { id: string; skill: string; difficulty: string; question: string; options: string[] }) {
  // Never send the correct answer / explanation to the client before it answers.
  return {
    id: question.id,
    skill: question.skill,
    difficulty: question.difficulty,
    question: question.question,
    options: question.options,
  };
}
