import { TeamAverage } from "./types";

export type Ranked = TeamAverage & { rank: number };

/**
 * Sort by total desc, tiebreaker by team id asc.
 * Rank assignment treats ties as same rank (1,1,3,...).
 */
export function rankTeams(averages: TeamAverage[]): Ranked[] {
  const sorted = [...averages].sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    return a.teamId - b.teamId;
  });
  let lastTotal = Infinity;
  let lastRank = 0;
  return sorted.map((row, idx) => {
    if (row.total === lastTotal) {
      return { ...row, rank: lastRank };
    }
    lastTotal = row.total;
    lastRank = idx + 1;
    return { ...row, rank: lastRank };
  });
}
