from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import User, UserRole
from app.schemas.schemas import UserResponse, UserCreate, UserUpdate, RoleAssignRequest, RolePermissionMatrixItem
from app.auth.security import get_current_user, require_admin, require_pm_or_admin, hash_password

router = APIRouter(prefix="/users", tags=["User Management"])

@router.get("", response_model=List[UserResponse])
def get_users(
    role: Optional[UserRole] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    return query.all()

@router.get("/developers", response_model=List[UserResponse])
def get_developers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(User).filter(User.role.in_([UserRole.DEVELOPER, UserRole.ADMIN, UserRole.PROJECT_MANAGER])).all()

@router.get("/{user_id}", response_model=UserResponse)
def get_user_by_id(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.post("", response_model=UserResponse)
def create_user_by_admin(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    if db.query(User).filter((User.username == user_in.username) | (User.email == user_in.email)).first():
        raise HTTPException(status_code=400, detail="Username or email already exists")

    new_user = User(
        username=user_in.username,
        email=user_in.email,
        full_name=user_in.full_name,
        hashed_password=hash_password(user_in.password),
        role=user_in.role or UserRole.DEVELOPER,
        avatar_url=user_in.avatar_url or f"https://api.dicebear.com/7.x/bottts/svg?seed={user_in.username}"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user_update.full_name is not None:
        user.full_name = user_update.full_name
    if user_update.email is not None:
        user.email = user_update.email
    if user_update.role is not None:
        if current_user.role not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
            raise HTTPException(status_code=403, detail="Only Admins and Project Managers can assign roles")
        if user_update.role == UserRole.ADMIN and current_user.role != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Only Admins can grant the Admin role")
        user.role = user_update.role
    if user_update.avatar_url is not None:
        user.avatar_url = user_update.avatar_url
    if user_update.is_active is not None:
        user.is_active = user_update.is_active

    db.commit()
    db.refresh(user)
    return user

@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Deactivate or delete
    user.is_active = False
    db.commit()
    return {"message": f"User '{user.username}' deactivated successfully"}

@router.get("/roles/matrix", response_model=List[RolePermissionMatrixItem])
def get_role_permissions_matrix(current_user: User = Depends(get_current_user)):
    """
    Returns the complete RBAC permissions matrix for all BugFlow roles.
    """
    return [
        RolePermissionMatrixItem(
            role=UserRole.ADMIN,
            description="Full system control, role assignment, project config, and audit logs.",
            permissions=[
                "Create & Delete Users",
                "Assign User Roles",
                "Delete Any Defect",
                "Manage All Sprints",
                "Manage All Squads",
                "Trigger Deployments",
                "View System Audit Trail",
                "Verify & Close Defects"
            ],
            badge_color="#ef4444"
        ),
        RolePermissionMatrixItem(
            role=UserRole.PROJECT_MANAGER,
            description="Sprint planning, backlog prioritization, squad management, and report generation.",
            permissions=[
                "Create & Edit Sprints",
                "Assign Developers to Squads",
                "Assign Defects to Engineers",
                "Change Defect Priority/Severity",
                "Export PDF & Excel Reports",
                "View Team Workload Metrics"
            ],
            badge_color="#8b5cf6"
        ),
        RolePermissionMatrixItem(
            role=UserRole.DEVELOPER,
            description="Defect analysis, root cause diagnosis, code resolution, and status updates.",
            permissions=[
                "Report New Defects",
                "Start Progress on Assigned Defects",
                "Move to Resolved with RCA Summary",
                "Add Comments & Code Snippets",
                "Upload File Attachments",
                "Run AI Root Cause Analysis",
                "Access RAG Knowledge Base"
            ],
            badge_color="#3b82f6"
        ),
        RolePermissionMatrixItem(
            role=UserRole.QA,
            description="Defect triage, regression validation, test execution, and official verification.",
            permissions=[
                "Report Detailed Defects",
                "Perform Regression Triage",
                "Verify Resolved Defects",
                "Close Verified Defects",
                "Reopen Defective Fixes",
                "Execute Automated Test Suites"
            ],
            badge_color="#10b981"
        ),
        RolePermissionMatrixItem(
            role=UserRole.REPORTER,
            description="Standard stakeholder account for defect submission and progress monitoring.",
            permissions=[
                "Report New Defects",
                "Comment on Reported Defects",
                "Track Public Defect Status"
            ],
            badge_color="#f59e0b"
        )
    ]

@router.patch("/{user_id}/role", response_model=UserResponse)
def assign_user_role(
    user_id: int,
    role_in: RoleAssignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_pm_or_admin)
):
    """
    Assign a new role to any user (Admin or Project Manager authorization).
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if role_in.role == UserRole.ADMIN and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only Admins can grant the Admin role")

    old_role = user.role.value
    user.role = role_in.role
    db.commit()
    db.refresh(user)

    return user

