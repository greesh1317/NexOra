# NexOra — Initial API Plan

| Module         | Method | Endpoint              | Status (Review 1)          |
|-----------------|--------|------------------------|------------------------------|
| Authentication  | POST   | `/api/auth/register`   | ✅ Implemented (basic)       |
| Authentication  | POST   | `/api/auth/login`      | ✅ Implemented (basic)       |
| Projects        | GET    | `/api/projects`        | ✅ Implemented, connected to MongoDB |
| Projects        | POST   | `/api/projects`        | ✅ Implemented, connected to MongoDB |
| Projects        | PUT    | `/api/projects/:id`    | ✅ Implemented (bonus, beyond Review 1 minimum) |
| Projects        | DELETE | `/api/projects/:id`    | ✅ Implemented (bonus, beyond Review 1 minimum) |
| Tasks           | GET    | `/api/tasks`           | ⬜ Planned (next milestone)  |
| Tasks           | POST   | `/api/tasks`           | ⬜ Planned                   |
| Daily Reports   | POST   | `/api/reports`         | ⬜ Planned                   |
| Daily Reports   | GET    | `/api/reports`         | ⬜ Planned                   |

## Notes

- Review 1 only requires **at least one** working Project API connected to MongoDB — the full CRUD set for Projects is included here as a head start.
- Auth routes exist and hash passwords + issue JWTs, but role-based route protection (`middleware/authMiddleware.js`) isn't wired into the frontend yet — that's part of the next milestone (JWT authentication and role-based access, roadmap step 6).
- Tasks, Daily Reports, Reviews, and Notifications have Mongoose models ready (`server/models/`) but no routes/controllers yet — straightforward to add following the same pattern as `projectController.js` / `projectRoutes.js`.
