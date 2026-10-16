-- r113: one call for "which sections did the Direzione enable for me" (access resolver). 2026-10-17, chat cloud (squad accessi).
-- APPLIED on SCD PULSE (ndevtxxijbcnskgysdit) 17/10/2026 ~00:00 after Francesco «ok ruoli - applica r112 - applica r113» (16/10 23:58). Never on dfnwzwutvnwiitiffwvr.
-- Target: SCD PULSE (ndevtxxijbcnskgysdit). Requires r100 (scd_person_grants, scd_section_catalog), VERIFIED applied
-- 14/10/2026; a guard below stops the migration when it is missing.
--
-- Why: Francesco 16/10/2026 23:12–23:22 («le persone vedono solo le aree che vengono assegnate in automatico […] e poi
-- quelle che assegno io»; «sì vai»). The app now opens a work area when the old position rule OR a section grant passes
-- (apps/superapp/src/lib/access-resolver.ts). Without this function the gate asks scd_can twice per page and the
-- navigation cannot list grant-only areas (it would need two scd_can calls per section on every page view).
--
-- What it adds: scd_my_section_access(p_organization_id) -> rows (section_code, level, perimeter, team_ids, site):
-- the caller's OWN active grants, nothing else.
--   * only auth.uid(): no parameter names a person, so nobody can read someone else's grants (no IDOR);
--   * only with an ACTIVE membership of that organisation;
--   * only through VERIFIED identity links (AUTO_VERIFIED / VERIFIED_BY_STAFF), stricter than scd_can (which accepts
--     every link that is not REVOKED, so also PENDING_REVIEW / REJECTED);
--   * never hard-blocked, Direzione-only or base sections (they are decided elsewhere);
--   * revoked grants never returned.
-- It reads; it grants, writes and changes nothing. The Direzione membership is not expanded here: the app keeps the
-- Direzione on its own rule (it already sees every area).
--
-- Security: SECURITY DEFINER with fixed search_path, stable, no dynamic SQL; execute revoked from public/anon, granted
-- to authenticated. No new table, no grant on tables, no personal data returned (section codes, levels, team uuids,
-- site code).
--
-- Additive and idempotent (create or replace). Engines: TEMPO (people find their areas without asking the office).
-- Measure: share of grant holders who open a granted area within 7 days (server logs of the gate, no personal data).
--
-- Rollback (only on Francesco's explicit order; the app falls back to scd_can and hides grant-only menu entries):
--   begin; drop function if exists public.scd_my_section_access(uuid); commit;

begin;

-- 0. Prerequisites (fail closed).
do $$
begin
  if to_regclass('public.scd_person_grants') is null
     or to_regclass('public.scd_identity_links') is null
     or to_regclass('public.scd_memberships') is null
     or to_regprocedure('public.scd_section_catalog()') is null then
    raise exception 'r113 prerequisites missing (r100)';
  end if;
end;
$$;

-- 1. Own active grants, verified links only.
create or replace function public.scd_my_section_access(p_organization_id uuid)
returns table (section_code text, level text, perimeter text, team_ids uuid[], site text)
language sql
stable
security definer
set search_path to 'public'
as $$
  select g.section_code, g.level, g.perimeter, g.team_ids, g.site
  from public.scd_person_grants g
  where (select auth.uid()) is not null
    and g.organization_id = p_organization_id
    and g.revoked_at is null
    and exists (
      select 1 from public.scd_memberships m
      where m.organization_id = p_organization_id and m.user_id = (select auth.uid()) and m.active)
    and g.person_id in (
      select l.person_id from public.scd_identity_links l
      where l.organization_id = p_organization_id and l.user_id = (select auth.uid())
        and l.link_state in ('AUTO_VERIFIED', 'VERIFIED_BY_STAFF'))
    and exists (
      select 1 from public.scd_section_catalog() c
      where c.code = g.section_code and not c.hard_blocked and not c.direction_only and not c.base)
  order by g.section_code;
$$;

comment on function public.scd_my_section_access(uuid) is
  'r113 (Francesco 16/10/2026 23:22 «sì vai»): the caller''s own active section grants (verified links, active membership), for the app access resolver. Reads only.';

revoke all on function public.scd_my_section_access(uuid) from public, anon;
grant execute on function public.scd_my_section_access(uuid) to authenticated;

commit;
