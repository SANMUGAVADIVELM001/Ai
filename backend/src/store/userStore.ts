import { randomUUID } from 'node:crypto';
import type { User } from '../types/index.js';
import { UserModel } from '../db/models.js';
import { isDatabaseConnected } from '../db/mongoose.js';

// In-memory user store, mirroring the existing learnerStore/sessions Map
// pattern used throughout this backend. Write-through to MongoDB when
// connected: the Map remains the source of truth for synchronous reads
// within this process, Mongo mirrors it so users survive a restart.
const usersById = new Map<string, User>();
const usersByEmail = new Map<string, string>(); // lowercase email -> user id

function persistUser(user: User): void {
  if (!isDatabaseConnected()) return;
  UserModel.updateOne({ id: user.id }, { $set: user }, { upsert: true })
    .exec()
    .catch((err) => {
      console.error(`[userStore] failed to persist user ${user.id}:`, err);
    });
}

/** Loads all users from MongoDB into the in-memory cache. Call once at startup. */
export async function loadUsersFromDb(): Promise<void> {
  if (!isDatabaseConnected()) return;
  const docs = await UserModel.find().lean();
  for (const doc of docs) {
    const user: User = {
      id: doc.id,
      name: doc.name,
      email: doc.email,
      passwordHash: doc.passwordHash,
      createdAt: doc.createdAt,
    };
    usersById.set(user.id, user);
    usersByEmail.set(user.email, user.id);
  }
  console.log(`[userStore] loaded ${docs.length} user(s) from MongoDB`);
}

export function createUser(name: string, email: string, passwordHash: string): User {
  const normalizedEmail = email.trim().toLowerCase();
  const user: User = {
    id: randomUUID(),
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    createdAt: Date.now(),
  };
  usersById.set(user.id, user);
  usersByEmail.set(normalizedEmail, user.id);
  persistUser(user);
  return user;
}

export function getUserById(id: string): User | undefined {
  return usersById.get(id);
}

export function getUserByEmail(email: string): User | undefined {
  const id = usersByEmail.get(email.trim().toLowerCase());
  return id ? usersById.get(id) : undefined;
}

export function emailTaken(email: string): boolean {
  return usersByEmail.has(email.trim().toLowerCase());
}
