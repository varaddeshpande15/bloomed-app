"use server";

import { auth } from "@clerk/nextjs/server";
import { and, asc, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { ensureAppUserForQuizParty } from "@/actions/sync-user";
import { db } from "@/lib/db";
import type { GameReportJson, GameReportTopicStat } from "@/lib/game-report-types";
import { parseGameReport } from "@/lib/game-report-types";
import { notifyQuizPartySubscribers } from "@/lib/quiz-party-notify";
import {
  quizParties,
  quizPartyAnswers,
  quizPartyMembers,
  users,
} from "@/db/schema";
import type { BloomQuestion } from "@/lib/bloom-api";
import {
  type MyCurrentQuestionAnswer,
  type QuestionTopThreeRow,
  type QuizLeaderboardRow,
  type QuizPartyPublicSnapshot,
  type QuizPartyStatus,
  type TopicBreakdownRow,
  scoreAnswer,
} from "@/lib/quiz-party-types";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const BETWEEN_QUESTION_MS = 5000;

function randomCode(): string {
  let s = "";
  for (let i = 0; i < 6; i++) {
    s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return s;
}

function parseQuestions(raw: string | null): BloomQuestion[] | null {
  if (!raw?.trim()) return null;
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? (v as BloomQuestion[]) : null;
  } catch {
    return null;
  }
}

async function enrichMemberImageUrls(
  memberRows: (typeof quizPartyMembers.$inferSelect)[],
): Promise<
  {
    userId: string;
    displayName: string;
    isReady: boolean;
    isHost: boolean;
    imageUrl: string | null;
  }[]
> {
  const ids = memberRows.map((m) => m.userId);
  if (!ids.length) {
    return memberRows.map((m) => ({
      userId: m.userId,
      displayName: m.displayName,
      isReady: m.isReady,
      isHost: m.isHost,
      imageUrl: m.imageUrl ?? null,
    }));
  }
  const urows = await db
    .select({ id: users.id, imageUrl: users.imageUrl })
    .from(users)
    .where(inArray(users.id, ids));
  const fromUser = new Map(urows.map((u) => [u.id, u.imageUrl]));
  return memberRows.map((m) => ({
    userId: m.userId,
    displayName: m.displayName,
    isReady: m.isReady,
    isHost: m.isHost,
    imageUrl: m.imageUrl ?? fromUser.get(m.userId) ?? null,
  }));
}

async function computeQuestionTopThree(
  partyId: string,
  questionIndex: number,
  members: { userId: string; displayName: string; imageUrl: string | null }[],
): Promise<QuestionTopThreeRow[]> {
  const nameMap = new Map(
    members.map((m) => [
      m.userId,
      { displayName: m.displayName, imageUrl: m.imageUrl },
    ]),
  );
  const rows = await db
    .select()
    .from(quizPartyAnswers)
    .where(
      and(
        eq(quizPartyAnswers.partyId, partyId),
        eq(quizPartyAnswers.questionIndex, questionIndex),
      ),
    );
  const enriched = rows.map((a) => {
    const meta = nameMap.get(a.userId);
    return {
      userId: a.userId,
      displayName: meta?.displayName ?? "?",
      imageUrl: meta?.imageUrl ?? null,
      isCorrect: a.isCorrect,
      timeTakenSeconds: a.timeTakenSeconds,
    };
  });
  enriched.sort((a, b) => {
    if (a.isCorrect !== b.isCorrect) return (b.isCorrect ? 1 : 0) - (a.isCorrect ? 1 : 0);
    return a.timeTakenSeconds - b.timeTakenSeconds;
  });
  const top = enriched.slice(0, 3);
  return top.map((r, i) => ({
    ...r,
    rank: (i + 1) as 1 | 2 | 3,
  }));
}

function buildPartyTopicInsights(
  answers: (typeof quizPartyAnswers.$inferSelect)[],
  questions: BloomQuestion[] | null,
): {
  partyTopicStats: GameReportTopicStat[];
  partyWeakTopics: string[];
  partyStrongTopics: string[];
} {
  const topicAgg = new Map<string, { c: number; n: number }>();
  for (const a of answers) {
    const t = (questions?.[a.questionIndex]?.topic ?? "General").trim() || "General";
    const x = topicAgg.get(t) ?? { c: 0, n: 0 };
    x.n += 1;
    if (a.isCorrect) x.c += 1;
    topicAgg.set(t, x);
  }

  const partyTopicStats: GameReportTopicStat[] = [...topicAgg.entries()]
    .map(([topic, v]) => ({
      topic,
      correctCount: v.c,
      totalAttempts: v.n,
      accuracyPct: v.n ? Math.round((v.c / v.n) * 1000) / 10 : 0,
    }))
    .sort((a, b) => a.accuracyPct - b.accuracyPct);

  const partyWeakTopics = partyTopicStats
    .filter((r) => r.totalAttempts >= 1 && r.accuracyPct < 50)
    .slice(0, 8)
    .map((r) => r.topic);

  const partyStrongTopics = [...partyTopicStats]
    .sort((a, b) => b.accuracyPct - a.accuracyPct)
    .filter((r) => r.totalAttempts >= 1 && r.accuracyPct >= 70)
    .slice(0, 8)
    .map((r) => r.topic);

  return { partyTopicStats, partyWeakTopics, partyStrongTopics };
}

async function saveGameReport(partyId: string): Promise<void> {
  const pr = await db
    .select()
    .from(quizParties)
    .where(eq(quizParties.id, partyId))
    .limit(1);
  const party = pr[0];
  if (!party) return;
  if (party.reportJson?.trim()) return;

  const members = await enrichMemberImageUrls(
    await db
      .select()
      .from(quizPartyMembers)
      .where(eq(quizPartyMembers.partyId, partyId)),
  );
  const { rows: leaderboard } = await buildLeaderboard(partyId, members);
  const n = leaderboard.length;
  const partyAvgAccuracy =
    n > 0 ? leaderboard.reduce((s, r) => s + r.accuracyPct, 0) / n : 0;

  const questions = parseQuestions(party.questionsJson);
  const allAnswers = await db
    .select()
    .from(quizPartyAnswers)
    .where(eq(quizPartyAnswers.partyId, partyId));
  const { partyTopicStats, partyWeakTopics, partyStrongTopics } = buildPartyTopicInsights(
    allAnswers,
    questions,
  );

  const report: GameReportJson = {
    kind: "game",
    version: 2,
    partyId,
    title: party.title ?? "Multiplayer game",
    code: party.code,
    examType: party.examType,
    finishedAt: party.finishedAt?.toISOString() ?? new Date().toISOString(),
    totalQuestions: party.totalQuestions,
    secondsPerQuestion: party.secondsPerQuestion,
    partyAvgAccuracy: Math.round(partyAvgAccuracy * 10) / 10,
    leaderboard,
    partyTopicStats,
    partyWeakTopics,
    partyStrongTopics,
  };

  await db
    .update(quizParties)
    .set({
      reportJson: JSON.stringify(report),
      updatedAt: new Date(),
    })
    .where(eq(quizParties.id, partyId));

  revalidatePath("/reports");
  revalidatePath(`/play/${partyId}`);
}

/**
 * Advances countdown, question timers, interstitials, and completion. Returns whether DB state changed.
 */
async function tickQuizParty(partyId: string): Promise<boolean> {
  const now = new Date();
  const rows = await db
    .select()
    .from(quizParties)
    .where(eq(quizParties.id, partyId))
    .limit(1);
  const party = rows[0];
  if (!party) return false;

  if (
    party.status === "countdown" &&
    party.countdownEndsAt &&
    now.getTime() >= party.countdownEndsAt.getTime()
  ) {
    await db
      .update(quizParties)
      .set({
        status: "active",
        currentQuestionIndex: 0,
        betweenQuestionEndsAt: null,
        questionEndsAt: new Date(now.getTime() + party.secondsPerQuestion * 1000),
        startedAt: now,
        updatedAt: now,
      })
      .where(eq(quizParties.id, partyId));
    return true;
  }

  if (party.status !== "active") return false;

  const questions = parseQuestions(party.questionsJson);
  if (!questions?.length) return false;

  const members = await db
    .select()
    .from(quizPartyMembers)
    .where(eq(quizPartyMembers.partyId, partyId));
  const memberIds = members.map((m) => m.userId);
  const idx = party.currentQuestionIndex;

  if (party.betweenQuestionEndsAt) {
    if (now.getTime() < party.betweenQuestionEndsAt.getTime()) return false;

    const isLast = idx >= party.totalQuestions - 1;
    if (isLast) {
      await db
        .update(quizParties)
        .set({
          status: "finished",
          betweenQuestionEndsAt: null,
          questionEndsAt: null,
          finishedAt: now,
          updatedAt: now,
        })
        .where(eq(quizParties.id, partyId));
      await saveGameReport(partyId);
      return true;
    }

    await db
      .update(quizParties)
      .set({
        currentQuestionIndex: idx + 1,
        betweenQuestionEndsAt: null,
        questionEndsAt: new Date(now.getTime() + party.secondsPerQuestion * 1000),
        updatedAt: now,
      })
      .where(eq(quizParties.id, partyId));
    return true;
  }

  const existing = await db
    .select()
    .from(quizPartyAnswers)
    .where(
      and(
        eq(quizPartyAnswers.partyId, partyId),
        eq(quizPartyAnswers.questionIndex, idx),
      ),
    );
  const answered = new Set(existing.map((e) => e.userId));

  const deadline = party.questionEndsAt ? new Date(party.questionEndsAt) : null;
  const timeUp = deadline ? now.getTime() >= deadline.getTime() : false;
  const allAnswered =
    memberIds.length > 0 && memberIds.every((id) => answered.has(id));

  if (!allAnswered && !timeUp) return false;

  for (const uid of memberIds) {
    if (answered.has(uid)) continue;
    await db.insert(quizPartyAnswers).values({
      id: randomUUID(),
      partyId,
      userId: uid,
      questionIndex: idx,
      userAnswer: "(timeout)",
      isCorrect: false,
      timeTakenSeconds: party.secondsPerQuestion,
    });
  }

  await db
    .update(quizParties)
    .set({
      betweenQuestionEndsAt: new Date(now.getTime() + BETWEEN_QUESTION_MS),
      questionEndsAt: null,
      updatedAt: now,
    })
    .where(eq(quizParties.id, partyId));
  return true;
}

async function buildLeaderboard(
  partyId: string,
  members: {
    userId: string;
    displayName: string;
    imageUrl: string | null;
  }[],
): Promise<{ rows: QuizLeaderboardRow[]; leaderUserId: string | null }> {
  const answers = await db
    .select()
    .from(quizPartyAnswers)
    .where(eq(quizPartyAnswers.partyId, partyId));

  const nameByUser = new Map(members.map((m) => [m.userId, m.displayName]));
  const imgByUser = new Map(members.map((m) => [m.userId, m.imageUrl]));
  const agg = new Map<string, { c: number; w: number; t: number }>();
  for (const a of answers) {
    const cur = agg.get(a.userId) ?? { c: 0, w: 0, t: 0 };
    if (a.isCorrect) cur.c += 1;
    else cur.w += 1;
    cur.t += a.timeTakenSeconds;
    agg.set(a.userId, cur);
  }

  const rows: QuizLeaderboardRow[] = members.map((m) => {
    const x = agg.get(m.userId) ?? { c: 0, w: 0, t: 0 };
    const n = x.c + x.w;
    return {
      userId: m.userId,
      displayName: nameByUser.get(m.userId) ?? m.displayName,
      imageUrl: imgByUser.get(m.userId) ?? null,
      correct: x.c,
      wrong: x.w,
      totalTimeSeconds: Math.round(x.t * 100) / 100,
      accuracyPct: n > 0 ? Math.round((x.c / n) * 1000) / 10 : 0,
    };
  });

  rows.sort((a, b) => {
    if (b.correct !== a.correct) return b.correct - a.correct;
    return a.totalTimeSeconds - b.totalTimeSeconds;
  });

  const leaderUserId = rows.length > 0 ? rows[0].userId : null;

  return { rows, leaderUserId };
}

function deepErrorMessage(e: unknown): string {
  const parts: string[] = [];
  let cur: unknown = e;
  let depth = 0;
  while (cur && depth < 6) {
    if (cur instanceof Error) {
      parts.push(cur.message);
      cur = cur.cause;
    } else if (typeof cur === "object" && cur !== null && "message" in cur) {
      parts.push(String((cur as { message: unknown }).message));
      cur =
        "cause" in cur ? (cur as { cause: unknown }).cause : undefined;
    } else {
      parts.push(String(cur));
      break;
    }
    depth += 1;
  }
  return parts.join(" ");
}

/** Non-retryable DB schema drift (missing columns). */
function migrationHintFromDbError(e: unknown): string | null {
  const msg = deepErrorMessage(e);
  if (/42703|does not exist/i.test(msg) && /column/i.test(msg)) {
    return "Database is missing multiplayer columns. In Supabase → SQL Editor, run frontend/supabase/migrate_quiz_party_columns.sql, then try again.";
  }
  return null;
}

export async function createQuizParty(): Promise<
  { id: string; code: string } | { error: string }
> {
  const profile = await ensureAppUserForQuizParty();
  if (!profile) {
    return { error: "Could not sync your account — sign in again or try later." };
  }

  let lastErr: unknown;
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = randomCode();
    const id = randomUUID();
    try {
      await db.insert(quizParties).values({
        id,
        code,
        hostUserId: profile.userId,
        status: "lobby",
      });
      await db.insert(quizPartyMembers).values({
        id: randomUUID(),
        partyId: id,
        userId: profile.userId,
        displayName: profile.displayName,
        imageUrl: profile.imageUrl,
        isHost: true,
        isReady: false,
      });
      revalidatePath("/play");
      void notifyQuizPartySubscribers(id);
      return { id, code };
    } catch (e) {
      lastErr = e;
      const hint = migrationHintFromDbError(e);
      if (hint) {
        console.error("createQuizParty:", e);
        return { error: hint };
      }
      continue;
    }
  }
  console.error("createQuizParty: failed after retries", lastErr);
  return {
    error: `Could not create party: ${deepErrorMessage(lastErr).slice(0, 280)}`,
  };
}

