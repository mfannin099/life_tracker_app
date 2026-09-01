"""One-off migration: copy rows from the local SQLite databases into Supabase.

Prerequisites:
1. Run supabase/schema.sql in the Supabase SQL Editor to create the tables.
2. Create a .env (see .env.example) with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.

Usage (from project root):
    uv run python scratch/migrate_to_supabase.py
"""

import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from supabase_client import get_supabase
WEIGHTS_DB = ROOT / "data" / "weights.db"
WORKOUTS_DB = ROOT / "data" / "workouts.db"

BATCH_SIZE = 500


def read_sqlite_rows(db_path: Path, table: str) -> list[dict]:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    rows = conn.execute(f"SELECT * FROM {table}").fetchall()
    conn.close()
    return [dict(row) for row in rows]


def migrate_weights() -> int:
    rows = read_sqlite_rows(WEIGHTS_DB, "weights")
    payload = [
        {
            "name": row["name"],
            "date": row["date"],
            "weight": row["weight"],
            "created_at": row["created_at"],
        }
        for row in rows
    ]
    supabase = get_supabase()
    for i in range(0, len(payload), BATCH_SIZE):
        supabase.table("weights").insert(payload[i : i + BATCH_SIZE]).execute()
    return len(payload)


def migrate_workouts() -> int:
    rows = read_sqlite_rows(WORKOUTS_DB, "workouts")
    payload = [
        {
            "name": row["name"],
            "date": row["date"],
            "lift_split": row["lift_split"],
            "secondary_muscle_group": row["secondary_muscle_group"],
            "cardio_done": bool(row["cardio_done"]),
            "cardio_type": row["cardio_type"],
            "cardio_distance_miles": row["cardio_distance_miles"],
            "cardio_duration_minutes": row["cardio_duration_minutes"],
            "created_at": row["created_at"],
        }
        for row in rows
    ]
    supabase = get_supabase()
    for i in range(0, len(payload), BATCH_SIZE):
        supabase.table("workouts").insert(payload[i : i + BATCH_SIZE]).execute()
    return len(payload)


def main() -> None:
    if not WEIGHTS_DB.exists() or not WORKOUTS_DB.exists():
        print("Local SQLite database files not found under data/; nothing to migrate.")
        return

    weights_count = migrate_weights()
    print(f"Migrated {weights_count} weight entries.")

    workouts_count = migrate_workouts()
    print(f"Migrated {workouts_count} workout entries.")


if __name__ == "__main__":
    main()
