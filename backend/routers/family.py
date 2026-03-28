from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from middleware.auth import get_current_user, require_admin
from services.supabase_client import get_supabase

router = APIRouter(prefix="/api/family", tags=["family"])


class UpdateRoleRequest(BaseModel):
    role: str


@router.get("")
async def get_family(user: dict = Depends(get_current_user)):
    """Get family info and member list."""
    supabase = get_supabase()

    family = (
        supabase.table("families")
        .select("*")
        .eq("id", user["family_id"])
        .single()
        .execute()
    )

    members = (
        supabase.table("profiles")
        .select("id, display_name, role, created_at")
        .eq("family_id", user["family_id"])
        .execute()
    )

    return {
        "family": family.data,
        "members": members.data or [],
    }


@router.patch("/members/{member_id}")
async def update_member_role(
    member_id: str,
    req: UpdateRoleRequest,
    user: dict = Depends(require_admin),
):
    """Change a family member's role (admin only)."""
    if req.role not in ("admin", "member", "child"):
        raise HTTPException(status_code=400, detail="Invalid role")

    if member_id == user["user_id"]:
        raise HTTPException(status_code=400, detail="Cannot change your own role")

    supabase = get_supabase()

    # Verify member is in same family
    member = (
        supabase.table("profiles")
        .select("family_id")
        .eq("id", member_id)
        .single()
        .execute()
    )

    if not member.data or member.data["family_id"] != user["family_id"]:
        raise HTTPException(status_code=404, detail="Member not found in your family")

    supabase.table("profiles").update({"role": req.role}).eq("id", member_id).execute()
    return {"message": f"Role updated to {req.role}"}


@router.delete("/members/{member_id}")
async def remove_member(
    member_id: str,
    user: dict = Depends(require_admin),
):
    """Remove a family member (admin only)."""
    if member_id == user["user_id"]:
        raise HTTPException(status_code=400, detail="Cannot remove yourself")

    supabase = get_supabase()

    member = (
        supabase.table("profiles")
        .select("family_id")
        .eq("id", member_id)
        .single()
        .execute()
    )

    if not member.data or member.data["family_id"] != user["family_id"]:
        raise HTTPException(status_code=404, detail="Member not found in your family")

    # Remove family association (keeps the auth user but disconnects from family)
    supabase.table("profiles").update(
        {"family_id": None, "role": "member"}
    ).eq("id", member_id).execute()

    return {"message": "Member removed from family"}
