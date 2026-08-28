import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext.js';
import { api } from '../api.js';
import type { GoalSummary, LearnerProfile, ModuleProgressRecord, NextBestAction, Roadmap, SkillAnalysisResult } from '../types.js';

function profilesByGoalKey(learnerId: string): string {
  return `pathai:${learnerId}:profilesByGoal`;
}
function sessionKey(learnerId: string): string {
  return `pathai:${learnerId}:sessionId`;
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
  /**
   * Resets goal/session/assessment/roadmap state (e.g. before retaking the
   * diagnostic). Leaves learnerId untouched — persisted server-side
   * mastery/module history for this learner is not wiped just because a new
   * diagnostic goal was entered.
   */
  clearLearnerState: () => void;

  // ---- Multi-goal support ----
  /** Every goal (role) this learner has ever started, each with independent server-side progress. */
  goals: GoalSummary[];
  goalsLoading: boolean;
  /** Re-fetches the goal list from the server (call after completing a diagnostic for a new/existing goal). */
  refreshGoals: () => Promise<void>;
  /**
   * Switches the active goal: persists the choice server-side, swaps in that
   * goal's locally-cached LearnerProfile (goal text/timeline/preferences),
   * and clears analysis/roadmap/moduleProgress/nextBestAction/sessionId so
   * the data hooks re-fetch fresh state for the new roleId. Other goals'
   * server-side mastery/assessment history/module progress are never
   * touched by this — they're stored independently, keyed by roleId.
   */
  switchGoal: (roleId: string) => Promise<void>;
}

const LearnerContext = createContext<LearnerContextValue | undefined>(undefined);

export function LearnerProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const learnerId = user!.id;

  const [profilesByGoal, setProfilesByGoal] = useState<Record<string, LearnerProfile>>(
    () => loadFromStorage(profilesByGoalKey(learnerId)) ?? {}
  );
  const [profile, setProfileState] = useState<LearnerProfile | null>(() => {
    const byGoal = loadFromStorage<Record<string, LearnerProfile>>(profilesByGoalKey(learnerId)) ?? {};
    const values = Object.values(byGoal);
    return values[0] ?? null;
  });
  const [sessionId, setSessionIdState] = useState<string | null>(() => loadFromStorage(sessionKey(learnerId)));
  const [analysis, setAnalysis] = useState<SkillAnalysisResult | null>(null);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [moduleProgress, setModuleProgress] = useState<Record<string, ModuleProgressRecord>>({});
  const [nextBestAction, setNextBestAction] = useState<NextBestAction | null>(null);

  const [goals, setGoals] = useState<GoalSummary[]>([]);
  const [goalsLoading, setGoalsLoading] = useState(true);

  const refreshGoals = useCallback(async () => {
    setGoalsLoading(true);
    try {
      const { goals: list, activeRoleId } = await api.getGoals();
      setGoals(list);
      // If the server has an active goal but this tab's profile doesn't
      // match it (e.g. after a hard refresh), prefer the cached profile for
      // that roleId so goal text/timeline/preferences survive reloads.
      if (activeRoleId && profile?.roleId !== activeRoleId) {
        const cached = profilesByGoal[activeRoleId];
        if (cached) setProfileState(cached);
      }
    } catch {
      setGoals([]);
    } finally {
      setGoalsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    refreshGoals();
  }, [refreshGoals]);

  function setProfile(p: LearnerProfile) {
    setProfileState(p);
    if (p.roleId) {
      const next = { ...profilesByGoal, [p.roleId]: p };
      setProfilesByGoal(next);
      saveToStorage(profilesByGoalKey(learnerId), next);
    }
  }

  function setSessionId(id: string | null) {
    setSessionIdState(id);
    saveToStorage(sessionKey(learnerId), id);
  }

  async function switchGoal(roleId: string) {
    await api.activateGoal(roleId);
    setAnalysis(null);
    setRoadmap(null);
    setModuleProgress({});
    setNextBestAction(null);
    setSessionId(null);
    const cached = profilesByGoal[roleId];
    if (cached) {
      setProfileState(cached);
    } else {
      // First time switching to a goal started elsewhere (no cached profile
      // in this browser) — build a minimal profile from the role so the
      // roadmap/analysis hooks (which key off profile.roleId) can still run.
      const { roles } = await api.getRoles();
      const role = roles.find((r) => r.id === roleId);
      const minimal: LearnerProfile = {
        goal: role?.title ?? roleId,
        roleId,
        targetDuration: null,
        currentSkills: [],
        studyTimePerDay: null,
        learningPreferences: [],
        experienceLevel: null,
      };
      setProfile(minimal);
    }
    await refreshGoals();
  }

  function clearLearnerState() {
    setProfileState(null);
    setSessionIdState(null);
    setAnalysis(null);
    setRoadmap(null);
    saveToStorage(sessionKey(learnerId), null);
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
        clearLearnerState,
        goals,
        goalsLoading,
        refreshGoals,
        switchGoal,
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
