from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from services.supabase_client import get_supabase

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """Verify token against Supabase Auth and return user info with family_id and role."""
    token = credentials.credentials
    supabase = get_supabase()
    try:
        user_response = supabase.auth.get_user(token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    user = user_response.user
    if not user or not user.id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )
    user_id = user.id

    # Fetch profile to get family_id and role
    result = (
        supabase.table("profiles")
        .select("family_id, role, display_name")
        .eq("id", user_id)
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found",
        )

    return {
        "user_id": user_id,
        "family_id": result.data["family_id"],
        "role": result.data["role"],
        "display_name": result.data["display_name"],
    }


async def require_admin(user: dict = Depends(get_current_user)):
    """Dependency that requires admin role."""
    if user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user


async def require_member_or_admin(user: dict = Depends(get_current_user)):
    """Dependency that allows admins and members."""
    if user["role"] not in ("admin", "member"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or member access required",
        )
    return user
