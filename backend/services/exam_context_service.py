from typing import Dict, Any

EXAM_REGISTRY = {
    "GATE": {
        "bloom_distribution": {
            "remember": 10,
            "understand": 20,
            "apply": 40,
            "analyze": 20,
            "evaluate": 10,
            "create": 0
        },
        "negative_marking": True,
        "time_pressure": "high" # Suggests stricter confidence bounds
    },
    "STANDARD": {
        "bloom_distribution": {
            "remember": 30,
            "understand": 30,
            "apply": 20,
            "analyze": 10,
            "evaluate": 10,
            "create": 0
        },
        "negative_marking": False,
        "time_pressure": "moderate"
    }
}

def get_exam_config(exam_name: str) -> Dict[str, Any]:
    """Retrieves standard configurations for a given Exam Type."""
    return EXAM_REGISTRY.get(exam_name.upper(), EXAM_REGISTRY["STANDARD"])

def get_marks_for_bloom(bloom_level: str) -> int:
    """Scales marking weights based on Bloom's depth."""
    scale = {
        "remember": 1,
        "understand": 1,
        "apply": 2,
        "analyze": 3,
        "evaluate": 4,
        "create": 5
    }
    return scale.get(bloom_level.lower(), 1)
