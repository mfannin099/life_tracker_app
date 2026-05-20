# Agent.md - Life Tracker Project Context

## Purpose
This project is a FastAPI app with two frontends for tracking:
- Body weight entries
- Workout entries (lift split + secondary muscle group + cardio details)

It includes:
- API endpoints for create/read/update/delete (CRUD)
- A simple HTML UI served from `/` (`templates/index.html`)
- A React + TypeScript frontend in `frontend/`
- SQLite persistence in the local `data/` folder

## Tech Stack
- Python 3.x
- FastAPI
- Uvicorn
- Jinja2
- React + TypeScript (Vite) frontend
- SQLite (via Python `sqlite3`)

Dependencies are in `requirements.txt`:
- `fastapi==0.104.1`
- `uvicorn[standard]==0.24.0`
- `jinja2==3.1.2`

## Project Layout
- `main.py`: FastAPI app, request validation, API routes, template route
- `database.py`: weight table init + CRUD
- `workouts_database.py`: workout table init + CRUD
- `templates/index.html`: UI form + frontend fetch logic
- `frontend/`: React TypeScript app (new primary frontend)
- `data/weights.db`: SQLite database for weights
- `data/workouts.db`: SQLite database for workouts
- `scratch/test_api.py`: quick manual API test script for weight endpoints
- `README.md`: project documentation

## App Startup Flow
In `main.py`, FastAPI startup event runs:
- `init_db()` from `database.py`
- `init_workouts_db()` from `workouts_database.py`

This auto-creates the `data/` directory and tables if missing.

## Data Model Summary

### Weights table (`weights.db`)
Table: `weights`
- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `name` TEXT NOT NULL
- `date` TEXT NOT NULL (`mm-dd-yyyy` string)
- `weight` REAL NOT NULL
- `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP

### Workouts table (`workouts.db`)
Table: `workouts`
- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `name` TEXT NOT NULL
- `date` TEXT NOT NULL (`mm-dd-yyyy` string)
- `lift_split` TEXT NOT NULL
- `secondary_muscle_group` TEXT nullable
- `cardio_done` INTEGER NOT NULL (stored as 0/1, returned as bool)
- `cardio_type` TEXT nullable
- `cardio_distance_miles` REAL nullable
- `cardio_duration_minutes` INTEGER nullable
- `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP

## Validation Rules (Pydantic)

### `WeightEntry`
- `name`: required, min length 1
- `date`: accepts `m-d-yyyy` or `mm-dd-yyyy`; normalized to `mm-dd-yyyy`; must be a real date
- `weight`: must be `>= 0`, max one decimal place, rounded to 1 decimal

### `WorkoutEntry`
- `name`: required, min length 1
- `date`: accepts `m-d-yyyy` or `mm-dd-yyyy`; normalized to `mm-dd-yyyy`; must be a real date
- `lift_split`: one of:
  - `push`, `pull`, `legs`, `shoulders`, `arms`, `full_body`, `rest`, `other`
- `secondary_muscle_group`: optional; trimmed; blank becomes `None`
- `cardio_done`: boolean
- `cardio_type`: trimmed; blank becomes `None`
- Conditional logic:
  - If `cardio_done == false`: cardio fields are nulled out
  - If `cardio_done == true`: `cardio_type` is required
  - If `cardio_done == true`: at least one of distance or duration is required

## Request Parsing Behavior
`parse_request_payload()` in `main.py` supports:
- JSON (`application/json`)
- HTML form posts (`application/x-www-form-urlencoded`)

For form posts, empty strings are converted to `None` before validation.

## API Endpoints

### UI Route
- `GET /` -> serves `templates/index.html`

### Weight Routes
- `POST /weights` -> create weight entry
- `GET /weights` -> list all weights
- `PUT /weights/{entry_id}` -> update weight
- `DELETE /weights/{entry_id}` -> delete weight

### Workout Routes
- `POST /workouts` -> create workout entry
- `GET /workouts` -> list all workouts
- `PUT /workouts/{workout_id}` -> update workout
- `DELETE /workouts/{workout_id}` -> delete workout

Notes:
- `POST` endpoints redirect to `/` with HTTP 303 when request accepts HTML (browser form submit path).
- API validation errors return 422.
- Missing IDs on update/delete return 404.

## Frontend Behavior (`templates/index.html`)
- One page with two sections: Weight Tracker + Workout Tracker
- Submits forms directly to `/weights` and `/workouts`
- Uses JS `fetch` to load lists from `/weights` and `/workouts`
- `syncCardioFields()` toggles cardio requirements based on `cardio_done`

## Frontend Behavior (`frontend/` React app)
- Two-column layout for Weight + Workout trackers (responsive to one column on small screens)
- Uses `fetch` against backend API (`http://localhost:8000` default)
- Supports create + display + delete for weights/workouts
- Displays only the 5 most recent records for each section on the frontend
- Supports `secondary_muscle_group` in workout form and list rendering

## Sorting / Display Details
- Weights are returned sorted by `date` ascending (`ORDER BY date`)
- Workouts are returned sorted by newest first (`ORDER BY date DESC, id DESC`)
- Date is stored as text (`mm-dd-yyyy`), so sorting is lexicographic, not true date sorting across years
  - Example risk: `12-31-2025` may sort unexpectedly relative to `01-01-2026`
- React frontend additionally sorts by parsed date desc + id desc and slices to 5 recent rows.

## CORS
- `main.py` includes `CORSMiddleware` allowing:
  - `http://localhost:5173`
  - `http://127.0.0.1:5173`
- This is required for Vite dev frontend calls to FastAPI.

## Known Risks / Improvement Targets
If resuming work, these are good priorities:
1. Store dates in ISO (`YYYY-MM-DD`) or store an additional normalized date column for reliable SQL sorting.
2. Add tests (currently no formal automated test suite).
3. Update `README.md` to include workout endpoints and current validation rules.
4. Consider migrations/unified DB strategy (currently two separate SQLite files).
5. Improve error logging granularity (most exceptions become generic 500 detail strings).

## How To Run Locally
From project root (`life_tracker_app`):

1. Install deps:
```bash
pip install -r requirements.txt
```

2. Run server:
```bash
uvicorn main:app --reload
```

3. Open:
- Legacy App UI: `http://localhost:8000`
- API docs: `http://localhost:8000/docs`

4. Start React app:
```bash
cd frontend
npm install
npm run dev
```

5. Open React UI:
- `http://localhost:5173`

## Quick Re-Entry Checklist (for future you)
When coming back after time away:
1. Start with `main.py` to re-understand routes and validation.
2. Check `database.py` and `workouts_database.py` for schema/CRUD.
3. Open `templates/index.html` for legacy UI behavior.
4. Open `frontend/src/App.tsx` for current frontend behavior.
5. Verify current DB contents in `data/*.db` before major changes.
6. If editing date logic, update backend validators and frontend assumptions.

## Guidance for Codex (future agent runs)
- Preserve existing API behavior unless user asks for breaking changes.
- Keep form + JSON compatibility for POST routes.
- Do not silently change validation semantics for cardio logic.
- If changing schema, include migration/backfill strategy and update docs.
- Prefer targeted, minimal edits in `main.py`, `database.py`, `workouts_database.py`, `templates/index.html`, and `frontend/src/*`.
- If tests are added, prioritize endpoint validation and conditional cardio rules.
