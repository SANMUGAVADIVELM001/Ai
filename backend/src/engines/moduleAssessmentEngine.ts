import { MASTERY_CONFIG } from '../config.js';
import { createSession, getSession, type CreateSessionOptions } from './assessmentEngine.js';
import { computeMasteryScore } from './skillEngine.js';
import { planQuestionSet } from './questionSelectionEngine.js';
import { updateMasteryFromAssessment, toSkillAnalysisResult } from './masteryEngine.js';
import { recommendResourcesForSkill } from './recommendationEngine.js';
import { buildPrerequisiteGraph } from './prerequisiteEngine.js';
import {
  getModuleProgress,
  upsertModuleProgress,
  upsertAssessmentRecord,
  getAssessmentHistory,
} from '../store/learnerStore.js';
import type {
  AssessmentRecord,
  AssessmentSession,
  AssessmentType,
  ModuleProgressRecord,
  SkillMasteryRecord,
} from '../types/index.js';

function defaultModuleProgress(moduleId: string, skill: string): ModuleProgressRecord {
  return {
    moduleId,
    skill,
    phase: 'not_started',
    passingThreshold: MASTERY_CONFIG.passingThresholdDefault,
    lastAssessmentId: null,
    lastScore: null,
    weakTopics: [],
    remedialResourceIds: [],
    updatedAt: Date.now(),
  };
}

export function getModuleState(learnerId: string, moduleId: string, skill: string): ModuleProgressRecord {
  return getModuleProgress(learnerId, moduleId) ?? defaultModuleProgress(moduleId, skill);
}

export function markModuleLearningStarted(learnerId: string, moduleId: string, skill: string): ModuleProgressRecord {
  const current = getModuleState(learnerId, moduleId, skill);
  if (current.phase === 'not_started') {
    const next: ModuleProgressRecord = { ...current, phase: 'learning', updatedAt: Date.now() };
    upsertModuleProgress(learnerId, next);
    return next;
  }
  return current;
}

export function markModulePracticeReady(learnerId: string, moduleId: string, skill: string): ModuleProgressRecord {
  const current = getModuleState(learnerId, moduleId, skill);
  const next: ModuleProgressRecord = { ...current, phase: 'assessment_ready', updatedAt: Date.now() };
  upsertModuleProgress(learnerId, next);
  return next;
}

function nextAttemptNumber(learnerId: string, skill: string, type: AssessmentType): number {
  return getAssessmentHistory(learnerId, { skill, type }).length + 1;
}

export function startModuleAssessment(learnerId: string, roleId: string, moduleId: string, skill: string): AssessmentSession {
  const progress = getModuleState(learnerId, moduleId, skill);
  const isRetry = progress.phase === 'remedial';
  const type: AssessmentType = isRetry ? 'REASSESSMENT' : 'MODULE_ASSESSMENT';

  const plannedQuestions = planQuestionSet(
    learnerId,
    skill,
    type,
    MASTERY_CONFIG.moduleAssessmentQuestionCount,
    isRetry ? progress.weakTopics : undefined
  );

  const opts: CreateSessionOptions = {
    learnerId,
    type,
    skill,
    moduleId,
    attemptNumber: nextAttemptNumber(learnerId, skill, type),
    plannedQuestions,
  };

  const session = createSession(roleId, opts);
  seedAssessmentRecord(session);
  return session;
}

export function startPracticeCheck(learnerId: string, roleId: string, skill: string, topics?: string[]): AssessmentSession {
  const plannedQuestions = planQuestionSet(learnerId, skill, 'PRACTICE_CHECK', MASTERY_CONFIG.practiceCheckQuestionCount, topics);
  const opts: CreateSessionOptions = {
    learnerId,
    type: 'PRACTICE_CHECK',
    skill,
    moduleId: null,
    attemptNumber: nextAttemptNumber(learnerId, skill, 'PRACTICE_CHECK'),
    plannedQuestions,
  };
  const session = createSession(roleId, opts);
  seedAssessmentRecord(session);
  return session;
}

function seedAssessmentRecord(session: AssessmentSession): void {
  if (!session.learnerId || !session.skill) return;
  const record: AssessmentRecord = {
    assessmentId: session.id,
    learnerId: session.learnerId,
    type: session.type,
    roleId: session.roleId,
    skill: session.skill,
    moduleId: session.moduleId ?? null,
    questionIds: (session.plannedQuestions ?? []).map((q) => q.id),
    attempts: [],
    attemptNumber: session.attemptNumber ?? 1,
    status: 'in_progress',
    createdAt: session.createdAt,
    completedAt: null,
    scoreBySkill: {},
  };
  upsertAssessmentRecord(session.learnerId, record);
}

