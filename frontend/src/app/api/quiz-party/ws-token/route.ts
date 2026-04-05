import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { quizPartyMembers } from "@/db/schema";
import { getQuizPartyWsBaseUrl, makeQuizPartyWsToken } from "@/lib/quiz-party-ws-token";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }
  const partyId = req.nextUrl.searchParams.get("partyId")?.trim();
  if (!partyId) {
    return NextResponse.json({ detail: "partyId required" }, { status: 400 });
  }

  const m = await db
    .select()
    .from(quizPartyMembers)
    .where(
      and(eq(quizPartyMembers.partyId, partyId), eq(quizPartyMembers.userId, userId)),
    )
    .limit(1);
  if (!m[0]) {
    return NextResponse.json({ detail: "Forbidden" }, { status: 403 });
  }

  const secret = process.env.QUIZ_PARTY_NOTIFY_SECRET;
  if (!secret?.trim()) {
    return NextResponse.json({ detail: "QUIZ_PARTY_NOTIFY_SECRET not set" }, { status: 503 });
  }

  const token = makeQuizPartyWsToken(userId, partyId, secret);
  const wsBase = getQuizPartyWsBaseUrl();
  const wsPath = `${wsBase}/api/quiz-party/ws/quiz-party/${partyId}`;

  return NextResponse.json({ token, wsUrl: wsPath });
}
