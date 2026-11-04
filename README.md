# NexOra — Stress-Free Team Management Platform

A centralized, role-based team and project management platform. **Managers** create projects and onboard people,
**Team Leaders** assign tasks, read daily reports and review their team, and **Team Members** update tasks, attach
proof-of-work links and submit daily reports — with notifications, analytics and an AI progress summary.

## Features

- JWT authentication with three roles, role-based dashboards and protected routes
- Projects, tasks (with deadlines and priority), daily reports
- **Proof of work**: paste a link (with a one-click helper that builds today's GitHub commits link) **or upload a file** (PDF, image, Office file, zip — up to 5 MB) on any task or daily report
- **Deadline calendar** for every role: task deadlines and project due dates, with overdue and next-7-days lists
- Each Team Leader sees only the projects they lead (tasks, reports, reviews, files, analytics)
- Change your own password from the navbar
- **Reviews & feedback** (1–5 stars + comments)
- **Notifications** (task assigned, review received) and in-app deadline reminders
- **Employee search** and **project analytics** (completion rate, top contributors)
- **AI progress summary** (Anthropic API) with an automatic computed fallback
- Managers add Team Leaders / Team Members from the dashboard (no public sign-up)

## Tech Stack

| Component       | Technology                          |
|------------------|--------------------------------------|
| Frontend         | React (Vite) + Tailwind CSS          |
| Backend          | Node.js + Express                    |
| Database         | MongoDB + Mongoose                   |
| Authentication   | JWT + bcrypt                         |
| AI               | Anthropic API (`@anthropic-ai/sdk`)  |
| API testing      | Postman                              |
| Version control  | Git + GitHub                         |

## Project Structure

```
nexora-team-management/
├── client/                  # React frontend
│   └── src/
│       ├── api/             # fetch wrapper that attaches the JWT
│       ├── context/         # AuthContext — login / logout / current user
│       ├── components/      # Navbar, NotificationBell, ProofLink, ProtectedRoute, ...
│       ├── pages/           # Login + 3 role dashboards + Calendar + Unauthorized
│       └── utils/           # GitHub link builder, safe-link check, date helpers
├── server/                  # Express backend
│   ├── config/              # DB connection
│   ├── controllers/         # auth, users, projects, teams, tasks, reports, reviews,
│   │                        # notifications, analytics, summary (AI), attachments (files)
│   ├── models/              # 7 Mongoose schemas
│   ├── routes/
│   ├── middleware/          # JWT verification + role authorization
│   ├── utils/               # access rules (which projects/files a leader may see)
│   ├── seed.js              # demo accounts + sample data
│   └── server.js
└── docs/                    # ER diagram, API reference, review checklists, deployment guide
```

## Getting Started

### 1. Backend

```bash
cd server
npm install
cp .env.example .env        # Windows: copy .env.example .env
npm run seed                # one time — creates demo accounts and sample data
npm run dev
```

Fill in `server/.env`:

| Variable | Purpose |
|----------|---------|
| `MONGO_URI` | `mongodb://127.0.0.1:27017/nexora` for a local MongoDB (make sure the MongoDB service is running) |
| `JWT_SECRET` | any long random string |
| `ANTHROPIC_API_KEY` | *optional* — enables the real AI summary (console.anthropic.com; needs credit on the account) |

### 2. Frontend

```bash
cd client
npm install
npm run dev
```

Open http://localhost:5173.

### 3. Demo accounts (password for all: `password123`)

| Role | Email |
|------|-------|
| Manager | manager@nexora.test |
| Team Leader (leads the demo project) | leader2@nexora.test |
| Team Leader (no project yet — sees an empty dashboard) | leader@nexora.test |
| Team Member | member@nexora.test |
| Team Member | member2@nexora.test |

## AI summary

The summary is built from task data and the **written** daily reports. If `ANTHROPIC_API_KEY` is missing — or the call
fails for any reason (no credit, no internet, rate limit) — a computed summary is shown instead, and the UI says which
one you are looking at. The browser never sees the API key.

## Deployment

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) (MongoDB Atlas + Render + Vercel/Netlify, all free tiers).

## Docs

- `docs/API_LIST.md` — every endpoint with who can call it
- `docs/ER_DIAGRAM.md` — database diagram
- `docs/REVIEW_1_CHECKLIST.md`, `REVIEW_2_CHECKLIST.md`, `REVIEW_3_CHECKLIST.md` — scope of each review (Review 3 includes the demo script and known limitations)

## Pushing updates to GitHub

```bash
git add .
git commit -m "Review 3: AI summary, reviews, notifications, analytics, proof links"
git push
```
