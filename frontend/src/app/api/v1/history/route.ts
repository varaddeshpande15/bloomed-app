import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { persistClerkUser } from "@/actions/sync-user";
import { roadmaps, savedRoadmaps } from "@/db/schema";
import { db } from "@/lib/db";
import { resolveClerkUserFromRequest } from "@/lib/clerk-resolve-request-user";
import type { RoadmapHistoryItem } from "@/lib/types/history";

/**
 * GET — list saved roadmaps for the signed-in user (joined with `roadmap` metadata).
 */
export async function GET(request: Request) {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json(
      { ok: false, error: "DATABASE_URL is not configured", items: [] },
      { status: 503 },
    );
  }

  const clerkUser = await resolveClerkUserFromRequest(request);
  if (!clerkUser) {
    return NextResponse.json(
      { ok: false, error: "Not signed in", items: [] },
      { status: 401 },
    );
  }

  await persistClerkUser(clerkUser);
  const userId = clerkUser.id;

  const rows = await db
    .select({
      savedId: savedRoadmaps.id,
      roadmapId: roadmaps.id,
      title: roadmaps.title,
      createdAt: roadmaps.createdAt,
      views: roadmaps.views,
      visibility: roadmaps.visibility,
    })
    .from(savedRoadmaps)
    .innerJoin(roadmaps, eq(savedRoadmaps.roadmapId, roadmaps.id))
    .where(eq(savedRoadmaps.userId, userId))
    .orderBy(desc(roadmaps.createdAt));

  const items: RoadmapHistoryItem[] = rows.map((r) => ({
    savedId: r.savedId,
    roadmapId: r.roadmapId,
    title: r.title,
    createdAt:
      r.createdAt instanceof Date
        ? r.createdAt.toISOString()
        : String(r.createdAt),
    views: r.views,
    visibility: r.visibility,
  }));

  return NextResponse.json({ ok: true, items });
}
