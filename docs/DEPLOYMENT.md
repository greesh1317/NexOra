# Deploying NexOra (free tiers)

A live link is a strong thing to show in a final review. The code is already prepared for this; the steps below use your own accounts.

**Architecture:** MongoDB Atlas (database) ← Render (Express API) ← Vercel or Netlify (React app)

## 1. Database — MongoDB Atlas

1. Create a free **M0** cluster at mongodb.com/atlas.
2. *Database Access* → add a database user (username + password — note them down).
3. *Network Access* → allow access from anywhere (`0.0.0.0/0`) so Render can connect.
4. *Connect → Drivers* → copy the connection string. Add the database name and your password, e.g.
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/nexora`
5. Put demo data in it from your own laptop (one time):
   ```bash
   cd server
   MONGO_URI="mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/nexora" npm run seed
   ```
   (On Windows PowerShell: `$env:MONGO_URI="..." ; npm run seed`)

## 2. Backend — Render

1. New → **Web Service** → connect your GitHub repo.
2. **Root directory:** `server` · **Build command:** `npm install` · **Start command:** `npm start`
3. Environment variables:

   | Name | Value |
   |------|-------|
   | `NODE_ENV` | `production` |
   | `MONGO_URI` | your Atlas connection string |
   | `JWT_SECRET` | a long random string (the server refuses to start in production without it) |
   | `CLIENT_ORIGIN` | your frontend URL, e.g. `https://nexora.vercel.app` — exact match, **no trailing slash** (set it after step 3, then redeploy) |
   | `ANTHROPIC_API_KEY` | optional — enables the real AI summary |

4. Open `https://YOUR-SERVICE.onrender.com/` — you should see `{"message":"NexOra API is running"}`.

## 3. Frontend — Vercel (or Netlify)

1. New project → import the same repo.
2. **Root directory:** `client` · Framework: Vite · Build: `npm run build` · Output: `dist`
3. Environment variable: `VITE_API_URL` = `https://YOUR-SERVICE.onrender.com` (no trailing slash, no `/api`).
4. Deploy. Refreshing on a deep link such as `/manager-dashboard` works because of `client/vercel.json` (Netlify uses `client/public/_redirects`).
5. Go back to Render and set `CLIENT_ORIGIN` to the Vercel URL → redeploy the backend.

## About uploaded files

Files (max 5 MB each) are stored inside MongoDB, so there is nothing extra to set up — they live in your Atlas database and survive Render restarts. The free Atlas tier has 512 MB, which is plenty for a demo; keep an eye on it if many large files are uploaded.

## Before the demo

- Free Render services go to sleep when idle — the first request can take up to about a minute. **Open the backend URL a few minutes before you present.**
- Log in once as each role to confirm everything loads.
- Never commit `server/.env` (it is git-ignored). Secrets belong only in the hosting dashboards.
- Don't leave the app public with the default `password123` accounts for long — change or delete them afterwards.
