"use client";

import Link from "next/link";
import { Judge } from "@/lib/types";
import { HOST_NAME, TEAM_BY_ID } from "@/lib/teams";

type Props = {
  judge: Judge;
  onLogout: () => void;
  /** show "점수 입력" CTA */
  showJudgeLink?: boolean;
  /** show "대시보드" CTA */
  showDashboardLink?: boolean;
  /** show "관리" CTA (host-only — caller decides) */
  showAdminLink?: boolean;
};

export function JudgeBanner({
  judge,
  onLogout,
  showJudgeLink,
  showDashboardLink,
  showAdminLink,
}: Props) {
  const team = judge.teamId ? TEAM_BY_ID.get(judge.teamId) : null;
  const isGuest = judge.role === "guest";
  const isStaff = !!judge.role && !isGuest;
  const isHost = judge.name === HOST_NAME;

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 sm:px-6 py-3 rounded-2xl bg-[#151b33] border border-[#2a3358]">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div
          className={[
            "h-10 w-10 rounded-full grid place-items-center text-sm font-extrabold shrink-0 text-[#f5f7ff]",
            isStaff
              ? "bg-gradient-to-br from-[#ffd66b] to-[#e8a93c]"
              : isGuest
                ? "bg-gradient-to-br from-[#5e72e4] to-[#11cdef]"
                : "bg-[#1f2647]",
          ].join(" ")}
          aria-hidden
        >
          {isStaff ? "★" : isGuest ? "🎫" : "MY"}
        </div>
        <div className="min-w-0">
          <div
            className="text-base font-bold truncate"
            style={{ color: "#ffffff" }}
          >
            {judge.name}
          </div>
          <div className="text-xs text-[#a8b1d6] truncate">
            {isStaff
              ? `${judge.role} · 운영진`
              : isGuest
                ? "게스트 · 익명 투표"
                : team
                  ? `${team.name} · ${team.members.join(" · ")}`
                  : "심사위원"}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {showDashboardLink && (
          <Link
            href="/"
            className="min-h-[40px] inline-flex items-center px-3 rounded-xl bg-[#1f2647] text-sm font-semibold text-[#f5f7ff] hover:bg-[#2a3358]"
          >
            대시보드
          </Link>
        )}
        {showJudgeLink && (
          <Link
            href="/judge"
            className="min-h-[40px] inline-flex items-center px-3 rounded-xl bg-[#1f2647] border border-[#ff4d9d]/50 text-sm font-bold text-[#f5f7ff] hover:bg-[#2a3358]"
          >
            ✏️ 점수 입력
          </Link>
        )}
        {showAdminLink && isHost && (
          <Link
            href="/admin"
            className="min-h-[40px] inline-flex items-center px-3 rounded-xl bg-[#1f2647] border border-[#ffd66b]/50 text-sm font-bold text-[#f5f7ff] hover:bg-[#2a3358]"
          >
            ⚙ 관리
          </Link>
        )}
        <button
          type="button"
          onClick={onLogout}
          className="min-h-[40px] inline-flex items-center px-3 rounded-xl bg-transparent text-sm font-semibold text-[#a8b1d6] hover:text-[#f5f7ff]"
          aria-label="로그아웃"
        >
          ⏻
        </button>
      </div>
    </div>
  );
}
