-- r61_1: the club's sports coordinator sees every team (Direzione, 2026-10-11: "anche coordinatore attività sportive della società").
-- A coordinator is an active structure role with role_kind RESPONSABILE and area_id 'coordinamento-sportivo'
-- (no team), bound to the caller through a verified identity link. Everything else in r61 is unchanged.
-- Additive: create or replace only.

create or replace function public.scd_my_team_ids(p_organization_id uuid)
returns setof uuid
language sql
stable
security definer
set search_path to 'public'
as $$
  select t.id
  from public.scd_teams t
  where t.organization_id = p_organization_id
    and (
      public.scd_has_org_role(p_organization_id, array['DIRECTION','SECRETARIAT','REGISTRATION']::public.scd_role[])
      or exists (
        select 1
        from public.scd_structure_roles r
        where r.organization_id = p_organization_id
          and r.active
          and r.role_kind = 'RESPONSABILE'
          and r.area_id = 'coordinamento-sportivo'
          and (r.valid_to is null or r.valid_to >= current_date)
          and r.person_id in (select public.scd_my_person_ids(p_organization_id))
      )
      or exists (
        select 1
        from public.scd_structure_roles r
        where r.team_id = t.id
          and r.active
          and r.role_kind in ('MISTER','DIRIGENTE','STAFF','RESPONSABILE')
          and (r.valid_to is null or r.valid_to >= current_date)
          and r.person_id in (select public.scd_my_person_ids(p_organization_id))
      )
    );
$$;
