import type {
  AIResult,
  AIStatus,
  AssessmentRecord,
  AssessmentType,
  CoachMessage,
  LearnerProfile,
  LearnerStateResponse,
  ModuleProgressRecord,
  NextQuestionResponse,
  PublicUser,
  Resource,
  Roadmap,
  RoleSummary,
  ScoredResource,
  SkillAnalysisResult,
  SkillMasteryRecord,
  StartAssessmentResponse,
  StartModuleAssessmentResponse,
  SubmitAnswerResponseExtended,
} from './types.js';

const BASE = '/api';

// The authenticated user's id (returned by the backend on login/signup) IS
// the learnerId that the mastery/assessment persistence layer keys
// everything on — there is no separate client-generated learner identity
// once authentication is in place. Identity now flows entirely via the
// HTTP-only session cookie (never localStorage), so every request must
// include credentials.
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  getRoles: () => request<{ roles: RoleSummary[] }>('/profile/roles'),

  parseGoal: (goalText: string) =>
    request<{ profile: LearnerProfile }>('/profile/parse-goal', {
      method: 'POST',
      body: JSON.stringify({ goalText }),
    }),

  startAssessment: (roleId: string) =>
    request<StartAssessmentResponse>('/assessment/start', {
      method: 'POST',
      body: JSON.stringify({ roleId }),
    }),

  nextQuestion: (sessionId: string) => request<NextQuestionResponse>(`/assessment/${sessionId}/next`),

  submitAnswer: (sessionId: string, questionId: string, selectedOption: number) =>
    request<SubmitAnswerResponseExtended>(`/assessment/${sessionId}/answer`, {
      method: 'POST',
      body: JSON.stringify({ questionId, selectedOption }),
    }),

  getResult: (sessionId: string) => request<{ analysis: SkillAnalysisResult }>(`/assessment/${sessionId}/result`),

  generateRoadmap: (profile: LearnerProfile, opts: { sessionId?: string; roleId?: string }) =>
    request<{ roadmap: Roadmap }>('/roadmap/generate', {
      method: 'POST',
      body: JSON.stringify({ sessionId: opts.sessionId, roleId: opts.roleId, profile }),
    }),

  getResources: (skill?: string) =>
    request<{ resources: Resource[] }>(`/resources${skill ? `?skill=${encodeURIComponent(skill)}` : ''}`),

  getRecommendedResources: (skill: string, profile: LearnerProfile, opts: { sessionId?: string; roleId?: string }) =>
    request<{ resources: ScoredResource[] }>('/resources/recommended', {
      method: 'POST',
      body: JSON.stringify({ sessionId: opts.sessionId, roleId: opts.roleId, skill, profile }),
    }),

  getAiStatus: () => request<AIStatus>('/ai/status'),

  parseGoalAi: (goalText: string) =>
    request<{ profile: LearnerProfile; aiSource: 'ai' | 'fallback'; aiNotice?: string }>('/profile/parse-goal-ai', {
      method: 'POST',
      body: JSON.stringify({ goalText }),
    }),

  explainSkillGap: (opts: { sessionId?: string; roleId?: string }) =>
    request<AIResult<string>>('/ai/skill-gap-explanation', {
      method: 'POST',
      body: JSON.stringify({ sessionId: opts.sessionId, roleId: opts.roleId }),
    }),

  explainRecommendation: (profile: LearnerProfile, skill: string, resourceId: string, opts: { sessionId?: string; roleId?: string }) =>
    request<AIResult<string>>('/ai/recommendation-explanation', {
      method: 'POST',
      body: JSON.stringify({ sessionId: opts.sessionId, roleId: opts.roleId, profile, skill, resourceId }),
    }),

  explainRoadmap: (profile: LearnerProfile, opts: { sessionId?: string; roleId?: string }) =>
    request<AIResult<string>>('/ai/roadmap-explanation', {
      method: 'POST',
      body: JSON.stringify({ sessionId: opts.sessionId, roleId: opts.roleId, profile }),
    }),

  askCoach: (profile: LearnerProfile, history: CoachMessage[], message: string, opts: { sessionId?: string; roleId?: string }) =>
    request<AIResult<string>>('/ai/coach', {
      method: 'POST',
      body: JSON.stringify({ sessionId: opts.sessionId, roleId: opts.roleId, profile, history, message }),
    }),

  // ---- Persistent learner state ----

  getLearnerState: (profile: LearnerProfile | null) =>
    request<LearnerStateResponse>('/learner/me', {
      method: 'POST',
      body: JSON.stringify({ profile }),
    }),

  getAssessmentHistory: (filter?: { skill?: string; type?: AssessmentType }) => {
    const params = new URLSearchParams();
    if (filter?.skill) params.set('skill', filter.skill);
    if (filter?.type) params.set('type', filter.type);
    const qs = params.toString();
    return request<{ assessments: AssessmentRecord[] }>(`/learner/assessments${qs ? `?${qs}` : ''}`);
  },

  // ---- Module assessment flow ----

  getModuleState: (moduleId: string, skill: string) =>
    request<ModuleProgressRecord>(`/module/${moduleId}/state?skill=${encodeURIComponent(skill)}`),

  startModuleLearning: (moduleId: string, skill: string) =>
    request<ModuleProgressRecord>(`/module/${moduleId}/start-learning`, {
      method: 'POST',
      body: JSON.stringify({ skill }),
    }),

  markReadyForAssessment: (moduleId: string, skill: string) =>
    request<ModuleProgressRecord>(`/module/${moduleId}/ready-for-assessment`, {
      method: 'POST',
      body: JSON.stringify({ skill }),
    }),

  startModuleAssessment: (moduleId: string, skill: string, roleId: string) =>
    request<StartModuleAssessmentResponse>(`/module/${moduleId}/start-assessment`, {
      method: 'POST',
      body: JSON.stringify({ skill, roleId }),
    }),

  startPracticeCheck: (moduleId: string, skill: string, roleId: string, topics?: string[]) =>
    request<StartModuleAssessmentResponse>(`/module/${moduleId}/start-practice`, {
      method: 'POST',
      body: JSON.stringify({ skill, roleId, topics }),
    }),

  // ---- Dev-only demo controls (backend refuses these outside development) ----
  // The dev routes aren't behind requireAuth (they're a debug tool, not part
  // of the authenticated app surface), so they take learnerId explicitly —
  // callers pass the current user's id from AuthContext.

  devSimulateAttempt: (learnerId: string, roleId: string, skill: string, outcome: 'strong' | 'weak') =>
    request<{ mastery: SkillMasteryRecord; simulatedScore: number }>('/dev/simulate-attempt', {
      method: 'POST',
      body: JSON.stringify({ learnerId, roleId, skill, outcome }),
    }),

  devReset: (learnerId: string) =>
    request<{ reset: boolean }>('/dev/reset', {
      method: 'POST',
      body: JSON.stringify({ learnerId }),
    }),

  // ---- Auth ----

  signup: (name: string, email: string, password: string) =>
    request<{ user: PublicUser }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),

  login: (email: string, password: string) =>
    request<{ user: PublicUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  logout: () => request<{ loggedOut: boolean }>('/auth/logout', { method: 'POST' }),

  getMe: () => request<{ user: PublicUser }>('/auth/me'),
};
