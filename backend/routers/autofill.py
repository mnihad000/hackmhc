from fastapi import APIRouter, Depends
from pydantic import BaseModel
from middleware.auth import get_current_user
from services.rag import autofill_query

router = APIRouter(prefix="/api/autofill", tags=["autofill"])


class FormField(BaseModel):
    field_name: str
    label: str = ""
    type: str = "text"


class AutofillRequest(BaseModel):
    fields: list[FormField]


@router.post("")
async def autofill(req: AutofillRequest, user: dict = Depends(get_current_user)):
    """
    Receive form field descriptors from the Chrome extension,
    match them against document data, and return fill values.
    """
    result = await autofill_query(
        fields=[f.model_dump() for f in req.fields],
        family_id=user["family_id"],
    )
    return result
