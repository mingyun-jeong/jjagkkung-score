"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Ranked } from "@/lib/ranking";
import { TEAM_BY_ID } from "@/lib/teams";
import { SCORE_TOTAL_MAX } from "@/lib/types";

type Props = {
  rows: Ranked[];
  myTeamId: number | null;
};

const RANK_EMOJI: Record<number, string> = {
  1: "🥇",
  2: "🥈",
  3: "🥉",
};

const RANK_COLOR: Record<number, string> = {
  1: "text-[#ffd66b] drop-shadow-[0_0_12px_rgba(255,214,107,0.5)]",
  2: "text-[#e2e6f0]",
  3: "text-[#e0975a]",
};

export function Leaderboard({ rows, myTeamId }: Props) {
  return (
    <div className="rounded-[24px] bg-[#151b33] border border-[#2a3358] p-4 sm:p-5">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">
          LEADERBOARD
        </h2>
        <span className="text-[11px] uppercase tracking-[0.25em] text-[#6b739a]">
          실시간 평균
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {rows.map((row) => {
            const team = TEAM_BY_ID.get(row.teamId);
            if (!team) return null;
            const isMy = myTeamId === team.id;
            const pct = Math.min(100, (row.total / SCORE_TOTAL_MAX) * 100);
            const emoji = RANK_EMOJI[row.rank];
            const rankColor =
              RANK_COLOR[row.rank] ?? "text-[#a8b1d6]";

            return (
              <motion.div
                key={team.id}
                layout
                layoutId={`leader-${team.id}`}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                className={[
                  "flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 rounded-2xl border",
                  isMy
                    ? "bg-[#1f2647] border-[#ff4d9d] shadow-[0_0_20px_rgba(255,77,157,0.2)]"
                    : "bg-[#0b1020]/40 border-[#2a3358]",
                ].join(" ")}
              >
                <div
                  className={[
                    "w-10 sm:w-14 text-2xl sm:text-3xl font-black tabular-nums leading-none text-center",
                    rankColor,
                  ].join(" ")}
                >
                  {row.rank || "-"}
                </div>
                {emoji ? (
                  <div className="text-2xl sm:text-3xl" aria-hidden>
                    {emoji}
                  </div>
                ) : (
                  <div className="w-6 sm:w-8" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg sm:text-xl font-extrabold">
                      {team.name}
                    </span>
                    {isMy && (
                      <span className="px-1.5 py-0.5 rounded-full bg-[#ff4d9d] text-[#f5f7ff] text-[10px] font-extrabold">
                        MY
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#a8b1d6] truncate">
                    {team.members.join(" · ")}
                  </div>
                </div>
                <div className="hidden sm:block flex-1 max-w-[200px] h-2 rounded-full bg-[#1f2647] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#5e72e4] via-[#11cdef] to-[#2dce89] transition-[width] duration-500 ease-out"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="text-2xl sm:text-3xl font-black tabular-nums text-[#f5f7ff] w-20 sm:w-24 text-right">
                  {row.total.toFixed(1)}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
