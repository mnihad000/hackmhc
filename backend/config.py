import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
SUPABASE_JWT_SECRET = os.environ["SUPABASE_JWT_SECRET"]
OPENAI_API_KEY = os.environ["OPENAI_API_KEY"]

# Document categories
CATEGORIES = ["finance", "education", "medical", "Misc"]