export async function joinQuizPartyByCode(
  code: string,
): Promise<{ ok: true; partyId: string } | { error: string }> {
  const { userId } = await auth();
  if (!userId) return { error: "Unauthorized" };
  const profile = await ensureAppUserForQuizParty();
  if (!profile) return { error: "Could not sync your account — try again." };
  const c = code.trim().toUpperCase();
  if (c.length < 4) return { error: "Invalid code" };

  const rows = await db
    .select()
    .from(quizParties)
    .where(eq(quizParties.code, c))
    .limit(1);
  const party = rows[0];
  if (!party) return { error: "Party not found" };
  if (party.status !== "lobby" && party.status !== "configuring") {
    return { error: "Game already started or finished" };
  }

  const existing = await db
    .select()
    .from(quizPartyMembers)
    .where(
      and(eq(quizPartyMembers.partyId, party.id), eq(quizPartyMembers.userId, profile.userId)),
    )
    .limit(1);
  if (existing[0]) {
    return { ok: true, partyId: party.id };
  }

  await db.insert(quizPartyMembers).values({
    id: randomUUID(),
    partyId: party.id,
    userId: profile.userId,
    displayName: profile.displayName,
    imageUrl: profile.imageUrl,
    isHost: false,
    isReady: false,
  });
  revalidatePath("/play");
  revalidatePath(`/play/${party.id}`);
  void notifyQuizPartySubscribers(party.id);
  return { ok: true, partyId: party.id };
}

