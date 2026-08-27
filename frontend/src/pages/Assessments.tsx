import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardCheck, CircleCheck } from 'lucide-react';
import EmptyState from '../components/EmptyState.js';
import { api } from '../api.js';
import { useEnsureAnalysis, useEnsureRoadmap } from '../hooks/useEnsureData.js';
import type { AssessmentRecord } from '../types.js';

function scoreFor(record: AssessmentRecord): number {
  if (!record.skill) return 0;
  return record.scoreBySkill[record.skill]?.masteryScore ?? 0;
}

/**
 * Distinct from the initial diagnostic flow at /assessment: this shows the
 * diagnostic plus every module/reassessment attempt, sourced from the
 * persisted per-learner assessment history — real attempt numbers and
 * scores, not fabricated.
 */
export default function Assessments() {
  const { analysis, loading, needsAssessment } = useEnsureAnalysis();
  const { roadmap } = useEnsureRoadmap();
  const [history, setHistory] = useState<AssessmentRecord[] | null>(null);

  useEffect(() => {
    api
      .getAssessmentHistory()
      .then(({ assessments }) => setHistory(assessments))
      .catch(() => setHistory([]));
  }, []);

  if (loading) return <p className="text-ink-secondary">Loading assessments...</p>;

  const moduleAttempts = (history ?? []).filter((a) => a.status === 'completed' && a.type !== 'INITIAL_DIAGNOSTIC' && a.skill);
  const bySkill = new Map<string, AssessmentRecord[]>();
  for (const record of moduleAttempts) {
    const skill = record.skill as string;
    const list = bySkill.get(skill) ?? [];
    list.push(record);
    bySkill.set(skill, list);
  }
  for (const list of bySkill.values()) list.sort((a, b) => a.attemptNumber - b.attemptNumber);

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink mb-1">Assessments</h1>
      <p className="text-ink-secondary mb-8">Your diagnostic and module assessments.</p>

      <section className="mb-10">
        <h2 className="text-ink font-semibold mb-4">Initial Diagnostic</h2>
        {needsAssessment || !analysis ? (
          <EmptyState
            icon={ClipboardCheck}
            title="No assessments completed yet"
            body="Take the initial diagnostic assessment to measure your real skill level."
            ctaLabel="Take the Assessment"
            ctaTo="/assessment"
          />
        ) : (
          <Link
            to="/assessment"
            className="block p-5 rounded-xl bg-white border border-line shadow-sm hover:bg-surface-secondary transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-ink font-semibold text-sm">Initial Diagnostic — {analysis.roleTitle}</p>
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border text-success bg-success-bg border-success/30">
                <CircleCheck size={11} strokeWidth={1.75} aria-hidden="true" /> Completed
              </span>
            </div>
            <p className="text-ink-secondary text-xs">
              {analysis.skillResults.length} skills assessed ·{' '}
              {analysis.skillResults.reduce((s, r) => s + r.correctAnswers, 0)} /{' '}
              {analysis.skillResults.reduce((s, r) => s + r.questionsAttempted, 0)} correct
            </p>
            <p className="text-brand-500 text-xs mt-2">View full results →</p>
          </Link>
        )}
      </section>

      <section>
        <h2 className="text-ink font-semibold mb-4">Module Assessments</h2>
        {bySkill.size === 0 ? (
          <div className="p-5 rounded-xl bg-white border border-line shadow-sm opacity-70">
            <p className="text-ink-secondary text-sm">No module assessments taken yet</p>
            <p className="text-ink-muted text-xs mt-1">
              Open a module from your Roadmap, complete the learning resources, and take its module assessment to see
              attempt history here.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {[...bySkill.entries()].map(([skill, attempts]) => {
              const milestone = roadmap?.milestones.find((m) => m.skill === skill);
              const latest = attempts[attempts.length - 1];
              const passed = milestone ? milestone.currentMastery >= milestone.targetMastery : false;
              return (
                <div key={skill} className="p-5 rounded-xl bg-white border border-line shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-ink font-semibold text-sm">{skill}</p>
                    {milestone && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border ${
                          passed
                            ? 'text-success bg-success-bg border-success/30'
                            : 'text-warning bg-warning-bg border-warning/30'
                        }`}
                      >
                        {passed ? (
                          <span className="inline-flex items-center gap-1">
                            <CircleCheck size={11} strokeWidth={1.75} aria-hidden="true" /> Passed
                          </span>
                        ) : (
                          'In Progress'
                        )}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {attempts.map((a) => (
                      <span
                        key={a.assessmentId}
                        className="text-xs px-2.5 py-1 rounded-full bg-surface-secondary border border-line text-ink-secondary"
                      >
                        Attempt {a.attemptNumber}: {scoreFor(a)}%
                      </span>
                    ))}
                  </div>
                  {attempts.length > 1 && scoreFor(latest) > scoreFor(attempts[0]) && (
                    <p className="text-success text-xs mt-2">↑ Improving</p>
                  )}
                  {milestone && (
                    <Link
                      to={`/roadmap/${milestone.id}`}
                      className="inline-block mt-3 text-brand-500 hover:text-brand-600 text-xs font-medium transition-colors"
                    >
                      Open module →
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
