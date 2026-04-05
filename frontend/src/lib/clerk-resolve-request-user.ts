import { verifyToken } from "@clerk/backend";
import { clerkClient, currentUser } from "@clerk/nextjs/server";

type ClerkUser = NonNullable<Awaited<ReturnType<typeof currentUser>>>;

/**
 * Resolve the signed-in Clerk user for Route Handlers.
 * Prefer `currentUser()`; fall back to `Authorization: Bearer` + `verifyToken` when
 * cookie-based auth is not visible to `auth()` (Next.js 16 + proxy).
 */
export async function resolveClerkUserFromRequest(
  request: Request,
): Promise<ClerkUser | null> {
  const fromSession = await currentUser();
  if (fromSession) {
    return fromSession;
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "")?.trim();
  const secretKey = process.env.CLERK_SECRET_KEY?.trim();
  if (!token || !secretKey) {
    return null;
  }

  try {
    const payload = await verifyToken(token, { secretKey });
    const userId = typeof payload.sub === "string" ? payload.sub : null;
    if (!userId) {
      return null;
    }
    return (await clerkClient()).users.getUser(userId);
  } catch {
    return null;
  }
}
