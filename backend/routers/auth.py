from datetime import datetime, timedelta, timezone
import secrets
import string
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr

from middleware.auth import get_current_user, require_admin, require_member_or_admin
from services.supabase_client import get_supabase

router = APIRouter(prefix="/api/auth", tags=["auth"])

VALID_ROLES = ("admin", "member", "child")


class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    display_name: str
    family_name: Optional[str] = None
    invite_code: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class InviteRequest(BaseModel):
    email: Optional[EmailStr] = None
    role: str = "member"
    expires_in_hours: int = 24
    max_uses: int = 1


class JoinFamilyRequest(BaseModel):
    code: str


def _generate_invite_code(length: int = 8) -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def _create_invite_code_record(
    family_id: str,
    created_by: str,
    role: str,
    expires_in_hours: int,
    max_uses: int,
) -> dict:
    supabase = get_supabase()
    expires_at = datetime.now(timezone.utc) + timedelta(hours=expires_in_hours)
    last_exc: Optional[Exception] = None

    for _ in range(5):
        code = _generate_invite_code()
        try:
            result = (
                supabase.table("invite_codes")
                .insert(
                    {
                        "family_id": family_id,
                        "created_by": created_by,
                        "code": code,
                        "role": role,
                        "expires_at": expires_at.isoformat(),
                        "max_uses": max_uses,
                    }
                )
                .execute()
            )
            if result.data:
                return result.data[0]
        except Exception as exc:
            last_exc = exc

    raise HTTPException(status_code=500, detail="Failed to generate invite code") from last_exc


def _get_usable_invite(supabase, code: str) -> dict:
    result = (
        supabase.table("invite_codes")
        .select("*")
        .eq("code", code)
        .limit(1)
        .execute()
    )
    invite = (result.data or [None])[0]
    if not invite:
        raise HTTPException(status_code=404, detail="Invite code not found")
    if not invite.get("is_active", False):
        raise HTTPException(status_code=400, detail="Invite code is inactive")

    expires_at = datetime.fromisoformat(invite["expires_at"].replace("Z", "+00:00"))
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invite code has expired")
    if invite.get("used_count", 0) >= invite.get("max_uses", 1):
        raise HTTPException(status_code=400, detail="Invite code has reached usage limit")
    if invite.get("role") not in VALID_ROLES:
        raise HTTPException(status_code=400, detail="Invite code has an invalid role")
    return invite


def _consume_invite_code(supabase, invite: dict) -> None:
    new_used_count = invite.get("used_count", 0) + 1
    updates = {"used_count": new_used_count}
    if new_used_count >= invite.get("max_uses", 1):
        updates["is_active"] = False
    supabase.table("invite_codes").update(updates).eq("id", invite["id"]).execute()


@router.post("/signup")
async def signup(req: SignupRequest):
    """Register a new user, create a family, and set up their profile."""
    supabase = get_supabase()
    email = str(req.email).strip().lower()
    password = req.password.strip()
    invite_code = (req.invite_code or "").strip().upper()
    family_name = (req.family_name or "").strip()

    if bool(invite_code) == bool(family_name):
        raise HTTPException(
            status_code=400,
            detail="Provide either a family name or an invite code.",
        )

    invite = _get_usable_invite(supabase, invite_code) if invite_code else None

    try:
        auth_response = supabase.auth.admin.create_user(
            {
                "email": email,
                "password": password,
                "email_confirm": True,
            }
        )
    except Exception as exc:
        message = str(exc) or "Signup failed"
        raise HTTPException(status_code=400, detail=message)
    if not auth_response.user:
        raise HTTPException(status_code=400, detail="Failed to create user")

    user_id = auth_response.user.id

    if invite:
        family_id = invite["family_id"]
        role = invite["role"]
    else:
        family_result = supabase.table("families").insert({"name": family_name}).execute()
        family_id = family_result.data[0]["id"]
        role = "admin"

    supabase.table("profiles").insert(
        {
            "id": user_id,
            "family_id": family_id,
            "display_name": req.display_name,
            "role": role,
        }
    ).execute()
    if invite:
        _consume_invite_code(supabase, invite)

    return {
        "user_id": user_id,
        "family_id": family_id,
        "message": (
            "Account created and joined family successfully"
            if invite
            else "Account created successfully"
        ),
    }


@router.post("/login")
async def login(req: LoginRequest):
    """Login and return session tokens."""
    supabase = get_supabase()
    email = str(req.email).strip().lower()
    password = req.password.strip()
    try:
        auth_response = supabase.auth.sign_in_with_password(
            {"email": email, "password": password}
        )
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return {
        "access_token": auth_response.session.access_token,
        "refresh_token": auth_response.session.refresh_token,
        "user": {
            "id": auth_response.user.id,
            "email": auth_response.user.email,
        },
    }


@router.post("/logout")
async def logout():
    """
    Logout endpoint.
    Session invalidation is primarily handled client-side by Supabase auth.signOut().
    """
    return {"message": "Logged out"}


@router.post("/invite-code")
async def create_invite_code(req: InviteRequest, user: dict = Depends(require_member_or_admin)):
    """Create a family invite code (admin/member)."""
    if req.role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail="Invalid role")
    if req.expires_in_hours <= 0 or req.expires_in_hours > 168:
        raise HTTPException(
            status_code=400,
            detail="expires_in_hours must be between 1 and 168",
        )
    if req.max_uses <= 0 or req.max_uses > 50:
        raise HTTPException(status_code=400, detail="max_uses must be between 1 and 50")

    invite = _create_invite_code_record(
        family_id=user["family_id"],
        created_by=user["user_id"],
        role=req.role,
        expires_in_hours=req.expires_in_hours,
        max_uses=req.max_uses,
    )

    return {
        "code": invite["code"],
        "role": invite["role"],
        "max_uses": invite["max_uses"],
        "used_count": invite["used_count"],
        "expires_at": invite["expires_at"],
        "is_active": invite["is_active"],
    }


@router.post("/invite")
async def create_invite_code_alias(req: InviteRequest, user: dict = Depends(require_member_or_admin)):
    """Backward-compatible alias for /invite-code."""
    return await create_invite_code(req, user)


@router.get("/invite-codes")
async def list_invite_codes(user: dict = Depends(require_member_or_admin)):
    """List invite codes for the current family (admin/member)."""
    supabase = get_supabase()
    result = (
        supabase.table("invite_codes")
        .select("id, code, role, max_uses, used_count, expires_at, is_active, created_at")
        .eq("family_id", user["family_id"])
        .order("created_at", desc=True)
        .limit(20)
        .execute()
    )
    return {"invite_codes": result.data or []}


@router.post("/join-family")
async def join_family_with_code(req: JoinFamilyRequest, user: dict = Depends(get_current_user)):
    """Redeem an invite code and join or switch to its family."""
    supabase = get_supabase()

    code = req.code.strip().upper()
    invite = _get_usable_invite(supabase, code)
    if user.get("family_id") == invite["family_id"]:
        raise HTTPException(status_code=409, detail="You are already a member of this family.")

    supabase.table("profiles").update(
        {"family_id": invite["family_id"], "role": invite["role"]}
    ).eq("id", user["user_id"]).execute()

    _consume_invite_code(supabase, invite)

    return {
        "message": "Joined family successfully",
        "family_id": invite["family_id"],
        "role": invite["role"],
    }
