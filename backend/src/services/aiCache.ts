import { AI_CONFIG } from '../config.js';

interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

/**
 * Simple in-memory TTL cache so stable AI outputs (goal profile for
 * identical text, roadmap/recommendation explanations for an unchanged
 * roadmap) aren't regenerated on every request. Not persisted — fine for a
 * local prototype; a real deployment would swap this for Redis/etc. behind
 * the same two functions.
 */
export function getCached<T>(key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  return entry.value as T;
}

export function setCached(key: string, value: unknown): void {
  cache.set(key, { value, expiresAt: Date.now() + AI_CONFIG.cacheTtlMs });
}

export async function withCache<T>(key: string, compute: () => Promise<T>): Promise<T> {
  const cached = getCached<T>(key);
  if (cached !== undefined) return cached;
  const value = await compute();
  setCached(key, value);
  return value;
}
