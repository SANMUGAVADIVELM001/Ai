import type { RoadmapMilestone, ScoredResource } from '../types/index.js';

/**
 * Prompt for explaining why a specific resource was recommended. All
 * "evidence" fields are pulled directly from the recommendation engine's own
 * scoring output — the AI narrates them, it does not invent new evidence.
 */
export function buildRecommendationExplanationPrompt(milestone: RoadmapMilestone, resource: ScoredResource): string {
  const b = resource.scoreBreakdown;
  return `You are an AI learning coach explaining why a specific resource was recommended to a learner.

Evidence (all from the app's recommendation engine — use only this, do not invent anything else):
- Skill: ${milestone.skill}
- Current mastery: ${milestone.currentMastery}%
- Required mastery: ${milestone.targetMastery}%
- Skill gap: ${milestone.gap} points, priority: ${milestone.priority}
- Prerequisite status: ${milestone.prerequisiteStatus}${milestone.unsatisfiedPrerequisites.length > 0 ? ` (unsatisfied: ${milestone.unsatisfiedPrerequisites.join(', ')})` : ''}
- Resource: "${resource.resource.title}" (${resource.resource.type}, ${resource.resource.difficulty} difficulty, ${Math.round(resource.resource.durationMinutes / 60)}h, provider: ${resource.resource.provider})
- Score breakdown (0-100 each): goal relevance ${b.goalRelevance}, skill gap relevance ${b.skillGapRelevance}, prerequisite fit ${b.prerequisiteFit}, difficulty fit ${b.difficultyFit}, preference fit ${b.preferenceFit}, time fit ${b.timeFit}
- Overall score: ${resource.score}/100

Write a concise (2-4 sentence) explanation of why this resource fits this learner right now, referencing the specific evidence above. Do not invent evidence not listed here. Respond with plain text only, no markdown formatting.`;
}
