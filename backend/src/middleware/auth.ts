import type { NextFunction, Request, Response } from 'express';
import { getUserIdForToken } from '../store/sessionStore.js';
import { touchLearner } from '../store/learnerStore.js';

export const SESSION_COOKIE_NAME = 'pathai_session';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      // The authenticated user's id doubles as the learnerId that the
      // existing mastery/assessment persistence layer keys everything on.
      learnerId?: string;
    }
  }
}

/**
 * Reads the session cookie and attaches the authenticated user's id to the
 * request (as both req.userId and req.learnerId — per the decided model,
 * the authenticated user's id IS the learnerId that the existing
 * mastery/assessment persistence layer already keys everything on). Not
 * required by itself — routes that must be authenticated use requireAuth.
 */
export function attachUser(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.[SESSION_COOKIE_NAME];
  if (typeof token === 'string' && token.length > 0) {
    const userId = getUserIdForToken(token);
    if (userId) {
      req.userId = userId;
      req.learnerId = userId;
      touchLearner(userId);
    }
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.userId) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  next();
}
