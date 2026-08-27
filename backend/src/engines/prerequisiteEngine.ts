import { getRoleById } from './profileEngine.js';
import type {
  PrerequisiteGraphResult,
  PrerequisiteStatus,
  PriorityLevel,
  SkillAnalysisResult,
  SkillGap,
  SkillPrerequisiteInfo,
} from '../types/index.js';

function prerequisiteStatusFor(prerequisites: string[], gapBySkill: Map<string, SkillGap>): {
  status: PrerequisiteStatus;
  unsatisfied: string[];
} {
  if (prerequisites.length === 0) {
    return { status: 'satisfied', unsatisfied: [] };
  }

  const unsatisfied = prerequisites.filter((p) => !(gapBySkill.get(p)?.sufficient ?? false));
  if (unsatisfied.length === 0) return { status: 'satisfied', unsatisfied: [] };
  if (unsatisfied.length === prerequisites.length) return { status: 'missing', unsatisfied };
  return { status: 'partial', unsatisfied };
}

/**
 * Topologically sorts `skills` respecting `prereqsBySkill` edges (restricted
 * to skills within the same set — external prereq names are ignored since
 * they can't be scheduled here). At each step, all currently-unblocked
 * skills ("ready") are ordered by an optional priority comparator before the
 * next one is picked, so higher-priority gaps surface earlier within
 * whatever the dependency graph allows. Falls back to input order for any
 * skill left over if a cycle is detected (defensive only — curated data
 * shouldn't produce cycles).
 */
export function topoSortWithPriority(
  skills: string[],
  prereqsBySkill: Map<string, string[]>,
  compareReady?: (a: string, b: string) => number
): string[] {
  const inSkillSet = new Set(skills);
  const remainingPrereqs = new Map<string, Set<string>>();
  for (const skill of skills) {
    const prereqs = (prereqsBySkill.get(skill) ?? []).filter((p) => inSkillSet.has(p));
    remainingPrereqs.set(skill, new Set(prereqs));
  }

  const result: string[] = [];
  const done = new Set<string>();

  while (result.length < skills.length) {
    const ready = skills.filter((s) => !done.has(s) && [...remainingPrereqs.get(s)!].every((p) => done.has(p)));

    if (ready.length === 0) {
      // Cycle (or bug in curated data) — dump remaining skills in input order.
      for (const s of skills) {
        if (!done.has(s)) {
          result.push(s);
          done.add(s);
        }
      }
      break;
    }

    ready.sort((a, b) => {
      if (compareReady) {
        const cmp = compareReady(a, b);
        if (cmp !== 0) return cmp;
      }
      return skills.indexOf(a) - skills.indexOf(b);
    });

    const next = ready[0];
    result.push(next);
    done.add(next);
  }

  return result;
}

const PRIORITY_RANK: Record<PriorityLevel, number> = { high: 0, medium: 1, low: 2 };

export function buildPrerequisiteGraph(analysis: SkillAnalysisResult): PrerequisiteGraphResult {
  const role = getRoleById(analysis.roleId);
  if (!role) throw new Error(`Unknown role: ${analysis.roleId}`);

  const gapBySkill = new Map(analysis.gaps.map((g) => [g.skill, g]));
  const prereqsBySkill = new Map(role.skills.map((s) => [s.skill, s.prerequisites]));
  const skillOrder = role.skills.map((s) => s.skill);

  const order = topoSortWithPriority(skillOrder, prereqsBySkill, (a, b) => {
    const gapA = gapBySkill.get(a);
    const gapB = gapBySkill.get(b);
    // Already-sufficient skills don't need to be prioritized early.
    const rankA = gapA?.sufficient ? 3 : PRIORITY_RANK[gapA?.priority ?? 'low'];
    const rankB = gapB?.sufficient ? 3 : PRIORITY_RANK[gapB?.priority ?? 'low'];
    return rankA - rankB;
  });

  const nodes: SkillPrerequisiteInfo[] = order.map((skill, idx) => {
    const prerequisites = prereqsBySkill.get(skill) ?? [];
    const { status, unsatisfied } = prerequisiteStatusFor(prerequisites, gapBySkill);
    const sufficient = gapBySkill.get(skill)?.sufficient ?? false;

    return {
      skill,
      prerequisites,
      prerequisiteStatus: status,
      unsatisfiedPrerequisites: unsatisfied,
      availability: status === 'satisfied' || sufficient ? 'available' : 'locked',
      topologicalOrder: idx,
    };
  });

  return { roleId: role.id, nodes };
}
