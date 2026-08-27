import { Link } from 'react-router-dom';
import { TrendingUp, CircleCheck } from 'lucide-react';
import ProgressBar from '../components/ProgressBar.js';
import EmptyState from '../components/EmptyState.js';
import { useLearner } from '../context/LearnerContext.js';
import { useEnsureRoadmap, useEnsureLearnerState } from '../hooks/useEnsureData.js';

const MASTERY_COLORS: Record<string, string> = {
  Beginner: 'bg-error',
  Developing: 'bg-warning',
  Intermediate: 'bg-blue-500',
  Advanced: 'bg-success',
};

/**
 * Analytics/reporting view — "how am I doing overall" — distinct from Home
 * ("what do I do right now"). Achievements and activity are derived only
 * from real data already in context (analysis/roadmap/milestoneOverrides);
 * nothing here is fabricated history.
 */
export default function Dashboard() {
  const { milestoneOverrides, effectiveStatus } = useLearner();
  const { roadmap, loading, needsAnalysis } = useEnsureRoadmap();
  const { nextBestAction } = useEnsureLearnerState();

  if (loading) return <p className="text-ink-secondary">Loading dashboard...</p>;

  if (needsAnalysis || !roadmap) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="No dashboard data yet"
        body="Your dashboard fills in once you've completed the initial diagnostic assessment."
        ctaLabel="Take the Assessment"
        ctaTo="/assessment"
      />
    );
  }

  const withStatus = roadmap.milestones.map((m) => ({ ...m, status: effectiveStatus(m.id, m.status) }));

  const activity = Object.entries(milestoneOverrides)
    .filter(([, o]) => o.updatedAt > 0)
    .sort((a, b) => b[1].updatedAt - a[1].updatedAt)
    .slice(0, 5)
    .map(([milestoneId, o]) => {
      const milestone = roadmap.milestones.find((m) => m.id === milestoneId);
      return { skill: milestone?.skill ?? milestoneId, status: o.status, updatedAt: o.updatedAt };
    });

  const achievements: string[] = [];
  achievements.push('Diagnostic completed');
  if (roadmap.progress.completed > 0) achievements.push(`${roadmap.progress.completed} skill(s) already sufficient`);
  const firstCompleted = withStatus.find((m) => m.status === 'completed' && !m.isVerifiedSufficient);
  if (firstCompleted) achievements.push(`Completed milestone: ${firstCompleted.skill}`);

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink mb-1">Dashboard</h1>
      <p className="text-ink-secondary mb-8">
        Overall progress for <span className="text-ink">{roadmap.roleTitle}</span>
      </p>

      {nextBestAction && (
        <div className="p-5 rounded-xl bg-brand-50 border border-brand-200 mb-6">
          <p className="text-brand-600 text-xs font-semibold mb-2 tracking-wide">YOUR NEXT BEST ACTION</p>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-ink font-semibold">{nextBestAction.label}</p>
              <p className="text-ink-secondary text-sm mt-1">{nextBestAction.description}</p>
            </div>
            <Link
              to={nextBestAction.ctaTo}
              className="px-5 py-2.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors"
            >
              {nextBestAction.ctaLabel}
            </Link>
          </div>
        </div>
      )}

      <div className="p-5 rounded-xl bg-white border border-line shadow-sm mb-6">
        <div className="flex items-center justify-between mb-2 text-sm">
          <span className="text-ink-secondary font-medium">Overall Progress</span>
          <span className="text-ink-secondary">{roadmap.progress.percentComplete}% complete</span>
        </div>
        <ProgressBar value={roadmap.progress.percentComplete} colorClass="bg-success" />
        <p className="text-ink-muted text-xs mt-2">
          {roadmap.progress.completed} / {roadmap.progress.total} skills verified · Est. {roadmap.totalEstimatedWeeks} weeks remaining
        </p>
      </div>

      <section className="mb-8">
        <h2 className="text-ink font-semibold mb-4">Milestone Timeline</h2>
        <div className="flex flex-col gap-2">
          {withStatus.slice(0, 6).map((m) => (
            <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg bg-white border border-line shadow-sm">
              <span className="text-ink-secondary text-sm flex-1 truncate">{m.skill}</span>
              <div className="w-32 shrink-0">
                <ProgressBar value={m.currentMastery} colorClass={MASTERY_COLORS[m.status === 'completed' ? 'Advanced' : 'Developing']} />
              </div>
              <span className="text-ink-muted text-xs w-10 text-right shrink-0">{m.currentMastery}%</span>
            </div>
          ))}
        </div>
        <Link to="/roadmap" className="inline-block mt-3 text-brand-500 hover:text-brand-600 text-xs font-medium transition-colors">
          View full roadmap →
        </Link>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        <section>
          <h2 className="text-ink font-semibold mb-4">Recent Activity</h2>
          {activity.length === 0 ? (
            <p className="text-ink-muted text-sm">No activity yet — start a milestone from your Roadmap.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {activity.map((a, i) => (
                <li key={i} className="p-3 rounded-lg bg-white border border-line shadow-sm text-sm">
                  <span className="text-ink">{a.skill}</span>{' '}
                  <span className="text-ink-muted">marked {a.status === 'completed' ? 'complete' : 'in progress'}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-ink font-semibold mb-4">Achievements</h2>
          <ul className="flex flex-col gap-2">
            {achievements.map((a, i) => (
              <li key={i} className="p-3 rounded-lg bg-success-bg border border-success/20 text-success text-sm flex items-center gap-2">
                <CircleCheck size={14} strokeWidth={1.75} className="shrink-0" aria-hidden="true" /> {a}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
