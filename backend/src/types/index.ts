// ---- Auth ----

export interface User {
  id: string;
  name: string;
  email: string; // stored lowercase, unique
  passwordHash: string;
  createdAt: number;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  createdAt: number;
}

// ---- Config ----

export interface MasteryBand {
  label: 'Beginner' | 'Developing' | 'Intermediate' | 'Advanced';
  min: number; // inclusive
  max: number; // inclusive
}

// ---- Roles / Skills ----

export interface RoleSkillRequirement {
  skill: string;
  targetMastery: number; // 0-100, required mastery for this role
  prerequisites: string[]; // skill names that should be learned first
}

export interface Role {
  id: string;
  title: string;
  description: string;
  skills: RoleSkillRequirement[];
}

// ---- Learner Profile ----

export interface LearnerProfile {
  goal: string;
  roleId: string | null;
  targetDuration: string | null;
  currentSkills: string[];
  studyTimePerDay: number | null;
  learningPreferences: string[];
  experienceLevel: string | null; // filled in AFTER diagnostic assessment
}

// ---- Assessment / Questions ----

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Question {
  id: string;
  skill: string;
  topic: string;
  difficulty: Difficulty;
  question: string;
  options: string[];
  answer: number; // index of correct option
  explanation: string;
  tags?: string[];
}

export interface AnswerSubmission {
  questionId: string;
  selectedOption: number;
}

export interface AttemptRecord {
  questionId: string;
  skill: string;
  difficulty: Difficulty;
  correct: boolean;
}

export interface SkillAssessmentState {
  skill: string;
  currentDifficulty: Difficulty;
  attempts: AttemptRecord[];
  askedQuestionIds: string[];
  rawScore: number; // sum of weighted points
  maxPossibleScore: number; // sum of max weighted points achievable so far
  finished: boolean;
}

export type AssessmentType = 'INITIAL_DIAGNOSTIC' | 'MODULE_ASSESSMENT' | 'REASSESSMENT' | 'PRACTICE_CHECK' | 'FINAL_ASSESSMENT';
export type AssessmentRecordStatus = 'in_progress' | 'completed' | 'abandoned';

export interface AssessmentSession {
  id: string;
  roleId: string;
  skills: string[];
  skillStates: Record<string, SkillAssessmentState>;
  createdAt: number;
  completed: boolean;
  // Persistence/module-assessment extensions (optional — absent/defaulted for
  // the legacy anonymous INITIAL_DIAGNOSTIC flow so existing behavior is
  // unaffected when these are omitted).
  learnerId?: string;
  type: AssessmentType;
  skill?: string | null; // single-skill sessions (module/reassessment/practice)
  moduleId?: string | null;
  attemptNumber?: number;
  // Fixed question set decided at creation time for non-adaptive session
  // types. When set, getNextQuestion serves from this list in order instead
  // of picking adaptively — keeps the question set immutable once started.
  plannedQuestions?: Question[] | null;
}

// ---- Skill Analysis ----

export interface SkillResult {
  skill: string;
  masteryScore: number; // 0-100
  masteryLabel: MasteryBand['label'];
  questionsAttempted: number;
  correctAnswers: number;
  incorrectAnswers: number;
}

export type PriorityLevel = 'high' | 'medium' | 'low';

export interface SkillGap {
  skill: string;
  current: number;
  required: number;
  gap: number;
  priority: PriorityLevel;
  prerequisites: string[];
  sufficient: boolean;
}

export interface SkillAnalysisResult {
  roleId: string;
  roleTitle: string;
  skillResults: SkillResult[];
  gaps: SkillGap[];
  strongestSkills: string[];
  weakestSkills: string[];
  highPriorityGaps: string[];
  mediumPriorityGaps: string[];
  lowPriorityGaps: string[];
  sufficientSkills: string[];
  aiExplanation: string;
}

// ---- Prerequisite Graph ----

export type PrerequisiteStatus = 'satisfied' | 'partial' | 'missing';
export type SkillAvailability = 'available' | 'locked';

