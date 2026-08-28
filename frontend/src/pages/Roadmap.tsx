import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Map as MapIcon,
  Rocket,
  Sparkles,
  Lock,
  LockOpen,
  CirclePlay,
  CircleCheck,
  ChevronUp,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react';
import ProgressBar from '../components/ProgressBar.js';
import AIInsight from '../components/AIInsight.js';
import EmptyState from '../components/EmptyState.js';
import ResourceCard from '../components/ResourceCard.js';
import { api } from '../api.js';
import { useLearner } from '../context/LearnerContext.js';
import { useEnsureRoadmap, useEnsureLearnerState } from '../hooks/useEnsureData.js';
import type { LearnerProfile, MilestoneStatus, RoadmapMilestone } from '../types.js';

const STATUS_STYLES: Record<MilestoneStatus, { label: string; icon: LucideIcon; badge: string; card: string }> = {
  locked: { label: 'Locked', icon: Lock, badge: 'text-locked bg-surface-secondary border-line', card: 'opacity-60' },
  available: { label: 'Available', icon: LockOpen, badge: 'text-brand-500 bg-white border-brand-300', card: '' },
  in_progress: { label: 'In Progress', icon: CirclePlay, badge: 'text-brand-600 bg-brand-50 border-brand-200', card: 'ring-1 ring-brand-200' },
  completed: { label: 'Completed', icon: CircleCheck, badge: 'text-success bg-success-bg border-success/30', card: '' },
};

const PRIORITY_BADGE: Record<string, string> = {
  high: 'text-error bg-error-bg border-error/30',
  medium: 'text-warning bg-warning-bg border-warning/30',
  low: 'text-success bg-success-bg border-success/30',
};

export default function Roadmap() {
  const { profile, sessionId } = useLearner();
  const { roadmap, loading, needsAnalysis } = useEnsureRoadmap();
  const { nextBestAction } = useEnsureLearnerState();
  const [searchParams] = useSearchParams();
  const [expandedId, setExpandedId] = useState<string | null>(searchParams.get('milestone'));

  const fetchRoadmapExplanation = useCallback(() => {
    if (!profile || (!sessionId && !profile.roleId)) return Promise.reject(new Error('missing session'));
    return api.explainRoadmap(profile, { sessionId: sessionId ?? undefined, roleId: profile.roleId ?? undefined });
  }, [sessionId, profile]);

  useEffect(() => {
    const milestoneParam = searchParams.get('milestone');
    if (milestoneParam) setExpandedId(milestoneParam);
  }, [searchParams]);

  if (loading) return <p className="text-ink-secondary">Generating your personalized roadmap...</p>;

  if (needsAnalysis) {
    return (
      <EmptyState
        icon={MapIcon}
        title="No roadmap yet"
        body="Complete the initial diagnostic assessment first — your roadmap is built from your measured skill gaps."
        ctaLabel="Take the Assessment"
        ctaTo="/assessment"
      />
    );
  }

  if (!roadmap) return <p className="text-ink-secondary">Generating your personalized roadmap...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink mb-1">Learning Roadmap</h1>
      <p className="text-ink-secondary mb-8">
        Target: <span className="text-ink">{roadmap.roleTitle}</span>
        {roadmap.targetDuration && <span> · Goal timeline: {roadmap.targetDuration}</span>}
        {' · '}Estimated: {roadmap.totalEstimatedDays} day{roadmap.totalEstimatedDays === 1 ? '' : 's'} at {roadmap.studyTimePerDayHours}h/day
      </p>

      {roadmap.pacing === null && (
        <div className="p-4 rounded-xl bg-warning-bg border border-warning mb-6 flex items-center justify-between flex-wrap gap-3">
          <p className="text-ink-secondary text-sm">Set your available days to get an accurate, personalized timeline.</p>
          <Link
            to="/assessment?step=pacing"
            className="px-4 py-2 rounded-lg bg-white hover:bg-surface-secondary border border-line text-ink-secondary text-sm font-medium transition-colors shrink-0"
          >
            Set your pace
          </Link>
        </div>
      )}

      {/* Overall progress */}
      <div className="p-5 rounded-xl bg-white border border-line shadow-sm mb-6">
        <div className="flex items-center justify-between mb-2 text-sm">
          <span className="text-ink-secondary font-medium">Overall Progress</span>
          <span className="text-ink-secondary">
            {roadmap.progress.completed} / {roadmap.progress.total} skills verified
          </span>
        </div>
        <ProgressBar value={roadmap.progress.percentComplete} colorClass="bg-success" />
      </div>

      <div className="mb-6">
        <AIInsight
          label="AI Insight"
          loadingText="PathPilot is thinking about your current roadmap..."
          fetcher={fetchRoadmapExplanation}
          cacheKey={`${sessionId ?? 'no-session'}:${roadmap.generatedAt}`}
        />
      </div>

      {/* Next best action */}
      {nextBestAction && (
        <div className="p-5 rounded-xl bg-brand-50 border border-brand-200 mb-8">
          <p className="text-brand-600 text-xs font-semibold mb-2 tracking-wide">YOUR NEXT BEST ACTION</p>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-ink font-semibold">{nextBestAction.label}</p>
              <p className="text-ink-secondary text-sm mt-1">{nextBestAction.description}</p>
            </div>
            <button
              onClick={() => nextBestAction.moduleId && setExpandedId(nextBestAction.moduleId)}
              className="px-5 py-2.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors"
            >
              {nextBestAction.ctaLabel} →
            </button>
          </div>
        </div>
      )}

      {/* Milestone timeline */}
      <div className="flex flex-col gap-4">
        {roadmap.milestones.map((milestone, idx) => (
          <MilestoneCard
            key={milestone.id}
            milestone={milestone}
            index={idx}
            expanded={expandedId === milestone.id}
            onToggle={() => setExpandedId(expandedId === milestone.id ? null : milestone.id)}
            sessionId={sessionId}
            profile={profile}
          />
        ))}
      </div>

      <div className="mt-8 flex items-center justify-center gap-6">
        <a href="/resources" className="text-brand-500 text-sm hover:text-brand-600 transition-colors">
          Browse all free resources →
        </a>
        <a href="/coach" className="inline-flex items-center gap-1.5 text-brand-500 text-sm hover:text-brand-600 transition-colors">
          <Sparkles size={14} strokeWidth={1.75} aria-hidden="true" /> Ask PathPilot →
        </a>
      </div>
    </div>
  );
}

