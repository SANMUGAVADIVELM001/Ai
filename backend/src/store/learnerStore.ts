import type {
  AssessmentRecord,
  AssessmentType,
  LearnerRecord,
  ModuleProgressRecord,
} from '../types/index.js';
import { MASTERY_CONFIG } from '../config.js';

// In-memory learner store, mirroring assessmentEngine's session Map pattern.
// Keyed by learnerId (client-generated, persisted in the browser's
// localStorage) rather than sessionId, so mastery/history survive across
// individual assessment sessions. Wiped on backend restart — acceptable
// given the existing sessionId store has the same lifecycle.
const learners = new Map<string, LearnerRecord>();

export function getOrCreateLearner(learnerId: string): LearnerRecord {
  let record = learners.get(learnerId);
  if (!record) {
    record = {
      learnerId,
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
      roleId: null,
      mastery: {},
      seenQuestionIds: [],
      assessments: [],
      moduleProgress: {},
    };
    learners.set(learnerId, record);
  }
  return record;
}

export function getLearner(learnerId: string): LearnerRecord | undefined {
  return learners.get(learnerId);
}

export function touchLearner(learnerId: string): void {
  const record = getOrCreateLearner(learnerId);
  record.lastActiveAt = Date.now();
}

export function recordSeenQuestions(learnerId: string, questionIds: string[]): void {
  const record = getOrCreateLearner(learnerId);
  record.seenQuestionIds.push(...questionIds);
  const overflow = record.seenQuestionIds.length - MASTERY_CONFIG.seenQuestionWindow;
  if (overflow > 0) record.seenQuestionIds.splice(0, overflow);
}

export function getRecentlySeenQuestionIds(learnerId: string): string[] {
  return getOrCreateLearner(learnerId).seenQuestionIds;
}

export function upsertAssessmentRecord(learnerId: string, record: AssessmentRecord): void {
  const learner = getOrCreateLearner(learnerId);
  const idx = learner.assessments.findIndex((a) => a.assessmentId === record.assessmentId);
  if (idx >= 0) learner.assessments[idx] = record;
  else learner.assessments.push(record);
}

export function getAssessmentHistory(
  learnerId: string,
  filter?: { skill?: string; type?: AssessmentType }
): AssessmentRecord[] {
  const learner = getLearner(learnerId);
  if (!learner) return [];
  return learner.assessments
    .filter((a) => (filter?.skill ? a.skill === filter.skill : true))
    .filter((a) => (filter?.type ? a.type === filter.type : true))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function getModuleProgress(learnerId: string, moduleId: string): ModuleProgressRecord | undefined {
  return getLearner(learnerId)?.moduleProgress[moduleId];
}

export function upsertModuleProgress(learnerId: string, record: ModuleProgressRecord): void {
  const learner = getOrCreateLearner(learnerId);
  learner.moduleProgress[record.moduleId] = record;
}

export function setLearnerRole(learnerId: string, roleId: string): void {
  const learner = getOrCreateLearner(learnerId);
  learner.roleId = roleId;
}

export function resetLearner(learnerId: string): void {
  learners.delete(learnerId);
}
