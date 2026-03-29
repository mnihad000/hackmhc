from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from middleware.auth import get_current_user, require_member_or_admin
from services.supabase_client import get_supabase

router = APIRouter(prefix="/api/family", tags=["operations"])


def _ensure_in_family(user: dict):
    if not user.get("family_id"):
        raise HTTPException(status_code=404, detail="User is not in a family")


def ensure_required_docs_seeded(family_id: str) -> None:
    supabase = get_supabase()
    templates = supabase.table("required_doc_templates").select("id").execute().data or []
    if not templates:
        return

    existing = (
        supabase.table("family_required_docs")
        .select("template_id")
        .eq("family_id", family_id)
        .execute()
        .data
        or []
    )
    existing_ids = {row["template_id"] for row in existing}
    missing_rows = [
        {"family_id": family_id, "template_id": template["id"]}
        for template in templates
        if template["id"] not in existing_ids
    ]
    if missing_rows:
        supabase.table("family_required_docs").insert(missing_rows).execute()


class WorkItemCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = ""
    kind: str = Field(pattern="^(deadline|task)$")
    priority: str = Field(default="medium", pattern="^(low|medium|high)$")
    due_at: Optional[datetime] = None
    assigned_to: Optional[str] = None


class WorkItemUpdateRequest(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = None
    status: Optional[str] = Field(default=None, pattern="^(todo|in_progress|done|overdue)$")
    priority: Optional[str] = Field(default=None, pattern="^(low|medium|high)$")
    due_at: Optional[datetime] = None
    assigned_to: Optional[str] = None


@router.get("/work-items")
async def list_work_items(
    kind: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    assigned_to_me: bool = Query(False),
    user: dict = Depends(get_current_user),
):
    _ensure_in_family(user)
    supabase = get_supabase()
    query = (
        supabase.table("family_work_items")
        .select("*")
        .eq("family_id", user["family_id"])
        .order("due_at", desc=False)
        .order("created_at", desc=True)
    )

    if kind in ("deadline", "task"):
        query = query.eq("kind", kind)
    if status in ("todo", "in_progress", "done", "overdue"):
        query = query.eq("status", status)
    if assigned_to_me:
        query = query.eq("assigned_to", user["user_id"])

    result = query.execute()
    return {"work_items": result.data or []}


@router.post("/work-items")
async def create_work_item(
    req: WorkItemCreateRequest,
    user: dict = Depends(require_member_or_admin),
):
    _ensure_in_family(user)
    supabase = get_supabase()
    payload = {
        "family_id": user["family_id"],
        "title": req.title.strip(),
        "description": req.description.strip(),
        "kind": req.kind,
        "priority": req.priority,
        "due_at": req.due_at.isoformat() if req.due_at else None,
        "assigned_to": req.assigned_to,
        "created_by": user["user_id"],
    }
    created = supabase.table("family_work_items").insert(payload).execute()
    return {"work_item": (created.data or [None])[0]}


@router.patch("/work-items/{item_id}")
async def update_work_item(
    item_id: str,
    req: WorkItemUpdateRequest,
    user: dict = Depends(get_current_user),
):
    _ensure_in_family(user)
    supabase = get_supabase()
    item = (
        supabase.table("family_work_items")
        .select("*")
        .eq("id", item_id)
        .eq("family_id", user["family_id"])
        .single()
        .execute()
        .data
    )
    if not item:
        raise HTTPException(status_code=404, detail="Work item not found")

    update_data = req.model_dump(exclude_none=True)
    if "due_at" in update_data and update_data["due_at"] is not None:
        update_data["due_at"] = update_data["due_at"].isoformat()

    if user["role"] == "child":
        if set(update_data.keys()) - {"status"}:
            raise HTTPException(status_code=403, detail="Children can only update status")
        if item.get("assigned_to") != user["user_id"]:
            raise HTTPException(status_code=403, detail="Not assigned to you")
        if update_data.get("status") != "done":
            raise HTTPException(status_code=400, detail="Children can only mark item as done")
    elif user["role"] not in ("admin", "member"):
        raise HTTPException(status_code=403, detail="Not allowed")

    if update_data.get("status") == "done":
        update_data["completed_at"] = datetime.now(timezone.utc).isoformat()

    updated = (
        supabase.table("family_work_items")
        .update(update_data)
        .eq("id", item_id)
        .eq("family_id", user["family_id"])
        .execute()
    )
    return {"work_item": (updated.data or [None])[0]}


@router.delete("/work-items/{item_id}")
async def delete_work_item(
    item_id: str,
    user: dict = Depends(require_member_or_admin),
):
    _ensure_in_family(user)
    supabase = get_supabase()
    deleted = (
        supabase.table("family_work_items")
        .delete()
        .eq("id", item_id)
        .eq("family_id", user["family_id"])
        .execute()
    )
    if not deleted.data:
        raise HTTPException(status_code=404, detail="Work item not found")
    return {"message": "Work item deleted"}


class RoutineCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = ""
    cadence: str = Field(pattern="^(daily|weekly|monthly)$")
    next_due_at: datetime
    assigned_to: Optional[str] = None


class RoutineUpdateRequest(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = None
    cadence: Optional[str] = Field(default=None, pattern="^(daily|weekly|monthly)$")
    next_due_at: Optional[datetime] = None
    assigned_to: Optional[str] = None
    active: Optional[bool] = None


@router.get("/routines")
async def list_routines(
    active_only: bool = Query(True),
    user: dict = Depends(get_current_user),
):
    _ensure_in_family(user)
    supabase = get_supabase()
    query = (
        supabase.table("family_routines")
        .select("*")
        .eq("family_id", user["family_id"])
        .order("next_due_at", desc=False)
    )
    if active_only:
        query = query.eq("active", True)
    result = query.execute()
    return {"routines": result.data or []}


@router.post("/routines")
async def create_routine(
    req: RoutineCreateRequest,
    user: dict = Depends(require_member_or_admin),
):
    _ensure_in_family(user)
    supabase = get_supabase()
    created = (
        supabase.table("family_routines")
        .insert(
            {
                "family_id": user["family_id"],
                "title": req.title.strip(),
                "description": req.description.strip(),
                "cadence": req.cadence,
                "next_due_at": req.next_due_at.isoformat(),
                "assigned_to": req.assigned_to,
                "created_by": user["user_id"],
            }
        )
        .execute()
    )
    return {"routine": (created.data or [None])[0]}


@router.patch("/routines/{routine_id}")
async def update_routine(
    routine_id: str,
    req: RoutineUpdateRequest,
    user: dict = Depends(require_member_or_admin),
):
    _ensure_in_family(user)
    supabase = get_supabase()
    update_data = req.model_dump(exclude_none=True)
    if "next_due_at" in update_data and update_data["next_due_at"] is not None:
        update_data["next_due_at"] = update_data["next_due_at"].isoformat()

    updated = (
        supabase.table("family_routines")
        .update(update_data)
        .eq("id", routine_id)
        .eq("family_id", user["family_id"])
        .execute()
    )
    if not updated.data:
        raise HTTPException(status_code=404, detail="Routine not found")
    return {"routine": updated.data[0]}


@router.delete("/routines/{routine_id}")
async def delete_routine(
    routine_id: str,
    user: dict = Depends(require_member_or_admin),
):
    _ensure_in_family(user)
    supabase = get_supabase()
    deleted = (
        supabase.table("family_routines")
        .delete()
        .eq("id", routine_id)
        .eq("family_id", user["family_id"])
        .execute()
    )
    if not deleted.data:
        raise HTTPException(status_code=404, detail="Routine not found")
    return {"message": "Routine deleted"}


class EventCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = ""
    starts_at: datetime
    ends_at: Optional[datetime] = None
    location: str = ""


class EventUpdateRequest(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = None
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    location: Optional[str] = None


@router.get("/events")
async def list_events(
    upcoming_only: bool = Query(True),
    user: dict = Depends(get_current_user),
):
    _ensure_in_family(user)
    supabase = get_supabase()
    query = (
        supabase.table("family_events")
        .select("*")
        .eq("family_id", user["family_id"])
        .order("starts_at", desc=False)
    )
    if upcoming_only:
        query = query.gte("starts_at", datetime.now(timezone.utc).isoformat())
    result = query.execute()
    return {"events": result.data or []}


@router.post("/events")
async def create_event(
    req: EventCreateRequest,
    user: dict = Depends(require_member_or_admin),
):
    _ensure_in_family(user)
    supabase = get_supabase()
    created = (
        supabase.table("family_events")
        .insert(
            {
                "family_id": user["family_id"],
                "title": req.title.strip(),
                "description": req.description.strip(),
                "starts_at": req.starts_at.isoformat(),
                "ends_at": req.ends_at.isoformat() if req.ends_at else None,
                "location": req.location.strip(),
                "created_by": user["user_id"],
            }
        )
        .execute()
    )
    return {"event": (created.data or [None])[0]}


@router.patch("/events/{event_id}")
async def update_event(
    event_id: str,
    req: EventUpdateRequest,
    user: dict = Depends(require_member_or_admin),
):
    _ensure_in_family(user)
    supabase = get_supabase()
    update_data = req.model_dump(exclude_none=True)
    if "starts_at" in update_data and update_data["starts_at"] is not None:
        update_data["starts_at"] = update_data["starts_at"].isoformat()
    if "ends_at" in update_data and update_data["ends_at"] is not None:
        update_data["ends_at"] = update_data["ends_at"].isoformat()

    updated = (
        supabase.table("family_events")
        .update(update_data)
        .eq("id", event_id)
        .eq("family_id", user["family_id"])
        .execute()
    )
    if not updated.data:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"event": updated.data[0]}


@router.delete("/events/{event_id}")
async def delete_event(
    event_id: str,
    user: dict = Depends(require_member_or_admin),
):
    _ensure_in_family(user)
    supabase = get_supabase()
    deleted = (
        supabase.table("family_events")
        .delete()
        .eq("id", event_id)
        .eq("family_id", user["family_id"])
        .execute()
    )
    if not deleted.data:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"message": "Event deleted"}


class RequiredDocUpdateRequest(BaseModel):
    enabled: Optional[bool] = None
    completed: Optional[bool] = None
    notes: Optional[str] = None


@router.get("/required-docs")
async def list_required_docs(
    user: dict = Depends(get_current_user),
):
    _ensure_in_family(user)
    ensure_required_docs_seeded(user["family_id"])
    supabase = get_supabase()
    result = (
        supabase.table("family_required_docs")
        .select("id, enabled, completed, completed_at, notes, created_at, required_doc_templates(id, template_key, title, category, description)")
        .eq("family_id", user["family_id"])
        .order("created_at", desc=False)
        .execute()
    )
    return {"required_docs": result.data or []}


@router.patch("/required-docs/{required_doc_id}")
async def update_required_doc(
    required_doc_id: str,
    req: RequiredDocUpdateRequest,
    user: dict = Depends(require_member_or_admin),
):
    _ensure_in_family(user)
    update_data = req.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No updates provided")
    if "completed" in update_data:
        update_data["completed_at"] = (
            datetime.now(timezone.utc).isoformat() if update_data["completed"] else None
        )

    supabase = get_supabase()
    updated = (
        supabase.table("family_required_docs")
        .update(update_data)
        .eq("id", required_doc_id)
        .eq("family_id", user["family_id"])
        .execute()
    )
    if not updated.data:
        raise HTTPException(status_code=404, detail="Required document not found")
    return {"required_doc": updated.data[0]}
