import time
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class AdaptiveContext(BaseModel):
    """
    The main glue object tracking session state and adaptive history.
    """
    user_id: str
    current_level: float = 0.5 # 0.0 to 1.0 mapping to easy/medium/hard
    current_topic: str
    current_concept: str
    current_question_answer: Optional[str] = None # Added for evaluation tracking
    current_question_explanation: Optional[str] = None # Added for decoupled evaluation
    current_bloom: str = "remember"
    traits: Dict[str, Any] = Field(default_factory=dict)
    exam_config: Dict[str, Any] = Field(default_factory=dict)
    
    # Internal states
    rolling_accuracy: float = 0.0
    concept_accuracies: Dict[str, float] = Field(default_factory=dict)
    confidence_score: float = 0.5
    stability: float = 1.0 # Added stability metric
    momentum: float = 0.0 # Track score trajectory (+/-)
    previous_score: float = 0.0
    streak: int = 0
    concept_frequency: Dict[str, int] = Field(default_factory=dict)
    
    # Trace arrays
    last_n_attempts: List[Dict[str, Any]] = Field(default_factory=list) # records time, correctness, type
    detected_behaviors: List[str] = Field(default_factory=list)
    recent_decision_traces: List[Dict[str, Any]] = Field(default_factory=list)

    # Session analytics (full attempt log for reporting)
    session_started_at: float = Field(default_factory=time.time)
    active_question_meta: Dict[str, Any] = Field(default_factory=dict)
    attempt_history: List[Dict[str, Any]] = Field(default_factory=list)
    cumulative_time_seconds: float = 0.0
    max_streak_session: int = 0

    # One entry per planned question — aligns adaptive topic with syllabus units
    topic_question_queue: List[str] = Field(default_factory=list)
    # Recent stems to reduce duplicate questions from the LLM
    recent_question_stems: List[str] = Field(default_factory=list)
    
    def add_attempt(self, is_correct: bool, time_taken: float, question_type: str):
        self.last_n_attempts.append({
            "is_correct": is_correct,
            "time_taken": time_taken,
            "type": question_type
        })
        
        # Track streak
        if is_correct:
            self.streak += 1
        else:
            self.streak = 0
        self.max_streak_session = max(self.max_streak_session, self.streak)

        # Keep window size limited intentionally e.g. 5
        if len(self.last_n_attempts) > 5:
            self.last_n_attempts.pop(0)

    def log_behavior(self, behavior: str):
        if behavior not in self.detected_behaviors:
            self.detected_behaviors.append(behavior)
