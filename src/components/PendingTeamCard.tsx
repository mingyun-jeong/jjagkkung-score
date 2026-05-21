"use client";

import { Team } from "@/lib/teams";

type Props = {
  team: Team;
  judgeCount: number;
  isMyTeam: boolean;
};

export function PendingTeamCard({ team, judgeCount, isMyTeam }: Props) {
  const myExtras = isMyTeam
    ? "ring-2 ring-[#ff4d9d] ring-offset-2 ring-offset-[#0b1020] shadow-[0_0_24px_rgba(255,77,157,0.25)]"
    : "shadow-[0_2px_8px_rgba(0,0,0,0.25)]";

  return (
    <div
      className={[
        "relative rounded-[20px] bg-[#151b33] border border-[#2a3358] p-4 sm:p-5 transition-colors",
        myExtras,
      ].join(" ")}
    >
      {isMyTeam && (
        <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-[#ff4d9d] text-[#f5f7ff] text-[11px] font-extrabold tracking-wider">
          MY
        </span>
      )}

      <div className="flex items-baseline justify-between mb-2">
        <span className="text-xl font-extrabold text-[#f5f7ff]">
          {team.name}
        </span>
        <span className="text-[11px] uppercase tracking-[0.15em] text-[#6b739a] tabular-nums">
          심사 {judgeCount}명
        </span>
      </div>

      <div className="text-sm text-[#a8b1d6] mb-4">
        {team.members.join(" · ")}
      </div>

      <div className="flex items-center gap-2 text-xs text-[#6b739a]">
        <span
          className="h-1.5 w-1.5 rounded-full bg-[#a8b1d6] animate-pulse"
          aria-hidden
        />
        <span>점수는 발표 시 공개</span>
      </div>
    </div>
  );
}
