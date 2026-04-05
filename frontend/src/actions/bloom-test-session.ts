"use server";

import { auth } from "@clerk/nextjs/server";
import { and, asc, desc, eq, isNotNull } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { ensureAppUserFromClerk } from "@/actions/sync-user";
import { db } from "@/lib/db";
import { bloomTestAttempts, bloomTestSessions } from "@/db/schema";

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, (_k, v) =>
      typeof v === "bigint" ? v.toString() : v,
    );
  } catch (e) {
    console.error("safeStringify:", e);
    return "{}";
  }
}

/**
 * Persists a test session row. Returns `null` if the DB insert fails (e.g. `BloomTestSession`
 * not created in Supabase yet) so the UI can still run the FastAPI test.
 */
export async function createBloomTestSessionRecord(input: {
  templateKey?: string | null;
  examType: string;
  markingScheme: Record<string, unknown>;
  syllabusTopics: unknown;
  testPlan?: unknown;
  traitProfile?: unknown;
  targetQuestionCount: number;
}): Promise<string | null> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  try {
    await ensureAppUserFromClerk();
  } catch (e) {
    console.error("createBloomTestSessionRecord ensureAppUserFromClerk:", e);
    return null;
  }

  const id = randomUUID();
  try {
    await db.insert(bloomTestSessions).values({
      id,
      userId,
      templateKey: input.templateKey ?? null,
      examType: input.examType,
      markingSchemeJson: safeStringify(input.markingScheme),
      syllabusTopicsJson: safeStringify(input.syllabusTopics),
      testPlanJson: input.testPlan != null ? safeStringify(input.testPlan) : null,
      traitProfileJson:
        input.traitProfile != null ? safeStringify(input.traitProfile) : null,
      targetQuestionCount: input.targetQuestionCount,
      status: "active",
    });

    revalidatePath("/dashboard");
    revalidatePath("/tests");
    return id;
  } catch (e) {
    console.error("createBloomTestSessionRecord insert:", e);
    return null;
  }
}

export async function appendBloomTestAttempt(input: {
  sessionId: string;
  questionId: string;
  topic?: string | null;
  userAnswer: string;
  correctAnswer?: string | null;
  isCorrect: boolean;
  timeTakenSeconds: number;
  explanation?: string | null;
  orderIndex: number;
  insight?: Record<string, string> | null;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const rows = await db
    .select()
    .from(bloomTestSessions)
    .where(eq(bloomTestSessions.id, input.sessionId))
    .limit(1);
  const session = rows[0];
  if (!session || session.userId !== userId) throw new Error("Forbidden");

  await db.insert(bloomTestAttempts).values({
    id: randomUUID(),
    sessionId: input.sessionId,
    questionId: input.questionId,
    topic: input.topic ?? null,
    userAnswer: input.userAnswer,
    correctAnswer: input.correctAnswer ?? null,
    isCorrect: input.isCorrect,
    timeTakenSeconds: input.timeTakenSeconds,
    explanation: input.explanation ?? null,
    orderIndex: input.orderIndex,
    insightJson: input.insight ? JSON.stringify(input.insight) : null,
  });

  await db
    .update(bloomTestSessions)
    .set({ updatedAt: new Date() })
    .where(eq(bloomTestSessions.id, input.sessionId));
}

export async function completeBloomTestSession(input: {
  sessionId: string;
  report: Record<string, unknown>;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const rows = await db
    .select()
    .from(bloomTestSessions)
    .where(eq(bloomTestSessions.id, input.sessionId))
    .limit(1);
  const session = rows[0];
  if (!session || session.userId !== userId) throw new Error("Forbidden");

  await db
    .update(bloomTestSessions)
    .set({
      status: "completed",
      reportJson: JSON.stringify(input.report),
      updatedAt: new Date(),
    })
    .where(eq(bloomTestSessions.id, input.sessionId));

  revalidatePath("/dashboard");
  revalidatePath("/tests");
  revalidatePath("/reports");
}

export async function listBloomTestSessionsForUser() {
  const { userId } = await auth();
  if (!userId) return [];

  try {
    return await db
      .select()
      .from(bloomTestSessions)
      .where(eq(bloomTestSessions.userId, userId))
      .orderBy(desc(bloomTestSessions.createdAt))
      .limit(30);
  } catch (e) {
    console.error("listBloomTestSessionsForUser:", e);
    return [];
  }
}

export async function getBloomTestSessionById(sessionId: string) {
  const { userId } = await auth();
  if (!userId) return null;

  try {
    const rows = await db
      .select()
      .from(bloomTestSessions)
      .where(eq(bloomTestSessions.id, sessionId))
      .limit(1);
    const row = rows[0];
    if (!row || row.userId !== userId) return null;
    return row;
  } catch (e) {
    console.error("getBloomTestSessionById:", e);
    return null;
  }
}

export async function getBloomTestAttemptsForSession(sessionId: string) {
  const { userId } = await auth();
  if (!userId) return [];

  try {
    const sessions = await db
      .select()
      .from(bloomTestSessions)
      .where(eq(bloomTestSessions.id, sessionId))
      .limit(1);
    if (!sessions[0] || sessions[0].userId !== userId) return [];

    return await db
      .select()
      .from(bloomTestAttempts)
      .where(eq(bloomTestAttempts.sessionId, sessionId))
      .orderBy(asc(bloomTestAttempts.orderIndex));
  } catch (e) {
    console.error("getBloomTestAttemptsForSession:", e);
    return [];
  }
}

export async function listCompletedBloomReportsForUser() {
  const { userId } = await auth();
  if (!userId) return [];

  try {
    return await db
      .select()
      .from(bloomTestSessions)
      .where(
        and(eq(bloomTestSessions.userId, userId), isNotNull(bloomTestSessions.reportJson)),
      )
      .orderBy(desc(bloomTestSessions.updatedAt))
      .limit(50);
  } catch (e) {
    console.error("listCompletedBloomReportsForUser:", e);
    return [];
  }
}

/**
 * Completed Bloom tests with reports — used for dashboard streak + activity calendar.
 * `completedAt` is `updatedAt` when the report was saved (ISO string).
 */
export async function getBloomTestCompletionActivity(): Promise<
  { sessionId: string; completedAt: string }[]
> {
  const { userId } = await auth();
  if (!userId) return [];

  try {
    const rows = await db
      .select({
        id: bloomTestSessions.id,
        updatedAt: bloomTestSessions.updatedAt,
      })
      .from(bloomTestSessions)
      .where(
        and(
          eq(bloomTestSessions.userId, userId),
          eq(bloomTestSessions.status, "completed"),
          isNotNull(bloomTestSessions.reportJson),
        ),
      )
      .orderBy(desc(bloomTestSessions.updatedAt));

    return rows
      .filter((r) => r.updatedAt)
      .map((r) => ({
        sessionId: r.id,
        completedAt: r.updatedAt!.toISOString(),
      }));
  } catch (e) {
    console.error("getBloomTestCompletionActivity:", e);
    return [];
  }
}
