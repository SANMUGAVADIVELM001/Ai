import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import type { AIResult } from '../types.js';

interface Props {
  label?: string;
  loadingText?: string;
  fetcher: () => Promise<AIResult<string>>;
  /** Re-fetches when this changes (e.g. session/roadmap identity). */
  cacheKey: string;
}

/**
 * A self-contained AI Insight panel: fetches on mount/cacheKey change,
 * shows a loading state, then either the AI-sourced text or a deterministic
 * fallback with a soft notice — never a raw error.
 */
export default function AIInsight({ label = 'AI Insight', loadingText = 'PathPilot is thinking...', fetcher, cacheKey }: Props) {
  const [state, setState] = useState<{ loading: boolean; result: AIResult<string> | null; error: boolean }>({
    loading: true,
    result: null,
    error: false,
  });

  useEffect(() => {
    let cancelled = false;
    setState({ loading: true, result: null, error: false });

    fetcher()
      .then((result) => {
        if (!cancelled) setState({ loading: false, result, error: false });
      })
      .catch(() => {
        if (!cancelled) setState({ loading: false, result: null, error: true });
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  return (
    <div className="p-5 rounded-xl bg-brand-50 border border-brand-100">
      <p className="text-brand-600 text-xs font-semibold mb-2 tracking-wide flex items-center gap-1.5">
        <Sparkles size={12} strokeWidth={1.75} aria-hidden="true" /> {label.toUpperCase()}
      </p>
      {state.loading && <p className="text-ink-secondary text-sm italic">{loadingText}</p>}
      {!state.loading && state.error && <p className="text-ink-secondary text-sm">Unable to load AI insight right now.</p>}
      {!state.loading && state.result && (
        <>
          <p className="text-ink text-sm leading-relaxed">{state.result.data}</p>
          {state.result.source === 'fallback' && (
            <p className="text-ink-muted text-xs mt-2 italic">
              {state.result.notice ?? 'Showing a personalized recommendation based on your learning profile.'}
            </p>
          )}
        </>
      )}
    </div>
  );
}
