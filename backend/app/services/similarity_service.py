from typing import List, Tuple, Dict, Any, Optional
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import re

from app.models.models import Defect, HistoricalResolution

class DefectSimilarityEngine:
    def __init__(self):
        self.vectorizer = TfidfVectorizer(stop_words='english', ngram_range=(1, 2))

    def _preprocess(self, text: str) -> str:
        if not text:
            return ""
        # Lowercase, clean punctuation
        cleaned = re.sub(r'[^a-zA-Z0-9\s]', ' ', text.lower())
        return " ".join(cleaned.split())

    def find_similar_defects(
        self,
        query_title: str,
        query_desc: str,
        existing_defects: List[Defect],
        top_k: int = 5,
        threshold: float = 0.15,
        duplicate_threshold: float = 0.65
    ) -> List[Dict[str, Any]]:
        """
        Calculates cosine similarity between the query defect and existing defects in the database.
        Returns top similar defects, highlighting potential duplicates.
        """
        if not existing_defects:
            return []

        query_text = f"{self._preprocess(query_title)} {self._preprocess(query_title)} {self._preprocess(query_desc)}"
        
        corpus = [query_text]
        defect_lookup = []
        for d in existing_defects:
            # Repeat title twice to weight title terms higher
            combined = f"{self._preprocess(d.title)} {self._preprocess(d.title)} {self._preprocess(d.raw_description or '')} {self._preprocess(d.steps_to_reproduce or '')} {self._preprocess(d.category.value if d.category else '')}"
            corpus.append(combined)
            defect_lookup.append(d)

        try:
            tfidf_matrix = self.vectorizer.fit_transform(corpus)
            cosine_scores = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:]).flatten()
            
            results = []
            for idx, score in enumerate(cosine_scores):
                score_float = float(round(score, 3))
                if score_float >= threshold:
                    defect = defect_lookup[idx]
                    results.append({
                        "id": defect.id,
                        "key": defect.key,
                        "title": defect.title,
                        "status": defect.status.value if hasattr(defect.status, 'value') else str(defect.status),
                        "severity": defect.severity.value if hasattr(defect.severity, 'value') else str(defect.severity),
                        "category": defect.category.value if hasattr(defect.category, 'value') else str(defect.category),
                        "similarity_score": score_float,
                        "is_potential_duplicate": score_float >= duplicate_threshold,
                        "resolution_summary": getattr(defect, "resolution_summary", None) or getattr(defect, "resolution_notes", None) or None
                    })

            # Sort by similarity score descending
            results.sort(key=lambda x: x["similarity_score"], reverse=True)
            return results[:top_k]
        except Exception:
            return []

    def match_historical_resolutions(
        self,
        query_title: str,
        query_desc: str,
        historical_records: List[HistoricalResolution],
        top_k: int = 3
    ) -> List[Dict[str, Any]]:
        """
        Finds previous resolutions from the knowledge base matching the defect symptoms.
        """
        if not historical_records:
            return []

        query_text = f"{self._preprocess(query_title)} {self._preprocess(query_desc)}"
        corpus = [query_text]
        records_lookup = []
        for r in historical_records:
            combined = f"{self._preprocess(r.defect_title)} {self._preprocess(r.root_cause)} {self._preprocess(r.category)} {self._preprocess(r.keywords or '')}"
            corpus.append(combined)
            records_lookup.append(r)

        try:
            tfidf_matrix = self.vectorizer.fit_transform(corpus)
            cosine_scores = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:]).flatten()

            results = []
            for idx, score in enumerate(cosine_scores):
                score_float = float(round(score, 3))
                if score_float >= 0.15:
                    rec = records_lookup[idx]
                    results.append({
                        "defect_key": rec.defect_key,
                        "defect_title": rec.defect_title,
                        "root_cause": rec.root_cause,
                        "resolution_text": rec.resolution_text,
                        "similarity_score": score_float
                    })

            results.sort(key=lambda x: x["similarity_score"], reverse=True)
            return results[:top_k]
        except Exception:
            return []

similarity_engine = DefectSimilarityEngine()
