import datetime
from typing import Dict, Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.models import (
    Defect, DefectStatus, DefectSeverity, DefectCategory, User, UserRole,
    Sprint, SprintStatus, ActivityLog
)
from app.schemas.schemas import DashboardSummaryResponse, SprintHealthResponse
from app.auth.security import get_current_user
from app.services.sprint_service import sprint_health_engine

router = APIRouter(prefix="/analytics", tags=["Analytics & Reporting"])

@router.get("/dashboard", response_model=DashboardSummaryResponse)
def get_dashboard_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    all_defects = db.query(Defect).all()
    total = len(all_defects)

    open_statuses = [DefectStatus.REPORTED, DefectStatus.ASSIGNED, DefectStatus.IN_PROGRESS, DefectStatus.IN_REVIEW, DefectStatus.REOPENED]
    open_count = sum(1 for d in all_defects if d.status in open_statuses)
    in_prog_count = sum(1 for d in all_defects if d.status == DefectStatus.IN_PROGRESS)
    resolved_count = sum(1 for d in all_defects if d.status == DefectStatus.RESOLVED)
    verified_count = sum(1 for d in all_defects if d.status == DefectStatus.VERIFIED)
    closed_count = sum(1 for d in all_defects if d.status == DefectStatus.CLOSED)
    reopened_count = sum(1 for d in all_defects if d.status == DefectStatus.REOPENED)

    critical_count = sum(1 for d in all_defects if d.severity == DefectSeverity.CRITICAL)
    high_count = sum(1 for d in all_defects if d.severity == DefectSeverity.HIGH)

    # Average resolution hours for resolved/closed defects
    resolution_times = []
    for d in all_defects:
        if d.resolved_at and d.created_at:
            delta = (d.resolved_at - d.created_at).total_seconds() / 3600.0
            resolution_times.append(delta)
    avg_hours = round(sum(resolution_times) / len(resolution_times), 1) if resolution_times else 14.5

    # Breakdown by severity
    sev_map = {s.value: 0 for s in DefectSeverity}
    for d in all_defects:
        if d.severity:
            sev_map[d.severity.value] = sev_map.get(d.severity.value, 0) + 1

    # Breakdown by status
    status_map = {s.value: 0 for s in DefectStatus}
    for d in all_defects:
        if d.status:
            status_map[d.status.value] = status_map.get(d.status.value, 0) + 1

    # Breakdown by category
    cat_map = {c.value: 0 for c in DefectCategory}
    for d in all_defects:
        if d.category:
            cat_map[d.category.value] = cat_map.get(d.category.value, 0) + 1

    # Developer workload
    developers = db.query(User).filter(User.role.in_([UserRole.DEVELOPER, UserRole.ADMIN, UserRole.PROJECT_MANAGER])).all()
    dev_workload = []
    for dev in developers:
        assigned = [d for d in all_defects if d.assignee_id == dev.id]
        active = [d for d in assigned if d.status in open_statuses]
        resolved = [d for d in assigned if d.status in [DefectStatus.RESOLVED, DefectStatus.VERIFIED, DefectStatus.CLOSED]]
        dev_workload.append({
            "user_id": dev.id,
            "username": dev.username,
            "full_name": dev.full_name,
            "role": dev.role.value,
            "total_assigned": len(assigned),
            "active_defects": len(active),
            "resolved_defects": len(resolved),
            "critical_count": sum(1 for d in active if d.severity == DefectSeverity.CRITICAL)
        })

    # Recent activity
    recent_logs = db.query(ActivityLog).order_by(ActivityLog.created_at.desc()).limit(10).all()
    activity_data = [
        {
            "id": log.id,
            "defect_id": log.defect_id,
            "action_type": log.action_type,
            "description": log.description,
            "timestamp": log.created_at.isoformat()
        }
        for log in recent_logs
    ]

    # Active sprint health summary
    active_sprint = db.query(Sprint).filter(Sprint.status == SprintStatus.ACTIVE).first()
    sprint_health_data = None
    if active_sprint:
        sprint_defects = db.query(Defect).filter(Defect.sprint_id == active_sprint.id).all()
        health_dict = sprint_health_engine.calculate_health(active_sprint, sprint_defects)
        sprint_health_data = SprintHealthResponse(**health_dict)

    return DashboardSummaryResponse(
        total_defects=total,
        open_defects=open_count,
        in_progress_defects=in_prog_count,
        resolved_defects=resolved_count,
        verified_defects=verified_count,
        closed_defects=closed_count,
        reopened_defects=reopened_count,
        critical_defects=critical_count,
        high_defects=high_count,
        avg_resolution_hours=avg_hours,
        defects_by_severity=sev_map,
        defects_by_status=status_map,
        defects_by_category=cat_map,
        developer_workload=dev_workload,
        recent_activity=activity_data,
        sprint_health_overview=sprint_health_data
    )
