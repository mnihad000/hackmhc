import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
SUPABASE_JWT_SECRET = os.environ["SUPABASE_JWT_SECRET"]
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_RAG_API_KEY = os.getenv("OPENAI_RAG_API_KEY")
OPENAI_LLM_API_KEY = os.getenv("OPENAI_LLM_API_KEY")
RESOLVED_OPENAI_API_KEY = OPENAI_LLM_API_KEY or OPENAI_RAG_API_KEY or OPENAI_API_KEY

if not RESOLVED_OPENAI_API_KEY:
    raise RuntimeError(
        "Set OPENAI_LLM_API_KEY or OPENAI_RAG_API_KEY or OPENAI_API_KEY in backend environment variables."
    )

# Document categories
CATEGORIES = ["finance", 
            "education", 
            "housing documents / rent receipts / leases", 
            "medical",
            "Misc"]
