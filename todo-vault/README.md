# TodoVault

A full-stack todo app built to show how the whole Node/Express stack fits together — from an HTTP request all the way down to MongoDB — with authentication that actually protects your data.

**Stack:** Express · MongoDB (Mongoose) · JWT + bcrypt · Zod · React (Vite)

## What each piece does

The flow for every request looks like this:

```
React button click
   │  fetch() sends HTTP request        ← HTTP (methods, headers, JSON body)
   ▼
Express route handler                    ← Express (routing, middleware)
   │
   ├─ auth middleware checks the JWT     ← JWT auth (Bearer token in header)
   │
   ├─ Zod schema validates the body      ← Input validation (returns 411 on bad input)
   │
   ├─ bcrypt hashes / compares passwords ← Password security
   │
   └─ Mongoose model reads/writes Mongo  ← Database (persistent, survives restart)
   │
   ▼
Response with a proper status code      ← Error handling (401/404/409/411/500)
```

### Server (`server/`)

| File | Job |
|---|---|
| `index.js` | Entry point — starts Express, connects to MongoDB |
| `models/User.js` | Mongoose schema: what a user + todo document looks like |
| `routes/authRoutes.js` | `POST /auth/signup`, `POST /auth/login` |
| `routes/todoRoutes.js` | `GET/POST /todos`, `PUT /:id/toggle`, `DELETE /:id` |
| `middleware/auth.js` | Verifies the JWT on protected routes |
| `validation/schemas.js` | Zod schemas — every request body is checked here |

### Client (`client/`)

| File | Job |
|---|---|
| `App.jsx` | Decides: show login page or dashboard (based on token) |
| `components/AuthPage.jsx` | Signup / Login form |
| `components/Dashboard.jsx` | Add, toggle, delete todos |

## HTTP status codes the API uses

| Code | Meaning | Used when |
|---|---|---|
| 200 | OK | Login success, todos fetched |
| 201 | Created | Signup / todo added |
| 401 | Unauthenticated | Missing/invalid token, wrong password |
| 404 | Not found | User or todo doesn't exist |
| 409 | Conflict | Email/username already taken |
| 411 | Length/invalid input | Zod rejected the request body |
| 500 | Server error | Something crashed — caught in `try/catch` |

## Run it

**1. Start MongoDB** (via Docker):

```bash
docker run -d --name todovault-mongo -p 27017:27017 -v todovault-data:/data/db mongo:7
```

**2. Start the backend:**

```bash
cd server
cp .env.example .env        # then edit the values if needed
npm install
npm start                   # → http://localhost:3000
```

**3. Start the frontend:**

```bash
cd client
npm install
npm run dev                 # → http://localhost:5173
```

Open http://localhost:5173, sign up, and add a todo. Restart the backend and log in again — your data is still there because it lives in MongoDB, not in memory.

## What we learned along the way

- **Why databases beat files/arrays** — in-memory arrays and JSON files can't be queried, and die or bloat; MongoDB persists and finds what you need.
- **Input validation matters** — JS doesn't check types at runtime, so a single Zod schema rejects bad requests before they touch the database with a clean `411` error.
- **Never hardcode secrets** — the connection string lives in `.env` (`.env` is gitignored); only `.env.example` is committed.
- **`parse` vs `safeParse`** — `parse` throws, so the app uses `safeParse` to avoid turning a bad request into a 500.
- **Status codes are the contract** — 4xx = the client's mistake, 5xx = the server's.
- **JWT in the `Authorization: Bearer` header** is stateless auth — the server doesn't store sessions, it just verifies a signed token.