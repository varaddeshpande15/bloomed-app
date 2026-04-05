from backend.models.adaptive_context import AdaptiveContext

def calculate_confidence(is_correct: bool, time_taken: float, avg_time: float, streak: int) -> float:
    if is_correct and avg_time > 0 and time_taken < (avg_time * 0.7):
        # 0.9 base, normalizes if they have a streak
        return min(1.0, 0.9 + (0.02 * streak))
    elif is_correct:
        return min(1.0, 0.7 + (0.02 * streak))
    elif not is_correct and avg_time > 0 and time_taken < (avg_time * 0.5):
        return 0.2
    else:
        return 0.4

def calculate_stability(last_n_attempts: list) -> float:
    if len(last_n_attempts) < 2:
        return 1.0
    # Use variance of correctness (1/0)
    # Lower variance = higher stability
    correctness_vals = [1 if a["is_correct"] else 0 for a in last_n_attempts]
    mean = sum(correctness_vals)/len(correctness_vals)
    variance = sum((x - mean)**2 for x in correctness_vals) / len(correctness_vals)
    return max(0.0, 1.0 - variance)

def calculate_learning_score(context: AdaptiveContext) -> float:
    """
    Score = 0.4 * RollingAccuracy + 0.25 * ConceptAccuracy + 0.2 * Confidence + 0.15 * Stability
    Ensure all values are normalized (0-1).
    """
    recent_acc = context.rolling_accuracy
    concept_acc = context.concept_accuracies.get(context.current_concept, recent_acc) # fallback to general
    
    # Calculate derived stats
    attempts = context.last_n_attempts
    
    avg_time = sum(a["time_taken"] for a in attempts)/len(attempts) if attempts else 0.0
    latest_time = attempts[-1]["time_taken"] if attempts else 0.0
    latest_correct = attempts[-1]["is_correct"] if attempts else False
    
    confidence = calculate_confidence(latest_correct, latest_time, avg_time, context.streak)
    stability = calculate_stability(attempts)
    
    # Set to context
    context.confidence_score = confidence
    context.stability = stability
    
    score = (0.4 * recent_acc) + (0.25 * concept_acc) + (0.2 * confidence) + (0.15 * stability)
    
    # Calculate Momentum
    if context.previous_score > 0:
        context.momentum = score - context.previous_score
    context.previous_score = score
    
    return score
