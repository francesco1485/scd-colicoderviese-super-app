-- R35 — Supabase Auth context + RLS policy normalization
-- Non-destructive staged migration. FF-SUPABASE-CORE remains OFF.

create or replace function public.scd_is_org_member(p_organization_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.scd_memberships m
    where m.organization_id = p_organization_id
      and m.user_id = (select auth.uid())
      and m.active = true
  );
$$;

create or replace function public.scd_has_org_role(p_organization_id uuid, p_roles public.scd_role[])
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.scd_memberships m
    where m.organization_id = p_organization_id
      and m.user_id = (select auth.uid())
      and m.active = true
      and m.role = any(p_roles)
  );
$$;

create or replace function public.scd_my_context()
returns table (
  user_id uuid,
  organization_id uuid,
  organization_slug text,
  role public.scd_role,
  scope jsonb,
  active boolean
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    m.user_id,
    m.organization_id,
    o.slug,
    m.role,
    m.scope,
    m.active
  from public.scd_memberships m
  join public.scd_organizations o on o.id = m.organization_id
  where m.user_id = (select auth.uid())
    and m.active = true
  order by o.slug;
$$;

revoke all on function public.scd_my_context() from anon;
grant execute on function public.scd_my_context() to authenticated;

create or replace function public.scd_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_display_name text;
begin
  select id into v_org_id
  from public.scd_organizations
  where slug = 'scd-colicoderviese'
  limit 1;

  if v_org_id is null then
    raise exception 'SCD organization bootstrap missing';
  end if;

  v_display_name := nullif(
    trim(
      coalesce(new.raw_user_meta_data ->> 'first_name','') || ' ' ||
      coalesce(new.raw_user_meta_data ->> 'last_name','')
    ),
    ''
  );

  insert into public.scd_profiles (user_id, display_name)
  values (new.id, v_display_name)
  on conflict (user_id) do nothing;

  insert into public.scd_memberships (
    organization_id,
    user_id,
    role,
    scope,
    active
  )
  values (
    v_org_id,
    new.id,
    'USER_BASE'::public.scd_role,
    '{}'::jsonb,
    true
  )
  on conflict (organization_id, user_id) do nothing;

  return new;
end;
$$;

revoke all on function public.scd_handle_new_user() from public;
revoke all on function public.scd_handle_new_user() from anon;
revoke all on function public.scd_handle_new_user() from authenticated;

drop trigger if exists on_auth_user_created_scd on auth.users;
create trigger on_auth_user_created_scd
after insert on auth.users
for each row execute procedure public.scd_handle_new_user();

-- Normalize write policies so SELECT uses only the dedicated read policy.

drop policy if exists "scd_seasons_write_secretariat" on public.scd_seasons;
create policy "scd_seasons_insert_secretariat" on public.scd_seasons
for insert to authenticated
with check (public.scd_has_org_role(organization_id,array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role]));
create policy "scd_seasons_update_secretariat" on public.scd_seasons
for update to authenticated
using (public.scd_has_org_role(organization_id,array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role]))
with check (public.scd_has_org_role(organization_id,array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role]));
create policy "scd_seasons_delete_secretariat" on public.scd_seasons
for delete to authenticated
using (public.scd_has_org_role(organization_id,array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role]));

drop policy if exists "scd_people_write_secretariat" on public.scd_people;
create policy "scd_people_insert_secretariat" on public.scd_people
for insert to authenticated
with check (public.scd_has_org_role(organization_id,array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role]));
create policy "scd_people_update_secretariat" on public.scd_people
for update to authenticated
using (public.scd_has_org_role(organization_id,array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role]))
with check (public.scd_has_org_role(organization_id,array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role]));
create policy "scd_people_delete_secretariat" on public.scd_people
for delete to authenticated
using (public.scd_has_org_role(organization_id,array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role]));

drop policy if exists "scd_families_write_secretariat" on public.scd_families;
create policy "scd_families_insert_secretariat" on public.scd_families
for insert to authenticated
with check (public.scd_has_org_role(organization_id,array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role]));
create policy "scd_families_update_secretariat" on public.scd_families
for update to authenticated
using (public.scd_has_org_role(organization_id,array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role]))
with check (public.scd_has_org_role(organization_id,array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role]));
create policy "scd_families_delete_secretariat" on public.scd_families
for delete to authenticated
using (public.scd_has_org_role(organization_id,array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role]));

drop policy if exists "scd_athletes_write_secretariat" on public.scd_athletes;
create policy "scd_athletes_insert_secretariat" on public.scd_athletes
for insert to authenticated
with check (public.scd_has_org_role(organization_id,array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role]));
create policy "scd_athletes_update_secretariat" on public.scd_athletes
for update to authenticated
using (public.scd_has_org_role(organization_id,array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role]))
with check (public.scd_has_org_role(organization_id,array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role]));
create policy "scd_athletes_delete_secretariat" on public.scd_athletes
for delete to authenticated
using (public.scd_has_org_role(organization_id,array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role]));

