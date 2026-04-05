from typing import Dict, Any

def map_traits(profile: dict) -> Dict[str, Any]:
    """
    Converts a raw PsychologicalReport into actionable signals for the Adaptive Engine and Prompt Strategy.
    """
    traits = {
        "learning_style": "standard",
        "interaction_preference": "balanced",
        "independence_level": "moderate",
        "recommended_modes": []
    }
    
    # Safely extract from nested schema
    learning_profile = profile.get("learning_profile", {})
    vark = learning_profile.get("vark", {})
    big5 = profile.get("big5_analysis", {})

    # 1. VARK -> Learning Style
    primary_vark = vark.get("primary_style", "Read/Write").lower()
    traits["learning_style"] = primary_vark
    
    if primary_vark in ["visual", "kinesthetic"]:
        traits["recommended_modes"].append("scenario-based")

    # 2. Big5 Extraversion -> Interaction Preference
    extraversion_score = big5.get("extraversion", {}).get("score", 50)
    if extraversion_score > 70:
        traits["interaction_preference"] = "interactive"
        traits["recommended_modes"].append("discussion-style")
    elif extraversion_score < 40:
        traits["interaction_preference"] = "solitary"
        traits["recommended_modes"].append("direct-query")

    # 3. Big5 Conscientiousness & Grit -> Independence Level
    grit = learning_profile.get("grit_score", 50)
    conscientiousness = big5.get("conscientiousness", {}).get("score", 50)
    
    if grit > 75 and conscientiousness > 75:
        traits["independence_level"] = "high"
    elif grit < 40 or conscientiousness < 40:
        traits["independence_level"] = "low"
        
    return traits
