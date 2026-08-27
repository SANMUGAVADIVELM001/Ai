import type { Difficulty, ExtractedGoalProfile, GeneratedQuestion } from '../types/index.js';

const VALID_DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

export function isValidExtractedGoalProfile(value: unknown): value is ExtractedGoalProfile {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;

  if (v.goal !== null && typeof v.goal !== 'string') return false;
  if (v.timelineMonths !== null && typeof v.timelineMonths !== 'number') return false;
  if (!Array.isArray(v.currentSkills) || !v.currentSkills.every((s) => typeof s === 'string')) return false;
  if (v.studyHoursPerDay !== null && typeof v.studyHoursPerDay !== 'number') return false;
  if (!Array.isArray(v.learningPreferences) || !v.learningPreferences.every((s) => typeof s === 'string')) return false;
  if (v.experienceLevel !== null && typeof v.experienceLevel !== 'string') return false;

  return true;
}

export function isValidGeneratedQuestion(value: unknown, expectedSkill: string, expectedDifficulty: Difficulty): value is GeneratedQuestion {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;

  if (typeof v.skill !== 'string' || v.skill.trim().toLowerCase() !== expectedSkill.trim().toLowerCase()) return false;
  if (typeof v.difficulty !== 'string' || !VALID_DIFFICULTIES.includes(v.difficulty as Difficulty)) return false;
  if (v.difficulty !== expectedDifficulty) return false;
  if (typeof v.question !== 'string' || v.question.trim().length < 8) return false;
  if (!Array.isArray(v.options) || v.options.length !== 4 || !v.options.every((o) => typeof o === 'string' && o.trim().length > 0)) return false;
  if (typeof v.correctAnswer !== 'number' || !Number.isInteger(v.correctAnswer) || v.correctAnswer < 0 || v.correctAnswer > 3) return false;
  if (typeof v.explanation !== 'string' || v.explanation.trim().length === 0) return false;

  // Ensure options are distinct (a degenerate "all same text" question is invalid).
  const uniqueOptions = new Set((v.options as string[]).map((o) => o.trim().toLowerCase()));
  if (uniqueOptions.size !== 4) return false;

  return true;
}
