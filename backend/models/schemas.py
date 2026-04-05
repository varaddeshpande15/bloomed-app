from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class Question(BaseModel):
    id: str
    topic: str
    difficulty: str
    type: str # mcq, conceptual, applied
    question_text: str
    options: Optional[List[str]] = None
    correct_answer: str
    explanation: str

class TopicBreakdown(BaseModel):
    topic: str
    subtopics: List[str]

class SyllabusUploadResponse(BaseModel):
    topics: List[TopicBreakdown]
    resources: List[str] = []
    enhanced: bool = False
    
class TestPlanItem(BaseModel):
    topic: str
    num_questions: int
    types: List[str]
    bloom_distribution: Dict[str, int] = {}
    trait_bias: Dict[str, str] = {}

class TestPlanRequest(BaseModel):
    topics: List[TopicBreakdown]
    marking_scheme: dict
    exam_type: Optional[str] = "STANDARD"
    trait_profile: Optional[dict] = None

class TestPlanResponse(BaseModel):
    test_plan: List[TestPlanItem]

class SessionStartRequest(BaseModel):
    user_id: str
    test_plan: List[TestPlanItem]
    exam_type: Optional[str] = "STANDARD"
    trait_profile_id: Optional[str] = None

class SubmissionRequest(BaseModel):
    user_id: str
    question_id: str
    user_answer: str
    time_taken: float # seconds

class AnswerEvaluationResponse(BaseModel):
    is_correct: bool
    correct_answer: str
    explanation: str
    insight: Dict[str, str]

class SessionNextRequest(BaseModel):
    user_id: str

class AdaptationTrace(BaseModel):
    prev_level: float
    new_level: float
    prev_bloom: str
    new_bloom: str
    reason: str
    decision_trace: List[str]

class QuestionResponse(BaseModel):
    question: Question
    adaptation: AdaptationTrace

class DecisionTrace(BaseModel):
    decision: Dict[str, str]
    reason_trace: List[str]
    structured_insight: Dict[str, str]

class LearningDNA(BaseModel):
    accuracy: int
    speed: str
    behavior: str
    estimated_marks: int

# ---- PSYCHOLOGICAL PROFILING SCHEMAS ---- #

class Big5Trait(BaseModel):
    score: int = Field(..., description="Score from 0-100")
    level: str = Field(..., description="High, Moderate, or Low")
    description: str = Field(..., description="Qualitative analysis of this trait")

class Big5Analysis(BaseModel):
    openness: Big5Trait
    conscientiousness: Big5Trait
    extraversion: Big5Trait
    agreeableness: Big5Trait
    neuroticism: Big5Trait

class VARKProfile(BaseModel):
    primary_style: str
    scores: Dict[str, int]
    description: str

class LearningProfile(BaseModel):
    vark: VARKProfile
    growth_mindset_score: int
    grit_score: int
    resilience_level: str

class PsychologicalReport(BaseModel):
    student_id: str
    summary: str
    big5_analysis: Big5Analysis
    learning_profile: LearningProfile
    strengths: List[str]
    areas_for_growth: List[str]
    tailored_recommendations: List[str]

class ChatMessage(BaseModel):
    role: str # 'user' or 'assistant'
    content: str
    timestamp: Optional[float] = None

class ProfileSessionState(BaseModel):
    session_id: str
    history: List[ChatMessage] = []
    is_complete: bool = False
    confidence_scores: Dict[str, float] = {}


# ---- SESSION REPORT (extended analytics) ---- #


class QuestionAttemptRecord(BaseModel):
    """Single question outcome for dashboards and drill-down."""

    question_id: str
    topic: str
    concept: str
    difficulty: str
    question_type: str
    bloom_level: str
    is_correct: bool
    time_taken_seconds: float
    behavior_tag: str = "normal"


class AggregateBucket(BaseModel):
    """Accuracy / volume for a grouping key (topic, bloom, difficulty, etc.)."""

    key: str
    attempts: int
    correct: int
    accuracy_pct: float
    avg_time_seconds: float = 0.0


class TimeAnalytics(BaseModel):
    total_attempt_time_seconds: float = 0.0
    avg_time_per_question_seconds: float = 0.0
    median_time_seconds: float = 0.0
    min_time_seconds: float = 0.0
    max_time_seconds: float = 0.0
    avg_time_when_correct_seconds: float = 0.0
    avg_time_when_incorrect_seconds: float = 0.0


class SessionTotals(BaseModel):
    session_duration_wall_clock_seconds: float = 0.0
    total_questions_attempted: int = 0
    total_correct: int = 0
    overall_accuracy_pct: float = 0.0
    max_correct_streak: int = 0
    ending_streak: int = 0


class SessionSummary(BaseModel):
    final_level: float
    improvement: str
    weak_concepts: List[str]
    confidence_trend: str
    behavior_profile: str
    learning_dna: LearningDNA
    roadmap: List[str]
    bloom_progress: Dict[str, float] = {}
    trait_alignment: Dict[str, str] = {}
    resources: List[str] = []

    # Extended analytics (populated when attempt_history exists)
    confidence_score: float = Field(
        0.5, description="Model-estimated learner confidence 0–1"
    )
    rolling_accuracy: float = Field(
        0.0, description="Accuracy over the recent attempt window"
    )
    concept_mastery_estimates: Dict[str, float] = Field(
        default_factory=dict,
        description="Per-concept smoothed accuracy (0–1)",
    )
    detected_behaviors_all: List[str] = Field(
        default_factory=list,
        description="Distinct behavior tags observed this session",
    )
    question_wise_performance: List[QuestionAttemptRecord] = Field(
        default_factory=list,
        description="Chronological attempt log with outcomes",
    )
    by_topic: List[AggregateBucket] = Field(default_factory=list)
    by_bloom_level: List[AggregateBucket] = Field(default_factory=list)
    by_difficulty: List[AggregateBucket] = Field(default_factory=list)
    by_question_type: List[AggregateBucket] = Field(default_factory=list)
    behavior_frequency: Dict[str, int] = Field(
        default_factory=dict,
        description="Count of attempts per behavior tag",
    )
    time_analytics: Optional[TimeAnalytics] = None
    session_totals: Optional[SessionTotals] = None
    actionable_insights: List[str] = Field(
        default_factory=list,
        description="Concrete next steps derived from metrics",
    )
