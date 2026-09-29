from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Defect, IntegrationLog, User
from app.schemas.schemas import GitHubLinkRequest, SlackAlertRequest
from app.auth.security import get_current_user
from app.services.integration_service import sync_github_pr, dispatch_slack_alert

router = APIRouter(prefix="/integrations", tags=["Integrations: GitHub & Slack"])

@router.post("/github/link")
def link_github_pull_request(
    req: GitHubLinkRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    defect = db.query(Defect).filter(Defect.id == req.defect_id).first()
    if not defect:
        raise HTTPException(status_code=404, detail="Defect not found")

    result = sync_github_pr(
        db=db,
        defect=defect,
        pr_url=req.pr_url,
        commit_hash=req.commit_hash
    )
    return {"message": "GitHub pull request/commit successfully linked to defect", "data": result}

@router.post("/slack/alert")
def trigger_slack_notification(
    req: SlackAlertRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    defect_key = None
    if req.defect_id:
        d = db.query(Defect).filter(Defect.id == req.defect_id).first()
        if d:
            defect_key = d.key

    result = dispatch_slack_alert(
        db=db,
        message=req.message,
        channel=req.channel or "#defects-alerts",
        defect_key=defect_key
    )
    return {"message": "Slack notification dispatched successfully", "result": result}

@router.get("/logs")
def get_integration_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(IntegrationLog).order_by(IntegrationLog.created_at.desc()).limit(20).all()
