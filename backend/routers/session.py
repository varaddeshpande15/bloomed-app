from fastapi import APIRouter
from backend_unified.models.schemas import SubmissionRequest, AnswerEvaluationResponse, Question, QuestionResponse, SessionStartRequest, SessionNextRequest
from backend_unified.services.session_service import SessionService

router = APIRouter()

from backend_unified.services.exam_context_service import get_exam_config

@router.post("/start", status_code=200)
def start_session(request: SessionStartRequest):
    """
    Initializes standard state context inside the Session Service.
    """
    first_item = request.test_plan[0] if request.test_plan else None
    first_topic = first_item.topic if first_item else "Default"
    
    # 1. Resolve Configs
    exam_cfg = get_exam_config(request.exam_type or "STANDARD")
    traits = first_item.trait_bias if first_item else {}
    
    SessionService.initialize_session(
        user_id=request.user_id,
        topic=first_topic,
        concept="Foundations",
        traits=traits,
        exam_config=exam_cfg
    )
    if request.test_plan:
        SessionService.set_test_plan_queue(request.user_id, request.test_plan)
    return {"message": "Session tracking established", "user_id": request.user_id}

@router.post("/answer", response_model=AnswerEvaluationResponse)
def submit_answer(submission: SubmissionRequest):
    """
    Evaluates users latest question against the context, provides insight and updates memory graph.
    """
    return SessionService.submit_answer(submission)

@router.post("/next", response_model=QuestionResponse)
def next_question(request: SessionNextRequest):
    """
    Rides off the back of the newly updated context from /answer to generate the next difficulty payload.
    """
    return SessionService.get_next_question(request.user_id)
