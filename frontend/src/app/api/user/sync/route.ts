import { NextResponse } from "next/server";
import { persistClerkUser } from "@/actions/sync-user";
import { resolveClerkUserFromRequest } from "@/lib/clerk-resolve-request-user";

/**
 * POST — upsert current Clerk user into Supabase `User` table.
 * Requires session (cookie and/or Bearer token from `getToken()`).
 */
export async function POST(request: Request) {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 503 },
    );
  }

  try {
    const user = await resolveClerkUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
    }

    const row = await persistClerkUser(user);
    return NextResponse.json({
      ok: true,
      userId: row.id,
      email: row.email,
      name: row.name,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("POST /api/user/sync:", e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/** GET — same as POST (open in browser while logged in; may 401 if only Bearer path works). */
export async function GET(request: Request) {
  return POST(request);
}
