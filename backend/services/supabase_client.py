from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_SERVICE_KEY

_supabase: Client | None = None


def get_supabase() -> Client:
    """Get or create the Supabase client singleton (uses service role key)."""
    global _supabase
    if _supabase is None:
        _supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    return _supabase