export async function setQuizPartyReady(partyId: string, ready: boolean): Promise<void> {
  const { userId } = await auth();
  if (!userId) return;
  await db
    .update(quizPartyMembers)
    .set({ isReady: ready })
    .where(
      and(eq(quizPartyMembers.partyId, partyId), eq(quizPartyMembers.userId, userId)),
    );
  revalidatePath(`/play/${partyId}`);
  void notifyQuizPartySubscribers(partyId);
}

export async function updateQuizPartyConfig(input: {
  partyId: string;
  examType?: string;
  engineMode?: "standard" | "fixed";
  markingScheme?: Record<string, unknown>;
  syllabusTopics?: unknown;
  testPlan?: unknown;
  totalQuestions?: number;
  secondsPerQuestion?: number;
  title?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Unauthorized" };

  const pr = await db
    .select()
    .from(quizParties)
    .where(eq(quizParties.id, input.partyId))
    .limit(1);
  const party = pr[0];
  if (!party || party.hostUserId !== userId) return { ok: false, error: "Forbidden" };
  if (party.status !== "lobby" && party.status !== "configuring") {
    return { ok: false, error: "Locked" };
  }

  const now = new Date();
  await db
    .update(quizParties)
    .set({
      examType: input.examType ?? party.examType,
      engineMode: input.engineMode ?? party.engineMode,
      markingSchemeJson:
        input.markingScheme != null
          ? JSON.stringify(input.markingScheme)
          : party.markingSchemeJson,
      syllabusTopicsJson:
        input.syllabusTopics != null
          ? JSON.stringify(input.syllabusTopics)
          : party.syllabusTopicsJson,
      testPlanJson:
        input.testPlan != null ? JSON.stringify(input.testPlan) : party.testPlanJson,
      totalQuestions: input.totalQuestions ?? party.totalQuestions,
      secondsPerQuestion: input.secondsPerQuestion ?? party.secondsPerQuestion,
      title: input.title?.trim() ? input.title.trim() : party.title,
      status: "configuring",
      updatedAt: now,
    })
    .where(eq(quizParties.id, input.partyId));

  revalidatePath(`/play/${input.partyId}`);
  void notifyQuizPartySubscribers(input.partyId);
  return { ok: true };
}

export async function hostStartCountdown(partyId: string): Promise<{ ok: boolean; error?: string }> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Unauthorized" };

  const pr = await db
    .select()
    .from(quizParties)
    .where(eq(quizParties.id, partyId))
    .limit(1);
  const party = pr[0];
  if (!party || party.hostUserId !== userId) return { ok: false, error: "Forbidden" };
  if (!party.questionsJson?.trim()) return { ok: false, error: "Generate questions first" };

  const members = await db
    .select()
    .from(quizPartyMembers)
    .where(eq(quizPartyMembers.partyId, partyId));
  if (!members.every((m) => m.isReady)) {
    return { ok: false, error: "All players must be ready" };
  }

  const ends = new Date(Date.now() + 5000);
  await db
    .update(quizParties)
    .set({
      status: "countdown",
      countdownEndsAt: ends,
      updatedAt: new Date(),
    })
    .where(eq(quizParties.id, partyId));

  revalidatePath(`/play/${partyId}`);
  void notifyQuizPartySubscribers(partyId);
  return { ok: true };
}

