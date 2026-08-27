import type {
  AssessmentRecord,
  AssessmentType,
  GoalState,
  LearnerRecord,
  ModuleProgressRecord,
  SkillMasteryRecord,
} from '../types/index.js';
import { MASTERY_CONFIG } from '../config.js';
import { LearnerRecordModel } from '../db/models.js';
import { isDatabaseConnected } from '../db/mongoose.js';

// In-memory learner store, mirroring assessmentEngine's session Map pattern.
// Keyed by learnerId (== the authenticated user's id) rather than sessionId,
// so mastery/history survive across individual assessment sessions. Wiped on
// backend restart — acceptable given the existing sessionId store has the
// same lifecycle.
//
// Each learner can pursue multiple goals (roles) at once. Every goal's
// mastery/assessments/moduleProgress lives in its own GoalState, keyed by
// roleId within the learner's record — switching the active goal never
// mutates another goal's state.
const learners = new Map<string, LearnerRecord>();

/**
 * Fire-and-forget upsert of a learner's full record into MongoDB. Callers
 * keep their synchronous API — the in-memory Map is always the source of
 * truth for reads within this process; Mongo just mirrors it so state
 * survives restarts. Errors are logged, not thrown, so a transient DB issue
 * never breaks a request that already succeeded in memory.
 */
function persistLearner(record: LearnerRecord): void {
  if (!isDatabaseConnected()) return;
  LearnerRecordModel.updateOne(
    { learnerId: record.learnerId },
    { $set: record },
    { upsert: true }
  ).exec().catch((err) => {
    console.error(`[learnerStore] failed to persist learner ${record.learnerId}:`, err);
  });
}

/** Loads all learner records from MongoDB into the in-memory cache. Call once at startup. */
export async function loadLearnersFromDb(): Promise<void> {
  if (!isDatabaseConnected()) return;
  const docs = await LearnerRecordModel.find().lean();
  for (const doc of docs) {
    const goals = doc.goals instanceof Map ? Object.fromEntries(doc.goals) : (doc.goals as Record<string, GoalState>);
    learners.set(doc.learnerId, {
      learnerId: doc.learnerId,
      createdAt: doc.createdAt,
      lastActiveAt: doc.lastActiveAt,
      activeRoleId: doc.activeRoleId ?? null,
      goals,
    });
  }
  console.log(`[learnerStore] loaded ${docs.length} learner record(s) from MongoDB`);
}

export function getOrCreateLearner(learnerId: string): LearnerRecord {
  let record = learners.get(learnerId);
  if (!record) {
    record = {
      learnerId,
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
      activeRoleId: null,
      goals: {},
    };
    learners.set(learnerId, record);
  }
  return record;
}

export function getLearner(learnerId: string): LearnerRecord | undefined {
  return learners.get(learnerId);
}

function blankGoalState(roleId: string): GoalState {
  return {
    roleId,
    createdAt: Date.now(),
    lastActiveAt: Date.now(),
    mastery: {},
    seenQuestionIds: [],
    assessments: [],
    moduleProgress: {},
  };
}

export function getOrCreateGoal(learnerId: string, roleId: string): GoalState {
  const learner = getOrCreateLearner(learnerId);
  let goal = learner.goals[roleId];
  if (!goal) {
    goal = blankGoalState(roleId);
    learner.goals[roleId] = goal;
  }
  return goal;
}

export function getGoal(learnerId: string, roleId: string): GoalState | undefined {
  return learners.get(learnerId)?.goals[roleId];
}

/** All goals a learner has ever started, most-recently-active first. */
export function listGoals(learnerId: string): GoalState[] {
  const learner = getLearner(learnerId);
  if (!learner) return [];
  return Object.values(learner.goals).sort((a, b) => b.lastActiveAt - a.lastActiveAt);
}

export function touchLearner(learnerId: string): void {
  const record = getOrCreateLearner(learnerId);
  record.lastActiveAt = Date.now();
  persistLearner(record);
}

/**
 * Sets the learner's active goal (creating it if this is the first time
 * they've pursued this role) without touching any other goal's state.
 */
export function setActiveGoal(learnerId: string, roleId: string): void {
  const learner = getOrCreateLearner(learnerId);
  learner.activeRoleId = roleId;
  getOrCreateGoal(learnerId, roleId);
  persistLearner(learner);
}

/**
 * Writes a skill's mastery record, replacing any existing one for that
 * skill. The only sanctioned way to mutate GoalState.mastery — engines must
 * call this instead of writing into a GoalState object directly, so every
 * mastery change is persisted.
 */
export function upsertMastery(learnerId: string, roleId: string, record: SkillMasteryRecord): void {
  const goal = getOrCreateGoal(learnerId, roleId);
  goal.mastery[record.skill] = record;
  goal.lastActiveAt = Date.now();
  persistLearner(getOrCreateLearner(learnerId));
}

export function recordSeenQuestions(learnerId: string, roleId: string, questionIds: string[]): void {
  const goal = getOrCreateGoal(learnerId, roleId);
  goal.seenQuestionIds.push(...questionIds);
  const overflow = goal.seenQuestionIds.length - MASTERY_CONFIG.seenQuestionWindow;
  if (overflow > 0) goal.seenQuestionIds.splice(0, overflow);
  persistLearner(getOrCreateLearner(learnerId));
}

export function getRecentlySeenQuestionIds(learnerId: string, roleId: string): string[] {
  return getOrCreateGoal(learnerId, roleId).seenQuestionIds;
}

export function upsertAssessmentRecord(learnerId: string, roleId: string, record: AssessmentRecord): void {
  const goal = getOrCreateGoal(learnerId, roleId);
  const idx = goal.assessments.findIndex((a) => a.assessmentId === record.assessmentId);
  if (idx >= 0) goal.assessments[idx] = record;
  else goal.assessments.push(record);
  persistLearner(getOrCreateLearner(learnerId));
}

export function getAssessmentHistory(
  learnerId: string,
  roleId: string,
  filter?: { skill?: string; type?: AssessmentType }
): AssessmentRecord[] {
  const goal = getGoal(learnerId, roleId);
  if (!goal) return [];
  return goal.assessments
    .filter((a) => (filter?.skill ? a.skill === filter.skill : true))
    .filter((a) => (filter?.type ? a.type === filter.type : true))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function getModuleProgress(learnerId: string, roleId: string, moduleId: string): ModuleProgressRecord | undefined {
  return getGoal(learnerId, roleId)?.moduleProgress[moduleId];
}

export function upsertModuleProgress(learnerId: string, roleId: string, record: ModuleProgressRecord): void {
  const goal = getOrCreateGoal(learnerId, roleId);
  goal.moduleProgress[record.moduleId] = record;
  persistLearner(getOrCreateLearner(learnerId));
}

export function resetLearner(learnerId: string): void {
  learners.delete(learnerId);
  if (isDatabaseConnected()) {
    LearnerRecordModel.deleteOne({ learnerId }).exec().catch((err) => {
      console.error(`[learnerStore] failed to delete learner ${learnerId}:`, err);
    });
  }
}

export function resetGoal(learnerId: string, roleId: string): void {
  const learner = getLearner(learnerId);
  if (!learner) return;
  delete learner.goals[roleId];
  if (learner.activeRoleId === roleId) learner.activeRoleId = null;
  persistLearner(learner);
}
