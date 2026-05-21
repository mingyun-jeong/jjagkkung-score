"use client";

import { useCallback, useEffect, useState } from "react";
import { DashboardState } from "./types";

export type StreamStatus = "connecting" | "open" | "closed";

export function useDashboardStream(): {
  state: DashboardState | null;
  status: StreamStatus;
  refresh: () => void;
} {
  const [state, setState] = useState<DashboardState | null>(null);
  const [status, setStatus] = useState<StreamStatus>("connecting");
  // Bump to force the SSE effect to teardown + reconnect, which makes the
  // server re-run ensureHydrated (fresh team_averages from DB) and re-emit
  // its snapshot.
  const [nonce, setNonce] = useState(0);
  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let es: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const connect = () => {
      es = new EventSource("/api/stream");
      setStatus("connecting");

      es.onopen = () => {
        if (cancelled) return;
        setStatus("open");
      };
      es.onmessage = (ev) => {
        if (cancelled) return;
        try {
          const parsed = JSON.parse(ev.data) as {
            type: "snapshot" | "update";
            state: DashboardState;
          };
          if (parsed.state) setState(parsed.state);
        } catch {
          /* ignore malformed frames */
        }
      };
      es.onerror = () => {
        if (cancelled) return;
        setStatus("closed");
        es?.close();
        retryTimer = setTimeout(connect, 1500);
      };
    };

    connect();
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      es?.close();
    };
  }, [nonce]);

  return { state, status, refresh };
}
