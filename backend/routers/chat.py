from fastapi import APIRouter, Depends
from pydantic import BaseModel
from middleware.auth import get_current_user
from services.rag import rag_query
from services.supabase_client import get_supabase

router = APIRouter(prefix="/api/chat", tags=["chat"])


class ChatRequest(BaseModel):
    message: str


@router.post("")
async def chat(req: ChatRequest, user: dict = Depends(get_current_user)):
    """Send a message to the RAG chatbot and get a response."""
    supabase = get_supabase()

    # Save user message
    supabase.table("chat_messages").insert(
        {
            "family_id": user["family_id"],
            "user_id": user["user_id"],
            "role": "user",
            "content": req.message,
        }
    ).execute()

    # Run RAG pipeline
    result = await rag_query(req.message, user["family_id"])

    # Save assistant response
    supabase.table("chat_messages").insert(
        {
            "family_id": user["family_id"],
            "user_id": user["user_id"],
            "role": "assistant",
            "content": result["answer"],
        }
    ).execute()

    return result


@router.get("/history")
async def chat_history(user: dict = Depends(get_current_user)):
    """Get chat history for the user's family."""
    supabase = get_supabase()
    result = (
        supabase.table("chat_messages")
        .select("id, role, content, created_at, user_id, profiles(display_name)")
        .eq("family_id", user["family_id"])
        .order("created_at", desc=False)
        .limit(100)
        .execute()
    )
    return {"messages": result.data or []}
