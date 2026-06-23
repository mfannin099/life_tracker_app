# Life Tracker

Life Tracker is a FastAPI + React application for tracking:
- Weight entries
- Workout entries (lift split, secondary muscle group, cardio metadata)

The backend is now managed with `uv`, and the frontend is a React/Vite app in `frontend/`.
Data is persisted locally in SQLite databases under `data/`.

## What changed

- Project migrated from a legacy `venv` + `pip` + `requirements.txt` workflow to `uv`.
- `pyproject.toml` and `uv.lock` were added.
- `uv sync` now manages the backend environment and dependencies.
- `.gitignore` now ignores `.venv/`, `__pycache__/`, and `*.pyc`.
- The React frontend remains in `frontend/` and is started with `npm run dev`.

## Quick start (recommended)

### Backend

From the project root:

```bash
cd ~/Desktop/python_projects/life_tracker_app
uv sync
uv run uvicorn main:app --reload
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
- SQLite (`sqlite3`)

## Project Structure

- `main.py`: backend app setup, validation, API routes, template route, CORS config
- `database.py`: weights table init + CRUD
- `workouts_database.py`: workouts table init + CRUD
- `templates/index.html`: legacy web UI
- `frontend/`: Vite React TypeScript UI
- `data/weights.db`: weights database
- `data/workouts.db`: workouts database
- `scratch/test_api.py`: manual test script for weight endpoint

## Backend workflow

### Install / sync dependencies

```bash
cd ~/Desktop/python_projects/life_tracker_app
uv sync
```

### Run backend

```bash
uv run uvicorn main:app --reload
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

- Databases are created automatically on startup.
- Weight data is stored in `data/weights.db`.
- Workout data is stored in `data/workouts.db`.
- Dates are stored as text (`mm-dd-yyyy`), so SQL sort behavior is lexicographic.
- Existing workout DBs are migrated on startup to include `secondary_muscle_group` if missing.

## Frontend API / CORS

- Backend CORS allows:
  - `http://localhost:5173`
  - `http://127.0.0.1:5173`
- React frontend uses `VITE_API_BASE_URL` if provided, otherwise defaults to `http://localhost:8000`.

## Testing

Use:
- FastAPI docs at `http://localhost:8000/docs`
- `curl` / Postman
- `scratch/test_api.py` for smoke tests
- Frontend build check:
  - `cd frontend && npm run build`
