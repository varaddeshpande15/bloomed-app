/**
 * Push all connected WebSocket clients in a party to refetch state (via FastAPI fan-out).
 */
export async function notifyQuizPartySubscribers(partyId: string): Promise<void> {
  const base = process.env.BLOOM_API_URL ?? process.env.NEXT_PUBLIC_BLOOM_API_URL;
  const secret = process.env.QUIZ_PARTY_NOTIFY_SECRET;
  if (!base?.trim() || !secret?.trim()) return;
  try {
    await fetch(`${base.replace(/\/$/, "")}/api/quiz-party/notify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Notify-Secret": secret,
      },
      body: JSON.stringify({ party_id: partyId }),
    });
  } catch {
    /* non-fatal */
  }
}
