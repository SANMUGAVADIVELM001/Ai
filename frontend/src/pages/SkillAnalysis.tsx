import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChartNoAxesCombined } from 'lucide-react';
import ProgressBar from '../components/ProgressBar.js';
import AIInsight from '../components/AIInsight.js';
import EmptyState from '../components/EmptyState.js';
import { api } from '../api.js';
import { useLearner } from '../context/LearnerContext.js';
import { useEnsureAnalysis } from '../hooks/useEnsureData.js';
import type { PriorityLevel, SkillGap } from '../types.js';

const MASTERY_COLORS: Record<string, string> = {
  Beginner: 'bg-error',
  Developing: 'bg-warning',
  Intermediate: 'bg-blue-500',
  Advanced: 'bg-success',
};

const PRIORITY_STYLES: Record<PriorityLevel, { label: string; badge: string; bar: string }> = {
  high: { label: 'HIGH PRIORITY', badge: 'text-error bg-error-bg border-error/30', bar: 'bg-error' },
  medium: { label: 'MEDIUM PRIORITY', badge: 'text-warning bg-warning-bg border-warning/30', bar: 'bg-warning' },
  low: { label: 'LOW PRIORITY', badge: 'text-success bg-success-bg border-success/30', bar: 'bg-success' },
};

export default function SkillAnalysis() {
  const { profile, sessionId } = useLearner();
  const { analysis, loading, needsAssessment } = useEnsureAnalysis();

  const fetchSkillGapExplanation = useCallback(() => {
    if (!sessionId && !profile?.roleId) return Promise.resolve({ data: analysis?.aiExplanation ?? '', source: 'fallback' as const });
    return api.explainSkillGap({ sessionId: sessionId ?? undefined, roleId: profile?.roleId ?? undefined });
  }, [sessionId, profile, analysis]);

  if (loading) return <p className="text-ink-secondary">Loading your skill analysis...</p>;

  if (needsAssessment || !analysis) {
    return (
      <EmptyState
        icon={ChartNoAxesCombined}
        title="No skill data yet"
        body="Complete the initial diagnostic assessment to see your measured skill levels and gaps."
        ctaLabel="Take the Assessment"
        ctaTo="/assessment"
      />
    );
  }

  const orderedResults = [...analysis.skillResults].sort((a, b) => b.masteryScore - a.masteryScore);

  const grouped: Record<PriorityLevel, SkillGap[]> = { high: [], medium: [], low: [] };
  for (const gap of analysis.gaps) {
    if (!gap.sufficient) grouped[gap.priority].push(gap);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink mb-1">My Skills</h1>
      <p className="text-ink-secondary mb-8">
        Based on your diagnostic assessment for <span className="text-ink">{analysis.roleTitle}</span>
      </p>

      <div className="mb-8">
        <AIInsight
          label="AI Insight"
          loadingText="PathPilot is analyzing your assessment..."
          fetcher={fetchSkillGapExplanation}
          cacheKey={sessionId ?? 'no-session'}
        />
      </div>

      <section className="mb-10">
        <h2 className="text-ink font-semibold mb-4">Skill Mastery</h2>
        <div className="flex flex-col gap-3">
          {orderedResults.map((s) => (
            <div key={s.skill} className="flex items-center gap-4 p-3 rounded-lg bg-white border border-line shadow-sm">
              <div className="w-36 shrink-0 text-ink text-sm truncate">{s.skill}</div>
              <div className="flex-1">
                <ProgressBar value={s.masteryScore} colorClass={MASTERY_COLORS[s.masteryLabel]} />
              </div>
              <div className="w-12 text-right text-ink text-sm font-medium">{s.masteryScore}%</div>
              <div className="w-24 text-right">
                <span
                  className="text-xs px-2 py-0.5 rounded-full bg-surface-secondary text-ink-secondary border border-line"
                >
                  {s.masteryLabel}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-ink font-semibold mb-4">Current vs. Target</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {analysis.gaps.map((g) => (
            <div key={g.skill} className="p-4 rounded-xl bg-white border border-line shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-ink font-medium text-sm">{g.skill}</span>
                {!g.sufficient && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${PRIORITY_STYLES[g.priority].badge}`}>
                    {PRIORITY_STYLES[g.priority].label}
                  </span>
                )}
                {g.sufficient && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full border text-success bg-success-bg border-success/30">
                    READY
                  </span>
                )}
              </div>
              <div className="relative h-2.5 rounded-full bg-surface-secondary overflow-hidden mb-1">
                <div className="absolute h-full bg-brand-500 rounded-full" style={{ width: `${g.current}%` }} />
                <div className="absolute top-0 h-full w-0.5 bg-ink-secondary" style={{ left: `${g.required}%` }} />
              </div>
              <div className="flex justify-between text-xs text-ink-secondary">
                <span>Current: {g.current}%</span>
                <span>Required: {g.required}%</span>
              </div>
              {g.prerequisites.length > 0 && (
                <p className="text-ink-muted text-xs mt-2">Prerequisites: {g.prerequisites.join(', ')}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-ink font-semibold mb-4">Priority Breakdown</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(['high', 'medium', 'low'] as PriorityLevel[]).map((level) => (
            <div key={level} className={`p-4 rounded-xl border ${PRIORITY_STYLES[level].badge}`}>
              <p className="text-xs font-semibold mb-3 tracking-wide">{PRIORITY_STYLES[level].label}</p>
              {grouped[level].length === 0 ? (
                <p className="text-ink-muted text-xs">None</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {grouped[level].map((g) => (
                    <li key={g.skill} className="text-ink text-sm">
                      {g.skill}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-white border border-line shadow-sm">
          <p className="text-ink font-semibold text-sm mb-2">Strongest Skills</p>
          <p className="text-ink-secondary text-sm">{analysis.strongestSkills.join(', ') || '—'}</p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-line shadow-sm">
          <p className="text-ink font-semibold text-sm mb-2">Already Sufficient</p>
          <p className="text-ink-secondary text-sm">{analysis.sufficientSkills.join(', ') || 'None yet'}</p>
        </div>
      </section>

      <div className="flex items-center justify-between p-5 rounded-xl bg-white border border-line shadow-sm">
        <div>
          <p className="text-ink font-semibold text-sm">Next: View Your Roadmap</p>
          <p className="text-ink-muted text-xs mt-1">A prerequisite-aware path with milestones and free resources.</p>
        </div>
        <Link
          to="/roadmap"
          className="px-5 py-2.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm transition-colors"
        >
          View Roadmap
        </Link>
      </div>

      <p className="text-ink-muted text-xs text-center mt-6">Goal: {profile?.goal}</p>
    </div>
  );
}
