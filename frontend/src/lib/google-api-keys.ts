/**
 * Single fallback for Google-backed APIs (Gemini, YouTube Data API v3) when env vars are unset.
 * Prefer setting GOOGLE_API_KEY or YOUTUBE_API_KEY in .env.local in production.
 */
export const GOOGLE_API_KEY_FALLBACK =
  "AIzaSyCJAi1G34tGSLivpCZ8kGVhIUOYrmpK9eg";

/** Gemini / Google Generative AI — optional request key overrides env. */
export function resolveGeminiApiKey(requestApiKey?: string | null): string {
  const fromRequest = requestApiKey?.trim();
  if (fromRequest) return fromRequest;
  return (
    process.env.GOOGLE_API_KEY?.trim() || GOOGLE_API_KEY_FALLBACK
  );
}

/** YouTube Data API v3 — dedicated env first, then shared Google key, then fallback. */
export function resolveYoutubeApiKey(): string {
  return (
    process.env.YOUTUBE_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    GOOGLE_API_KEY_FALLBACK
  );
}
