import { NextResponse } from "next/server";
import { persistClerkUser } from "@/actions/sync-user";
import { db } from "@/lib/db";
import { roadmaps, savedRoadmaps } from "@/db/schema";
import { resolveClerkUserFromRequest } from "@/lib/clerk-resolve-request-user";
import type { Node } from "@/lib/shared/types/common";

function isNodeArray(value: unknown): value is Node[] {
  return Array.isArray(value) && value.length > 0;
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "23505"
  );
}

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const titleRaw =
    typeof body === "object" &&
    body !== null &&
    "title" in body &&
    typeof (body as { title: unknown }).title === "string"
      ? (body as { title: string }).title.trim()
      : "";
  const tree = (body as { tree?: unknown }).tree;

  if (!titleRaw) {
    return NextResponse.json(
      { ok: false, error: "title is required" },
      { status: 400 },
    );
  }

  if (!isNodeArray(tree)) {
    return NextResponse.json(
      { ok: false, error: "tree must be a non-empty array" },
      { status: 400 },
    );
  }

  const clerkUser = await resolveClerkUserFromRequest(request);
  if (!clerkUser) {
    return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  }

  await persistClerkUser(clerkUser);
  const userId = clerkUser.id;

  const content = JSON.stringify(tree);
  const baseTitle = titleRaw.slice(0, 500);

  let title = baseTitle;
  const maxAttempts = 8;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const result = await db.transaction(async (tx) => {
        const [row] = await tx
          .insert(roadmaps)
          .values({
            userId,
            title,
            content,
          })
          .returning();

        await tx.insert(savedRoadmaps).values({
          userId,
          roadmapId: row.id,
          title: row.title,
        });

        return row;
      });

      return NextResponse.json({
        ok: true,
        roadmapId: result.id,
        title: result.title,
        userId,
      });
    } catch (err) {
      if (isUniqueViolation(err) && attempt < maxAttempts - 1) {
        title =
          attempt === 0
            ? `${baseTitle} (${new Date().toISOString().slice(0, 10)})`
            : `${baseTitle} (${attempt + 1})`;
        continue;
      }
      console.error("POST /api/v1/roadmap/save:", err);
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
  }

  return NextResponse.json(
    { ok: false, error: "Could not save: duplicate title" },
    { status: 409 },
  );
}
