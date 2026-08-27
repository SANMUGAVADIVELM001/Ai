import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useLearner } from '../context/LearnerContext.js';
import type { ModuleProgressRecord, NextBestAction, Roadmap, SkillAnalysisResult } from '../types.js';

/**
 * Self-fetches the diagnostic analysis if a session exists but the analysis
 * isn't in context yet (e.g. after a hard refresh on a deep route). If the
 * backend session is gone (process restarted), clears the stale session
 * instead of leaving the page stuck loading.
 */
export function useEnsureAnalysis(enabled = true): { analysis: SkillAnalysisResult | null; loading: boolean; needsAssessment: boolean } {
  const { sessionId, analysis, setAnalysis, setSessionId } = useLearner();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || analysis || !sessionId) return;
    let cancelled = false;
    setLoading(true);
    api
      .getResult(sessionId)
      .then(({ analysis }) => {
        if (!cancelled) setAnalysis(analysis);
      })
      .catch(() => {
        if (!cancelled) setSessionId(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, sessionId, analysis]);

  return { analysis, loading, needsAssessment: !sessionId && !analysis };
}

/**
 * Self-fetches the roadmap if profile/(session or persisted role) are
 * available but the roadmap isn't in context yet. Prefers the persisted
 * learnerId+roleId path (works even without a live session/analysis, e.g. a
 * returning learner after a backend restart) and falls back to the
 * sessionId path used right after finishing the diagnostic, before mastery
 * has necessarily propagated everywhere yet.
 */
export function useEnsureRoadmap(): { roadmap: Roadmap | null; loading: boolean; needsAnalysis: boolean } {
  const { profile, sessionId, roadmap, setRoadmap } = useLearner();
  const { loading: analysisLoading } = useEnsureAnalysis();
  const [loading, setLoading] = useState(false);

  const roleId = profile?.roleId ?? undefined;
  const canGenerate = !!profile && (!!sessionId || !!roleId);

  useEffect(() => {
    if (roadmap || !canGenerate) return;
    let cancelled = false;
    setLoading(true);
    api
      .generateRoadmap(profile!, { sessionId: sessionId ?? undefined, roleId })
      .then(({ roadmap }) => {
        if (!cancelled) setRoadmap(roadmap);
      })
      .catch(() => {
        // Neither path had data yet (e.g. no persisted role and no live
        // session) — leave roadmap unset, caller shows needsAnalysis.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canGenerate, profile, sessionId, roleId, roadmap]);

  return { roadmap, loading: loading || (analysisLoading && !roleId), needsAnalysis: !roadmap && !canGenerate };
}

/**
 * Self-fetches persisted module progress + the server-computed Next Best
 * Action whenever the roadmap changes (module progress and next-best-action
 * are derived from the roadmap's current milestone states, so they're
 * re-fetched together).
 */
export function useEnsureLearnerState(): { moduleProgress: Record<string, ModuleProgressRecord>; nextBestAction: NextBestAction | null; loading: boolean } {
  const { profile, moduleProgress, setModuleProgress, nextBestAction, setNextBestAction } = useLearner();
  const { roadmap } = useEnsureRoadmap();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!profile || !roadmap) return;
    let cancelled = false;
    setLoading(true);
    api
      .getLearnerState(profile)
      .then((state) => {
        if (cancelled) return;
        setModuleProgress(state.moduleProgress);
        setNextBestAction(state.nextBestAction);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, roadmap?.generatedAt]);

  return { moduleProgress, nextBestAction, loading };
}