export interface SkillPrerequisiteInfo {
  skill: string;
  prerequisites: string[];
  prerequisiteStatus: PrerequisiteStatus;
  unsatisfiedPrerequisites: string[];
  availability: SkillAvailability;
  topologicalOrder: number;
}

export interface PrerequisiteGraphResult {
  roleId: string;
  nodes: SkillPrerequisiteInfo[];
}

// ---- Resources ----

export type ResourceType = 'video' | 'course' | 'article' | 'documentation' | 'interactive' | 'book';

export interface Resource {
  id: string;
  title: string;
  type: ResourceType;
  skill: string;
  difficulty: Difficulty | 'any';
  durationMinutes: number;
  provider: string;
  url: string;
  isFree: boolean;
  description: string;
  tags: string[];
  prerequisites: string[];
}

export interface ScoreBreakdown {
  goalRelevance: number;
  skillGapRelevance: number;
  prerequisiteFit: number;
  difficultyFit: number;
  preferenceFit: number;
  timeFit: number;
}

export interface ScoredResource {
  resource: Resource;
  score: number;
  scoreBreakdown: ScoreBreakdown;
}

// ---- Roadmap ----

export type MilestoneStatus = 'locked' | 'available' | 'in_progress' | 'completed';

export interface RoadmapMilestone {
  id: string;
  skill: string;
  status: MilestoneStatus;
  priority: PriorityLevel;
  currentMastery: number;
  targetMastery: number;
  gap: number;
  estimatedHours: number;
  order: number;
  prerequisiteStatus: PrerequisiteStatus;
  unsatisfiedPrerequisites: string[];
  isVerifiedSufficient: boolean;
  resources: ScoredResource[];
  project: ProjectRecommendation | null;
  whyRecommended: string;
}

export interface ProjectRecommendation {
  title: string;
  description: string;
  skill: string;
  difficulty: Difficulty;
  appliesSkills: string[];
}

export type PacingChoice = 'recommended' | 'accelerated' | 'as_requested';

export interface LearnerPacing {
  availableDays: number;
  studyHoursPerDay: number;
  chosenPlan: PacingChoice;
  confirmedAt: number;
}

export interface Roadmap {
  roleId: string;
  roleTitle: string;
  generatedAt: number;
  totalEstimatedHours: number;
  totalEstimatedDays: number;
  studyTimePerDayHours: number;
  targetDuration: string | null;
  pacing: LearnerPacing | null;
  milestones: RoadmapMilestone[];
  progress: { completed: number; total: number; percentComplete: number };
}

export interface PlanOptionFeasible {
  feasible: true;
  studyHoursPerDay: number;
  totalHoursNeeded: number;
  availableDays: number;
}

export interface PlanOptionInfeasible {
  feasible: false;
  requestedDays: number;
  recommended: { days: number; hoursPerDay: number };
  accelerated: { days: number; hoursPerDay: number };
  totalHoursNeeded: number;
  reason: string;
}

export type PlanOptionsResult = PlanOptionFeasible | PlanOptionInfeasible;

// ---- AI / NLP layer ----

export interface ExtractedGoalProfile {
  goal: string | null;
  timelineMonths: number | null;
  currentSkills: string[];
  studyHoursPerDay: number | null;
  learningPreferences: string[];
  experienceLevel: string | null;
}

