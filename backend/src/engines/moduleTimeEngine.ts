import resourcesData from '../data/resources.json' with { type: 'json' };
import { ROADMAP_CONFIG } from '../config.js';
import type { PlanOptionsResult, Resource, SkillAnalysisResult, SkillGap } from '../types/index.js';

const resources = resourcesData as Resource[];

// Memoized per skill: baseline hours are a pure function of the static
// resources.json data, so there is no reason to recompute the sum on every
// call within a process lifetime.
const baselineHoursBySkill = new Map<string, number>();

/**
 * A module's baseline hours approximate "time to complete the resources this
 * learner will actually be shown" (resourcesPerMilestone of them), derived
 * directly from resources.json's real per-item durationMinutes rather than a
 * hand-authored estimate — so it changes automatically as the resource
 * library grows and never drifts out of sync with a second data source.
 */
export function computeBaselineHours(skill: string): number {
  const cached = baselineHoursBySkill.get(skill);
  if (cached !== undefined) return cached;

  const totalMinutes = resources.filter((r) => r.skill === skill).reduce((sum, r) => sum + r.durationMinutes, 0);
  const hours =
    totalMinutes > 0
      ? Math.round((totalMinutes / ROADMAP_CONFIG.resourcesPerMilestone / 60) * 10) / 10
      : ROADMAP_CONFIG.fallbackBaselineHours;

  baselineHoursBySkill.set(skill, hours);
  return hours;
}

/**
 * Hours still needed for one module, scaled by how much of the *target*
 * mastery is still missing (gap.gap / gap.required) against that module's
 * own baseline — a learner 90% of the way to target is charged ~10% of
 * baseline hours; a rank beginner on a high-target skill is charged close to
 * the full baseline. Zero for an already-sufficient skill.
 */
export function estimateModuleHours(gap: SkillGap, baselineHours: number): number {
  if (gap.sufficient) return 0;
  const remainingFraction = gap.gap / Math.max(gap.required, 1);
  const rawHours = Math.round(baselineHours * remainingFraction * 10) / 10;
  return Math.max(rawHours, ROADMAP_CONFIG.minHoursPerModule);
}

export function computeTotalHoursNeeded(analysis: SkillAnalysisResult): number {
  const total = analysis.gaps.reduce((sum, gap) => sum + estimateModuleHours(gap, computeBaselineHours(gap.skill)), 0);
  return Math.round(total * 10) / 10;
}

/**
 * Given the total hours the roadmap requires and how many days the learner
 * says they have, determines whether that timeline is feasible at a sane
 * daily-hours cap. When it isn't, returns both a "recommended" (longer,
 * capped-hours) option and an "accelerated" (learner's requested days,
 * however many hours/day that actually takes — shown plainly, never
 * silently re-capped) option for the learner to choose between.
 */
export function planOptionsFor(totalHoursNeeded: number, availableDays: number): PlanOptionsResult {
  const minFeasibleDays = Math.max(1, Math.ceil(totalHoursNeeded / ROADMAP_CONFIG.maxStudyHoursPerDayCap));

  if (availableDays >= minFeasibleDays) {
    const studyHoursPerDay = Math.max(ROADMAP_CONFIG.minStudyHoursPerDayFloor, totalHoursNeeded / availableDays);
    return {
      feasible: true,
      studyHoursPerDay: Math.round(studyHoursPerDay * 100) / 100,
      totalHoursNeeded: Math.round(totalHoursNeeded * 10) / 10,
      availableDays,
    };
  }

  const acceleratedHoursPerDay = totalHoursNeeded / availableDays;
  return {
    feasible: false,
    requestedDays: availableDays,
    recommended: { days: minFeasibleDays, hoursPerDay: ROADMAP_CONFIG.maxStudyHoursPerDayCap },
    accelerated: { days: availableDays, hoursPerDay: Math.round(acceleratedHoursPerDay * 100) / 100 },
    totalHoursNeeded: Math.round(totalHoursNeeded * 10) / 10,
    reason: `Your goal needs about ${Math.round(totalHoursNeeded * 10) / 10} hours of focused study. Fitting that into ${availableDays} day(s) would require ${Math.round(acceleratedHoursPerDay * 10) / 10}h/day, which is above a sustainable pace. The recommended timeline spreads it out at up to ${ROADMAP_CONFIG.maxStudyHoursPerDayCap}h/day instead.`,
  };
}
