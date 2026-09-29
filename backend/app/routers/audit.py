from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import ActivityLog, User
from app.schemas.schemas import ActivityLogResponse
from app.auth.security import get_current_user

router = APIRouter(prefix="/audit", tags=["Audit Trail & Activity Stream"])

@router.get("/activity", response_model=List[ActivityLogResponse])
def get_activity_feed(
    defect_id: Optional[int] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(ActivityLog)
    if defect_id:
        query = query.filter(ActivityLog.defect_id == defect_id)
    return query.order_by(ActivityLog.created_at.desc()).limit(limit).all()
