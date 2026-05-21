import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";
import { SCORE_MAX } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clamp(v: number, max: number): number {
  if (Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(max, Math.round(v)));
}

export async function GET(req: NextRequest) {
  const judgeId = req.nextUrl.searchParams.get("judgeId");
  if (!judgeId) {
    return NextResponse.json({ error: "JUDGE_ID_REQUIRED" }, { status: 400 });
  }
  await store.ensureHydrated();
  return NextResponse.json({ scores: store.getScoresByJudge(judgeId) });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    judgeId?: string;
    teamId?: number;
    tech?: number;
    bm?: number;
    completeness?: number;
    collab?: number;
  };

  const judgeId = body.judgeId;
  const teamId = body.teamId;
  if (!judgeId || typeof teamId !== "number") {
    return NextResponse.json({ error: "INVALID_PAYLOAD" }, { status: 400 });
  }
  await store.ensureHydrated();
  if (store.revealLocked) {
    return NextResponse.json({ error: "REVEAL_LOCKED" }, { status: 423 });
  }

  try {
    const score = await store.saveScore({
      judgeId,
      teamId,
      tech: clamp(body.tech ?? 0, SCORE_MAX.tech),
      bm: clamp(body.bm ?? 0, SCORE_MAX.bm),
      completeness: clamp(body.completeness ?? 0, SCORE_MAX.completeness),
      collab: clamp(body.collab ?? 0, SCORE_MAX.collab),
    });
    return NextResponse.json({ score });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "UNKNOWN";
    const status = msg === "OWN_TEAM_FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
