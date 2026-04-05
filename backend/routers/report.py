from fastapi import APIRouter, HTTPException
from backend_unified.models.schemas import SessionSummary
from backend_unified.services.session_service import SessionService
from backend_unified.services.report_service import generate_session_summary

router = APIRouter()

@router.get("/{user_id}", response_model=SessionSummary)
def get_report(user_id: str):
    """
    Session report: legacy summary (level, weak concepts, roadmap, Learning DNA) plus
    extended analytics when `/session/answer` has been used — question-level log, aggregates
    by topic/Bloom/difficulty/type, time analytics, behavior counts, and actionable insights.
    """
    try:
        context = SessionService.get_context(user_id)
        return generate_session_summary(context)
    except Exception as e:
        raise HTTPException(status_code=404, detail="Session context not found for user")
