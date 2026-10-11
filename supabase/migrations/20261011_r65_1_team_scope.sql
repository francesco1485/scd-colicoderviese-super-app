-- r65_1: team scope managed from /direzione/accessi (UD-064).
--   * scope.teams (team codes) on a membership adds those teams to the caller's roster/call-up scope;
--   * scope.positions containing 'coordinatore-attivita-sportiva' gives every team (same as the r61_1 structure role);
--   * the organigramma (structure roles) keeps working as before; office roles still see all teams.
-- Same signature as r61_1 scd_my_team_ids (create or replace). Additive only.

create or replace function public.scd_my_team_ids(p_organization_id uuid)
returns setof uuid
language sql
stable
security definer
set search_path to 'public'
as $$
  with me as (
    select m.scope from public.scd_memberships m
    where m.organization_id = p_organization_id and m.user_id = (select auth.uid()) and m.active
  )
  select t.id
  from public.scd_teams t
  where t.organization_id = p_organization_id
    and (
      public.scd_has_org_role(p_organization_id, array['DIRECTION','SECRETARIAT','REGISTRATION']::public.scd_role[])
      or exists (select 1 from me where coalesce(me.scope->'positions', '[]'::jsonb) ? 'coordinatore-attivita-sportiva')
      or exists (select 1 from me where coalesce(me.scope->'teams', '[]'::jsonb) ? t.code)
      or exists (
        select 1 from public.scd_structure_roles r
        where r.organization_id = p_organization_id and r.active and r.role_kind = 'RESPONSABILE'
          and r.area_id = 'coordinamento-sportivo' and (r.valid_to is null or r.valid_to >= current_date)
          and r.person_id in (select public.scd_my_person_ids(p_organization_id))
      )
      or exists (
        select 1 from public.scd_structure_roles r
        where r.team_id = t.id and r.active and r.role_kind in ('MISTER','DIRIGENTE','STAFF','RESPONSABILE')
          and (r.valid_to is null or r.valid_to >= current_date)
          and r.person_id in (select public.scd_my_person_ids(p_organization_id))
      )
    );
$$;

-- Teams assigned by hand on each account (office view).
create or replace function public.scd_admin_account_teams(p_organization_id uuid)
returns table (user_id uuid, teams text[])
language sql
stable
security definer
set search_path to 'public'
as $$
  select m.user_id,
    coalesce((select array_agg(x order by x) from jsonb_array_elements_text(case when jsonb_typeof(m.scope->'teams') = 'array' then m.scope->'teams' else '[]'::jsonb end) x), '{}')
  from public.scd_memberships m
  where m.organization_id = p_organization_id
    and public.scd_has_org_role(p_organization_id, array['DIRECTION','SECRETARIAT']::public.scd_role[]);
$$;

create or replace function public.scd_admin_set_teams(p_organization_id uuid, p_user_id uuid, p_team_codes text[], p_note text)
returns boolean
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_before jsonb;
  v_codes text[] := (select coalesce(array_agg(distinct x order by x), '{}') from unnest(coalesce(p_team_codes, '{}')) x);
  c text;
begin
  perform public.scd_access_admin_guard(p_organization_id, p_user_id, null, null);
  foreach c in array v_codes loop
    if not exists (select 1 from public.scd_teams where organization_id = p_organization_id and code = c) then
      raise exception 'unknown team %', c using errcode = '22023';
    end if;
  end loop;
  select coalesce(scope->'teams', '[]'::jsonb) into v_before from public.scd_memberships
  where organization_id = p_organization_id and user_id = p_user_id for update;
  if not found then raise exception 'account not found' using errcode = 'P0002'; end if;
  update public.scd_memberships
    set scope = jsonb_set(coalesce(scope, '{}'::jsonb), '{teams}', to_jsonb(v_codes)), updated_at = now()
    where organization_id = p_organization_id and user_id = p_user_id;
  insert into public.scd_access_audit (organization_id, actor_user_id, target_user_id, action, detail)
  values (p_organization_id, (select auth.uid()), p_user_id, 'SET_ACCESS',
          jsonb_build_object('before', jsonb_build_object('teams', v_before), 'after', jsonb_build_object('teams', to_jsonb(v_codes)),
                             'note', left(coalesce(p_note, ''), 300)));
  return true;
end;
$$;

revoke all on function public.scd_admin_account_teams(uuid) from public, anon;
revoke all on function public.scd_admin_set_teams(uuid, uuid, text[], text) from public, anon;
grant execute on function public.scd_admin_account_teams(uuid) to authenticated;
grant execute on function public.scd_admin_set_teams(uuid, uuid, text[], text) to authenticated;
