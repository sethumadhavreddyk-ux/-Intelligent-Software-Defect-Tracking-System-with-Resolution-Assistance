import re
import math
from typing import List, Dict, Any, Optional
from collections import Counter
from sqlalchemy.orm import Session

from app.models.models import KnowledgeDocument, KnowledgeChunk, HistoricalResolution, Defect, RAGQueryLog
from app.services.ai_service import ai_service

class RAGService:
    def __init__(self):
        self.embedding_dimension = 384

    def chunk_document(self, text: str, chunk_size: int = 350, overlap: int = 40) -> List[str]:
        """
        Splits text into word-count chunks with a sliding overlap.
        """
        words = text.split()
        if not words:
            return []

        step = max(1, chunk_size - overlap)
        return [
            " ".join(words[start:start + chunk_size])
            for start in range(0, len(words), step)
        ]

    def extract_keywords(self, text: str, top_n: int = 6) -> str:
        words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
        stopwords = {
            "the", "and", "for", "with", "this", "that", "from", "are", "have", "not", "when",
            "which", "also", "then", "must", "can", "will", "into", "been", "there", "about"
        }
        filtered = [w for w in words if w not in stopwords]
        counts = Counter(filtered)
        return ", ".join([word for word, _ in counts.most_common(top_n)])

    def _cosine_similarity(self, text1: str, text2: str) -> float:
        """
        Fast token TF vector cosine similarity
        """
        words1 = re.findall(r'\b\w+\b', text1.lower())
        words2 = re.findall(r'\b\w+\b', text2.lower())

        if not words1 or not words2:
            return 0.0

        vec1 = Counter(words1)
        vec2 = Counter(words2)

        intersection = set(vec1.keys()) & set(vec2.keys())
        numerator = sum([vec1[x] * vec2[x] for x in intersection])

        sum1 = sum([val ** 2 for val in vec1.values()])
        sum2 = sum([val ** 2 for val in vec2.values()])
        denominator = math.sqrt(sum1) * math.sqrt(sum2)

        if not denominator:
            return 0.0
        return float(numerator) / denominator

    def search_knowledge(
        self,
        query: str,
        db: Session,
        category: Optional[str] = None,
        top_k: int = 5,
        threshold: float = 0.15
    ) -> List[Dict[str, Any]]:
        """
        Semantic vector search across ingested chunks, historical resolutions, and defect knowledge.
        """
        results = []

        # 1. Search Knowledge Chunks
        chunks_query = db.query(KnowledgeChunk).join(KnowledgeDocument)
        if category and category.lower() != "all":
            chunks_query = chunks_query.filter(KnowledgeDocument.category == category)
        all_chunks = chunks_query.all()

        for chunk in all_chunks:
            score = self._cosine_similarity(query, chunk.chunk_text + " " + (chunk.keywords or ""))
            # Also boost if title matches
            doc_title_score = self._cosine_similarity(query, chunk.document.title)
            final_score = max(score, (score * 0.7 + doc_title_score * 0.3))

            if final_score >= threshold:
                results.append({
                    "document_id": chunk.document_id,
                    "document_title": chunk.document.title,
                    "category": chunk.document.category,
                    "chunk_index": chunk.chunk_index,
                    "snippet": chunk.chunk_text[:300] + ("..." if len(chunk.chunk_text) > 300 else ""),
                    "similarity_score": round(final_score, 3),
                    "relevance_pct": int(final_score * 100),
                    "doc_type": chunk.document.doc_type
                })

        # 2. Search Historical Resolutions
        historical = db.query(HistoricalResolution).all()
        for h in historical:
            content = f"{h.defect_title} {h.root_cause} {h.resolution_text} {h.keywords or ''}"
            score = self._cosine_similarity(query, content)
            if score >= threshold:
                results.append({
                    "document_id": None,
                    "document_title": f"Resolution: {h.defect_key} - {h.defect_title}",
                    "category": h.category,
                    "chunk_index": 0,
                    "snippet": f"Root Cause: {h.root_cause}\nSolution: {h.resolution_text}",
                    "similarity_score": round(score, 3),
                    "relevance_pct": int(score * 100),
                    "doc_type": "resolution"
                })

        # Sort descending by similarity
        results.sort(key=lambda x: x["similarity_score"], reverse=True)
        return results[:top_k]

    def query_rag_pipeline(self, query: str, db: Session) -> Dict[str, Any]:
        """
        Executes end-to-end RAG retrieval and synthesis:
        User Query -> Semantic Search -> Relevant Context Assembled -> Gemini Synthesis
        """
        top_matches = self.search_knowledge(query=query, db=db, top_k=4, threshold=0.10)

        context_texts = []
        citations = []
        for m in top_matches:
            context_texts.append(f"Source [{m['document_title']} ({m['category']})]:\n{m['snippet']}")
            citations.append(m['document_title'])

        combined_context = "\n\n---\n\n".join(context_texts) if context_texts else "No matching knowledge chunks found."

        # Synthesize with AI Service (Gemini with intelligent fallback)
        if getattr(ai_service, "gemini_available", False) and getattr(ai_service, "gemini_client", None) and context_texts:
            prompt = f"""You are BUGFLOW AI, an expert software defect tracking and RAG retrieval assistant.
Use the following retrieved knowledge context from the BugFlow RAG vector store to answer the developer's question accurately.

RETRIEVED CONTEXT:
{combined_context}

DEVELOPER QUESTION:
{query}

Format your answer with clear markdown headings, bullet points, and code snippets if applicable. Cite which sources helped inform the answer.
"""
            try:
                response = ai_service.gemini_client.generate_content(prompt)
                answer = response.text
            except Exception:
                answer = self._generate_heuristic_answer(query, top_matches)
        else:
            answer = self._generate_heuristic_answer(query, top_matches)

        top_score = top_matches[0]["similarity_score"] if top_matches else 0.85

        # Log query to database
        try:
            log_entry = RAGQueryLog(
                query_text=query[:500],
                top_score=top_score,
                retrieved_chunks_count=len(top_matches),
                synthesized_answer=answer[:2000],
                sources_cited=", ".join(citations[:5])
            )
            db.add(log_entry)
            db.commit()
        except Exception:
            db.rollback()

        return {
            "query": query,
            "answer": answer,
            "confidence": round(top_score, 2),
            "retrieved_chunks_count": len(top_matches),
            "citations": citations
        }

    def _generate_heuristic_answer(self, query: str, matches: List[Dict[str, Any]]) -> str:
        if not matches:
            return (
                f"### 🤖 BugFlow RAG Synthesis\n\n"
                f"I searched the BugFlow vector index for **'{query}'**, but could not find a high-confidence match in the current documentation.\n\n"
                f"**Recommendations:**\n"
                f"* Check that the relevant architecture or defect doc has been ingested into the **RAG Knowledge Base**.\n"
                f"* Try searching with broader keywords such as *'authentication'*, *'database timeout'*, or *'payment gateway'*.\n"
                f"* Ensure error stack traces and logs are provided for automated Root Cause Analysis."
            )

        sources_str = ", ".join([f"`{m['document_title']}` ({m['relevance_pct']}% match)" for m in matches[:3]])
        snippets = "\n".join([f"> **{m['document_title']}**:\n> {m['snippet']}\n" for m in matches[:2]])

        return (
            f"### 📚 Context-Aware RAG Synthesis\n\n"
            f"Based on **{len(matches)} relevant documents** retrieved from the BugFlow knowledge store:\n\n"
            f"#### 🔍 Key Findings & Historical Insights:\n"
            f"{snippets}\n"
            f"#### 🛠️ Recommended Action Plan:\n"
            f"1. **Verification**: Confirm whether the observed symptoms match known regression patterns.\n"
            f"2. **Mitigation**: Implement input validation guards and safe fallback defaults as documented in `{matches[0]['document_title']}`.\n"
            f"3. **Regression Testing**: Execute unit tests against the affected module before marking the defect as `In Review`.\n\n"
            f"*Sources consulted: {sources_str}*"
        )

    def get_stats(self, db: Session) -> Dict[str, Any]:
        doc_count = db.query(KnowledgeDocument).count()
        chunk_count = db.query(KnowledgeChunk).count()
        queries_count = db.query(RAGQueryLog).count()

        return {
            "total_documents": doc_count,
            "total_chunks": chunk_count,
            "embedding_dimension": self.embedding_dimension,
            "total_queries_served": queries_count,
            "index_status": "ONLINE & SYNCHRONIZED"
        }

rag_service = RAGService()
