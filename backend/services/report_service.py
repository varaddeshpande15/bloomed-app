from __future__ import annotations

import statistics
import time
from collections import defaultdict
from typing import Any, Callable, Dict, List

from backend_unified.models.adaptive_context import AdaptiveContext
from backend_unified.models.schemas import (
    AggregateBucket,
    LearningDNA,
    QuestionAttemptRecord,
    SessionSummary,
    SessionTotals,
    TimeAnalytics,
)
from backend_unified.services.exam_context_service import get_marks_for_bloom
from backend_unified.utils.logger import get_logger

logger = get_logger("report_service")


def _aggregate(
    history: List[Dict[str, Any]],
    key_fn: Callable[[Dict[str, Any]], str],
) -> List[AggregateBucket]:
    groups: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for row in history:
        k = key_fn(row) or "unknown"
        groups[k].append(row)
    out: List[AggregateBucket] = []
    for key, rows in sorted(groups.items(), key=lambda x: x[0].lower()):
        n = len(rows)
        correct = sum(1 for r in rows if r.get("is_correct"))
        acc = (correct / n * 100.0) if n else 0.0
        times = [float(r.get("time_taken_seconds", 0)) for r in rows]
        avg_t = statistics.mean(times) if times else 0.0
        out.append(
            AggregateBucket(
                key=key,
                attempts=n,
                correct=correct,
                accuracy_pct=round(acc, 1),
                avg_time_seconds=round(avg_t, 2),
            )
        )
    return out


def _time_block(history: List[Dict[str, Any]]) -> TimeAnalytics:
    times = [float(h.get("time_taken_seconds", 0)) for h in history if h]
    if not times:
        return TimeAnalytics()
    correct_times = [
        float(h["time_taken_seconds"])
        for h in history
        if h.get("is_correct")
    ]
    wrong_times = [
        float(h["time_taken_seconds"])
        for h in history
        if h and not h.get("is_correct")
    ]
    return TimeAnalytics(
        total_attempt_time_seconds=round(sum(times), 2),
        avg_time_per_question_seconds=round(statistics.mean(times), 2),
        median_time_seconds=round(statistics.median(times), 2),
        min_time_seconds=round(min(times), 2),
        max_time_seconds=round(max(times), 2),
        avg_time_when_correct_seconds=round(statistics.mean(correct_times), 2)
        if correct_times
        else 0.0,
        avg_time_when_incorrect_seconds=round(statistics.mean(wrong_times), 2)
        if wrong_times
        else 0.0,
    )


def _behavior_counts(history: List[Dict[str, Any]]) -> Dict[str, int]:
    c: Dict[str, int] = defaultdict(int)
    for h in history:
        tag = h.get("behavior_tag") or "normal"
        c[tag] += 1
    return dict(c)


def _actionable_insights(
    context: AdaptiveContext,
    history: List[Dict[str, Any]],
    weak_concepts: List[str],
    behavior_freq: Dict[str, int],
) -> List[str]:
    tips: List[str] = []
    n = len(history)
    if n == 0:
        tips.append(
            "No graded attempts in this session yet — complete questions to unlock detailed analytics."
        )
        return tips

    guess = behavior_freq.get("guessing", 0)
    if guess / max(n, 1) >= 0.2:
        tips.append(
            "A notable share of answers were flagged as rapid incorrect attempts (possible guessing). "
            "Try reading each stem twice and eliminating options before submitting."
        )

    struggle = behavior_freq.get("struggle", 0)
    if struggle / max(n, 1) >= 0.15:
        tips.append(
            "Several items showed long time + incorrect outcome — break these topics into smaller "
            "review chunks and revisit prerequisites."
        )

    for cname in weak_concepts[:5]:
        tips.append(f"Prioritize spaced review on: {cname}.")

    if context.confidence_score < 0.35:
        tips.append(
            "Confidence estimate is low — mix easier retrieval drills with worked examples before harder items."
        )

    if context.rolling_accuracy >= 0.85 and n >= 5:
        tips.append(
            "Strong recent accuracy — consider advancing to higher Bloom levels or mixed application tasks."
        )

    ta = _time_block(history)
    if (
        ta.avg_time_when_incorrect_seconds
        and ta.avg_time_when_correct_seconds
        and ta.avg_time_when_incorrect_seconds > ta.avg_time_when_correct_seconds * 1.5
    ):
        tips.append(
            "You spend longer on missed items — after a wrong answer, spend 1–2 minutes on the explanation "
            "before moving on to build pattern recognition."
        )

    exam = context.exam_config or {}
    if exam.get("time_pressure") == "high" and ta.median_time_seconds > 45:
        tips.append(
            "Exam profile is time-pressured — practice short timed sets to align pace with test conditions."
        )

    if not tips:
        tips.append("Maintain current study rhythm; monitor weak concepts if accuracy dips.")

    return tips[:12]


