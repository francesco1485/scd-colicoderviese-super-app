-- r119: retention of removed team documents until the end of the sporting season (UD-185, Francesco DG
-- 17/10/2026 15:06: «Tenere fino al 30 giugno 2027»). APPLIED on SCD PULSE 17/10/2026 ~15:25 after Francesco wrote
-- «Applica r119» (verified: season end 2027-06-30, service_role only). Never on dfnwzwutvnwiitiffwvr. Requires r117.
--
-- A removed referto / distinta (scd_match_documents.removed_at set) is already unreadable for everyone (r117
-- scd_storage_team_file_allowed). Its file stays in scd-private until 30 June of the season in which it was removed
-- (removed July-December of year Y -> kept until 30/06/Y+1; removed January-June of year Y -> kept until 30/06/Y).
-- For the 2026/27 season: kept until 30/06/2027. Only after that date the row becomes a clean-up candidate.
-- The function stays a placeholder: service_role only, NOT scheduled, it deletes nothing.
--
-- Rollback: re-run the r117 definition of scd_team_docs_retention_candidates().

do $$
begin
  if to_regclass('public.scd_match_documents') is null then
    raise exception 'r119 prerequisites missing: r117 must be applied first';
  end if;
end $$;

create or replace function public.scd_team_docs_season_end(p_at timestamptz)
returns date
language sql
immutable
set search_path to 'public'
as $$
  select make_date(
    extract(year from (p_at at time zone 'Europe/Rome'))::integer
      + case when extract(month from (p_at at time zone 'Europe/Rome')) >= 7 then 1 else 0 end,
    6, 30);
$$;
revoke all on function public.scd_team_docs_season_end(timestamptz) from public, anon, authenticated;

create or replace function public.scd_team_docs_retention_candidates()
returns table (document_id uuid, organization_id uuid, match_id uuid, storage_path text, removed_at timestamptz)
language sql
stable
security definer
set search_path to 'public'
as $$
  select d.id, d.organization_id, d.match_id, d.storage_path, d.removed_at
  from public.scd_match_documents d
  where d.removed_at is not null
    and (now() at time zone 'Europe/Rome')::date > public.scd_team_docs_season_end(d.removed_at)
  order by d.removed_at;
$$;
revoke all on function public.scd_team_docs_retention_candidates() from public, anon, authenticated;
grant execute on function public.scd_team_docs_retention_candidates() to service_role;
comment on function public.scd_team_docs_retention_candidates() is 'r119: removed match documents are kept until 30 June of the season of removal (2026/27: 30/06/2027, Francesco 17/10/2026); after that they are clean-up candidates. Not scheduled, deletes nothing, service_role only.';
