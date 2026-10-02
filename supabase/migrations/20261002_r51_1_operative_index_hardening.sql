-- R51.1 — SCD Core Operative Engine index hardening
-- Non-destructive performance follow-up after advisor review.

create index if not exists scd_tesseramenti_person_idx
  on public.scd_tesseramenti (person_id);

create index if not exists scd_tesseramenti_season_idx
  on public.scd_tesseramenti (season_id);

create index if not exists scd_tesseramenti_category_idx
  on public.scd_tesseramenti (category_id)
  where category_id is not null;

create index if not exists scd_tesseramenti_team_idx
  on public.scd_tesseramenti (team_id)
  where team_id is not null;
