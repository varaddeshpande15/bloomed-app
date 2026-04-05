from backend_unified.models.adaptive_context import AdaptiveContext

def update_knowledge_state(context: AdaptiveContext, time_taken: float, is_correct: bool, current_concept: str):
    """
    Updates tracking metrics: concept_accuracy and confidence_score.
    """
    # 1. Concept Accuracy update (exponential moving average style for simplicity)
    prev_acc = context.concept_accuracies.get(current_concept, 1.0 if is_correct else 0.0)
    new_acc = (prev_acc * 0.7) + ((1.0 if is_correct else 0.0) * 0.3)
    context.concept_accuracies[current_concept] = new_acc
    
    # 2. Confidence Calculation
    # Threshold could dynamically depend on question difficulty, arbitrary 15s avg
    threshold = 15.0 
    if is_correct and time_taken < threshold:
        context.confidence_score = min(1.0, context.confidence_score + 0.1)
    elif not is_correct:
        context.confidence_score = max(0.0, context.confidence_score - 0.1)
        
    # 3. Rolling Accuracy update
    correct_count = sum(1 for att in context.last_n_attempts if att["is_correct"])
    total_att = len(context.last_n_attempts)
    if total_att > 0:
        context.rolling_accuracy = correct_count / total_att
