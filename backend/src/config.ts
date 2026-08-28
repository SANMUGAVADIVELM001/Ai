import type { AssessmentType, Difficulty, MasteryBand, PriorityLevel } from './types/index.js';

// Points awarded per correct answer, by difficulty.
export const DIFFICULTY_POINTS: Record<Difficulty, number> = {
  easy: 10,
  medium: 15,
  hard: 20,
};

// Mastery bands used to label a 0-100 normalized score.
// Order matters: checked top-down would be wrong, so keep ranges disjoint & sorted ascending.
export const MASTERY_BANDS: MasteryBand[] = [
  { label: 'Beginner', min: 0, max: 39 },
  { label: 'Developing', min: 40, max: 69 },
  { label: 'Intermediate', min: 70, max: 84 },
  { label: 'Advanced', min: 85, max: 100 },
];

export function masteryLabelFor(score: number): MasteryBand['label'] {
  const band = MASTERY_BANDS.find((b) => score >= b.min && score <= b.max);
  return band ? band.label : 'Beginner';
}

// Shared with masteryEngine.toSkillAnalysisResult so priority-bucketing logic
// isn't duplicated between the session-based and persisted-mastery paths.
export function priorityFor(gap: number): PriorityLevel {
  if (gap >= PRIORITY_THRESHOLDS.highGap) return 'high';
  if (gap >= PRIORITY_THRESHOLDS.mediumGap) return 'medium';
  return 'low';
}

// Adaptive assessment tuning.
export const ASSESSMENT_CONFIG = {
  // Max questions asked per skill before it's considered finished.
  maxQuestionsPerSkill: 4,
  // Difficulty to start every skill at.
  startingDifficulty: 'easy' as Difficulty,
  // Difficulty progression on correct/incorrect answers.
  difficultyOrder: ['easy', 'medium', 'hard'] as Difficulty[],
};

// Priority thresholds for skill-gap analysis (gap = required - current).
export const PRIORITY_THRESHOLDS = {
  highGap: 40, // gap >= this => high priority
  mediumGap: 15, // gap >= this (and < highGap) => medium priority
  // gap < mediumGap => low priority
};

// A skill is considered "sufficient" if current mastery meets/exceeds required target.
export const SUFFICIENCY_MARGIN = 0;

// ---- Roadmap generation ----

export const ROADMAP_CONFIG = {
  // Used when the learner profile has no study time captured and no pacing
  // has been confirmed yet.
  defaultStudyTimePerDayHours: 1,
  // How many top-ranked resources to attach to each roadmap milestone. Also
  // doubles as the divisor in computeBaselineHours (moduleTimeEngine.ts) —
  // a module's baseline hours approximate "time to complete the resources
  // this learner will actually be shown," not the whole resource library.
  resourcesPerMilestone: 3,
  // Baseline hours assigned to a skill with no resources.json entries at all,
  // so the hours formula never divides by / produces zero for a skill that
  // still needs to be scheduled.
  fallbackBaselineHours: 4,
  // Floor on estimated hours for any module with a nonzero mastery gap, so a
  // small residual gap never rounds down to 0 hours.
  minHoursPerModule: 0.5,
  // Upper bound on the daily study time we'll ever recommend as the
  // "minimum feasible" plan — used to compute the minimum number of days a
  // learner needs, and to size the "recommended" (unhurried) option.
  maxStudyHoursPerDayCap: 8,
  // Floor on the displayed daily study time so a very generous day count
  // never computes to an implausibly tiny daily commitment.
  minStudyHoursPerDayFloor: 0.25,
};

// ---- Recommendation scoring ----
// Weights must sum to 1.0. Centralized here instead of scattered magic
// numbers so the ranking formula stays a single, auditable source of truth.
export const RECOMMENDATION_WEIGHTS = {
  goalRelevance: 0.2,
  skillGapRelevance: 0.25,
  prerequisiteFit: 0.15,
  difficultyFit: 0.2,
  preferenceFit: 0.1,
  timeFit: 0.1,
};

