from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends

from middleware.auth import get_current_user
from routers.operations import ensure_required_docs_seeded
from services.supabase_client import get_supabase

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _parse_ts(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _days_until(value: Optional[str]) -> Optional[int]:
    dt = _parse_ts(value)
    if not dt:
        return None
    delta = dt - datetime.now(timezone.utc)
    return int(delta.total_seconds() // 86400)


def _build_ai_suggestions(
    urgent_deadlines: list[dict],
    assigned_tasks: list[dict],
    upcoming_events: list[dict],
    missing_documents: list[dict],
    recent_uploads: list[dict],
) -> list[dict]:
    suggestions: list[dict] = []
    now = datetime.now(timezone.utc)

    overdue = [d for d in urgent_deadlines if _days_until(d.get("due_at")) is not None and _days_until(d.get("due_at")) < 0]
    if overdue:
        suggestions.append(
            {
                "id": "overdue-deadlines",
                "priority": "high",
                "title": f"{len(overdue)} deadline(s) are overdue",
                "reason": "Overdue items can block family workflows.",
                "action_label": "Review deadlines",
                "action_type": "open_deadlines",
            }
        )

    due_soon = [
        d for d in urgent_deadlines
        if _days_until(d.get("due_at")) is not None and 0 <= _days_until(d.get("due_at")) <= 3
    ]
    if due_soon:
        suggestions.append(
            {
                "id": "due-soon",
                "priority": "high",
                "title": f"{len(due_soon)} deadline(s) due in the next 3 days",
                "reason": "Handle these now to avoid becoming overdue.",
                "action_label": "Plan next actions",
                "action_type": "open_deadlines",
            }
        )

    if missing_documents:
        labels = ", ".join(doc["required_doc_templates"]["title"] for doc in missing_documents[:2])
        suggestions.append(
            {
                "id": "missing-docs",
                "priority": "medium",
                "title": f"{len(missing_documents)} required document(s) missing",
                "reason": f"Missing docs include: {labels}",
                "action_label": "Update checklist",
                "action_type": "open_missing_documents",
            }
        )

    unassigned_tasks = [t for t in assigned_tasks if not t.get("assigned_to")]
    if unassigned_tasks:
        suggestions.append(
            {
                "id": "unassigned-work",
                "priority": "medium",
                "title": f"{len(unassigned_tasks)} task(s) have no assignee",
                "reason": "Ownership is required for completion.",
                "action_label": "Assign owners",
                "action_type": "open_tasks",
            }
        )

    recent_by_others = [
        d for d in recent_uploads
        if _parse_ts(d.get("created_at")) and (now - _parse_ts(d.get("created_at"))).total_seconds() <= 86400
    ]
    if recent_by_others:
        suggestions.append(
            {
                "id": "recent-uploads-review",
                "priority": "low",
                "title": "New documents were uploaded in the last 24 hours",
                "reason": "Recent uploads may need review and follow-up tasks.",
                "action_label": "Open documents",
                "action_type": "open_documents",
            }
        )

    if not upcoming_events:
        suggestions.append(
            {
                "id": "no-upcoming-events",
                "priority": "low",
                "title": "No upcoming family events",
                "reason": "Add reminders for appointments, school dates, and bills.",
                "action_label": "Create event",
                "action_type": "create_event",
            }
        )

    order = {"high": 0, "medium": 1, "low": 2}
    suggestions.sort(key=lambda item: order.get(item["priority"], 3))
    return suggestions[:6]


@router.get("")
async def get_dashboard(user: dict = Depends(get_current_user)):
    if not user.get("family_id"):
        return {
            "urgent_deadlines": [],
            "assigned_tasks": [],
            "upcoming_events": [],
            "missing_documents": [],
            "recent_uploads": [],
            "ai_suggested_actions": [],
        }

    family_id = user["family_id"]
    user_id = user["user_id"]
    supabase = get_supabase()
    ensure_required_docs_seeded(family_id)
    now_iso = _iso_now()

    urgent_deadlines = (
        supabase.table("family_work_items")
        .select("*")
        .eq("family_id", family_id)
        .eq("kind", "deadline")
        .in_("status", ["todo", "in_progress", "overdue"])
        .lte("due_at", (datetime.now(timezone.utc) + timedelta(days=14)).isoformat())
        .order("due_at", desc=False)
        .limit(8)
        .execute()
        .data
        or []
    )

    assigned_tasks = (
        supabase.table("family_work_items")
        .select("*")
        .eq("family_id", family_id)
        .eq("kind", "task")
        .in_("status", ["todo", "in_progress", "overdue"])
        .or_(f"assigned_to.eq.{user_id},assigned_to.is.null")
        .order("due_at", desc=False)
        .order("created_at", desc=True)
        .limit(10)
        .execute()
        .data
        or []
    )

    routines_due_soon = (
        supabase.table("family_routines")
        .select("*")
        .eq("family_id", family_id)
        .eq("active", True)
        .or_(f"assigned_to.eq.{user_id},assigned_to.is.null")
        .lte("next_due_at", (datetime.now(timezone.utc) + timedelta(days=7)).isoformat())
        .order("next_due_at", desc=False)
        .limit(5)
        .execute()
        .data
        or []
    )

    for routine in routines_due_soon:
        assigned_tasks.append(
            {
                "id": routine["id"],
                "kind": "task",
                "status": "todo",
                "title": routine["title"],
                "description": routine.get("description") or "",
                "priority": "medium",
                "due_at": routine["next_due_at"],
                "assigned_to": routine.get("assigned_to"),
                "source": "routine",
                "cadence": routine.get("cadence"),
            }
        )

    upcoming_events = (
        supabase.table("family_events")
        .select("*")
        .eq("family_id", family_id)
        .gte("starts_at", now_iso)
        .order("starts_at", desc=False)
        .limit(8)
        .execute()
        .data
        or []
    )

    missing_documents = (
        supabase.table("family_required_docs")
        .select("id, enabled, completed, notes, required_doc_templates(id, template_key, title, category, description)")
        .eq("family_id", family_id)
        .eq("enabled", True)
        .eq("completed", False)
        .order("created_at", desc=False)
        .limit(8)
        .execute()
        .data
        or []
    )

    recent_uploads = (
        supabase.table("documents")
        .select("id, filename, category, created_at, uploaded_by, profiles(display_name)")
        .eq("family_id", family_id)
        .order("created_at", desc=True)
        .limit(8)
        .execute()
        .data
        or []
    )

    ai_suggested_actions = _build_ai_suggestions(
        urgent_deadlines=urgent_deadlines,
        assigned_tasks=assigned_tasks,
        upcoming_events=upcoming_events,
        missing_documents=missing_documents,
        recent_uploads=recent_uploads,
    )

    return {
        "urgent_deadlines": urgent_deadlines,
        "assigned_tasks": assigned_tasks,
        "upcoming_events": upcoming_events,
        "missing_documents": missing_documents,
        "recent_uploads": recent_uploads,
        "ai_suggested_actions": ai_suggested_actions,
    }
