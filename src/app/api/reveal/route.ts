import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";
import { HOST_NAME } from "@/lib/teams";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    judgeId?: string;
    locked?: boolean;
    revealed?: boolean;
    reset?: boolean;
    revealRank?: number;
    unrevealRank?: number;
  };

  await store.ensureHydrated();

  const judge = body.judgeId ? store.getJudge(body.judgeId) : undefined;
  if (!judge || judge.name !== HOST_NAME) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  if (body.reset) {
    await store.resetReveal();
  } else {
    if (typeof body.locked === "boolean") await store.setRevealLock(body.locked);
    if (typeof body.revealed === "boolean") await store.setRevealed(body.revealed);
    if (typeof body.revealRank === "number") await store.revealRank(body.revealRank);
    if (typeof body.unrevealRank === "number")
      await store.unrevealRank(body.unrevealRank);
  }
  return NextResponse.json({
    revealLocked: store.revealLocked,
    revealed: store.revealed,
    revealedRanks: [...store.revealedRanks].sort((a, b) => a - b),
  });
}
