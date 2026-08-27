import questionsData from '../data/questions.json' with { type: 'json' };
import { getRecentlySeenQuestionIds } from '../store/learnerStore.js';
import { ASSESSMENT_CONFIG } from '../config.js';
import type { AssessmentType, Difficulty, Question } from '../types/index.js';

const bank = questionsData as Question[];

// AI-generated questions are appended here at runtime (mirrors
// assessmentEngine's addGeneratedQuestion pool) so selection can draw from
// both the curated bank and anything the AI layer has produced this session.
const generatedQuestions: Question[] = [];

export function addGeneratedQuestionToSelectionPool(question: Question): void {
  generatedQuestions.push(question);
}

function allQuestions(): Question[] {
  return [...bank, ...generatedQuestions];
}

function questionsForSkill(skill: string): Question[] {
  return allQuestions().filter((q) => q.skill === skill);
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Returns a copy of `question` with its options shuffled and `answer`
 * remapped to point at the same (now relocated) correct option. The
 * canonical bank question is never mutated.
 */
function withShuffledOptions(question: Question): Question {
  const correctOption = question.options[question.answer];
  const indices = shuffle(question.options.map((_, i) => i));
  const options = indices.map((i) => question.options[i]);
  const answer = options.indexOf(correctOption);
  return { ...question, options, answer };
}

const DIFFICULTY_ORDER: Difficulty[] = ASSESSMENT_CONFIG.difficultyOrder;

function byDifficultyDistance(pool: Question[], target: Difficulty): Question[] {
  const targetIdx = DIFFICULTY_ORDER.indexOf(target);
  return [...pool].sort(
    (a, b) => Math.abs(DIFFICULTY_ORDER.indexOf(a.difficulty) - targetIdx) - Math.abs(DIFFICULTY_ORDER.indexOf(b.difficulty) - targetIdx)
  );
}

export interface SelectQuestionsParams {
  skill: string;
  learnerId: string;
  roleId: string;
  assessmentType: AssessmentType;
  difficulty: Difficulty;
  count: number;
  /** Topics that must be represented (at least one question each) before filling the rest. Used by remedial reassessment. */
  requireTopics?: string[];
  /** Question ids to additionally exclude beyond the learner's seen-question window (e.g. ones already planned earlier in this same call). */
  additionalExcludeIds?: string[];
}

/**
 * Selects up to `count` non-repeating, topic-diverse questions for a skill:
 * prefers ones the learner hasn't recently seen, guarantees required-topic
 * coverage first, spreads remaining picks across distinct topics rather than
 * clustering on one, and shuffles both question order and each question's
 * option order (preserving the correct answer).
 */
export function selectQuestions(params: SelectQuestionsParams): Question[] {
  const { skill, learnerId, roleId, difficulty, count, requireTopics = [], additionalExcludeIds = [] } = params;

  const seen = new Set([...getRecentlySeenQuestionIds(learnerId, roleId), ...additionalExcludeIds]);
  const fullPool = questionsForSkill(skill);
  const unseenPool = fullPool.filter((q) => !seen.has(q.id));
  // If avoiding seen questions would leave too few to reach `count` (small
  // skill pools), fall back to the full pool so an assessment always has
  // enough questions — repetition is preferable to an assessment that can't start.
  const pool = unseenPool.length >= count ? unseenPool : fullPool;

  const selected: Question[] = [];
  const usedIds = new Set<string>();
  const usedTopics = new Set<string>();

  function take(question: Question) {
    selected.push(question);
    usedIds.add(question.id);
    usedTopics.add(question.topic);
  }

  // 1. Guarantee required-topic coverage first (remedial reassessment).
  for (const topic of requireTopics) {
    if (selected.length >= count) break;
    const candidates = pool.filter((q) => q.topic === topic && !usedIds.has(q.id));
    const ranked = byDifficultyDistance(shuffle(candidates), difficulty);
    if (ranked[0]) take(ranked[0]);
  }

  // 2. Fill remaining slots, preferring topics not yet covered in this set.
  const remainingSorted = byDifficultyDistance(shuffle(pool.filter((q) => !usedIds.has(q.id))), difficulty);
  for (const q of remainingSorted) {
    if (selected.length >= count) break;
    if (usedTopics.has(q.topic) && usedTopics.size < new Set(pool.map((p) => p.topic)).size) continue;
    take(q);
  }
  // 3. If topic diversity left slots unfilled (small pools), top up ignoring the topic constraint.
  for (const q of remainingSorted) {
    if (selected.length >= count) break;
    if (usedIds.has(q.id)) continue;
    take(q);
  }

  return shuffle(selected).map(withShuffledOptions);
}

/**
 * Pre-plans a fixed, immutable question set for a non-adaptive assessment
 * (MODULE_ASSESSMENT / REASSESSMENT / PRACTICE_CHECK / FINAL_ASSESSMENT).
 * The adaptive INITIAL_DIAGNOSTIC does not use this — it keeps selecting one
 * question at a time via assessmentEngine's adaptive logic.
 */
export function planQuestionSet(
  learnerId: string,
  roleId: string,
  skill: string,
  type: AssessmentType,
  count: number,
  requireTopics?: string[]
): Question[] {
  return selectQuestions({
    skill,
    learnerId,
    roleId,
    assessmentType: type,
    difficulty: 'medium',
    count,
    requireTopics,
  });
}
