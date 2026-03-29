import uuid
import fitz  # PyMuPDF

<<<<<<< Updated upstream
=======
from config import CATEGORIES, RESOLVED_OPENAI_API_KEY
>>>>>>> Stashed changes
from services.supabase_client import get_supabase


def extract_text(file_bytes: bytes) -> tuple[str, int]:
    """Extract text from PDF bytes. Returns (full_text, page_count)."""
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    pages = [page.get_text() for page in doc]
    doc.close()
    return "\n".join(pages), len(pages)


async def process_pdf(
    file_bytes: bytes,
    filename: str,
    family_id: str,
    user_id: str,
) -> dict:
    """
    Store-only PDF processing pipeline:
    1. Upload to Supabase Storage
    2. Extract text
    3. Store document metadata in database
    """
    supabase = get_supabase()
    document_id = str(uuid.uuid4())

    # 1. Upload PDF to Supabase Storage
    storage_path = f"{family_id}/{document_id}/{filename}"
    supabase.storage.from_("documents").upload(
        storage_path,
        file_bytes,
        file_options={"content-type": "application/pdf"},
    )

    # 2. Extract text
    full_text, page_count = extract_text(file_bytes)

    # 3. Store document record
    supabase.table("documents").insert(
        {
            "id": document_id,
            "family_id": family_id,
            "uploaded_by": user_id,
            "filename": filename,
            "storage_path": storage_path,
            "category": "other",
            "page_count": page_count,
            "extracted_text": full_text,
        }
    ).execute()

    warning: str | None = None
    if not full_text.strip():
        warning = "No text could be extracted (scanned PDF?)"
    return {
        "document_id": document_id,
        "filename": filename,
        "category": "other",
        "page_count": page_count,
        "status": "stored",
        "warning": warning,
    }