def generate_session_summary(context: AdaptiveContext) -> SessionSummary:
    """
    Final session report: legacy summary fields + rich analytics when attempt_history exists.
    """
    logger.info("Generating session summary for user %s", context.user_id)

    history: List[Dict[str, Any]] = list(context.attempt_history or [])
    accuracy_pct = int(context.rolling_accuracy * 100)

    profile = "balanced"
    if "guessing" in context.detected_behaviors:
        profile = "guess-prone"
    if "concept_gap" in context.detected_behaviors:
        profile = "needs foundational review"

    weak_concepts = [
        concept for concept, acc in context.concept_accuracies.items() if acc < 0.5
    ]

    estimated_score = get_marks_for_bloom(context.current_bloom) * max(context.streak, 1)

    avg_time = 10.0
    if history:
        avg_time = statistics.mean(
            [float(h.get("time_taken_seconds", 0)) for h in history]
        )

    speed_label = "fast" if avg_time < 15 else "steady"

    dna = LearningDNA(
        accuracy=accuracy_pct,
        speed=speed_label,
        behavior=profile,
        estimated_marks=int(min(estimated_score, 100)),
    )

    roadmap = [f"Review foundations of {c}" for c in weak_concepts]
    if not roadmap:
        roadmap = ["Ready for next level application concepts!"]

    bloom_tracker = {context.current_bloom: float(accuracy_pct)}
    traits = {
        "learning_style": context.traits.get("learning_style", "unknown"),
        "interaction": context.traits.get("interaction_preference", "balanced"),
    }

    resources = []
    if context.exam_config.get("time_pressure") == "high":
        resources.append("Time Management Drill Set")

    behavior_freq = _behavior_counts(history)

    q_records = [
        QuestionAttemptRecord(
            question_id=str(h.get("question_id", "")),
            topic=str(h.get("topic", "")),
            concept=str(h.get("concept", "")),
            difficulty=str(h.get("difficulty", "")),
            question_type=str(h.get("question_type", "")),
            bloom_level=str(h.get("bloom_level", "")),
            is_correct=bool(h.get("is_correct")),
            time_taken_seconds=float(h.get("time_taken_seconds", 0)),
            behavior_tag=str(h.get("behavior_tag", "normal")),
        )
        for h in history
    ]

    wall = max(0.0, time.time() - float(context.session_started_at or time.time()))
    totals = SessionTotals(
        session_duration_wall_clock_seconds=round(wall, 1),
        total_questions_attempted=len(history),
        total_correct=sum(1 for h in history if h.get("is_correct")),
        overall_accuracy_pct=round(
            (sum(1 for h in history if h.get("is_correct")) / len(history) * 100.0), 1
        )
        if history
        else 0.0,
        max_correct_streak=int(context.max_streak_session),
        ending_streak=int(context.streak),
    )

    summary = SessionSummary(
        final_level=context.current_level,
        improvement="+10%" if context.current_level > 0.5 else "Maintained",
        weak_concepts=weak_concepts,
        confidence_trend="increasing"
        if context.confidence_score > 0.5
        else "fluctuating",
        behavior_profile=profile,
        learning_dna=dna,
        roadmap=roadmap,
        bloom_progress=bloom_tracker,
        trait_alignment=traits,
        resources=resources,
        confidence_score=round(float(context.confidence_score), 3),
        rolling_accuracy=round(float(context.rolling_accuracy), 3),
        concept_mastery_estimates={
            k: round(float(v), 3) for k, v in context.concept_accuracies.items()
        },
        detected_behaviors_all=list(context.detected_behaviors),
        question_wise_performance=q_records,
        by_topic=_aggregate(history, lambda r: str(r.get("topic", "unknown"))),
        by_bloom_level=_aggregate(history, lambda r: str(r.get("bloom_level", "unknown"))),
        by_difficulty=_aggregate(history, lambda r: str(r.get("difficulty", "unknown"))),
        by_question_type=_aggregate(history, lambda r: str(r.get("question_type", "unknown"))),
        behavior_frequency=behavior_freq,
        time_analytics=_time_block(history) if history else None,
        session_totals=totals,
        actionable_insights=_actionable_insights(
            context, history, weak_concepts, behavior_freq
        ),
    )

    return summary
