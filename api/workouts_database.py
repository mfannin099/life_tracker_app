from supabase_client import get_supabase

TABLE = "workouts"


def init_workouts_db():
    """No-op: the workouts table is created via supabase/schema.sql in the Supabase dashboard."""
    pass


def insert_workout(
    name: str,
    date: str,
    lift_split: str,
    secondary_muscle_group: str | None,
    cardio_done: bool,
    cardio_type: str | None,
    cardio_distance_miles: float | None,
    cardio_duration_minutes: int | None,
):
    """Insert a workout entry."""
    # Normalize text fields to avoid duplicates with extra whitespace
    name = (name or "").strip()
    if secondary_muscle_group is not None:
        secondary_muscle_group = secondary_muscle_group.strip() or None
    if cardio_type is not None:
        cardio_type = cardio_type.strip() or None

    get_supabase().table(TABLE).insert(
        {
            "name": name,
            "date": date,
            "lift_split": lift_split,
            "secondary_muscle_group": secondary_muscle_group,
            "cardio_done": cardio_done,
            "cardio_type": cardio_type,
            "cardio_distance_miles": cardio_distance_miles,
            "cardio_duration_minutes": cardio_duration_minutes,
        }
    ).execute()


def get_all_workouts():
    """Return all workouts, newest date first."""
    response = (
        get_supabase()
        .table(TABLE)
        .select(
            "id,name,date,lift_split,secondary_muscle_group,cardio_done,"
            "cardio_type,cardio_distance_miles,cardio_duration_minutes,created_at"
        )
        .order("date", desc=True)
        .order("id", desc=True)
        .execute()
    )
    return response.data


def update_workout(
    workout_id: int,
    name: str,
    date: str,
    lift_split: str,
    secondary_muscle_group: str | None,
    cardio_done: bool,
    cardio_type: str | None,
    cardio_distance_miles: float | None,
    cardio_duration_minutes: int | None,
) -> bool:
    """Update a workout entry. Returns True if a row was updated."""
    # Normalize text fields to avoid duplicates with extra whitespace
    name = (name or "").strip()
    if secondary_muscle_group is not None:
        secondary_muscle_group = secondary_muscle_group.strip() or None
    if cardio_type is not None:
        cardio_type = cardio_type.strip() or None

    response = (
        get_supabase()
        .table(TABLE)
        .update(
            {
                "name": name,
                "date": date,
                "lift_split": lift_split,
                "secondary_muscle_group": secondary_muscle_group,
                "cardio_done": cardio_done,
                "cardio_type": cardio_type,
                "cardio_distance_miles": cardio_distance_miles,
                "cardio_duration_minutes": cardio_duration_minutes,
            }
        )
        .eq("id", workout_id)
        .execute()
    )
    return len(response.data) > 0


def delete_workout(workout_id: int) -> bool:
    """Delete a workout entry. Returns True if a row was deleted."""
    response = get_supabase().table(TABLE).delete().eq("id", workout_id).execute()
    return len(response.data) > 0