export async function getQuizPartySnapshot(partyId: string): Promise<QuizPartyPublicSnapshot | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const ticked = await tickQuizParty(partyId);
  if (ticked) void notifyQuizPartySubscribers(partyId);

  const pr = await db
    .select()
    .from(quizParties)
    .where(eq(quizParties.id, partyId))
    .limit(1);
  const party = pr[0];
  if (!party) return null;

  const memberRowsRaw = await db
    .select()
    .from(quizPartyMembers)
    .where(eq(quizPartyMembers.partyId, partyId));

  const isMember = memberRowsRaw.some((m) => m.userId === userId);
  if (!isMember) return null;

  const memberRows = await enrichMemberImageUrls(memberRowsRaw);

  const questions = parseQuestions(party.questionsJson);
  const idx = party.currentQuestionIndex;
  const now = new Date();

  const betweenEnd = party.betweenQuestionEndsAt;
  const inBetween =
    party.status === "active" &&
    betweenEnd != null &&
    now.getTime() < betweenEnd.getTime();

  let currentQuestion: BloomQuestion | null = null;
  if (party.status === "active" && !inBetween && questions && questions[idx]) {
    currentQuestion = questions[idx];
  }

  let questionTopThree: QuestionTopThreeRow[] | null = null;
  if (inBetween) {
    questionTopThree = await computeQuestionTopThree(partyId, idx, memberRows);
  }

  let myCurrentQuestionAnswer: MyCurrentQuestionAnswer | null = null;
  if (party.status === "active" && questions && questions[idx] && !inBetween) {
    const mine = await db
      .select()
      .from(quizPartyAnswers)
      .where(
        and(
          eq(quizPartyAnswers.partyId, partyId),
          eq(quizPartyAnswers.userId, userId),
          eq(quizPartyAnswers.questionIndex, idx),
        ),
      )
      .limit(1);
    const row = mine[0];
    const q = questions[idx];
    if (row && q) {
      myCurrentQuestionAnswer = {
        userAnswer: row.userAnswer,
        isCorrect: row.isCorrect,
        correctAnswer: q.correct_answer ?? "",
        explanation: q.explanation ?? "",
      };
    }
  }

  const { rows: leaderboard, leaderUserId } = await buildLeaderboard(
    partyId,
    memberRows.map((m) => ({
      userId: m.userId,
      displayName: m.displayName,
      imageUrl: m.imageUrl,
    })),
  );

  let myTopicBreakdown: TopicBreakdownRow[] | undefined;
  if (party.status === "finished" && questions?.length) {
    const mine = await db
      .select()
      .from(quizPartyAnswers)
      .where(
        and(eq(quizPartyAnswers.partyId, partyId), eq(quizPartyAnswers.userId, userId)),
      );
    const map = new Map<string, { c: number; n: number }>();
    for (const a of mine) {
      const t = questions[a.questionIndex]?.topic ?? "General";
      const x = map.get(t) ?? { c: 0, n: 0 };
      x.n += 1;
      if (a.isCorrect) x.c += 1;
      map.set(t, x);
    }
    myTopicBreakdown = [...map.entries()]
      .map(([topic, v]) => ({
        topic,
        correct: v.c,
        total: v.n,
        accuracyPct: v.n ? Math.round((v.c / v.n) * 1000) / 10 : 0,
      }))
      .sort((a, b) => a.accuracyPct - b.accuracyPct);
  }

  return {
    party: {
      id: party.id,
      code: party.code,
      title: party.title ?? "Multiplayer game",
      status: party.status as QuizPartyStatus,
      hostUserId: party.hostUserId,
      examType: party.examType,
      engineMode: party.engineMode,
      currentQuestionIndex: idx,
      totalQuestions: party.totalQuestions,
      secondsPerQuestion: party.secondsPerQuestion,
      hasQuestions: Boolean(questions?.length),
      countdownEndsAt: party.countdownEndsAt?.toISOString() ?? null,
      questionEndsAt: party.questionEndsAt?.toISOString() ?? null,
      betweenQuestionEndsAt: party.betweenQuestionEndsAt?.toISOString() ?? null,
      startedAt: party.startedAt?.toISOString() ?? null,
      finishedAt: party.finishedAt?.toISOString() ?? null,
    },
    members: memberRows.map((m) => ({
      userId: m.userId,
      displayName: m.displayName,
      isReady: m.isReady,
      isHost: m.isHost,
      imageUrl: m.imageUrl,
    })),
    questions,
    currentQuestion,
    questionTopThree,
    myCurrentQuestionAnswer,
    leaderboard,
    leaderUserId,
    myTopicBreakdown,
  };
}

