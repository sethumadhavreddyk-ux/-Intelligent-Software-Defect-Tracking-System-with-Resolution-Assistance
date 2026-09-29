from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import (
    Defect, HistoricalResolution, User
)
from app.schemas.schemas import (
    AIAssistReportRequest, AIAssistReportResponse,
    AIClassificationRequest, AIClassificationResponse,
    SimilarDefectsResponse, SimilarDefectMatch,
    ResolutionAssistRequest, ResolutionAssistResponse, HistoricalResolutionItem,
    RootCauseAnalysisRequest, RootCauseAnalysisResponse
)
from app.auth.security import get_current_user
from app.services.ai_service import ai_service
from app.services.similarity_service import similarity_engine

router = APIRouter(prefix="/intelligence", tags=["Defect Intelligence & Resolution Assistance"])

@router.post("/format-report", response_model=AIAssistReportResponse)
def assist_report_formatting(
    req: AIAssistReportRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Analyzes vague raw defect input (e.g. 'Login is not working'), detects missing critical fields
    (OS, browser, reproduction steps, expected/actual), and generates a professional formatted template.
    """
    result = ai_service.analyze_and_format_report(req.raw_text)
    return result

@router.post("/classify", response_model=AIClassificationResponse)
def classify_defect(
    req: AIClassificationRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Intelligent Defect Classification: Analyzes defect title and description to predict
    Category, Defect Type, Severity, and Priority with reasoning.
    """
    result = ai_service.classify_defect(req.title, req.description)
    return result

@router.post("/similar", response_model=SimilarDefectsResponse)
def detect_similar_and_duplicates(
    title: str = Query(..., description="Query defect title"),
    description: str = Query("", description="Query defect description"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Similarity & Duplicate Detection:
    Performs vector similarity search against active and closed defects in database.
    Flags potential duplicates with score >= 0.70.
    """
    all_defects = db.query(Defect).all()
    matches = similarity_engine.find_similar_defects(
        query_title=title,
        query_desc=description,
        existing_defects=all_defects,
        top_k=5,
        threshold=0.20,
        duplicate_threshold=0.65
    )

    has_dupes = any(m["is_potential_duplicate"] for m in matches)
    duplicate_warning = None
    if has_dupes:
        dupe_keys = [m["key"] for m in matches if m["is_potential_duplicate"]]
        duplicate_warning = f"⚠️ Similar Defect Found: {', '.join(dupe_keys)}. This may be a duplicate issue."

    typed_matches = [SimilarDefectMatch(**m) for m in matches]
    return SimilarDefectsResponse(
        query_title=title,
        matches=typed_matches,
        total_found=len(typed_matches),
        has_duplicates=has_dupes,
        duplicate_warning_message=duplicate_warning
    )

@router.post("/resolution-assist", response_model=ResolutionAssistResponse)
def get_resolution_assistance(
    req: ResolutionAssistRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Resolution Assistance (Signature Feature):
    Retrieves previous resolutions from the knowledge base, suggests investigation areas,
    hypothesizes root causes, and proposes safe resolution guidance for developers.
    """
    # 1. Fetch historical resolutions from knowledge base
    historical_db = db.query(HistoricalResolution).all()
    matched_historical = similarity_engine.match_historical_resolutions(
        query_title=req.title,
        query_desc=req.description,
        historical_records=historical_db,
        top_k=3
    )

    # 2. Also check if any existing resolved defects have resolution summaries
    resolved_defects = db.query(Defect).filter(
        Defect.resolution_summary.isnot(None),
        Defect.resolution_summary != ""
    ).all()
    similar_resolved = similarity_engine.find_similar_defects(
        query_title=req.title,
        query_desc=req.description,
        existing_defects=resolved_defects,
        top_k=2,
        threshold=0.20
    )
    for sr in similar_resolved:
        if sr.get("resolution_summary"):
            matched_historical.append({
                "defect_key": sr["key"],
                "defect_title": sr["title"],
                "root_cause": "Historical defect in module",
                "resolution_text": sr["resolution_summary"],
                "similarity_score": sr["similarity_score"]
            })

    # Sort and take top 3
    matched_historical.sort(key=lambda x: x["similarity_score"], reverse=True)
    top_historical = [HistoricalResolutionItem(**h) for h in matched_historical[:3]]

    # 3. AI synthesis
    assist = ai_service.provide_resolution_assistance(
        title=req.title,
        description=req.description,
        category=req.category or "General",
        historical_resolutions=top_historical
    )

    defect_key = None
    if req.defect_id:
        d = db.query(Defect).filter(Defect.id == req.defect_id).first()
        if d:
            defect_key = d.key

    return ResolutionAssistResponse(
        defect_key=defect_key,
        investigation_areas=assist["investigation_areas"],
        historical_resolutions=top_historical,
        recommended_solution=assist["recommended_solution"],
        root_cause_hypothesis=assist["root_cause_hypothesis"],
        prevention_tips=assist["prevention_tips"],
        disclaimer=assist["disclaimer"]
    )

@router.post("/root-cause-analysis", response_model=RootCauseAnalysisResponse)
def perform_root_cause_analysis(
    req: RootCauseAnalysisRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Root Cause Investigation Assistance:
    Deep-dives into defect symptoms, logs, and stack traces to identify root causes and fixes.
    """
    defect = db.query(Defect).filter(Defect.id == req.defect_id).first()
    if not defect:
        raise HTTPException(status_code=404, detail="Defect not found")

    rca = ai_service.generate_root_cause_analysis(
        title=defect.title,
        description=defect.raw_description or defect.formatted_description or "",
        category=defect.category.value if defect.category else "General",
        logs=req.logs_or_context
    )

    return RootCauseAnalysisResponse(
        defect_key=defect.key,
        root_cause_identified=rca["root_cause_identified"],
        contributing_factors=rca["contributing_factors"],
        suggested_fix=rca["suggested_fix"],
        code_areas_to_inspect=rca["code_areas_to_inspect"],
        best_practice_guidance=rca["best_practice_guidance"]
    )

@router.get("/historical-resolutions")
def list_historical_resolutions(
    q: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(HistoricalResolution)
    if category:
        query = query.filter(HistoricalResolution.category == category)
    if q:
        query = query.filter(
            HistoricalResolution.defect_title.ilike(f"%{q}%") |
            HistoricalResolution.resolution_text.ilike(f"%{q}%") |
            HistoricalResolution.root_cause.ilike(f"%{q}%")
        )
    return query.all()
