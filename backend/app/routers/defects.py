import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from app.database import get_db
from app.models.models import (
    Defect, DefectStatus, DefectPriority, DefectSeverity, DefectCategory,
    DefectComment, DefectAttachment, Project, User, UserRole, ActivityLog
)
from app.schemas.schemas import (
    DefectResponse, DefectCreate, DefectUpdate, DefectStatusUpdate,
    DefectCommentCreate, DefectCommentResponse,
    DefectAttachmentCreate, DefectAttachmentResponse
)
from app.auth.security import get_current_user, require_pm_or_admin
from app.services.integration_service import log_activity, broadcast_defect_event

router = APIRouter(prefix="/defects", tags=["Defects & Lifecycle"])

@router.get("", response_model=List[DefectResponse])
def get_defects(
    q: Optional[str] = None,
    status: Optional[DefectStatus] = None,
    severity: Optional[DefectSeverity] = None,
    priority: Optional[DefectPriority] = None,
    category: Optional[DefectCategory] = None,
    project_id: Optional[int] = None,
    sprint_id: Optional[int] = None,
    assignee_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Defect)

    if q:
        search_filter = or_(
            Defect.title.ilike(f"%{q}%"),
            Defect.key.ilike(f"%{q}%"),
            Defect.raw_description.ilike(f"%{q}%"),
            Defect.formatted_description.ilike(f"%{q}%")
        )
        query = query.filter(search_filter)

    if status:
        query = query.filter(Defect.status == status)
    if severity:
        query = query.filter(Defect.severity == severity)
    if priority:
        query = query.filter(Defect.priority == priority)
    if category:
        query = query.filter(Defect.category == category)
    if project_id:
        query = query.filter(Defect.project_id == project_id)
    if sprint_id:
        query = query.filter(Defect.sprint_id == sprint_id)
    if assignee_id:
        query = query.filter(Defect.assignee_id == assignee_id)

    return query.order_by(desc(Defect.created_at)).all()

