"use server";

import { auth } from "@clerk/nextjs/server";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { ensureAppUserFromClerk } from "@/actions/sync-user";
import { db } from "@/lib/db";
import { psychProfiles } from "@/db/schema";
import { mapTraitsFromPsychReport, type MappedTraits } from "@/lib/map-traits";

export type ChatMessageRow = {
  role: string;
  content: string;
  timestamp?: number;
};

export async function upsertPsychProfileHistory(
  fastapiSessionId: string,
  history: ChatMessageRow[],
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  await ensureAppUserFromClerk();

  const historyJson = JSON.stringify(history);
  const existingRows = await db
    .select()
    .from(psychProfiles)
    .where(eq(psychProfiles.fastapiSessionId, fastapiSessionId))
    .limit(1);
  const existing = existingRows[0];

  if (existing) {
    if (existing.userId !== userId) throw new Error("Forbidden");
    await db
      .update(psychProfiles)
      .set({ historyJson, updatedAt: new Date() })
      .where(eq(psychProfiles.id, existing.id));
    return existing.id;
  }

  const [row] = await db
    .insert(psychProfiles)
    .values({
      id: randomUUID(),
      userId,
      fastapiSessionId,
      historyJson,
    })
    .returning({ id: psychProfiles.id });
  if (!row?.id) {
    throw new Error("Failed to insert PsychProfile row");
  }
  return row.id;
}

export async function savePsychProfileReport(
  fastapiSessionId: string,
  report: Record<string, unknown>,
  history: ChatMessageRow[],
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  await ensureAppUserFromClerk();

  const reportJson = JSON.stringify(report);
  const historyJson = JSON.stringify(history);

  const existingRows = await db
    .select()
    .from(psychProfiles)
    .where(eq(psychProfiles.fastapiSessionId, fastapiSessionId))
    .limit(1);
  const existing = existingRows[0];

  if (existing && existing.userId !== userId) throw new Error("Forbidden");

  if (existing) {
    await db
      .update(psychProfiles)
      .set({
        reportJson,
        historyJson,
        updatedAt: new Date(),
      })
      .where(eq(psychProfiles.id, existing.id));
  } else {
    await db.insert(psychProfiles).values({
      id: randomUUID(),
      userId,
      fastapiSessionId,
      historyJson,
      reportJson,
    });
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");
}

export async function getLatestPsychologicalReportForUser() {
  const { userId } = await auth();
  if (!userId) return null;

  try {
    const rows = await db
      .select()
      .from(psychProfiles)
      .where(
        and(eq(psychProfiles.userId, userId), isNotNull(psychProfiles.reportJson)),
      )
      .orderBy(desc(psychProfiles.updatedAt))
      .limit(1);
    const row = rows[0];
    if (!row?.reportJson) return null;
    try {
      return {
        id: row.id,
        fastapiSessionId: row.fastapiSessionId,
        updatedAt: row.updatedAt,
        report: JSON.parse(row.reportJson) as Record<string, unknown>,
      };
    } catch {
      return null;
    }
  } catch (e) {
    // e.g. relation "PsychProfile" does not exist — run supabase/schema.sql (PsychProfile section)
    console.error("getLatestPsychologicalReportForUser:", e);
    return null;
  }
}

export async function getMappedTraitsForUser(): Promise<{
  mapped: MappedTraits;
  updatedAt: Date | null;
} | null> {
  const latest = await getLatestPsychologicalReportForUser();
  if (!latest?.report) return null;
  const mapped = mapTraitsFromPsychReport(latest.report);
  if (!mapped) return null;
  return { mapped, updatedAt: latest.updatedAt ?? null };
}
