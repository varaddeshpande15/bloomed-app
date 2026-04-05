import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

const base = process.env.BLOOM_API_URL ?? process.env.NEXT_PUBLIC_BLOOM_API_URL;

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }
  if (!base) {
    return NextResponse.json(
      { detail: "BLOOM_API_URL is not configured" },
      { status: 500 },
    );
  }
  const body = await req.json().catch(() => ({}));
  const incomingUid = (body as { user_id?: string }).user_id;
  if (incomingUid && incomingUid !== userId) {
    return NextResponse.json({ detail: "user_id mismatch" }, { status: 403 });
  }
  const r = await fetch(`${base.replace(/\/$/, "")}/api/session/next`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId }),
  });
  const data = await r.json().catch(() => ({}));
  return NextResponse.json(data, { status: r.status });
}
