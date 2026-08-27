import resourcesData from '../data/resources.json' with { type: 'json' };
import {
  DIFFICULTY_TO_MASTERY_RANGE,
  NEUTRAL_PREFERENCE_SCORE,
  PREREQUISITE_FIT_SCORE,
  RECOMMENDATION_WEIGHTS,
  ROADMAP_CONFIG,
  SKILL_GAP_PRIORITY_BASE_SCORE,
  SUFFICIENT_SKILL_GAP_SCORE,
  UNMATCHED_PREFERENCE_SCORE,
} from '../config.js';
import type {
  LearnerProfile,
  PrerequisiteGraphResult,
  Resource,
  ResourceType,
  ScoreBreakdown,
  ScoredResource,
  SkillAnalysisResult,
  SkillGap,
  SkillPrerequisiteInfo,
} from '../types/index.js';

const resources = resourcesData as Resource[];

// Maps a resource's content type to the preference tags a learner can pick
// during onboarding. Keeps the mapping in one place instead of scattering
// string comparisons through the scoring function.
const RESOURCE_TYPE_TO_PREFERENCE_TAG: Record<ResourceType, string> = {
  video: 'video',
  course: 'interactive',
  interactive: 'interactive',
  documentation: 'reading',
  article: 'reading',
  book: 'reading',
};

function goalRelevanceScore(resource: Resource, skill: string): number {
  return resource.skill === skill ? 100 : 0;
}

function skillGapRelevanceScore(gap: SkillGap | undefined): number {
  if (!gap) return SUFFICIENT_SKILL_GAP_SCORE;
  if (gap.sufficient) return SUFFICIENT_SKILL_GAP_SCORE;
  const base = SKILL_GAP_PRIORITY_BASE_SCORE[gap.priority];
  const gapBonus = Math.min(15, gap.gap / 4);
  return Math.min(100, base + gapBonus);
}

function prerequisiteFitScore(prereqInfo: SkillPrerequisiteInfo | undefined): number {
  if (!prereqInfo) return PREREQUISITE_FIT_SCORE.missing;
  return PREREQUISITE_FIT_SCORE[prereqInfo.prerequisiteStatus];
}

function difficultyFitScore(resource: Resource, currentMastery: number): number {
  if (resource.difficulty === 'any') return 80;
  const range = DIFFICULTY_TO_MASTERY_RANGE[resource.difficulty];
  if (currentMastery >= range.min && currentMastery <= range.max) return 100;
  const distance = currentMastery < range.min ? range.min - currentMastery : currentMastery - range.max;
  return Math.max(0, 100 - distance * 2);
}

function preferenceFitScore(resource: Resource, learningPreferences: string[]): number {
  if (learningPreferences.length === 0) return NEUTRAL_PREFERENCE_SCORE;
  const tag = RESOURCE_TYPE_TO_PREFERENCE_TAG[resource.type];
  return learningPreferences.includes(tag) ? 100 : UNMATCHED_PREFERENCE_SCORE;
}

function timeFitScore(resource: Resource, studyTimePerDayHours: number): number {
  const sessionBudgetMinutes = studyTimePerDayHours * 60;
  if (resource.durationMinutes <= sessionBudgetMinutes) return 100;
  const overflow = resource.durationMinutes - sessionBudgetMinutes;
  return Math.max(20, 100 - overflow / 10);
}

export interface RecommendationContext {
  profile: LearnerProfile;
  gap: SkillGap | undefined;
  prereqInfo: SkillPrerequisiteInfo | undefined;
  studyTimePerDayHours: number;
}

export function scoreResource(resource: Resource, skill: string, ctx: RecommendationContext): ScoredResource {
  const breakdown: ScoreBreakdown = {
    goalRelevance: goalRelevanceScore(resource, skill),
    skillGapRelevance: skillGapRelevanceScore(ctx.gap),
    prerequisiteFit: prerequisiteFitScore(ctx.prereqInfo),
    difficultyFit: difficultyFitScore(resource, ctx.gap?.current ?? 0),
    preferenceFit: preferenceFitScore(resource, ctx.profile.learningPreferences),
    timeFit: timeFitScore(resource, ctx.studyTimePerDayHours),
  };

  const score =
    RECOMMENDATION_WEIGHTS.goalRelevance * breakdown.goalRelevance +
    RECOMMENDATION_WEIGHTS.skillGapRelevance * breakdown.skillGapRelevance +
    RECOMMENDATION_WEIGHTS.prerequisiteFit * breakdown.prerequisiteFit +
    RECOMMENDATION_WEIGHTS.difficultyFit * breakdown.difficultyFit +
    RECOMMENDATION_WEIGHTS.preferenceFit * breakdown.preferenceFit +
    RECOMMENDATION_WEIGHTS.timeFit * breakdown.timeFit;

  return {
    resource,
    score: Math.round(Math.max(0, Math.min(100, score))),
    scoreBreakdown: breakdown,
  };
}

export function getResourceCatalog(): Resource[] {
  return resources;
}

export function getResourcesForSkill(skill: string): Resource[] {
  return resources.filter((r) => r.skill === skill);
}

export function recommendResourcesForSkill(
  skill: string,
  analysis: SkillAnalysisResult,
  prereqGraph: PrerequisiteGraphResult,
  profile: LearnerProfile,
  limit: number = ROADMAP_CONFIG.resourcesPerMilestone
): ScoredResource[] {
  const gap = analysis.gaps.find((g) => g.skill === skill);
  const prereqInfo = prereqGraph.nodes.find((n) => n.skill === skill);
  const studyTimePerDayHours = profile.studyTimePerDay ?? ROADMAP_CONFIG.defaultStudyTimePerDayHours;

  const candidates = getResourcesForSkill(skill);
  const scored = candidates.map((resource) =>
    scoreResource(resource, skill, { profile, gap, prereqInfo, studyTimePerDayHours })
  );

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.resource.id.localeCompare(b.resource.id);
  });

  return scored.slice(0, limit);
}
