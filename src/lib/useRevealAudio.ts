"use client";

import { useEffect, useRef } from "react";

export type RevealStage =
  | "idle"
  | "countdown"
  | "reveal-3"
  | "reveal-2"
  | "reveal-1"
  | "celebrate"
  | "done";

const RUNNER_UP_SRC = "/bgm/runner-up.mp3";
const WINNER_SRC = "/bgm/winner.mp3";

/**
 * Plays runner-up BGM for 3rd/2nd reveal, crossfades to winner BGM for 1st.
 * Gracefully no-ops if audio files are missing or playback is blocked.
 */
export function useRevealAudio(stage: RevealStage) {
  const runnerUpRef = useRef<HTMLAudioElement | null>(null);
  const winnerRef = useRef<HTMLAudioElement | null>(null);

  // lazy init audio elements once
  useEffect(() => {
    if (typeof window === "undefined") return;
    const a = new Audio(RUNNER_UP_SRC);
    a.loop = true;
    a.volume = 0;
    a.preload = "auto";
    runnerUpRef.current = a;

    const b = new Audio(WINNER_SRC);
    b.loop = true;
    b.volume = 0;
    b.preload = "auto";
    winnerRef.current = b;

    return () => {
      a.pause();
      a.src = "";
      b.pause();
      b.src = "";
      runnerUpRef.current = null;
      winnerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const runner = runnerUpRef.current;
    const winner = winnerRef.current;
    if (!runner || !winner) return;

    const fade = (
      el: HTMLAudioElement,
      target: number,
      durationMs: number,
    ) => {
      const start = el.volume;
      const startTime = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - startTime) / durationMs);
        el.volume = Math.max(0, Math.min(1, start + (target - start) * t));
        if (t < 1) requestAnimationFrame(step);
        else if (target === 0) el.pause();
      };
      const tryPlay = () => {
        if (target > 0 && el.paused) {
          el.play().catch(() => {
            /* autoplay blocked; silent fail */
          });
        }
        requestAnimationFrame(step);
      };
      tryPlay();
    };

    switch (stage) {
      case "countdown":
        fade(runner, 0.6, 800);
        fade(winner, 0, 0);
        break;
      case "reveal-3":
      case "reveal-2":
        fade(runner, 0.6, 200);
        fade(winner, 0, 0);
        break;
      case "reveal-1":
      case "celebrate":
        fade(runner, 0, 600);
        fade(winner, 0.7, 600);
        break;
      case "done":
      case "idle":
        fade(runner, 0, 600);
        fade(winner, 0, 600);
        break;
    }
  }, [stage]);
}
