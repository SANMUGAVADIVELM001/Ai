import { Link, useLocation } from 'react-router-dom';
import { Menu, PanelLeft, Sparkles } from 'lucide-react';
import { useLearner } from '../context/LearnerContext.js';

const ROUTE_TITLES: Record<string, string> = {
  '/': 'Home',
  '/assessment': 'Assessment',
  '/skills': 'My Skills',
  '/roadmap': 'Learning Roadmap',
  '/resources': 'Resources',
  '/projects': 'Projects',
  '/assessments': 'Assessments',
  '/coach': 'AI Coach',
  '/dashboard': 'Dashboard',
  '/profile': 'Learner Profile',
  '/settings': 'Settings',
};

interface Props {
  onToggleMobile: () => void;
  onToggleCollapse: () => void;
}

export default function TopBar({ onToggleMobile, onToggleCollapse }: Props) {
  const location = useLocation();
  const { sessionId, analysis } = useLearner();
  const title = ROUTE_TITLES[location.pathname] ?? 'PathAI';

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-line px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleMobile}
          className="md:hidden w-9 h-9 rounded-lg bg-surface-secondary border border-line flex items-center justify-center text-ink-secondary shrink-0"
          aria-label="Open menu"
        >
          <Menu size={18} strokeWidth={1.75} aria-hidden="true" />
        </button>
        <button
          onClick={onToggleCollapse}
          className="hidden md:flex w-9 h-9 rounded-lg bg-surface-secondary border border-line items-center justify-center text-ink-secondary hover:text-ink transition-colors shrink-0"
          aria-label="Toggle sidebar"
        >
          <PanelLeft size={18} strokeWidth={1.75} aria-hidden="true" />
        </button>
        <h1 className="text-ink font-semibold text-lg truncate">{title}</h1>
      </div>

      {sessionId && analysis && (
        <Link
          to="/coach"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-brand-50 hover:bg-brand-100 border border-brand-200 text-brand-600 transition-colors shrink-0"
        >
          <Sparkles size={14} strokeWidth={1.75} aria-hidden="true" />
          Ask PathPilot
        </Link>
      )}
    </header>
  );
}