@router.post("", response_model=DefectResponse)
def create_defect(
    defect_in: DefectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == defect_in.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Associated project not found")

    # Generate sequential defect key
    last_defect = db.query(Defect).order_by(desc(Defect.id)).first()
    next_id = (last_defect.id + 1) if last_defect else 101
    defect_key = f"DEF-{next_id}"

    new_defect = Defect(
        key=defect_key,
        title=defect_in.title,
        raw_description=defect_in.raw_description,
        formatted_description=defect_in.formatted_description,
        environment=defect_in.environment,
        steps_to_reproduce=defect_in.steps_to_reproduce,
        expected_result=defect_in.expected_result,
        actual_result=defect_in.actual_result,
        status=DefectStatus.REPORTED,
        priority=defect_in.priority,
        severity=defect_in.severity,
        category=defect_in.category,
        defect_type=defect_in.defect_type,
        project_id=defect_in.project_id,
        sprint_id=defect_in.sprint_id,
        reporter_id=current_user.id,
        assignee_id=defect_in.assignee_id,
        due_date=defect_in.due_date
    )
    db.add(new_defect)
    db.commit()
    db.refresh(new_defect)

    # Log activity
    log_activity(
        db=db,
        defect_id=new_defect.id,
        project_id=new_defect.project_id,
        user_id=current_user.id,
        action_type="CREATED",
        description=f"{current_user.full_name} reported defect {new_defect.key}: {new_defect.title}"
    )

    # Notify assignee if assigned
    if new_defect.assignee_id:
        broadcast_defect_event(
            db=db,
            defect=new_defect,
            event_title="New Defect Assigned",
            event_message=f"{current_user.full_name} assigned you {new_defect.key}: {new_defect.title}",
            event_type="ALERT"
        )

    return new_defect

@router.get("/{defect_id}", response_model=DefectResponse)
def get_defect(
    defect_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    defect = db.query(Defect).filter(Defect.id == defect_id).first()
    if not defect:
        raise HTTPException(status_code=404, detail="Defect not found")
    return defect

@router.put("/{defect_id}", response_model=DefectResponse)
def update_defect(
    defect_id: int,
    defect_in: DefectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    defect = db.query(Defect).filter(Defect.id == defect_id).first()
    if not defect:
        raise HTTPException(status_code=404, detail="Defect not found")

    # Update fields
    for field, val in defect_in.dict(exclude_unset=True).items():
        if val is not None:
            setattr(defect, field, val)

    defect.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(defect)

    log_activity(
        db=db,
        defect_id=defect.id,
        project_id=defect.project_id,
        user_id=current_user.id,
        action_type="UPDATED",
        description=f"{current_user.full_name} updated defect details for {defect.key}"
    )

    return defect

@router.patch("/{defect_id}/status", response_model=DefectResponse)
def update_defect_status(
    defect_id: int,
    status_update: DefectStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Drag-and-Drop or direct status transition.
    Enforces lifecycle: Reported -> Assigned -> In Progress -> In Review -> Resolved -> Verified -> Closed.
    Allows Reopened from Resolved/Closed.
    """
    defect = db.query(Defect).filter(Defect.id == defect_id).first()
    if not defect:
        raise HTTPException(status_code=404, detail="Defect not found")

    old_status = defect.status
    new_status = status_update.status

    if old_status == new_status:
        return defect

    # Role permission check on verification/close: QA, PM, Admin can verify/close
    if new_status in [DefectStatus.VERIFIED, DefectStatus.CLOSED]:
        if current_user.role not in [UserRole.QA, UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
            raise HTTPException(
                status_code=403,
                detail=f"Only QA Testers, Project Managers, or Admins can verify or close defects."
            )
        if new_status == DefectStatus.VERIFIED:
            defect.verified_by_id = current_user.id
            defect.closed_at = None
        elif new_status == DefectStatus.CLOSED:
            defect.closed_at = datetime.datetime.utcnow()

    if new_status == DefectStatus.RESOLVED:
        defect.resolved_at = datetime.datetime.utcnow()
        if status_update.root_cause:
            defect.root_cause = status_update.root_cause
        if status_update.resolution_summary:
            defect.resolution_summary = status_update.resolution_summary

    defect.status = new_status
    defect.updated_at = datetime.datetime.utcnow()

    # If comment provided with status change
    if status_update.comment:
        comment_entry = DefectComment(
            defect_id=defect.id,
            user_id=current_user.id,
            content=f"Status changed from {old_status.value} to {new_status.value}: {status_update.comment}"
        )
        db.add(comment_entry)

    db.commit()
    db.refresh(defect)

    # Activity Log
    log_activity(
        db=db,
        defect_id=defect.id,
        project_id=defect.project_id,
        user_id=current_user.id,
        action_type="STATUS_CHANGE",
        field_changed="status",
        old_value=old_status.value,
        new_value=new_status.value,
        description=f"{current_user.full_name} moved {defect.key} to '{new_status.value}'"
    )

    # Broadcast notification
    broadcast_defect_event(
        db=db,
        defect=defect,
        event_title=f"Defect Status: {new_status.value}",
        event_message=f"{current_user.full_name} transitioned {defect.key} to {new_status.value}.",
        event_type="SUCCESS" if new_status in [DefectStatus.RESOLVED, DefectStatus.VERIFIED, DefectStatus.CLOSED] else "INFO"
    )

    return defect

@router.delete("/{defect_id}")
def delete_defect(
    defect_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_pm_or_admin)
):
    defect = db.query(Defect).filter(Defect.id == defect_id).first()
    if not defect:
        raise HTTPException(status_code=404, detail="Defect not found")

    defect_key = defect.key
    db.delete(defect)
    db.commit()
    return {"message": f"Defect '{defect_key}' deleted successfully"}

@router.post("/{defect_id}/comments", response_model=DefectCommentResponse)
def add_comment(
    defect_id: int,
    comment_in: DefectCommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    defect = db.query(Defect).filter(Defect.id == defect_id).first()
    if not defect:
        raise HTTPException(status_code=404, detail="Defect not found")

    new_comment = DefectComment(
        defect_id=defect.id,
        user_id=current_user.id,
        content=comment_in.content
    )
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)

    log_activity(
        db=db,
        defect_id=defect.id,
        project_id=defect.project_id,
        user_id=current_user.id,
        action_type="COMMENTED",
        description=f"{current_user.full_name} commented on {defect.key}"
    )

    broadcast_defect_event(
        db=db,
        defect=defect,
        event_title="New Comment on Defect",
        event_message=f"{current_user.full_name}: {comment_in.content[:80]}...",
        event_type="INFO"
    )

    return new_comment

@router.get("/{defect_id}/attachments", response_model=List[DefectAttachmentResponse])
def get_defect_attachments(
    defect_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    defect = db.query(Defect).filter(Defect.id == defect_id).first()
    if not defect:
        raise HTTPException(status_code=404, detail="Defect not found")
    return db.query(DefectAttachment).filter(DefectAttachment.defect_id == defect_id).all()

@router.post("/{defect_id}/attachments", response_model=DefectAttachmentResponse)
def add_defect_attachment(
    defect_id: int,
    attachment_in: DefectAttachmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    defect = db.query(Defect).filter(Defect.id == defect_id).first()
    if not defect:
        raise HTTPException(status_code=404, detail="Defect not found")

    attachment = DefectAttachment(
        defect_id=defect.id,
        user_id=current_user.id,
        file_name=attachment_in.file_name,
        file_url=attachment_in.file_url,
        file_size=attachment_in.file_size,
        file_type=attachment_in.file_type
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)

    log_activity(
        db=db,
        defect_id=defect.id,
        project_id=defect.project_id,
        user_id=current_user.id,
        action_type="ATTACHMENT",
        description=f"{current_user.full_name} attached '{attachment.file_name}' to {defect.key}"
    )

    return attachment

@router.delete("/{defect_id}/attachments/{attachment_id}")
def delete_defect_attachment(
    defect_id: int,
    attachment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    attachment = db.query(DefectAttachment).filter(
        DefectAttachment.id == attachment_id,
        DefectAttachment.defect_id == defect_id
    ).first()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")

    db.delete(attachment)
    db.commit()
    return {"message": f"Attachment '{attachment.file_name}' deleted successfully"}

