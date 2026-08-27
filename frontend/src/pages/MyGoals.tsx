import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Target, Plus, Check } from 'lucide-react';
import EmptyState from '../components/EmptyState.js';
import ProgressBar from '../components/ProgressBar.js';
import { useLearner } from '../context/LearnerContext.js';

/**
 * Lists every goal (role) the learner has ever started. Each goal keeps its
 * own independent roadmap/mastery/assessment history server-side — this
 * page only switches which one is "active" (shown on Home/Dashboard by
 * default); it never deletes or resets another goal's progress.
 */
export default function MyGoals() {
  const { goals, goalsLoading, switchGoal } = useLearner();
  const navigate = useNavigate();
  const [switching, setSwitching] = useState<string | null>(null);

  async function handleActivate(roleId: string) {
    if (switching) return;
    setSwitching(roleId);
    try {
      await switchGoal(roleId);
      navigate('/');
    } finally {
      setSwitching(null);
    }
  }

  if (goalsLoading) return <p className="text-ink-secondary">Loading your goals...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-ink">My Goals</h1>
        <Link
          to="/assessment"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors"
        >
          <Plus size={16} strokeWidth={1.75} aria-hidden="true" />
          Add Goal
        </Link>
      </div>
      <p className="text-ink-secondary mb-8">
        Each goal keeps its own roadmap and progress — switching goals never loses another goal's work.
      </p>

      {goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No goals yet"
          body="Tell us your target role and complete the diagnostic assessment to start your first goal."
          ctaLabel="Get Started"
          ctaTo="/assessment"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {goals.map((g) => (
            <div
              key={g.roleId}
              className={`p-5 rounded-xl bg-white border shadow-sm flex flex-col gap-3 ${
                g.isActive ? 'border-brand-300 ring-1 ring-brand-200' : 'border-line'
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-ink font-semibold">{g.roleTitle}</p>
                {g.isActive && (
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border text-brand-600 bg-brand-50 border-brand-200">
                    <Check size={11} strokeWidth={1.75} aria-hidden="true" /> Active
                  </span>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1 text-xs">
                  <span className="text-ink-secondary">Progress</span>
                  <span className="text-ink font-medium">{g.progressPercent}%</span>
                </div>
                <ProgressBar value={g.progressPercent} />
              </div>

              {!g.isActive && (
                <button
                  onClick={() => handleActivate(g.roleId)}
                  disabled={switching === g.roleId}
                  className="mt-1 px-4 py-2 rounded-lg border border-brand-500 text-brand-500 hover:bg-brand-50 disabled:opacity-50 text-sm font-medium transition-colors"
                >
                  {switching === g.roleId ? 'Switching...' : 'Switch to this goal'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
