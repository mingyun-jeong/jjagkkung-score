-- Single source of truth per team: averaged scores + reveal flag in one row.
--
-- Previously averages were computed in-memory from `scores` and the reveal
-- flag lived in a separate `team_reveals` table. The in-memory cache could
-- drift from the DB on refresh, so the admin would show wrong teams as
-- revealed. Move both onto one row per team, and let every refresh query
-- `team_averages where revealed = true` directly.
create table if not exists team_averages (
  team_id       integer     primary key,
  tech          real        not null default 0,
  bm            real        not null default 0,
  completeness  real        not null default 0,
  collab        real        not null default 0,
  total         real        not null default 0,
  judge_count   integer     not null default 0,
  revealed      boolean     not null default false,
  revealed_at   timestamptz,
  updated_at    timestamptz not null default now()
);

-- Seed all 8 teams so UPDATE-by-team_id always hits a row.
insert into team_averages (team_id)
  values (1), (2), (3), (4), (5), (6), (7), (8)
  on conflict (team_id) do nothing;

-- Old per-team flag table is no longer used.
drop table if exists team_reveals;
