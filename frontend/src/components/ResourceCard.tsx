import { useCallback, useState } from 'react';
import { Video, BookOpen, FlaskConical, FileText, Newspaper, Sparkles, type LucideIcon } from 'lucide-react';
import AIInsight from './AIInsight.js';
import { api } from '../api.js';
import type { LearnerProfile, ScoredResource } from '../types.js';

const RESOURCE_TYPE_ICON: Record<string, LucideIcon> = {
  video: Video,
  course: BookOpen,
  interactive: FlaskConical,
  documentation: FileText,
  article: Newspaper,
  book: BookOpen,
};

export default function ResourceCard({
  scored,
  skill,
  sessionId,
  profile,
}: {
  scored: ScoredResource;
  skill: string;
  sessionId: string | null;
  profile: LearnerProfile | null;
}) {
  const { resource } = scored;
  const [showWhy, setShowWhy] = useState(false);

  const fetchWhy = useCallback(() => {
    if (!profile || (!sessionId && !profile.roleId)) return Promise.reject(new Error('missing session'));
    return api.explainRecommendation(profile, skill, resource.id, { sessionId: sessionId ?? undefined, roleId: profile.roleId ?? undefined });
  }, [sessionId, profile, skill, resource.id]);

  return (
    <div className="p-3 rounded-lg bg-white border border-line shadow-sm flex flex-col gap-2">
      <div className="flex items-center gap-2 text-xs text-ink-muted">
        {(() => {
          const TypeIcon = RESOURCE_TYPE_ICON[resource.type] ?? FileText;
          return <TypeIcon size={14} strokeWidth={1.75} aria-hidden="true" />;
        })()}
        <span className="capitalize">{resource.type}</span>
        <span>·</span>
        <span>{Math.round(resource.durationMinutes / 60) || 1}h</span>
        {resource.isFree && (
          <>
            <span>·</span>
            <span className="text-success">Free</span>
          </>
        )}
      </div>
      <p className="text-ink text-sm font-medium leading-tight">{resource.title}</p>
      <p className="text-ink-muted text-xs">{resource.provider}</p>
      <div className="flex items-center gap-3 mt-1">
        <a
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-brand-500 hover:text-brand-600 text-xs font-medium transition-colors"
        >
          Open Resource ↗
        </a>
        {profile && (sessionId || profile.roleId) && (
          <button
            onClick={() => setShowWhy((v) => !v)}
            className="inline-flex items-center gap-1 text-ink-muted hover:text-ink-secondary text-xs transition-colors"
          >
            <Sparkles size={12} strokeWidth={1.75} aria-hidden="true" /> Why recommended?
          </button>
        )}
      </div>
      {showWhy && (
        <div className="mt-1">
          <AIInsight
            label="Why this resource"
            loadingText="PathPilot is checking the evidence..."
            fetcher={fetchWhy}
            cacheKey={`${sessionId ?? profile?.roleId ?? 'none'}:${resource.id}`}
          />
        </div>
      )}
    </div>
  );
}
