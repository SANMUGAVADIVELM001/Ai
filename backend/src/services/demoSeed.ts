import { createUser, emailTaken } from '../store/userStore.js';
import { hashPassword } from './authService.js';

// Local-development-only demo account, clearly labeled. Not a production
// secret — this exists purely so the app can be explored without signing up
// first, and is only ever seeded into the in-memory (non-persistent) store.
export const DEMO_EMAIL = 'demo@pathai.local';
export const DEMO_PASSWORD = 'Demo123!';

export async function seedDemoAccount(): Promise<void> {
  if (emailTaken(DEMO_EMAIL)) return;
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  createUser('Demo Learner', DEMO_EMAIL, passwordHash);
  console.log(`[demoSeed] Demo account ready — email: ${DEMO_EMAIL}, password: ${DEMO_PASSWORD} (local development only)`);
}
