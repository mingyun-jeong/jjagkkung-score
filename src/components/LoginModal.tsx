"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { STAFF, TEAMS } from "@/lib/teams";

type Props = {
  open: boolean;
  onSubmit: (name: string) => Promise<unknown> | void;
  onGuest?: () => Promise<unknown> | void;
};

export function LoginModal({ open, onSubmit, onGuest }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!selected) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(selected);
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인 실패");
      setSubmitting(false);
    }
  };

  const handleGuest = async () => {
    if (!onGuest) return;
    setSubmitting(true);
    setError(null);
    try {
      await onGuest();
    } catch (err) {
      setError(err instanceof Error ? err.message : "게스트 입장 실패");
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b1020]/85 backdrop-blur-md p-4 sm:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto no-scrollbar
              rounded-[28px] bg-[#151b33] border border-[#2a3358]
              shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
          >
            <div className="sticky top-0 z-10 px-6 sm:px-8 pt-7 pb-4 bg-gradient-to-b from-[#151b33] via-[#151b33] to-[#151b33]/95 border-b border-[#2a3358]/60">
              <div className="text-xs font-bold tracking-[0.2em] text-[#ffd66b]">
                JJAGKKUNG · 2025
              </div>
              <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-[#f5f7ff]">
                짝꿍톤 스코어보드
              </h1>
              <p className="mt-1 text-sm text-[#a8b1d6]">
                어떤 분이신가요? 본인을 선택해 주세요.
              </p>
            </div>

            <div className="px-6 sm:px-8 pt-5 pb-28">
              <div className="mb-3 flex items-center gap-3 text-[11px] uppercase tracking-[0.25em] text-[#ffd66b]">
                <span>★</span>
                운영진
                <div className="flex-1 h-px bg-[#2a3358]" />
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                {STAFF.map((s) => {
                  const active = selected === s.name;
                  return (
                    <button
                      key={s.name}
                      type="button"
                      onClick={() => setSelected(s.name)}
                      className={[
                        "min-h-[64px] rounded-2xl border-l-4 border-[#ffd66b] px-4 py-3 text-left text-[#f5f7ff] transition-all",
                        active
                          ? "bg-[#1f2647] ring-2 ring-[#ff4d9d] shadow-[0_0_24px_rgba(255,77,157,0.4)]"
                          : "bg-[#0b1020]/60 hover:bg-[#1f2647]",
                      ].join(" ")}
                    >
                      <div className="flex items-center gap-2">
                        <span aria-hidden className="text-[#ffd66b]">★</span>
                        <span
                          className="text-base font-bold"
                          style={{ color: "#ffffff" }}
                        >
                          {s.name}
                        </span>
                        {active && (
                          <span aria-hidden className="ml-auto text-[#ff4d9d] text-sm">
                            ✓
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] uppercase tracking-[0.2em] mt-0.5 text-[#a8b1d6]">
                        {s.role}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mb-3 flex items-center gap-3 text-[11px] uppercase tracking-[0.25em] text-[#6b739a]">
                <div className="flex-1 h-px bg-[#2a3358]" />
                참가자
                <div className="flex-1 h-px bg-[#2a3358]" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {TEAMS.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-2xl bg-[#0b1020]/60 border border-[#2a3358] p-3"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-extrabold tracking-wider text-[#ffd66b]">
                        {t.name}
                      </span>
                      <span className="text-[10px] uppercase tracking-[0.15em] text-[#6b739a]">
                        Team
                      </span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {t.members.map((name) => {
                        const active = selected === name;
                        return (
                          <button
                            key={name}
                            type="button"
                            onClick={() => setSelected(name)}
                            className={[
                              "min-h-[44px] w-full rounded-xl px-3 text-left text-sm font-semibold text-[#f5f7ff] transition-all",
                              active
                                ? "bg-[#1f2647] ring-2 ring-[#ff4d9d] shadow-[0_0_20px_rgba(255,77,157,0.3)]"
                                : "bg-[#1f2647]/70 hover:bg-[#2a3358]",
                            ].join(" ")}
                          >
                            <span
                              className="flex items-center justify-between"
                              style={{ color: "#ffffff" }}
                            >
                              <span style={{ color: "#ffffff" }}>{name}</span>
                              {active && (
                                <span aria-hidden style={{ color: "#ff4d9d" }}>
                                  ✓
                                </span>
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {error && (
                <p className="mt-4 text-sm font-semibold text-[#f5365c]">
                  {error}
                </p>
              )}
            </div>

            <div className="sticky bottom-0 px-6 sm:px-8 py-4 bg-gradient-to-t from-[#151b33] via-[#151b33] to-[#151b33]/90 border-t border-[#2a3358]/60 flex flex-col gap-2.5">
              <button
                type="button"
                disabled={!selected || submitting}
                onClick={handleConfirm}
                className={[
                  "w-full min-h-[52px] rounded-2xl font-extrabold text-base transition-all",
                  selected
                    ? "bg-gradient-to-r from-[#ffd66b] to-[#e8a93c] text-[#0b1020] shadow-[0_8px_24px_rgba(232,169,60,0.35)] hover:brightness-110"
                    : "bg-[#1f2647] text-[#6b739a] cursor-not-allowed",
                ].join(" ")}
              >
                {submitting
                  ? "들어가는 중..."
                  : selected
                    ? `${selected}(으)로 들어가기 →`
                    : "이름을 선택해 주세요"}
              </button>
              {onGuest && (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleGuest}
                  className="w-full min-h-[44px] rounded-2xl text-sm font-semibold bg-[#1f2647] text-[#a8b1d6] border border-[#2a3358] hover:bg-[#2a3358] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  🎫 명단에 없으신가요? 게스트로 입장
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
