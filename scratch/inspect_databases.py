from pathlib import Path
import sys

import duckdb
import numpy as np


ROOT = Path(__file__).resolve().parents[1]
WEIGHTS_DB = ROOT / "data" / "weights.db"
WORKOUTS_DB = ROOT / "data" / "workouts.db"


def print_section(title: str) -> None:
    print("\n" + "=" * 72)
    print(title)
    print("=" * 72)


def inspect_table(con: duckdb.DuckDBPyConnection, db_path: Path, table_name: str) -> None:
    db_sql = str(db_path).replace("'", "''")
    table_sql = table_name.replace('"', '""')

    count_query = f"SELECT COUNT(*) AS row_count FROM sqlite_scan('{db_sql}', '{table_sql}')"
    preview_query = (
        f"SELECT * FROM sqlite_scan('{db_sql}', '{table_sql}') "
        "ORDER BY id DESC "
        "LIMIT 5"
    )

    row_count = con.execute(count_query).fetchone()[0]
    print(f"Table: {table_name}")
    print(f"Row count: {row_count}")

    if row_count == 0:
        print("First 5 rows: <empty>")
        return

    print("First 5 rows (newest first by id):")
    cursor = con.execute(preview_query)
    columns = [desc[0] for desc in cursor.description]
    rows = cursor.fetchall()

    print(" | ".join(columns))
    for row in rows:
        print(" | ".join(str(value) for value in row))


def main() -> int:
    missing = [p for p in (WEIGHTS_DB, WORKOUTS_DB) if not p.exists()]
    if missing:
        print("Missing database file(s):")
        for path in missing:
            print(f" - {path}")
        print("\nRun the API once so startup can create the database files.")
        return 1

    try:
        con = duckdb.connect(database=":memory:")
        con.execute("INSTALL sqlite;")
        con.execute("LOAD sqlite;")
    except Exception as exc:
        print("Failed to initialize DuckDB sqlite extension.")
        print("If duckdb is missing, install it with: pip install duckdb")
        print(f"Error: {exc}")
        return 1

    print_section("Life Tracker Database Inspection")
    print(f"Weights DB : {WEIGHTS_DB}")
    print(f"Workouts DB: {WORKOUTS_DB}")

    try:
        print_section("Weights")
        inspect_table(con, WEIGHTS_DB, "weights")

        print_section("Workouts")
        inspect_table(con, WORKOUTS_DB, "workouts")
    except Exception as exc:
        print(f"Inspection failed: {exc}")
        return 1
    finally:
        con.close()

    print("\nDone.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
