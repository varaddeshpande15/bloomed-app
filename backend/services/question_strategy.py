from typing import Dict, Any
from backend_unified.models.adaptive_context import AdaptiveContext
from backend_unified.adaptive_engine.adaptive_decision_engine import decide_next_step
from backend_unified.utils.logger import log_adaptive_event

class QuestionStrategy:
    @staticmethod
    def determine_next_question_params(context: AdaptiveContext) -> Dict[str, Any]:
        """
        Layer dedicated to deciding WHICH type, difficulty, and topic based on adaptive_decision_engine.
        Returns parameters ready for question_service along with the traces.
        """
        # Determine behavior override via the context trace
        # The adaptive decision engine decides the raw state config
        
        # We need the current behavior for `decide_next_step`, pulling latest from context
        current_behavior = "normal"
        if context.detected_behaviors:
            current_behavior = context.detected_behaviors[-1]
            
        decision, trace = decide_next_step(context, current_behavior)
        
        # Evaluate Concept Fatigue (M8 Non-Repetition)
        context.concept_frequency[context.current_concept] = context.concept_frequency.get(context.current_concept, 0) + 1
        if context.concept_frequency[context.current_concept] >= 5:
            decision["move_to_next_topic"] = True
            trace.append("concept_oversaturated_forcing_topic_shift_M8")
            
        # Log event tracking
        if decision["recommended_difficulty"] != "medium": # Mock change detection
            log_adaptive_event("level_changed", context.user_id, {"new_diff": decision["recommended_difficulty"]})

        params = {
            "topic": context.current_topic,
            "concept": context.current_concept,
            "difficulty": decision["recommended_difficulty"],
            "type": decision["recommended_type"],
            "decision_dict": decision,
            "trace": trace
        }
        
        if decision["move_to_next_topic"]:
            # Logic here to fetch next topic from syllabus / test plan bounds
            log_adaptive_event("topic_switched", context.user_id, {"old": context.current_concept, "new": "next_concept_placeholder"})
            # In a real scenario, mutate context to new topic
            pass
            
        return params
