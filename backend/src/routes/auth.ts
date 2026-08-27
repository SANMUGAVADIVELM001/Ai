import { Router } from 'express';
import { createUser, emailTaken, getUserByEmail, getUserById } from '../store/userStore.js';
import { createAuthSession, destroyAuthSession } from '../store/sessionStore.js';
import { hashPassword, verifyPassword } from '../services/authService.js';
import { attachUser, requireAuth, SESSION_COOKIE_NAME } from '../middleware/auth.js';
import type { PublicUser, User } from '../types/index.js';

export const authRouter = Router();

authRouter.use(attachUser);

const COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function toPublicUser(user: User): PublicUser {
  return { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt };
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function setSessionCookie(res: import('express').Response, token: string): void {
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE_MS,
    path: '/',
  });
}

authRouter.post('/signup', async (req, res) => {
  const { name, email, password } = req.body ?? {};

  if (typeof name !== 'string' || name.trim().length < 1) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }
  if (typeof email !== 'string' || !isValidEmail(email)) {
    res.status(400).json({ error: 'A valid email is required' });
    return;
  }
  if (typeof password !== 'string' || password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters' });
    return;
  }
  if (emailTaken(email)) {
    res.status(409).json({ error: 'An account with this email already exists' });
    return;
  }

  const passwordHash = await hashPassword(password);
  const user = createUser(name, email, passwordHash);
  const token = createAuthSession(user.id);
  setSessionCookie(res, token);

  res.status(201).json({ user: toPublicUser(user) });
});

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};

  if (typeof email !== 'string' || typeof password !== 'string') {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const user = getUserByEmail(email);
  if (!user) {
    res.status(401).json({ error: 'Email or password is incorrect.' });
    return;
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Email or password is incorrect.' });
    return;
  }

  const token = createAuthSession(user.id);
  setSessionCookie(res, token);
  res.json({ user: toPublicUser(user) });
});

authRouter.get('/me', requireAuth, (req, res) => {
  const user = getUserById(req.userId!);
  if (!user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  res.json({ user: toPublicUser(user) });
});

authRouter.post('/logout', (req, res) => {
  const token = req.cookies?.[SESSION_COOKIE_NAME];
  if (typeof token === 'string') destroyAuthSession(token);
  res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
  res.json({ loggedOut: true });
});
