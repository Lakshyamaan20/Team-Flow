# Deploying TeamFlow

This project has two parts that deploy separately:
- **backend/** — Express + Socket.io API (deploy to Render)
- **frontend/** — Vite + React app (deploy via Netlify Drop — no GitHub needed for this part)

**Deploy the backend first.** The frontend needs to know the backend's
live URL *before* it's built, so the order below matters.

## ⚠️ Important: database persistence

Your backend does **not** use a real database server. It uses `sql.js`
(SQLite compiled to WebAssembly) and saves everything to a single file:
`backend/prisma/teamflow.db`.

On free hosting tiers (Render free web service, Railway free tier, etc.)
the filesystem is **ephemeral** — every time the service restarts or
redeploys, that file resets to empty. This means:

- Fine for a demo/portfolio link where a reset now and then is okay
- **Not fine** for real user data you want to keep long-term

If you need real persistence later, the fix is to add a Render "Persistent
Disk" (small paid add-on) mounted at `backend/prisma/`, or migrate to a
hosted Postgres database (Render/Railway/Supabase all offer free Postgres).
Not required to get this live today — just know the tradeoff going in.

---

## 1. Push to GitHub

```bash
cd team-flow
git init
git add .
git commit -m "Initial commit"
```

Create a new repo at https://github.com/new (don't initialize with a
README), then:

```bash
git remote add origin https://github.com/Lakshyamaan20/team-flow.git
git branch -M main
git push -u origin main
```

Your `.env` files will **not** be pushed (they're gitignored) — only the
safe `.env.example` files will be, which is correct.

## 2. Deploy the backend (Render)

1. Go to https://render.com and sign in with GitHub
2. **New +** → **Web Service** → select your `team-flow` repo
3. Render should detect `render.yaml` automatically. If not, set manually:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
4. Under **Environment**, add these variables:
   | Key | Value |
   |---|---|
   | `JWT_SECRET` | any long random string (e.g. generate one at randomkeygen.com) |
   | `JWT_EXPIRES_IN` | `7d` |
   | `DATABASE_URL` | `file:./prisma/teamflow.db` |
   | `FRONTEND_URL` | leave blank for now — you'll fill this in after step 3 |
   | `PORT` | `4000` |
5. Click **Create Web Service**. Wait for the build to finish.
6. Copy the live URL Render gives you, e.g. `https://teamflow-backend.onrender.com`
7. Test it: visit `https://teamflow-backend.onrender.com/api/health` —
   you should see `{"status":"ok"}`

## 3. Deploy the frontend (Netlify Drop — drag & drop, no GitHub needed)

This part doesn't need Git at all. You build it on your own computer,
then drag the finished folder into a browser window.

1. Open a terminal inside the `frontend` folder
2. Create a file called `.env` in that folder with this one line
   (use **your** Render URL from step 2, keep the `/api` suffix):
   ```
   VITE_API_URL=https://teamflow-backend.onrender.com/api
   ```
3. Run:
   ```bash
   npm install
   npm run build
   ```
   This creates a `frontend/dist` folder — that's your entire finished
   website as plain HTML/CSS/JS.
4. Go to **https://app.netlify.com/drop**
5. Drag the `dist` folder (not the whole `frontend` folder — just `dist`)
   into the browser window
6. Netlify instantly gives you a live URL, e.g.
   `https://random-name-123.netlify.app`
   (Create a free Netlify account first if you want the link to stay
   live permanently — without an account it may be temporary.)

**Important:** the API URL gets "baked into" the build in step 3. If you
ever change your backend's URL, you'll need to update `.env` and repeat
steps 3–5 with a fresh drag-and-drop — you can't edit it after the fact.

## 4. Connect them

Go back to your Render backend → **Environment** → set:

| Key | Value |
|---|---|
| `FRONTEND_URL` | your Netlify URL from step 3, e.g. `https://random-name-123.netlify.app` |

Render will auto-redeploy with the new value. This lets the backend's CORS
and Socket.io accept requests from your live frontend.

## 5. Test it

Open your Netlify URL, try logging in / using the demo login, and confirm
API calls succeed (check the browser Network tab if something looks stuck
on "loading").

**Note:** Render's free tier spins the backend down after ~15 minutes of
inactivity — the first request after idle time can take 30–60 seconds to
wake it back up. This is normal on the free tier, not a bug.

## 6. Add it to your portfolio

Once live, the frontend URL from step 3 is what goes in the "Live" link
on your portfolio's TeamFlow project card.
