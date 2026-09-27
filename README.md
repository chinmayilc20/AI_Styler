# AI Stylist

AI-powered wardrobe styling app. Upload your clothes, get AI tags, plan outfits for events with real weather data, virtual try-on via Gemini image generation, and full per-user auth so you can share one link with friends.

---

## Local development (no auth required)

```bash
python -m venv venv
.\venv\Scripts\pip install -r requirements.txt   # Windows
# pip install -r requirements.txt                # Mac/Linux

cp .env.example .env
# Add your GEMINI_API_KEY — leave Supabase fields blank for dev mode

.\venv\Scripts\uvicorn main:app --reload         # Windows
# uvicorn main:app --reload                      # Mac/Linux
```

Open **http://localhost:8000** — runs without login in dev mode.

---

## Production deployment (shared link with auth)

### Step 1 — Supabase (database + auth)

1. Create project at https://supabase.com/dashboard
2. Go to **Authentication → Providers** → make sure Email is enabled
3. Collect these three values from **Project Settings → API**:
   - `SUPABASE_URL` (e.g. `https://abc123.supabase.co`)
   - `SUPABASE_ANON_KEY` (starts with `eyJ...`)
   - `SUPABASE_JWT_SECRET` (from the **JWT Secret** section)
4. Collect `DATABASE_URL` from **Project Settings → Database → Connection String → URI**
5. Run the following in **Supabase → SQL Editor** to add `user_id` indexes:
   ```sql
   CREATE INDEX IF NOT EXISTS idx_items_user_id ON items(user_id);
   CREATE INDEX IF NOT EXISTS idx_outfit_history_user_id ON outfit_history(user_id);
   ```

### Step 2 — Cloudinary (image storage)

1. Create free account at https://cloudinary.com
2. Copy the **API Environment variable** from the Dashboard → it looks like:
   `cloudinary://api_key:api_secret@cloud_name`

### Step 3 — Render (backend + frontend)

1. Push this repo to GitHub (if not already)
2. Create a new **Web Service** at https://render.com
3. Connect your GitHub repo
4. Settings:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add **Environment Variables** in Render dashboard:
   | Key | Value |
   |-----|-------|
   | `GEMINI_API_KEY` | from aistudio.google.com |
   | `SUPABASE_URL` | from Step 1 |
   | `SUPABASE_ANON_KEY` | from Step 1 |
   | `SUPABASE_JWT_SECRET` | from Step 1 |
   | `DATABASE_URL` | from Step 1 |
   | `CLOUDINARY_URL` | from Step 2 |
   | `CORS_ORIGINS` | `*` for now (update after Vercel deploy) |
6. Deploy → note your Render URL: `https://your-app.onrender.com`

> **That's your shareable link.** Render serves both the API and the React frontend.
> Skip Vercel if you just want one URL.

### Step 4 — Vercel (optional CDN frontend)

If you want a faster frontend with a custom domain:

1. Edit `vercel.json` — replace `YOUR_RENDER_APP` with your actual Render subdomain
2. Push the change to GitHub
3. Import your GitHub repo at https://vercel.com/new
4. Framework preset: **Other** · Output directory: `static`
5. No build command needed
6. After deploy, update Render's `CORS_ORIGINS` to your Vercel URL

---

## Environment variables

| Variable | Required | Where to get it |
|----------|----------|-----------------|
| `GEMINI_API_KEY` | Yes | https://aistudio.google.com/apikey |
| `SUPABASE_URL` | Production | Supabase → Project Settings → API |
| `SUPABASE_ANON_KEY` | Production | Supabase → Project Settings → API |
| `SUPABASE_JWT_SECRET` | Production | Supabase → Project Settings → API → JWT Secret |
| `DATABASE_URL` | Production | Supabase → Project Settings → Database → URI |
| `CLOUDINARY_URL` | Optional | Cloudinary dashboard → Account Details |
| `CORS_ORIGINS` | Optional | Comma-separated allowed origins, default `*` |

---

## Post-deployment checklist

- [ ] `/signup` creates account and shows wardrobe
- [ ] `/login` with wrong password shows clear error
- [ ] Uploading a photo auto-tags it
- [ ] User A's wardrobe is NOT visible to User B
- [ ] Outfit generation returns weather + suggestions
- [ ] "I wore this" saves to History tab
- [ ] Logout redirects to login screen
- [ ] Friend can sign up via the shared Render URL

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI + SQLite (dev) / PostgreSQL via Supabase (prod) |
| Frontend | React 18 + Babel Standalone + Tailwind CSS (all CDN, no build step) |
| Auth | Supabase Auth (email/password) + JWT verification via `python-jose` |
| AI tagging | `gemini-2.5-flash` (vision) |
| Outfit generation | `gemini-2.5-flash` (text) |
| Try-on images | `gemini-3.1-flash-image` (Nano Banana) |
| Weather | Open-Meteo (free, no API key) |
| Image storage | Local `uploads/` (dev) / Cloudinary (prod) |
| Color system | Wada Sanzo *Dictionary of Color Combinations* |
