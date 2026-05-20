# Life Tracker

A FastAPI + React (Vite + TypeScript) application for tracking:
- Weight entries
- Workout entries (lift split, secondary muscle group, cardio metadata)

Data is persisted locally in SQLite databases under `data/`.

## Features

- Legacy web UI at `/` (Jinja template)
- React + TypeScript frontend in `frontend/`
- JSON API for weights and workouts
- CRUD support for both resources
- Request validation with Pydantic
- Accepts both JSON and HTML form submissions for create routes
- Date input accepts both `m-d-yyyy` and `mm-dd-yyyy` and normalizes to `mm-dd-yyyy`
- Frontend recent lists show only 5 most recent weight/workout records
- Frontend supports deleting recent weight/workout records

## Tech Stack

- FastAPI
- Uvicorn
- Jinja2 templates
- React
- TypeScript
- Vite
- SQLite (`sqlite3`)

## Installation

1. Clone or download this repository.
2. Install dependencies:

```bash
pip install -r requirements.txt
```

## Run Locally

Start the backend:

```bash
uvicorn main:app --reload
```

Open:
- Legacy app UI: `http://localhost:8000`
- API docs: `http://localhost:8000/docs`

Start the React frontend:

```bash
cd frontend
npm install
npm run dev
```

React app:
- `http://localhost:5173`

## Project Structure

- `main.py`: app setup, validation, API routes, template route, CORS config
- `database.py`: weights table init + CRUD
- `workouts_database.py`: workouts table init + CRUD
- `templates/index.html`: web UI
- `frontend/`: Vite React TypeScript UI
- `data/weights.db`: weights database
- `data/workouts.db`: workouts database
- `scratch/test_api.py`: basic manual test script for weight endpoints

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
  -d "{\"name\":\"John Doe\",\"date\":\"04-14-2026\",\"weight\":150.5}"
```

Create workout entry:

```bash
curl -X POST "http://localhost:8000/workouts" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"John Doe\",\"date\":\"4-14-2026\",\"lift_split\":\"push\",\"secondary_muscle_group\":\"triceps\",\"cardio_done\":true,\"cardio_type\":\"running\",\"cardio_distance_miles\":2.5}"
```

## Validation Rules

### Shared
- `date` accepts `m-d-yyyy` or `mm-dd-yyyy`, and must represent a valid date
- Date is normalized/stored as `mm-dd-yyyy`
- `name` must be non-empty

### WeightEntry
- `weight` must be `>= 0`
- `weight` allows at most one decimal place

### WorkoutEntry
- `lift_split` must be one of: `push`, `pull`, `legs`, `shoulders`, `arms`, `full_body`, `rest`, `other`
- `secondary_muscle_group` is optional (blank values are normalized to `null`)
- If `cardio_done` is `false`, cardio fields are cleared
- If `cardio_done` is `true`:
  - `cardio_type` is required
  - at least one of `cardio_distance_miles` or `cardio_duration_minutes` is required

## Database Notes

- Databases are created automatically on startup.
- Weight data is stored in `data/weights.db`.
- Workout data is stored in `data/workouts.db`.
- Dates are currently stored as text (`mm-dd-yyyy`), which affects SQL sort behavior.
- Existing workout DBs are migrated on startup to include `secondary_muscle_group` if missing.

## Frontend API / CORS

- Backend CORS allows:
  - `http://localhost:5173`
  - `http://127.0.0.1:5173`
- React frontend uses `VITE_API_BASE_URL` if provided, else defaults to `http://localhost:8000`.

## Testing

Use:
- FastAPI docs at `http://localhost:8000/docs`
- `curl`/Postman
- `scratch/test_api.py` (weight endpoint smoke test)
- Frontend build check:
  - `cd frontend && npm run build`
