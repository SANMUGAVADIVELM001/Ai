import { randomUUID } from 'node:crypto';
import questionsData from '../data/questions.json' with { type: 'json' };
import { ASSESSMENT_CONFIG, DIFFICULTY_POINTS } from '../config.js';
import { getRoleById } from './profileEngine.js';
import { recordSeenQuestions } from '../store/learnerStore.js';
import type {
  AssessmentSession,
  AssessmentType,
  Difficulty,
  Question,
  SkillAssessmentState,
} from '../types/index.js';

const localQuestions = questionsData as Question[];

// AI-generated questions are added here at runtime (via
// addGeneratedQuestion) and merged into the pool alongside the local bank.
// They are graded by exactly the same submitAnswer() logic as any other
// question — the AI only ever supplies question content, never a score.
const generatedQuestions: Question[] = [];

// In-memory session store. Fine for a local/mock Phase 1 — swap for a real
// store (DB/Redis) later without changing the engine's public API.
const sessions = new Map<string, AssessmentSession>();

export function addGeneratedQuestion(question: Question): void {
  generatedQuestions.push(question);
}

function allQuestions(): Question[] {
  return [...localQuestions, ...generatedQuestions];
}

function questionsForSkill(skill: string): Question[] {
  return allQuestions().filter((q) => q.skill === skill);
}

function pickQuestion(skill: string, difficulty: Difficulty, askedIds: string[]): Question | null {
  const pool = questionsForSkill(skill);
  const exact = pool.filter((q) => q.difficulty === difficulty && !askedIds.includes(q.id));
  if (exact.length > 0) return exact[Math.floor(Math.random() * exact.length)];

  // Fallback: any unasked question for the skill, closest difficulty first.
  const order: Difficulty[] = ASSESSMENT_CONFIG.difficultyOrder;
  const startIdx = order.indexOf(difficulty);
  const byDistance = [...pool]
    .filter((q) => !askedIds.includes(q.id))
    .sort((a, b) => Math.abs(order.indexOf(a.difficulty) - startIdx) - Math.abs(order.indexOf(b.difficulty) - startIdx));

  return byDistance[0] ?? null;
}

function nextDifficulty(current: Difficulty, wasCorrect: boolean): Difficulty {
  const order = ASSESSMENT_CONFIG.difficultyOrder;
  const idx = order.indexOf(current);
  if (wasCorrect) {
    return order[Math.min(idx + 1, order.length - 1)];
  }
  return order[Math.max(idx - 1, 0)];
}

function maxPointsForDifficulty(d: Difficulty): number {
  return DIFFICULTY_POINTS[d];
}

export interface CreateSessionOptions {
  learnerId?: string;
  type?: AssessmentType;
  /** Single skill for MODULE_ASSESSMENT/REASSESSMENT/PRACTICE_CHECK/FINAL_ASSESSMENT; omitted (adaptive, all role skills) for INITIAL_DIAGNOSTIC. */
  skill?: string;
  moduleId?: string | null;
  attemptNumber?: number;
  /** Fixed, pre-selected question set for non-adaptive session types. Required when `skill` is set. */
  plannedQuestions?: Question[];
}

export function createSession(roleId: string, opts: CreateSessionOptions = {}): AssessmentSession {
  const role = getRoleById(roleId);
  if (!role) throw new Error(`Unknown role: ${roleId}`);

  const type = opts.type ?? 'INITIAL_DIAGNOSTIC';
  const skills = opts.skill ? [opts.skill] : role.skills.map((s) => s.skill);

  const skillStates: Record<string, SkillAssessmentState> = {};
  for (const skill of skills) {
    skillStates[skill] = {
      skill,
      currentDifficulty: ASSESSMENT_CONFIG.startingDifficulty,
      attempts: [],
      askedQuestionIds: [],
      rawScore: 0,
      maxPossibleScore: 0,
      finished: false,
    };
  }

  const session: AssessmentSession = {
    id: randomUUID(),
    roleId,
    skills,
    skillStates,
    createdAt: Date.now(),
    completed: false,
    learnerId: opts.learnerId,
    type,
    skill: opts.skill ?? null,
    moduleId: opts.moduleId ?? null,
    attemptNumber: opts.attemptNumber ?? 1,
    plannedQuestions: opts.plannedQuestions ?? null,
  };

  sessions.set(session.id, session);
  return session;
}

