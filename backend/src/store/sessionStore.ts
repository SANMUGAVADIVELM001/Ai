import { randomBytes } from 'node:crypto';

interface AuthSessionRecord {
  token: string;
  userId: string;
  createdAt: number;
}

// In-memory session store, same lifecycle/limitations as the rest of this
// prototype's stores (wiped on backend restart — acceptable, matches the
// existing assessment/learner stores).
const sessions = new Map<string, AuthSessionRecord>();

export function createAuthSession(userId: string): string {
  const token = randomBytes(32).toString('hex');
  sessions.set(token, { token, userId, createdAt: Date.now() });
  return token;
}

export function getUserIdForToken(token: string): string | undefined {
  return sessions.get(token)?.userId;
}

export function destroyAuthSession(token: string): void {
  sessions.delete(token);
}
