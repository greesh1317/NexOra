# NexOra — Stress-Free Team Management Platform

A centralized, role-based team and project management platform. Managers create and monitor projects, team leaders assign and review tasks, and team members update tasks and submit daily work reports — all in one system with real JWT-based, role-based login.

This repo covers **Review 1 and Review 2** of the NexOra development plan (see `docs/REVIEW_1_CHECKLIST.md` and `docs/REVIEW_2_CHECKLIST.md`).

## Tech Stack

| Component        | Technology            |
|-------------------|------------------------|
| Frontend          | React.js (Vite)        |
| Styling           | Tailwind CSS            |
| Backend           | Node.js + Express.js   |
| Database          | MongoDB (Mongoose)     |
| Authentication    | JWT (implemented)       |
| API Testing       | Postman                 |
| Version Control   | Git + GitHub            |
| File Storage      | Cloudinary (planned — Review 3) |

## Project Structure

```
nexora-team-management/
├── client/                 # React frontend (Vite)
│   └── src/
│       ├── api/            # fetch wrapper that attaches the JWT
│       ├── context/        # AuthContext — login/logout/current user
│       ├── components/     # Navbar, StatCard, ProtectedRoute
│       ├── pages/          # Login + 3 role dashboards + Unauthorized
│       └── App.jsx         # route definitions
├── server/                  # Node + Express backend
│   ├── config/              # DB connection
│   ├── controllers/         # auth, users, projects, teams, tasks, reports
│   ├── models/               # 7 Mongoose schemas
│   ├── routes/
│   ├── middleware/           # JWT verification + role authorization
│   ├── seed.js                # creates demo accounts for all 3 roles
│   └── server.js
├── docs/                      # ER diagram, API list, review checklists
├── README.md
└── .gitignore
```

## Getting Started

### 1. Clone / open in VS Code

```bash
cd nexora-team-management
code .
```

### 2. Backend setup

```bash
cd server
npm install
cp .env.example .env    # then fill in your MongoDB URI and a JWT secret
npm run dev
```

The server starts on `http://localhost:5000` and connects to MongoDB using `MONGO_URI` from `.env`.

### 3. Seed demo accounts (do this once)

In a second terminal, still inside `server/`:

```bash
npm run seed
```

This creates one demo user per role, plus a sample project and task, and prints the login credentials to the terminal:

| Role | Email | Password |
|------|-------|----------|
| Manager | manager@nexora.test | password123 |
| Team Leader | leader@nexora.test | password123 |
| Team Member | member@nexora.test | password123 |

### 4. Frontend setup

In a third terminal:

```bash
cd client
npm install
npm run dev
```

The frontend starts on `http://localhost:5173` and proxies `/api` calls to the backend.

### 5. Try it out

- Visit the frontend URL and log in as any of the 3 seeded accounts above.
- Each role lands on its own dashboard automatically: Manager → project creation & overview, Team Leader → task assignment & daily reports, Team Member → their tasks & report submission.
- Try visiting another role's dashboard URL directly while logged in as a different role — you'll be redirected to `/unauthorized`, proving routes are protected, not just hidden.

## Pushing to GitHub

```bash
git add .
git commit -m "Review 2: JWT auth, role-based dashboards, tasks & daily reports"
git push
```

(If this is a brand-new repo instead of continuing Review 1's, use `git init`, `git branch -M main`, and `git remote add origin <url>` first.)

## Status

- `docs/REVIEW_1_CHECKLIST.md` — Review 1 scope (scaffold, login/dashboard UI, one working API).
- `docs/REVIEW_2_CHECKLIST.md` — Review 2 scope (real auth, role-based dashboards, tasks, daily reports) — **you are here**.
- `docs/API_LIST.md` — full endpoint reference with auth/role requirements.