export interface GeneratedQuestion {
  skill: string;
  difficulty: Difficulty;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface LearnerContextSkill {
  name: string;
  mastery: number;
  required: number;
  priority: PriorityLevel;
  sufficient: boolean;
}

export interface LearnerContextMilestone {
  skill: string;
  status: MilestoneStatus;
  estimatedHours: number;
  lockedReason: string | null;
}

export interface LearnerContextAssessmentSummary {
  skill: string;
  type: AssessmentType;
  score: number;
  passed: boolean | null;
  at: number;
}

// Compact, token-budget-conscious summary of a learner's state, built fresh
// from the deterministic engines' output for every AI request that needs
// context (never persisted, never containing invented data).
export interface LearnerContext {
  goal: string;
  roleTitle: string;
  targetDuration: string | null;
  studyTimePerDayHours: number;
  learningPreferences: string[];
  skills: LearnerContextSkill[];
  strongestSkills: string[];
  highPriorityGaps: string[];
  currentMilestone: LearnerContextMilestone | null;
  upcomingMilestones: LearnerContextMilestone[];
  completedSkills: string[];
  assessmentHistorySummary: LearnerContextAssessmentSummary[];
}

export interface CoachMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIResult<T> {
  data: T;
  source: 'ai' | 'fallback';
  notice?: string;
}

// ---- Persistent learner state (mastery, question/assessment history, module progress) ----

export interface QuestionAttempt {
  questionId: string;
  skill: string;
  topic: string | null;
  difficulty: Difficulty;
  selectedOption: number;
  correct: boolean;
  answeredAt: number;
}

export interface AssessmentRecord {
  assessmentId: string; // === AssessmentSession.id
  learnerId: string;
  type: AssessmentType;
  roleId: string;
  skill: string | null; // null only for INITIAL_DIAGNOSTIC (spans all role skills)
  moduleId: string | null;
  questionIds: string[];
  attempts: QuestionAttempt[];
  attemptNumber: number;
  status: AssessmentRecordStatus;
  createdAt: number;
  completedAt: number | null;
  scoreBySkill: Record<string, { rawScore: number; maxPossibleScore: number; masteryScore: number }>;
}

export type MasteryTrend = 'improving' | 'declining' | 'stable' | 'new';
export type MasteryConfidence = 'low' | 'medium' | 'high';

export interface SkillMasteryHistoryEntry {
  assessmentId: string;
  type: AssessmentType;
  score: number;
  at: number;
}

export interface SkillMasteryRecord {
  skill: string;
  current: number; // 0-100, persistent mastery
  target: number;
  gap: number;
  trend: MasteryTrend;
  assessmentCount: number;
  lastAssessedAt: number | null;
  confidence: MasteryConfidence;
  history: SkillMasteryHistoryEntry[];
}

export type ModulePhase =
  | 'not_started'
  | 'learning'
  | 'practice_ready'
  | 'assessment_ready'
  | 'passed'
  | 'remedial'
  | 'failed_awaiting_retry';

export interface ModuleProgressRecord {
  moduleId: string;
  skill: string;
  phase: ModulePhase;
  passingThreshold: number;
  lastAssessmentId: string | null;
  lastScore: number | null;
  weakTopics: string[];
  remedialResourceIds: string[];
  updatedAt: number;
}

/**
 * All state for one learner's pursuit of one role/goal: mastery, seen
 * questions (so reassessments don't repeat), assessment history, and module
 * progress. Fully independent from every other goal the same learner has —
 * switching the active goal never touches another goal's GoalState.
 */
export interface GoalState {
  roleId: string;
  createdAt: number;
  lastActiveAt: number;
  mastery: Record<string, SkillMasteryRecord>;
  seenQuestionIds: string[]; // rolling window, most-recent-last
  assessments: AssessmentRecord[];
  moduleProgress: Record<string, ModuleProgressRecord>;
  /** The learner's confirmed study-pacing choice, or null until they've gone through the pacing step. */
  pacing: LearnerPacing | null;
}

export interface LearnerRecord {
  learnerId: string;
  createdAt: number;
  lastActiveAt: number;
  /** The goal currently shown in Home/Dashboard/Roadmap. Null until the learner picks a first goal. */
  activeRoleId: string | null;
  /** One GoalState per role the learner has ever started, keyed by roleId. */
  goals: Record<string, GoalState>;
}

// ---- Next best action ----

export type NextActionKind =
  | 'pending_assessment'
  | 'in_progress_module'
  | 'remedial'
  | 'high_priority_gap'
  | 'newly_unlocked_module'
  | 'practice'
  | 'project'
  | 'capstone';

export interface NextBestAction {
  kind: NextActionKind;
  moduleId: string | null;
  skill: string | null;
  label: string;
  description: string;
  ctaLabel: string;
  ctaTo: string;
}
