"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { JudgeBanner } from "@/components/JudgeBanner";
import { LoginModal } from "@/components/LoginModal";
import { HostRevealPanel } from "@/components/HostRevealPanel";
import { HOST_NAME } from "@/lib/teams";
import { useJudgeSession } from "@/lib/useJudgeSession";
import { useDashboardStream } from "@/lib/useDashboardStream";
import { rankTeams } from "@/lib/ranking";

export default function AdminPage() {
  const { judge, hydrated, login, loginGuest, logout } = useJudgeSession();
  const { state } = useDashboardStream();
  const router = useRouter();

  const isHost = judge?.name === HOST_NAME;

  useEffect(() => {
    if (hydrated && judge && !isHost) router.replace("/");
  }, [hydrated, judge, isHost, router]);

  const ranked = useMemo(
    () => (state ? rankTeams(state.averages) : []),
    [state],
  );

  const revealedTeamIds = state?.revealedTeamIds ?? [];

  return (
    <main className="min-h-dvh bg-base text-text-primary">
      <LoginModal
        open={hydrated && !judge}
        onSubmit={(name) => login(name)}
        onGuest={() => loginGuest()}
      />

      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-5 sm:py-8 flex flex-col gap-5">
        <header className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-xs font-bold tracking-[0.3em] text-[#ffd66b]">
                ADMIN · HOST
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                관리 메뉴
              </h1>
              <p className="text-sm text-[#a8b1d6] mt-1">
                {HOST_NAME}님 전용 · 순위 공개를 직접 제어할 수 있어요.
              </p>
            </div>
          </div>
          {judge && (
            <JudgeBanner
              judge={judge}
              onLogout={() => {
                logout();
                router.push("/");
              }}
              showDashboardLink
            />
          )}
        </header>

        {isHost && judge ? (
          <HostRevealPanel
            judgeId={judge.id}
            ranked={ranked}
            revealedTeamIds={revealedTeamIds}
          />
        ) : hydrated && judge && !isHost ? (
          <div className="rounded-[24px] bg-[#151b33] border border-[#2a3358] p-8 text-center text-[#a8b1d6]">
            관리 메뉴는 {HOST_NAME}님만 접근할 수 있어요. 대시보드로 이동합니다...
          </div>
        ) : null}
      </div>
    </main>
  );
}
