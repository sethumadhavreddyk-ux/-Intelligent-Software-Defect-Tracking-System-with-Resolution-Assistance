import datetime
from typing import List, Optional, Any, Dict
from pydantic import AliasChoices, BaseModel, EmailStr, Field
from app.models.models import (
    UserRole, DefectStatus, DefectPriority, DefectSeverity, DefectCategory, DefectType, SprintStatus
)

# --- USER SCHEMAS ---
class UserBase(BaseModel):
    username: str
    email: EmailStr
    full_name: str
    role: UserRole = UserRole.DEVELOPER
    avatar_url: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    avatar_url: Optional[str] = None
    is_active: Optional[bool] = None

class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    username_or_email: str = Field(validation_alias=AliasChoices("username_or_email", "username"))
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str
    new_password: str

class FaceAuthRequest(BaseModel):
    email_or_username: str
    face_detected: bool = True
    confidence: float = 0.95

class OAuthLoginRequest(BaseModel):
    email_or_username: Optional[str] = None
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None

class VoiceAuthRequest(BaseModel):
    command: Optional[str] = None
    passphrase: Optional[str] = None
    email_or_username: Optional[str] = None
    role: Optional[str] = None

# --- TEAM SCHEMAS ---
class TeamBase(BaseModel):
    name: str
    description: Optional[str] = None
    lead_id: Optional[int] = None

class TeamCreate(TeamBase):
    pass

class TeamUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    lead_id: Optional[int] = None

class TeamMemberAdd(BaseModel):
    user_id: int
    role_in_team: str = "Member"

class TeamMemberResponse(BaseModel):
    id: int
    user_id: int
    team_id: int
    role_in_team: str
    joined_at: datetime.datetime
    user: UserResponse

    class Config:
        from_attributes = True

class TeamResponse(TeamBase):
    id: int
    created_at: datetime.datetime
    lead: Optional[UserResponse] = None
    members: List[TeamMemberResponse] = []

    class Config:
        from_attributes = True

# --- PROJECT SCHEMAS ---
class ProjectBase(BaseModel):
    name: str
    key: str
    description: Optional[str] = None
    team_id: Optional[int] = None
    lead_id: Optional[int] = None
    status: str = "Active"

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    team_id: Optional[int] = None
    lead_id: Optional[int] = None
    status: Optional[str] = None

class ProjectResponse(ProjectBase):
    id: int
    created_at: datetime.datetime
    lead: Optional[UserResponse] = None
    team: Optional[TeamBase] = None

    class Config:
        from_attributes = True

# --- SPRINT SCHEMAS ---
class SprintBase(BaseModel):
    name: str
    project_id: int
    goal: Optional[str] = None
    start_date: datetime.datetime
    end_date: datetime.datetime
    status: SprintStatus = SprintStatus.ACTIVE
    velocity_target: int = 20

class SprintCreate(SprintBase):
    pass

class SprintUpdate(BaseModel):
    name: Optional[str] = None
    goal: Optional[str] = None
    start_date: Optional[datetime.datetime] = None
    end_date: Optional[datetime.datetime] = None
    status: Optional[SprintStatus] = None
    velocity_target: Optional[int] = None

class SprintResponse(SprintBase):
    id: int
    created_at: datetime.datetime
    defect_count: Optional[int] = 0
    resolved_count: Optional[int] = 0

    class Config:
        from_attributes = True

class SprintHealthResponse(BaseModel):
    sprint_id: int
    sprint_name: str
    health_score: int  # 0 to 100
    risk_level: str   # LOW, MODERATE, HIGH, CRITICAL
    total_defects: int
    critical_defects: int
    high_defects: int
    resolved_defects: int
    completion_rate: float
    days_remaining: int
    velocity_target: int
    explanation: str
    recommended_actions: List[str]

# --- DEFECT SCHEMAS ---
class DefectCommentCreate(BaseModel):
    content: str

class DefectCommentResponse(BaseModel):
    id: int
    defect_id: int
    user_id: int
    content: str
    created_at: datetime.datetime
    user: UserResponse

    class Config:
        from_attributes = True

class DefectBase(BaseModel):
    title: str
    raw_description: Optional[str] = None
    formatted_description: Optional[str] = None
    environment: Optional[str] = None
    steps_to_reproduce: Optional[str] = None
    expected_result: Optional[str] = None
    actual_result: Optional[str] = None
    priority: DefectPriority = DefectPriority.MEDIUM
    severity: DefectSeverity = DefectSeverity.MEDIUM
    category: DefectCategory = DefectCategory.GENERAL
    defect_type: DefectType = DefectType.FUNCTIONAL
    project_id: int
    sprint_id: Optional[int] = None
    assignee_id: Optional[int] = None
    due_date: Optional[datetime.datetime] = None

class DefectCreate(DefectBase):
    pass

