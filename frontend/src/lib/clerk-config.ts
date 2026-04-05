/**
 * True when Clerk is enabled in the app.
 * Uses only `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` so the result matches on server **and**
 * client — `CLERK_SECRET_KEY` is not available in the browser and would make
 * `isClerkConfigured()` falsely `false` on the client while `true` on the server (hydration mismatch).
 */
export function isClerkConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim());
}
