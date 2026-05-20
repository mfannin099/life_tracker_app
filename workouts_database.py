import sqlite3
from pathlib import Path

DATABASE_PATH = Path("data/workouts.db")


def get_db_connection():
    """Get a connection to the workouts SQLite database."""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_workouts_db():
    """Initialize the workouts database and table if missing."""
    DATABASE_PATH.parent.mkdir(exist_ok=True)
    conn = get_db_connection()
    conn.execute(
        '''
        CREATE TABLE IF NOT EXISTS workouts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            date TEXT NOT NULL,
            lift_split TEXT NOT NULL,
            secondary_muscle_group TEXT,
            cardio_done INTEGER NOT NULL,
            cardio_type TEXT,
            cardio_distance_miles REAL,
            cardio_duration_minutes INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        '''
    )
    # Lightweight migration for existing databases created before
    # secondary_muscle_group existed.
    columns = conn.execute("PRAGMA table_info(workouts)").fetchall()
    column_names = {row["name"] for row in columns}
    if "secondary_muscle_group" not in column_names:
        conn.execute("ALTER TABLE workouts ADD COLUMN secondary_muscle_group TEXT")
    conn.commit()
    conn.close()


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
    conn = get_db_connection()
    conn.execute(
        '''
        INSERT INTO workouts (
            name, date, lift_split, secondary_muscle_group, cardio_done, cardio_type, cardio_distance_miles, cardio_duration_minutes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''',
        (
            name,
            date,
            lift_split,
            secondary_muscle_group,
            int(cardio_done),
            cardio_type,
            cardio_distance_miles,
            cardio_duration_minutes,
        ),
    )
    conn.commit()
    conn.close()


def get_all_workouts():
    """Return all workouts, newest date first."""
    conn = get_db_connection()
    rows = conn.execute(
        '''
        SELECT
            id,
            name,
            date,
            lift_split,
            secondary_muscle_group,
            cardio_done,
            cardio_type,
            cardio_distance_miles,
            cardio_duration_minutes,
            created_at
        FROM workouts
        ORDER BY date DESC, id DESC
        '''
    ).fetchall()
    conn.close()

    workouts = []
    for row in rows:
        item = dict(row)
        # SQLite stores booleans as integers; convert for API/UI consistency.
        item["cardio_done"] = bool(item["cardio_done"])
        workouts.append(item)
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
) -> bool:
    """Update a workout entry. Returns True if a row was updated."""
    conn = get_db_connection()
    cursor = conn.execute(
        '''
        UPDATE workouts
        SET
            name = ?,
            date = ?,
            lift_split = ?,
            secondary_muscle_group = ?,
            cardio_done = ?,
            cardio_type = ?,
            cardio_distance_miles = ?,
            cardio_duration_minutes = ?
        WHERE id = ?
        ''',
        (
            name,
            date,
            lift_split,
            secondary_muscle_group,
            int(cardio_done),
            cardio_type,
            cardio_distance_miles,
            cardio_duration_minutes,
            workout_id,
        ),
    )
    conn.commit()
    updated = cursor.rowcount > 0
    conn.close()
    return updated


def delete_workout(workout_id: int) -> bool:
    """Delete a workout entry. Returns True if a row was deleted."""
    conn = get_db_connection()
    cursor = conn.execute('DELETE FROM workouts WHERE id = ?', (workout_id,))
    conn.commit()
    deleted = cursor.rowcount > 0
    conn.close()
    return deleted
