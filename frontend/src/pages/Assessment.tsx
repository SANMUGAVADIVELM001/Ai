import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Sparkles, CircleCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../api.js';
import { useLearner } from '../context/LearnerContext.js';
import { useEnsureAnalysis } from '../hooks/useEnsureData.js';
import ProgressBar from '../components/ProgressBar.js';
import { LEARNING_PREFERENCE_OPTIONS, type AssessmentQuestion, type RoleSummary, type SubmitAnswerResponse } from '../types.js';

const EXAMPLE_GOALS = [
  'I want to become a Machine Learning Engineer in 6 months. I know basic Python and can study 2 hours per day.',
  'I want to become a Data Scientist in 1 year. I know some SQL and Excel, and can study 1 hour per day.',
  'I want to become a Full Stack Developer in 4 months. I know HTML and CSS, and can study 3 hours per day.',
  'I want to become a Cloud Engineer in 8 months. I know basic Linux, and can study 1.5 hours per day.',
  'I want to become a Data Analyst in 3 months. I know Excel, and can study 2 hours per day.',
];

type Step = 'goal' | 'intro' | 'test' | 'result';

/**
 * Single sidebar-reachable "Assessment" page. Internally steps through
 * goal -> intro -> test -> result as local state rather than separate
 * routes, since these are steps of one task (not independently useful deep
 * links) — navigation between them never leaves this route.
 */
