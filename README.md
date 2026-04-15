# Weight Tracker API

A simple FastAPI application for tracking weight over time. Users can submit weight entries with a date, and the data is stored in a SQLite database.

## Features

- Submit weight entries via POST request or web UI
- Retrieve all weight entries via GET request
- Automatic validation of name, date format (mm-dd-yyyy) and weight (pounds with one decimal place)
- SQLite database for data persistence
- Simple web interface at the root URL

## Installation

1. Clone or download the repository.
2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

## Running the API

Run the application with:
```
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`.

## Web Interface

Visit `http://localhost:8000` in your browser for a simple web form to add weight entries and view recent entries.

## API Endpoints

### POST /weights
Submit a new weight entry.

**Request Body:**
```json
{
  "name": "John Doe",
  "date": "04-14-2026",
  "weight": 150.5
}
```

**Response:**
```json
{
  "message": "Weight entry added successfully",
  "name": "John Doe",
  "date": "04-14-2026",
  "weight": 150.5
}
```

### GET /weights
Retrieve all weight entries.

**Response:**
```json
{
  "weights": [
    {
      "id": 1,
      "name": "John Doe",
      "date": "04-14-2026",
      "weight": 150.5,
      "created_at": "2026-04-14 12:00:00"
    }
  ]
}
```

## Validation

- **Date**: Must be in `mm-dd-yyyy` format and a valid date.
- **Weight**: Must be a positive number with at most one decimal place (e.g., 150.5).

## Database

Data is stored in `data/weights.db`. The database is automatically created on first run.

## Testing

You can test the API using tools like curl, Postman, or the built-in FastAPI docs at `http://localhost:8000/docs`.

Example curl command:
```
curl -X POST "http://localhost:8000/weights" -H "Content-Type: application/json" -d '{"name": "John Doe", "date": "04-14-2026", "weight": 150.5}'
```