"use client";

import { TeamAverage } from "@/lib/types";
import { ALL_PEOPLE, TEAMS, TEAM_BY_ID } from "@/lib/teams";

type Props = {
  averages: TeamAverage[];
  scoringJudgeNames: string[];
};

export function JudgingStatusPanel({ averages, scoringJudgeNames }: Props) {
  const scoredSet = new Set(scoringJudgeNames);
  const expected = ALL_PEOPLE;
  const submitted = expected.filter((p) => scoredSet.has(p.name));
  const missing = expected.filter((p) => !scoredSet.has(p.name));
  const pct = expected.length === 0
    ? 0
    : Math.round((submitted.length / expected.length) * 100);

  const avgByTeam = new Map(averages.map((a) => [a.teamId, a]));

  return (
    <section className="rounded-[24px] bg-[#151b33] border border-[#2a3358] p-4 sm:p-5 flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-bold tracking-[0.3em] text-[#11cdef]">
            JUDGING · STATUS
          </span>
          <span className="text-sm sm:text-base font-extrabold text-[#f5f7ff]">
            채점 현황
          </span>
        </div>
        <span className="text-[11px] uppercase tracking-[0.2em] text-[#6b739a]">
          {submitted.length} / {expected.length} 명 · {pct}%
        </span>
      </div>

      <div className="h-2 rounded-full bg-[#0b1020] overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#11cdef] to-[#2dce89] transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-[11px] font-bold tracking-[0.2em] text-[#a8b1d6]">
          미제출 ({missing.length}명)
        </div>
        {missing.length === 0 ? (
          <div className="text-sm text-[#2dce89] font-semibold">
            전원 제출 완료 🎉
          </div>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {missing.map((p) => {
              const team = p.teamId ? TEAM_BY_ID.get(p.teamId) : null;
              return (
                <li
                  key={p.name}
                  className="px-2 py-1 rounded-full bg-[#0b1020]/60 border border-[#2a3358] text-[12px] text-[#f5f7ff]"
                >
                  <span className="font-extrabold">{p.name}</span>
                  <span className="text-[10px] text-[#6b739a] ml-1">
                    {team ? team.name : p.role ?? "운영"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-[11px] font-bold tracking-[0.2em] text-[#a8b1d6]">
          조별 받은 표 수
        </div>
        <ul className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {TEAMS.map((t) => {
            const count = avgByTeam.get(t.id)?.judgeCount ?? 0;
            return (
              <li
                key={t.id}
                className="px-2.5 py-2 rounded-xl bg-[#0b1020]/60 border border-[#2a3358] flex items-baseline justify-between gap-2"
              >
                <span className="text-xs font-bold text-[#a8b1d6]">
                  {t.name}
                </span>
                <span className="text-sm font-black tabular-nums text-[#f5f7ff]">
                  {count}
                  <span className="text-[10px] font-semibold text-[#6b739a] ml-0.5">
                    표
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
