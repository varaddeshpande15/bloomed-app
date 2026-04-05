import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Next.js 16+ uses `src/proxy.ts` (not `middleware.ts`) for the edge entry.
 * See: https://nextjs.org/docs/messages/middleware-to-proxy
 */
const isPublicRoute = createRouteMatcher([
  "/",
  "/home(.*)",
  "/history(.*)",
  "/explore",
  "/starter",
  "/roadmap(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/health",
  "/api/webhook(.*)",
  "/api/og/(.*)",
  "/api/v1/roadmap(.*)",
  "/api/v1/details(.*)",
  "/api/v1/roadmaps(.*)",
  "/api/v1/orilley(.*)",
  "/api/v1/history(.*)",
  "/api/user/sync(.*)",
]);

const clerkAuth = clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export default function proxy(...args: Parameters<typeof clerkAuth>) {
  if (
    !process.env.CLERK_SECRET_KEY?.trim() ||
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim()
  ) {
    return NextResponse.next();
  }
  return clerkAuth(...args);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
