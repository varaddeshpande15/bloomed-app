/** Mirrors backend `SessionSummary` / nested models (snake_case JSON from FastAPI). */

export type AggregateBucket = {
  key: string;
  attempts: number;
  correct: number;
  accuracy_pct: number;
  avg_time_seconds?: number;
};

export type QuestionAttemptRecord = {
  question_id: string;
  topic: string;
  concept: string;
  difficulty: string;
  question_type: string;
  bloom_level: string;
  is_correct: boolean;
  time_taken_seconds: number;
  behavior_tag: string;
};

export type TimeAnalytics = {
  total_attempt_time_seconds?: number;
  avg_time_per_question_seconds?: number;
  median_time_seconds?: number;
  min_time_seconds?: number;
  max_time_seconds?: number;
  avg_time_when_correct_seconds?: number;
  avg_time_when_incorrect_seconds?: number;
};

export type SessionTotals = {
  session_duration_wall_clock_seconds?: number;
  total_questions_attempted?: number;
  total_correct?: number;
  overall_accuracy_pct?: number;
  max_correct_streak?: number;
  ending_streak?: number;
};

export type LearningDNA = {
  accuracy: number;
  speed: string;
  behavior: string;
  estimated_marks: number;
};

export type BloomSessionReport = {
  final_level?: number;
  improvement?: string;
  weak_concepts: string[];
  confidence_trend?: string;
  behavior_profile?: string;
  learning_dna?: LearningDNA;
  roadmap?: string[];
  bloom_progress?: Record<string, number>;
  trait_alignment?: Record<string, string>;
  resources?: string[];
  confidence_score?: number;
  rolling_accuracy?: number;
  concept_mastery_estimates?: Record<string, number>;
  detected_behaviors_all?: string[];
  question_wise_performance?: QuestionAttemptRecord[];
  by_topic?: AggregateBucket[];
  by_bloom_level?: AggregateBucket[];
  by_difficulty?: AggregateBucket[];
  by_question_type?: AggregateBucket[];
  behavior_frequency?: Record<string, number>;
  time_analytics?: TimeAnalytics | null;
  session_totals?: SessionTotals | null;
  actionable_insights?: string[];
};

export function parseBloomSessionReport(raw: string | null): BloomSessionReport | null {
  if (!raw?.trim()) return null;
  try {
    return JSON.parse(raw) as BloomSessionReport;
  } catch {
    return null;
  }
}
