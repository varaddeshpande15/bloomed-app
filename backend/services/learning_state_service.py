from backend_unified.models.adaptive_context import AdaptiveContext
from backend_unified.adaptive_engine.behavior_detection import detect_behavior
from backend_unified.adaptive_engine.knowledge_state import update_knowledge_state
from backend_unified.utils.logger import log_adaptive_event, get_logger

logger = get_logger("learning_state_service")

class LearningStateService:
    @staticmethod
    def update_state_after_attempt(
        context: AdaptiveContext, is_correct: bool, time_taken: float, question_type: str
    ) -> str:
        """
        Manages user state transition cleanly, invoking Submodules cleanly.
        Returns the behavior tag detected for this attempt (for analytics logging).
        """
        context.add_attempt(is_correct, time_taken, question_type)

        behavior = detect_behavior(context, time_taken, is_correct)
        if behavior != "normal":
            context.log_behavior(behavior)
            log_adaptive_event("behavior_detected", context.user_id, {"behavior": behavior})

        update_knowledge_state(context, time_taken, is_correct, context.current_concept)

        logger.info(f"Updated state for user {context.user_id}")
        return behavior
