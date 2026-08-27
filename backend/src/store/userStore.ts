import { randomUUID } from 'node:crypto';
import type { User } from '../types/index.js';

// In-memory user store, mirroring the existing learnerStore/sessions Map
// pattern used throughout this backend. Prototype-only — wiped on restart.
const usersById = new Map<string, User>();
const usersByEmail = new Map<string, string>(); // lowercase email -> user id

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
