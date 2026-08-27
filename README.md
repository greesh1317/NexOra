# NexOra — Stress-Free Team Management Platform

A centralized, role-based team and project management platform. Managers monitor projects, team leaders assign and review tasks, and team members submit daily work updates — all in one system.

This repo is scaffolded to satisfy **Review 1** of the NexOra development plan (see `docs/REVIEW_1_CHECKLIST.md`).

## Tech Stack

| Component        | Technology            |
|-------------------|------------------------|
| Frontend          | React.js (Vite)        |
| Styling           | Tailwind CSS            |
| Backend           | Node.js + Express.js   |
| Database          | MongoDB (Mongoose)     |
| Authentication    | JWT (planned)           |
| API Testing       | Postman                 |
| Version Control   | Git + GitHub            |
| File Storage      | Cloudinary (planned)    |

## Project Structure

```
nexora-team-management/
├── client/                # React frontend (Vite)
│   └── src/
│       ├── components/
│       ├── pages/
│       └── App.jsx
├── server/                 # Node + Express backend
│   ├── config/             # DB connection
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   └── server.js
├── docs/                    # ER diagram, API list, review checklist
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
cp .env.example .env    # then fill in your MongoDB URI
npm run dev
```

The server starts on `http://localhost:5000` by default. It will attempt to connect to MongoDB using `MONGO_URI` from `.env`.

### 3. Frontend setup

In a second terminal:

```bash
cd client
npm install
npm run dev
```

The frontend starts on `http://localhost:5173` (Vite default) and proxies API calls to the backend.

### 4. Try it out

- Visit the frontend URL → you'll land on the **Login** page (UI only for now, no auth wired up yet).
- Navigate to `/dashboard` to see the **Manager Dashboard** with sample data.
- `GET http://localhost:5000/api/projects` returns projects from MongoDB (empty array until you add some, or seed via `POST`).

## Pushing to GitHub

```bash
git init
git add .
git commit -m "Initial commit: NexOra Review 1 scaffold"
git branch -M main
git remote add origin <your-empty-github-repo-url>
git push -u origin main
```

## Review 1 Status

See `docs/REVIEW_1_CHECKLIST.md` for what's implemented and what's left as a stub/next step.
