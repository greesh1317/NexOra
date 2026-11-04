# NexOra — API Reference

All routes except `/api/auth/*` require `Authorization: Bearer <token>` (the JWT returned at login).

| Module          | Method | Endpoint                          | Who can call it              | Notes |
|------------------|--------|------------------------------------|--------------------------------|-------|
| Authentication   | —      | ~~`/api/auth/register`~~           | Removed                        | No public sign-up. Managers create accounts with `POST /api/users`; demo accounts come from `npm run seed` |
| Authentication   | POST   | `/api/auth/login`                  | Public                         | Returns `{ _id, name, email, role, token }`. Email is case-insensitive. Limited to 10 attempts / 15 min per IP |
| Users            | GET    | `/api/users`                       | Manager, Team Leader           | A leader only gets Team Members (name, email, role). Filters: `?role=team_member`, `?search=name-or-email` (case-insensitive, regex-escaped) |
| Users            | GET    | `/api/users/me`                    | Any logged-in user             | Current user's profile |
| Users            | PUT    | `/api/users/me/password`           | Any logged-in user             | `{ currentPassword, newPassword (min 8) }` — verifies the current password first |
| Users            | POST   | `/api/users`                       | Manager only                   | Password min 8 characters. Creates a Team Leader / Team Member account (a Manager cannot create another Manager) |
| Projects         | GET    | `/api/projects`                    | Any logged-in user             | **Manager** all · **Team Leader** projects they lead · **Team Member** projects where they have a task |
| Projects         | POST / PUT / DELETE | `/api/projects[/:id]` | Manager only                   | `startDate` / `endDate` (due date) feed the calendar |
| Teams            | GET    | `/api/teams`                       | Any logged-in user             | **Manager** all · **Team Leader** teams they lead / that work on their projects · **Team Member** teams they belong to |
| Teams            | POST / PUT | `/api/teams[/:id]`             | Manager only                   | API ready; no dedicated UI screen yet |
| Tasks            | GET    | `/api/tasks`                       | Any logged-in user             | **Manager** all · **Team Leader** only tasks in projects they lead · **Team Member** only their own. `?project=` filter |
| Tasks            | POST   | `/api/tasks`                       | Manager / Team Leader          | A leader must name a project **they lead**. Accepts `submissionLink`, `deadline`; **notifies the assignee** |
| Tasks            | PUT    | `/api/tasks/:id`                   | Assignee, Manager, or the project's leader | The assignee can change **only** `status` and `submissionLink` |
| Tasks            | DELETE | `/api/tasks/:id`                   | Manager or the project's leader | |
| Daily Reports    | GET    | `/api/reports`                     | Any logged-in user             | Member: own · Leader: reports on projects they lead · Manager: all |
| Daily Reports    | POST   | `/api/reports`                     | Any logged-in user             | A member may only report on a project they have a task in. Accepts `submissionLink` |
| Reviews          | GET    | `/api/reviews`                     | Any logged-in user             | Member: written about them · Leader: written by them or on their projects · Manager: all |
| Reviews          | POST   | `/api/reviews`                     | Manager / Team Leader          | `{ employee, rating 1-5, comments?, project? }` — a leader's `project` must be one they lead; **notifies the employee** |
| Notifications    | GET    | `/api/notifications`               | Any logged-in user             | Only the caller's own, newest first |
| Notifications    | PUT    | `/api/notifications/:id/read`      | Recipient only                 | |
| Notifications    | PUT    | `/api/notifications/read-all`      | Any logged-in user             | |
| Analytics        | GET    | `/api/analytics/overview`          | Manager only                   | Org-wide task counts, completion rate, per-person and per-project breakdown |
| Analytics        | GET    | `/api/analytics/project/:projectId`| Manager / the project's leader | A leader gets `403` for projects they don't lead |
| AI Summary       | POST   | `/api/summary`                     | Manager / Team Leader          | Limited to 20 per hour per user.  `{ project?, scope: "today" \| "week" }` → `{ summary, source: "ai" \| "fallback", reason? }`. A leader **must** send a project they lead |
| Attachments      | GET    | `/api/attachments`                 | Any logged-in user             | Metadata only (never file bytes), limited to files the caller may see. `?task=` / `?report=` |
| Attachments      | POST   | `/api/attachments`                 | Assignee / Manager / project's leader (tasks); report owner (reports) | `multipart/form-data`: `file` + exactly one of `task` or `report`. Max 5 MB, 10 files per task/report |
| Attachments      | GET    | `/api/attachments/:id/download`    | Anyone who may see the file    | Sent as a download (`Content-Disposition: attachment`, `nosniff`) |
| Attachments      | DELETE | `/api/attachments/:id`             | Uploader or Manager            | |

## Role scoping, in plain terms

- **Manager** — creates projects (with due dates), onboards Team Leaders/Members (no public sign-up), sees everything, org-wide analytics and AI summaries.
- **Team Leader** — sees **only the projects they lead** and the tasks, reports, reviews, files and analytics inside them. Assigns tasks, reviews members, asks for per-project AI summaries.
- **Team Member** — sees only their own tasks and reports. Updates status, attaches proof (a link and/or files), submits daily reports, reads feedback and notifications.

## Proof of work: links and files

- **Links** (`submissionLink` on tasks and reports): must start with `http://` or `https://` (so `javascript:...` is rejected), and the UI only renders `http(s)` links as clickable.
- **Files**: stored inside MongoDB (so no extra storage service and it works on hosts with a temporary disk). Allowed: PDF, images (png/jpg/gif), Office files, txt/md/csv, zip. **Not** allowed: html, svg, scripts, executables. Because downloads need the JWT, the browser fetches the bytes with the token and saves them — a bare link can't download a protected file.
- The AI summary reads the **written** report text and task data. It does not open links or files; those are for a human reviewer.

## AI summary: how the fallback works

1. If `ANTHROPIC_API_KEY` is missing → a computed summary is returned (`reason: "no_api_key"`).
2. If the AI call fails for any reason (bad key, no credits, no internet, rate limit) → the same computed summary is returned (`reason: "ai_call_failed"`).
3. Either way the endpoint returns HTTP 200 with a readable summary, so a demo never shows an error screen. The UI labels which kind it is.

## Auth flow

1. `POST /api/auth/login` → `{ _id, name, email, role, token }`.
2. The frontend stores the token (`localStorage`, via `AuthContext`) and sends it on every request.
3. `middleware/authMiddleware.js`: `protect` verifies the token and loads the user; `authorize(...roles)` returns `403` for the wrong role.
