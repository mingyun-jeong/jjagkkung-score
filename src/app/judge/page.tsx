"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { JudgeBanner } from "@/components/JudgeBanner";
import { LoginModal } from "@/components/LoginModal";
import { ScoreInputCard } from "@/components/ScoreInputCard";
import { TEAMS } from "@/lib/teams";
import { useJudgeSession } from "@/lib/useJudgeSession";
import { useDashboardStream } from "@/lib/useDashboardStream";
import { Score } from "@/lib/types";

export default function JudgePage() {
  const { judge, hydrated, login, loginGuest, logout } = useJudgeSession();
  const { state } = useDashboardStream();
  const router = useRouter();
  const [initialScores, setInitialScores] = useState<Map<number, Score> | null>(
    null,
  );

  // load my existing scores
  useEffect(() => {
    if (!judge) return;
    let cancelled = false;
    fetch(`/api/scores?judgeId=${judge.id}`)
      .then((r) => r.json())
      .then((data: { scores: Score[] }) => {
        if (cancelled) return;
        const m = new Map<number, Score>();
        for (const s of data.scores) m.set(s.teamId, s);
        setInitialScores(m);
      })
      .catch(() => setInitialScores(new Map()));
    return () => {
      cancelled = true;
    };
  }, [judge]);

  const revealLocked = !!state?.revealLocked;

  return (
    <main className="min-h-dvh bg-base text-text-primary">
      <LoginModal
        open={hydrated && !judge}
        onSubmit={(name) => login(name)}
        onGuest={() => loginGuest()}
      />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-5 sm:py-8 flex flex-col gap-5">
        <header className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <Link
              href="/"
              className="text-sm font-semibold text-[#a8b1d6] hover:text-[#f5f7ff]"
            >
              ← 대시보드
            </Link>
            <div className="text-xs font-bold tracking-[0.3em] text-[#ffd66b]">
              JUDGE · MODE
            </div>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              점수 입력
            </h1>
            <p className="text-sm text-[#a8b1d6] mt-1">
              점수를 조정한 뒤 제출하기 버튼을 눌러주세요 · 4개 항목 합산 100점
              만점
            </p>
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
          {revealLocked && (
            <div className="rounded-2xl bg-[#f5365c]/15 border border-[#f5365c] px-4 py-3 text-sm font-semibold text-[#f5365c]">
              🔒 순위 발표가 진행 중입니다. 점수 입력이 잠겨 있어요.
            </div>
          )}
        </header>

        {judge && initialScores && (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TEAMS.map((team) => {
              const isOwn = judge.teamId === team.id;
              const existing = initialScores.get(team.id);
              return (
                <ScoreInputCard
                  key={team.id}
                  team={team}
                  judgeId={judge.id}
                  disabled={isOwn}
                  disabledReason={
                    isOwn ? "본인 조 — 채점할 수 없습니다" : undefined
                  }
                  initial={
                    existing
                      ? {
                          tech: existing.tech,
                          bm: existing.bm,
                          completeness: existing.completeness,
                          collab: existing.collab,
                        }
                      : undefined
                  }
                  locked={revealLocked}
                />
              );
            })}
          </section>
        )}

        {judge && !initialScores && (
          <div className="rounded-[24px] bg-[#151b33] border border-[#2a3358] p-8 text-center text-[#a8b1d6]">
            점수 불러오는 중...
          </div>
        )}
      </div>
    </main>
  );
}
