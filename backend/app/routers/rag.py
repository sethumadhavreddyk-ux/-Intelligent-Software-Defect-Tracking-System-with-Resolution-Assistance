from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models.models import KnowledgeDocument, KnowledgeChunk, User
from app.schemas.schemas import (
    KnowledgeDocumentCreate, KnowledgeDocumentResponse,
    RAGSearchRequest, RAGSearchResponse, RAGSearchResultItem,
    RAGQueryRequest, RAGQueryResponse, RAGStatsResponse
)
from app.auth.security import get_current_user
from app.services.rag_service import rag_service

router = APIRouter(prefix="/rag", tags=["RAG Knowledge Center & Semantic Retrieval"])

@router.get("/stats", response_model=RAGStatsResponse)
def get_rag_system_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns real-time RAG index statistics: total documents, chunks, dimensions, query volume.
    """
    return rag_service.get_stats(db)

@router.get("/documents", response_model=List[KnowledgeDocumentResponse])
def list_knowledge_documents(
    category: Optional[str] = None,
    q: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns all ingested knowledge documents with chunk counts and metadata.
    """
    query = db.query(KnowledgeDocument)
    if category and category.lower() != "all":
        query = query.filter(KnowledgeDocument.category == category)
    if q:
        query = query.filter(
            KnowledgeDocument.title.ilike(f"%{q}%") |
            KnowledgeDocument.content.ilike(f"%{q}%") |
            KnowledgeDocument.tags.ilike(f"%{q}%")
        )
    return query.order_by(desc(KnowledgeDocument.created_at)).all()

@router.get("/documents/{document_id}", response_model=KnowledgeDocumentResponse)
def get_knowledge_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    doc = db.query(KnowledgeDocument).filter(KnowledgeDocument.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Knowledge document not found")
    return doc

@router.post("/documents", response_model=KnowledgeDocumentResponse)
def ingest_knowledge_document(
    doc_in: KnowledgeDocumentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Ingests a new knowledge document, executes automated text extraction, chunking,
    and indexes chunks into the vector store.
    """
    new_doc = KnowledgeDocument(
        title=doc_in.title,
        category=doc_in.category,
        doc_type=doc_in.doc_type,
        content=doc_in.content,
        summary=doc_in.summary or (doc_in.content[:160] + "..."),
        tags=doc_in.tags,
        author=current_user.full_name or "Engineer"
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)

    # Automated chunking pipeline
    chunks = rag_service.chunk_document(doc_in.content, chunk_size=350, overlap=40)
    for idx, chunk_text in enumerate(chunks):
        keywords = rag_service.extract_keywords(chunk_text)
        token_count = len(chunk_text.split())
        chunk = KnowledgeChunk(
            document_id=new_doc.id,
            chunk_index=idx + 1,
            chunk_text=chunk_text,
            token_count=token_count,
            keywords=keywords
        )
        db.add(chunk)

    db.commit()
    db.refresh(new_doc)
    return new_doc

@router.delete("/documents/{document_id}")
def delete_knowledge_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    doc = db.query(KnowledgeDocument).filter(KnowledgeDocument.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Knowledge document not found")
    db.delete(doc)
    db.commit()
    return {"message": f"Document '{doc.title}' and associated chunks deleted successfully"}

@router.post("/search", response_model=RAGSearchResponse)
def semantic_search_knowledge(
    req: RAGSearchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Semantic vector search across chunks and historical precedents.
    """
    matches = rag_service.search_knowledge(
        query=req.query,
        db=db,
        category=req.category,
        top_k=req.top_k,
        threshold=req.threshold
    )

    items = [RAGSearchResultItem(**m) for m in matches]
    sources = list(set([m["document_title"] for m in matches]))
    return RAGSearchResponse(
        query=req.query,
        results=items,
        total_found=len(items),
        sources=sources
    )

@router.post("/query", response_model=RAGQueryResponse)
def query_rag_pipeline(
    req: RAGQueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Full RAG Pipeline execution:
    User Query -> Vector Retrieval -> Top Context Selection -> Gemini Context-Aware Synthesis.
    """
    result = rag_service.query_rag_pipeline(query=req.query, db=db)
    return RAGQueryResponse(**result)