class DefectUpdate(BaseModel):
    title: Optional[str] = None
    raw_description: Optional[str] = None
    formatted_description: Optional[str] = None
    environment: Optional[str] = None
    steps_to_reproduce: Optional[str] = None
    expected_result: Optional[str] = None
    actual_result: Optional[str] = None
    status: Optional[DefectStatus] = None
    priority: Optional[DefectPriority] = None
    severity: Optional[DefectSeverity] = None
    category: Optional[DefectCategory] = None
    defect_type: Optional[DefectType] = None
    sprint_id: Optional[int] = None
    assignee_id: Optional[int] = None
    due_date: Optional[datetime.datetime] = None
    root_cause: Optional[str] = None
    resolution_summary: Optional[str] = None
    resolution_notes: Optional[str] = None
    github_pr_url: Optional[str] = None
    github_commit_hash: Optional[str] = None

class DefectStatusUpdate(BaseModel):
    status: DefectStatus
    comment: Optional[str] = None
    root_cause: Optional[str] = None
    resolution_summary: Optional[str] = None

class DefectResponse(DefectBase):
    id: int
    key: str
    status: DefectStatus
    reporter_id: int
    verified_by_id: Optional[int] = None
    root_cause: Optional[str] = None
    resolution_summary: Optional[str] = None
    resolution_notes: Optional[str] = None
    investigation_areas: Optional[str] = None
    github_pr_url: Optional[str] = None
    github_commit_hash: Optional[str] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime
    resolved_at: Optional[datetime.datetime] = None
    closed_at: Optional[datetime.datetime] = None
    reporter: Optional[UserResponse] = None
    assignee: Optional[UserResponse] = None
    project_key: Optional[str] = None
    comments: List[DefectCommentResponse] = []

    class Config:
        from_attributes = True

# --- INTELLIGENCE SCHEMAS ---
class AIAssistReportRequest(BaseModel):
    raw_text: str

class AIAssistReportResponse(BaseModel):
    suggested_title: str
    formatted_description: str
    environment: str
    steps_to_reproduce: str
    expected_result: str
    actual_result: str
    missing_fields: List[str]
    completeness_score: int  # 0 to 100
    category_suggestion: DefectCategory
    severity_suggestion: DefectSeverity
    priority_suggestion: DefectPriority
    defect_type_suggestion: DefectType

class AIClassificationRequest(BaseModel):
    title: str
    description: str

class AIClassificationResponse(BaseModel):
    suggested_category: DefectCategory
    suggested_type: DefectType
    suggested_severity: DefectSeverity
    suggested_priority: DefectPriority
    confidence: float
    reasoning: str

class SimilarDefectMatch(BaseModel):
    id: int
    key: str
    title: str
    status: str
    severity: str
    category: str
    similarity_score: float  # 0.0 - 1.0
    is_potential_duplicate: bool
    resolution_summary: Optional[str] = None

class SimilarDefectsResponse(BaseModel):
    query_title: str
    matches: List[SimilarDefectMatch]
    total_found: int
    has_duplicates: bool
    duplicate_warning_message: Optional[str] = None

class ResolutionAssistRequest(BaseModel):
    defect_id: Optional[int] = None
    title: str
    description: str
    category: Optional[str] = None

class HistoricalResolutionItem(BaseModel):
    defect_key: str
    defect_title: str
    root_cause: str
    resolution_text: str
    similarity_score: float

class ResolutionAssistResponse(BaseModel):
    defect_key: Optional[str] = None
    investigation_areas: List[str]
    historical_resolutions: List[HistoricalResolutionItem]
    recommended_solution: str
    root_cause_hypothesis: str
    prevention_tips: List[str]
    disclaimer: str = "Our system provides intelligent assistance to help developers analyze defects. The developer remains responsible for reviewing and applying the final solution."

class RootCauseAnalysisRequest(BaseModel):
    defect_id: int
    logs_or_context: Optional[str] = None

class RootCauseAnalysisResponse(BaseModel):
    defect_key: str
    root_cause_identified: str
    contributing_factors: List[str]
    suggested_fix: str
    code_areas_to_inspect: List[str]
    best_practice_guidance: str

class AskGeminiRequest(BaseModel):
    prompt: str
    defect_id: Optional[int] = None
    sprint_id: Optional[int] = None
    context_type: Optional[str] = "general"  # defect, sprint, general

class AskGeminiResponse(BaseModel):
    response: str
    sources_cited: List[str] = []
    action_items: List[str] = []

# --- ANALYTICS SCHEMAS ---
class DashboardSummaryResponse(BaseModel):
    total_defects: int
    open_defects: int
    in_progress_defects: int
    resolved_defects: int
    verified_defects: int
    closed_defects: int
    reopened_defects: int
    critical_defects: int
    high_defects: int
    avg_resolution_hours: float
    defects_by_severity: Dict[str, int]
    defects_by_status: Dict[str, int]
    defects_by_category: Dict[str, int]
    developer_workload: List[Dict[str, Any]]
    recent_activity: List[Dict[str, Any]]
    sprint_health_overview: Optional[SprintHealthResponse] = None

