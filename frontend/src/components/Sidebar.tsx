import { NavLink } from 'react-router-dom';
import {
  House,
  Target,
  Brain,
  ChartNoAxesCombined,
  Map,
  BookOpen,
  Rocket,
  ClipboardCheck,
  Sparkles,
  LayoutDashboard,
  UserRound,
  Settings as SettingsIcon,
  LogOut,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import Logo from './Logo.js';

interface NavItem {
  to: string;
  label: string;
  Icon: LucideIcon;
}

const PRIMARY_ITEMS: NavItem[] = [
  { to: '/', label: 'Home', Icon: House },
  { to: '/goals', label: 'My Goals', Icon: Target },
  { to: '/assessment', label: 'Assessment', Icon: Brain },
  { to: '/skills', label: 'My Skills', Icon: ChartNoAxesCombined },
  { to: '/roadmap', label: 'Roadmap', Icon: Map },
  { to: '/resources', label: 'Resources', Icon: BookOpen },
  { to: '/projects', label: 'Projects', Icon: Rocket },
  { to: '/assessments', label: 'Assessments', Icon: ClipboardCheck },
  { to: '/coach', label: 'AI Coach', Icon: Sparkles },
  { to: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
];

const PROFILE_ITEMS: NavItem[] = [
  { to: '/profile', label: 'Learner Profile', Icon: UserRound },
  { to: '/settings', label: 'Settings', Icon: SettingsIcon },
];

interface Props {
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export default function Sidebar({ collapsed, mobileOpen, onCloseMobile }: Props) {
  const { user, logout } = useAuth();

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/30 z-40 md:hidden" onClick={onCloseMobile} aria-hidden="true" />
      )}
      <aside
        className={`z-50 bg-white border-r border-line flex flex-col shrink-0 h-screen fixed md:sticky top-0 left-0 transition-transform duration-200 md:transition-[width] ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${collapsed ? 'md:w-[76px]' : 'w-[240px]'}`}
      >
        <div className="px-4 py-5 border-b border-line flex items-center gap-2 shrink-0">
          <Logo size={26} />
          {!collapsed && (
            <div className="min-w-0">
              <p className="font-semibold text-ink tracking-tight leading-none">PathAI</p>
              <p className="text-[10px] text-ink-muted mt-1 truncate">Personalized Learning Path Recommender</p>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          <SidebarSection label="Main" items={PRIMARY_ITEMS} collapsed={collapsed} onNavigate={onCloseMobile} />
          <SidebarSection label="Profile" items={PROFILE_ITEMS} collapsed={collapsed} onNavigate={onCloseMobile} />
        </nav>

        <div className="border-t border-line p-3 shrink-0">
          {user && !collapsed && (
            <NavLink
              to="/profile"
              onClick={onCloseMobile}
              className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-surface-secondary transition-colors mb-1"
            >
              <div className="w-8 h-8 rounded-full bg-brand-100 border border-brand-200 flex items-center justify-center text-brand-600 text-xs font-semibold shrink-0">
                {user.name.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-ink text-sm font-medium truncate leading-tight">{user.name}</p>
                <p className="text-ink-muted text-xs truncate leading-tight">{user.email}</p>
              </div>
            </NavLink>
          )}
          <button
            onClick={logout}
            aria-label="Log out"
            title={collapsed ? 'Log out' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-ink-secondary hover:bg-surface-secondary hover:text-ink transition-colors ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <LogOut size={18} strokeWidth={1.75} className="shrink-0" aria-hidden="true" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

function SidebarSection({
  label,
  items,
  collapsed,
  onNavigate,
}: {
  label: string;
  items: NavItem[];
  collapsed: boolean;
  onNavigate: () => void;
}) {
  return (
    <div className="mb-2">
      {!collapsed && <p className="px-5 mb-2 text-[10px] font-semibold tracking-wider text-ink-muted">{label.toUpperCase()}</p>}
      <div className="px-2 flex flex-col gap-0.5">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            aria-label={item.label}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive ? 'bg-brand-100 text-brand-500 font-medium' : 'text-ink-secondary hover:bg-brand-50 hover:text-ink'
              } ${collapsed ? 'justify-center' : ''}`
            }
          >
            <item.Icon size={18} strokeWidth={1.75} className="shrink-0" aria-hidden="true" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </div>
    </div>
  );
}