drop policy if exists "scd_categories_write_secretariat" on public.scd_categories;
create policy "scd_categories_insert_secretariat" on public.scd_categories
for insert to authenticated
with check (public.scd_has_org_role(organization_id,array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role]));
create policy "scd_categories_update_secretariat" on public.scd_categories
for update to authenticated
using (public.scd_has_org_role(organization_id,array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role]))
with check (public.scd_has_org_role(organization_id,array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role]));
create policy "scd_categories_delete_secretariat" on public.scd_categories
for delete to authenticated
using (public.scd_has_org_role(organization_id,array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role]));

drop policy if exists "scd_teams_write_secretariat" on public.scd_teams;
create policy "scd_teams_insert_secretariat" on public.scd_teams
for insert to authenticated
with check (public.scd_has_org_role(organization_id,array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role]));
create policy "scd_teams_update_secretariat" on public.scd_teams
for update to authenticated
using (public.scd_has_org_role(organization_id,array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role]))
with check (public.scd_has_org_role(organization_id,array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role]));
create policy "scd_teams_delete_secretariat" on public.scd_teams
for delete to authenticated
using (public.scd_has_org_role(organization_id,array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role]));

drop policy if exists "scd_team_memberships_write_secretariat" on public.scd_team_memberships;
create policy "scd_team_memberships_insert_secretariat" on public.scd_team_memberships
for insert to authenticated
with check (public.scd_has_org_role(organization_id,array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role]));
create policy "scd_team_memberships_update_secretariat" on public.scd_team_memberships
for update to authenticated
using (public.scd_has_org_role(organization_id,array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role]))
with check (public.scd_has_org_role(organization_id,array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role]));
create policy "scd_team_memberships_delete_secretariat" on public.scd_team_memberships
for delete to authenticated
using (public.scd_has_org_role(organization_id,array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role]));

drop policy if exists "scd_documents_write_secretariat" on public.scd_documents;
create policy "scd_documents_insert_secretariat" on public.scd_documents
for insert to authenticated
with check (public.scd_has_org_role(organization_id,array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role]));
create policy "scd_documents_update_secretariat" on public.scd_documents
for update to authenticated
using (public.scd_has_org_role(organization_id,array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role]))
with check (public.scd_has_org_role(organization_id,array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role]));
create policy "scd_documents_delete_secretariat" on public.scd_documents
for delete to authenticated
using (public.scd_has_org_role(organization_id,array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role]));

drop policy if exists "scd_external_refs_write_secretariat" on public.scd_external_refs;
create policy "scd_external_refs_insert_secretariat" on public.scd_external_refs
for insert to authenticated
with check (public.scd_has_org_role(organization_id,array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role]));
create policy "scd_external_refs_update_secretariat" on public.scd_external_refs
for update to authenticated
using (public.scd_has_org_role(organization_id,array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role]))
with check (public.scd_has_org_role(organization_id,array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role]));
create policy "scd_external_refs_delete_secretariat" on public.scd_external_refs
for delete to authenticated
using (public.scd_has_org_role(organization_id,array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role]));

drop policy if exists "scd_events_write_staff" on public.scd_events;
create policy "scd_events_insert_staff" on public.scd_events
for insert to authenticated
with check (public.scd_has_org_role(organization_id,array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role,'STAFF'::public.scd_role,'MISTER'::public.scd_role]));
create policy "scd_events_update_staff" on public.scd_events
for update to authenticated
using (public.scd_has_org_role(organization_id,array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role,'STAFF'::public.scd_role,'MISTER'::public.scd_role]))
with check (public.scd_has_org_role(organization_id,array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role,'STAFF'::public.scd_role,'MISTER'::public.scd_role]));
create policy "scd_events_delete_staff" on public.scd_events
for delete to authenticated
using (public.scd_has_org_role(organization_id,array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role,'STAFF'::public.scd_role,'MISTER'::public.scd_role]));

drop policy if exists "scd_event_scopes_write_staff" on public.scd_event_scopes;
create policy "scd_event_scopes_insert_staff" on public.scd_event_scopes
for insert to authenticated
with check (public.scd_has_org_role(organization_id,array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role,'STAFF'::public.scd_role,'MISTER'::public.scd_role]));
create policy "scd_event_scopes_update_staff" on public.scd_event_scopes
for update to authenticated
using (public.scd_has_org_role(organization_id,array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role,'STAFF'::public.scd_role,'MISTER'::public.scd_role]))
with check (public.scd_has_org_role(organization_id,array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role,'STAFF'::public.scd_role,'MISTER'::public.scd_role]));
create policy "scd_event_scopes_delete_staff" on public.scd_event_scopes
for delete to authenticated
using (public.scd_has_org_role(organization_id,array['DIRECTION'::public.scd_role,'SECRETARIAT'::public.scd_role,'STAFF'::public.scd_role,'MISTER'::public.scd_role]));