export function getSession(sessionId: string): AssessmentSession | undefined {
  return sessions.get(sessionId);
}

/**
 * Returns the next question to ask, or null if the assessment is complete.
 *
 * For the adaptive INITIAL_DIAGNOSTIC (no plannedQuestions), picks the first
 * skill that isn't finished yet, at that skill's current adaptive
 * difficulty. For a planned session (MODULE_ASSESSMENT/REASSESSMENT/
 * PRACTICE_CHECK/FINAL_ASSESSMENT), serves the next not-yet-asked question
 * from the fixed plannedQuestions list, in order — the set was decided once
 * at creation and never changes.
 */
export function getNextQuestion(sessionId: string): { question: Question; skillsRemaining: number; totalSkills: number } | null {
  const session = sessions.get(sessionId);
  if (!session) throw new Error('Session not found');

  if (session.plannedQuestions) {
    const skill = session.skills[0];
    const state = session.skillStates[skill];
    const next = session.plannedQuestions.find((q) => !state.askedQuestionIds.includes(q.id));
    if (!next) {
      state.finished = true;
      session.completed = true;
      return null;
    }
    return { question: next, skillsRemaining: 1, totalSkills: 1 };
  }

  const pendingSkills = session.skills.filter((s) => !session.skillStates[s].finished);
  if (pendingSkills.length === 0) {
    session.completed = true;
    return null;
  }

  const skill = pendingSkills[0];
  const state = session.skillStates[skill];
  const question = pickQuestion(skill, state.currentDifficulty, state.askedQuestionIds);

  if (!question) {
    // No more questions available for this skill; mark finished.
    state.finished = true;
    return getNextQuestion(sessionId);
  }

  return {
    question,
    skillsRemaining: pendingSkills.length,
    totalSkills: session.skills.length,
  };
}

export interface SubmitAnswerResult {
  correct: boolean;
  correctAnswer: number;
  explanation: string;
  skillFinished: boolean;
}

export function submitAnswer(sessionId: string, questionId: string, selectedOption: number): SubmitAnswerResult {
  const session = sessions.get(sessionId);
  if (!session) throw new Error('Session not found');

  // Planned sessions must grade against the exact (possibly option-shuffled)
  // question instance that was served, not the canonical bank entry — the
  // shuffle remaps `answer` to a different index per instance.
  const question = session.plannedQuestions
    ? session.plannedQuestions.find((q) => q.id === questionId)
    : allQuestions().find((q) => q.id === questionId);
  if (!question) throw new Error('Question not found');

  const state = session.skillStates[question.skill];
  if (!state) throw new Error(`Question skill ${question.skill} not part of this session`);

  const correct = selectedOption === question.answer;

  state.attempts.push({
    questionId,
    skill: question.skill,
    difficulty: question.difficulty,
    correct,
  });
  state.askedQuestionIds.push(questionId);

  state.maxPossibleScore += maxPointsForDifficulty(question.difficulty);
  if (correct) {
    state.rawScore += maxPointsForDifficulty(question.difficulty);
  }

  if (session.plannedQuestions) {
    // Fixed-set sessions don't adapt difficulty — the set was decided at
    // creation. Finished once every planned question has been answered.
    state.finished = state.askedQuestionIds.length >= session.plannedQuestions.length;
  } else {
    state.currentDifficulty = nextDifficulty(state.currentDifficulty, correct);
    const reachedMax = state.attempts.length >= ASSESSMENT_CONFIG.maxQuestionsPerSkill;
    const noQuestionsLeft = pickQuestion(state.skill, state.currentDifficulty, state.askedQuestionIds) === null;
    if (reachedMax || noQuestionsLeft) {
      state.finished = true;
    }
  }

  const allFinished = session.skills.every((s) => session.skillStates[s].finished);
  if (allFinished) session.completed = true;

  if (session.learnerId) {
    recordSeenQuestions(session.learnerId, [questionId]);
  }

  return {
    correct,
    correctAnswer: question.answer,
    explanation: question.explanation,
    skillFinished: state.finished,
  };
}
