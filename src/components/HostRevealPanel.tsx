"use client";

import { useEffect, useMemo, useState } from "react";
import { Ranked } from "@/lib/ranking";
import { TEAM_BY_ID } from "@/lib/teams";

type Props = {
  judgeId: string;
  ranked: Ranked[];
  revealedTeamIds: number[];
};

type PendingOp = "open" | "close";

export function HostRevealPanel({ judgeId, ranked, revealedTeamIds }: Props) {
  // Pending ops are keyed by team id, not rank, so optimistic UI survives
  // any re-ranking that happens before SSE catches up.
  const [pendingOps, setPendingOps] = useState<Map<number, PendingOp>>(
    new Map(),
  );
  const [resetting, setResetting] = useState(false);

  const serverOpen = new Set(revealedTeamIds);
  // Iterate one row per team (countdown order: highest rank number first,
  // ties broken by team id). Iterating real rows instead of rank slots
  // means ties (which produce empty rank slots like 1,1,1,4) no longer
  // surface as "데이터 없음" — every team is always present.
  const orderedRows = useMemo<Ranked[]>(
    () =>
      [...ranked].sort(
        (a, b) => b.rank - a.rank || a.teamId - b.teamId,
      ),
    [ranked],
  );

  const effectivelyOpen = (teamId: number): boolean => {
    const op = pendingOps.get(teamId);
    if (op === "open") return true;
    if (op === "close") return false;
    return serverOpen.has(teamId);
  };

  const post = async (body: Record<string, unknown>): Promise<boolean> => {
    try {
      const res = await fetch("/api/reveal", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ judgeId, ...body }),
      });
      if (res.status === 403 || res.status === 404) {
        localStorage.removeItem("jjagkkung.judge.v1");
        alert(
          "세션이 만료되어 다시 로그인해야 해요. 페이지를 새로고침합니다.",
        );
        window.location.reload();
        return false;
      }
      if (!res.ok) {
        alert(`공개 실패 (HTTP ${res.status}). 다시 시도해 주세요.`);
        return false;
      }
      return true;
    } catch {
      alert("네트워크 오류로 공개에 실패했어요. 다시 시도해 주세요.");
      return false;
    }
  };

  const toggle = async (teamId: number) => {
    if (pendingOps.has(teamId) || resetting) return;
    const currentlyOpen = effectivelyOpen(teamId);
    const op: PendingOp = currentlyOpen ? "close" : "open";
    setPendingOps((prev) => new Map(prev).set(teamId, op));
    const ok = await post(
      currentlyOpen
        ? { unrevealTeamId: teamId }
        : { revealTeamId: teamId },
    );
    if (!ok) {
      setPendingOps((prev) => {
        const next = new Map(prev);
        next.delete(teamId);
        return next;
      });
    }
  };

  const resetAll = async () => {
    if (resetting || revealedTeamIds.length === 0) return;
    setResetting(true);
    const ok = await post({ reset: true });
    if (!ok) setResetting(false);
  };

  useEffect(() => {
    setPendingOps((prev) => {
      if (prev.size === 0) return prev;
      const open = new Set(revealedTeamIds);
      let changed = false;
      const next = new Map(prev);
      for (const [teamId, op] of prev) {
        const isNowOpen = open.has(teamId);
        if ((op === "open" && isNowOpen) || (op === "close" && !isNowOpen)) {
          next.delete(teamId);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [revealedTeamIds]);

  useEffect(() => {
    if (resetting && revealedTeamIds.length === 0) setResetting(false);
  }, [revealedTeamIds, resetting]);

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
          onClick={resetAll}
          disabled={revealedTeamIds.length === 0 || resetting}
          className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#1f2647] text-[#a8b1d6] hover:bg-[#2a3358] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {resetting ? "초기화 중..." : "전체 초기화"}
        </button>
      </div>

      <p className="text-[12px] text-[#a8b1d6] mb-3">
        아래 버튼을 눌러 순위를 한 단계씩 공개해 주세요. 공개된 순위는 모든
        참여자에게 즉시 반영됩니다.
      </p>

      <ul className="flex flex-col gap-1.5">
        {orderedRows.map((row) => {
          const team = TEAM_BY_ID.get(row.teamId);
          if (!team) return null;
          const teamId = team.id;
          const rank = row.rank;
          const isOpen = effectivelyOpen(teamId);
          const isPending = pendingOps.has(teamId);
          return (
            <li
              key={teamId}
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
                {isOpen ? (
                  <>
                    <div className="text-sm sm:text-base font-extrabold text-[#f5f7ff]">
                      {team.name}{" "}
                      <span className="text-[11px] font-semibold text-[#a8b1d6]">
                        · {row.total.toFixed(1)}점
                      </span>
                    </div>
                    <div className="text-[11.5px] text-[#a8b1d6] truncate">
                      {team.members.join(" · ")}
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-[#6b739a]">공개 대기 중</div>
                )}
              </div>
              <button
                type="button"
                onClick={() => toggle(teamId)}
                disabled={isPending || resetting}
                className={[
                  "shrink-0 min-h-[36px] px-3 rounded-full text-xs font-extrabold transition-colors",
                  isOpen
                    ? "bg-[#2dce89]/15 text-[#2dce89] border border-[#2dce89]/50 hover:bg-[#2dce89]/25"
                    : "bg-[#1f2647] text-[#f5f7ff] border border-[#2a3358] hover:bg-[#2a3358]",
                  isPending && "opacity-60 cursor-not-allowed",
                ].join(" ")}
              >
                {isPending
                  ? isOpen
                    ? "공개 중..."
                    : "숨기는 중..."
                  : isOpen
                    ? "✓ 공개됨"
                    : "공개하기"}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
