"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef } from "react";

/**
 * After sign-in, explicitly upsert the user to Supabase (backup to root layout sync).
 * Sends the session JWT so `/api/user/sync` can authenticate even when cookie-based
 * `currentUser()` is empty in Route Handlers (Next.js 16 + proxy).
 */
export function ClerkUserSync() {
  const { isLoaded, userId, getToken } = useAuth();
  const ran = useRef(false);

  useEffect(() => {
    if (!isLoaded || !userId || ran.current) return;
    ran.current = true;

    void (async () => {
      let token: string | null = null;
      try {
        token = await getToken();
      } catch {
        token = null;
      }

      const headers: HeadersInit = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      try {
        const res = await fetch("/api/user/sync", {
          method: "POST",
          credentials: "same-origin",
          headers,
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          console.warn("ClerkUserSync:", res.status, body);
          return;
        }
        const body = await res.json();
        if (process.env.NODE_ENV === "development") {
          console.info("ClerkUserSync: user stored", body);
        }
      } catch (e) {
        console.warn("ClerkUserSync fetch failed", e);
      }
    })();
  }, [isLoaded, userId, getToken]);

  return null;
}
