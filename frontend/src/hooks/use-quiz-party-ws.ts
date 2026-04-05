"use client";

import * as React from "react";

/**
 * Connects to FastAPI quiz-party WebSocket; on `refresh` messages refetches room state.
 * Falls back to polling in the parent when the token endpoint is unavailable.
 */
export function useQuizPartyWs(
  partyId: string,
  onRefresh: () => void,
  enabled = true,
) {
  const cbRef = React.useRef(onRefresh);
  cbRef.current = onRefresh;

  React.useEffect(() => {
    if (!enabled || !partyId) return;
    let ws: WebSocket | null = null;
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch(
          `/api/quiz-party/ws-token?partyId=${encodeURIComponent(partyId)}`,
        );
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          token?: string;
          wsUrl?: string;
        };
        if (!data.token || !data.wsUrl) return;
        const url = `${data.wsUrl}?token=${encodeURIComponent(data.token)}`;
        ws = new WebSocket(url);
        ws.onmessage = () => {
          cbRef.current();
        };
      } catch {
        /* non-fatal — polling continues */
      }
    })();

    return () => {
      cancelled = true;
      ws?.close();
    };
  }, [partyId, enabled]);
}
