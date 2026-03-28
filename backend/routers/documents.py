from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from middleware.auth import get_current_user, require_admin
from services.pdf_pipeline import process_pdf
from services.supabase_client import get_supabase
from config import CATEGORIES

router = APIRouter(prefix="/api/documents", tags=["documents"])

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    """Upload a PDF and run the processing pipeline."""
    if user["role"] == "child":
        raise HTTPException(status_code=403, detail="Children cannot upload documents")

    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds 10MB limit")

    result = await process_pdf(
        file_bytes=file_bytes,
        filename=file.filename,
        family_id=user["family_id"],
        user_id=user["user_id"],
    )
    return result


@router.get("")
async def list_documents(
    category: str | None = Query(None),
    user: dict = Depends(get_current_user),
):
    """List all documents for the user's family, optionally filtered by category."""
    supabase = get_supabase()
    query = (
        supabase.table("documents")
        .select("id, filename, category, page_count, created_at, uploaded_by, profiles(display_name)")
        .eq("family_id", user["family_id"])
        .order("created_at", desc=True)
    )

    if category and category in CATEGORIES:
        query = query.eq("category", category)

    result = query.execute()
    return {"documents": result.data or []}


@router.get("/{document_id}")
async def get_document(
    document_id: str,
    user: dict = Depends(get_current_user),
):
    """Get a single document's metadata."""
    supabase = get_supabase()
    result = (
        supabase.table("documents")
        .select("*")
        .eq("id", document_id)
        .eq("family_id", user["family_id"])
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Document not found")

    return result.data


@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    user: dict = Depends(require_admin),
):
    """Delete a document, its chunks, and the stored file."""
    supabase = get_supabase()

    # Get document to find storage path
    doc = (
        supabase.table("documents")
        .select("storage_path")
        .eq("id", document_id)
        .eq("family_id", user["family_id"])
        .single()
        .execute()
    )

    if not doc.data:
        raise HTTPException(status_code=404, detail="Document not found")

    # Delete chunks (cascade should handle this, but be explicit)
    supabase.table("document_chunks").delete().eq("document_id", document_id).execute()

    # Delete document record
    supabase.table("documents").delete().eq("id", document_id).execute()

    # Delete from storage
    supabase.storage.from_("documents").remove([doc.data["storage_path"]])

    return {"message": "Document deleted"}
