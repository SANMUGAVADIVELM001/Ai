import { AI_CONFIG } from '../config.js';
import type {
  AssessmentRecord,
  LearnerContext,
  LearnerContextAssessmentSummary,
  LearnerProfile,
  ModuleProgressRecord,
  Roadmap,
  SkillAnalysisResult,
} from '../types/index.js';

const MAX_HISTORY_SUMMARY = 10;

function lockedReasonFor(m: Roadmap['milestones'][number]): string | null {
  if (m.status !== 'locked' || m.unsatisfiedPrerequisites.length === 0) return null;
  return `Requires: ${m.unsatisfiedPrerequisites.join(', ')}`;
}

/**
 * Builds a compact, token-budget-conscious summary of a learner's current
 * state from the deterministic engines' own output. This is the only
 * "learner data" ever sent to the AI layer — nothing here is invented, and
 * nothing beyond this is sent (no full question/answer history, no raw
 * session internals).
 */
export function buildLearnerContext(
  profile: LearnerProfile,
  analysis: SkillAnalysisResult,
  roadmap: Roadmap | null,
  assessmentHistory: AssessmentRecord[] = [],
  moduleProgress: Record<string, ModuleProgressRecord> = {}
): LearnerContext {
  const skills = analysis.gaps.slice(0, AI_CONFIG.maxContextSkills).map((g) => ({
    name: g.skill,
    mastery: g.current,
    required: g.required,
    priority: g.priority,
    sufficient: g.sufficient,
  }));

  const completedSkills = analysis.sufficientSkills;

  let currentMilestone: LearnerContext['currentMilestone'] = null;
  let upcomingMilestones: LearnerContext['upcomingMilestones'] = [];

  if (roadmap) {
    const active = roadmap.milestones.find((m) => m.status === 'in_progress') ?? roadmap.milestones.find((m) => m.status === 'available');
    if (active) {
      currentMilestone = { skill: active.skill, status: active.status, estimatedWeeks: active.estimatedWeeks, lockedReason: lockedReasonFor(active) };
    }
    upcomingMilestones = roadmap.milestones
      .filter((m) => m.status === 'locked' || m.status === 'available')
      .filter((m) => m.skill !== currentMilestone?.skill)
      .slice(0, 5)
      .map((m) => ({ skill: m.skill, status: m.status, estimatedWeeks: m.estimatedWeeks, lockedReason: lockedReasonFor(m) }));
  }

  const assessmentHistorySummary: LearnerContextAssessmentSummary[] = assessmentHistory
    .filter((a) => a.status === 'completed' && a.skill)
    .slice(0, MAX_HISTORY_SUMMARY)
    .map((a) => {
      const skill = a.skill as string;
      const score = a.scoreBySkill[skill]?.masteryScore ?? 0;
      const progress = moduleProgress[a.moduleId ?? ''];
      const passed = a.type === 'INITIAL_DIAGNOSTIC' || a.type === 'PRACTICE_CHECK' ? null : score >= (progress?.passingThreshold ?? 70);
      return { skill, type: a.type, score, passed, at: a.completedAt ?? a.createdAt };
    });

  return {
    goal: profile.goal,
    roleTitle: analysis.roleTitle,
    targetDuration: profile.targetDuration,
    studyTimePerDayHours: profile.studyTimePerDay ?? 1,
    learningPreferences: profile.learningPreferences,
    skills,
    strongestSkills: analysis.strongestSkills,
    highPriorityGaps: analysis.highPriorityGaps,
    currentMilestone,
    upcomingMilestones,
    completedSkills,
    assessmentHistorySummary,
  };
}
