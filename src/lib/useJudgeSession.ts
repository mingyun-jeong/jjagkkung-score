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
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Judge;
        setJudge(parsed);
      }
    } catch {
      // ignore corrupt storage
    } finally {
      setHydrated(true);
    }
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
