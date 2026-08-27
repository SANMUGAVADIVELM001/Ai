import { useEffect, useMemo, useState } from 'react';
import { Video, BookOpen, FlaskConical, FileText, Newspaper, type LucideIcon } from 'lucide-react';
import { api } from '../api.js';
import type { Resource, ResourceType } from '../types.js';

const TYPE_FILTERS: { label: string; value: ResourceType | 'all' | 'free' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Free', value: 'free' },
  { label: 'Courses', value: 'course' },
  { label: 'Videos', value: 'video' },
  { label: 'Articles', value: 'article' },
  { label: 'Documentation', value: 'documentation' },
  { label: 'Interactive', value: 'interactive' },
];

const RESOURCE_TYPE_ICON: Record<string, LucideIcon> = {
  video: Video,
  course: BookOpen,
  interactive: FlaskConical,
  documentation: FileText,
  article: Newspaper,
  book: BookOpen,
};

export default function Resources() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<(typeof TYPE_FILTERS)[number]['value']>('all');
  const [skillFilter, setSkillFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.getResources().then(({ resources }) => {
      setResources(resources);
      setLoading(false);
    });
  }, []);

  const skills = useMemo(() => Array.from(new Set(resources.map((r) => r.skill))).sort(), [resources]);

  const filtered = useMemo(() => {
    return resources.filter((r) => {
      if (typeFilter === 'free' && !r.isFree) return false;
      if (typeFilter !== 'all' && typeFilter !== 'free' && r.type !== typeFilter) return false;
      if (skillFilter !== 'all' && r.skill !== skillFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const haystack = `${r.title} ${r.tags.join(' ')} ${r.provider}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [resources, typeFilter, skillFilter, search]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink mb-1">Resources</h1>
      <p className="text-ink-secondary mb-6">Curated, genuinely free resources — courses, videos, docs, and practice.</p>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search resources..."
          className="flex-1 rounded-lg bg-white border border-line focus:border-brand-500 outline-none px-4 py-2.5 text-ink placeholder-ink-muted text-sm"
        />
        <select
          value={skillFilter}
          onChange={(e) => setSkillFilter(e.target.value)}
          className="rounded-lg bg-white border border-line focus:border-brand-500 outline-none px-4 py-2.5 text-ink text-sm"
        >
          <option value="all">All skills</option>
          {skills.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setTypeFilter(f.value)}
            className={`px-4 py-1.5 rounded-full text-sm border transition-colors ${
              typeFilter === f.value
                ? 'bg-brand-100 border-brand-300 text-brand-600'
                : 'bg-white border-line text-ink-secondary hover:bg-surface-secondary'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-ink-secondary">Loading resources...</p>
      ) : filtered.length === 0 ? (
        <p className="text-ink-muted">No resources match your filters.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((r) => (
            <div key={r.id} className="p-4 rounded-xl bg-white border border-line shadow-sm flex flex-col gap-2">
              <div className="flex items-center gap-2 text-xs text-ink-muted">
                {(() => {
                  const TypeIcon = RESOURCE_TYPE_ICON[r.type] ?? FileText;
                  return <TypeIcon size={14} strokeWidth={1.75} aria-hidden="true" />;
                })()}
                <span className="capitalize">{r.type}</span>
                <span>·</span>
                <span className="capitalize">{r.difficulty}</span>
              </div>
              <p className="text-ink font-semibold text-sm leading-tight">{r.title}</p>
              <p className="text-ink-secondary text-xs">{r.description}</p>
              <p className="text-ink-muted text-xs">{r.provider}</p>
              <div className="flex items-center gap-2 text-xs text-ink-muted mt-1">
                <span>{r.skill}</span>
                <span>·</span>
                <span>{Math.round(r.durationMinutes / 60) || 1}h</span>
                {r.isFree && (
                  <>
                    <span>·</span>
                    <span className="text-success">Free resource</span>
                  </>
                )}
              </div>
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold transition-colors"
              >
                Open Resource ↗
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
