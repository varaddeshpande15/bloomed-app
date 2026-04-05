import type { QuizLeaderboardRow } from "@/lib/quiz-party-types";

/** Aggregated accuracy for one topic across all players in the game. */
export type GameReportTopicStat = {
  topic: string;
  correctCount: number;
  totalAttempts: number;
  accuracyPct: number;
};

export type GameReportJson = {
  kind: "game";
  version: 1 | 2;
  partyId: string;
  title: string;
  code: string;
  examType: string;
  finishedAt: string;
  totalQuestions: number;
  secondsPerQuestion: number;
  partyAvgAccuracy: number;
  leaderboard: QuizLeaderboardRow[];
  /** v2+: topic performance across the whole room (all answers). */
  partyTopicStats?: GameReportTopicStat[];
  /** v2+: topics where the room struggled (low accuracy). */
  partyWeakTopics?: string[];
  /** v2+: topics where the room did well. */
  partyStrongTopics?: string[];
};

export function parseGameReport(raw: string | null): GameReportJson | null {
  if (!raw?.trim()) return null;
  try {
    const v = JSON.parse(raw) as unknown;
    if (!v || typeof v !== "object") return null;
    const o = v as Record<string, unknown>;
    if (o.kind !== "game") return null;
    return v as GameReportJson;
  } catch {
    return null;
  }
}
