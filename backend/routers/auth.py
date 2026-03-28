from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from services.supabase_client import get_supabase

router = APIRouter(prefix="/api/auth", tags=["auth"])


class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    display_name: str
    family_name: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class InviteRequest(BaseModel):
    email: EmailStr
    role: str = "member"


@router.post("/signup")
async def signup(req: SignupRequest):
    """Register a new user, create a family, and set up their profile."""
    supabase = get_supabase()

    # 1. Create the user in Supabase Auth
    auth_response = supabase.auth.sign_up(
        {"email": req.email, "password": req.password}
    )
    if not auth_response.user:
        raise HTTPException(status_code=400, detail="Failed to create user")

    user_id = auth_response.user.id

    # 2. Create a family
    family_result = (
        supabase.table("families")
        .insert({"name": req.family_name})
        .execute()
    )
    family_id = family_result.data[0]["id"]

    # 3. Create profile (admin role for family creator)
    supabase.table("profiles").insert(
        {
            "id": user_id,
            "family_id": family_id,
            "display_name": req.display_name,
            "role": "admin",
        }
    ).execute()

    return {
        "user_id": user_id,
        "family_id": family_id,
        "message": "Account created successfully",
    }


@router.post("/login")
async def login(req: LoginRequest):
    """Login and return session tokens."""
    supabase = get_supabase()
    try:
        auth_response = supabase.auth.sign_in_with_password(
            {"email": req.email, "password": req.password}
        )
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return {
        "access_token": auth_response.session.access_token,
        "refresh_token": auth_response.session.refresh_token,
        "user": {
            "id": auth_response.user.id,
            "email": auth_response.user.email,
        },
    }
