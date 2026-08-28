import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardCheck,
  ChartNoAxesCombined,
  Sparkles,
  Target,
  TrendingUp,
  Clock,
  Map as MapIcon,
  BookOpen,
  Compass,
  LifeBuoy,
  Newspaper,
  Menu,
  X,
  ArrowRight,
  Globe,
  Mail,
  MessageCircle,
  type LucideIcon,
} from 'lucide-react';
import Logo from '../components/Logo.js';

const NAV_LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How It Works' },
  { href: '#about', label: 'About' },
  { href: '#resources', label: 'Resources' },
];

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Public marketing page shown at "/" to anonymous visitors (see App.tsx's
 * RootRoute). Every stat/claim here is either a real, counted product fact
 * (role/skill/resource counts) or a plainly-qualitative description of
 * behavior the app actually implements — no invented user-count or
 * satisfaction metrics.
 */
export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <About />
        <Resources />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}

function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-line">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Logo size={26} />
          <span className="text-ink font-bold tracking-tight">PathAI</span>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <button
              key={link.href}
              onClick={() => scrollToId(link.href.slice(1))}
              className="text-ink-secondary hover:text-ink text-sm font-medium transition-colors"
            >
              {link.label}
            </button>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link
            to="/login"
            className="px-4 py-2 rounded-lg text-ink-secondary hover:bg-surface-secondary text-sm font-medium transition-colors"
          >
            Login
          </Link>
          <Link
            to="/signup"
            className="px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors"
          >
            Sign Up
          </Link>
        </div>

        <button
          onClick={() => setMobileOpen((o) => !o)}
          className="md:hidden p-2 rounded-lg text-ink-secondary hover:bg-surface-secondary transition-colors"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileOpen ? <X size={22} strokeWidth={1.75} aria-hidden="true" /> : <Menu size={22} strokeWidth={1.75} aria-hidden="true" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-line bg-white px-4 py-4 flex flex-col gap-1">
          {NAV_LINKS.map((link) => (
            <button
              key={link.href}
              onClick={() => {
                setMobileOpen(false);
                scrollToId(link.href.slice(1));
              }}
              className="text-left px-3 py-2.5 rounded-lg text-ink-secondary hover:bg-surface-secondary text-sm font-medium transition-colors"
            >
              {link.label}
            </button>
          ))}
          <div className="flex items-center gap-3 mt-2 pt-3 border-t border-line">
            <Link
              to="/login"
              className="flex-1 text-center px-4 py-2.5 rounded-lg border border-line text-ink-secondary text-sm font-medium transition-colors"
            >
              Login
            </Link>
            <Link
              to="/signup"
              className="flex-1 text-center px-4 py-2.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors"
            >
              Sign Up
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

