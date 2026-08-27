import { Link } from 'react-router-dom';
import { ChartNoAxesCombined, Map, BookOpen, Sparkles, type LucideIcon } from 'lucide-react';
import ProgressBar from '../components/ProgressBar.js';
import { useLearner } from '../context/LearnerContext.js';
import { useEnsureRoadmap, useEnsureLearnerState } from '../hooks/useEnsureData.js';

export default function Home() {
  const { profile, analysis } = useLearner();
  const { roadmap } = useEnsureRoadmap();
  const { nextBestAction } = useEnsureLearnerState();

  if (!profile) {
    return <PreOnboardingHome />;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink mb-1">Welcome back</h1>
      <p className="text-ink-secondary mb-8">
        Goal: <span className="text-ink">{profile.goal}</span>
      </p>

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
          {roadmap && (
            <div className="p-5 rounded-xl bg-white border border-line shadow-sm mb-6">
              <div className="flex items-center justify-between mb-2 text-sm">
                <span className="text-ink-secondary font-medium">Overall Progress</span>
                <span className="text-ink-secondary">
                  {roadmap.progress.completed} / {roadmap.progress.total} skills verified
                </span>
              </div>
              <ProgressBar value={roadmap.progress.percentComplete} colorClass="bg-success" />
            </div>
          )}

          {nextBestAction && (
            <div className="p-5 rounded-xl bg-brand-50 border border-brand-200 mb-8">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <div className="p-4 rounded-xl bg-white border border-line shadow-sm">
              <p className="text-ink font-semibold text-sm mb-2">Strongest Skills</p>
              <p className="text-ink-secondary text-sm">{analysis.strongestSkills.join(', ') || '—'}</p>
            </div>
            <div className="p-4 rounded-xl bg-white border border-line shadow-sm">
              <p className="text-ink font-semibold text-sm mb-2">Top Skill Gaps</p>
              <p className="text-ink-secondary text-sm">{analysis.highPriorityGaps.join(', ') || 'None'}</p>
            </div>
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
