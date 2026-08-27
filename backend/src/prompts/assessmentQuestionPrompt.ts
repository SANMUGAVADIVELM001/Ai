import type { Difficulty } from '../types/index.js';

/**
 * Prompt for generating one additional diagnostic question for a skill. The
 * LLM only authors question content — it never sees or influences scoring;
 * the assessment engine grades whatever answer the learner picks exactly
 * like it grades local question-bank items.
 */
export function buildAssessmentQuestionPrompt(skill: string, difficulty: Difficulty, avoidQuestions: string[]): string {
  const avoidList = avoidQuestions.length > 0 ? `\n\nDo not repeat or closely resemble any of these existing questions:\n${avoidQuestions.map((q) => `- ${q}`).join('\n')}` : '';

  return `You are writing one multiple-choice diagnostic question to test a learner's knowledge of "${skill}" at "${difficulty}" difficulty.${avoidList}

Respond with ONLY a JSON object matching exactly this shape (no markdown, no commentary):
{
  "skill": "${skill}",
  "difficulty": "${difficulty}",
  "question": string (a single, clear, unambiguous question),
  "options": string[] (exactly 4 options, plausible but only one correct),
  "correctAnswer": number (0-based index of the correct option),
  "explanation": string (1-2 sentences explaining why the correct answer is right)
}`;
}
