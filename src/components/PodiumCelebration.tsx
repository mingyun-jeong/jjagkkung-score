"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Team } from "@/lib/teams";

type Props = {
  open: boolean;
  rank: 1 | 2 | 3;
  team: Team;
  total: number;
  onClose: () => void;
};

const RANK_EMOJI = { 1: "🏆", 2: "🥈", 3: "🥉" } as const;
const RANK_LABEL = { 1: "1위", 2: "2위", 3: "3위" } as const;
// `text-transparent` is required for bg-clip-text to expose the gradient.
const RANK_GRADIENT = {
  1: "from-[#ffd66b] to-[#e8a93c]",
  2: "from-[#e2e6f0] to-[#9ba3b8]",
  3: "from-[#e0975a] to-[#a8632f]",
} as const;
const RANK_GLOW = {
  1: "drop-shadow-[0_0_40px_rgba(255,214,107,0.55)]",
  2: "drop-shadow-[0_0_32px_rgba(226,230,240,0.45)]",
  3: "drop-shadow-[0_0_28px_rgba(224,151,90,0.45)]",
} as const;

const AUTO_DISMISS_MS = 6000;

export function PodiumCelebration({
  open,
  rank,
  team,
  total,
  onClose,
}: Props) {
  // Keep a ref to onClose so SSE-driven re-renders (which give us a fresh
  // inline arrow each time) don't reset the auto-dismiss timer below.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    fireConfetti(rank);
    const t = setTimeout(() => onCloseRef.current(), AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [open, rank]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-label={`${RANK_LABEL[rank]} 공개`}
          className="fixed inset-0 z-50 bg-[#0b1020]/92 backdrop-blur-sm flex items-center justify-center px-4 cursor-pointer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.55, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 20 }}
            className="flex flex-col items-center gap-3 sm:gap-5 text-center"
          >
            <div className="text-6xl sm:text-8xl leading-none" aria-hidden>
              {RANK_EMOJI[rank]}
            </div>
            <div
              className={[
                "font-black leading-none tabular-nums bg-clip-text text-transparent bg-gradient-to-b",
                "text-[140px] sm:text-[220px] md:text-[280px]",
                RANK_GRADIENT[rank],
                RANK_GLOW[rank],
              ].join(" ")}
            >
              {RANK_LABEL[rank]}
            </div>
            <div className="text-3xl sm:text-5xl font-extrabold text-[#f5f7ff]">
              {team.name}
            </div>
            <div className="text-base sm:text-2xl font-medium text-[#a8b1d6]">
              {team.members.join(" · ")}
            </div>
            <div className="mt-2 text-4xl sm:text-6xl font-black tabular-nums text-[#f5f7ff] drop-shadow-[0_4px_24px_rgba(255,214,107,0.3)]">
              {total.toFixed(1)}
              <span className="text-2xl sm:text-3xl font-bold text-[#a8b1d6] ml-1">
                점
              </span>
            </div>
            <div className="mt-4 text-[11px] uppercase tracking-[0.3em] text-[#6b739a]">
              화면을 탭하면 닫힙니다
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── confetti (lazy import canvas-confetti) ───
type ConfettiFn = typeof import("canvas-confetti");
let confettiPromise: Promise<ConfettiFn> | null = null;
function getConfetti(): Promise<ConfettiFn> {
  if (!confettiPromise) {
    confettiPromise = import("canvas-confetti").then(
      (m) =>
        (m as unknown as { default: ConfettiFn }).default ??
        (m as unknown as ConfettiFn),
    );
  }
  return confettiPromise;
}

async function fireConfetti(rank: 1 | 2 | 3) {
  const confetti = await getConfetti();
  if (rank === 3) {
    confetti({
      particleCount: 80,
      spread: 70,
      startVelocity: 38,
      origin: { y: 0.7 },
      colors: ["#e0975a", "#a8632f", "#ffd66b"],
      ticks: 140,
    });
  } else if (rank === 2) {
    confetti({
      particleCount: 140,
      spread: 85,
      startVelocity: 46,
      origin: { y: 0.65 },
      colors: ["#e2e6f0", "#9ba3b8", "#f5f7ff"],
      ticks: 180,
    });
  } else {
    const fire = (originX: number) =>
      confetti({
        particleCount: 120,
        angle: originX < 0.5 ? 60 : 120,
        spread: 60,
        startVelocity: 58,
        origin: { x: originX, y: 0.8 },
        colors: ["#ffd66b", "#e8a93c", "#f5f7ff", "#ff4d9d"],
        ticks: 260,
        shapes: ["square", "circle"],
      });
    fire(0.1);
    fire(0.9);
    setTimeout(() => fire(0.5), 200);
    // sustained burst across the top for the winner
    const start = Date.now();
    const id = setInterval(() => {
      if (Date.now() - start > 3500) return clearInterval(id);
      confetti({
        particleCount: 40,
        spread: 75,
        startVelocity: 45,
        origin: { x: Math.random(), y: Math.random() * 0.3 + 0.15 },
        colors: ["#ffd66b", "#e8a93c", "#f5f7ff", "#ff4d9d"],
        ticks: 200,
      });
    }, 600);
  }
}
