from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Sprint, Defect, Project, User
from app.schemas.schemas import (
    SprintResponse, SprintCreate, SprintUpdate, SprintHealthResponse
)
from app.auth.security import get_current_user, require_pm_or_admin
from app.services.sprint_service import sprint_health_engine

router = APIRouter(prefix="/sprints", tags=["Sprint Management & Health"])

@router.get("", response_model=List[SprintResponse])
def get_sprints(
    project_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Sprint)
    if project_id:
        query = query.filter(Sprint.project_id == project_id)
    
    sprints = query.all()
    results = []
    for s in sprints:
        defects = db.query(Defect).filter(Defect.sprint_id == s.id).all()
        resolved_count = sum(1 for d in defects if d.status.value in ["Resolved", "Verified", "Closed"])
        results.append(SprintResponse(
            id=s.id,
            name=s.name,
            project_id=s.project_id,
            goal=s.goal,
            start_date=s.start_date,
            end_date=s.end_date,
            status=s.status,
            velocity_target=s.velocity_target,
            created_at=s.created_at,
            defect_count=len(defects),
            resolved_count=resolved_count
        ))
    return results

@router.post("", response_model=SprintResponse)
def create_sprint(
    sprint_in: SprintCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_pm_or_admin)
):
    project = db.query(Project).filter(Project.id == sprint_in.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Associated project not found")

    new_sprint = Sprint(
        name=sprint_in.name,
        project_id=sprint_in.project_id,
        goal=sprint_in.goal,
        start_date=sprint_in.start_date,
        end_date=sprint_in.end_date,
        status=sprint_in.status,
        velocity_target=sprint_in.velocity_target
    )
    db.add(new_sprint)
    db.commit()
    db.refresh(new_sprint)
    
    return SprintResponse(
        id=new_sprint.id,
        name=new_sprint.name,
        project_id=new_sprint.project_id,
        goal=new_sprint.goal,
        start_date=new_sprint.start_date,
        end_date=new_sprint.end_date,
        status=new_sprint.status,
        velocity_target=new_sprint.velocity_target,
        created_at=new_sprint.created_at,
        defect_count=0,
        resolved_count=0
    )

@router.get("/{sprint_id}", response_model=SprintResponse)
def get_sprint(
    sprint_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sprint = db.query(Sprint).filter(Sprint.id == sprint_id).first()
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")

    defects = db.query(Defect).filter(Defect.sprint_id == sprint.id).all()
    resolved_count = sum(1 for d in defects if d.status.value in ["Resolved", "Verified", "Closed"])

    return SprintResponse(
        id=sprint.id,
        name=sprint.name,
        project_id=sprint.project_id,
        goal=sprint.goal,
        start_date=sprint.start_date,
        end_date=sprint.end_date,
        status=sprint.status,
        velocity_target=sprint.velocity_target,
        created_at=sprint.created_at,
        defect_count=len(defects),
        resolved_count=resolved_count
    )

@router.put("/{sprint_id}", response_model=SprintResponse)
def update_sprint(
    sprint_id: int,
    sprint_in: SprintUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_pm_or_admin)
):
    sprint = db.query(Sprint).filter(Sprint.id == sprint_id).first()
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")

    if sprint_in.name is not None:
        sprint.name = sprint_in.name
    if sprint_in.goal is not None:
        sprint.goal = sprint_in.goal
    if sprint_in.start_date is not None:
        sprint.start_date = sprint_in.start_date
    if sprint_in.end_date is not None:
        sprint.end_date = sprint_in.end_date
    if sprint_in.status is not None:
        sprint.status = sprint_in.status
    if sprint_in.velocity_target is not None:
        sprint.velocity_target = sprint_in.velocity_target

    db.commit()
    db.refresh(sprint)

    defects = db.query(Defect).filter(Defect.sprint_id == sprint.id).all()
    resolved_count = sum(1 for d in defects if d.status.value in ["Resolved", "Verified", "Closed"])

    return SprintResponse(
        id=sprint.id,
        name=sprint.name,
        project_id=sprint.project_id,
        goal=sprint.goal,
        start_date=sprint.start_date,
        end_date=sprint.end_date,
        status=sprint.status,
        velocity_target=sprint.velocity_target,
        created_at=sprint.created_at,
        defect_count=len(defects),
        resolved_count=resolved_count
    )

@router.delete("/{sprint_id}")
def delete_sprint(
    sprint_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_pm_or_admin)
):
    sprint = db.query(Sprint).filter(Sprint.id == sprint_id).first()
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")

    # Unassign defects
    db.query(Defect).filter(Defect.sprint_id == sprint.id).update({"sprint_id": None})
    db.delete(sprint)
    db.commit()
    return {"message": f"Sprint '{sprint.name}' deleted successfully"}

@router.get("/{sprint_id}/health", response_model=SprintHealthResponse)
def get_sprint_health(
    sprint_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sprint = db.query(Sprint).filter(Sprint.id == sprint_id).first()
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")

    defects = db.query(Defect).filter(Defect.sprint_id == sprint.id).all()
    health_data = sprint_health_engine.calculate_health(sprint, defects)
    return health_data

@router.post("/{sprint_id}/assign-defects")
def assign_defects_to_sprint(
    sprint_id: int,
    defect_ids: List[int],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_pm_or_admin)
):
    sprint = db.query(Sprint).filter(Sprint.id == sprint_id).first()
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")

    updated = db.query(Defect).filter(Defect.id.in_(defect_ids)).update(
        {"sprint_id": sprint.id}, synchronize_session=False
    )
    db.commit()
    return {"message": f"Assigned {updated} defect(s) to sprint '{sprint.name}'"}
