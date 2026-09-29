from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Defect, Sprint, User
from app.schemas.schemas import AskGeminiRequest, AskGeminiResponse
from app.auth.security import get_current_user
from app.services.ai_service import ai_service

router = APIRouter(prefix="/assistant", tags=["Ask Gemini AI Chatbot"])

@router.post("/chat", response_model=AskGeminiResponse)
def ask_gemini_assistant_chat(
    req: AskGeminiRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    defect_context = None
    if req.defect_id:
        d = db.query(Defect).filter(Defect.id == req.defect_id).first()
        if d:
            defect_context = (
                f"Key: {d.key}\nTitle: {d.title}\nStatus: {d.status.value}\n"
                f"Severity: {d.severity.value}\nCategory: {d.category.value}\n"
                f"Description: {d.raw_description or d.formatted_description}\n"
                f"Root Cause: {d.root_cause or 'Under investigation'}\n"
                f"Resolution Summary: {d.resolution_summary or 'Not yet resolved'}"
            )

    sprint_context = None
    if req.sprint_id:
        s = db.query(Sprint).filter(Sprint.id == req.sprint_id).first()
        if s:
            sprint_context = f"Sprint Name: {s.name}\nGoal: {s.goal}\nVelocity Target: {s.velocity_target}"

    result = ai_service.ask_gemini_chatbot(
        prompt=req.prompt,
        defect_context=defect_context,
        sprint_context=sprint_context
    )

    return AskGeminiResponse(
        response=result["response"],
        sources_cited=result.get("sources_cited", []),
        action_items=result.get("action_items", [])
    )
