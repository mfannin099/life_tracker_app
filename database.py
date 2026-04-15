import sqlite3
from pathlib import Path

DATABASE_PATH = Path("data/weights.db")

def get_db_connection():
    """Get a connection to the SQLite database."""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row  # Enable column access by name
    return conn

def init_db():
    """Initialize the database and create the weights table if it doesn't exist."""
    DATABASE_PATH.parent.mkdir(exist_ok=True)  # Ensure data directory exists
    conn = get_db_connection()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS weights (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            weight REAL NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

def insert_weight(date: str, weight: float):
    """Insert a new weight entry into the database."""
    conn = get_db_connection()
    conn.execute('INSERT INTO weights (date, weight) VALUES (?, ?)', (date, weight))
    conn.commit()
    conn.close()

def get_all_weights():
    """Retrieve all weight entries from the database."""
    conn = get_db_connection()
    rows = conn.execute('SELECT id, date, weight, created_at FROM weights ORDER BY date').fetchall()
    conn.close()
    return [dict(row) for row in rows]