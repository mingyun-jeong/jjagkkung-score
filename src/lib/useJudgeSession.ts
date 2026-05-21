"use client";

import { useCallback, useEffect, useState } from "react";
import { Judge } from "./types";

const KEY = "jjagkkung.judge.v1";

export type JudgeSession = {
  judge: Judge | null;
  hydrated: boolean;
  login: (name: string) => Promise<Judge>;
  loginGuest: () => Promise<Judge>;
  logout: () => void;
};

export function useJudgeSession(): JudgeSession {
  const [judge, setJudge] = useState<Judge | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as Judge;
        // Validate against server — DB resets / stale sessions get cleared here.
        const res = await fetch(`/api/judges?id=${encodeURIComponent(parsed.id)}`);
        if (cancelled) return;
        if (res.ok) {
          const data = (await res.json()) as { judge: Judge };
          setJudge(data.judge);
        } else {
          localStorage.removeItem(KEY);
        }
      } catch {
        // ignore corrupt storage / network errors — treat as unauthenticated
      } finally {
        if (!cancelled) setHydrated(true);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (name: string) => {
    const res = await fetch("/api/judges", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error(`로그인 실패 (${res.status})`);
    const data = (await res.json()) as { judge: Judge };
    localStorage.setItem(KEY, JSON.stringify(data.judge));
    setJudge(data.judge);
    return data.judge;
  }, []);

  const loginGuest = useCallback(async () => {
    const res = await fetch("/api/judges", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ guest: true }),
    });
    if (!res.ok) throw new Error(`게스트 입장 실패 (${res.status})`);
    const data = (await res.json()) as { judge: Judge };
    localStorage.setItem(KEY, JSON.stringify(data.judge));
    setJudge(data.judge);
    return data.judge;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(KEY);
    setJudge(null);
  }, []);

  return { judge, hydrated, login, loginGuest, logout };
}
