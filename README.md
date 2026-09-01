# Life Tracker

Life Tracker is a FastAPI + React application for tracking:
- Weight entries
- Workout entries (lift split, secondary muscle group, cardio metadata)

The backend is now managed with `uv`, and the frontend is a React/Vite app in `frontend/`.
Data is persisted in Supabase (hosted Postgres), accessed via the `supabase-py` client.

## What changed

- Project migrated from a legacy `venv` + `pip` + `requirements.txt` workflow to `uv`.
- `pyproject.toml` and `uv.lock` were added.
- `uv sync` now manages the backend environment and dependencies.
- `.gitignore` now ignores `.venv/`, `__pycache__/`, and `*.pyc`.
- The React frontend remains in `frontend/` and is started with `npm run dev`.

## Quick start (recommended)

### Backend

One-time Supabase setup:
1. Run `supabase/schema.sql` in the Supabase SQL Editor to create the `weights` and `workouts` tables.
2. Copy `.env.example` to `.env` and fill in `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (from Project Settings -> API).

From the project root:

```bash
cd ~/Desktop/python_projects/life_tracker_app
uv sync
uv run uvicorn index:app --app-dir api --reload
```

Then open:
- Legacy app UI: `http://localhost:8000`
- API docs: `http://localhost:8000/docs`

### Frontend

From the frontend folder:

```bash
cd frontend
npm install
npm run dev
```

Then open:
- React app: `http://localhost:5173`

## Notes for occasional maintainers

- The backend environment is managed by `uv`.
- Do not rely on `pip install -r requirements.txt` unless you need legacy compatibility.
- Use `uv add <package>` to add backend dependencies.
- Use `uv sync` after changing `pyproject.toml` or `uv.lock`.
- Use `uv run python ...` or `uv run uvicorn ...` to run code inside the uv-managed environment.
- The React frontend is independent of `uv`; it uses Node/npm.

## Tech Stack

- FastAPI
- Uvicorn
- Jinja2 templates
- React
- TypeScript
- Vite
- Supabase (Postgres) via `supabase-py`

## Project Structure

- `api/index.py`: backend app setup, validation, API routes, template route, CORS config
- `api/supabase_client.py`: singleton Supabase client, reads credentials from `.env`
- `api/database.py`: weights CRUD against the Supabase `weights` table
- `api/workouts_database.py`: workouts CRUD against the Supabase `workouts` table
- `supabase/schema.sql`: one-time table setup, run in the Supabase SQL Editor
- `.env.example`: template for `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`
- `templates/index.html`: legacy web UI
- `frontend/`: Vite React TypeScript UI
- `scratch/test_api.py`: manual test script for weight endpoint

## Backend workflow

### Install / sync dependencies

```bash
cd ~/Desktop/python_projects/life_tracker_app
uv sync
```

### Run backend

```bash
uv run uvicorn index:app --app-dir api --reload
```

## Frontend workflow

```bash
cd frontend
npm install
npm run dev
```

## API Endpoints

### UI
- `GET /` - render the Life Tracker page

### Weights
- `POST /weights` - create weight entry
- `GET /weights` - list weight entries
- `PUT /weights/{entry_id}` - update weight entry
- `DELETE /weights/{entry_id}` - delete weight entry

### Workouts
- `POST /workouts` - create workout entry
- `GET /workouts` - list workout entries
- `PUT /workouts/{workout_id}` - update workout entry
- `DELETE /workouts/{workout_id}` - delete workout entry

## Example Requests

Create weight entry:

```bash
curl -X POST "http://localhost:8000/weights" \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","date":"04-14-2026","weight":150.5}'
```

Create workout entry:

```bash
curl -X POST "http://localhost:8000/workouts" \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","date":"4-14-2026","lift_split":"push","secondary_muscle_group":"triceps","cardio_done":true,"cardio_type":"running","cardio_distance_miles":2.5}'
```

## Validation Rules

### Shared
- `date` accepts `m-d-yyyy` or `mm-dd-yyyy`, and is normalized to `mm-dd-yyyy`
- `name` must be non-empty

### WeightEntry
- `weight` must be `>= 0`
- `weight` allows at most one decimal place

### WorkoutEntry
- `lift_split` must be one of: `push`, `pull`, `legs`, `shoulders`, `arms`, `full_body`, `rest`, `other`
- `secondary_muscle_group` is optional (blank values normalize to `null`)
- If `cardio_done` is `false`, cardio fields are cleared
- If `cardio_done` is `true`:
  - `cardio_type` is required
  - at least one of `cardio_distance_miles` or `cardio_duration_minutes` is required

## Database Notes

- Tables live in Supabase (Postgres); create them once via `supabase/schema.sql` in the Supabase SQL Editor.
- Weight data is stored in the `weights` table, workout data in the `workouts` table.
- Dates are stored as text (`mm-dd-yyyy`), so SQL sort behavior is lexicographic.
- The backend talks to Supabase with the service role key (server-side only, bypasses RLS); RLS is left disabled on both tables since no browser-side Supabase client is used.

## Frontend API / CORS

- Backend CORS allows:
  - `http://localhost:5173`
  - `http://127.0.0.1:5173`
- React frontend uses `VITE_API_BASE_URL` if provided; otherwise it defaults to `http://localhost:8000` in dev and to a relative path (same-origin) in production builds.

## Deploying to Vercel

The whole app (React frontend + FastAPI backend) deploys as a single Vercel project: the frontend builds to static assets, and `api/index.py` runs as a Python serverless function. `vercel.json` at the repo root wires them together — `/weights`, `/workouts`, `/docs`, and `/openapi.json` route to the Python function; everything else routes to the frontend build.

1. Create a free account at vercel.com (e.g. sign in with GitHub) and push this repo to GitHub if it isn't already.
2. In the Vercel dashboard, click "Add New... -> Project" and import this repo. Leave the root directory as the repo root (not `frontend/`) so `vercel.json` is picked up.
3. Under Project Settings -> Environment Variables, add:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

   (the same values from your local `.env` — Vercel injects these into the Python function's environment; there is no `.env` file in production).
4. Deploy. Vercel builds the frontend (`frontend/package.json`, `@vercel/static-build`) and the API (`api/index.py`, `@vercel/python`) from the single `vercel.json` config.
5. Once deployed, visit the assigned `*.vercel.app` URL and confirm `/weights` and `/workouts` return data, and the React UI loads and can add/edit/delete entries.

Notes:
- Because frontend and API share one domain in production, CORS isn't actually exercised there — the `CORSMiddleware` origins in `api/index.py` matter only for local dev (`localhost:5173` talking to `localhost:8000`).
- The legacy `templates/index.html` UI route (`GET /`) is not reachable in the Vercel deployment, since `vercel.json` routes `/` to the frontend's static build instead.
- This project targets Python 3.13 locally (`.python-version`), but Vercel's Python runtime may default to an older version. If the deploy fails on the Python build step, add a `"runtime"` pin under a `"config"` key on the `api/index.py` build entry in `vercel.json` (check Vercel's current Python runtime docs for the exact supported version string).

## Testing

Use:
- FastAPI docs at `http://localhost:8000/docs`
- `curl` / Postman
- `scratch/test_api.py` for smoke tests
- Frontend build check:
  - `cd frontend && npm run build`
