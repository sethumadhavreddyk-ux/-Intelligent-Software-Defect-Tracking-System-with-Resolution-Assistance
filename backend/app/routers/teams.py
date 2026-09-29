from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Team, TeamMember, User, UserRole
from app.schemas.schemas import (
    TeamResponse, TeamCreate, TeamUpdate, TeamMemberAdd, TeamMemberResponse
)
from app.auth.security import get_current_user, require_pm_or_admin

router = APIRouter(prefix="/teams", tags=["Team Management"])

@router.get("", response_model=List[TeamResponse])
def get_teams(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Team).all()

@router.post("", response_model=TeamResponse)
def create_team(
    team_in: TeamCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_pm_or_admin)
):
    if db.query(Team).filter(Team.name == team_in.name).first():
        raise HTTPException(status_code=400, detail="Team name already exists")

    new_team = Team(
        name=team_in.name,
        description=team_in.description,
        lead_id=team_in.lead_id or current_user.id
    )
    db.add(new_team)
    db.commit()
    db.refresh(new_team)

    # Automatically add the creator/lead as a team member
    if new_team.lead_id:
        lead_member = TeamMember(
            team_id=new_team.id,
            user_id=new_team.lead_id,
            role_in_team="Team Lead"
        )
        db.add(lead_member)
        db.commit()
        db.refresh(new_team)

    return new_team

@router.get("/{team_id}", response_model=TeamResponse)
def get_team(
    team_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team

@router.put("/{team_id}", response_model=TeamResponse)
def update_team(
    team_id: int,
    team_in: TeamUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_pm_or_admin)
):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    if team_in.name is not None:
        team.name = team_in.name
    if team_in.description is not None:
        team.description = team_in.description
    if team_in.lead_id is not None:
        team.lead_id = team_in.lead_id

    db.commit()
    db.refresh(team)
    return team

@router.delete("/{team_id}")
def delete_team(
    team_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_pm_or_admin)
):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    db.delete(team)
    db.commit()
    return {"message": f"Team '{team.name}' deleted successfully"}

@router.post("/{team_id}/members", response_model=TeamMemberResponse)
def add_developer_to_team(
    team_id: int,
    member_in: TeamMemberAdd,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_pm_or_admin)
):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    user = db.query(User).filter(User.id == member_in.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Developer/User not found")

    existing = db.query(TeamMember).filter(
        TeamMember.team_id == team_id,
        TeamMember.user_id == member_in.user_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="User is already in this team")

    new_member = TeamMember(
        team_id=team_id,
        user_id=member_in.user_id,
        role_in_team=member_in.role_in_team
    )
    db.add(new_member)
    db.commit()
    db.refresh(new_member)
    return new_member

@router.delete("/{team_id}/members/{user_id}")
def remove_developer_from_team(
    team_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_pm_or_admin)
):
    member = db.query(TeamMember).filter(
        TeamMember.team_id == team_id,
        TeamMember.user_id == user_id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Team member not found")

    db.delete(member)
    db.commit()
    return {"message": "Developer removed from team successfully"}
