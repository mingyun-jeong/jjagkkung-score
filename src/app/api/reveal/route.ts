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
    revealTeamId?: number;
    unrevealTeamId?: number;
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
    if (typeof body.revealTeamId === "number")
      await store.revealTeam(body.revealTeamId);
    if (typeof body.unrevealTeamId === "number")
      await store.unrevealTeam(body.unrevealTeamId);
  }
  return NextResponse.json({
    revealLocked: store.revealLocked,
    revealed: store.revealed,
    revealedTeamIds: [...store.revealedTeamIds].sort((a, b) => a - b),
  });
}