# --- INTEGRATIONS SCHEMAS ---
class GitHubLinkRequest(BaseModel):
    defect_id: int
    pr_url: Optional[str] = None
    commit_hash: Optional[str] = None

class SlackAlertRequest(BaseModel):
    channel: Optional[str] = "#dev-alerts"
    message: str
    defect_id: Optional[int] = None

# --- NOTIFICATION & AUDIT SCHEMAS ---
class NotificationResponse(BaseModel):
    id: int
    title: str
    message: str
    notification_type: str
    link_url: Optional[str] = None
    is_read: bool
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class ActivityLogResponse(BaseModel):
    id: int
    defect_id: Optional[int] = None
    action_type: str
    field_changed: Optional[str] = None
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    description: str
    created_at: datetime.datetime
    user: Optional[UserResponse] = None

    class Config:
        from_attributes = True

# --- ROLE ASSIGNMENT & PERMISSIONS SCHEMAS ---
class RoleAssignRequest(BaseModel):
    role: UserRole

class RolePermissionMatrixItem(BaseModel):
    role: UserRole
    description: str
    permissions: List[str]
    badge_color: str

# --- QR AUTHENTICATION SCHEMAS ---
class QRCodeResponse(BaseModel):
    qr_token: str
    qr_svg: str
    expires_in_seconds: int = 120
    status: str = "PENDING"

class QRAuthRequest(BaseModel):
    qr_token: str
    username_or_email: Optional[str] = "madhav@bugflow.io"

class QRStatusResponse(BaseModel):
    authenticated: bool
    token: Optional[Token] = None
    message: str

# --- DEFECT ATTACHMENT SCHEMAS ---
class DefectAttachmentCreate(BaseModel):
    file_name: str
    file_url: str
    file_size: int = 0
    file_type: Optional[str] = "application/octet-stream"

class DefectAttachmentResponse(BaseModel):
    id: int
    defect_id: int
    user_id: int
    file_name: str
    file_url: str
    file_size: int
    file_type: Optional[str]
    created_at: datetime.datetime
    user: Optional[UserResponse] = None

    class Config:
        from_attributes = True

# --- RAG KNOWLEDGE BASE SCHEMAS ---
class KnowledgeChunkResponse(BaseModel):
    id: int
    document_id: int
    chunk_index: int
    chunk_text: str
    token_count: int
    keywords: Optional[str] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class KnowledgeDocumentCreate(BaseModel):
    title: str
    category: str = "General"
    doc_type: str = "markdown"
    content: str
    summary: Optional[str] = None
    tags: Optional[str] = None
    author: Optional[str] = "Engineer"
    chunk_size: int = Field(default=120, ge=40, le=400)
    chunk_overlap: int = Field(default=25, ge=0, le=100)

class KnowledgeDocumentResponse(BaseModel):
    id: int
    title: str
    category: str
    doc_type: str
    content: str
    summary: Optional[str] = None
    tags: Optional[str] = None
    author: str
    created_at: datetime.datetime
    updated_at: Optional[datetime.datetime] = None
    chunks: List[KnowledgeChunkResponse] = []

    class Config:
        from_attributes = True

class RAGSearchRequest(BaseModel):
    query: str
    category: Optional[str] = None
    top_k: int = 5
    threshold: float = 0.20

class RAGSearchResultItem(BaseModel):
    document_id: Optional[int] = None
    document_title: str
    category: str
    chunk_index: Optional[int] = None
    snippet: str
    similarity_score: float
    relevance_pct: int
    doc_type: str = "document"

class RAGSearchResponse(BaseModel):
    query: str
    results: List[RAGSearchResultItem]
    total_found: int
    synthesized_answer: Optional[str] = None
    sources: List[str] = []

class RAGQueryRequest(BaseModel):
    query: str
    include_defect_history: bool = True

class RAGQueryResponse(BaseModel):
    query: str
    answer: str
    confidence: float
    retrieved_chunks_count: int
    citations: List[str]

class RAGStatsResponse(BaseModel):
    total_documents: int
    total_chunks: int
    embedding_dimension: int
    total_queries_served: int
    index_status: str

# --- TESTING & CI/CD SCHEMAS ---
class TestCaseResult(BaseModel):
    name: str
    suite: str
    status: str  # PASSED, FAILED, SKIPPED
    duration_ms: float
    error_message: Optional[str] = None

class TestRunResponse(BaseModel):
    total_tests: int
    passed: int
    failed: int
    skipped: int
    duration_seconds: float
    coverage_pct: float
    suites: List[Dict[str, Any]]
    results: List[TestCaseResult]
    timestamp: datetime.datetime

class CICDStep(BaseModel):
    name: str
    status: str
    duration_seconds: int

class CICDPipelineRun(BaseModel):
    id: str
    branch: str
    commit_hash: str
    author: str
    trigger: str
    status: str
    duration: str
    steps: List[CICDStep]
    created_at: datetime.datetime

