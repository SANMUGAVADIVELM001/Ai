import { AI_CONFIG, isAiConfigured } from '../config.js';
import { buildGoalProfilePrompt } from '../prompts/goalProfilePrompt.js';
import { buildAssessmentQuestionPrompt } from '../prompts/assessmentQuestionPrompt.js';
import { buildSkillGapPrompt } from '../prompts/skillGapPrompt.js';
import { buildRecommendationExplanationPrompt } from '../prompts/recommendationExplanationPrompt.js';
import { buildRoadmapExplanationPrompt } from '../prompts/roadmapExplanationPrompt.js';
import { buildCoachSystemPrompt, formatCoachHistory } from '../prompts/coachPrompt.js';
import { callGemini, parseJsonResponse, AIProviderError } from './geminiClient.js';
import { isValidExtractedGoalProfile, isValidGeneratedQuestion } from './validators.js';
import { withCache } from './aiCache.js';
import type {
  AIResult,
  CoachMessage,
  Difficulty,
  ExtractedGoalProfile,
  GeneratedQuestion,
  LearnerContext,
  Roadmap,
  RoadmapMilestone,
  ScoredResource,
  SkillAnalysisResult,
} from '../types/index.js';

const FALLBACK_NOTICE = 'AI service temporarily unavailable. Showing a personalized recommendation based on your learning profile.';

/**
 * AIService is the abstraction boundary for anything "AI-generated" in this
 * app. MockAIService is fully deterministic and needs no external API/key.
 * LLMService calls a real provider (Gemini) with retry + fallback baked in,
 * so callers never see a raw provider error — they get a usable
 * AIResult<T> either way, tagged with where it came from.
 */
export interface AIService {
  explainSkillAnalysis(analysis: SkillAnalysisResult): Promise<AIResult<string>>;
  explainRecommendation(milestone: RoadmapMilestone, resource: ScoredResource): Promise<AIResult<string>>;
  explainRoadmap(roadmap: Roadmap): Promise<AIResult<string>>;
  extractGoalProfile(goalText: string): Promise<AIResult<ExtractedGoalProfile>>;
  generateAssessmentQuestion(skill: string, difficulty: Difficulty, avoidQuestions: string[]): Promise<AIResult<GeneratedQuestion | null>>;
  chatWithLearner(context: LearnerContext, history: CoachMessage[], message: string): Promise<AIResult<string>>;
}

function deterministicGoalProfile(): ExtractedGoalProfile {
  // Deterministic parsing already happens in profileEngine.parseGoalText;
  // this is only reached if the LLM is unavailable and a caller asks the
  // AIService directly rather than going through /api/profile/parse-goal.
  return {
    goal: null,
    timelineMonths: null,
    currentSkills: [],
    studyHoursPerDay: null,
    learningPreferences: [],
    experienceLevel: null,
  };
}

function deterministicRecommendationExplanation(milestone: RoadmapMilestone, resource: ScoredResource): string {
  return `${resource.resource.title} is recommended for ${milestone.skill} (currently ${milestone.currentMastery}%, target ${milestone.targetMastery}%). It scored ${resource.score}/100 based on your skill gap, prerequisite status, and study preferences.`;
}

function deterministicRoadmapExplanation(roadmap: Roadmap): string {
  const first = roadmap.milestones.find((m) => m.status !== 'locked' && !m.isVerifiedSufficient);
  const skipped = roadmap.milestones.filter((m) => m.isVerifiedSufficient).map((m) => m.skill);
  const parts = [`Your roadmap for ${roadmap.roleTitle} has ${roadmap.milestones.length} milestones, estimated at ${roadmap.totalEstimatedDays} days total (${roadmap.totalEstimatedHours}h at ${roadmap.studyTimePerDayHours}h/day).`];
  if (first) parts.push(`It starts with ${first.skill}, which your assessment identified as a priority gap.`);
  if (skipped.length > 0) parts.push(`${skipped.join(', ')} ${skipped.length === 1 ? 'is' : 'are'} already sufficient, so those milestones are shortened to a quick review.`);
  return parts.join(' ');
}

function deterministicCoachReply(context: LearnerContext): string {
  const gap = context.highPriorityGaps[0];
  if (gap) {
    const skill = context.skills.find((s) => s.name === gap);
    return `I can't reach the AI service right now, but based on your assessment: ${gap} is your highest-priority gap${skill ? ` (${skill.mastery}% vs ${skill.required}% required)` : ''}. That's a good focus for your next study session.`;
  }
  return "I can't reach the AI service right now, but your assessment doesn't show any high-priority gaps at the moment — steady progress on your current milestone is a good bet.";
}

