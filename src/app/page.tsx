"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { LoginModal } from "@/components/LoginModal";
import { Leaderboard } from "@/components/Leaderboard";
import { TeamScoreCard } from "@/components/TeamScoreCard";
import { PendingTeamCard } from "@/components/PendingTeamCard";
import { PodiumCelebration } from "@/components/PodiumCelebration";
import { TEAMS, TEAM_BY_ID, HOST_NAME } from "@/lib/teams";
import { useJudgeSession } from "@/lib/useJudgeSession";
import { useDashboardStream } from "@/lib/useDashboardStream";
import { rankTeams, Ranked } from "@/lib/ranking";

type PodiumQueueItem = { rank: 1 | 2 | 3; teamId: number };

export default function DashboardPage() {
  const { judge, hydrated, login, loginGuest, logout } = useJudgeSession();
  const { state, refresh } = useDashboardStream();

  const ranked = useMemo(
    () => (state ? rankTeams(state.averages) : []),
    [state],
  );

  const isHost = judge?.name === HOST_NAME;
  const revealedTeamIds = state?.revealedTeamIds ?? [];
  const revealedTeamIdSet = useMemo(
    () => new Set(revealedTeamIds),
    [revealedTeamIds],
  );
  const revealedRows = useMemo<Ranked[]>(
    () => ranked.filter((r) => revealedTeamIdSet.has(r.teamId)),
    [ranked, revealedTeamIdSet],
  );
  const anyRevealed = revealedTeamIds.length > 0;
  const allRevealed = revealedTeamIds.length >= TEAMS.length;

  // Top-3 reveal celebration: detect newly revealed teams whose current rank
  // is 1/2/3 and queue a fullscreen burst. Already-revealed top-3 at first
  // load are silently marked celebrated so a page refresh never re-triggers.
  const rankByTeamId = useMemo(() => {
    const m = new Map<number, Ranked>();
    for (const r of ranked) m.set(r.teamId, r);
    return m;
  }, [ranked]);
  const celebratedRef = useRef<Set<number>>(new Set());
  const prevRevealedRef = useRef<Set<number>>(new Set());
  const initializedRef = useRef(false);
  const [podiumQueue, setPodiumQueue] = useState<PodiumQueueItem[]>([]);

  useEffect(() => {
    if (!state) return;
    const current = new Set(state.revealedTeamIds);

    if (!initializedRef.current) {
      for (const id of current) {
        const r = rankByTeamId.get(id);
        if (r && r.rank <= 3) celebratedRef.current.add(id);
      }
      prevRevealedRef.current = current;
      initializedRef.current = true;
      return;
    }

    // Unreveal: drop from celebrated so a re-reveal can fire again.
    for (const id of prevRevealedRef.current) {
      if (!current.has(id)) celebratedRef.current.delete(id);
    }

    // Newly revealed top-3 → queue.
    const additions: PodiumQueueItem[] = [];
    for (const id of current) {
      if (prevRevealedRef.current.has(id)) continue;
      if (celebratedRef.current.has(id)) continue;
      const r = rankByTeamId.get(id);
      if (r && r.rank <= 3) {
        celebratedRef.current.add(id);
        additions.push({ rank: r.rank as 1 | 2 | 3, teamId: id });
      }
    }
    if (additions.length) {
      // Show worst-rank-first (3 → 2 → 1) so the climax lands last.
      additions.sort((a, b) => b.rank - a.rank);
      setPodiumQueue((q) => [...q, ...additions]);
    }
    prevRevealedRef.current = current;
  }, [state, rankByTeamId]);

  const podiumHead = podiumQueue[0] ?? null;
  const podiumTeam = podiumHead ? TEAM_BY_ID.get(podiumHead.teamId) : null;
  const podiumRanked = podiumHead ? rankByTeamId.get(podiumHead.teamId) : null;

  return (
    <main className="min-h-dvh bg-base text-text-primary">
      <LoginModal
        open={hydrated && !judge}
        onSubmit={(name) => login(name)}
        onGuest={() => loginGuest()}
      />

      {podiumHead && podiumTeam && podiumRanked && (
        <PodiumCelebration
          open
          rank={podiumHead.rank}
          team={podiumTeam}
          total={podiumRanked.total}
          onClose={() => setPodiumQueue((q) => q.slice(1))}
        />
      )}

      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-5 sm:py-8 flex flex-col gap-5">
        <header>
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <div className="text-xs font-bold tracking-[0.3em] text-[#ffd66b]">
                JJAGKKUNG · LIVE
              </div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
                짝꿍톤 스코어보드
              </h1>
              <p className="text-sm text-[#a8b1d6] mt-1">
                실시간 평균 점수 · 4개 항목 합산 100점 만점
              </p>
            </div>
            {judge && (
              <div className="flex items-center gap-2 ml-auto">
                <div className="text-right leading-tight">
                  <div className="text-sm font-bold text-[#f5f7ff]">
                    {judge.name}
                  </div>
                  <div className="text-[11px] text-[#a8b1d6]">
                    {judge.teamId
                      ? TEAM_BY_ID.get(judge.teamId)?.name
                      : judge.role === "guest"
                        ? "게스트"
                        : (judge.role ?? "운영")}
                  </div>
                </div>
                <Link
                  href="/judge"
                  className="min-h-[36px] inline-flex items-center px-3 rounded-xl bg-[#1f2647] border border-[#ff4d9d]/50 text-xs font-bold text-[#f5f7ff] hover:bg-[#2a3358]"
                >
                  점수 입력
                </Link>
                {isHost && (
                  <Link
                    href="/admin"
                    className="min-h-[36px] inline-flex items-center px-3 rounded-xl bg-[#1f2647] border border-[#ffd66b]/50 text-xs font-bold text-[#f5f7ff] hover:bg-[#2a3358]"
                  >
                    관리
                  </Link>
                )}
                <button
                  type="button"
                  onClick={logout}
                  className="min-h-[36px] inline-flex items-center px-2 text-xs font-semibold text-[#a8b1d6] hover:text-[#f5f7ff]"
                >
                  로그아웃
                </button>
              </div>
            )}
          </div>
        </header>

        {anyRevealed ? (
          <section className="flex flex-col gap-2">
            {!allRevealed && (
              <div className="text-[11px] uppercase tracking-[0.25em] text-[#ffd66b]">
                {revealedTeamIds.length}/{TEAMS.length} 공개됨 · 남은 순위 공개 중
              </div>
            )}
            <Leaderboard
              rows={revealedRows}
              myTeamId={judge?.teamId ?? null}
              onRefresh={refresh}
            />
          </section>
        ) : (
          <section className="rounded-[24px] bg-gradient-to-br from-[#151b33] via-[#1f2647] to-[#151b33] border border-[#2a3358] p-6 sm:p-8 text-center">
            <div className="text-3xl mb-2" aria-hidden>🤫</div>
            <h2 className="text-lg sm:text-xl font-extrabold mb-1 tracking-tight">
              순위는 발표 전까지 비공개
            </h2>
            <p className="text-sm text-[#a8b1d6]">
              {state
                ? `현재 ${state.scoringJudges}명의 심사위원이 점수를 입력했어요`
                : "심사 진행 중..."}
            </p>
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0b1020]/60 text-xs text-[#a8b1d6]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#2dce89] animate-pulse" aria-hidden />
              심사 진행 중
            </div>
          </section>
        )}

        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">
              {allRevealed ? "ALL TEAMS · RANKED" : "참가 조"}
            </h2>
            <span className="text-[11px] uppercase tracking-[0.25em] text-[#6b739a]">
              {TEAMS.length}개 조
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {TEAMS.map((team) => {
              const row = ranked.find((r) => r.teamId === team.id);
              const isRevealed =
                !!row && revealedTeamIdSet.has(team.id);
              const avg = state?.averages.find((a) => a.teamId === team.id);
              return isRevealed && row ? (
                <TeamScoreCard
                  key={team.id}
                  team={team}
                  average={row}
                  rank={row.rank}
                  isMyTeam={judge?.teamId === team.id}
                />
              ) : (
                <PendingTeamCard
                  key={team.id}
                  team={team}
                  judgeCount={avg?.judgeCount ?? 0}
                  isMyTeam={judge?.teamId === team.id}
                />
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