export default function Assessment() {
  const { profile, sessionId, analysis } = useLearner();
  const [searchParams, setSearchParams] = useSearchParams();

  // Whether this page mount already had a session with no analysis yet
  // (i.e. the diagnostic was in progress before this page loaded, most
  // likely from a hard refresh). Only in that case do we self-fetch/redirect
  // to results — a session started locally via IntroStep must run through
  // TestStep to completion, not be short-circuited by fetching a "result"
  // for zero answered questions.
  const [resumingExistingSession] = useState(() => !!sessionId && !analysis);
  const { loading: analysisLoading } = useEnsureAnalysis(resumingExistingSession);

  const [step, setStepState] = useState<Step>(() => {
    const fromUrl = searchParams.get('step') as Step | null;
    if (fromUrl && ['goal', 'intro', 'test', 'result'].includes(fromUrl)) return fromUrl;
    if (sessionId && analysis) return 'result';
    if (sessionId) return 'test';
    if (profile) return 'intro';
    return 'goal';
  });

  // Reflects the current step into the URL (?step=...) so the browser's
  // Back/Forward buttons move between steps instead of leaving the page —
  // pushState per transition, replaceState for the sync-only initial mount.
  function setStep(next: Step, replace = false) {
    setStepState(next);
    const params = new URLSearchParams(searchParams);
    params.set('step', next);
    setSearchParams(params, { replace });
  }

  useEffect(() => {
    setStep(step, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Following browser Back/Forward: when the URL's step param changes from
  // outside our own setStep calls (i.e. a popstate), sync local state to it.
  useEffect(() => {
    const fromUrl = searchParams.get('step') as Step | null;
    if (fromUrl && fromUrl !== step && ['goal', 'intro', 'test', 'result'].includes(fromUrl)) {
      setStepState(fromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Keep step in sync only when resuming a pre-existing session (e.g. after
  // refresh); a session started locally this visit progresses via the
  // onDone callbacks passed to each step instead.
  useEffect(() => {
    if (!resumingExistingSession) return;
    if (sessionId && analysis) setStep('result', true);
    else if (sessionId && !analysis && !analysisLoading) setStep('test', true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumingExistingSession, sessionId, analysis, analysisLoading]);

  if (resumingExistingSession && analysisLoading) {
    return <p className="text-ink-secondary">Loading your assessment...</p>;
  }

  if (step === 'goal') return <GoalStep onDone={() => setStep('intro')} />;
  if (step === 'intro') return <IntroStep onDone={() => setStep('test')} onBack={() => setStep('goal')} />;
  if (step === 'test') return <TestStep onDone={() => setStep('result')} />;
  return <ResultStep onRetake={() => setStep('goal')} />;
}

function GoalStep({ onDone }: { onDone: () => void }) {
  const [goalText, setGoalText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setProfile, clearLearnerState } = useLearner();

  async function handleSubmit() {
    if (!goalText.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const { profile } = await api.parseGoalAi(goalText);
      if (!profile.roleId) {
        setError("We couldn't match your goal to a supported role yet. Try mentioning a role like \"Machine Learning Engineer\" or \"Data Analyst\".");
        setLoading(false);
        return;
      }
      clearLearnerState();
      setProfile(profile);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink mb-2">What's your learning goal?</h1>
      <p className="text-ink-secondary mb-1">
        Describe it in your own words — your target role, timeline, current skills, and how much time you can study.
      </p>
      <p className="text-brand-600 text-xs mb-6 flex items-center gap-1.5">
        <Sparkles size={12} strokeWidth={1.75} aria-hidden="true" /> AI-powered — understands natural phrasing and preferences
      </p>

      <textarea
        value={goalText}
        onChange={(e) => setGoalText(e.target.value)}
        rows={5}
        placeholder="e.g. I want to become a Machine Learning Engineer in 6 months. I know basic Python and can study 2 hours per day."
        className="w-full rounded-xl bg-white border border-line focus:border-brand-500 outline-none p-4 text-ink placeholder-ink-muted resize-none"
      />

      {error && <p className="text-error text-sm mt-3">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={loading || !goalText.trim()}
        className="mt-4 px-6 py-2.5 rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold transition-colors"
      >
        {loading ? 'PathPilot is analyzing your goal...' : 'Continue'}
      </button>

      <div className="mt-10">
        <p className="text-ink-muted text-sm mb-3">Or try an example:</p>
        <div className="flex flex-col gap-2">
          {EXAMPLE_GOALS.map((goal) => (
            <button
              key={goal}
              onClick={() => setGoalText(goal)}
              className="text-left text-sm px-4 py-3 rounded-lg bg-white hover:bg-surface-secondary border border-line text-ink-secondary transition-colors"
            >
              {goal}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function IntroStep({ onDone, onBack }: { onDone: () => void; onBack: () => void }) {
  const { profile, setProfile, setSessionId } = useLearner();
  const [role, setRole] = useState<RoleSummary | null>(null);
  const [starting, setStarting] = useState(false);
  const [selectedPrefs, setSelectedPrefs] = useState<string[]>(profile?.learningPreferences ?? []);

  useEffect(() => {
    if (!profile) {
      onBack();
      return;
    }
    api.getRoles().then(({ roles }) => {
      setRole(roles.find((r) => r.id === profile.roleId) ?? null);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  function togglePreference(tag: string) {
    setSelectedPrefs((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  async function handleStart() {
    if (!profile?.roleId) return;
    setProfile({ ...profile, learningPreferences: selectedPrefs });
    setStarting(true);
    const res = await api.startAssessment(profile.roleId);
    setSessionId(res.sessionId);
    onDone();
  }

  if (!profile) return null;

  return (
    <div>
      <div className="mb-6 p-4 rounded-xl bg-brand-50 border border-brand-200">
        <p className="text-ink-secondary text-sm">
          Goal: <span className="text-ink font-medium">{profile.goal}</span>
        </p>
      </div>

      <h1 className="text-2xl font-bold text-ink mb-2">Let's find your real skill level</h1>
      <p className="text-ink-secondary mb-6">
        Before we build your roadmap for <span className="text-ink">{role?.title ?? '...'}</span>, we'll run a
        short adaptive diagnostic assessment. Questions get harder or easier based on how you answer, so we can
        accurately pinpoint your mastery in each skill area — no manual self-rating needed.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <InfoCard title="Adaptive" desc="Difficulty adjusts per skill based on your answers." />
        <InfoCard title="Multi-skill" desc="Covers every skill required for your target role." />
        <InfoCard title="No guessing" desc="Your level is measured, not self-reported." />
      </div>

      <div className="mb-8">
        <p className="text-ink-secondary text-sm font-medium mb-1">How do you prefer to learn? (optional)</p>
        <p className="text-ink-muted text-xs mb-3">This helps us rank recommended resources later — pick as many as apply.</p>
        <div className="flex flex-wrap gap-2">
          {LEARNING_PREFERENCE_OPTIONS.map((opt) => {
            const active = selectedPrefs.includes(opt.tag);
            return (
              <button
                key={opt.tag}
                onClick={() => togglePreference(opt.tag)}
                className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                  active ? 'bg-brand-100 border-brand-500 text-brand-600' : 'bg-white border-line text-ink-secondary hover:bg-surface-secondary'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          disabled={starting}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg border border-line text-ink-secondary hover:bg-surface-secondary disabled:opacity-40 text-sm font-medium transition-colors"
        >
          <ChevronLeft size={16} strokeWidth={1.75} aria-hidden="true" /> Back
        </button>
        <button
          onClick={handleStart}
          disabled={starting || !role}
          className="px-6 py-2.5 rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white font-semibold transition-colors"
        >
          {starting ? 'Starting...' : 'Start Assessment'}
        </button>
      </div>
    </div>
  );
}

function InfoCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="p-4 rounded-xl bg-white border border-line shadow-sm">
      <h3 className="text-ink font-semibold text-sm mb-1">{title}</h3>
      <p className="text-ink-secondary text-xs">{desc}</p>
    </div>
  );
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'text-success bg-success-bg',
  medium: 'text-warning bg-warning-bg',
  hard: 'text-error bg-error-bg',
};

interface AnsweredEntry {
  question: AssessmentQuestion;
  skillsRemaining: number;
  totalSkills: number;
  selected: number | null;
  feedback: SubmitAnswerResponse | null;
}

/**
 * Maintains a local, append-only history of every question served this
 * session so Previous/Next can move between them without ever asking the
 * server for a "previous" question (the adaptive engine only knows how to
 * serve the next one). Going back never mutates server state — it's a
 * read-only view of an already-answered entry, selection and feedback
 * included. Only advancing past the newest entry calls the server, and only
 * once per new question (re-visiting a later entry after going back does
 * not re-fetch).
 */
function TestStep({ onDone }: { onDone: () => void }) {
  const { sessionId, setAnalysis } = useLearner();

  const [history, setHistory] = useState<AnsweredEntry[]>([]);
  const [viewIndex, setViewIndex] = useState(-1);
  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    loadNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  async function loadNext() {
    if (!sessionId) return;
    setLoading(true);
    const res = await api.nextQuestion(sessionId);
    if (res.done || !res.question) {
      setFinishing(true);
      const { analysis } = await api.getResult(sessionId);
      setAnalysis(analysis);
      onDone();
      return;
    }
    setHistory((prev) => {
      const next = [...prev, { question: res.question!, skillsRemaining: res.skillsRemaining ?? 0, totalSkills: res.totalSkills ?? 0, selected: null, feedback: null }];
      setViewIndex(next.length - 1);
      return next;
    });
    setLoading(false);
  }

  async function handleSelect(optionIndex: number) {
    const current = history[viewIndex];
    if (!sessionId || !current || current.feedback) return;
    const result = await api.submitAnswer(sessionId, current.question.id, optionIndex);
    setHistory((prev) => prev.map((entry, i) => (i === viewIndex ? { ...entry, selected: optionIndex, feedback: result } : entry)));
  }

  function goBack() {
    setViewIndex((i) => Math.max(0, i - 1));
  }

  async function goForward() {
    if (viewIndex < history.length - 1) {
      setViewIndex((i) => i + 1);
      return;
    }
    // At the newest entry — advancing means asking the server for the next question.
    await loadNext();
  }

  if ((loading && history.length === 0) || finishing) {
    return <p className="text-ink-secondary">Loading question...</p>;
  }

  const current = history[viewIndex];
  if (!current) return <p className="text-ink-secondary">Loading question...</p>;

  const { question, selected, feedback } = current;
  const skillsCompleted = current.totalSkills - current.skillsRemaining;
  const overallProgress = current.totalSkills > 0 ? (skillsCompleted / current.totalSkills) * 100 : 0;
  const isReviewingPast = viewIndex < history.length - 1;

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-ink-secondary mb-2">
          <span>
            Skill {skillsCompleted + 1} of {current.totalSkills}
          </span>
          <span>Question {viewIndex + 1}</span>
        </div>
        <ProgressBar value={overallProgress} />
      </div>

      <div className="p-6 rounded-2xl bg-white border border-line shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <span className="px-2.5 py-1 rounded-md bg-brand-50 text-brand-600 text-xs font-medium">{question.skill}</span>
          <span className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize ${DIFFICULTY_COLORS[question.difficulty]}`}>
            {question.difficulty}
          </span>
          {isReviewingPast && (
            <span className="px-2.5 py-1 rounded-md bg-surface-secondary text-ink-muted text-xs font-medium">Reviewing</span>
          )}
        </div>

        <h2 className="text-lg font-semibold text-ink mb-5">{question.question}</h2>

        <div className="flex flex-col gap-3">
          {question.options.map((opt, idx) => {
            const isSelected = selected === idx;
            const isCorrectOption = feedback && idx === feedback.correctAnswer;
            const isWrongSelected = feedback && isSelected && !feedback.correct;

            let cls = 'border-line bg-white hover:border-brand-300 text-ink';
            if (feedback) {
              if (isCorrectOption) cls = 'border-success bg-success-bg text-ink';
              else if (isWrongSelected) cls = 'border-error bg-error-bg text-ink';
              else cls = 'border-line bg-white text-ink-muted';
            } else if (isSelected) {
              cls = 'border-brand-500 bg-brand-50 text-ink';
            }

            return (
              <button
                key={idx}
                onClick={() => handleSelect(idx)}
                disabled={!!feedback}
                className={`text-left px-4 py-3 rounded-lg border transition-colors ${cls}`}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {feedback && (
          <div className="mt-5 p-4 rounded-lg bg-surface-secondary border border-line">
            <p className={`font-semibold text-sm mb-1 ${feedback.correct ? 'text-success' : 'text-error'}`}>
              {feedback.correct ? 'Correct' : 'Incorrect'}
            </p>
            <p className="text-ink-secondary text-sm">{feedback.explanation}</p>
          </div>
        )}

        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={goBack}
            disabled={viewIndex === 0}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg border border-line text-ink-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition-colors"
          >
            <ChevronLeft size={16} strokeWidth={1.75} aria-hidden="true" /> Previous
          </button>
          {feedback && (
            <button
              onClick={goForward}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold transition-colors"
            >
              {isReviewingPast ? (
                <>
                  Next <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
                </>
              ) : (
                'Next'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultStep({ onRetake }: { onRetake: () => void }) {
  const { analysis } = useLearner();
  if (!analysis) return <p className="text-ink-secondary">Loading your results...</p>;

  const totalQuestions = analysis.skillResults.reduce((sum, s) => sum + s.questionsAttempted, 0);
  const totalCorrect = analysis.skillResults.reduce((sum, s) => sum + s.correctAnswers, 0);

  return (
    <div className="text-center py-10">
      <div className="w-16 h-16 rounded-full bg-success-bg flex items-center justify-center mx-auto mb-5">
        <CircleCheck size={32} strokeWidth={1.75} className="text-success" aria-hidden="true" />
      </div>
      <h1 className="text-2xl font-bold text-ink mb-2">Diagnostic Completed</h1>
      <p className="text-ink-secondary mb-8">
        You answered {totalCorrect} of {totalQuestions} questions correctly across {analysis.skillResults.length} skills for{' '}
        <span className="text-ink">{analysis.roleTitle}</span>.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-lg mx-auto mb-10">
        <Stat label="Strongest" value={analysis.strongestSkills[0] ?? '—'} />
        <Stat label="Biggest Gap" value={analysis.highPriorityGaps[0] ?? analysis.weakestSkills[0] ?? '—'} />
        <Stat label="Skills Ready" value={String(analysis.sufficientSkills.length)} />
        <Stat label="High Priority" value={String(analysis.highPriorityGaps.length)} />
      </div>

      <div className="flex items-center justify-center gap-4">
        <Link
          to="/skills"
          className="px-8 py-3 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-semibold transition-colors"
        >
          View My Skills
        </Link>
        <button
          onClick={onRetake}
          className="px-6 py-3 rounded-lg bg-white hover:bg-surface-secondary border border-line text-ink-secondary text-sm font-medium transition-colors"
        >
          Retake with a new goal
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 rounded-xl bg-white border border-line shadow-sm">
      <p className="text-ink font-semibold text-sm truncate">{value}</p>
      <p className="text-ink-muted text-xs mt-1">{label}</p>
    </div>
  );
}
