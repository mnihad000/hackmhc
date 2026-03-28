import uuid
import fitz  # PyMuPDF -- PDF Library?
from openai import OpenAI
from langchain_text_splitters import RecursiveCharacterTextSplitter

from services.supabase_client import get_supabase

# API Connection
client = OpenAI(api_key=OPENAI_API_KEY)

# Idk what this is 
splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,
    chunk_overlap=50,
    length_function=len,
)

# Where are we calling extract this
def extract_text(file_bytes: bytes) -> tuple[str, int]:
    """Extract text from PDF bytes. Returns (full_text, page_count)."""
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    pages = [page.get_text() for page in doc]
    doc.close()
    return "\n".join(pages), len(pages)

def chunk_text(text: str) -> list[str]:
    """Split text into overlapping chunks."""
    return splitter.split_text(text)


def generate_embeddings(chunks: list[str]) -> list[list[float]]:
    """Generate embeddings for a list of text chunks."""
    if not chunks:
        return []
    response = client.embeddings.create( # Using chatGPT embedding here, can opt for a diff embedding software through a library?
        model="text-embedding-3-small",
        input=chunks,
    )
    return [item.embedding for item in response.data]


def classify_document(text: str) -> str:
    """Classify a document into a category using GPT-4o-mini."""
    preview = text[:1500]
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    "You classify documents into exactly one category. "
                    f"Valid categories: {', '.join(CATEGORIES)}. "
                    "Respond with only the category name, nothing else."
                ),
            },
            {
                "role": "user",
                "content": f"Classify this document:\n\n{preview}",
            },
        ],
        max_tokens=10,
        temperature=0,
    )
    category = response.choices[0].message.content.strip().lower()
    return category if category in CATEGORIES else "other"


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
