import type { BloomQuestion } from "@/lib/bloom-api";

export type QuizPartyStatus =
  | "lobby"
  | "configuring"
  | "countdown"
  | "active"
  | "finished";

export type QuizPartyMemberRow = {
  userId: string;
  displayName: string;
  isReady: boolean;
  isHost: boolean;
  imageUrl: string | null;
};

export type QuizLeaderboardRow = {
  userId: string;
  displayName: string;
  imageUrl: string | null;
  correct: number;
  wrong: number;
  totalTimeSeconds: number;
  accuracyPct: number;
};

export type QuestionTopThreeRow = {
  rank: 1 | 2 | 3;
  userId: string;
  displayName: string;
  imageUrl: string | null;
  isCorrect: boolean;
  timeTakenSeconds: number;
};

export type TopicBreakdownRow = {
  topic: string;
  correct: number;
  total: number;
  accuracyPct: number;
};

export type MyCurrentQuestionAnswer = {
  userAnswer: string;
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string;
};

export type QuizPartyPublicSnapshot = {
  party: {
    id: string;
    code: string;
    title: string;
    status: QuizPartyStatus;
    hostUserId: string;
    examType: string;
    engineMode: string;
    currentQuestionIndex: number;
    totalQuestions: number;
    secondsPerQuestion: number;
    hasQuestions: boolean;
    countdownEndsAt: string | null;
    questionEndsAt: string | null;
    /** When set (and in the future), clients show question results / top-3 interstitial instead of the next question. */
    betweenQuestionEndsAt: string | null;
    startedAt: string | null;
    finishedAt: string | null;
  };
  members: QuizPartyMemberRow[];
  questions: BloomQuestion[] | null;
  currentQuestion: BloomQuestion | null;
  /** Top performers for the question just completed (only while `betweenQuestionEndsAt` is active). */
  questionTopThree: QuestionTopThreeRow[] | null;
  /** Your submitted answer for the live question (feedback + lock). */
  myCurrentQuestionAnswer: MyCurrentQuestionAnswer | null;
  leaderboard: QuizLeaderboardRow[];
  /** Leader user id for taunts (null if tie at top) */
  leaderUserId: string | null;
  /** You vs topics (finished games) */
  myTopicBreakdown?: TopicBreakdownRow[];
};

export function scoreAnswer(
  q: BloomQuestion,
  userAnswer: string,
): boolean {
  const u = userAnswer.trim().toLowerCase();
  const c = (q.correct_answer ?? "").trim().toLowerCase();
  if (u === c) return true;
  const opts = q.options ?? [];
  const matchOpt = opts.find((o) => o.trim().toLowerCase() === u);
  const correctOpt = opts.find((o) => o.trim().toLowerCase() === c);
  if (matchOpt && correctOpt && matchOpt === correctOpt) return true;
  return false;
}