function MilestoneCard({
  milestone,
  index,
  expanded,
  onToggle,
  sessionId,
  profile,
}: {
  milestone: RoadmapMilestone;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  sessionId: string | null;
  profile: LearnerProfile | null;
}) {
  const navigate = useNavigate();
  const style = STATUS_STYLES[milestone.status];
  const locked = milestone.status === 'locked';

  return (
    <div className={`rounded-2xl bg-white border border-line shadow-sm overflow-hidden ${style.card}`}>
      <button
        onClick={onToggle}
        disabled={locked}
        className={`w-full text-left p-5 flex items-center justify-between gap-4 ${locked ? 'cursor-default' : 'cursor-pointer hover:bg-surface-secondary'}`}
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-8 h-8 rounded-full bg-surface-secondary flex items-center justify-center text-sm text-ink-secondary shrink-0">
            {index + 1}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-ink font-semibold">{milestone.skill}</p>
              <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${style.badge}`}>
                <style.icon size={11} strokeWidth={1.75} aria-hidden="true" />
                {style.label}
              </span>
              {!milestone.isVerifiedSufficient && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full border capitalize ${PRIORITY_BADGE[milestone.priority]}`}>
                  {milestone.priority} priority
                </span>
              )}
            </div>
            <p className="text-ink-muted text-xs mt-1 truncate">
              {milestone.currentMastery}% → {milestone.targetMastery}% required
              {milestone.estimatedHours > 0 && ` · ~${milestone.estimatedHours}h`}
            </p>
          </div>
        </div>
        {!locked && (
          <span className="text-ink-muted shrink-0">
            {expanded ? (
              <ChevronUp size={16} strokeWidth={1.75} aria-hidden="true" />
            ) : (
              <ChevronDown size={16} strokeWidth={1.75} aria-hidden="true" />
            )}
          </span>
        )}
      </button>

      {locked && (
        <div className="px-5 pb-5">
          <p className="text-ink-muted text-xs">
            Unlocks after: {milestone.unsatisfiedPrerequisites.join(', ')}
          </p>
        </div>
      )}

      {expanded && !locked && (
        <div className="px-5 pb-5 border-t border-line pt-4">
          <div className="mb-4">
            <div className="relative h-2.5 rounded-full bg-surface-secondary overflow-hidden mb-1">
              <div className="absolute h-full bg-brand-500/90 rounded-full" style={{ width: `${milestone.currentMastery}%` }} />
              <div className="absolute top-0 h-full w-0.5 bg-ink/70" style={{ left: `${milestone.targetMastery}%` }} />
            </div>
          </div>

          <div className="p-4 rounded-lg bg-brand-50 border border-brand-200 mb-4">
            <p className="text-brand-600 text-[11px] font-semibold mb-1 tracking-wide">WHY THIS COMES NEXT</p>
            <p className="text-ink/80 text-sm leading-relaxed">{milestone.whyRecommended}</p>
          </div>

          {milestone.resources.length > 0 && (
            <div className="mb-4">
              <p className="text-ink-secondary text-sm font-medium mb-2">Recommended Resources</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {milestone.resources.map((sr) => (
                  <ResourceCard key={sr.resource.id} scored={sr} skill={milestone.skill} sessionId={sessionId} profile={profile} />
                ))}
              </div>
            </div>
          )}

          {milestone.project && (
            <div className="mb-4 p-4 rounded-lg bg-surface-secondary border border-line">
              <p className="text-ink-secondary text-sm font-medium mb-1 flex items-center gap-1.5">
                <Rocket size={14} strokeWidth={1.75} aria-hidden="true" /> Suggested Project
              </p>
              <p className="text-ink font-semibold text-sm">{milestone.project.title}</p>
              <p className="text-ink-secondary text-xs mt-1">{milestone.project.description}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => navigate(`/roadmap/${milestone.id}`)}
              className="px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors"
            >
              Open Module →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
