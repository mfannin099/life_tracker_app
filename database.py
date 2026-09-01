from supabase_client import get_supabase

TABLE = "weights"


def init_db():
    """No-op: the weights table is created via supabase/schema.sql in the Supabase dashboard."""
    pass


def insert_weight(name: str, date: str, weight: float):
    """Insert a new weight entry into Supabase."""
    # Normalize name to avoid accidental duplicates like trailing spaces
    name = (name or "").strip()
    get_supabase().table(TABLE).insert(
        {"name": name, "date": date, "weight": weight}
    ).execute()


def get_all_weights():
    """Retrieve all weight entries from Supabase."""
    # Date is stored as mm-dd-yyyy text, so ordering is lexicographic.
    response = (
        get_supabase()
        .table(TABLE)
        .select("id,name,date,weight,created_at")
        .order("date")
        .execute()
    )
    return response.data


def update_weight(entry_id: int, name: str, date: str, weight: float) -> bool:
    """Update a weight entry. Returns True if a row was updated."""
    # Normalize name to avoid accidental duplicates like trailing spaces
    name = (name or "").strip()
    response = (
        get_supabase()
        .table(TABLE)
        .update({"name": name, "date": date, "weight": weight})
        .eq("id", entry_id)
        .execute()
    )
    return len(response.data) > 0


def delete_weight(entry_id: int) -> bool:
    """Delete a weight entry. Returns True if a row was deleted."""
    response = get_supabase().table(TABLE).delete().eq("id", entry_id).execute()
    return len(response.data) > 0
