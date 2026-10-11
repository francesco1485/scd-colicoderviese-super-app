-- r61: team-scoped access for mister/dirigenti/staff and own-family access (approved by Direzione 2026-10-11: "Si r61").
-- Principles:
--   * tables stay office-only (r60); scoped users get SECURITY DEFINER functions that return only the minimum columns;
--   * the user<->person binding reuses scd_identity_links exactly as defined in r56 (create if not exists, identical shape),
--     so applying r56 later is a no-op for this table;
--   * team assignment comes from scd_structure_roles (imported from TESSERATI_MASTER), never from a parallel registry;
--   * only verified links count (AUTO_VERIFIED, VERIFIED_BY_STAFF); name-only matching is forbidden;
--   * minors: the functions expose name, birth year, team, registration status and certificate expiry. No contacts, no fiscal code.
-- Additive only: no DROP statements.

create table if not exists public.scd_identity_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  person_id uuid not null references public.scd_people(id) on delete cascade,
  link_state text not null default 'PENDING_REVIEW'
    check (link_state in ('AUTO_VERIFIED','VERIFIED_BY_STAFF','PENDING_REVIEW','REJECTED','REVOKED')),
  match_method text not null
    check (match_method in ('EMAIL_EXACT','PHONE_BIRTHDATE','MANUAL_STAFF','IMPORT_CANONICAL')),
  confidence smallint not null default 0 check (confidence between 0 and 100),
  verified_by_user_id uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id, person_id)
);

create index if not exists scd_identity_links_user_idx on public.scd_identity_links(user_id, link_state);
create index if not exists scd_identity_links_person_idx on public.scd_identity_links(person_id, link_state);
alter table public.scd_identity_links enable row level security;
revoke all on table public.scd_identity_links from anon, authenticated;
comment on table public.scd_identity_links is 'Verified user-person binding. Name-only matching is forbidden.';

create index if not exists scd_structure_roles_team_person_idx
  on public.scd_structure_roles(team_id, person_id) where active;
create index if not exists scd_team_memberships_team_idx
  on public.scd_team_memberships(team_id, athlete_id);

-- People bound to the calling user (verified links + active membership in the same organization).
create or replace function public.scd_my_person_ids(p_organization_id uuid)
returns setof uuid
language sql
stable
security definer
set search_path to 'public'
as $$
  select l.person_id
  from public.scd_identity_links l
  join public.scd_memberships m
    on m.organization_id = l.organization_id and m.user_id = l.user_id and m.active
  where l.organization_id = p_organization_id
    and l.user_id = (select auth.uid())
    and l.link_state in ('AUTO_VERIFIED','VERIFIED_BY_STAFF');
$$;

-- Teams the calling user may see: office roles see all; staff see teams of their active structure roles.
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
        where r.team_id = t.id
          and r.active
          and r.role_kind in ('MISTER','DIRIGENTE','STAFF','RESPONSABILE')
          and (r.valid_to is null or r.valid_to >= current_date)
          and r.person_id in (select public.scd_my_person_ids(p_organization_id))
      )
    );
$$;

-- Roster of the caller's teams: minimum columns only.
create or replace function public.scd_my_team_roster(p_organization_id uuid)
returns table (
  team_id uuid,
  team_code text,
  team_name text,
  team_status text,
  person_id uuid,
  display_name text,
  birth_year integer,
  is_minor boolean,
  registration_status text,
  medical_certificate_expires_at date
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select
    t.id,
    t.code,
    t.name,
    t.status,
    p.id,
    coalesce(nullif(p.display_name, ''), trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, ''))),
    extract(year from p.birth_date)::integer,
    public.scd_is_minor(p.birth_date),
    a.registration_status,
    a.medical_certificate_expires_at
  from public.scd_teams t
  join public.scd_team_memberships tm
    on tm.team_id = t.id and (tm.valid_to is null or tm.valid_to >= current_date)
  join public.scd_athletes a on a.id = tm.athlete_id
  join public.scd_people p on p.id = a.person_id
  where t.id in (select public.scd_my_team_ids(p_organization_id))
    and p.status <> 'ARCHIVED'
    and p.left_at is null
  order by t.code, p.last_name, p.first_name;