export async function submitQuizPartyAnswer(input: {
  partyId: string;
  userAnswer: string;
  timeTakenSeconds: number;
}): Promise<{
  ok: boolean;
  error?: string;
  isCorrect?: boolean;
  correctAnswer?: string;
  explanation?: string;
  feedbackMessage?: string;
}> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Unauthorized" };

  const pr = await db
    .select()
    .from(quizParties)
    .where(eq(quizParties.id, input.partyId))
    .limit(1);
  const party = pr[0];
  if (!party || party.status !== "active") return { ok: false, error: "Not active" };
  if (party.betweenQuestionEndsAt && new Date() < party.betweenQuestionEndsAt) {
    return { ok: false, error: "Between questions" };
  }

  const questions = parseQuestions(party.questionsJson);
  const idx = party.currentQuestionIndex;
  const q = questions?.[idx];
  if (!q) return { ok: false, error: "No question" };

  const dup = await db
    .select()
    .from(quizPartyAnswers)
    .where(
      and(
        eq(quizPartyAnswers.partyId, input.partyId),
        eq(quizPartyAnswers.userId, userId),
        eq(quizPartyAnswers.questionIndex, idx),
      ),
    )
    .limit(1);
  if (dup[0]) return { ok: false, error: "Already answered" };

  const isCorrect = scoreAnswer(q, input.userAnswer);
  const correctAnswer = q.correct_answer ?? "";
  const explanation = q.explanation ?? "";
  const feedbackMessage = isCorrect
    ? `Correct — ${explanation || "Nice work."}`
    : `Incorrect — the correct answer is ${correctAnswer}. ${explanation || ""}`.trim();

  await db.insert(quizPartyAnswers).values({
    id: randomUUID(),
    partyId: input.partyId,
    userId,
    questionIndex: idx,
    userAnswer: input.userAnswer,
    isCorrect,
    timeTakenSeconds: input.timeTakenSeconds,
  });

  const advanced = await tickQuizParty(input.partyId);
  if (advanced) void notifyQuizPartySubscribers(input.partyId);

  revalidatePath(`/play/${input.partyId}`);

  return {
    ok: true,
    isCorrect,
    correctAnswer,
    explanation,
    feedbackMessage,
  };
}

