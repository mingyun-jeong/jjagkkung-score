"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DashboardState } from "./types";

const POLL_INTERVAL_MS = 1000;

export type StreamStatus = "connecting" | "open" | "closed";

/**
 * Polls /api/snapshot at 1Hz. (Was SSE; switched to polling because reverse
 * proxies and HMR kept breaking long-lived connections.) `refresh()` triggers
 * an immediate fetch outside the interval.
 */
export function useDashboardStream(): {
  state: DashboardState | null;
  status: StreamStatus;
  refresh: () => void;
} {
  const [state, setState] = useState<DashboardState | null>(null);
  const [status, setStatus] = useState<StreamStatus>("connecting");
  // Guard against overlapping requests if the server is slow.
  const inFlightRef = useRef(false);

  const fetchOnce = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const res = await fetch("/api/snapshot", { cache: "no-store" });
      if (!res.ok) {
        setStatus("closed");
        return;
      }
      const data = (await res.json()) as DashboardState;
      setState(data);
      setStatus("open");
    } catch {
      setStatus("closed");
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    void fetchOnce();
    const id = setInterval(() => void fetchOnce(), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchOnce]);

  return { state, status, refresh: fetchOnce };
}
