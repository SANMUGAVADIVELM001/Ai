import { masteryLabelFor, priorityFor, SUFFICIENCY_MARGIN } from '../config.js';
import { getRoleById } from './profileEngine.js';
import { getSession } from './assessmentEngine.js';
import type {
  AssessmentSession,
  SkillAnalysisResult,
  SkillAssessmentState,
  SkillGap,
  SkillResult,
} from '../types/index.js';

export function computeMasteryScore(state: SkillAssessmentState): number {
  if (state.maxPossibleScore === 0) return 0;
  const normalized = (state.rawScore / state.maxPossibleScore) * 100;
  return Math.round(Math.max(0, Math.min(100, normalized)));
}

export function skillResultFrom(state: SkillAssessmentState): SkillResult {
  const masteryScore = computeMasteryScore(state);
  const correctAnswers = state.attempts.filter((a) => a.correct).length;
  const incorrectAnswers = state.attempts.length - correctAnswers;

  return {
    skill: state.skill,
    masteryScore,
    masteryLabel: masteryLabelFor(masteryScore),
    questionsAttempted: state.attempts.length,
    correctAnswers,
    incorrectAnswers,
  };
}

/**
 * Deterministic template-based explanation. This is the seam where a future
 * LLMService could generate a richer explanation from the same underlying
 * skillResults/gaps data, without changing anything else in the analysis.
 */
export function buildAiExplanation(
  roleTitle: string,
  strongest: string[],
  highGaps: string[],
  sufficient: string[]
): string {
  const parts: string[] = [];

  if (strongest.length > 0) {
    parts.push(
      `Your assessment indicates that you already have a solid foundation in ${strongest
        .slice(0, 2)
        .join(' and ')}, so your learning path does not need to start from the basics there.`
    );
  }

  if (highGaps.length > 0) {
    parts.push(
      `Your biggest gaps toward becoming a ${roleTitle} are in ${highGaps.join(', ')}. We will prioritize these skills while respecting the prerequisites required for your target role.`
    );
  } else {
    parts.push(`You have no critical high-priority gaps toward becoming a ${roleTitle} — great starting position.`);
  }

  if (sufficient.length > 0) {
    parts.push(`Skills already meeting the target bar (${sufficient.join(', ')}) will get lighter coverage, focused on reinforcement rather than fundamentals.`);
  }

  return parts.join(' ');
}

export function analyzeSession(sessionId: string): SkillAnalysisResult {
  const session: AssessmentSession | undefined = getSession(sessionId);
  if (!session) throw new Error('Session not found');

  const role = getRoleById(session.roleId);
  if (!role) throw new Error(`Unknown role: ${session.roleId}`);

  const skillResults = session.skills.map((skill) => skillResultFrom(session.skillStates[skill]));
  const resultBySkill = new Map(skillResults.map((r) => [r.skill, r]));

  const gaps: SkillGap[] = role.skills.map((req) => {
    const result = resultBySkill.get(req.skill);
    const current = result?.masteryScore ?? 0;
    const gap = Math.max(0, req.targetMastery - current);
    const sufficient = current >= req.targetMastery - SUFFICIENCY_MARGIN;

    return {
      skill: req.skill,
      current,
      required: req.targetMastery,
      gap,
      priority: sufficient ? 'low' : priorityFor(gap),
      prerequisites: req.prerequisites,
      sufficient,
    };
  });

  const sortedByScore = [...skillResults].sort((a, b) => b.masteryScore - a.masteryScore);
  const strongestSkills = sortedByScore.slice(0, 3).map((s) => s.skill);
  const weakestSkills = [...sortedByScore].reverse().slice(0, 3).map((s) => s.skill);

  const highPriorityGaps = gaps.filter((g) => g.priority === 'high' && !g.sufficient).map((g) => g.skill);
  const mediumPriorityGaps = gaps.filter((g) => g.priority === 'medium' && !g.sufficient).map((g) => g.skill);
  const lowPriorityGaps = gaps.filter((g) => g.priority === 'low' && !g.sufficient).map((g) => g.skill);
  const sufficientSkills = gaps.filter((g) => g.sufficient).map((g) => g.skill);

  const aiExplanation = buildAiExplanation(role.title, strongestSkills, highPriorityGaps, sufficientSkills);

  return {
    roleId: role.id,
    roleTitle: role.title,
    skillResults,
    gaps,
    strongestSkills,
    weakestSkills,
    highPriorityGaps,
    mediumPriorityGaps,
    lowPriorityGaps,
    sufficientSkills,
    aiExplanation,
  };
}