const JOURNEY_STEPS = [
  { icon: ClipboardCheck, label: 'Assessment', desc: 'Adaptive diagnostic test' },
  { icon: Target, label: 'Skill Gap Analysis', desc: 'AI finds what you’re missing' },
  { icon: MapIcon, label: 'Personalized Learning', desc: 'A roadmap built around your gaps' },
  { icon: BookOpen, label: 'Practice', desc: 'Curated free resources' },
  { icon: TrendingUp, label: 'Improvement', desc: 'Assess and get better' },
  { icon: Sparkles, label: 'Mastery', desc: 'Reach your target role' },
] as const;

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-16 pb-20 sm:pt-24 sm:pb-28 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 text-brand-600 text-xs font-medium mb-6">
            <Sparkles size={12} strokeWidth={1.75} aria-hidden="true" /> AI-Powered Learning Path Recommender
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-ink tracking-tight mb-5 leading-tight">
            Your learning path, <span className="text-brand-500">personalized by AI.</span>
          </h1>
          <p className="text-ink-secondary text-lg mb-8 max-w-lg">
            Take an adaptive assessment, discover your real skill gaps, and follow a roadmap built around your goal,
            your current level, and the time you actually have available.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 px-7 py-3 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-semibold transition-colors"
            >
              Get Started Free <ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" />
            </Link>
            <button
              onClick={() => scrollToId('how-it-works')}
              className="px-6 py-3 rounded-lg border border-line text-ink-secondary hover:bg-surface-secondary text-sm font-medium transition-colors"
            >
              See How It Works
            </button>
          </div>
        </div>

        <div className="relative max-w-full">
          <div className="flex flex-col gap-3">
            {JOURNEY_STEPS.map((step, i) => (
              <div
                key={step.label}
                className={`landing-journey-card flex items-center gap-4 p-4 rounded-xl bg-white border border-line shadow-sm max-w-full ${
                  i % 2 === 1 ? 'sm:ml-6' : ''
                }`}
                style={{ animationDelay: `${i * 120}ms` }}
              >
                <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center shrink-0">
                  <step.icon size={18} strokeWidth={1.75} className="text-brand-500" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-ink font-semibold text-sm">{step.label}</p>
                  <p className="text-ink-muted text-xs truncate">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

interface FeatureItem {
  icon: LucideIcon;
  title: string;
  desc: string;
}

const FEATURES: FeatureItem[] = [
  { icon: MapIcon, title: 'AI-Powered Learning Paths', desc: 'A prerequisite-aware roadmap generated from your actual skill gaps, not a generic curriculum.' },
  { icon: ClipboardCheck, title: 'Adaptive Assessments', desc: 'Questions get harder or easier per skill based on how you answer, so your level is measured, not guessed.' },
  { icon: Sparkles, title: 'AI Learning Coach', desc: 'Ask questions about your own progress and get answers grounded in your real assessment history.' },
  { icon: Target, title: 'Skill Gap Analysis', desc: 'See exactly where you stand against what your target role requires, skill by skill.' },
  { icon: ChartNoAxesCombined, title: 'Progress Tracking', desc: 'Mastery, module status, and next best action stay in sync everywhere you look.' },
  { icon: Clock, title: 'Time-Aware Learning Plans', desc: 'Tell us how many days you have, and every module’s study time is scaled to your real gaps and your pace.' },
];

function Features() {
  return (
    <section id="features" className="py-20 sm:py-28 bg-surface-secondary">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading eyebrow="Features" title="Everything you need to learn with intention" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-12">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="p-6 rounded-xl bg-white border border-line shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div className="w-11 h-11 rounded-full bg-brand-50 flex items-center justify-center mb-4">
                <f.icon size={20} strokeWidth={1.75} className="text-brand-500" aria-hidden="true" />
              </div>
              <h3 className="text-ink font-semibold mb-1.5">{f.title}</h3>
              <p className="text-ink-secondary text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  { n: '01', title: 'Assess', desc: 'Take an adaptive assessment to find your current skill level.' },
  { n: '02', title: 'Analyze', desc: 'AI analyzes your strengths, gaps, and prerequisites.' },
  { n: '03', title: 'Plan', desc: 'Get a roadmap built from your gaps and the days you have.' },
  { n: '04', title: 'Learn', desc: 'Work through curated, free resources for each module.' },
  { n: '05', title: 'Test & Improve', desc: 'Pass module assessments, or review and retry weak topics.' },
  { n: '06', title: 'Master', desc: 'Unlock the next module and reach your target role.' },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading eyebrow="How PathAI Works" title="A clear, step-by-step journey to your goal" />
        <div className="relative mt-14">
          <div className="hidden lg:block absolute top-6 left-0 right-0 h-px bg-line" aria-hidden="true" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6">
            {STEPS.map((step) => (
              <div key={step.n} className="relative flex flex-col items-center text-center">
                <div className="relative z-10 w-12 h-12 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold text-sm mb-4 shrink-0">
                  {step.n}
                </div>
                <h3 className="text-ink font-semibold text-sm mb-1">{step.title}</h3>
                <p className="text-ink-muted text-xs leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function About() {
  return (
    <section id="about" className="py-20 sm:py-28 bg-surface-secondary">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <p className="text-brand-600 text-xs font-semibold tracking-wide mb-3">ABOUT PATHAI</p>
          <h2 className="text-3xl font-bold text-ink tracking-tight mb-4">Built to close the gap between where you are and where you want to be</h2>
          <p className="text-ink-secondary leading-relaxed mb-4">
            PathAI starts with an adaptive diagnostic assessment to measure your real skill level, skill by skill —
            not a self-rating. From there it builds a prerequisite-aware roadmap: modules you're not ready for stay
            locked until their prerequisites are met, and the study time for each module scales with how big your
            actual gap is, using the number of days you tell us you have available.
          </p>
          <p className="text-ink-secondary leading-relaxed">
            Every module ends with an assessment. Pass, and the next module unlocks. Fall short, and PathAI surfaces
            your weak topics with targeted remedial resources before you retry — with a fresh set of questions.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <StatCard value="5" label="Career Paths" />
          <StatCard value="29" label="Skills Tracked" />
          <StatCard value="46" label="Free Resources" />
          <StatCard value="100%" label="Adaptive Roadmaps" />
        </div>
      </div>
    </section>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="p-6 rounded-xl bg-white border border-line shadow-sm text-center">
      <p className="text-brand-500 text-3xl font-bold mb-1">{value}</p>
      <p className="text-ink-secondary text-sm">{label}</p>
    </div>
  );
}

interface ResourceItem {
  icon: LucideIcon;
  title: string;
  desc: string;
  cta: string;
  to: string;
  comingSoon?: boolean;
}

const RESOURCE_ITEMS: ResourceItem[] = [
  { icon: Newspaper, title: 'Blog', desc: 'Learning science, product updates, and study tips.', cta: 'Read the blog', to: '#', comingSoon: true },
  { icon: Compass, title: 'Learning Guides', desc: 'In-depth guides for mastering specific skills.', cta: 'Browse guides', to: '#', comingSoon: true },
  { icon: MapIcon, title: 'Career Paths', desc: 'See the roles PathAI can build you a roadmap for today.', cta: 'Explore paths', to: '/signup' },
  { icon: LifeBuoy, title: 'Help Center', desc: 'Answers to common questions about assessments and roadmaps.', cta: 'Get help', to: '#', comingSoon: true },
];

function Resources() {
  return (
    <section id="resources" className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading eyebrow="Resources" title="More ways to learn with PathAI" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-12">
          {RESOURCE_ITEMS.map((r) => (
            <div key={r.title} className="p-6 rounded-xl bg-white border border-line shadow-sm flex flex-col">
              <div className="w-11 h-11 rounded-full bg-brand-50 flex items-center justify-center mb-4">
                <r.icon size={20} strokeWidth={1.75} className="text-brand-500" aria-hidden="true" />
              </div>
              <div className="flex items-center gap-2 mb-1.5">
                <h3 className="text-ink font-semibold">{r.title}</h3>
                {r.comingSoon && (
                  <span className="px-2 py-0.5 rounded-full bg-surface-secondary text-ink-muted text-[10px] font-medium">Coming soon</span>
                )}
              </div>
              <p className="text-ink-secondary text-sm leading-relaxed mb-4 flex-1">{r.desc}</p>
              {r.comingSoon ? (
                <span className="text-ink-muted text-sm font-medium">{r.cta}</span>
              ) : (
                <Link to={r.to} className="text-brand-500 hover:text-brand-600 text-sm font-medium transition-colors">
                  {r.cta} →
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="py-16 sm:py-20 bg-gradient-to-r from-brand-500 to-brand-700">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Ready to start your learning journey?</h2>
          <p className="text-white/80">Join learners upgrading their skills with a roadmap built just for them.</p>
        </div>
        <Link
          to="/signup"
          className="shrink-0 inline-flex items-center gap-2 px-7 py-3 rounded-lg bg-white text-brand-600 hover:bg-brand-50 font-semibold transition-colors"
        >
          Get Started Free <ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

const FOOTER_COLUMNS: { title: string; links: { label: string; to: string }[] }[] = [
  {
    title: 'Product',
    links: [
      { label: 'Features', to: '#features' },
      { label: 'How It Works', to: '#how-it-works' },
      { label: 'Sign Up', to: '/signup' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Blog', to: '#' },
      { label: 'Learning Guides', to: '#' },
      { label: 'Help Center', to: '#' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', to: '#' },
      { label: 'Terms of Service', to: '#' },
    ],
  },
];

function Footer() {
  return (
    <footer className="bg-ink text-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-14">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
          <div className="col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <Logo size={24} />
              <span className="font-bold tracking-tight">PathAI</span>
            </div>
            <p className="text-white/60 text-sm mb-4">Personalized Learning Path Recommender</p>
            <div className="flex items-center gap-3">
              <a href="#" aria-label="Website" className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                <Globe size={14} strokeWidth={1.75} aria-hidden="true" />
              </a>
              <a href="#" aria-label="Email" className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                <Mail size={14} strokeWidth={1.75} aria-hidden="true" />
              </a>
              <a href="#" aria-label="Community" className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                <MessageCircle size={14} strokeWidth={1.75} aria-hidden="true" />
              </a>
            </div>
          </div>

          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="text-white/90 text-sm font-semibold mb-3">{col.title}</h3>
              <ul className="flex flex-col gap-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.to.startsWith('#') ? (
                      <button
                        onClick={() => link.to !== '#' && scrollToId(link.to.slice(1))}
                        className="text-white/60 hover:text-white text-sm transition-colors text-left"
                      >
                        {link.label}
                      </button>
                    ) : (
                      <Link to={link.to} className="text-white/60 hover:text-white text-sm transition-colors">
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-white/10 text-white/40 text-xs text-center">
          © {new Date().getFullYear()} PathAI. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="text-center max-w-2xl mx-auto">
      <p className="text-brand-600 text-xs font-semibold tracking-wide mb-3">{eyebrow.toUpperCase()}</p>
      <h2 className="text-3xl font-bold text-ink tracking-tight">{title}</h2>
    </div>
  );
}
