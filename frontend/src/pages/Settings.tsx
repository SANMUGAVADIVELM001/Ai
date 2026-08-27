import { useEffect, useState } from 'react';
import { CircleCheck } from 'lucide-react';
import { api } from '../api.js';
import { useLearner } from '../context/LearnerContext.js';
import { LEARNING_PREFERENCE_OPTIONS, type AIStatus } from '../types.js';

// Vite exposes import.meta.env at runtime but this project has no
// vite/client type declaration file yet, so this is read via a loosely
// typed cast rather than adding a new ambient-types file for one flag.
const isDevMode: boolean = (import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV ?? false;

const DEMO_SKILLS = [
  'Python',
  'NumPy',
  'Pandas',
  'Mathematics',
  'Statistics',
  'SQL',
  'Machine Learning',
  'Model Evaluation',
  'Deep Learning',
  'MLOps',
];

export default function Settings() {
  const { learnerId, profile, setProfile, resetMilestoneOverrides } = useLearner();
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null);
  const [cleared, setCleared] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);
  const [demoMessage, setDemoMessage] = useState<string | null>(null);

  useEffect(() => {
    api.getAiStatus().then(setAiStatus).catch(() => setAiStatus(null));
  }, []);

  function togglePreference(tag: string) {
    if (!profile) return;
    const has = profile.learningPreferences.includes(tag);
    setProfile({
      ...profile,
      learningPreferences: has ? profile.learningPreferences.filter((t) => t !== tag) : [...profile.learningPreferences, tag],
    });
  }

  function handleClearOverrides() {
    resetMilestoneOverrides();
    setCleared(true);
    setTimeout(() => setCleared(false), 2000);
  }

  async function handleSimulate(outcome: 'strong' | 'weak') {
    if (!profile?.roleId || demoBusy) return;
    setDemoBusy(true);
    setDemoMessage(null);
    try {
      for (const skill of DEMO_SKILLS) {
        await api.devSimulateAttempt(learnerId, profile.roleId, skill, outcome);
      }
      setDemoMessage(`Simulated ${outcome} performance across all skills. Visit Roadmap or Dashboard to see the effect.`);
    } catch {
      setDemoMessage('Simulation failed — dev routes are only available when the backend runs outside production mode.');
    } finally {
      setDemoBusy(false);
    }
  }

  async function handleResetDemo() {
    if (demoBusy) return;
    setDemoBusy(true);
    setDemoMessage(null);
    try {
      await api.devReset(learnerId);
      resetMilestoneOverrides();
      setDemoMessage('Demo progress reset for this learner.');
    } catch {
      setDemoMessage('Reset failed — dev routes are only available when the backend runs outside production mode.');
    } finally {
      setDemoBusy(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink mb-1">Settings</h1>
      <p className="text-ink-secondary mb-8">Preferences and local app state.</p>

      <div className="flex flex-col gap-6">
        <section className="p-5 rounded-xl bg-white border border-line shadow-sm">
          <h2 className="text-ink font-semibold text-sm mb-1">Learning Preferences</h2>
          <p className="text-ink-muted text-xs mb-3">Used to rank recommended resources.</p>
          {profile ? (
            <div className="flex flex-wrap gap-2">
              {LEARNING_PREFERENCE_OPTIONS.map((opt) => {
                const active = profile.learningPreferences.includes(opt.tag);
                return (
                  <button
                    key={opt.tag}
                    onClick={() => togglePreference(opt.tag)}
                    className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                      active
                        ? 'bg-brand-100 border-brand-300 text-brand-600'
                        : 'bg-white border-line text-ink-secondary hover:bg-surface-secondary'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-ink-muted text-sm">Complete the assessment to set learning preferences.</p>
          )}
        </section>

        <section className="p-5 rounded-xl bg-white border border-line shadow-sm">
          <h2 className="text-ink font-semibold text-sm mb-1">Local Progress</h2>
          <p className="text-ink-muted text-xs mb-3">
            Milestone "in progress" / "completed" marks are stored only in this browser.
          </p>
          <button
            onClick={handleClearOverrides}
            className="px-4 py-2 rounded-lg bg-white hover:bg-surface-secondary border border-line text-ink-secondary text-sm font-medium transition-colors"
          >
            {cleared ? (
              <span className="inline-flex items-center gap-1.5">
                <CircleCheck size={14} strokeWidth={1.75} aria-hidden="true" /> Cleared
              </span>
            ) : (
              'Clear my local progress'
            )}
          </button>
        </section>

        {isDevMode && (
          <section className="p-5 rounded-xl bg-white border border-line shadow-sm">
            <h2 className="text-ink font-semibold text-sm mb-1">Demo Controls</h2>
            <p className="text-ink-muted text-xs mb-3">
              Development-only. Simulates assessment outcomes to demonstrate adaptive roadmap behavior without
              manually answering every question.
            </p>
            {!profile?.roleId ? (
              <p className="text-ink-muted text-sm">Complete the diagnostic assessment first.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleSimulate('strong')}
                  disabled={demoBusy}
                  className="px-4 py-2 rounded-lg bg-success-bg hover:bg-success-bg border border-success text-success text-sm font-medium transition-colors disabled:opacity-40"
                >
                  Simulate Strong Performance
                </button>
                <button
                  onClick={() => handleSimulate('weak')}
                  disabled={demoBusy}
                  className="px-4 py-2 rounded-lg bg-error-bg hover:bg-error-bg border border-error text-error text-sm font-medium transition-colors disabled:opacity-40"
                >
                  Simulate Weak Performance
                </button>
                <button
                  onClick={handleResetDemo}
                  disabled={demoBusy}
                  className="px-4 py-2 rounded-lg bg-white hover:bg-surface-secondary border border-line text-ink-secondary text-sm font-medium transition-colors disabled:opacity-40"
                >
                  Reset Demo Progress
                </button>
              </div>
            )}
            {demoMessage && <p className="text-ink-secondary text-xs mt-3">{demoMessage}</p>}
          </section>
        )}

        <section className="p-5 rounded-xl bg-white border border-line shadow-sm">
          <h2 className="text-ink font-semibold text-sm mb-1">AI Service</h2>
          {aiStatus ? (
            <p className="text-ink-secondary text-sm">
              {aiStatus.configured ? (
                <span className="inline-flex items-center gap-1.5">
                  <CircleCheck size={14} strokeWidth={1.75} aria-hidden="true" />
                  Connected — <span className="text-ink">{aiStatus.provider}</span> ({aiStatus.model})
                </span>
              ) : (
                'Not configured — AI features fall back to deterministic recommendations.'
              )}
            </p>
          ) : (
            <p className="text-ink-muted text-sm">Checking status...</p>
          )}
        </section>
      </div>
    </div>
  );
}
