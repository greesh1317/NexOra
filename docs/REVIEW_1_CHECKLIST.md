# Review 1 — Initial Implementation Checklist

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | Create GitHub repository and initial commit | ⬜ Do this after pushing | See README "Pushing to GitHub" |
| 2 | Set up React frontend | ✅ Done | Vite + React + Tailwind in `client/` |
| 3 | Set up Node.js and Express backend | ✅ Done | `server/server.js` |
| 4 | Create frontend/backend folder structure | ✅ Done | Matches planned structure |
| 5 | Create basic Login UI | ✅ Done | `client/src/pages/Login.jsx` |
| 6 | Create basic Manager Dashboard UI with sample data | ✅ Done | `client/src/pages/ManagerDashboard.jsx` |
| 7 | Design database schema / ER diagram | ✅ Done | `docs/ER_DIAGRAM.md` + Mongoose models |
| 8 | Prepare initial API list | ✅ Done | `docs/API_LIST.md` |
| 9 | Connect backend to MongoDB | ✅ Done | `server/config/db.js` (needs a running MongoDB + `.env`) |
| 10 | Implement at least one simple Project API connected to MongoDB | ✅ Done | Full CRUD in `projectController.js` / `projectRoutes.js` |
| 11 | Maintain Git commits showing progress | ⬜ Ongoing | Commit as you build — don't do one giant commit |

## Suggested next commits after this scaffold

1. `git init && git add . && git commit -m "Initial commit: NexOra Review 1 scaffold"`
2. Run `npm install` in both `client/` and `server/`, verify both run locally, commit any lockfile changes.
3. Seed a couple of sample projects via `POST /api/projects` (e.g. with Postman) to prove the MongoDB connection end-to-end, and note this in your Review 1 demo.
4. Wire the Login page to `POST /api/auth/login` (optional stretch — not required for Review 1, but easy bonus).

## What's intentionally NOT done yet (per the plan)

- JWT-protected routes / role-based access on the frontend (roadmap step 6)
- Tasks, Daily Reports, Reviews, Notifications routes (models exist, routes don't yet)
- Cloudinary file storage integration
- The optional AI/LLM feature (explicitly flagged as post-core-platform in the plan)
