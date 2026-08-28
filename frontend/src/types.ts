export interface PublicUser {
  id: string;
  name: string;
  email: string;
  createdAt: number;
}

export interface RoleSummary {
  id: string;
  title: string;
  description: string;
}

export interface LearnerProfile {
  goal: string;
  roleId: string | null;
  targetDuration: string | null;
  currentSkills: string[];
  studyTimePerDay: number | null;
  learningPreferences: string[];
  experienceLevel: string | null;
}

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface AssessmentQuestion {
  id: string;
  skill: string;
  topic?: string;
  difficulty: Difficulty;
  question: string;
  options: string[];
}

export interface StartAssessmentResponse {
  sessionId: string;
  totalSkills: number;
  skills: string[];
  next: {
    question: AssessmentQuestion;
    skillsRemaining: number;
    totalSkills: number;
  } | null;
}

export interface NextQuestionResponse {
  done: boolean;
  question?: AssessmentQuestion;
  skillsRemaining?: number;
  totalSkills?: number;
}

export interface SubmitAnswerResponse {
  correct: boolean;
  correctAnswer: number;
  explanation: string;
  skillFinished: boolean;
}

export type MasteryLabel = 'Beginner' | 'Developing' | 'Intermediate' | 'Advanced';

export interface SkillResult {
  skill: string;
  masteryScore: number;
  masteryLabel: MasteryLabel;
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

export interface ProjectRecommendation {
  title: string;
  description: string;
  skill: string;
  difficulty: Difficulty;
  appliesSkills: string[];
}

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

export const LEARNING_PREFERENCE_OPTIONS = [
  { tag: 'video', label: 'Videos' },
  { tag: 'interactive', label: 'Interactive / hands-on' },
  { tag: 'reading', label: 'Reading / docs' },
] as const;

// ---- AI / NLP layer ----

export type AISource = 'ai' | 'fallback';

export interface AIResult<T> {
  data: T;
  source: AISource;
  notice?: string;
}

export interface AIStatus {
  configured: boolean;
  provider: string;
  model: string | null;
}

export interface CoachMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ---- Persistent learner state (mastery, question/assessment history, module progress) ----

export type AssessmentType = 'INITIAL_DIAGNOSTIC' | 'MODULE_ASSESSMENT' | 'REASSESSMENT' | 'PRACTICE_CHECK' | 'FINAL_ASSESSMENT';
export type AssessmentRecordStatus = 'in_progress' | 'completed' | 'abandoned';

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
  assessmentId: string;
  learnerId: string;
  type: AssessmentType;
  roleId: string;
  skill: string | null;
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
  current: number;
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

export interface LearnerStateResponse {
  learnerId: string;
  roleId: string | null;
  mastery: SkillMasteryRecord[];
  moduleProgress: Record<string, ModuleProgressRecord>;
  nextBestAction: NextBestAction | null;
}

export interface GoalSummary {
  roleId: string;
  roleTitle: string;
  progressPercent: number;
  createdAt: number;
  lastActiveAt: number;
  isActive: boolean;
}

export interface StartModuleAssessmentResponse {
  sessionId: string;
  type: AssessmentType;
  attemptNumber?: number;
  totalQuestions: number;
  next: {
    question: AssessmentQuestion;
    skillsRemaining: number;
    totalSkills: number;
  } | null;
}

export interface AssessmentCompletion {
  record: AssessmentRecord;
  masteryUpdate: SkillMasteryRecord | null;
  passed: boolean | null;
  weakTopics: string[];
}

export interface SubmitAnswerResponseExtended extends SubmitAnswerResponse {
  assessmentComplete?: AssessmentCompletion;
}
