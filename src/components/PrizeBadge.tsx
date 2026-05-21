"use client";

type Rank = 1 | 2 | 3;

const PRIZE: Record<Rank, { won: number; cards: number }> = {
  1: { won: 150_000, cards: 3 },
  2: { won: 100_000, cards: 2 },
  3: { won: 50_000, cards: 1 },
};

const STYLE: Record<Rank, string> = {
  1: "rounded-[20px] px-6 py-4 text-xl bg-gradient-to-r from-[#ffd66b] to-[#e8a93c] text-[#0b1020] shadow-[0_8px_24px_rgba(232,169,60,0.45)]",
  2: "rounded-full px-5 py-3 text-lg bg-gradient-to-r from-[#e2e6f0] to-[#9ba3b8] text-[#0b1020] shadow-[0_6px_20px_rgba(155,163,184,0.4)]",
  3: "rounded-full px-4 py-2 text-base bg-gradient-to-r from-[#e0975a] to-[#a8632f] text-[#0b1020] shadow-[0_4px_16px_rgba(168,99,47,0.4)]",
};

export function PrizeBadge({ rank }: { rank: Rank }) {
  const { won, cards } = PRIZE[rank];
  const wonText = `${(won / 10_000).toFixed(0)}만원`;
  return (
    <div className={`relative overflow-hidden inline-flex items-center gap-3 font-extrabold tabular-nums ${STYLE[rank]}`}>
      <span aria-hidden className="text-xl">🎁</span>
      <span className="flex items-baseline gap-2">
        <span className="text-[0.7em] font-bold opacity-80">신세계 상품권</span>
        <span>{wonText}</span>
        <span className="text-[0.55em] font-semibold opacity-70">(5만원권 {cards}장)</span>
      </span>
      {rank === 1 && (
        <span aria-hidden className="prize-shimmer absolute inset-0 pointer-events-none" />
      )}
    </div>
  );
}
