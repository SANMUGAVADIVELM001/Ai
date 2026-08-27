import projectsData from '../data/projects.json' with { type: 'json' };
import { ROADMAP_CONFIG } from '../config.js';
import { buildPrerequisiteGraph } from './prerequisiteEngine.js';
import { recommendResourcesForSkill } from './recommendationEngine.js';
import type {
  LearnerProfile,
  ProjectRecommendation,
  Roadmap,
  RoadmapMilestone,
  SkillAnalysisResult,
  SkillGap,
} from '../types/index.js';

const projects = projectsData as ProjectRecommendation[];

function projectForSkill(skill: string): ProjectRecommendation | null {
  return projects.find((p) => p.skill === skill) ?? null;
}

function estimateWeeks(gap: SkillGap, studyTimePerDayHours: number): number {
  if (gap.sufficient) return 0;
  const estimatedHours = gap.gap / ROADMAP_CONFIG.masteryPointsPerHour;
  const estimatedDays = estimatedHours / studyTimePerDayHours;
  const estimatedWeeks = Math.ceil(estimatedDays / ROADMAP_CONFIG.daysPerWeekAssumed);
  return Math.max(ROADMAP_CONFIG.minWeeksPerMilestone, estimatedWeeks);
}

function buildWhyRecommended(
  gap: SkillGap,
  prereqStatus: RoadmapMilestone['prerequisiteStatus'],
  unsatisfiedPrerequisites: string[]
): string {
  if (gap.sufficient) {
    return `You already meet the target mastery for ${gap.skill} (${gap.current}% ≥ ${gap.required}%) — this is a verified milestone. Light reinforcement resources are suggested instead of starting from scratch.`;
  }

  if (prereqStatus === 'satisfied') {
    const priorityText = gap.priority === 'high' ? 'a high-priority gap' : gap.priority === 'medium' ? 'a medium-priority gap' : 'a lower-priority gap';
    return `${gap.skill} is ${priorityText} (${gap.gap} points below your target of ${gap.required}%), and its prerequisites are already sufficient — this is a good next step.`;
  }

  const missing = unsatisfiedPrerequisites.join(', ');
  return `${gap.skill} requires stronger ${missing} first. It will unlock once ${unsatisfiedPrerequisites.length > 1 ? 'those reach' : 'that reaches'} their target mastery.`;
}

export function generateRoadmap(analysis: SkillAnalysisResult, profile: LearnerProfile): Roadmap {
  const prereqGraph = buildPrerequisiteGraph(analysis);
  const gapBySkill = new Map(analysis.gaps.map((g) => [g.skill, g]));
  const studyTimePerDayHours = profile.studyTimePerDay ?? ROADMAP_CONFIG.defaultStudyTimePerDayHours;

  const milestones: RoadmapMilestone[] = prereqGraph.nodes.map((node, idx) => {
    const gap = gapBySkill.get(node.skill);
    if (!gap) throw new Error(`No skill gap data for ${node.skill}`);

    const isVerifiedSufficient = gap.sufficient;
    const status: RoadmapMilestone['status'] = isVerifiedSufficient
      ? 'completed'
      : node.availability === 'available'
        ? 'available'
        : 'locked';

    const resources = recommendResourcesForSkill(node.skill, analysis, prereqGraph, profile);

    return {
      id: `${analysis.roleId}-${node.skill.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      skill: node.skill,
      status,
      priority: gap.priority,
      currentMastery: gap.current,
      targetMastery: gap.required,
      gap: gap.gap,
      estimatedWeeks: isVerifiedSufficient ? 0 : estimateWeeks(gap, studyTimePerDayHours),
      order: idx,
      prerequisiteStatus: node.prerequisiteStatus,
      unsatisfiedPrerequisites: node.unsatisfiedPrerequisites,
      isVerifiedSufficient,
      resources,
      project: isVerifiedSufficient ? null : projectForSkill(node.skill),
      whyRecommended: buildWhyRecommended(gap, node.prerequisiteStatus, node.unsatisfiedPrerequisites),
    };
  });

  const totalEstimatedWeeks = milestones.reduce((sum, m) => sum + m.estimatedWeeks, 0);
  const completed = milestones.filter((m) => m.status === 'completed').length;

  return {
    roleId: analysis.roleId,
    roleTitle: analysis.roleTitle,
    generatedAt: Date.now(),
    totalEstimatedWeeks,
    studyTimePerDayHours,
    targetDuration: profile.targetDuration,
    milestones,
    progress: {
      completed,
      total: milestones.length,
      percentComplete: milestones.length === 0 ? 0 : Math.round((completed / milestones.length) * 100),
    },
  };
}