async function withFallback<T>(compute: () => Promise<T>, fallback: () => T): Promise<AIResult<T>> {
  if (!isAiConfigured()) {
    return { data: fallback(), source: 'fallback' };
  }

  let lastError: unknown;
  for (let attempt = 0; attempt <= AI_CONFIG.maxRetries; attempt++) {
    try {
      const data = await compute();
      return { data, source: 'ai' };
    } catch (err) {
      lastError = err;
    }
  }

  console.error('[aiService] falling back after AI failure:', lastError instanceof Error ? lastError.message : lastError);
  return { data: fallback(), source: 'fallback', notice: FALLBACK_NOTICE };
}

class MockAIService implements AIService {
  async explainSkillAnalysis(analysis: SkillAnalysisResult): Promise<AIResult<string>> {
    return { data: analysis.aiExplanation, source: 'fallback' };
  }

  async explainRecommendation(milestone: RoadmapMilestone, resource: ScoredResource): Promise<AIResult<string>> {
    return { data: deterministicRecommendationExplanation(milestone, resource), source: 'fallback' };
  }

  async explainRoadmap(roadmap: Roadmap): Promise<AIResult<string>> {
    return { data: deterministicRoadmapExplanation(roadmap), source: 'fallback' };
  }

  async extractGoalProfile(): Promise<AIResult<ExtractedGoalProfile>> {
    return { data: deterministicGoalProfile(), source: 'fallback' };
  }

  async generateAssessmentQuestion(): Promise<AIResult<GeneratedQuestion | null>> {
    return { data: null, source: 'fallback' };
  }

  async chatWithLearner(context: LearnerContext): Promise<AIResult<string>> {
    return { data: deterministicCoachReply(context), source: 'fallback' };
  }
}

class LLMService implements AIService {
  async explainSkillAnalysis(analysis: SkillAnalysisResult): Promise<AIResult<string>> {
    return withFallback(
      () =>
        withCache(`skillGap:${analysis.roleId}:${JSON.stringify(analysis.gaps)}`, async () => {
          const text = await callGemini(buildSkillGapPrompt(analysis));
          return text.trim();
        }),
      () => analysis.aiExplanation
    );
  }

  async explainRecommendation(milestone: RoadmapMilestone, resource: ScoredResource): Promise<AIResult<string>> {
    return withFallback(
      () =>
        withCache(`recExplain:${milestone.id}:${resource.resource.id}:${resource.score}`, async () => {
          const text = await callGemini(buildRecommendationExplanationPrompt(milestone, resource));
          return text.trim();
        }),
      () => deterministicRecommendationExplanation(milestone, resource)
    );
  }

  async explainRoadmap(roadmap: Roadmap): Promise<AIResult<string>> {
    return withFallback(
      () =>
        withCache(`roadmapExplain:${roadmap.roleId}:${roadmap.generatedAt}`, async () => {
          const text = await callGemini(buildRoadmapExplanationPrompt(roadmap));
          return text.trim();
        }),
      () => deterministicRoadmapExplanation(roadmap)
    );
  }

  async extractGoalProfile(goalText: string): Promise<AIResult<ExtractedGoalProfile>> {
    return withFallback(
      () =>
        withCache(`goalProfile:${goalText}`, async () => {
          const raw = await callGemini(buildGoalProfilePrompt(goalText), { jsonMode: true });
          const parsed = parseJsonResponse<unknown>(raw);
          if (!isValidExtractedGoalProfile(parsed)) {
            throw new AIProviderError('Gemini goal profile response failed validation');
          }
          // Defensive: never trust an AI-provided experienceLevel — that must
          // only ever be set by the diagnostic assessment engine.
          return { ...parsed, experienceLevel: null };
        }),
      deterministicGoalProfile
    );
  }

  async generateAssessmentQuestion(skill: string, difficulty: Difficulty, avoidQuestions: string[]): Promise<AIResult<GeneratedQuestion | null>> {
    return withFallback(
      async () => {
        const raw = await callGemini(buildAssessmentQuestionPrompt(skill, difficulty, avoidQuestions), { jsonMode: true });
        const parsed = parseJsonResponse<unknown>(raw);
        if (!isValidGeneratedQuestion(parsed, skill, difficulty)) {
          throw new AIProviderError('Gemini question response failed validation');
        }
        return parsed;
      },
      () => null
    );
  }

  async chatWithLearner(context: LearnerContext, history: CoachMessage[], message: string): Promise<AIResult<string>> {
    return withFallback(async () => {
      const systemPrompt = buildCoachSystemPrompt(context);
      const historyText = formatCoachHistory(history);
      const prompt = `${systemPrompt}\n\nConversation so far:\n${historyText || '(none yet)'}\n\nLearner: ${message}\nPathPilot:`;
      const text = await callGemini(prompt);
      return text.trim();
    }, () => deterministicCoachReply(context));
  }
}

export const aiService: AIService = isAiConfigured() ? new LLMService() : new MockAIService();
export const mockAiService: AIService = new MockAIService();
