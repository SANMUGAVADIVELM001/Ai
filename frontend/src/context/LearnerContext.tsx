import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext.js';
import type { LearnerProfile, MilestoneStatus, ModuleProgressRecord, NextBestAction, Roadmap, SkillAnalysisResult } from '../types.js';

function milestoneOverridesKey(learnerId: string): string {
  return `pathai:${learnerId}:milestoneOverrides`;
}
function profileKey(learnerId: string): string {
  return `pathai:${learnerId}:profile`;
}
function sessionKey(learnerId: string): string {
  return `pathai:${learnerId}:sessionId`;
}

type MilestoneOverrideStatus = 'in_progress' | 'completed';

interface MilestoneOverride {
  status: MilestoneOverrideStatus;
  updatedAt: number;
}

function loadFromStorage<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function saveToStorage(key: string, value: unknown): void {
  try {
    if (value === null || value === undefined) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch {
    // localStorage unavailable — state simply won't persist across reloads.
  }
}

function loadOverrides(learnerId: string): Record<string, MilestoneOverride> {
  const raw = loadFromStorage<Record<string, MilestoneOverrideStatus | MilestoneOverride>>(milestoneOverridesKey(learnerId));
  if (!raw) return {};
  // Migrate the old bare-string shape (pre-dashboard-IA) to the timestamped shape.
  const migrated: Record<string, MilestoneOverride> = {};
  for (const [id, value] of Object.entries(raw)) {
    migrated[id] = typeof value === 'string' ? { status: value, updatedAt: 0 } : value;
  }
  return migrated;
}

interface LearnerContextValue {
  /** The authenticated user's id — LearnerProvider only ever mounts inside ProtectedRoute, so this is always available. */
  learnerId: string;
  profile: LearnerProfile | null;
  setProfile: (p: LearnerProfile) => void;
  sessionId: string | null;
  setSessionId: (id: string | null) => void;
  analysis: SkillAnalysisResult | null;
  setAnalysis: (a: SkillAnalysisResult | null) => void;
  roadmap: Roadmap | null;
  setRoadmap: (r: Roadmap | null) => void;
  moduleProgress: Record<string, ModuleProgressRecord>;
  setModuleProgress: (p: Record<string, ModuleProgressRecord>) => void;
  nextBestAction: NextBestAction | null;
  setNextBestAction: (a: NextBestAction | null) => void;
  milestoneOverrides: Record<string, MilestoneOverride>;
  setMilestoneInProgress: (milestoneId: string) => void;
  markMilestoneCompleted: (milestoneId: string) => void;
  effectiveStatus: (milestoneId: string, serverStatus: MilestoneStatus) => MilestoneStatus;
  /**
   * Resets goal/session/assessment/roadmap state (e.g. before retaking the
   * diagnostic). Leaves milestone overrides AND learnerId untouched —
   * persisted server-side mastery/module history for this learner is not
   * wiped just because a new diagnostic goal was entered.
   */
  clearLearnerState: () => void;
  /** Clears client-side milestone progress overrides only. */
  resetMilestoneOverrides: () => void;
}

const LearnerContext = createContext<LearnerContextValue | undefined>(undefined);

export function LearnerProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const learnerId = user!.id;
  const [profile, setProfileState] = useState<LearnerProfile | null>(() => loadFromStorage(profileKey(learnerId)));
  const [sessionId, setSessionIdState] = useState<string | null>(() => loadFromStorage(sessionKey(learnerId)));
  const [analysis, setAnalysis] = useState<SkillAnalysisResult | null>(null);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [moduleProgress, setModuleProgress] = useState<Record<string, ModuleProgressRecord>>({});
  const [nextBestAction, setNextBestAction] = useState<NextBestAction | null>(null);
  const [milestoneOverrides, setMilestoneOverrides] = useState<Record<string, MilestoneOverride>>(() => loadOverrides(learnerId));

  useEffect(() => {
    saveToStorage(milestoneOverridesKey(learnerId), milestoneOverrides);
  }, [learnerId, milestoneOverrides]);

  function setProfile(p: LearnerProfile) {
    setProfileState(p);
    saveToStorage(profileKey(learnerId), p);
  }

  function setSessionId(id: string | null) {
    setSessionIdState(id);
    saveToStorage(sessionKey(learnerId), id);
  }

  function setMilestoneInProgress(milestoneId: string) {
    setMilestoneOverrides((prev) => ({ ...prev, [milestoneId]: { status: 'in_progress', updatedAt: Date.now() } }));
  }

  function markMilestoneCompleted(milestoneId: string) {
    setMilestoneOverrides((prev) => ({ ...prev, [milestoneId]: { status: 'completed', updatedAt: Date.now() } }));
  }

  function effectiveStatus(milestoneId: string, serverStatus: MilestoneStatus): MilestoneStatus {
    const override = milestoneOverrides[milestoneId];
    if (!override) return serverStatus;
    // A server-locked milestone can't be overridden client-side (prerequisites still apply).
    if (serverStatus === 'locked') return serverStatus;
    return override.status;
  }

  function clearLearnerState() {
    setProfileState(null);
    setSessionIdState(null);
    setAnalysis(null);
    setRoadmap(null);
    saveToStorage(profileKey(learnerId), null);
    saveToStorage(sessionKey(learnerId), null);
  }

  function resetMilestoneOverrides() {
    setMilestoneOverrides({});
  }

  return (
    <LearnerContext.Provider
      value={{
        learnerId,
        profile,
        setProfile,
        sessionId,
        setSessionId,
        analysis,
        setAnalysis,
        roadmap,
        setRoadmap,
        moduleProgress,
        setModuleProgress,
        nextBestAction,
        setNextBestAction,
        milestoneOverrides,
        setMilestoneInProgress,
        markMilestoneCompleted,
        effectiveStatus,
        clearLearnerState,
        resetMilestoneOverrides,
      }}
    >
      {children}
    </LearnerContext.Provider>
  );
}

export function useLearner(): LearnerContextValue {
  const ctx = useContext(LearnerContext);
  if (!ctx) throw new Error('useLearner must be used within LearnerProvider');
  return ctx;
}
