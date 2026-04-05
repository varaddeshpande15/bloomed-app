"use server";

import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { isClerkConfigured } from "@/lib/clerk-config";
import {
  clerkUserToUpsertInput,
  type ClerkUserLike,
  type UpsertAppUserInput,
} from "@/lib/clerk-user-mapper";

/** Ensures a `User` row exists for the current Clerk session (FK targets). */
export async function ensureAppUserFromClerk() {
  const user = await currentUser();
  if (!user) return;
  await upsertAppUser(clerkUserToUpsertInput(user));
}

/**
 * Ensures `User` exists for FK inserts. Uses Clerk Backend API when `currentUser()` is null
 * (can happen in Server Actions while `auth().userId` is still set).
 */
export async function ensureAppUserForQuizParty(): Promise<{
  userId: string;
  displayName: string;
  imageUrl: string | null;
} | null> {
  const { userId } = await auth();
  if (!userId) return null;

  let u = await currentUser();
  if (!u) {
    try {
      u = await (await clerkClient()).users.getUser(userId);
    } catch (e) {
      console.error("ensureAppUserForQuizParty: users.getUser failed", e);
      return null;
    }
  }

  await upsertAppUser(clerkUserToUpsertInput(u as ClerkUserLike));

  const display =
    u.firstName ||
    u.username ||
    u.emailAddresses?.[0]?.emailAddress?.split("@")[0] ||
    "Player";

  return {
    userId,
    displayName: display,
    imageUrl: u.imageUrl ?? null,
  };
}

/** Clerk `currentUser()` return type for persistence. */
type ClerkUser = NonNullable<Awaited<ReturnType<typeof currentUser>>>;

/** Insert or update `User` by Clerk id. Does not change `credits` on update. */
export async function upsertAppUser(input: UpsertAppUserInput) {
  await db
    .insert(users)
    .values({
      id: input.id,
      name: input.name,
      email: input.email,
      imageUrl: input.imageUrl ?? undefined,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        name: input.name,
        email: input.email,
        imageUrl: input.imageUrl ?? undefined,
      },
    });
}

/** Persist Clerk user to Supabase and return the row. */
export async function persistClerkUser(user: ClerkUser) {
  const input = clerkUserToUpsertInput(user);
  await upsertAppUser(input);
  const row = await db.query.users.findFirst({
    where: eq(users.id, user.id),
  });
  if (!row) {
    throw new Error(`User row missing after upsert: ${user.id}`);
  }
  return row;
}

/**
 * Keeps Postgres `User` in sync with the current Clerk session.
 * Cached once per request via React `cache`.
 */
export const syncClerkUserToDb = cache(async (): Promise<void> => {
  if (!isClerkConfigured()) return;
  if (!process.env.DATABASE_URL?.trim()) return;

  try {
    const user = await currentUser();
    if (!user) return;
    await persistClerkUser(user);
  } catch (e) {
    console.error("syncClerkUserToDb:", e);
  }
});
