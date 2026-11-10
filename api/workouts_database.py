from supabase_client import get_supabase

TABLE = "workouts"
EXERCISES_TABLE = "workout_exercises"
SETS_TABLE = "exercise_sets"


def init_workouts_db():
    """No-op: the workouts table is created via supabase/schema.sql in the Supabase dashboard."""
    pass


def _save_exercises(workout_id: int, exercises: list[dict] | None):
    """Replace all exercises (and their sets) for a workout with the given list.

    Each exercise dict looks like {"exercise_name": str, "sets": [{"reps": int, "weight": float | None}]}.
    """
    if exercises is None:
        return

    # Cascade delete handles exercise_sets when workout_exercises rows are removed.
    get_supabase().table(EXERCISES_TABLE).delete().eq("workout_id", workout_id).execute()

    for sort_order, exercise in enumerate(exercises):
        exercise_response = (
            get_supabase()
            .table(EXERCISES_TABLE)
            .insert(
                {
                    "workout_id": workout_id,
                    "exercise_name": exercise["exercise_name"],
                    "sort_order": sort_order,
                }
            )
            .execute()
        )
        workout_exercise_id = exercise_response.data[0]["id"]

        sets = exercise.get("sets") or []
        if not sets:
            continue

        get_supabase().table(SETS_TABLE).insert(
            [
                {
                    "workout_exercise_id": workout_exercise_id,
                    "set_number": set_number,
                    "reps": set_entry["reps"],
                    "weight": set_entry.get("weight"),
                }
                for set_number, set_entry in enumerate(sets, start=1)
            ]
        ).execute()


def insert_workout(
    name: str,
    date: str,
    lift_split: str,
    secondary_muscle_group: str | None,
    cardio_done: bool,
    cardio_type: str | None,
    cardio_distance_miles: float | None,
    cardio_duration_minutes: int | None,
    exercises: list[dict] | None = None,
):
    """Insert a workout entry, along with any exercises/sets."""
    # Normalize text fields to avoid duplicates with extra whitespace
    name = (name or "").strip()
    if secondary_muscle_group is not None:
        secondary_muscle_group = secondary_muscle_group.strip() or None
    if cardio_type is not None:
        cardio_type = cardio_type.strip() or None

    response = (
        get_supabase()
        .table(TABLE)
        .insert(
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
        .execute()
    )
    workout_id = response.data[0]["id"]
    _save_exercises(workout_id, exercises)


def get_all_workouts():
    """Return all workouts, newest date first, with nested exercises and sets."""
    response = (
        get_supabase()
        .table(TABLE)
        .select(
            "id,name,date,lift_split,secondary_muscle_group,cardio_done,"
            "cardio_type,cardio_distance_miles,cardio_duration_minutes,created_at,"
            "workout_exercises(id,exercise_name,sort_order,"
            "exercise_sets(id,set_number,reps,weight))"
        )
        .order("date", desc=True)
        .order("id", desc=True)
        .execute()
    )
    workouts = response.data
    for workout in workouts:
        exercises = sorted(
            workout.get("workout_exercises") or [], key=lambda e: e["sort_order"]
        )
        for exercise in exercises:
            exercise["sets"] = sorted(
                exercise.pop("exercise_sets") or [], key=lambda s: s["set_number"]
            )
        workout["exercises"] = exercises
        del workout["workout_exercises"]
    return workouts


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
    exercises: list[dict] | None = None,
) -> bool:
    """Update a workout entry, replacing its exercises/sets. Returns True if a row was updated."""
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
    updated = len(response.data) > 0
    if updated:
        _save_exercises(workout_id, exercises)
    return updated


def delete_workout(workout_id: int) -> bool:
    """Delete a workout entry (and its exercises/sets via cascade). Returns True if a row was deleted."""
    response = get_supabase().table(TABLE).delete().eq("id", workout_id).execute()
    return len(response.data) > 0
