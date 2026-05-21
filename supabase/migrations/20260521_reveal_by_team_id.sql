-- Switch the reveal model from "rank-based" to "team-based".
--
-- The old `revealed_ranks` column stored which ranks the host had exposed
-- (e.g. [1, 2, 8]). That model breaks under two conditions:
--   1) Tie scores cause multiple teams to share the same rank, so the
--      revealed rank can resolve to more than one team — or none at all.
--   2) Between the host loading the panel and clicking 공개하기, a late
--      score submission can shuffle which team currently sits at that rank.
--
-- Storing team ids instead pins each reveal to the exact team the host
-- chose, regardless of subsequent re-ranking.
alter table reveal_state
  add column if not exists revealed_team_ids integer[] not null default '{}';

alter table reveal_state
  drop column if exists revealed_ranks;
