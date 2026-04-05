from backend_unified.models.adaptive_context import AdaptiveContext

def detect_behavior(context: AdaptiveContext, current_time_taken: float, is_correct: bool) -> str:
    """
    Analyzes attempt data to assign a behavioral tag like "guessing", "concept_gap", or "struggle".
    """
    behavior = "normal"
    
    # 1. Detect Guessing
    if current_time_taken < 5.0 and not is_correct:
        behavior = "guessing"
    
    # 2. Detect Concept Gap
    # If accuracy for the current concept has dropped below 40% over multiple attempts
    concept_acc = context.concept_accuracies.get(context.current_concept, 1.0)
    if concept_acc < 0.4 and not is_correct:
        behavior = "concept_gap"
        
    # 3. Detect Struggle
    threshold_high = 60.0
    if current_time_taken > threshold_high and not is_correct:
        behavior = "struggle"
    
    # 4. Detect Rushing but Correct (Maybe memorized but not understanding deeply, or just fast)
    if current_time_taken < 3.0 and is_correct:
        behavior = "fast_correct"

    return behavior
