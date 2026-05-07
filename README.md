# Life Tracker API

A FastAPI application for tracking:
- Weight entries
- Workout entries (lift split + cardio metadata)

Data is persisted locally in SQLite databases under `data/`.

## Features

- Web UI at `/` for adding and viewing entries
- JSON API for weights and workouts
- CRUD support for both resources
- Request validation with Pydantic
- Accepts both JSON and HTML form submissions for create routes

## Tech Stack

- FastAPI
- Uvicorn
- Jinja2 templates
- SQLite (`sqlite3`)

## Installation

1. Clone or download this repository.
2. Install dependencies:

```bash
pip install -r requirements.txt
```

## Run Locally

Start the app:

```bash
uvicorn main:app --reload
```

Open:
- App UI: `http://localhost:8000`
- API docs: `http://localhost:8000/docs`

## Project Structure

- `main.py`: app setup, validation, API routes, template route
- `database.py`: weights table init + CRUD
- `workouts_database.py`: workouts table init + CRUD
- `templates/index.html`: web UI
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
  -d "{\"name\":\"John Doe\",\"date\":\"04-14-2026\",\"lift_split\":\"push\",\"cardio_done\":true,\"cardio_type\":\"running\",\"cardio_distance_miles\":2.5}"
```

## Validation Rules

### Shared
- `date` must be in `mm-dd-yyyy` format and represent a valid date
- `name` must be non-empty

### WeightEntry
- `weight` must be `>= 0`
- `weight` allows at most one decimal place

### WorkoutEntry
- `lift_split` must be one of: `push`, `pull`, `legs`, `shoulders`, `full_body`, `rest`, `other`
- If `cardio_done` is `false`, cardio fields are cleared
- If `cardio_done` is `true`:
  - `cardio_type` is required
  - at least one of `cardio_distance_miles` or `cardio_duration_minutes` is required

## Database Notes

- Databases are created automatically on startup.
- Weight data is stored in `data/weights.db`.
- Workout data is stored in `data/workouts.db`.
- Dates are currently stored as text (`mm-dd-yyyy`), which affects SQL sort behavior.

## Testing

Use:
- FastAPI docs at `http://localhost:8000/docs`
- `curl`/Postman
- `scratch/test_api.py` (weight endpoint smoke test)

