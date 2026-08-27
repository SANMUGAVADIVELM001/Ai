# AI-Powered Personalized Learning Path Recommender

A full learner journey: natural-language goal input → AI diagnostic assessment → skill-gap analysis → prerequisite-aware roadmap with free resources → conversational AI learning coach.

## Structure

```
backend/    Node/Express + TypeScript API — engines, AI service, prompts, routes
frontend/   React + Vite + TypeScript + Tailwind — onboarding, assessment, roadmap, AI coach UI
```

## Run locally

Two terminals:

```bash
cd backend && npm install && npm run dev   # http://localhost:4100
cd frontend && npm install && npm run dev  # http://localhost:5180
```

Or double-click `start.bat` to launch both in separate windows.

Open http://localhost:5180. The Vite dev server proxies `/api/*` to the backend.

## AI configuration (optional)

The app runs fully standalone with deterministic mock logic — no API key required. To enable real AI features (natural-language goal extraction, AI-generated diagnostic questions, skill-gap/recommendation/roadmap explanations, and the AI Coach), create `backend/.env` (see `backend/.env.example`):

```
AI_PROVIDER=gemini
AI_MODEL=gemini-3.6-flash
GEMINI_API_KEY=your-key-from-aistudio.google.com
```

Get a free key at https://aistudio.google.com. The key is server-side only — it is never sent to or read by the frontend. `.env` is gitignored.

If the AI is unavailable, misconfigured, or rate-limited, every AI feature automatically falls back to deterministic logic with a "AI service temporarily unavailable" notice — the app never breaks or shows a raw error.

## What's implemented

**Phase 1–3 — Foundation, onboarding, assessment:**
- Free-text goal input, parsed into a structured learner profile — no manual level selection.
- Adaptive diagnostic assessment: difficulty per skill rises/falls based on correct/incorrect answers, using a local question bank (`backend/src/data/questions.json`).
- Transparent scoring engine (easy/medium/hard point weights, normalized 0–100, mapped to Beginner/Developing/Intermediate/Advanced via configurable thresholds in `backend/src/config.ts`).
- Skill-gap analysis vs. each role's required mastery, with prerequisite tracking and high/medium/low priority buckets.

**Phase 4 — Recommendation engine, resources, roadmap:**
- Prerequisite graph engine (topological ordering + satisfied/partial/missing status per skill).
- Deterministic, weighted recommendation scoring engine over a curated catalog of real, free resources (`backend/src/data/resources.json`).
- Personalized roadmap generator with locked/available/in_progress/completed milestones, time estimates, and project suggestions.

**Phase 5 — AI / NLP layer:**
- `AIService` abstraction (`MockAIService` / `LLMService`) — the rest of the app talks to this interface, never to a provider directly.
- AI-enhanced goal extraction (`POST /api/profile/parse-goal-ai`) — understands natural phrasing and preferences; the deterministic parser remains the source of truth for which role/skills get assessed.
- Optional AI-generated diagnostic questions, validated (exactly one correct answer, 4 distinct options) before being added to the same local question pool — graded by the same deterministic scoring engine as any other question.
- AI explanations of skill gaps, recommendations, and the roadmap — all evidence-based, generated only from the deterministic engines' own output.
- **PathPilot AI Coach** (`/coach`) — a conversational assistant grounded in a compact `LearnerContext` built from the learner's actual assessment/roadmap data; it declines to answer anything not in that context rather than inventing facts.
- Every AI call has retry + timeout handling and a deterministic fallback, so the app keeps working if the AI API is unavailable.

See `backend/src/data/roles.json` for supported roles (ML Engineer, Data Scientist, Full Stack Developer, Cloud Engineer, Data Analyst).
