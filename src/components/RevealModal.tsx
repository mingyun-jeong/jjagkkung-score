"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Ranked } from "@/lib/ranking";
import { TEAM_BY_ID } from "@/lib/teams";
import { PrizeBadge } from "./PrizeBadge";
import { useRevealAudio, RevealStage } from "@/lib/useRevealAudio";

type Props = {
  open: boolean;
  onClose: () => void;
  rankedTop: Ranked[]; // sorted asc by rank
};

const STAGE_ORDER: RevealStage[] = [
  "countdown",
  "reveal-3",
  "reveal-2",
  "reveal-1",
  "celebrate",
  "done",
];

export function RevealModal({ open, onClose, rankedTop }: Props) {
  const [stage, setStage] = useState<RevealStage>("idle");
  const [count, setCount] = useState(3);

  useRevealAudio(stage);

  useEffect(() => {
    if (!open) {
      setStage("idle");
      setCount(3);
      return;
    }
    setStage("countdown");
    setCount(3);
  }, [open]);

  // countdown ticker
  useEffect(() => {
    if (stage !== "countdown") return;
    if (count <= 0) {
      setStage("reveal-3");
      return;
    }
    const t = setTimeout(() => setCount((c) => c - 1), 900);
    return () => clearTimeout(t);
  }, [stage, count]);

  // confetti per stage + mark "revealed" when celebrate hits
  useEffect(() => {
    if (!open) return;
    if (stage === "reveal-3") fireConfetti(3);
    else if (stage === "reveal-2") fireConfetti(2);
    else if (stage === "reveal-1") fireConfetti(1);
    else if (stage === "celebrate") {
      fireSustainedConfetti();
      // broadcast: dashboard now allowed to show leaderboard + scores
      fetch("/api/reveal", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ revealed: true }),
      }).catch(() => {
        /* best-effort */
      });
    }
  }, [stage, open]);

  const goNext = useCallback(() => {
    const idx = STAGE_ORDER.indexOf(stage);
    const next = STAGE_ORDER[idx + 1];
    if (next) setStage(next);
  }, [stage]);

  const restart = useCallback(() => {
    setStage("countdown");
    setCount(3);
  }, []);

  // map ranks to teams
  const byRank = (rank: 1 | 2 | 3) =>
    rankedTop.find((r) => r.rank === rank) ?? null;
  const first = byRank(1);
  const second = byRank(2);
  const third = byRank(3);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 bg-[#0b1020]/95 backdrop-blur-sm flex flex-col items-center justify-center px-4 sm:px-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* top bar */}
          <div className="absolute top-4 right-4 flex gap-2">
            <button
              type="button"
              onClick={restart}
              className="min-h-[40px] px-3 rounded-xl bg-[#1f2647] text-sm font-semibold text-[#f5f7ff] hover:bg-[#2a3358]"
            >
              🔁 다시 보기
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] px-3 rounded-xl bg-[#1f2647] text-sm font-semibold text-[#f5f7ff] hover:bg-[#2a3358]"
            >
              닫기
            </button>
          </div>

          {/* progress dots */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 flex gap-2">
            {(["reveal-3", "reveal-2", "reveal-1"] as const).map((s) => {
              const idx = STAGE_ORDER.indexOf(stage);
              const sidx = STAGE_ORDER.indexOf(s);
              const filled = idx >= sidx;
              return (
                <div
                  key={s}
                  className={[
                    "h-2 w-2 rounded-full transition-colors",
                    filled ? "bg-[#ffd66b]" : "bg-[#2a3358]",
                  ].join(" ")}
                />
              );
            })}
          </div>

          {/* stage content */}
          {stage === "countdown" && (
            <Countdown value={Math.max(count, 1)} />
          )}

          {stage === "reveal-3" && third && (
            <RankCard rank={3} ranked={third} onNext={goNext} />
          )}
          {stage === "reveal-2" && second && (
            <RankCard rank={2} ranked={second} onNext={goNext} />
          )}
          {(stage === "reveal-1" || stage === "celebrate" || stage === "done") &&
            first && (
              <RankCard
                rank={1}
                ranked={first}
                onNext={stage === "reveal-1" ? goNext : undefined}
              />
            )}

          {/* edge cases */}
          {stage === "reveal-3" && !third && (
            <Empty message="3위 데이터가 없습니다." onClose={onClose} />
          )}
          {stage === "reveal-2" && !second && (
            <Empty message="2위 데이터가 없습니다." onClose={onClose} />
          )}
          {(stage === "reveal-1" || stage === "celebrate") && !first && (
            <Empty message="1위 데이터가 없습니다." onClose={onClose} />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Countdown({ value }: { value: number }) {
  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-sm tracking-[0.4em] text-[#a8b1d6] uppercase">
        순위 발표를 시작합니다
      </p>
      <motion.div
        key={value}
        initial={{ scale: 1.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="text-[160px] sm:text-[220px] leading-none font-black tabular-nums text-[#ffd66b] drop-shadow-[0_0_40px_rgba(255,214,107,0.5)]"
      >
        {value}
      </motion.div>
    </div>
  );
}

function Empty({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  return (
    <div className="text-center">
      <p className="text-lg text-[#a8b1d6] mb-4">{message}</p>
      <button
        type="button"
        onClick={onClose}
        className="min-h-[44px] px-5 rounded-xl bg-[#1f2647] font-semibold"
      >
        닫기
      </button>
    </div>
  );
}

function RankCard({
  rank,
  ranked,
  onNext,
}: {
  rank: 1 | 2 | 3;
  ranked: import("@/lib/ranking").Ranked;
  onNext?: () => void;
}) {
  const team = TEAM_BY_ID.get(ranked.teamId);
  if (!team) return null;

  const isWinner = rank === 1;

  const RANK_LABEL = { 1: "제1위", 2: "제2위", 3: "제3위" }[rank];
  const RANK_EMOJI = { 1: "🏆", 2: "🥈", 3: "🥉" }[rank];
  const widthMax =
    rank === 1
      ? "max-w-[560px]"
      : rank === 2
        ? "max-w-[460px]"
        : "max-w-[380px]";
  const rankNumberColor =
    rank === 1
      ? "from-[#ffd66b] to-[#e8a93c]"
      : rank === 2
        ? "from-[#e2e6f0] to-[#9ba3b8]"
        : "from-[#e0975a] to-[#a8632f]";
  const glow =
    rank === 1
      ? "shadow-[0_0_120px_rgba(255,214,107,0.5),0_0_240px_rgba(255,214,107,0.25),inset_0_1px_0_rgba(255,255,255,0.08)] border-[#ffd66b]/40"
      : rank === 2
        ? "shadow-[0_0_40px_rgba(226,230,240,0.3)] border-[#e2e6f0]/30"
        : "shadow-[0_0_40px_rgba(224,151,90,0.3)] border-[#e0975a]/30";
  const scoreSize =
    rank === 1
      ? "text-[88px] sm:text-[140px] md:text-[160px]"
      : rank === 2
        ? "text-[64px] sm:text-[96px]"
        : "text-[48px] sm:text-[64px]";
  const emojiSize =
    rank === 1
      ? "text-[88px] md:text-[120px]"
      : rank === 2
        ? "text-[64px] md:text-[80px]"
        : "text-[48px] md:text-[56px]";

  const containerVariants = isWinner
    ? {
        initial: { opacity: 0, scale: 0.5 },
        animate: { opacity: 1, scale: 1 },
        transition: {
          type: "spring" as const,
          stiffness: 200,
          damping: 18,
          mass: 1,
        },
      }
    : {
        initial: { opacity: 0, y: 80, scale: 0.95 },
        animate: { opacity: 1, y: 0, scale: 1 },
        transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
      };

  return (
    <motion.div
      key={`rank-${rank}`}
      {...containerVariants}
      className={[
        "relative w-full rounded-[32px] border bg-gradient-to-br from-[#1f2647] via-[#151b33] to-[#1f2647] px-6 sm:px-10 py-8 sm:py-12 flex flex-col items-center gap-4 sm:gap-6 overflow-hidden",
        widthMax,
        glow,
      ].join(" ")}
    >
      <p className="text-xs sm:text-sm font-bold tracking-[0.4em] text-[#a8b1d6] uppercase">
        {RANK_LABEL}
      </p>
      <div className={["leading-none", emojiSize].join(" ")} aria-hidden>
        {RANK_EMOJI}
      </div>
      <div
        className={[
          "text-3xl sm:text-5xl font-black bg-clip-text text-transparent tracking-tight tabular-nums bg-gradient-to-b",
          rankNumberColor,
        ].join(" ")}
      >
        {team.name}
      </div>
      <div className="text-lg sm:text-2xl font-medium text-[#f5f7ff]/90">
        {team.members.join(" · ")}
      </div>

      <div
        className={[
          "font-black tabular-nums leading-none text-[#f5f7ff] drop-shadow-[0_4px_24px_rgba(255,214,107,0.3)]",
          scoreSize,
        ].join(" ")}
      >
        {ranked.total.toFixed(1)}
      </div>
      <div className="h-px w-32 bg-gradient-to-r from-transparent via-white/40 to-transparent" />

      <PrizeBadge rank={rank} />

      {onNext && (
        <button
          type="button"
          onClick={onNext}
          className={[
            "mt-3 min-h-[48px] px-6 rounded-2xl font-extrabold text-base transition-all",
            isWinner
              ? "bg-gradient-to-r from-[#ffd66b] to-[#e8a93c] text-[#0b1020]"
              : "bg-[#1f2647] text-[#f5f7ff] hover:bg-[#2a3358]",
          ].join(" ")}
        >
          {rank === 1 ? "🎉 우승 축하!" : "다음 순위 →"}
        </button>
      )}
    </motion.div>
  );
}

// ──────────── confetti helpers (lazy import canvas-confetti) ────────────

type ConfettiFn = typeof import("canvas-confetti");
let confettiPromise: Promise<ConfettiFn> | null = null;
function getConfetti(): Promise<ConfettiFn> {
  if (!confettiPromise) {
    confettiPromise = import("canvas-confetti").then(
      (m) => (m as unknown as { default: ConfettiFn }).default ?? (m as unknown as ConfettiFn),
    );
  }
  return confettiPromise;
}

async function fireConfetti(rank: 1 | 2 | 3) {
  const confetti = await getConfetti();
  if (rank === 3) {
    confetti({
      particleCount: 60,
      spread: 60,
      startVelocity: 35,
      origin: { y: 0.7 },
      colors: ["#e0975a", "#a8632f", "#ffd66b"],
      ticks: 120,
    });
  } else if (rank === 2) {
    confetti({
      particleCount: 120,
      spread: 80,
      startVelocity: 45,
      origin: { y: 0.65 },
      colors: ["#e2e6f0", "#9ba3b8", "#f5f7ff"],
      ticks: 180,
    });
  } else {
    const fire = (originX: number) =>
      confetti({
        particleCount: 100,
        angle: originX < 0.5 ? 60 : 120,
        spread: 55,
        startVelocity: 55,
        origin: { x: originX, y: 0.8 },
        colors: ["#ffd66b", "#e8a93c", "#f5f7ff", "#ff4d9d"],
        ticks: 240,
        shapes: ["square", "circle"],
      });
    fire(0.1);
    fire(0.9);
    setTimeout(() => fire(0.5), 200);
  }
}

async function fireSustainedConfetti() {
  const confetti = await getConfetti();
  const start = Date.now();
  const id = setInterval(() => {
    if (Date.now() - start > 5000) {
      clearInterval(id);
      return;
    }
    confetti({
      particleCount: 50,
      spread: 70,
      startVelocity: 45,
      origin: { x: Math.random(), y: Math.random() * 0.3 + 0.2 },
      colors: ["#ffd66b", "#e8a93c", "#f5f7ff", "#ff4d9d"],
      ticks: 200,
    });
  }, 700);
}
