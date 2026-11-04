# Final Checklist (Review 3)

| Feature | Status | Where it lives |
|---------|--------|----------------|
| **Proof of work — links** | ✅ Done | `submissionLink` on tasks and daily reports; validated server-side (http/https only); safe clickable links everywhere |
| **Proof of work — file upload** | ✅ Done | "＋ Attach file" on every task, file picker on the daily report. PDF / images / Office / txt·md·csv / zip, max 5 MB, stored in MongoDB, downloaded through the API with the JWT |
| One-day GitHub commits link helper | ✅ Done | Daily-report form: username + repo → "Fill today's commits link" |
| **Deadline calendar** | ✅ Done | `/calendar` for every role: month grid, task deadlines + project due dates, colour-coded (overdue red, blocked amber, done green), selected-day details, overdue list, next-7-days list |
| AI progress summary + computed fallback | ✅ Done | `POST /api/summary`; Manager org-wide, Team Leader per project; the UI says which kind you're seeing |
| Reviews & feedback | ✅ Done | Leader/Manager rate 1–5 with comments; the member is notified |
| Notifications + deadline reminders | ✅ Done | Navbar bell (task assigned, review received); member banner for overdue / due within 3 days |
| Employee search | ✅ Done | Manager dashboard → "Find a person" |
| Project analytics | ✅ Done | Manager: org-wide + top contributors. Leader: per-project progress bar |
| **Leader data isolation** | ✅ Done | A Team Leader sees only projects they lead — and the tasks, reports, reviews, files and analytics inside them. Server-enforced, not just hidden in the UI |
| **Change password** | ✅ Done | Navbar → "Password" (verifies the current password, min 8 characters) |
| Manager adds people (no public sign-up) | ✅ Done | Manager dashboard → "Add a person" |
| Project dates | ✅ Done | Manager sets start + due date when creating a project; due date shows on the calendar |
| Deployment readiness | ✅ Prepared | `VITE_API_URL`, `vercel.json`, Netlify `_redirects`, production JWT guard — see `DEPLOYMENT.md` (the deploy itself uses your own accounts) |

## Demo script (≈6 minutes)

1. `npm run seed` once, start both servers.
2. **Manager** (`manager@nexora.test`): analytics → *Generate summary* → create a project **with a due date** → add a person.
3. **Calendar** (any role): the project due date and task deadlines appear; click a day.
4. **Team Leader** `leader2@nexora.test` (joshua leads the demo project): project progress, *Summarize progress*, assign a task with a deadline → the member is notified. Then log in as `leader@nexora.test` (no project): empty dashboard — **leaders only see their own projects**.
5. **Team Member** `member@nexora.test`: bell + deadline banner, paste a link on a task, **upload a PDF** to a task, submit a daily report with a file attached.
6. Back to the **Leader**: the report, the link and the file (click to download) are all visible; leave a review → the member is notified.
7. Open `/manager-dashboard` as a member → "Access restricted".

## Design decisions (good answers for the viva)

- **Links *and* files.** A commit/PR link is the real proof for code; a file covers everything else (a PDF report, a screenshot, a zip). Both are optional.
- **Files live in MongoDB (≤ 5 MB).** No third-party storage account and nothing lost when a free host restarts. For big files you'd move to cloud storage (e.g. Cloudinary / S3) — a natural next step.
- **Uploads are locked down.** Allow-listed extensions only (no html/svg/scripts), size and count limits, downloads forced as attachments with `nosniff`, and every file request is checked against who may see that task/report.
- **The server enforces who sees what.** Hiding a button isn't security: the API itself filters tasks, reports, reviews, files and analytics by role (and, for leaders, by the projects they lead).
- **The AI reads text, not links or files.** The summary is built from task data and the written reports. Parsing commits or documents would need extra integrations.
- **AI is optional, never a single point of failure.** Failure returns the computed summary instead of an error. The API key stays on the server.
- **The Manager acts as the admin.** No separate Admin role, so no public sign-up page.
- **Deadlines are whole days (UTC).** A date picked as "15 Oct" shows as 15 Oct for everyone, whatever their time zone.

## Known limitations (be upfront about these)

- Reminders are in-app only (no email/push) and are computed when the page is open; the bell polls every 30 seconds rather than using real-time sockets.
- The Manager sets each person's first password (people can change it afterwards, but there's no "forgot password" email flow).
- `/api/teams` exists but has no UI screen.
- Files are capped at 5 MB and stored in the database — fine for documents and screenshots, not for large videos.
- The AI summary needs credit on the Anthropic account; without it the computed fallback is shown.
