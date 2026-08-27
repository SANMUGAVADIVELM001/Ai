import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, PanelLeft, Sparkles, Bell, ChevronDown, Check } from 'lucide-react';
import { useLearner } from '../context/LearnerContext.js';

const ROUTE_TITLES: Record<string, string> = {
  '/': 'Home',
  '/goals': 'My Goals',
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
  const navigate = useNavigate();
  const { sessionId, analysis, profile, goals, switchGoal } = useLearner();
  const title = ROUTE_TITLES[location.pathname] ?? 'PathAI';
  const [goalMenuOpen, setGoalMenuOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  const activeGoal = goals.find((g) => g.isActive);

  async function handleSwitch(roleId: string) {
    if (switching || roleId === activeGoal?.roleId) {
      setGoalMenuOpen(false);
      return;
    }
    setSwitching(true);
    try {
      await switchGoal(roleId);
      navigate('/');
    } finally {
      setSwitching(false);
      setGoalMenuOpen(false);
    }
  }

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
        <div className="min-w-0">
          <h1 className="text-ink font-semibold text-lg truncate leading-tight">{title}</h1>
          {profile?.goal && <p className="text-ink-muted text-xs truncate">{profile.goal}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {goals.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setGoalMenuOpen((v) => !v)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-surface-secondary hover:bg-brand-50 border border-line text-ink-secondary transition-colors"
              aria-haspopup="listbox"
              aria-expanded={goalMenuOpen}
            >
              <span className="truncate max-w-[140px]">{activeGoal?.roleTitle ?? 'Select goal'}</span>
              <ChevronDown size={14} strokeWidth={1.75} aria-hidden="true" />
            </button>
            {goalMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setGoalMenuOpen(false)} aria-hidden="true" />
                <div className="absolute right-0 top-full mt-1.5 w-56 rounded-lg bg-white border border-line shadow-sm z-50 py-1" role="listbox">
                  {goals.map((g) => (
                    <button
                      key={g.roleId}
                      role="option"
                      aria-selected={g.isActive}
                      disabled={switching}
                      onClick={() => handleSwitch(g.roleId)}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left text-ink hover:bg-surface-secondary transition-colors disabled:opacity-50"
                    >
                      <span className="truncate">{g.roleTitle}</span>
                      {g.isActive && <Check size={14} strokeWidth={1.75} className="text-brand-500 shrink-0" aria-hidden="true" />}
                    </button>
                  ))}
                  <div className="border-t border-line mt-1 pt-1">
                    <Link
                      to="/goals"
                      onClick={() => setGoalMenuOpen(false)}
                      className="block px-3 py-2 text-xs text-brand-500 hover:text-brand-600 transition-colors"
                    >
                      Manage goals →
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {sessionId && analysis && (
          <Link
            to="/coach"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-brand-50 hover:bg-brand-100 border border-brand-200 text-brand-600 transition-colors"
          >
            <Sparkles size={14} strokeWidth={1.75} aria-hidden="true" />
            Ask PathPilot
          </Link>
        )}

        <button
          className="w-9 h-9 rounded-lg bg-surface-secondary border border-line flex items-center justify-center text-ink-secondary hover:text-ink transition-colors"
          aria-label="Notifications"
        >
          <Bell size={16} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
