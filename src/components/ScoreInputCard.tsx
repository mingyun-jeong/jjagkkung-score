"use client";

import { useMemo, useState } from "react";
import { Team } from "@/lib/teams";
import { SCORE_CRITERIA } from "@/lib/types";

type ScoreState = {
  tech: number;
  bm: number;
  completeness: number;
  collab: number;
};

type SaveStatus = "idle" | "saving" | "ok" | "error";

const scoresEqual = (a: ScoreState, b: ScoreState) =>
  a.tech === b.tech &&
  a.bm === b.bm &&
  a.completeness === b.completeness &&
  a.collab === b.collab;

type Props = {
  team: Team;
  judgeId: string;
  initial?: ScoreState;
  disabled?: boolean;
  disabledReason?: string;
  locked?: boolean;
};

export function ScoreInputCard({
  team,
  judgeId,
  initial,
  disabled,
  disabledReason,
  locked,
}: Props) {
  const baseline = initial ?? { tech: 0, bm: 0, completeness: 0, collab: 0 };
  const [scores, setScores] = useState<ScoreState>(baseline);
  const [submitted, setSubmitted] = useState<ScoreState | null>(
    initial ?? null,
  );
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [lastSaved, setLastSaved] = useState<number | null>(
    initial ? Date.now() : null,
  );

  const total = useMemo(
    () => scores.tech + scores.bm + scores.completeness + scores.collab,
    [scores],
  );

  const dirty = !submitted || !scoresEqual(scores, submitted);

  const setField = (field: keyof ScoreState, value: number) => {
    setScores((prev) => ({ ...prev, [field]: value }));
    if (status === "ok" || status === "error") setStatus("idle");
  };

  const submit = async () => {
    if (disabled || locked || !dirty || status === "saving") return;
    setStatus("saving");
    try {
      const res = await fetch("/api/scores", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          judgeId,
          teamId: team.id,
          ...scores,
        }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      setStatus("ok");
      setSubmitted(scores);
      setLastSaved(Date.now());
    } catch {
      setStatus("error");
    }
  };

  const pct = (total / 100) * 100;

  if (disabled) {
    return (
      <div className="rounded-[20px] bg-[#151b33] border border-[#2a3358] p-5 opacity-50 select-none">
        <div className="flex items-baseline justify-between mb-1">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-extrabold">{team.name}</span>
            <span className="text-sm text-[#a8b1d6]">
              {team.members.join(" · ")}
            </span>
          </div>
        </div>
        <div className="text-center py-8 text-[#a8b1d6] text-sm">
          {disabledReason ?? "본인 조는 채점하지 않습니다"}
        </div>
      </div>
    );
  }

  const isSubmitted = !!submitted && !dirty;

  return (
    <div
      className={[
        "rounded-[20px] p-4 sm:p-5 shadow-[0_2px_8px_rgba(0,0,0,0.25)] transition-colors",
        isSubmitted
          ? "bg-[#0f2a1f] border border-[#2dce89]/60 shadow-[0_0_24px_rgba(45,206,137,0.18)]"
          : "bg-[#151b33] border border-[#2a3358]",
      ].join(" ")}
    >
      <div className="flex items-baseline justify-between mb-2 gap-2">
        <div className="flex items-baseline gap-2 min-w-0">
          <span
            className="text-xl font-extrabold shrink-0"
            style={{ color: "#ffffff" }}
          >
            {team.name}
          </span>
          <span className="text-sm text-[#a8b1d6] truncate">
            {team.members.join(" · ")}
          </span>
        </div>
        {isSubmitted ? (
          <div className="shrink-0 px-3 py-1 rounded-full bg-[#2dce89]/15 border border-[#2dce89] text-xs font-extrabold text-[#2dce89] flex items-center gap-1">
            ✓ 제출 완료
          </div>
        ) : (
          <div
            className="shrink-0 px-3 py-1 rounded-full bg-[#1f2647] border border-[#11cdef]/40 text-sm font-extrabold tabular-nums"
            style={{ color: "#ffffff" }}
          >
            합계 {total}
          </div>
        )}
      </div>

      <div className="h-1.5 w-full rounded-full bg-[#1f2647] overflow-hidden mb-3">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#5e72e4] via-[#11cdef] to-[#2dce89] transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex flex-col gap-3">
        {SCORE_CRITERIA.map((c) => (
          <SliderRow
            key={c.field}
            label={c.label}
            description={c.description}
            value={scores[c.field]}
            max={c.max}
            onChange={(v) => setField(c.field, v)}
            disabled={locked || isSubmitted}
          />
        ))}
      </div>

      <div className="flex items-center justify-between mt-3 text-[11px] font-semibold">
        <SaveIndicator status={status} locked={locked} dirty={dirty} />
        {lastSaved && (
          <span className="text-[#6b739a] tabular-nums">
            {new Date(lastSaved).toLocaleTimeString("ko-KR")}
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={locked || !dirty || status === "saving"}
        className={[
          "mt-3 w-full rounded-full py-2.5 text-sm font-extrabold tracking-wide",
          "transition active:scale-[0.98]",
          "disabled:cursor-not-allowed",
          isSubmitted
            ? "bg-[#2dce89]/15 text-[#2dce89] border border-[#2dce89]/40 disabled:opacity-100"
            : "bg-[#1f2647] text-[#f5f7ff] border border-[#2a3358] hover:bg-[#2a3358] disabled:opacity-50",
        ].join(" ")}
      >
        {status === "saving"
          ? "제출 중..."
          : isSubmitted
            ? "✓ 제출 완료"
            : submitted
              ? "변경사항 제출"
              : "제출하기"}
      </button>
    </div>
  );
}

function SliderRow({
  label,
  description,
  value,
  max,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  value: number;
  max: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 py-1.5 border-t border-[#2a3358]/60 first:border-t-0 first:pt-0">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-extrabold text-[#f5f7ff]">
          {label}
        </span>
        <span className="text-[11px] font-bold tabular-nums text-[#11cdef]">
          {value}
          <span className="text-[#6b739a]">/{max}</span>
        </span>
      </div>
      <p className="text-[11.5px] leading-snug text-[#a8b1d6]">
        {description}
      </p>
      <div className="relative h-12 flex items-center mt-1">
        <input
          type="range"
          min={0}
          max={max}
          step={1}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{
            background: `linear-gradient(to right,
              #ff4d9d 0%,
              #ff4d9d ${(value / max) * 100}%,
              #3a4470 ${(value / max) * 100}%,
              #3a4470 100%)`,
          }}
          className="
            w-full h-3 appearance-none cursor-pointer disabled:cursor-not-allowed
            rounded-full
            shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]
            focus:outline-none focus:ring-2 focus:ring-[#ff4d9d]/60
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-8 [&::-webkit-slider-thumb]:h-8
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-[#ffffff]
            [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-[#ff4d9d]
            [&::-webkit-slider-thumb]:shadow-[0_0_0_4px_rgba(255,77,157,0.18),0_4px_12px_rgba(0,0,0,0.55)]
            [&::-webkit-slider-thumb]:transition-transform
            [&::-webkit-slider-thumb]:active:scale-110
            [&::-moz-range-thumb]:w-8 [&::-moz-range-thumb]:h-8
            [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#ffffff]
            [&::-moz-range-thumb]:border-[3px] [&::-moz-range-thumb]:border-[#ff4d9d]
            [&::-moz-range-thumb]:shadow-[0_0_0_4px_rgba(255,77,157,0.18),0_4px_12px_rgba(0,0,0,0.55)]
          "
          aria-label={`${label} (0~${max})`}
        />
      </div>
    </div>
  );
}

function SaveIndicator({
  status,
  locked,
  dirty,
}: {
  status: SaveStatus;
  locked?: boolean;
  dirty?: boolean;
}) {
  if (locked)
    return <span className="text-[#f5365c]">🔒 발표 중 · 입력 잠금</span>;
  if (status === "saving")
    return <span className="text-[#a8b1d6] animate-pulse">제출 중...</span>;
  if (status === "error")
    return <span className="text-[#f5365c]">↻ 제출 실패 · 다시 시도</span>;
  if (status === "ok" && !dirty)
    return <span className="text-[#2dce89]">✓ 제출 완료</span>;
  if (dirty)
    return <span className="text-[#ffd66b]">● 변경됨 · 제출 필요</span>;
  return <span className="text-[#6b739a]">슬라이더로 점수를 조정하세요</span>;
}
