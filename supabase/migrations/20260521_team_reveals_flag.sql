-- Per-team reveal flag, replacing the integer[] array column.
--
-- The previous design stored revealed teams as `reveal_state.revealed_team_ids`
-- (integer[]). In practice the array column did not round-trip cleanly: hosts
-- saw teams revert to "공개 대기 중" after refreshing, which means writes
-- weren't surviving re-hydration from Supabase.
--
-- Switching to one row per team makes each reveal an explicit, single-row
-- UPDATE that is trivially observable in psql/Supabase UI and cannot lose
-- entries to array-serialization quirks.
create table if not exists team_reveals (
  team_id      integer     primary key,
  revealed     boolean     not null default false,
  revealed_at  timestamptz
);

-- Seed the 8 teams (idempotent so the migration is safe to re-run).
insert into team_reveals (team_id)
  values (1), (2), (3), (4), (5), (6), (7), (8)
  on conflict (team_id) do nothing;

-- Drop the now-unused array column on reveal_state. The reveal_state row
-- still holds the global `reveal_locked` / `revealed` flags.
alter table reveal_state
  drop column if exists revealed_team_ids;
