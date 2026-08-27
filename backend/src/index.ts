import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { profileRouter } from './routes/profile.js';
import { assessmentRouter } from './routes/assessment.js';
import { roadmapRouter } from './routes/roadmap.js';
import { resourcesRouter } from './routes/resources.js';
import { aiRouter } from './routes/ai.js';
import { learnerRouter } from './routes/learner.js';
import { moduleRouter } from './routes/module.js';
import { authRouter } from './routes/auth.js';
import { devRouter } from './routes/dev.js';
import { seedDemoAccount } from './services/demoSeed.js';
import { connectToDatabase } from './db/mongoose.js';
import { loadUsersFromDb } from './store/userStore.js';
import { loadSessionsFromDb } from './store/sessionStore.js';
import { loadLearnersFromDb } from './store/learnerStore.js';

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4100;

// Render (and most PaaS hosts) terminate TLS at a proxy in front of the app
// and forward plain HTTP — without this, Express can't tell the original
// request was HTTPS, which breaks Secure cookie handling in production.
app.set('trust proxy', 1);

// Allowed frontend origins for CORS. In production this must be set to the
// deployed frontend's origin(s) (e.g. Vercel) — comma-separated if there's
// more than one (preview + production). Falls back to the local Vite dev
// server origin when unset.
const ALLOWED_ORIGINS = (process.env.FRONTEND_ORIGIN ?? 'http://localhost:5180')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// credentials:true is required for the HTTP-only session cookie to be
// sent/received across the frontend <-> backend origin split (local dev,
// and Vercel <-> Render in production).
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRouter);
app.use('/api/profile', profileRouter);
app.use('/api/assessment', assessmentRouter);
app.use('/api/roadmap', roadmapRouter);
app.use('/api/resources', resourcesRouter);
app.use('/api/ai', aiRouter);
app.use('/api/learner', learnerRouter);
app.use('/api/module', moduleRouter);

if (process.env.NODE_ENV !== 'production') {
  app.use('/api/dev', devRouter);
}

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

async function start(): Promise<void> {
  await connectToDatabase();
  await Promise.all([loadUsersFromDb(), loadSessionsFromDb(), loadLearnersFromDb()]);
  await seedDemoAccount();

  app.listen(PORT, () => {
    console.log(`Backend listening on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start backend:', err);
  process.exit(1);
});
