import type { Roadmap } from '../types/index.js';

/**
 * Prompt for narrating an already-generated roadmap. The AI explains the
 * ordering the roadmap/prerequisite engines produced — it must not propose
 * a different order.
 */
export function buildRoadmapExplanationPrompt(roadmap: Roadmap): string {
  const milestoneLines = roadmap.milestones
    .map(
      (m, i) =>
        `${i + 1}. ${m.skill} — status: ${m.status}, mastery ${m.currentMastery}%/${m.targetMastery}% required${
          m.isVerifiedSufficient ? ' (already sufficient, verified by assessment)' : `, ~${m.estimatedWeeks} weeks`
        }`
    )
    .join('\n');

  return `You are an AI learning coach presenting a personalized roadmap the app's roadmap engine already generated for a learner targeting "${roadmap.roleTitle}" (target timeline: ${roadmap.targetDuration ?? 'not specified'}, ${roadmap.studyTimePerDayHours}h/day).

The roadmap, in its fixed order (do not reorder or change this):
${milestoneLines}

Write a short (4-6 sentence) natural-language walkthrough of this roadmap: what it starts with and why (referencing assessment data), which skills are being skipped/shortened because they're already sufficient, and how later milestones build on earlier ones via prerequisites. Do not suggest a different order than what's listed above. Respond with plain text only, no markdown formatting.`;
}
