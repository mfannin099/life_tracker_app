from datetime import datetime
import re
from typing import Literal, Self
from urllib.parse import parse_qs

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, Field, ValidationError, field_validator, model_validator

from database import delete_weight, get_all_weights, init_db, insert_weight, update_weight
from workouts_database import (
    delete_workout,
    get_all_workouts,
    init_workouts_db,
    insert_workout,
    update_workout,
)

app = FastAPI(title="Weight Tracker API", description="API for tracking weight over time", version="1.0.0")

templates = Jinja2Templates(directory="templates")

@app.on_event("startup")
def startup_event():
    """Initialize databases when the app starts."""
    init_db()
    init_workouts_db()

@app.get("/")
def home(request: Request):
    """Serve the home page with a form to add weight."""
    return templates.TemplateResponse("index.html", {"request": request})

class WeightEntry(BaseModel):
    name: str = Field(..., description="User name", min_length=1)
    date: str = Field(..., description="Date in mm-dd-yyyy format")
    weight: float = Field(..., description="Weight in pounds with one decimal place", ge=0)

    @field_validator("date")
    @classmethod
    def validate_date(cls, v: str) -> str:
        if not re.match(r'^\d{2}-\d{2}-\d{4}$', v):
            raise ValueError('Date must be in mm-dd-yyyy format')
        try:
            datetime.strptime(v, '%m-%d-%Y')
        except ValueError:
            raise ValueError('Invalid date')
        return v

    @field_validator("weight")
    @classmethod
    def validate_weight(cls, v: float) -> float:
        str_weight = str(v)
        if '.' in str_weight:
            parts = str_weight.split('.')
            if len(parts) == 2 and len(parts[1]) > 1:
                raise ValueError('Weight must have at most one decimal place')
        return round(v, 1)


class WorkoutEntry(BaseModel):
    name: str = Field(..., description="User name", min_length=1)
    date: str = Field(..., description="Date in mm-dd-yyyy format")
    lift_split: Literal["push", "pull", "legs", "shoulders", "full_body", "rest", "other"]
    cardio_done: bool = Field(..., description="Whether cardio was performed")
    cardio_type: str | None = Field(default=None, description="e.g. running, cycling")
    cardio_distance_miles: float | None = Field(default=None, ge=0)
    cardio_duration_minutes: int | None = Field(default=None, ge=0)

    @field_validator("date")
    @classmethod
    def validate_date(cls, v: str) -> str:
        if not re.match(r'^\d{2}-\d{2}-\d{4}$', v):
            raise ValueError('Date must be in mm-dd-yyyy format')
        try:
            datetime.strptime(v, '%m-%d-%Y')
        except ValueError:
            raise ValueError('Invalid date')
        return v

    @field_validator("cardio_type")
    @classmethod
    def normalize_cardio_type(cls, v: str | None) -> str | None:
        if v is None:
            return None
        text = v.strip()
        return text if text else None

    @model_validator(mode="after")
    def validate_cardio_fields(self) -> Self:
        if not self.cardio_done:
            self.cardio_type = None
            self.cardio_distance_miles = None
            self.cardio_duration_minutes = None
            return self

        if not self.cardio_type:
            raise ValueError("cardio_type is required when cardio_done is true")

        if self.cardio_distance_miles is None and self.cardio_duration_minutes is None:
            raise ValueError(
                "Provide cardio_distance_miles or cardio_duration_minutes when cardio_done is true"
            )
        return self


async def parse_request_payload(request: Request) -> dict:
    """Read JSON payload or URL-encoded form payload."""
    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        return await request.json()

    body = (await request.body()).decode("utf-8")
    parsed = parse_qs(body, keep_blank_values=True)
    payload = {key: values[-1] for key, values in parsed.items()}
    return {key: (None if value == "" else value) for key, value in payload.items()}

@app.post("/weights", response_model=dict)
async def add_weight(request: Request):
    """Add a new weight entry from either JSON or an HTML form."""
    try:
        payload = await parse_request_payload(request)
        entry = WeightEntry(**payload)
        insert_weight(entry.name, entry.date, entry.weight)

        if "text/html" in request.headers.get("accept", ""):
            return RedirectResponse(url="/", status_code=303)

        return {
            "message": "Weight entry added successfully",
            "name": entry.name,
            "date": entry.date,
            "weight": entry.weight,
        }
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=e.errors())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add weight: {str(e)}")

@app.get("/weights")
def get_weights():
    """Retrieve all weight entries."""
    try:
        weights = get_all_weights()
        return {"weights": weights}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve weights: {str(e)}")


@app.put("/weights/{entry_id}", response_model=dict)
def edit_weight(entry_id: int, entry: WeightEntry):
    """Edit an existing weight entry by id."""
    try:
        updated = update_weight(entry_id, entry.name, entry.date, entry.weight)
        if not updated:
            raise HTTPException(status_code=404, detail="Weight entry not found")
        return {"message": "Weight entry updated successfully", "id": entry_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update weight: {str(e)}")


@app.delete("/weights/{entry_id}", response_model=dict)
def remove_weight(entry_id: int):
    """Delete a weight entry by id."""
    try:
        deleted = delete_weight(entry_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Weight entry not found")
        return {"message": "Weight entry deleted successfully", "id": entry_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete weight: {str(e)}")


@app.post("/workouts", response_model=dict)
async def add_workout(request: Request):
    """Add a workout entry from either JSON or an HTML form."""
    try:
        payload = await parse_request_payload(request)
        entry = WorkoutEntry(**payload)
        insert_workout(
            entry.name,
            entry.date,
            entry.lift_split,
            entry.cardio_done,
            entry.cardio_type,
            entry.cardio_distance_miles,
            entry.cardio_duration_minutes,
        )

        if "text/html" in request.headers.get("accept", ""):
            return RedirectResponse(url="/", status_code=303)

        return {
            "message": "Workout entry added successfully",
            "name": entry.name,
            "date": entry.date,
            "lift_split": entry.lift_split,
            "cardio_done": entry.cardio_done,
        }
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=e.errors())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add workout: {str(e)}")


@app.get("/workouts")
def get_workouts():
    """Retrieve all workout entries."""
    try:
        workouts = get_all_workouts()
        return {"workouts": workouts}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve workouts: {str(e)}")


@app.put("/workouts/{workout_id}", response_model=dict)
def edit_workout(workout_id: int, entry: WorkoutEntry):
    """Edit an existing workout entry by id."""
    try:
        updated = update_workout(
            workout_id,
            entry.name,
            entry.date,
            entry.lift_split,
            entry.cardio_done,
            entry.cardio_type,
            entry.cardio_distance_miles,
            entry.cardio_duration_minutes,
        )
        if not updated:
            raise HTTPException(status_code=404, detail="Workout entry not found")
        return {"message": "Workout entry updated successfully", "id": workout_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update workout: {str(e)}")


@app.delete("/workouts/{workout_id}", response_model=dict)
def remove_workout(workout_id: int):
    """Delete a workout entry by id."""
    try:
        deleted = delete_workout(workout_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Workout entry not found")
        return {"message": "Workout entry deleted successfully", "id": workout_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete workout: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
