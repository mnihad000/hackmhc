from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from typing import Optional
from middleware.auth import get_current_user, require_admin
from services.pdf_pipeline import process_pdf
from services.supabase_client import get_supabase
from config import CATEGORIES

router = APIRouter(prefix="/api/documents", tags=["documents"])

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


@router.post("/upload")
async def upload_document(
    file: Optional[UploadFile] = File(None),
    files: Optional[list[UploadFile]] = File(None),
    user: dict = Depends(get_current_user),
):
    """Upload one or more PDFs and store metadata."""
    if user["role"] == "child":
        raise HTTPException(status_code=403, detail="Children cannot upload documents")

    upload_files: list[UploadFile] = []
    if file is not None:
        upload_files.append(file)
    if files:
        upload_files.extend(files)
    if not upload_files:
        raise HTTPException(
            status_code=400,
            detail="No files provided. Send 'file' or 'files'.",
        )

    uploaded = []
    failed = []
    for current_file in upload_files:
        filename = current_file.filename or "unnamed.pdf"
        if not filename.lower().endswith(".pdf"):
            failed.append({"filename": filename, "error": "Only PDF files are accepted"})
            continue

        file_bytes = await current_file.read()
        if len(file_bytes) > MAX_FILE_SIZE:
            failed.append({"filename": filename, "error": "File exceeds 10MB limit"})
            continue

        try:
            result = await process_pdf(
                file_bytes=file_bytes,
                filename=filename,
                family_id=user["family_id"],
                user_id=user["user_id"],
            )
            uploaded.append(result)
        except Exception:
            failed.append({"filename": filename, "error": "Failed to process file"})

    response = {
        "uploaded": uploaded,
        "failed": failed,
        "total": len(upload_files),
        "success_count": len(uploaded),
        "failure_count": len(failed),
    }

    # Backward compatibility for current single-file frontend behavior.
    if len(upload_files) == 1 and len(uploaded) == 1 and not failed:
        response["category"] = uploaded[0].get("category")

    return response


@router.get("")
async def list_documents(
    category: Optional[str] = Query(None),
    user: dict = Depends(get_current_user),
):
    """List all documents for the user's family, optionally filtered by category."""
    supabase = get_supabase()
    query = (
        supabase.table("documents")
        .select("id, filename, category, page_count, created_at, uploaded_by, storage_path, profiles(display_name)")
        .eq("family_id", user["family_id"])
        .order("created_at", desc=True)
    )

    if category and category in CATEGORIES:
        query = query.eq("category", category)

    result = query.execute()
    return {"documents": result.data or []}


@router.get("/{document_id}/download")
async def get_document_download_url(
    document_id: str,
    user: dict = Depends(get_current_user),
):
    """Get a short-lived signed URL to open a stored document."""
    supabase = get_supabase()
    result = (
        supabase.table("documents")
        .select("id, storage_path")
        .eq("id", document_id)
        .eq("family_id", user["family_id"])
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Document not found")

    storage_path = result.data.get("storage_path")
    if not storage_path:
        raise HTTPException(status_code=404, detail="Document storage path not found")

    try:
        signed = supabase.storage.from_("documents").create_signed_url(storage_path, 900)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to generate document URL")

    url = signed.get("signedURL") or signed.get("signedUrl") or signed.get("signed_url")
    if not url:
        raise HTTPException(status_code=500, detail="No signed URL returned")

    return {"url": url}


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

    supabase.table("document_chunks").delete().eq("document_id", document_id).execute()
    supabase.table("documents").delete().eq("id", document_id).execute()
    supabase.storage.from_("documents").remove([doc.data["storage_path"]])

    return {"message": "Document deleted"}
