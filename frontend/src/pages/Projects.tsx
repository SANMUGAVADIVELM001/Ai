import { Link } from 'react-router-dom';
import { Rocket, Lock, LockOpen, CirclePlay, CircleCheck, type LucideIcon } from 'lucide-react';
import EmptyState from '../components/EmptyState.js';
import LockedNotice from '../components/LockedNotice.js';
import { useLearner } from '../context/LearnerContext.js';
import { useEnsureRoadmap } from '../hooks/useEnsureData.js';
import type { MilestoneStatus, RoadmapMilestone } from '../types.js';

const DIFFICULTY_ORDER = ['easy', 'medium', 'hard'] as const;
const DIFFICULTY_LABEL: Record<string, string> = { easy: 'Beginner', medium: 'Intermediate', hard: 'Advanced' };

const STATUS_BADGE: Record<MilestoneStatus, { icon: LucideIcon; label: string; cls: string }> = {
  locked: { icon: Lock, label: 'Locked', cls: 'text-locked bg-surface-secondary border-line' },
  available: { icon: LockOpen, label: 'Available', cls: 'text-brand-500 bg-white border-brand-300' },
  in_progress: { icon: CirclePlay, label: 'In Progress', cls: 'text-brand-600 bg-brand-50 border-brand-200' },
  completed: { icon: CircleCheck, label: 'Suitable for current level', cls: 'text-success bg-success-bg border-success/30' },
};

export default function Projects() {
  const { effectiveStatus } = useLearner();
  const { roadmap, loading, needsAnalysis } = useEnsureRoadmap();

  if (loading) return <p className="text-ink-secondary">Loading projects...</p>;

  if (needsAnalysis || !roadmap) {
    return (
      <EmptyState
        icon={Rocket}
        title="No projects yet"
        body="Projects are personalized from your roadmap. Complete the initial assessment to unlock project suggestions."
        ctaLabel="Take the Assessment"
        ctaTo="/assessment"
      />
    );
  }

  const withProjects = roadmap.milestones
    .filter((m): m is RoadmapMilestone & { project: NonNullable<RoadmapMilestone['project']> } => m.project !== null)
    .map((m) => ({ milestone: m, status: effectiveStatus(m.id, m.status) }));

  if (withProjects.length === 0) {
    return (
      <EmptyState
        icon={Rocket}
        title="No projects available for this roadmap yet"
        body="We don't have a curated project for any of your current roadmap skills yet."
      />
    );
  }

  const grouped = DIFFICULTY_ORDER.map((difficulty) => ({
    difficulty,
    items: withProjects.filter((w) => w.milestone.project.difficulty === difficulty),
  })).filter((g) => g.items.length > 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink mb-1">Projects</h1>
      <p className="text-ink-secondary mb-8">Personalized project ideas based on your current roadmap skills.</p>

      <div className="flex flex-col gap-8">
        {grouped.map((group) => (
          <section key={group.difficulty}>
            <h2 className="text-ink-secondary text-xs font-semibold tracking-wider mb-3">
              {DIFFICULTY_LABEL[group.difficulty].toUpperCase()}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {group.items.map(({ milestone, status }) => {
                const badge = STATUS_BADGE[status];
                const locked = status === 'locked';
                return (
                  <div key={milestone.id} className={`p-4 rounded-xl bg-white border border-line shadow-sm ${locked ? 'opacity-70' : ''}`}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-ink font-semibold text-sm">{milestone.project.title}</p>
                      <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border shrink-0 ${badge.cls}`}>
                        <badge.icon size={11} strokeWidth={1.75} aria-hidden="true" />
                        {status === 'completed' ? 'Ready' : badge.label}
                      </span>
                    </div>
                    <p className="text-ink-secondary text-xs mb-3">{milestone.project.description}</p>
                    <p className="text-ink-muted text-[11px] mb-3">Applies: {milestone.project.appliesSkills.join(', ')}</p>

                    {locked ? (
                      <LockedNotice
                        unsatisfiedPrerequisites={milestone.unsatisfiedPrerequisites}
                        linkTo={`/roadmap?milestone=${milestone.id}`}
                        linkLabel={`Complete ${milestone.skill} first`}
                      />
                    ) : (
                      <Link
                        to={`/roadmap?milestone=${milestone.id}`}
                        className="inline-block text-brand-500 hover:text-brand-600 text-xs font-medium transition-colors"
                      >
                        View in Roadmap →
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