$$;

-- The caller's own family: themself plus people in families where the caller is a guardian.
create or replace function public.scd_my_family(p_organization_id uuid)
returns table (
  person_id uuid,
  display_name text,
  relationship text,
  birth_year integer,
  is_minor boolean,
  team_codes text[],
  registration_status text,
  medical_certificate_expires_at date
)
language sql
stable
security definer
set search_path to 'public'
as $$
  with me as (
    select public.scd_my_person_ids(p_organization_id) as person_id
  ),
  circle as (
    select me.person_id, 'SELF'::text as relationship from me
    union
    select fm2.person_id, coalesce(fm2.relationship, 'FAMILY')
    from public.scd_family_members fm
    join me on me.person_id = fm.person_id and fm.is_guardian
    join public.scd_families f on f.id = fm.family_id and f.organization_id = p_organization_id
    join public.scd_family_members fm2 on fm2.family_id = fm.family_id and fm2.person_id <> fm.person_id
  )
  select
    p.id,
    coalesce(nullif(p.display_name, ''), trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, ''))),
    min(c.relationship),
    extract(year from p.birth_date)::integer,
    public.scd_is_minor(p.birth_date),
    coalesce(array_agg(distinct t.code) filter (where t.code is not null), '{}'),
    max(a.registration_status),
    max(a.medical_certificate_expires_at)
  from circle c
  join public.scd_people p on p.id = c.person_id and p.organization_id = p_organization_id
  left join public.scd_athletes a on a.person_id = p.id
  left join public.scd_team_memberships tm
    on tm.athlete_id = a.id and (tm.valid_to is null or tm.valid_to >= current_date)
  left join public.scd_teams t on t.id = tm.team_id
  where p.status <> 'ARCHIVED'
  group by p.id, p.display_name, p.first_name, p.last_name, p.birth_date
  order by min(c.relationship) = 'SELF' desc, p.birth_date;
$$;

-- Office-only: bind an existing login (by e-mail) to a person record, after checking identity in person.
create or replace function public.scd_link_person(p_organization_id uuid, p_email text, p_person_id uuid)
returns uuid
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_user uuid;
  v_link uuid;
begin
  if not public.scd_has_org_role(p_organization_id, array['DIRECTION','SECRETARIAT']::public.scd_role[]) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if not exists (select 1 from public.scd_people where id = p_person_id and organization_id = p_organization_id) then
    raise exception 'person not found' using errcode = 'P0002';
  end if;
  select u.id into v_user from auth.users u where lower(u.email) = lower(trim(p_email)) limit 1;
  if v_user is null or not exists (
    select 1 from public.scd_memberships m
    where m.organization_id = p_organization_id and m.user_id = v_user and m.active
  ) then
    raise exception 'no active login for this e-mail' using errcode = 'P0002';
  end if;
  insert into public.scd_identity_links
    (organization_id, user_id, person_id, link_state, match_method, confidence, verified_by_user_id, verified_at)
  values
    (p_organization_id, v_user, p_person_id, 'VERIFIED_BY_STAFF', 'MANUAL_STAFF', 100, (select auth.uid()), now())
  on conflict (organization_id, user_id, person_id) do update
    set link_state = 'VERIFIED_BY_STAFF',
        match_method = 'MANUAL_STAFF',
        confidence = 100,
        verified_by_user_id = (select auth.uid()),
        verified_at = now(),
        updated_at = now()
  returning id into v_link;
  return v_link;
end;
$$;

revoke all on function public.scd_my_person_ids(uuid) from public, anon;
revoke all on function public.scd_my_team_ids(uuid) from public, anon;
revoke all on function public.scd_my_team_roster(uuid) from public, anon;
revoke all on function public.scd_my_family(uuid) from public, anon;
revoke all on function public.scd_link_person(uuid, text, uuid) from public, anon;
grant execute on function public.scd_my_person_ids(uuid) to authenticated;
grant execute on function public.scd_my_team_ids(uuid) to authenticated;
grant execute on function public.scd_my_team_roster(uuid) to authenticated;
grant execute on function public.scd_my_family(uuid) to authenticated;
grant execute on function public.scd_link_person(uuid, text, uuid) to authenticated;