export interface CompleteAssessmentResult {
  record: AssessmentRecord;
  masteryUpdate: SkillMasteryRecord | null;
  passed: boolean | null;
  weakTopics: string[];
}

/**
 * Finalizes a completed module/reassessment/practice session: scores it,
 * writes the mastery update, determines pass/fail against the module's
 * passing threshold, and — on failure — computes weak topics from
 * incorrectly-answered questions and moves the module into remedial phase
 * with a targeted resource subset attached.
 */
export function completeAssessment(sessionId: string): CompleteAssessmentResult {
  const session = getSession(sessionId);
  if (!session) throw new Error('Session not found');
  if (!session.learnerId || !session.skill) {
    throw new Error('completeAssessment requires a learner-scoped, single-skill session');
  }

  const skill = session.skill;
  const state = session.skillStates[skill];
  const score = computeMasteryScore(state);

  const questionIds = (session.plannedQuestions ?? []).map((q) => q.id);
  const attempts = state.attempts.map((a) => {
    const question = (session.plannedQuestions ?? []).find((q) => q.id === a.questionId);
    return {
      questionId: a.questionId,
      skill: a.skill,
      topic: question?.topic ?? null,
      difficulty: a.difficulty,
      selectedOption: -1, // not tracked separately from correctness in AttemptRecord; correctness is authoritative
      correct: a.correct,
      answeredAt: Date.now(),
    };
  });

  const record: AssessmentRecord = {
    assessmentId: session.id,
    learnerId: session.learnerId,
    type: session.type,
    roleId: session.roleId,
    skill,
    moduleId: session.moduleId ?? null,
    questionIds,
    attempts,
    attemptNumber: session.attemptNumber ?? 1,
    status: 'completed',
    createdAt: session.createdAt,
    completedAt: Date.now(),
    scoreBySkill: { [skill]: { rawScore: state.rawScore, maxPossibleScore: state.maxPossibleScore, masteryScore: score } },
  };
  upsertAssessmentRecord(session.learnerId, record);

  const masteryUpdate = updateMasteryFromAssessment(session.learnerId, session.roleId, skill, score, session.id, session.type);

  // PRACTICE_CHECK is always low-stakes and never gates module progression.
  if (session.type === 'PRACTICE_CHECK') {
    return { record, masteryUpdate, passed: null, weakTopics: [] };
  }

  const moduleId = session.moduleId ?? skill;
  const progress = getModuleState(session.learnerId, moduleId, skill);
  const passed = score >= progress.passingThreshold;

  if (passed) {
    upsertModuleProgress(session.learnerId, {
      ...progress,
      phase: 'passed',
      lastAssessmentId: session.id,
      lastScore: score,
      weakTopics: [],
      remedialResourceIds: [],
      updatedAt: Date.now(),
    });
    return { record, masteryUpdate, passed: true, weakTopics: [] };
  }

  const weakTopics = [
    ...new Set(
      attempts
        .filter((a) => !a.correct && a.topic)
        .map((a) => a.topic as string)
    ),
  ];

  const remedialResourceIds = weakTopics.length > 0 ? findRemedialResourceIds(session.learnerId, session.roleId, skill) : [];

  upsertModuleProgress(session.learnerId, {
    ...progress,
    phase: 'remedial',
    lastAssessmentId: session.id,
    lastScore: score,
    weakTopics,
    remedialResourceIds,
    updatedAt: Date.now(),
  });

  return { record, masteryUpdate, passed: false, weakTopics };
}

function findRemedialResourceIds(learnerId: string, roleId: string, skill: string): string[] {
  try {
    const analysis = toSkillAnalysisResult(learnerId, roleId);
    const prereqGraph = buildPrerequisiteGraph(analysis);
    const placeholderProfile = {
      goal: '',
      roleId,
      targetDuration: null,
      currentSkills: [],
      studyTimePerDay: null,
      learningPreferences: [],
      experienceLevel: null,
    };
    const scored = recommendResourcesForSkill(skill, analysis, prereqGraph, placeholderProfile, 4);
    return scored.map((s) => s.resource.id);
  } catch {
    return [];
  }
}
