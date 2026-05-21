import { randomUUID } from "node:crypto";
import {
  DashboardState,
  Judge,
  Score,
  ServerEvent,
  TeamAverage,
} from "./types";
import { ALL_PEOPLE, TEAMS } from "./teams";
import { supabase } from "./supabase";

/**
 * Supabase-backed store with an in-memory cache + same-process SSE pub/sub.
 * Mutations write to Postgres first, then update the cache and broadcast.
 * The cache is hydrated lazily (and re-hydrated on HMR / cold start).
 */

type Subscriber = (event: ServerEvent) => void;

type JudgeRow = {
  id: string;
  name: string;
  team_id: number | null;
  role: string | null;
  created_at: string;
};

type ScoreRow = {
  judge_id: string;
  team_id: number;
  tech: number;
  bm: number;
  completeness: number;
  collab: number;
  updated_at: string;
};

type RevealRow = {
  id: number;
  reveal_locked: boolean;
  revealed: boolean;
  revealed_team_ids: number[];
  updated_at: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __JJAGKKUNG_STORE__: Store | undefined;
}

const rowToJudge = (r: JudgeRow): Judge => ({
  id: r.id,
  name: r.name,
  teamId: r.team_id,
  role: r.role,
  createdAt: Date.parse(r.created_at),
});

const rowToScore = (r: ScoreRow): Score => ({
  judgeId: r.judge_id,
  teamId: r.team_id,
  tech: r.tech,
  bm: r.bm,
  completeness: r.completeness,
  collab: r.collab,
  updatedAt: Date.parse(r.updated_at),
});

class Store {
  judges: Map<string, Judge> = new Map();
  scores: Map<string, Score> = new Map(); // key: `${judgeId}:${teamId}`
  subscribers: Set<Subscriber> = new Set();
  revealLocked = false;
  revealed = false;
  revealedTeamIds: Set<number> = new Set();

  private hydrated = false;
  private hydrating: Promise<void> | null = null;

  async ensureHydrated(): Promise<void> {
    if (this.hydrated) return;
    if (this.hydrating) return this.hydrating;
    this.hydrating = this.hydrate();
    try {
      await this.hydrating;
    } finally {
      this.hydrating = null;
    }
  }

  private async hydrate(): Promise<void> {
    const sb = supabase();
    const [judgesRes, scoresRes, revealRes] = await Promise.all([
      sb.from("judges").select("*"),
      sb.from("scores").select("*"),
      sb.from("reveal_state").select("*").eq("id", 1).single(),
    ]);
    if (judgesRes.error) throw judgesRes.error;
    if (scoresRes.error) throw scoresRes.error;
    if (revealRes.error) throw revealRes.error;

    this.judges.clear();
    for (const row of judgesRes.data as JudgeRow[]) {
      const j = rowToJudge(row);
      this.judges.set(j.id, j);
    }

    this.scores.clear();
    for (const row of scoresRes.data as ScoreRow[]) {
      const s = rowToScore(row);
      this.scores.set(`${s.judgeId}:${s.teamId}`, s);
    }

    const reveal = revealRes.data as RevealRow;
    this.revealLocked = reveal.reveal_locked;
    this.revealed = reveal.revealed;
    this.revealedTeamIds = new Set(reveal.revealed_team_ids);

    this.hydrated = true;
  }

  async upsertJudgeByName(
    name: string,
    teamId: number | null,
    role: string | null,
  ): Promise<Judge> {
    const sb = supabase();
    const { data, error } = await sb
      .from("judges")
      .upsert(
        { name, team_id: teamId, role },
        { onConflict: "name" },
      )
      .select()
      .single();
    if (error) throw error;
    const judge = rowToJudge(data as JudgeRow);
    this.judges.set(judge.id, judge);
    return judge;
  }

  async createGuest(): Promise<Judge> {
    const sb = supabase();
    for (let attempt = 0; attempt < 5; attempt++) {
      const name = `게스트 #${randomUUID().slice(0, 6).toUpperCase()}`;
      const { data, error } = await sb
        .from("judges")
        .insert({ name, team_id: null, role: "guest" })
        .select()
        .single();
      if (!error) {
        const judge = rowToJudge(data as JudgeRow);
        this.judges.set(judge.id, judge);
        this.broadcast({ type: "update", state: this.snapshot() });
        return judge;
      }
      // 23505 = unique_violation → retry with a new random name
      if ((error as { code?: string }).code !== "23505") throw error;
    }
    throw new Error("GUEST_NAME_COLLISION");
  }

  getJudge(id: string): Judge | undefined {
    return this.judges.get(id);
  }

