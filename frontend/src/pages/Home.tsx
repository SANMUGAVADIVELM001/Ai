import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChartNoAxesCombined, Map, BookOpen, Sparkles, Clock, Calendar, type LucideIcon } from 'lucide-react';
import ProgressBar from '../components/ProgressBar.js';
import AIInsight from '../components/AIInsight.js';
import { api } from '../api.js';
import { useLearner } from '../context/LearnerContext.js';
import { useEnsureAnalysis, useEnsureRoadmap, useEnsureLearnerState } from '../hooks/useEnsureData.js';
import type { AssessmentRecord } from '../types.js';

const MASTERY_COLORS: Record<string, string> = {
  Beginner: 'bg-error',
  Developing: 'bg-warning',
  Intermediate: 'bg-blue-500',
  Advanced: 'bg-success',
};

/**
 * Fully derived from the active goal (profile.roleId): switching goals via
 * useLearner().switchGoal swaps profile, which cascades through
 * useEnsureAnalysis/useEnsureRoadmap/useEnsureLearnerState to re-fetch
 * everything below for the newly-active roleId — nothing here is cached
 * across goals.
 */
export default function Home() {
  const { profile, sessionId } = useLearner();
  const { analysis } = useEnsureAnalysis();
  const { roadmap } = useEnsureRoadmap();
  const { nextBestAction } = useEnsureLearnerState();
  const [recentAssessments, setRecentAssessments] = useState<AssessmentRecord[]>([]);

  useEffect(() => {
    if (!profile?.roleId) {
      setRecentAssessments([]);
      return;
    }
    api
      .getAssessmentHistory({ roleId: profile.roleId })
      .then(({ assessments }) => setRecentAssessments(assessments.filter((a) => a.status === 'completed').slice(0, 3)))
      .catch(() => setRecentAssessments([]));
  }, [profile?.roleId]);

  const fetchSkillGapExplanation = useCallback(() => {
    if (!sessionId && !profile?.roleId) return Promise.resolve({ data: analysis?.aiExplanation ?? '', source: 'fallback' as const });
    return api.explainSkillGap({ sessionId: sessionId ?? undefined, roleId: profile?.roleId ?? undefined });
  }, [sessionId, profile, analysis]);

  if (!profile) {
    return <PreOnboardingHome />;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink mb-1">Welcome back</h1>
      <p className="text-ink-secondary mb-4">
        Let's continue your learning journey toward <span className="text-ink font-medium">{profile.goal}</span>.
      </p>

      <div className="flex flex-wrap gap-2 mb-8">
        <GoalChip label="Goal" value={roadmap?.roleTitle ?? profile.goal} />
        {profile.targetDuration && <GoalChip icon={Calendar} label="Timeline" value={profile.targetDuration} />}
        {profile.studyTimePerDay != null && <GoalChip icon={Clock} label="Study Time" value={`${profile.studyTimePerDay} hrs/day`} />}
      </div>

      {!analysis && (
        <div className="p-5 rounded-xl bg-brand-50 border border-brand-200 mb-8">
          <p className="text-ink font-semibold text-sm mb-1">Take your diagnostic assessment</p>
          <p className="text-ink-secondary text-sm mb-3">
            We haven't measured your skills yet — the assessment determines your real level so we can build an
            accurate roadmap.
          </p>
          <Link to="/assessment" className="inline-block px-5 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors">
            Start Assessment
          </Link>
        </div>
      )}

      {analysis && (
        <>
          {nextBestAction && (
            <div className="p-5 rounded-xl bg-brand-50 border border-brand-200 mb-6">
              <p className="text-brand-600 text-xs font-semibold mb-2 tracking-wide">NEXT BEST ACTION</p>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-ink font-semibold">{nextBestAction.label}</p>
                  <p className="text-ink-secondary text-sm mt-1">{nextBestAction.description}</p>
                </div>
                <Link
                  to={nextBestAction.ctaTo}
                  className="px-5 py-2.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors"
                >
                  {nextBestAction.ctaLabel} →
                </Link>
              </div>
            </div>
          )}

          {roadmap && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              <StatCard label="Overall Progress" value={`${roadmap.progress.percentComplete}%`} />
              <StatCard label="Skills Mastered" value={`${roadmap.progress.completed} / ${roadmap.progress.total}`} />
              <StatCard label="High-Priority Gaps" value={String(analysis.highPriorityGaps.length)} />
              <StatCard label="Est. Weeks Left" value={String(roadmap.totalEstimatedWeeks)} />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <section className="lg:col-span-2">
              <h2 className="text-ink font-semibold mb-3">Skill Progress</h2>
              <div className="flex flex-col gap-2">
                {analysis.skillResults.map((s) => (
                  <div key={s.skill} className="flex items-center gap-3 p-3 rounded-lg bg-white border border-line shadow-sm">
                    <span className="text-ink text-sm flex-1 truncate">{s.skill}</span>
                    <div className="w-28 shrink-0">
                      <ProgressBar value={s.masteryScore} colorClass={MASTERY_COLORS[s.masteryLabel]} />
                    </div>
                    <span className="text-ink-muted text-xs w-9 text-right shrink-0">{s.masteryScore}%</span>
                  </div>
                ))}
              </div>
              <Link to="/skills" className="inline-block mt-3 text-brand-500 hover:text-brand-600 text-xs font-medium transition-colors">
                View full skill analysis →
              </Link>
            </section>

            <section>
              <h2 className="text-ink font-semibold mb-3">Roadmap Overview</h2>
              {roadmap && (
                <div className="flex flex-col gap-1.5">
                  {roadmap.milestones.slice(0, 7).map((m) => (
                    <Link
                      key={m.id}
                      to={`/roadmap/${m.id}`}
                      className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-white border border-line shadow-sm hover:bg-surface-secondary transition-colors"
                    >
                      <span className="text-ink-secondary text-sm truncate">{m.skill}</span>
                      <StatusDot status={m.status} />
                    </Link>
                  ))}
                </div>
              )}
              <Link to="/roadmap" className="inline-block mt-3 text-brand-500 hover:text-brand-600 text-xs font-medium transition-colors">
                View full roadmap →
              </Link>
            </section>
          </div>

          {recentAssessments.length > 0 && (
            <section className="mb-8">
              <h2 className="text-ink font-semibold mb-3">Recent Assessments</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {recentAssessments.map((a) => {
                  const score = a.skill ? a.scoreBySkill[a.skill]?.masteryScore ?? 0 : 0;
                  const milestone = roadmap?.milestones.find((m) => m.skill === a.skill);
                  const passed = milestone ? score >= milestone.targetMastery : score >= 70;
                  return (
                    <div key={a.assessmentId} className="p-4 rounded-xl bg-white border border-line shadow-sm">
                      <p className="text-ink font-semibold text-sm truncate">{a.skill ?? 'Diagnostic'}</p>
                      <p className={`text-sm font-medium mt-1 ${passed ? 'text-success' : 'text-warning'}`}>
                        {score}% {passed ? 'Passed' : 'Needs Improvement'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <div className="mb-8">
            <AIInsight
              label="AI Insight"
              loadingText="PathPilot is analyzing your progress..."
              fetcher={fetchSkillGapExplanation}
              cacheKey={`${profile.roleId ?? 'none'}:${sessionId ?? 'no-session'}`}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <QuickLink to="/skills" icon={ChartNoAxesCombined} label="My Skills" />
            <QuickLink to="/roadmap" icon={Map} label="Roadmap" />
            <QuickLink to="/resources" icon={BookOpen} label="Resources" />
            <QuickLink to="/coach" icon={Sparkles} label="AI Coach" />
          </div>
        </>
      )}
    </div>
  );
}

function GoalChip({ icon: Icon, label, value }: { icon?: LucideIcon; label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-surface-secondary border border-line text-ink-secondary">
      {Icon && <Icon size={12} strokeWidth={1.75} aria-hidden="true" />}
      <span className="text-ink-muted">{label}:</span>
      <span className="text-ink font-medium">{value}</span>
    </span>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 rounded-xl bg-white border border-line shadow-sm">
      <p className="text-ink text-xl font-bold">{value}</p>
      <p className="text-ink-muted text-xs mt-1">{label}</p>
    </div>
  );
}

const STATUS_DOT_COLOR: Record<string, string> = {
  locked: 'bg-locked',
  available: 'bg-brand-400',
  in_progress: 'bg-brand-500',
  completed: 'bg-success',
};

function StatusDot({ status }: { status: string }) {
  return <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT_COLOR[status] ?? 'bg-locked'}`} aria-hidden="true" />;
}

function QuickLink({ to, icon: Icon, label }: { to: string; icon: LucideIcon; label: string }) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-white hover:bg-surface-secondary border border-line shadow-sm transition-colors"
    >
      <Icon size={20} strokeWidth={1.75} className="text-ink-secondary" aria-hidden="true" />
      <span className="text-ink-secondary text-xs font-medium text-center">{label}</span>
    </Link>
  );
}

function PreOnboardingHome() {
  return (
    <div className="text-center py-16">
      <div className="inline-block px-3 py-1 rounded-full bg-brand-50 text-brand-600 text-xs font-medium mb-6">
        AI-Powered Learning
      </div>
      <h1 className="text-4xl sm:text-5xl font-bold text-ink tracking-tight mb-4">
        Your personalized path to <span className="text-brand-500">any tech career</span>
      </h1>
      <p className="text-ink-secondary text-lg max-w-xl mx-auto mb-10">
        Tell us your goal. We diagnose your real skill level, find your gaps, and build a prerequisite-aware roadmap
        — just for you.
      </p>
      <Link
        to="/assessment"
        className="inline-block px-8 py-3 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-semibold transition-colors"
      >
        Get Started
      </Link>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-16 text-left">
        <FeatureCard title="Diagnostic Assessment" desc="Adaptive questions determine your real skill level per topic — no guessing required." />
        <FeatureCard title="Skill Gap Analysis" desc="See exactly where you stand versus what your target role requires." />
        <FeatureCard title="Personalized Roadmap" desc="A prerequisite-aware path built from your actual strengths and gaps." />
      </div>
    </div>
  );
}

function FeatureCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="p-5 rounded-xl bg-white border border-line shadow-sm">
      <h3 className="text-ink font-semibold mb-1">{title}</h3>
      <p className="text-ink-secondary text-sm">{desc}</p>
    </div>
  );
}
