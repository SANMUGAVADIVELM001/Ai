import type { SkillAnalysisResult } from '../types/index.js';

/**
 * Prompt for explaining an already-computed skill analysis. The AI only
 * narrates the numbers skillEngine produced — it never recalculates mastery
 * or gaps itself.
 */
export function buildSkillGapPrompt(analysis: SkillAnalysisResult): string {
  const skillLines = analysis.gaps
    .map((g) => `- ${g.skill}: mastery ${g.current}%, required ${g.required}%, gap ${g.gap} points, priority ${g.priority}${g.sufficient ? ' (already sufficient)' : ''}`)
    .join('\n');

  return `You are an AI learning coach explaining a learner's diagnostic assessment results for their goal of becoming a "${analysis.roleTitle}".

Actual measured data (do not alter or invent any numbers):
${skillLines}

Strongest skills: ${analysis.strongestSkills.join(', ') || 'none identified'}
Highest-priority gaps: ${analysis.highPriorityGaps.join(', ') || 'none'}

Write a concise (3-5 sentence) explanation that:
- names the learner's strongest skill(s) and why they don't need to restart there
- names the biggest gap(s) and explains concretely why they matter for this role
- states what should be prioritized next

Be specific and evidence-based. Do not use generic motivational language like "keep learning and you'll succeed". Reference the actual percentages and skill names above. Respond with plain text only, no markdown formatting.`;
}
