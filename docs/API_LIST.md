# NexOra — API Reference

| Module          | Method | Endpoint              | Auth required             | Status |
|------------------|--------|------------------------|-----------------------------|--------|
| Authentication   | POST   | `/api/auth/register`   | No                          | ✅ Implemented |
| Authentication   | POST   | `/api/auth/login`      | No                          | ✅ Implemented |
| Users            | GET    | `/api/users`           | Yes (any role)              | ✅ Implemented — supports `?role=` filter |
| Users            | GET    | `/api/users/me`        | Yes (any role)              | ✅ Implemented |
| Projects         | GET    | `/api/projects`        | Yes — scoped per role       | ✅ Implemented, connected to MongoDB |
| Projects         | POST   | `/api/projects`        | Yes — Manager only          | ✅ Implemented |
| Projects         | PUT    | `/api/projects/:id`    | Yes — Manager only          | ✅ Implemented |
| Projects         | DELETE | `/api/projects/:id`    | Yes — Manager only          | ✅ Implemented |
| Teams            | GET    | `/api/teams`           | Yes (any role)              | ✅ Implemented |
| Teams            | POST   | `/api/teams`           | Yes — Manager only          | ✅ Implemented |
| Teams            | PUT    | `/api/teams/:id`       | Yes — Manager only          | ✅ Implemented |
| Tasks            | GET    | `/api/tasks`           | Yes — scoped per role       | ✅ Implemented |
| Tasks            | POST   | `/api/tasks`           | Yes — Manager/Team Leader   | ✅ Implemented |
| Tasks            | PUT    | `/api/tasks/:id`       | Yes — owner or elevated role| ✅ Implemented |
| Tasks            | DELETE | `/api/tasks/:id`       | Yes — Manager/Team Leader   | ✅ Implemented |
| Daily Reports    | GET    | `/api/reports`         | Yes — scoped per role       | ✅ Implemented |
| Daily Reports    | POST   | `/api/reports`         | Yes (any role)              | ✅ Implemented |
| Reviews          | —      | `/api/reviews`         | —                            | ⬜ Planned for Review 3 |
| Notifications    | —      | `/api/notifications`   | —                            | ⬜ Planned for Review 3 |

## Role scoping, in plain terms

- **Manager** — sees all projects, all tasks, all reports; the only role that can create/edit/delete projects and teams.
- **Team Leader** — sees only projects where they're the assigned leader; can create tasks and assign them to team members; can view all tasks and daily reports.
- **Team Member** — sees only tasks assigned to them; can update their own task's status; can submit and view their own daily reports.

## Auth flow

1. `POST /api/auth/login` with `{ email, password }` → returns `{ _id, name, email, role, token }`.
2. The frontend stores `token` (in `localStorage` via `AuthContext`) and sends it as `Authorization: Bearer <token>` on every subsequent request.
3. `middleware/authMiddleware.js` → `protect` verifies the token and attaches the user to `req.user`; `authorize(...roles)` rejects requests from the wrong role with `403`.

## Notes

- Reviews, Notifications, employee search, analytics, and file sharing (Cloudinary) are intentionally deferred to Review 3 per the original roadmap.
- Demo accounts for all three roles can be created instantly with `npm run seed` in `server/` (see README).
