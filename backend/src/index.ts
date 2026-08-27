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

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4100;

// credentials:true + reflected origin is required for the HTTP-only session
// cookie to be sent/received across the frontend (5180) <-> backend (4100)
// origin split during local dev.
app.use(cors({ origin: true, credentials: true }));
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

seedDemoAccount();

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
