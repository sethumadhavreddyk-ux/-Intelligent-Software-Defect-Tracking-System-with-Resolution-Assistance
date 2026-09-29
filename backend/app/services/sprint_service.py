import datetime
from typing import Dict, Any, List
from app.models.models import Sprint, Defect, DefectSeverity, DefectStatus

class SprintHealthEngine:
    @staticmethod
    def calculate_health(sprint: Sprint, defects: List[Defect]) -> Dict[str, Any]:
        total_defects = len(defects)
        if total_defects == 0:
            return {
                "sprint_id": sprint.id,
                "sprint_name": sprint.name,
                "health_score": 100,
                "risk_level": "LOW",
                "total_defects": 0,
                "critical_defects": 0,
                "high_defects": 0,
                "resolved_defects": 0,
                "completion_rate": 100.0,
                "days_remaining": max(0, (sprint.end_date - datetime.datetime.utcnow()).days),
                "velocity_target": sprint.velocity_target,
                "explanation": "No defects currently logged in this sprint. Sprint is operating with optimal stability.",
                "recommended_actions": ["Maintain active testing coverage", "Ensure feature stories meet Definition of Done"]
            }

        resolved_statuses = [DefectStatus.RESOLVED, DefectStatus.VERIFIED, DefectStatus.CLOSED]
        resolved_defects = [d for d in defects if d.status in resolved_statuses]
        open_defects = [d for d in defects if d.status not in resolved_statuses]

        critical_count = sum(1 for d in open_defects if d.severity == DefectSeverity.CRITICAL)
        high_count = sum(1 for d in open_defects if d.severity == DefectSeverity.HIGH)
        medium_count = sum(1 for d in open_defects if d.severity == DefectSeverity.MEDIUM)

        completion_rate = round((len(resolved_defects) / total_defects) * 100, 1)

        # Baseline score: starts at 100
        score = 100

        # Critical defect penalty: -18 pts each
        score -= (critical_count * 18)

        # High defect penalty: -9 pts each
        score -= (high_count * 9)

        # Medium defect penalty: -3 pts each
        score -= (medium_count * 3)

        # Incomplete work penalty
        remaining_ratio = len(open_defects) / total_defects
        score -= int(remaining_ratio * 15)

        # Calculate days remaining
        now = datetime.datetime.utcnow()
        days_remaining = max(0, (sprint.end_date - now).days)

        if days_remaining <= 2 and len(open_defects) > 3:
            score -= 15  # Time crunch penalty

        score = max(5, min(100, score))

        # Risk classification
        if score >= 80:
            risk_level = "LOW"
        elif score >= 60:
            risk_level = "MODERATE"
        elif score >= 40:
            risk_level = "HIGH"
        else:
            risk_level = "CRITICAL"

        # Construct actionable explanation
        reasons = []
        if critical_count > 0:
            reasons.append(f"{critical_count} critical defect{'s' if critical_count > 1 else ''} blocking release")
        if high_count > 0:
            reasons.append(f"{high_count} high-severity defect{'s' if high_count > 1 else ''} unresolved")
        if days_remaining <= 2 and len(open_defects) > 0:
            reasons.append(f"only {days_remaining} day(s) remaining with {len(open_defects)} unresolved issues")

        if reasons:
            explanation = f"The sprint has {risk_level.lower()} risk because {', '.join(reasons)}."
        else:
            explanation = f"The sprint is progressing smoothly with {completion_rate}% completion rate and manageable defect backlog."

        # Recommendations
        recommendations = []
        if critical_count > 0:
            recommendations.append("Immediate Swarm: Assign top developers to resolve critical blockers immediately.")
        if high_count > 2:
            recommendations.append("De-scope non-critical feature work to focus on stabilizing high-severity defects.")
        if len(open_defects) > sprint.velocity_target:
            recommendations.append("Active defect count exceeds sprint velocity target; reschedule lower-priority items.")
        if not recommendations:
            recommendations.append("Continue current velocity and proceed to verification phase.")

        return {
            "sprint_id": sprint.id,
            "sprint_name": sprint.name,
            "health_score": score,
            "risk_level": risk_level,
            "total_defects": total_defects,
            "critical_defects": critical_count,
            "high_defects": high_count,
            "resolved_defects": len(resolved_defects),
            "completion_rate": completion_rate,
            "days_remaining": days_remaining,
            "velocity_target": sprint.velocity_target,
            "explanation": explanation,
            "recommended_actions": recommendations
        }

sprint_health_engine = SprintHealthEngine()