export async function listCompletedGameReportsForUser() {
  const { userId } = await auth();
  if (!userId) return [];

  try {
    return await db
      .select({
        id: quizParties.id,
        title: quizParties.title,
        code: quizParties.code,
        examType: quizParties.examType,
        finishedAt: quizParties.finishedAt,
        reportJson: quizParties.reportJson,
        updatedAt: quizParties.updatedAt,
        totalQuestions: quizParties.totalQuestions,
      })
      .from(quizPartyMembers)
      .innerJoin(quizParties, eq(quizPartyMembers.partyId, quizParties.id))
      .where(
        and(
          eq(quizPartyMembers.userId, userId),
          eq(quizParties.status, "finished"),
          isNotNull(quizParties.reportJson),
        ),
      )
      .orderBy(desc(quizParties.finishedAt))
      .limit(50);
  } catch (e) {
    console.error("listCompletedGameReportsForUser:", e);
    return [];
  }
}

export async function getGameReportPartyForUser(partyId: string) {
  const { userId } = await auth();
  if (!userId) return null;

  try {
    const m = await db
      .select()
      .from(quizPartyMembers)
      .where(
        and(eq(quizPartyMembers.partyId, partyId), eq(quizPartyMembers.userId, userId)),
      )
      .limit(1);
    if (!m[0]) return null;

    const pr = await db
      .select()
      .from(quizParties)
      .where(eq(quizParties.id, partyId))
      .limit(1);
    const party = pr[0];
    if (!party || party.status !== "finished" || !party.reportJson?.trim()) return null;

    return party;
  } catch (e) {
    console.error("getGameReportPartyForUser:", e);
    return null;
  }
}

export async function getGameReportDetailForViewer(partyId: string) {
  const { userId } = await auth();
  if (!userId) return null;

  const party = await getGameReportPartyForUser(partyId);
  if (!party) return null;

  const questions = parseQuestions(party.questionsJson);
  const answers = await db
    .select()
    .from(quizPartyAnswers)
    .where(
      and(eq(quizPartyAnswers.partyId, partyId), eq(quizPartyAnswers.userId, userId)),
    )
    .orderBy(asc(quizPartyAnswers.questionIndex));

  const report = parseGameReport(party.reportJson);
  return {
    party,
    report,
    questions,
    myAnswers: answers.map((a) => ({
      questionIndex: a.questionIndex,
      userAnswer: a.userAnswer,
      isCorrect: a.isCorrect,
      timeTakenSeconds: a.timeTakenSeconds,
      topic: questions?.[a.questionIndex]?.topic ?? "General",
      questionText: questions?.[a.questionIndex]?.question_text ?? "",
      correctAnswer: questions?.[a.questionIndex]?.correct_answer ?? "",
      explanation: questions?.[a.questionIndex]?.explanation ?? "",
    })),
  };
}
