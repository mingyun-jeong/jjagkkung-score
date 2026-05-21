"use client";

import { useMemo } from "react";
import { LoginModal } from "@/components/LoginModal";
import { JudgeBanner } from "@/components/JudgeBanner";
import { Leaderboard } from "@/components/Leaderboard";
import { TeamScoreCard } from "@/components/TeamScoreCard";
import { PendingTeamCard } from "@/components/PendingTeamCard";
import { TEAMS, HOST_NAME } from "@/lib/teams";
import { useJudgeSession } from "@/lib/useJudgeSession";
import { useDashboardStream } from "@/lib/useDashboardStream";
import { rankTeams, Ranked } from "@/lib/ranking";

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

  return (
    <main className="min-h-dvh bg-base text-text-primary">
      <LoginModal
        open={hydrated && !judge}
        onSubmit={(name) => login(name)}
        onGuest={() => loginGuest()}
      />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-5 sm:py-8 flex flex-col gap-5">
        <header className="flex flex-col gap-3">
          {judge && (
            <JudgeBanner
              judge={judge}
              onLogout={logout}
              showJudgeLink
              showAdminLink={isHost}
            />
          )}
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
