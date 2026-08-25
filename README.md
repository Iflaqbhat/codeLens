# CodeLens — AI Code Review & Benchmark Platform

An AI-powered platform that reviews code submissions, generates hidden benchmark tests, executes them in isolated sandboxes, and scores every submission with structured feedback.

## 🎯 What It Does

- **Paste code or link a GitHub PR** → LLM returns structured JSON review (bugs, style, complexity, security score)
- **Auto-generates hidden benchmark tests** for every submission
- **Executes tests in isolated Docker sandboxes** (`--network none`, memory/CPU caps, read-only FS)
- **Per-case PASS/FAIL scoring** with expected vs. actual output
- **Pass-rate dashboard** across submissions

## 🏗 Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Frontend   │────▶│    API       │────▶│  Docker Sandbox │
│  (React +   │     │  (Express +  │     │  (isolated      │
│  Monaco)    │     │  Prisma)     │     │   execution)    │
└─────────────┘     └──────┬───────┘     └─────────────────┘
                           │
                    ┌──────▼──────┐
                    │   LLM       │
                    │  (Gemini /  │
                    │  OpenRouter)│
                    └─────────────┘
```

## 🛠 Tech Stack

| Layer | Stack |
|-------|-------|
| **Frontend** | React 18 + TypeScript, Monaco Editor, Tailwind CSS |
| **Backend** | Node.js + Express, TypeScript, Prisma ORM |
| **Database** | SQLite (dev) / PostgreSQL (prod) via Prisma |
| **Auth** | JWT (HttpOnly cookie) |
| **LLM** | Provider-agnostic (Gemini, OpenAI-compatible, OpenRouter) |
| **Sandbox** | Docker (`--network none`, memory/CPU caps, read-only FS) |
| **CI/CD** | GitHub Actions (configured) |

## 🚀 Quick Start

```bash
# 1. Clone & install
git clone https://github.com/Iflaqbhat/codeLens.git
cd codeLens
cd backend && npm install
cd ../frontend && npm install

# 2. Environment
cp backend/.env.example backend/.env   # edit with your LLM API key
# DATABASE_URL="file:./dev.db"  (SQLite dev default)

# 3. Database
cd backend && npx prisma migrate dev

# 4. Run (two terminals)
# Terminal 1 - Backend
cd backend && npm run dev
# Terminal 2 - Frontend
cd frontend && npm run dev

# 5. Open http://localhost:5173
```

## 🔐 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Prisma connection string (e.g. `file:./dev.db`) |
| `JWT_SECRET` | Yes | Random string for JWT signing |
| `AI_API_KEY` | Yes | Your LLM API key (Gemini/OpenRouter/OpenAI) |
| `AI_BASE_URL` | No | Custom LLM endpoint (default: Google Gemini) |
| `AI_MODEL` | No | Model name (default: `gemini-2.5-flash`) |

## 🧪 Sandbox (Optional)

For isolated test execution, build the sandbox image:
```bash
cd sandbox && docker build -t code-review-sandbox .
```
Without Docker, the platform still works — it just skips sandbox execution and returns review-only.

## 🔑 Key Features

- **Provider-agnostic LLM** — swap Gemini/OpenRouter/OpenAI via `.env`
- **Structured JSON reviews** — bugs, style, complexity, security, score
- **Hidden benchmark tests** — auto-generated per submission
- **Sandboxed execution** — Docker isolation (`--network none`, memory/CPU caps, read-only FS)
- **Per-case PASS/FAIL** with expected vs actual output
- **Score dashboard** — pass rates, trends, submission history
- **GitHub PR ingestion** — paste a PR URL, fetch diff, review instantly
- **JWT auth** — HttpOnly cookies, protected routes

## 📁 Project Structure

```
codeLens/
├── backend/          # Express + Prisma + LLM integration
├── frontend/         # React + Monaco + Tailwind
├── sandbox/          # Dockerfile for isolated execution
├── prisma/           # Schema + seed
└── README.md
```

## 🤝 Contributing

Issues & PRs welcome. For major changes, open an issue first.

## 📄 License

MIT
