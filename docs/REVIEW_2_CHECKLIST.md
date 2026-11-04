# Review 2 — Checklist

| Item | Status | Notes |
|------|--------|-------|
| Real JWT authentication (login rejects bad credentials) | ✅ Done | `Login.jsx` calls `POST /api/auth/login`; wrong credentials return a visible error, no more blind redirect |
| Role stored and used from the token | ✅ Done | Login response includes `role`; stored in `AuthContext` |
| Role-based redirect after login | ✅ Done | Manager → `/manager-dashboard`, Team Leader → `/leader-dashboard`, Team Member → `/member-dashboard` |
| Protected routes (can't type a URL to bypass role) | ✅ Done | `ProtectedRoute.jsx` blocks unauthenticated or wrong-role access, redirects to `/login` or `/unauthorized` |
| Logout | ✅ Done | Clears stored token, returns to `/login` |
| Manager Dashboard — live data | ✅ Done | Replaced sample array with `GET /api/projects`; added a "create project" form with team-leader assignment |
| Team Leader Dashboard | ✅ Done | Shows their assigned projects, a task-assignment form, all tasks, and submitted daily reports |
| Team Member Dashboard | ✅ Done | Shows assigned tasks with an inline status dropdown, plus a daily-report submission form and history |
| Task management API | ✅ Done | Full CRUD, role-scoped (`GET` filtered by role, `PUT` ownership-checked so a member can only change their own task's status) |
| Daily Report API | ✅ Done | `POST`/`GET`, scoped so team members only see their own reports |
| Team API | ✅ Done | Manager can create teams and assign a leader + members (backend ready; no dedicated UI screen yet — teams are currently assigned implicitly via a project's `leader` field) |
| Demo accounts for all 3 roles | ✅ Done | `npm run seed` in `server/` creates one Manager, one Team Leader, one Team Member, plus a sample project and task |

## How to demo this live

1. `cd server && npm run seed` — creates 3 demo accounts (see the printed credentials).
2. Start both servers (`npm run dev` in `server/`, `npm run dev` in `client/`).
3. Log in as `manager@nexora.test` → land on Manager Dashboard → create a project, assign the team leader.
4. Log out, log in as `leader@nexora.test` → land on Team Leader Dashboard → assign a task to the team member.
5. Log out, log in as `member@nexora.test` → land on Team Member Dashboard → change the task's status, submit a daily report.
6. Log back in as the leader (or manager) to show the daily report now appears in their view — proving the roles genuinely interact through shared data, not separate silos.

## Known limitations / what's intentionally deferred to Review 3

- No dedicated "Manage Teams" screen yet — team leader assignment happens through the project-creation form; the `/api/teams` endpoints exist and work but aren't surfaced in a standalone UI page.
- Reviews/feedback, notifications, employee search, project analytics, and file sharing (Cloudinary) — all still planned for Review 3, per the original roadmap.
- No password reset / email verification — out of scope for an academic project.