// Score used for the "preference fit" sub-score when the learner hasn't
// specified any learning preferences yet — neutral so it neither boosts nor
// tanks a resource's overall rank.
export const NEUTRAL_PREFERENCE_SCORE = 60;
// Score given to a resource type that doesn't match any stated preference
// (not zero — an unmatched type is still a usable resource).
export const UNMATCHED_PREFERENCE_SCORE = 40;

// Mastery range (0-100) each question/resource difficulty is considered a
// good fit for. Used to score how well a resource's difficulty matches the
// learner's current mastery in that skill.
export const DIFFICULTY_TO_MASTERY_RANGE: Record<Difficulty, { min: number; max: number }> = {
  easy: { min: 0, max: 45 },
  medium: { min: 35, max: 75 },
  hard: { min: 65, max: 100 },
};

// Flat score by priority bucket for "how relevant is this skill's gap" —
// nudged upward for larger raw gaps within the same bucket.
export const SKILL_GAP_PRIORITY_BASE_SCORE: Record<PriorityLevel, number> = {
  high: 100,
  medium: 65,
  low: 35,
};
// Score used when the skill is already sufficient (reinforcement only).
export const SUFFICIENT_SKILL_GAP_SCORE = 20;

// Score by prerequisite status for "can the learner actually act on this now".
export const PREREQUISITE_FIT_SCORE: Record<'satisfied' | 'partial' | 'missing', number> = {
  satisfied: 100,
  partial: 55,
  missing: 20,
};

// ---- AI / NLP layer ----

export const AI_CONFIG = {
  provider: process.env.AI_PROVIDER ?? 'mock',
  model: process.env.AI_MODEL ?? 'gemini-3.6-flash',
  apiKey: process.env.GEMINI_API_KEY ?? '',
  // Any single call to the LLM provider is aborted after this long, so a
  // slow/hanging provider never freezes a request — the caller falls back.
  requestTimeoutMs: 25000,
  // A failed/invalid call is retried this many times (with a fresh request,
  // not a loop) before giving up and falling back to deterministic output.
  maxRetries: 1,
  // How long a cached AI response for the same input stays valid. Goal
  // profiles/explanations for identical input don't need to be regenerated.
  cacheTtlMs: 30 * 60 * 1000,
  // Hard cap on learner chat history sent to the coach, to keep prompts small.
  maxCoachHistoryMessages: 8,
  // Hard cap on skills included in a learner context payload sent to the AI.
  maxContextSkills: 12,
};

export function isAiConfigured(): boolean {
  return AI_CONFIG.provider === 'gemini' && AI_CONFIG.apiKey.length > 0;
}

// ---- Persistent mastery / module assessment tuning ----

export const MASTERY_CONFIG = {
  // newMastery = previousMastery * (1 - effectiveWeight) + assessmentScore * effectiveWeight
  // effectiveWeight = newEvidenceWeight * typeWeightMultiplier[type]
  newEvidenceWeight: 0.3,
  typeWeightMultiplier: {
    INITIAL_DIAGNOSTIC: 1.0, // not actually blended — treated as a bootstrap write (see masteryEngine)
    MODULE_ASSESSMENT: 1.0,
    REASSESSMENT: 1.2,
    PRACTICE_CHECK: 0.4,
    FINAL_ASSESSMENT: 1.3,
  } as Record<AssessmentType, number>,
  // A skill needs at least this many scored assessments before mastery is
  // reported with 'high' confidence; below that it's 'low'/'medium'.
  confidenceThresholds: { medium: 2, high: 4 },
  // Trend is 'stable' unless the new score moved mastery by at least this many points.
  trendThreshold: 2,
  passingThresholdDefault: 70,
  // How many of a learner's most-recently-seen question ids are excluded
  // from re-selection in a new assessment for the same skill.
  seenQuestionWindow: 40,
  // Default number of questions in a module assessment / reassessment.
  moduleAssessmentQuestionCount: 8,
  // Default number of questions in a low-stakes practice check.
  practiceCheckQuestionCount: 4,
};
