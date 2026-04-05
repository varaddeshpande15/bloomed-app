import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { quizParties } from "@/db/schema";
import { notifyQuizPartySubscribers } from "@/lib/quiz-party-notify";
import type { BloomQuestion, BloomTestPlanItem } from "@/lib/bloom-api";
import { totalQuestionsFromPlan } from "@/lib/bloom-api";

const base = process.env.BLOOM_API_URL ?? process.env.NEXT_PUBLIC_BLOOM_API_URL;

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }
  if (!base?.trim()) {
    return NextResponse.json({ detail: "BLOOM_API_URL is not configured" }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const partyId = String((body as { partyId?: string }).partyId ?? "").trim();
  if (!partyId) {
    return NextResponse.json({ detail: "partyId required" }, { status: 400 });
  }

  const rows = await db.select().from(quizParties).where(eq(quizParties.id, partyId)).limit(1);
  const party = rows[0];
  if (!party || party.hostUserId !== userId) {
    return NextResponse.json({ detail: "Forbidden" }, { status: 403 });
  }
  if (party.status !== "lobby" && party.status !== "configuring") {
    return NextResponse.json({ detail: "Party locked" }, { status: 400 });
  }
  if (!party.testPlanJson?.trim()) {
    return NextResponse.json({ detail: "Configure test plan first" }, { status: 400 });
  }

  let testPlan: BloomTestPlanItem[];
  try {
    testPlan = JSON.parse(party.testPlanJson) as BloomTestPlanItem[];
  } catch {
    return NextResponse.json({ detail: "Invalid test plan" }, { status: 400 });
  }

  const n = totalQuestionsFromPlan(testPlan);
  if (n < 1) {
    return NextResponse.json({ detail: "Test plan has no questions" }, { status: 400 });
  }

  const synthetic = `party_${partyId}`;
  const api = base.replace(/\/$/, "");

  const startRes = await fetch(`${api}/api/session/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: synthetic,
      test_plan: testPlan,
      exam_type: party.examType || "STANDARD",
    }),
  });
  if (!startRes.ok) {
    const err = await startRes.json().catch(() => ({}));
    return NextResponse.json(
      { detail: (err as { detail?: string }).detail ?? "Session start failed" },
      { status: 502 },
    );
  }

  const questions: BloomQuestion[] = [];
  for (let i = 0; i < n; i++) {
    const nextRes = await fetch(`${api}/api/session/next`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: synthetic }),
    });
    if (!nextRes.ok) {
      const err = await nextRes.json().catch(() => ({}));
      return NextResponse.json(
        { detail: (err as { detail?: string }).detail ?? `Question ${i + 1} failed` },
        { status: 502 },
      );
    }
    const data = (await nextRes.json()) as { question: BloomQuestion };
    const q = data.question;
    questions.push({
      id: q.id,
      topic: q.topic,
      difficulty: q.difficulty,
      type: q.type,
      question_text: q.question_text,
      options: q.options ?? null,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
    });

    const ansRes = await fetch(`${api}/api/session/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: synthetic,
        question_id: q.id,
        user_answer: q.correct_answer,
        time_taken: 0.5,
      }),
    });
    if (!ansRes.ok) {
      const err = await ansRes.json().catch(() => ({}));
      return NextResponse.json(
        { detail: (err as { detail?: string }).detail ?? `Advance ${i + 1} failed` },
        { status: 502 },
      );
    }
  }

  const now = new Date();
  await db
    .update(quizParties)
    .set({
      questionsJson: JSON.stringify(questions),
      totalQuestions: questions.length,
      status: "configuring",
      updatedAt: now,
    })
    .where(eq(quizParties.id, partyId));

  revalidatePath(`/play/${partyId}`);
  void notifyQuizPartySubscribers(partyId);

  return NextResponse.json({ ok: true, totalQuestions: questions.length });
}
