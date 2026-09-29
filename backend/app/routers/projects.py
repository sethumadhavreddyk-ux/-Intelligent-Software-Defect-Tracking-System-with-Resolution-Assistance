from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Project, User
from app.schemas.schemas import ProjectResponse, ProjectCreate, ProjectUpdate
from app.auth.security import get_current_user, require_pm_or_admin

router = APIRouter(prefix="/projects", tags=["Project Management"])

@router.get("", response_model=List[ProjectResponse])
def get_projects(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Project).all()

@router.post("", response_model=ProjectResponse)
def create_project(
    project_in: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_pm_or_admin)
):
    if db.query(Project).filter(Project.key == project_in.key.upper()).first():
        raise HTTPException(status_code=400, detail=f"Project key '{project_in.key}' already exists")

    new_project = Project(
        name=project_in.name,
        key=project_in.key.upper(),
        description=project_in.description,
        team_id=project_in.team_id,
        lead_id=project_in.lead_id or current_user.id,
        status=project_in.status
    )
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    return new_project

@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: int,
    project_in: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_pm_or_admin)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if project_in.name is not None:
        project.name = project_in.name
    if project_in.description is not None:
        project.description = project_in.description
    if project_in.team_id is not None:
        project.team_id = project_in.team_id
    if project_in.lead_id is not None:
        project.lead_id = project_in.lead_id
    if project_in.status is not None:
        project.status = project_in.status

    db.commit()
    db.refresh(project)
    return project

@router.delete("/{project_id}")
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_pm_or_admin)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    db.delete(project)
    db.commit()
    return {"message": f"Project '{project.name}' deleted successfully"}
