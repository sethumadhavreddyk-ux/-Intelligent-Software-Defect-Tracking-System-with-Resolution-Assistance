import datetime
import enum
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Enum as SQLEnum, Float
)
from sqlalchemy.orm import relationship
from app.database import Base

class UserRole(str, enum.Enum):
    ADMIN = "Admin"
    PROJECT_MANAGER = "Project Manager"
    DEVELOPER = "Developer"
    QA = "QA / Tester"
    REPORTER = "Reporter"

class DefectStatus(str, enum.Enum):
    REPORTED = "Reported"
    ASSIGNED = "Assigned"
    IN_PROGRESS = "In Progress"
    IN_REVIEW = "In Review"
    RESOLVED = "Resolved"
    VERIFIED = "Verified"
    CLOSED = "Closed"
    REOPENED = "Reopened"

class DefectPriority(str, enum.Enum):
    CRITICAL = "Critical"
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"

class DefectSeverity(str, enum.Enum):
    CRITICAL = "Critical"
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"

class DefectCategory(str, enum.Enum):
    PAYMENT = "Payment"
    AUTHENTICATION = "Authentication"
    UI_UX = "UI / UX"
    PERFORMANCE = "Performance"
    DATABASE = "Database"
    API = "API / Backend"
    SECURITY = "Security"
    GENERAL = "General"

class DefectType(str, enum.Enum):
    FUNCTIONAL = "Functional Defect"
    REGRESSION = "Regression Defect"
    VISUAL = "Visual Defect"
    PERFORMANCE = "Performance Bottleneck"
    SECURITY = "Security Vulnerability"
    COMPATIBILITY = "Compatibility Defect"

