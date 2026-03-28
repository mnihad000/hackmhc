import uuid
import fitz  # PyMuPDF
from openai import OpenAI
from langchain_text_splitters import RecursiveCharacterTextSplitter

from config import OPENAI_API_KEY, CATEGORIES
from services.supabase_client import get_supabase

client = OpenAI(api_key=OPENAI_API_KEY)

splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,
    chunk_overlap=50,
    length_function=len,
)


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
    response = client.embeddings.create(
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
    Full PDF processing pipeline:
    1. Upload to Supabase Storage
    2. Extract text
    3. Chunk text
    4. Generate embeddings
    5. Classify category
    6. Store document + chunks in database
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
    if not full_text.strip():
        # Still store the document but mark as uncategorized
        supabase.table("documents").insert(
            {
                "id": document_id,
                "family_id": family_id,
                "uploaded_by": user_id,
                "filename": filename,
                "storage_path": storage_path,
                "category": "other",
                "page_count": page_count,
                "extracted_text": "",
            }
        ).execute()
        return {
            "document_id": document_id,
            "filename": filename,
            "category": "other",
            "chunks_created": 0,
            "warning": "No text could be extracted (scanned PDF?)",
        }

    # 3. Chunk
    chunks = chunk_text(full_text)

    # 4. Embed
    embeddings = generate_embeddings(chunks)

    # 5. Classify
    category = classify_document(full_text)

    # 6. Store document record
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

    # 7. Store chunks with embeddings
    chunk_records = [
        {
            "document_id": document_id,
            "family_id": family_id,
            "chunk_index": i,
            "content": chunk,
            "embedding": embedding,
            "metadata": {"page": i // 3},  # rough page estimate
        }
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings))
    ]

    # Insert in batches of 50 to avoid payload limits
    for batch_start in range(0, len(chunk_records), 50):
        batch = chunk_records[batch_start : batch_start + 50]
        supabase.table("document_chunks").insert(batch).execute()

    return {
        "document_id": document_id,
        "filename": filename,
        "category": category,
        "chunks_created": len(chunks),
        "status": "processed",
    }
