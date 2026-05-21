import { TeamAverage } from "./types";

export type Ranked = TeamAverage & { rank: number };

// Event needs unique 1·2·3 prizes, so ties break by team id asc and every
// team gets a distinct rank (1,2,3,...) — no shared ranks, no skipped slots.
export function rankTeams(averages: TeamAverage[]): Ranked[] {
  const sorted = [...averages].sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    return a.teamId - b.teamId;
  });
  return sorted.map((row, idx) => ({ ...row, rank: idx + 1 }));
}
