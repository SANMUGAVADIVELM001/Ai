import { MASTERY_CONFIG, SUFFICIENCY_MARGIN, priorityFor } from '../config.js';
import { getOrCreateGoal, setActiveGoal, upsertMastery } from '../store/learnerStore.js';
import { getRoleById } from './profileEngine.js';
import { buildAiExplanation } from './skillEngine.js';
import type {
  AssessmentType,
  MasteryConfidence,
  MasteryTrend,
  SkillAnalysisResult,
  SkillGap,
  SkillMasteryRecord,
  SkillResult,
} from '../types/index.js';
import { masteryLabelFor } from '../config.js';

function confidenceFor(assessmentCount: number): MasteryConfidence {
  if (assessmentCount >= MASTERY_CONFIG.confidenceThresholds.high) return 'high';
  if (assessmentCount >= MASTERY_CONFIG.confidenceThresholds.medium) return 'medium';
  return 'low';
}

function trendFor(previous: number, next: number): MasteryTrend {
  if (next - previous >= MASTERY_CONFIG.trendThreshold) return 'improving';
  if (previous - next >= MASTERY_CONFIG.trendThreshold) return 'declining';
  return 'stable';
}

function targetFor(roleId: string, skill: string): number {
  const role = getRoleById(roleId);
  return role?.skills.find((s) => s.skill === skill)?.targetMastery ?? 70;
}

function blankRecord(skill: string, roleId: string): SkillMasteryRecord {
  const target = targetFor(roleId, skill);
  return {
    skill,
    current: 0,
    target,
    gap: target,
    trend: 'new',
    assessmentCount: 0,
    lastAssessedAt: null,
    confidence: 'low',
    history: [],
  };
}

/**
 * Bootstrap write for the INITIAL_DIAGNOSTIC only. There is no prior mastery
 * to blend with — this IS the learner's first-ever measurement per skill, so
 * it overwrites rather than blends.
 */
export function bootstrapMasteryFromDiagnostic(
  learnerId: string,
  roleId: string,
  analysis: SkillAnalysisResult,
  assessmentId: string
): void {
  setActiveGoal(learnerId, roleId);
  const goal = getOrCreateGoal(learnerId, roleId);
  const now = Date.now();

  for (const result of analysis.skillResults) {
    const target = targetFor(roleId, result.skill);
    const existing = goal.mastery[result.skill];
    // Retaking the diagnostic re-measures the skills it covers, but must not
    // discard prior module-assessment history for a skill already tracked —
    // it's still a new measurement, so it's recorded as bootstrap-strength
    // evidence (overwrite `current`), while assessment history accumulates.
    const history = existing ? [...existing.history] : [];
    history.push({ assessmentId, type: 'INITIAL_DIAGNOSTIC', score: result.masteryScore, at: now });

    upsertMastery(learnerId, roleId, {
      skill: result.skill,
      current: result.masteryScore,
      target,
      gap: Math.max(0, target - result.masteryScore),
      trend: existing ? trendFor(existing.current, result.masteryScore) : 'new',
      assessmentCount: (existing?.assessmentCount ?? 0) + 1,
      lastAssessedAt: now,
      confidence: confidenceFor((existing?.assessmentCount ?? 0) + 1),
      history,
    });
  }
}

/**
 * Blending write for MODULE_ASSESSMENT / REASSESSMENT / PRACTICE_CHECK /
 * FINAL_ASSESSMENT. PRACTICE_CHECK never lowers recorded mastery — it's
 * low-stakes reinforcement, not a scored gate.
 */
export function updateMasteryFromAssessment(
  learnerId: string,
  roleId: string,
  skill: string,
  assessmentScore: number,
  assessmentId: string,
  type: AssessmentType
): SkillMasteryRecord {
  const goal = getOrCreateGoal(learnerId, roleId);
  const previous = goal.mastery[skill] ?? blankRecord(skill, roleId);
  const now = Date.now();

  const effectiveWeight = MASTERY_CONFIG.newEvidenceWeight * MASTERY_CONFIG.typeWeightMultiplier[type];
  let blended = previous.current * (1 - effectiveWeight) + assessmentScore * effectiveWeight;
  if (type === 'PRACTICE_CHECK') blended = Math.max(blended, previous.current);
  const current = Math.round(Math.max(0, Math.min(100, blended)));

  const target = targetFor(roleId, skill);
  const history = [...previous.history, { assessmentId, type, score: assessmentScore, at: now }];

  const record: SkillMasteryRecord = {
    skill,
    current,
    target,
    gap: Math.max(0, target - current),
    trend: trendFor(previous.current, current),
    assessmentCount: previous.assessmentCount + 1,
    lastAssessedAt: now,
    confidence: confidenceFor(previous.assessmentCount + 1),
    history,
  };

  upsertMastery(learnerId, roleId, record);
  return record;
}

/**
 * One record per role skill — skills never assessed yet get a synthesized
 * placeholder so callers never have to null-check "has this been measured."
 */
export function getLearnerMasteryForRole(learnerId: string, roleId: string): SkillMasteryRecord[] {
  const goal = getOrCreateGoal(learnerId, roleId);
  const role = getRoleById(roleId);
  if (!role) throw new Error(`Unknown role: ${roleId}`);

  return role.skills.map((req) => goal.mastery[req.skill] ?? blankRecord(req.skill, roleId));
}

function skillResultFromMastery(record: SkillMasteryRecord): SkillResult {
  return {
    skill: record.skill,
    masteryScore: record.current,
    masteryLabel: masteryLabelFor(record.current),
    questionsAttempted: 0,
    correctAnswers: 0,
    incorrectAnswers: 0,
  };
}

/**
 * Reshapes persisted mastery into the exact SkillAnalysisResult shape used
 * everywhere else (prerequisiteEngine/roadmapEngine take this as input
 * unmodified), so the rest of the pipeline doesn't need to know whether the
 * analysis came from one session or accumulated persistent mastery.
 */
export function toSkillAnalysisResult(learnerId: string, roleId: string): SkillAnalysisResult {
  const role = getRoleById(roleId);
  if (!role) throw new Error(`Unknown role: ${roleId}`);

  const masteryRecords = getLearnerMasteryForRole(learnerId, roleId);
  const skillResults = masteryRecords.map(skillResultFromMastery);

  const gaps: SkillGap[] = masteryRecords.map((record) => {
    const sufficient = record.current >= record.target - SUFFICIENCY_MARGIN;
    const roleSkill = role.skills.find((s) => s.skill === record.skill);
    return {
      skill: record.skill,
      current: record.current,
      required: record.target,
      gap: record.gap,
      priority: sufficient ? 'low' : priorityFor(record.gap),
      prerequisites: roleSkill?.prerequisites ?? [],
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
