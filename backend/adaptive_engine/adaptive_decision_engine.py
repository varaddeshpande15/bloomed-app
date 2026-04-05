from typing import Dict, Any, Tuple, List
from backend_unified.models.adaptive_context import AdaptiveContext
from backend_unified.adaptive_engine.learning_score_engine import calculate_learning_score

def score_to_bloom(score: float) -> str:
    """Maps a normalized 0-1 value to Bloom's Taxonomy."""
    if score >= 0.85: return "create"
    if score >= 0.70: return "evaluate"
    if score >= 0.55: return "analyze"
    if score >= 0.40: return "apply"
    if score >= 0.25: return "understand"
    return "remember"

def decide_next_step(context: AdaptiveContext, current_behavior: str) -> Tuple[Dict[str, Any], List[str]]:
    """
    Decides Level Adaptation and Topic Progression using fluid scoring bounds.
    """
    trace = []
    decision = {
        "move_to_next_topic": False,
        "recommended_difficulty": "medium", # default generic fallback, overridden by smooth mapping later
        "recommended_type": "standard",
    }
    
    # 1. Level Adaptation based on fluid logic
    score = calculate_learning_score(context)
    trace.append(f"calculated_score_is_{score:.2f}")
    
    # Check trait constraints
    jump_scale = 0.1
    if context.traits.get("independence_level") == "low":
        jump_scale = 0.05
        trace.append("trait_low_independence_reducing_progression_speed")
        
    if score > 0.75:
        context.current_level = min(1.0, context.current_level + jump_scale)
        trace.append(f"score_above_0.75_increasing_level_+{jump_scale}")
    elif score < 0.50:
        context.current_level = max(0.0, context.current_level - jump_scale)
        trace.append(f"score_below_0.50_decreasing_level_-{jump_scale}")
    else:
        trace.append("score_stable_maintaining_level")
        
    # Apply Momentum Logic
    if context.momentum > 0.05:
        context.current_level = min(1.0, context.current_level + 0.05)
        trace.append("positive_momentum_detected_increasing_difficulty_+0.05")
    elif context.momentum < -0.05:
        context.current_level = max(0.0, context.current_level - 0.05)
        trace.append("negative_momentum_detected_slowing_progression_-0.05")

    # Apply Bloom Mapping
    context.current_bloom = score_to_bloom(context.current_level)
    decision["recommended_bloom"] = context.current_bloom
    trace.append(f"mapped_level_to_bloom_{context.current_bloom}")

    # Map current_level strictly to string difficulty bounds
    if context.current_level > 0.66:
        decision["recommended_difficulty"] = "hard"
    elif context.current_level > 0.33:
        decision["recommended_difficulty"] = "medium"
    else:
        decision["recommended_difficulty"] = "easy"

    # 2. Overrides based on Behavior Profile
    if current_behavior == "concept_gap":
        decision["recommended_difficulty"] = "easy"
        decision["recommended_type"] = "conceptual"
        trace.append("behavior_concept_gap_overriding_to_easy_conceptual")
    elif current_behavior == "guessing":
        decision["recommended_difficulty"] = "easy"
        decision["recommended_type"] = "conceptual" 
        trace.append("behavior_guessing_overriding_to_easy_conceptual")
    elif current_behavior == "struggle":
        decision["recommended_difficulty"] = "easy"
        decision["recommended_type"] = "conceptual"
        trace.append("behavior_struggle_overriding_to_easy_conceptual")
    else:
        # Strong performance logic
        if context.current_level > 0.75:
            decision["recommended_type"] = "application"
            trace.append("fluent_level_allocating_application_type")

    # 3. Topic Progression Logic
    concept_acc = context.concept_accuracies.get(context.current_concept, 0.0)
    if concept_acc > 0.7 and context.confidence_score > 0.6 and context.stability > 0.5:
        decision["move_to_next_topic"] = True
        trace.append("concept_acc_confidence_stability_metrics_met_moving_topic")
        
    # Inject trace back into context for explainability to read
    context.recent_decision_traces = trace
    
    return decision, trace