  async saveScore(input: Omit<Score, "updatedAt">): Promise<Score> {
    const judge = this.judges.get(input.judgeId);
    if (!judge) throw new Error("UNKNOWN_JUDGE");
    if (judge.teamId === input.teamId) throw new Error("OWN_TEAM_FORBIDDEN");

    const sb = supabase();
    const { data, error } = await sb
      .from("scores")
      .upsert(
        {
          judge_id: input.judgeId,
          team_id: input.teamId,
          tech: input.tech,
          bm: input.bm,
          completeness: input.completeness,
          collab: input.collab,
        },
        { onConflict: "judge_id,team_id" },
      )
      .select()
      .single();
    if (error) {
      if (error.message?.includes("OWN_TEAM_FORBIDDEN")) {
        throw new Error("OWN_TEAM_FORBIDDEN");
      }
      throw error;
    }
    const score = rowToScore(data as ScoreRow);
    this.scores.set(`${score.judgeId}:${score.teamId}`, score);
    this.broadcast({ type: "update", state: this.snapshot() });
    return score;
  }

  getScoresByJudge(judgeId: string): Score[] {
    return [...this.scores.values()].filter((s) => s.judgeId === judgeId);
  }

  async setRevealLock(locked: boolean): Promise<void> {
    await this.patchReveal({ reveal_locked: locked });
  }

  async setRevealed(revealed: boolean): Promise<void> {
    await this.patchReveal({ revealed });
  }

  async resetReveal(): Promise<void> {
    await this.patchReveal({
      reveal_locked: false,
      revealed: false,
      revealed_team_ids: [],
    });
  }

  async revealTeam(teamId: number): Promise<void> {
    if (!TEAMS.some((t) => t.id === teamId)) return;
    const next = new Set(this.revealedTeamIds);
    next.add(teamId);
    const ids = [...next].sort((a, b) => a - b);
    await this.patchReveal({
      revealed_team_ids: ids,
      reveal_locked: true,
      revealed: ids.length >= TEAMS.length,
    });
  }

  async unrevealTeam(teamId: number): Promise<void> {
    if (!this.revealedTeamIds.has(teamId)) return;
    const next = new Set(this.revealedTeamIds);
    next.delete(teamId);
    const ids = [...next].sort((a, b) => a - b);
    await this.patchReveal({
      revealed_team_ids: ids,
      reveal_locked: ids.length > 0,
      revealed: false,
    });
  }

  private async patchReveal(patch: Partial<RevealRow>): Promise<void> {
    const sb = supabase();
    const { data, error } = await sb
      .from("reveal_state")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", 1)
      .select()
      .single();
    if (error) throw error;
    const row = data as RevealRow;
    this.revealLocked = row.reveal_locked;
    this.revealed = row.revealed;
    this.revealedTeamIds = new Set(row.revealed_team_ids);
    this.broadcast({ type: "update", state: this.snapshot() });
  }

  computeAverages(): TeamAverage[] {
    const buckets = new Map<number, Score[]>();
    for (const t of TEAMS) buckets.set(t.id, []);
    for (const score of this.scores.values()) {
      buckets.get(score.teamId)?.push(score);
    }
    return TEAMS.map<TeamAverage>((t) => {
      const list = buckets.get(t.id) ?? [];
      if (list.length === 0) {
        return {
          teamId: t.id,
          tech: 0,
          bm: 0,
          completeness: 0,
          collab: 0,
          total: 0,
          judgeCount: 0,
        };
      }
      const avg = (arr: number[]) =>
        Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10;
      const tech = avg(list.map((s) => s.tech));
      const bm = avg(list.map((s) => s.bm));
      const completeness = avg(list.map((s) => s.completeness));
      const collab = avg(list.map((s) => s.collab));
      const total = Math.round((tech + bm + completeness + collab) * 10) / 10;
      return {
        teamId: t.id,
        tech,
        bm,
        completeness,
        collab,
        total,
        judgeCount: list.length,
      };
    });
  }

  scoringJudgeCount(): number {
    return new Set([...this.scores.values()].map((s) => s.judgeId)).size;
  }

  snapshot(): DashboardState {
    return {
      averages: this.computeAverages(),
      totalJudges: this.judges.size,
      scoringJudges: this.scoringJudgeCount(),
      revealLocked: this.revealLocked,
      revealed: this.revealed,
      revealedTeamIds: [...this.revealedTeamIds].sort((a, b) => a - b),
    };
  }

  subscribe(fn: Subscriber): () => void {
    this.subscribers.add(fn);
    return () => {
      this.subscribers.delete(fn);
    };
  }

  broadcast(event: ServerEvent) {
    for (const sub of this.subscribers) {
      try {
        sub(event);
      } catch {
        /* best effort */
      }
    }
  }
}

function getStore(): Store {
  if (!globalThis.__JJAGKKUNG_STORE__) {
    globalThis.__JJAGKKUNG_STORE__ = new Store();
  }
  return globalThis.__JJAGKKUNG_STORE__;
}

export const store = getStore();
export { ALL_PEOPLE };
