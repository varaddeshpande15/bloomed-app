# Team-NextGenInnovators
#Team Members - 
   1. Sushant Jadhav
   2. Tejas Surve
   3. Varad Deshpande
   4. Sakshi Ippe

---

## BloomEd — project overview

This repository implements **BloomEd**, an AI-powered adaptive learning platform: personalized learning roadmaps, adaptive practice tests driven by a Python intelligence engine, psychological learning profiles, and a multiplayer **Quiz Party** mode with realtime updates.

The product is exposed as a **Next.js** web app (`frontend/`) that authenticates users with **Clerk**, persists data in **PostgreSQL** via **Drizzle ORM**, and proxies adaptive AI workloads to a **FastAPI** service (`backend/`) using **Groq** LLMs, **sentence-transformers** embeddings, and **Qdrant** for syllabus vector search.

---

## Repository layout

| Path | Role |
|------|------|
| `frontend/` | Next.js 16 app: UI, `/api/*` routes (including `/api/bloom/*` → FastAPI), Drizzle schema and migrations workflow |
| `backend/` | FastAPI app: syllabus ingestion, test plans, adaptive session loop, reports, psychological profiling, Quiz Party WebSocket API |
| `frontend/supabase/` | Reference SQL (`schema.sql`, migration helpers) aligned with the Postgres schema |

---

## Main features (as implemented)

- **Landing & public pages** — Marketing/home experience; explore and history-style routes under `(public)`.
- **Auth** — Clerk sign-in/sign-up; server-side user sync into the app database (`syncClerkUserToDb`).
- **Learning roadmaps** — Create and browse roadmaps with drawer details (e.g. YouTube IDs, books); API routes under `/api/v1/roadmap*`, `/api/v1/roadmaps`, `/api/v1/details`.
- **Adaptive tests (Bloom)** — Syllabus upload → test plan generation → session (`/answer`, `/next`) with persisted **BloomTestSession** / **BloomTestAttempt** records and reporting.
- **Psychological profile** — Guided profiling flow with FastAPI `/api/profile/*`; results stored in **PsychProfile**.
- **Quiz Party** — Multiplayer quiz lobby/game flow, WebSocket backend (`/api/quiz-party`), Next.js token/pregenerate routes, game reports.
- **Dashboard & reports** — Private areas for dashboard, tests, profile, reports, onboarding, and roadmap detail views.

---

## Tech stack

**Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Radix UI / shadcn-style components, TanStack Query, Framer Motion, React Flow, D3 (roadmap/knowledge visuals), Zustand, Vercel OG, jsPDF, AI SDK (Google/OpenAI/Cohere providers where used).

**Backend:** FastAPI, Uvicorn, Pydantic Settings, Groq, PyMuPDF/Pillow/Tesseract for document handling, `sentence-transformers`, `qdrant-client`.

**Data:** PostgreSQL + Drizzle (`frontend/src/db/schema.ts`); optional Qdrant collection for syllabus embeddings.

---

## Prerequisites

- **Node.js** (compatible with Next.js 16 / lockfile)
- **Python 3.10+** (for FastAPI)
- **PostgreSQL** reachable from the frontend app (connection string in env for Drizzle)
- **Qdrant** and **Groq** API access for full adaptive + RAG behavior (per `backend/config.py`)

---

## Environment configuration

Configure secrets in local env files (not committed):

**Frontend (`frontend/`)** — Typical variables include:

- Database URL for Drizzle/Postgres
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and Clerk secret (for server routes)
- `BLOOM_API_URL` and/or `NEXT_PUBLIC_BLOOM_API_URL` — base URL of the FastAPI server (used by `/api/bloom/*` and quiz-party helpers)
- `NEXT_PUBLIC_QUIZ_WS_URL` — optional override for Quiz Party WebSocket URL
- Any AI keys required by your Next.js API routes (e.g. Google/OpenAI as used in the app)

**Backend (`backend/`)** — See `config.py`:

- `GROQ_API_KEY`, `MODEL_NAME`
- `QDRANT_URL`, `QDRANT_API_KEY`, `COLLECTION_NAME`
- `FASTAPI_HOST`, `FASTAPI_PORT`
- Embedding model / vector dimension defaults (`EMBED_MODEL`, `VECTOR_DIM`)

---

## Running locally

**1. Backend**

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python -m backend.main
```

Health check: `GET http://127.0.0.1:8000/health` (default port from settings).

**2. Frontend**

```bash
cd frontend
npm install
npm run dev
```

Open the app at the URL printed by Next (typically `http://localhost:3000`).

**Database:** Use Drizzle as needed (`npm run db:generate`, `db:migrate`, `db:push`, `db:studio` in `frontend/`) with `.env.local` loaded via `dotenv-cli` as in `package.json`.

---

## API surface (FastAPI)

Routers mounted in `backend/main.py`:

| Prefix | Purpose |
|--------|---------|
| `/api/syllabus` | Syllabus ingestion and vector-backed context |
| `/api/test` | Test plan generation |
| `/api/session` | Adaptive session: start, answer, next question |
| `/api/report` | Reporting after sessions |
| `/api/profile` | Psychological profiling |
| `/api/quiz-party` | Quiz Party realtime (WebSocket) |

The Next.js app forwards many of these through **`/api/bloom/*`** routes so the browser talks to your domain only; set `BLOOM_API_URL` to point at this FastAPI instance.

---

## Scripts (frontend)

- `npm run dev` — development server  
- `npm run build` / `npm run start` — production build and serve  
- `npm run lint` — ESLint  
- `npm run db:*` — Drizzle generate / migrate / push / pull / studio  

---

## License / deployment notes

Deployment is left to your hosting choices (e.g. Vercel for Next.js, separate host for FastAPI, managed Postgres, Qdrant Cloud). Ensure CORS and `BLOOM_API_URL` match your deployed URLs.