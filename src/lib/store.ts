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
 *
 * `team_averages` is the single source of truth for per-team aggregated
 * scores and the reveal flag. Writes go through Postgres first; the cache
 * is re-read from `team_averages` at the start of every API call so
 * subsequent broadcasts can never serve a stale snapshot after a refresh.
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

type TeamAverageRow = {
  team_id: number;
  tech: number;
  bm: number;
  completeness: number;
  collab: number;
  total: number;
  judge_count: number;
  revealed: boolean;
  revealed_at: string | null;
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

const rowToAverage = (r: TeamAverageRow): TeamAverage => ({
  teamId: r.team_id,
  tech: r.tech,
  bm: r.bm,
  completeness: r.completeness,
  collab: r.collab,
  total: r.total,
  judgeCount: r.judge_count,
});

const round1 = (n: number) => Math.round(n * 10) / 10;

class Store {
  judges: Map<string, Judge> = new Map();
  scores: Map<string, Score> = new Map(); // key: `${judgeId}:${teamId}`
  averages: Map<number, TeamAverage> = new Map();
  revealedTeamIds: Set<number> = new Set();
  subscribers: Set<Subscriber> = new Set();

  // Derived from revealedTeamIds — kept off the DB to avoid a redundant write
  // on every reveal toggle.
  get revealLocked(): boolean {
    return this.revealedTeamIds.size > 0;
  }
  get revealed(): boolean {
    return this.revealedTeamIds.size >= TEAMS.length;
  }

  private hydratedOnce = false;
  private hydrating: Promise<void> | null = null;

  /**
   * First call does a full hydrate (judges + scores + averages). Subsequent
   * calls just refresh `team_averages` from the DB so a refresh of the
   * leaderboard always reflects the column truth (no cache drift).
   */
  async ensureHydrated(): Promise<void> {
    if (!this.hydratedOnce) {
      if (this.hydrating) {
        await this.hydrating;
      } else {
        this.hydrating = this.hydrate();
        try {
          await this.hydrating;
        } finally {
          this.hydrating = null;
        }
      }
    }
    await this.refreshAverages();
  }

  private async hydrate(): Promise<void> {
    const sb = supabase();
    const [judgesRes, scoresRes, avgsRes] = await Promise.all([
      sb.from("judges").select("*"),
      sb.from("scores").select("*"),
      sb.from("team_averages").select("*"),
    ]);
    if (judgesRes.error) throw judgesRes.error;
    if (scoresRes.error) throw scoresRes.error;
    if (avgsRes.error) throw avgsRes.error;

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

    this.applyAverages(avgsRes.data as TeamAverageRow[]);
    this.hydratedOnce = true;
  }

  private async refreshAverages(): Promise<void> {
    const sb = supabase();
    const { data, error } = await sb.from("team_averages").select("*");
    if (error) throw error;
    this.applyAverages(data as TeamAverageRow[]);
  }

  private applyAverages(rows: TeamAverageRow[]): void {
    this.averages.clear();
    this.revealedTeamIds = new Set();
    for (const r of rows) {
      this.averages.set(r.team_id, rowToAverage(r));
      if (r.revealed) this.revealedTeamIds.add(r.team_id);
    }
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
    await this.recomputeTeamAverage(score.teamId);
    this.broadcast({ type: "update", state: this.snapshot() });
    return score;
  }

  getScoresByJudge(judgeId: string): Score[] {
    return [...this.scores.values()].filter((s) => s.judgeId === judgeId);
  }

  private async recomputeTeamAverage(teamId: number): Promise<void> {
    const list = [...this.scores.values()].filter((s) => s.teamId === teamId);
    const judgeCount = list.length;
    const avg = (pick: (s: Score) => number) =>
      judgeCount === 0
        ? 0
        : round1(list.reduce((sum, s) => sum + pick(s), 0) / judgeCount);
    const tech = avg((s) => s.tech);
    const bm = avg((s) => s.bm);
    const completeness = avg((s) => s.completeness);
    const collab = avg((s) => s.collab);
    const total = round1(tech + bm + completeness + collab);

    const sb = supabase();
    const { error } = await sb
      .from("team_averages")
      .update({
        tech,
        bm,
        completeness,
        collab,
        total,
        judge_count: judgeCount,
        updated_at: new Date().toISOString(),
      })
      .eq("team_id", teamId);
    if (error) throw error;
    this.averages.set(teamId, {
      teamId,
      tech,
      bm,
      completeness,
      collab,
      total,
      judgeCount,
    });
  }

  async resetReveal(): Promise<void> {
    const sb = supabase();
    // `neq("team_id", -1)` matches all rows (PostgREST requires a filter).
    const { error } = await sb
      .from("team_averages")
      .update({ revealed: false, revealed_at: null })
      .neq("team_id", -1);
    if (error) throw error;
    this.revealedTeamIds = new Set();
    this.broadcast({ type: "update", state: this.snapshot() });
  }

  async revealTeam(teamId: number): Promise<void> {
    if (!TEAMS.some((t) => t.id === teamId)) return;
    const sb = supabase();
    const { error } = await sb
      .from("team_averages")
      .update({ revealed: true, revealed_at: new Date().toISOString() })
      .eq("team_id", teamId);
    if (error) throw error;
    this.revealedTeamIds.add(teamId);
    this.broadcast({ type: "update", state: this.snapshot() });
  }

  async unrevealTeam(teamId: number): Promise<void> {
    if (!this.revealedTeamIds.has(teamId)) return;
    const sb = supabase();
    const { error } = await sb
      .from("team_averages")
      .update({ revealed: false, revealed_at: null })
      .eq("team_id", teamId);
    if (error) throw error;
    this.revealedTeamIds.delete(teamId);
    this.broadcast({ type: "update", state: this.snapshot() });
  }

  scoringJudgeIds(): Set<string> {
    return new Set([...this.scores.values()].map((s) => s.judgeId));
  }

  snapshot(): DashboardState {
    const scoringIds = this.scoringJudgeIds();
    const scoringJudgeNames = [...scoringIds]
      .map((id) => this.judges.get(id)?.name)
      .filter((n): n is string => !!n)
      .sort((a, b) => a.localeCompare(b, "ko"));
    return {
      averages: TEAMS.map(
        (t) =>
          this.averages.get(t.id) ?? {
            teamId: t.id,
            tech: 0,
            bm: 0,
            completeness: 0,
            collab: 0,
            total: 0,
            judgeCount: 0,
          },
      ),
      totalJudges: this.judges.size,
      scoringJudges: scoringIds.size,
      scoringJudgeNames,
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
