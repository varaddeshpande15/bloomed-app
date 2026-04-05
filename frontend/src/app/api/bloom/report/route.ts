import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const base = process.env.BLOOM_API_URL ?? process.env.NEXT_PUBLIC_BLOOM_API_URL;

/** Proxies GET /api/report/{user_id} using the signed-in user only. */
export async function GET() {
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
  const url = `${base.replace(/\/$/, "")}/api/report/${encodeURIComponent(userId)}`;
  const r = await fetch(url, { method: "GET" });
  const data = await r.json().catch(() => ({}));
  return NextResponse.json(data, { status: r.status });
}
