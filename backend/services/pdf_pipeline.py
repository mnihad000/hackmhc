import logging
import uuid
import fitz  # PyMuPDF -- PDF Library?
from openai import OpenAI
from langchain_text_splitters import RecursiveCharacterTextSplitter

from config import CATEGORIES, OPENAI_API_KEY
from services.supabase_client import get_supabase

logger = logging.getLogger(__name__)

# API Connection
client = OpenAI(api_key=OPENAI_API_KEY)

# Idk what this is 
splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,
    chunk_overlap=50,
    length_function=len,
)

def extract_text(file_bytes: bytes) -> tuple[str, int]:
    """Extract text from PDF bytes. Returns (full_text, page_count)."""
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        pages = [page.get_text() for page in doc]
        doc.close()
        return "\n".join(pages), len(pages)
    except Exception as e:
        logger.error(f"Failed to extract text from PDF: {e}")
        raise ValueError(f"Could not parse PDF: {e}")

def chunk_text(text: str) -> list[str]:
    """Split text into overlapping chunks."""
    return splitter.split_text(text)


def generate_embeddings(chunks: list[str]) -> list[list[float]]:
    """Generate embeddings for a list of text chunks."""
    if not chunks:
        return []
    try:
        response = client.embeddings.create(
            model="text-embedding-3-small",
            input=chunks,
        )
        return [item.embedding for item in response.data]
    except Exception as e:
        logger.error(f"OpenAI embedding call failed: {e}")
        return []


def classify_document(text: str) -> str:
    """Classify a document into a category using GPT-4o-mini."""
    preview = text[:1500]
    try:
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
    except Exception as e:
        logger.error(f"OpenAI classification call failed: {e}")
        return "other"


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
    try:
        supabase.storage.from_("documents").upload(
            storage_path,
            file_bytes,
            file_options={"content-type": "application/pdf"},
        )
    except Exception as e:
        logger.error(f"Failed to upload PDF to storage: {e}")
        raise ValueError(f"Storage upload failed: {e}")

    # 2. Extract text
    full_text, page_count = extract_text(file_bytes)

    # 3. Classify document
    category = classify_document(full_text) if full_text.strip() else "other"

    # 4. Store document record
    try:
        supabase.table("documents").insert(
            {
                "id": document_id,
                "family_id": family_id,
                "uploaded_by": user_id,
                "filename": filename,
                "storage_path": storage_path,
                "category": category,
                "page_count": page_count,
                "extracted_text": full_text,
            }
        ).execute()
    except Exception as e:
        logger.error(f"Failed to insert document record: {e}")
        raise ValueError(f"Database insert failed: {e}")

    # 5. Generate and store embeddings for RAG search
    chunks = chunk_text(full_text)
    embeddings = generate_embeddings(chunks)
    if embeddings:
        try:
            rows = [
                {
                    "document_id": document_id,
                    "family_id": family_id,
                    "chunk_index": i,
                    "content": chunk,
                    "embedding": embedding,
                }
                for i, (chunk, embedding) in enumerate(zip(chunks, embeddings))
            ]
            supabase.table("document_chunks").insert(rows).execute()
        except Exception as e:
            logger.warning(f"Failed to store embeddings (doc still saved): {e}")

    warning: str | None = None
    if not full_text.strip():
        warning = "No text could be extracted (scanned PDF?)"
    return {
        "document_id": document_id,
        "filename": filename,
        "category": category,
        "page_count": page_count,
        "status": "stored",
        "warning": warning,
    }
