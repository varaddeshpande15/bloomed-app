from typing import List, Dict, Any
from backend_unified.models.schemas import DecisionTrace

class ExplainabilityService:
    @staticmethod
    def generate_explanation(decision_dict: Dict[str, Any], trace: List[str], confidence: float) -> DecisionTrace:
        """
        Transforms internal engine traces into structured explanation object including distinct keys for rendering logic in the UI.
        """
        structured = {
            "insight": "Maintaining current pacing based on steady performance.",
            "reason": "Steady performance",
            "action": f"Providing {decision_dict.get('recommended_difficulty', 'medium')} {decision_dict.get('recommended_type', 'standard')} question",
            "confidence_level": "high" if confidence > 0.7 else ("low" if confidence < 0.4 else "medium")
        }
        
        if "behavior_concept_gap_overriding_to_easy_conceptual" in trace:
            structured["insight"] = "We noticed a concept gap, dropping difficulty to ensure foundational grasp."
            structured["reason"] = "Concept gap detected"
        elif "behavior_guessing_overriding_to_easy_conceptual" in trace:
            structured["insight"] = "You answered very quickly and were incorrect."
            structured["reason"] = "Guessing behavior detected"
        elif "behavior_struggle_overriding_to_easy_conceptual" in trace:
            structured["insight"] = "It looks like you struggled with that one. Let's take a step back and reinforce fundamentals."
            structured["reason"] = "Struggle behavior detected"
        elif "score_above_0.75_increasing_level_+0.1" in trace:
            structured["insight"] = "Great job! Accuracy is high, stepping up the difficulty."
            structured["reason"] = "High score performance"
        elif "positive_momentum_detected_increasing_difficulty_+0.05" in trace:
            structured["insight"] = "Great momentum! Stepping up the challenge slightly."
            structured["reason"] = "Positive learning momentum"
        elif "negative_momentum_detected_slowing_progression_-0.05" in trace:
            structured["insight"] = "Performance dipped slightly, slowing down progression to ensure mastery."
            structured["reason"] = "Negative learning momentum"
            
        return DecisionTrace(
            decision={k: str(v) for k, v in decision_dict.items()},
            reason_trace=trace,
            structured_insight=structured
        )
