import { AI_CONFIG } from '../config.js';

export class AIProviderError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'AIProviderError';
  }
}

/**
 * Minimal REST client for the Gemini API. Deliberately thin — no SDK
 * dependency — so the provider can be swapped later by changing this one
 * file (or adding a sibling client) without touching callers, which only
 * ever see `LLMService`.
 */
export async function callGemini(prompt: string, opts?: { jsonMode?: boolean }): Promise<string> {
  if (!AI_CONFIG.apiKey) {
    throw new AIProviderError('No Gemini API key configured');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${AI_CONFIG.model}:generateContent?key=${AI_CONFIG.apiKey}`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 2048,
      // gemini-3.x models reason internally before answering; left
      // uncapped that "thinking" can consume the entire token budget and
      // truncate the actual response (finishReason: MAX_TOKENS, empty text).
      // 'low' keeps latency/cost down for these short, well-scoped prompts.
      thinkingConfig: { thinkingLevel: 'low' },
      ...(opts?.jsonMode ? { responseMimeType: 'application/json' } : {}),
    },
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_CONFIG.requestTimeoutMs);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const status = res.status;
      const text = await res.text().catch(() => '');
      if (status === 429) throw new AIProviderError(`Gemini rate limit exceeded (${status})`);
      if (status === 401 || status === 403) throw new AIProviderError(`Gemini authentication failed (${status})`);
      throw new AIProviderError(`Gemini request failed (${status}): ${text.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };

    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== 'string' || text.length === 0) {
      throw new AIProviderError('Gemini returned an empty response');
    }
    return text;
  } catch (err) {
    if (err instanceof AIProviderError) throw err;
    if (err instanceof Error && err.name === 'AbortError') {
      throw new AIProviderError('Gemini request timed out', err);
    }
    throw new AIProviderError('Gemini request failed', err);
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Strips markdown code fences if the model wrapped its JSON despite
 * instructions not to, then parses it. Throws on invalid JSON so callers can
 * fall back cleanly.
 */
export function parseJsonResponse<T>(raw: string): T {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  try {
    return JSON.parse(cleaned) as T;
  } catch (err) {
    throw new AIProviderError('Gemini returned invalid JSON', err);
  }
}
