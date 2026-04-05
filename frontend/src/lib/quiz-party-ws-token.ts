import { createHmac } from "node:crypto";

/** Must match `verify_ws_token_simple` in `backend_unified/routers/quiz_party_ws.py`. */
export function makeQuizPartyWsToken(
  userId: string,
  partyId: string,
  secret: string,
): string {
  const exp = Math.floor(Date.now() / 1000) + 30 * 60;
  const msg = `${userId}|${partyId}|${exp}`;
  const sig = createHmac("sha256", secret).update(msg).digest("hex");
  const raw = `${msg}|${sig}`;
  return Buffer.from(raw, "utf8").toString("base64url");
}

export function getQuizPartyWsBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_QUIZ_WS_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const http =
    process.env.NEXT_PUBLIC_BLOOM_API_URL?.trim() ||
    process.env.BLOOM_API_URL?.trim() ||
    "";
  if (!http) return "";
  return http.replace(/^https?/, (m) => (m === "https" ? "wss" : "ws")).replace(/\/$/, "");
}
