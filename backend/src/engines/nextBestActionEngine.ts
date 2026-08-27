import { getModuleState } from './moduleAssessmentEngine.js';
import { SUFFICIENCY_MARGIN } from '../config.js';
import type { ModuleProgressRecord, NextBestAction, Roadmap } from '../types/index.js';

function actionFor(
  kind: NextBestAction['kind'],
  moduleId: string | null,
  skill: string | null,
  label: string,
  description: string,
  ctaLabel: string,
  ctaTo: string
): NextBestAction {
  return { kind, moduleId, skill, label, description, ctaLabel, ctaTo };
}

/**
 * Determines exactly one recommended next action, in the priority order
 * specified by the product spec:
 * 1. pending (in-progress) assessment
 * 2. in-progress module (learning started, not yet assessed)
 * 3. remedial learning after a failed assessment
 * 4. an available high-priority skill gap
 * 5. a newly-unlocked module (available, not started)
 * 6. practice / reinforcement on an already-passed module below target
 * 7. a project tied to an available/in-progress milestone
 * 8. capstone (everything else complete)
 */
export function computeNextBestAction(
  learnerId: string,
  roleId: string,
  roadmap: Roadmap,
  moduleProgressAll: Record<string, ModuleProgressRecord>
): NextBestAction | null {
  const withProgress = roadmap.milestones.map((m) => ({
    milestone: m,
    progress: moduleProgressAll[m.id] ?? getModuleState(learnerId, roleId, m.id, m.skill),
  }));

  // 1. Pending assessment.
  const assessmentReady = withProgress.find((x) => x.progress.phase === 'assessment_ready');
  if (assessmentReady) {
    return actionFor(
      'pending_assessment',
      assessmentReady.milestone.id,
      assessmentReady.milestone.skill,
      `Take ${assessmentReady.milestone.skill} Assessment`,
      `You've completed learning for ${assessmentReady.milestone.skill} — take the module assessment to unlock what's next.`,
      'Start Assessment',
      `/roadmap/${assessmentReady.milestone.id}`
    );
  }

  // 2. In-progress module.
  const inProgress = withProgress.find((x) => x.progress.phase === 'learning');
  if (inProgress) {
    return actionFor(
      'in_progress_module',
      inProgress.milestone.id,
      inProgress.milestone.skill,
      `Continue ${inProgress.milestone.skill}`,
      `You're partway through ${inProgress.milestone.skill} — keep going.`,
      'Continue Learning',
      `/roadmap/${inProgress.milestone.id}`
    );
  }

  // 3. Remedial.
  const remedial = withProgress.find((x) => x.progress.phase === 'remedial');
  if (remedial) {
    return actionFor(
      'remedial',
      remedial.milestone.id,
      remedial.milestone.skill,
      `Review ${remedial.milestone.skill}`,
      `Your latest ${remedial.milestone.skill} assessment scored ${remedial.progress.lastScore ?? '?'}%. Review the weak topics before reassessing.`,
      'Start Review',
      `/roadmap/${remedial.milestone.id}`
    );
  }

  // 4. Available high-priority gap, not yet started.
  const highPriorityGap = withProgress.find(
    (x) => x.milestone.status === 'available' && x.milestone.priority === 'high' && x.progress.phase === 'not_started'
  );
  if (highPriorityGap) {
    return actionFor(
      'high_priority_gap',
      highPriorityGap.milestone.id,
      highPriorityGap.milestone.skill,
      highPriorityGap.milestone.skill,
      `${highPriorityGap.milestone.skill} is a high-priority gap toward your goal and is ready to start.`,
      'Start Learning',
      `/roadmap/${highPriorityGap.milestone.id}`
    );
  }

  // 5. Any other newly-unlocked module.
  const unlocked = withProgress.find((x) => x.milestone.status === 'available' && x.progress.phase === 'not_started');
  if (unlocked) {
    return actionFor(
      'newly_unlocked_module',
      unlocked.milestone.id,
      unlocked.milestone.skill,
      unlocked.milestone.skill,
      `${unlocked.milestone.skill} is now available.`,
      'Start Learning',
      `/roadmap/${unlocked.milestone.id}`
    );
  }

  // 6. Practice/reinforcement on a passed module still below target.
  const needsPractice = withProgress.find(
    (x) => x.progress.phase === 'passed' && x.milestone.currentMastery < x.milestone.targetMastery - SUFFICIENCY_MARGIN
  );
  if (needsPractice) {
    return actionFor(
      'practice',
      needsPractice.milestone.id,
      needsPractice.milestone.skill,
      `Practice ${needsPractice.milestone.skill}`,
      `You've passed ${needsPractice.milestone.skill}, and a bit more practice will push you closer to your target mastery.`,
      'Practice',
      `/roadmap/${needsPractice.milestone.id}`
    );
  }

  // 7. Project tied to an available/in-progress milestone.
  const withProject = withProgress.find(
    (x) => x.milestone.project && (x.milestone.status === 'available' || x.milestone.status === 'in_progress')
  );
  if (withProject?.milestone.project) {
    return actionFor(
      'project',
      withProject.milestone.id,
      withProject.milestone.skill,
      withProject.milestone.project.title,
      `Apply ${withProject.milestone.skill} with a hands-on project.`,
      'View Project',
      `/projects`
    );
  }

  // 8. Capstone — everything else is complete.
  if (roadmap.progress.completed === roadmap.progress.total && roadmap.progress.total > 0) {
    return actionFor(
      'capstone',
      null,
      null,
      'Capstone',
      `You've completed every milestone toward ${roadmap.roleTitle}. Consider a capstone project to showcase your skills.`,
      'View Projects',
      `/projects`
    );
  }

  return null;
}
