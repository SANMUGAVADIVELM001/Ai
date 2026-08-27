import rolesData from '../data/roles.json' with { type: 'json' };
import type { LearnerProfile, Role } from '../types/index.js';

const roles = rolesData as Role[];

const KNOWN_SKILLS = Array.from(
  new Set(roles.flatMap((r) => r.skills.map((s) => s.skill)))
);

/**
 * Extracts a structured learner profile from a free-text goal statement.
 * Deterministic keyword/regex parsing — no external AI API required.
 * This is the seam where a future LLMService could replace the parsing logic.
 */
export function parseGoalText(goalText: string): LearnerProfile {
  const text = goalText.toLowerCase();

  const roleId = matchRoleFromText(text);

  const targetDuration = extractDuration(text);
  const studyTimePerDay = extractStudyHours(text);
  const currentSkills = extractSkills(text);

  return {
    goal: goalText.trim(),
    roleId,
    targetDuration,
    currentSkills,
    studyTimePerDay,
    learningPreferences: [],
    experienceLevel: null, // determined later by the diagnostic assessment
  };
}

export function matchRoleFromText(text: string): string | null {
  const lower = text.toLowerCase();
  const roleAliases: Record<string, string[]> = {
    'ml-engineer': ['machine learning engineer', 'ml engineer', 'machine learning'],
    'data-scientist': ['data scientist', 'data science'],
    'fullstack-developer': ['full stack developer', 'fullstack developer', 'full-stack developer', 'web developer'],
    'cloud-engineer': ['cloud engineer', 'devops engineer', 'cloud architect'],
    'data-analyst': ['data analyst', 'business analyst'],
  };

  for (const [roleId, aliases] of Object.entries(roleAliases)) {
    if (aliases.some((alias) => lower.includes(alias))) {
      return roleId;
    }
  }
  return null;
}

function extractDuration(text: string): string | null {
  const match = text.match(/(\d+)\s*(month|months|week|weeks|year|years)/);
  if (!match) return null;
  const [, num, unit] = match;
  const normalizedUnit = unit.startsWith('month') ? 'month' : unit.startsWith('week') ? 'week' : 'year';
  const plural = Number(num) === 1 ? '' : 's';
  return `${num} ${normalizedUnit}${plural}`;
}

function extractStudyHours(text: string): number | null {
  const match = text.match(/(\d+(?:\.\d+)?)\s*(hour|hours|hr|hrs)/);
  if (!match) return null;
  return parseFloat(match[1]);
}

function extractSkills(text: string): string[] {
  const found = new Set<string>();
  for (const skill of KNOWN_SKILLS) {
    const skillLower = skill.toLowerCase();
    if (text.includes(skillLower)) {
      found.add(skill);
    }
  }
  return Array.from(found);
}

export function getRoles(): Role[] {
  return roles;
}

export function getRoleById(roleId: string): Role | undefined {
  return roles.find((r) => r.id === roleId);
}
