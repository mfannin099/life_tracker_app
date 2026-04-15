from fastapi import FastAPI, HTTPException, Request
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, Field, validator
import re
from database import init_db, insert_weight, get_all_weights

app = FastAPI(title="Weight Tracker API", description="API for tracking weight over time", version="1.0.0")

templates = Jinja2Templates(directory="templates")

# Initialize the database on startup
@app.get("/")
def home(request: Request):
    """Serve the home page with a form to add weight."""
    return templates.TemplateResponse("index.html", {"request": request})

class WeightEntry(BaseModel):
    name: str = Field(..., description="User name", min_length=1)
    date: str = Field(..., description="Date in mm-dd-yyyy format")
    weight: float = Field(..., description="Weight in pounds with one decimal place", ge=0)

    @validator('date')
    def validate_date(cls, v):
        if not re.match(r'^\d{2}-\d{2}-\d{4}$', v):
            raise ValueError('Date must be in mm-dd-yyyy format')
        # Optional: Check if it's a valid date
        try:
            from datetime import datetime
            datetime.strptime(v, '%m-%d-%Y')
        except ValueError:
            raise ValueError('Invalid date')
        return v

    @validator('weight')
    def validate_weight(cls, v):
        # Ensure it's a float with at most one decimal place
        str_weight = str(v)
        if '.' in str_weight:
            parts = str_weight.split('.')
            if len(parts) == 2 and len(parts[1]) > 1:
                raise ValueError('Weight must have at most one decimal place')
        return round(v, 1)  # Round to one decimal

@app.post("/weights", response_model=dict)
def add_weight(entry: WeightEntry):
    """Add a new weight entry."""
    try:
        insert_weight(entry.name, entry.date, entry.weight)
        return {"message": "Weight entry added successfully", "name": entry.name, "date": entry.date, "weight": entry.weight}
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)