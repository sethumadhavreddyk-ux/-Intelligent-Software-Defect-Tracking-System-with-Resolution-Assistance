import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from starlette.middleware.sessions import SessionMiddleware

from app.config import settings
from app.database import engine, Base, SessionLocal
from app.seed_data import seed_database
from app.routers import (
    auth, users, teams, projects, sprints, defects,
    intelligence, assistant, analytics, integrations, notifications, audit,
    rag, testing
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables and seed database
    Base.metadata.create_all(bind=engine)
    if settings.ENABLE_SEED_DATA:
        db = SessionLocal()
        try:
            seed_database(db)
        finally:
            db.close()
    yield
    # Shutdown logic if needed

app = FastAPI(
    title="Intelligent Software Defect Tracking System with Resolution Assistance",
    description="""
    🚀 **Capstone Project Backend & Resolution Intelligence API**
    
    A comprehensive platform managing the complete software defect lifecycle:
    **Report → Assign → Track → Analyze → Assist Resolution → Fix → Verify → Close**
    
    ### Key Modules & Capabilities:
    * **Defect Lifecycle & Drag-and-Drop Workflow**: Full 7-stage state machine with RBAC guards.
    * **Intelligent Defect Reporting**: Missing information detector & report reformatter.
    * **Similarity & Duplicate Detection**: TF-IDF & Cosine vector similarity engine.
    * **Resolution Assistance (Signature Feature)**: Actionable investigation areas, historical precedent lookup, and suggested solutions.
    * **Root Cause Analysis (RCA)**: Deep-dive diagnostic hypotheses and best-practice remediation.
    * **Sprint Health Score**: Real-time risk score (0-100), defect velocity analysis, and mitigation recommendations.
    * **Ask Gemini AI Assistant**: Contextual chatbot grounded in project and defect records.
    * **Teams & Sprints Management**: Full CRUD, developer assignments, and workload tracking.
    * **Integrations**: GitHub PR/commits linkage and Slack webhook alert dispatcher.
    * **Advanced Auth**: JWT, RBAC, 6-digit OTP password reset, and biometric Face Authentication.
    """,
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.SECRET_KEY,
    max_age=600,
    same_site="lax",
    https_only=settings.SESSION_COOKIE_SECURE
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API v1 Routers
api_prefix = settings.API_V1_PREFIX
app.include_router(auth.router, prefix=api_prefix)
app.include_router(users.router, prefix=api_prefix)
app.include_router(teams.router, prefix=api_prefix)
app.include_router(projects.router, prefix=api_prefix)
app.include_router(sprints.router, prefix=api_prefix)
app.include_router(defects.router, prefix=api_prefix)
app.include_router(intelligence.router, prefix=api_prefix)
app.include_router(assistant.router, prefix=api_prefix)
app.include_router(analytics.router, prefix=api_prefix)
app.include_router(integrations.router, prefix=api_prefix)
app.include_router(notifications.router, prefix=api_prefix)
app.include_router(audit.router, prefix=api_prefix)
app.include_router(rag.router, prefix=api_prefix)
app.include_router(testing.router, prefix=api_prefix)

# Health check
@app.get("/health", tags=["System Health"])
def health_check():
    return {
        "status": "HEALTHY",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "database": "CONNECTED",
        "ai_engine": "ACTIVE"
    }

# Mount Frontend static files
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "..", "frontend")
if os.path.exists(frontend_dir):
    app.mount("/static", StaticFiles(directory=frontend_dir), name="static")

    @app.get("/")
    def serve_frontend_index():
        index_file = os.path.join(frontend_dir, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return {"message": "Frontend static file index.html not yet created."}
