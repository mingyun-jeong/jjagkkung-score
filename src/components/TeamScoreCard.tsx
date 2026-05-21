"use client";

import { motion } from "framer-motion";
import { Team } from "@/lib/teams";
import { SCORE_TOTAL_MAX, TeamAverage } from "@/lib/types";

type Props = {
  team: Team;
  average: TeamAverage;
  rank: number;
  isMyTeam: boolean;
};

const RANK_STYLE: Record<number, string> = {
  1: "border-[#ffd66b]/50 shadow-[0_0_20px_rgba(255,214,107,0.15)]",
  2: "border-[#e2e6f0]/40 shadow-[0_0_16px_rgba(226,230,240,0.12)]",
  3: "border-[#e0975a]/40 shadow-[0_0_16px_rgba(224,151,90,0.12)]",
};

const RANK_EMOJI: Record<number, string> = {
  1: "🥇",
  2: "🥈",
  3: "🥉",
};

export function TeamScoreCard({ team, average, rank, isMyTeam }: Props) {
  const pct = Math.min(100, (average.total / SCORE_TOTAL_MAX) * 100);
  const rankBorder = RANK_STYLE[rank] ?? "border-[#2a3358]";
  const myExtras = isMyTeam
    ? "ring-2 ring-[#ff4d9d] ring-offset-2 ring-offset-[#0b1020] shadow-[0_0_24px_rgba(255,77,157,0.25),0_2px_8px_rgba(0,0,0,0.25)]"
    : "shadow-[0_2px_8px_rgba(0,0,0,0.25)]";

  return (
    <motion.div
      layout
      layoutId={`team-card-${team.id}`}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className={[
        "relative rounded-[20px] bg-[#151b33] border p-4 md:p-5 transition-colors",
        rankBorder,
        myExtras,
      ].join(" ")}
    >
      {isMyTeam && (
        <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-[#ff4d9d] text-[#f5f7ff] text-[11px] font-extrabold tracking-wider">
          MY
        </span>
      )}

      <div className="flex items-baseline justify-between mb-2">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-bold tabular-nums text-[#a8b1d6]">
            #{rank || "-"}
          </span>
          {RANK_EMOJI[rank] && (
            <span aria-hidden className="text-lg leading-none">
              {RANK_EMOJI[rank]}
            </span>
          )}
          <span className="text-xl font-extrabold text-[#f5f7ff]">
            {team.name}
          </span>
        </div>
        <span className="text-[11px] uppercase tracking-[0.15em] text-[#6b739a] tabular-nums">
          심사 {average.judgeCount}
        </span>
      </div>

      <div className="text-sm text-[#a8b1d6] mb-3">
        {team.members.join(" · ")}
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-4xl md:text-5xl font-black tabular-nums leading-none text-[#f5f7ff]">
          {average.total.toFixed(1)}
        </span>
        <span className="text-sm text-[#6b739a]">/ {SCORE_TOTAL_MAX}</span>
      </div>

      <div className="mt-3 h-2 w-full rounded-full bg-[#1f2647] overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#5e72e4] via-[#11cdef] to-[#2dce89] transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-3 grid grid-cols-4 gap-1 text-[11px]">
        <Stat label="기술" value={average.tech} max={30} />
        <Stat label="BM" value={average.bm} max={30} />
        <Stat label="완성도" value={average.completeness} max={20} />
        <Stat label="협업" value={average.collab} max={20} />
      </div>
    </motion.div>
  );
}

function Stat({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  return (
    <div className="rounded-md bg-[#0b1020]/60 px-2 py-1.5 text-center">
      <div className="text-[10px] uppercase tracking-[0.1em] text-[#6b739a]">
        {label}
      </div>
      <div className="text-sm font-bold tabular-nums text-[#f5f7ff]">
        {value.toFixed(1)}
        <span className="text-[10px] text-[#6b739a]">/{max}</span>
      </div>
    </div>
  );
}
