from backend.models.schemas import Question
from backend.utils.logger import get_logger

logger = get_logger("evaluation_service")

def evaluate_answer(question: Question, user_answer: str, time_taken: float) -> bool:
    """
    Evaluates literal correctness of the user's answer against the Question object.
    In real scenarios, might invoke LLM for semantic equality.
    """
    logger.info(f"Evaluating answer: {user_answer} vs {question.correct_answer}")
    
    # Mock exact match for fallback
    is_correct = user_answer.strip().lower() == question.correct_answer.strip().lower()
    return is_correct
