import { randomBytes } from 'node:crypto';
import { AuthSessionModel } from '../db/models.js';
import { isDatabaseConnected } from '../db/mongoose.js';

interface AuthSessionRecord {
  token: string;
  userId: string;
  createdAt: number;
}

// In-memory session store, same lifecycle/limitations as the rest of this
// backend's stores. Write-through to MongoDB when connected so sessions
// survive a restart instead of forcing every user to log in again.
const sessions = new Map<string, AuthSessionRecord>();

function persistSession(session: AuthSessionRecord): void {
  if (!isDatabaseConnected()) return;
  AuthSessionModel.updateOne({ token: session.token }, { $set: session }, { upsert: true })
    .exec()
    .catch((err) => {
      console.error('[sessionStore] failed to persist session:', err);
    });
}

/** Loads all auth sessions from MongoDB into the in-memory cache. Call once at startup. */
export async function loadSessionsFromDb(): Promise<void> {
  if (!isDatabaseConnected()) return;
  const docs = await AuthSessionModel.find().lean();
  for (const doc of docs) {
    sessions.set(doc.token, { token: doc.token, userId: doc.userId, createdAt: doc.createdAt });
  }
  console.log(`[sessionStore] loaded ${docs.length} session(s) from MongoDB`);
}

export function createAuthSession(userId: string): string {
  const token = randomBytes(32).toString('hex');
  const session: AuthSessionRecord = { token, userId, createdAt: Date.now() };
  sessions.set(token, session);
  persistSession(session);
  return token;
}

export function getUserIdForToken(token: string): string | undefined {
  return sessions.get(token)?.userId;
}

export function destroyAuthSession(token: string): void {
  sessions.delete(token);
  if (isDatabaseConnected()) {
    AuthSessionModel.deleteOne({ token }).exec().catch((err) => {
      console.error('[sessionStore] failed to delete session:', err);
    });
  }
}