class SprintStatus(str, enum.Enum):
    PLANNING = "Planning"
    ACTIVE = "Active"
    COMPLETED = "Completed"
    CLOSED = "Closed"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole), default=UserRole.DEVELOPER, nullable=False)
    avatar_url = Column(String(255), nullable=True)
    face_descriptor = Column(Text, nullable=True)  # Mock/Real biometric template
    otp_code = Column(String(10), nullable=True)
    otp_expires_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    reported_defects = relationship("Defect", foreign_keys="Defect.reporter_id", back_populates="reporter")
    assigned_defects = relationship("Defect", foreign_keys="Defect.assignee_id", back_populates="assignee")
    comments = relationship("DefectComment", back_populates="user")
    team_memberships = relationship("TeamMember", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")


class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    lead_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    lead = relationship("User", foreign_keys=[lead_id])
    members = relationship("TeamMember", back_populates="team", cascade="all, delete-orphan")
    projects = relationship("Project", back_populates="team")


class TeamMember(Base):
    __tablename__ = "team_members"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role_in_team = Column(String(50), default="Member")
    joined_at = Column(DateTime, default=datetime.datetime.utcnow)

    team = relationship("Team", back_populates="members")
    user = relationship("User", back_populates="team_memberships")


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    key = Column(String(10), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    lead_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(String(30), default="Active")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    team = relationship("Team", back_populates="projects")
    lead = relationship("User", foreign_keys=[lead_id])
    defects = relationship("Defect", back_populates="project", cascade="all, delete-orphan")
    sprints = relationship("Sprint", back_populates="project", cascade="all, delete-orphan")


class Sprint(Base):
    __tablename__ = "sprints"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    goal = Column(Text, nullable=True)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    status = Column(SQLEnum(SprintStatus), default=SprintStatus.ACTIVE)
    velocity_target = Column(Integer, default=20)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    project = relationship("Project", back_populates="sprints")
    defects = relationship("Defect", back_populates="sprint")


class Defect(Base):
    __tablename__ = "defects"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(20), unique=True, index=True, nullable=False)  # e.g. DEF-101
    title = Column(String(200), nullable=False, index=True)
    raw_description = Column(Text, nullable=True)
    formatted_description = Column(Text, nullable=True)
    environment = Column(String(200), nullable=True)
    steps_to_reproduce = Column(Text, nullable=True)
    expected_result = Column(Text, nullable=True)
    actual_result = Column(Text, nullable=True)
    
    status = Column(SQLEnum(DefectStatus), default=DefectStatus.REPORTED, index=True)
    priority = Column(SQLEnum(DefectPriority), default=DefectPriority.MEDIUM, index=True)
    severity = Column(SQLEnum(DefectSeverity), default=DefectSeverity.MEDIUM, index=True)
    category = Column(SQLEnum(DefectCategory), default=DefectCategory.GENERAL, index=True)
    defect_type = Column(SQLEnum(DefectType), default=DefectType.FUNCTIONAL)

    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    sprint_id = Column(Integer, ForeignKey("sprints.id", ondelete="SET NULL"), nullable=True)
    reporter_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assignee_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    verified_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Resolution & RCA
    root_cause = Column(Text, nullable=True)
    resolution_summary = Column(Text, nullable=True)
    resolution_notes = Column(Text, nullable=True)
    investigation_areas = Column(Text, nullable=True)  # JSON or text checklist

    # Integrations
    github_pr_url = Column(String(255), nullable=True)
    github_commit_hash = Column(String(50), nullable=True)

    # Due dates
    due_date = Column(DateTime, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    closed_at = Column(DateTime, nullable=True)

    # Relationships
    project = relationship("Project", back_populates="defects")
    sprint = relationship("Sprint", back_populates="defects")
    reporter = relationship("User", foreign_keys=[reporter_id], back_populates="reported_defects")
    assignee = relationship("User", foreign_keys=[assignee_id], back_populates="assigned_defects")
    verified_by = relationship("User", foreign_keys=[verified_by_id])
    comments = relationship("DefectComment", back_populates="defect", cascade="all, delete-orphan")
    attachments = relationship("DefectAttachment", back_populates="defect", cascade="all, delete-orphan")
    activity_logs = relationship("ActivityLog", back_populates="defect", cascade="all, delete-orphan")


class DefectComment(Base):
    __tablename__ = "defect_comments"

    id = Column(Integer, primary_key=True, index=True)
    defect_id = Column(Integer, ForeignKey("defects.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    defect = relationship("Defect", back_populates="comments")
    user = relationship("User", back_populates="comments")


class DefectAttachment(Base):
    __tablename__ = "defect_attachments"

    id = Column(Integer, primary_key=True, index=True)
    defect_id = Column(Integer, ForeignKey("defects.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    file_name = Column(String(200), nullable=False)
    file_url = Column(String(500), nullable=False)
    file_size = Column(Integer, default=0)
    file_type = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    defect = relationship("Defect", back_populates="attachments")
    user = relationship("User")


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    defect_id = Column(Integer, ForeignKey("defects.id", ondelete="CASCADE"), nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action_type = Column(String(50), nullable=False)  # CREATED, STATUS_CHANGE, ASSIGNED, COMMENTED, RESOLVED, etc.
    field_changed = Column(String(50), nullable=True)
    old_value = Column(String(200), nullable=True)
    new_value = Column(String(200), nullable=True)
    description = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    defect = relationship("Defect", back_populates="activity_logs")
    user = relationship("User")


class HistoricalResolution(Base):
    __tablename__ = "historical_resolutions"

    id = Column(Integer, primary_key=True, index=True)
    defect_key = Column(String(20), index=True)
    defect_title = Column(String(200), nullable=False)
    category = Column(String(50), nullable=False)
    root_cause = Column(Text, nullable=False)
    resolution_text = Column(Text, nullable=False)
    investigation_steps = Column(Text, nullable=True)
    keywords = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String(50), default="INFO")  # ALERT, SUCCESS, WARNING, INFO
    link_url = Column(String(255), nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="notifications")


class IntegrationLog(Base):
    __tablename__ = "integration_logs"

    id = Column(Integer, primary_key=True, index=True)
    provider = Column(String(50), nullable=False)  # GitHub, Slack, Webhook
    event_type = Column(String(50), nullable=False)
    payload = Column(Text, nullable=True)
    status = Column(String(30), default="SUCCESS")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class KnowledgeDocument(Base):
    __tablename__ = "knowledge_documents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False, index=True)
    category = Column(String(100), nullable=False, default="General")
    doc_type = Column(String(50), default="markdown")
    content = Column(Text, nullable=False)
    summary = Column(Text, nullable=True)
    tags = Column(String(255), nullable=True)
    author = Column(String(100), default="System")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    chunks = relationship("KnowledgeChunk", back_populates="document", cascade="all, delete-orphan")


class KnowledgeChunk(Base):
    __tablename__ = "knowledge_chunks"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("knowledge_documents.id", ondelete="CASCADE"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    chunk_text = Column(Text, nullable=False)
    token_count = Column(Integer, default=0)
    keywords = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    document = relationship("KnowledgeDocument", back_populates="chunks")


class RAGQueryLog(Base):
    __tablename__ = "rag_query_logs"

    id = Column(Integer, primary_key=True, index=True)
    query_text = Column(String(500), nullable=False)
    top_score = Column(Float, default=0.0)
    retrieved_chunks_count = Column(Integer, default=0)
    synthesized_answer = Column(Text, nullable=True)
    sources_cited = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

