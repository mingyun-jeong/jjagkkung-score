"use client";

import { Ranked } from "@/lib/ranking";
import { TEAM_BY_ID, TEAMS } from "@/lib/teams";

type Props = {
  judgeId: string;
  ranked: Ranked[];
  revealedRanks: number[];
};

export function HostRevealPanel({ judgeId, ranked, revealedRanks }: Props) {
  const revealedSet = new Set(revealedRanks);
  const ranks = TEAMS.map((_, i) => TEAMS.length - i); // [8,7,6,...,1]
  const byRank = new Map<number, Ranked>();
  for (const r of ranked) byRank.set(r.rank, r);

  const post = (body: Record<string, unknown>) =>
    fetch("/api/reveal", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ judgeId, ...body }),
    }).catch(() => {
      /* best-effort */
    });

  return (
    <section className="rounded-[24px] bg-[#151b33] border border-[#ffd66b]/40 p-4 sm:p-5 shadow-[0_0_24px_rgba(255,214,107,0.08)]">
      <div className="flex items-baseline justify-between mb-3 gap-2">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-bold tracking-[0.3em] text-[#ffd66b]">
            HOST · REVEAL
          </span>
          <span className="text-sm sm:text-base font-extrabold text-[#f5f7ff]">
            순위 공개 컨트롤
          </span>
        </div>
        <button
          type="button"
          onClick={() => post({ reset: true })}
          disabled={revealedRanks.length === 0}
          className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#1f2647] text-[#a8b1d6] hover:bg-[#2a3358] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          전체 초기화
        </button>
      </div>

      <p className="text-[12px] text-[#a8b1d6] mb-3">
        아래 버튼을 눌러 순위를 한 단계씩 공개해 주세요. 공개된 순위는 모든
        참여자에게 즉시 반영됩니다.
      </p>

      <ul className="flex flex-col gap-1.5">
        {ranks.map((rank) => {
          const row = byRank.get(rank);
          const team = row ? TEAM_BY_ID.get(row.teamId) : null;
          const isOpen = revealedSet.has(rank);
          return (
            <li
              key={rank}
              className={[
                "flex items-center gap-3 px-3 py-2.5 rounded-2xl border transition-colors",
                isOpen
                  ? "bg-[#0f2a1f] border-[#2dce89]/50"
                  : "bg-[#0b1020]/40 border-[#2a3358]",
              ].join(" ")}
            >
              <div className="w-12 sm:w-14 text-center">
                <div className="text-lg font-black text-[#ffd66b] tabular-nums leading-none">
                  {rank}위
                </div>
              </div>
              <div className="flex-1 min-w-0">
                {isOpen && team ? (
                  <>
                    <div className="text-sm sm:text-base font-extrabold text-[#f5f7ff]">
                      {team.name}{" "}
                      <span className="text-[11px] font-semibold text-[#a8b1d6]">
                        · {row?.total.toFixed(1)}점
                      </span>
                    </div>
                    <div className="text-[11.5px] text-[#a8b1d6] truncate">
                      {team.members.join(" · ")}
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-[#6b739a]">
                    {team
                      ? "공개 대기 중"
                      : "데이터 없음 (점수 미입력)"}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() =>
                  post(isOpen ? { unrevealRank: rank } : { revealRank: rank })
                }
                disabled={!team}
                className={[
                  "shrink-0 min-h-[36px] px-3 rounded-full text-xs font-extrabold transition-colors",
                  isOpen
                    ? "bg-[#2dce89]/15 text-[#2dce89] border border-[#2dce89]/50 hover:bg-[#2dce89]/25"
                    : "bg-[#1f2647] text-[#f5f7ff] border border-[#2a3358] hover:bg-[#2a3358]",
                  !team && "opacity-40 cursor-not-allowed",
                ].join(" ")}
              >
                {isOpen ? "✓ 공개됨" : "공개하기"}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
