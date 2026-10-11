-- r64: self-registration with office approval (Direzione 2026-10-11: "Ognuno può accedere registrandosi o registrandolo noi,
-- poi quando registrati noi lo autorizziamo dopo aver verificato chi è. Semplice: nome cognome data nascita, mail e tel").
--   * anyone submits first name, last name, birth date, e-mail, phone + privacy consent (scd_request_access, anon allowed);
--   * under 14 the request is refused (a parent registers); 14-17 is accepted and flagged for family consent check;
--   * requests are visible only to office roles; approval (DIRECTION/SECRETARIAT) links or creates the person, creates the
--     login if missing, assigns a non-office role and, for a parent, links the child's family;
--   * office roles (DIRECTION, SECRETARIAT, REGISTRATION, TOURNAMENTS) are never granted from a request;
--   * the response never reveals whether an e-mail already has an account.
-- Additive only.

create table if not exists public.scd_access_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  first_name text not null check (char_length(first_name) between 2 and 80),
  last_name text not null check (char_length(last_name) between 2 and 80),
  birth_date date not null,
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$'),
  phone text not null check (phone ~ '^\+?[0-9 ]{6,20}$'),
  is_minor boolean not null default false,
  consent_privacy_at timestamptz not null,
  status text not null default 'PENDING' check (status in ('PENDING','APPROVED','REJECTED')),
  person_id uuid references public.scd_people(id) on delete set null,
  granted_role public.scd_role,
  review_note text,
  reviewed_by_user_id uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists scd_access_requests_pending_email_uidx
  on public.scd_access_requests(organization_id, lower(email)) where status = 'PENDING';
create index if not exists scd_access_requests_status_idx on public.scd_access_requests(organization_id, status, created_at desc);

alter table public.scd_access_requests enable row level security;
revoke all on table public.scd_access_requests from anon, authenticated;
grant select on table public.scd_access_requests to authenticated;
create policy "scd_access_requests_select_office" on public.scd_access_requests
  for select to authenticated
  using (public.scd_has_org_role(organization_id, array['DIRECTION','SECRETARIAT','REGISTRATION']::public.scd_role[]));
comment on table public.scd_access_requests is 'Self-registration queue. Visible to office roles only; approval via scd_approve_access_request.';

-- Public entry point. Returns RECEIVED or a refusal code (MINOR_UNDER_14, CONSENT, INVALID, BUSY).
create or replace function public.scd_request_access(
  p_first_name text, p_last_name text, p_birth_date date, p_email text, p_phone text, p_consent boolean
)
returns text
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_org uuid;
  v_email text := lower(trim(coalesce(p_email, '')));
  v_phone text := regexp_replace(trim(coalesce(p_phone, '')), '[^0-9+ ]', '', 'g');
  v_first text := regexp_replace(trim(coalesce(p_first_name, '')), '\s+', ' ', 'g');
  v_last text := regexp_replace(trim(coalesce(p_last_name, '')), '\s+', ' ', 'g');
begin
  if coalesce(p_consent, false) = false then return 'CONSENT'; end if;
  if char_length(v_first) not between 2 and 80 or char_length(v_last) not between 2 and 80
     or v_email !~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' or char_length(v_email) > 120
     or v_phone !~ '^\+?[0-9 ]{6,20}$'
     or p_birth_date is null or p_birth_date < date '1920-01-01' or p_birth_date > current_date then
    return 'INVALID';
  end if;
  if p_birth_date > current_date - interval '14 years' then return 'MINOR_UNDER_14'; end if;
  if (select count(*) from public.scd_access_requests where created_at > now() - interval '1 hour') >= 120 then return 'BUSY'; end if;

  select id into v_org from public.scd_organizations order by created_at limit 1;
  insert into public.scd_access_requests (organization_id, first_name, last_name, birth_date, email, phone, is_minor, consent_privacy_at)
  values (v_org, v_first, v_last, p_birth_date, v_email, v_phone, p_birth_date > current_date - interval '18 years', now())
  on conflict (organization_id, lower(email)) where status = 'PENDING'
  do update set first_name = excluded.first_name, last_name = excluded.last_name, birth_date = excluded.birth_date,
                phone = excluded.phone, is_minor = excluded.is_minor, consent_privacy_at = excluded.consent_privacy_at;
  return 'RECEIVED';
end;
$$;

-- Office helper: candidate people for a request (same e-mail, or same name + birth date, or same name).
create or replace function public.scd_access_request_matches(p_request_id uuid)
returns table (person_id uuid, display_name text, birth_year integer, match text, kind text, team_codes text[])
language sql
stable
security definer
set search_path to 'public'
as $$
  select * from (
  with r as (
    select * from public.scd_access_requests
    where id = p_request_id
      and public.scd_has_org_role(organization_id, array['DIRECTION','SECRETARIAT','REGISTRATION']::public.scd_role[])
  )
  select p.id as person_id, p.display_name, extract(year from p.birth_date)::integer as birth_year,
    case
      when lower(coalesce(p.email, '')) = r.email then 'EMAIL'
      when p.birth_date = r.birth_date then 'NAME_BIRTH'
      else 'NAME' end as match,
    case
      when exists (select 1 from public.scd_athletes a where a.person_id = p.id) then 'atleta'
      when exists (select 1 from public.scd_structure_roles s where s.person_id = p.id and s.active) then 'staff'
      when exists (select 1 from public.scd_family_members fm where fm.person_id = p.id and fm.is_guardian) then 'genitore'
      else 'altro' end as kind,
    coalesce((select array_agg(distinct t.code) from public.scd_athletes a
              join public.scd_team_memberships tm on tm.athlete_id = a.id and (tm.valid_to is null or tm.valid_to >= current_date)
              join public.scd_teams t on t.id = tm.team_id where a.person_id = p.id), '{}') as team_codes
  from r join public.scd_people p on p.organization_id = r.organization_id and p.status <> 'ARCHIVED'
  where lower(coalesce(p.email, '')) = r.email
     or exists (select 1 from public.scd_structure_roles s where s.person_id = p.id and lower(coalesce(s.contact_email, '')) = r.email)
     or (lower(p.first_name) = lower(r.first_name) and lower(p.last_name) = lower(r.last_name))
  ) m
  order by case m.match when 'EMAIL' then 0 when 'NAME_BIRTH' then 1 else 2 end, m.display_name
  limit 10;
$$;

create or replace function public.scd_approve_access_request(
  p_request_id uuid, p_person_id uuid, p_role public.scd_role, p_child_person_id uuid, p_note text
)
returns uuid
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  r public.scd_access_requests%rowtype;
  v_person uuid := p_person_id;
  v_user uuid;
  v_cur public.scd_role;
  v_family uuid;
  rank text[] := array['USER_BASE','ATHLETE','FAMILY','STAFF','MANAGER','MISTER','REGISTRATION','TOURNAMENTS','SECRETARIAT','DIRECTION'];
begin
  select * into r from public.scd_access_requests where id = p_request_id for update;
  if r.id is null or not public.scd_has_org_role(r.organization_id, array['DIRECTION','SECRETARIAT']::public.scd_role[]) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if r.status <> 'PENDING' then raise exception 'request already reviewed' using errcode = '22023'; end if;
  if p_role not in ('FAMILY','ATHLETE','MISTER','MANAGER','STAFF') then
    raise exception 'role not grantable from a request' using errcode = '22023';
  end if;

  if v_person is null then
    insert into public.scd_people (organization_id, first_name, last_name, birth_date, email, phone, status, source_id, source_record_id)
    values (r.organization_id, r.first_name, r.last_name, r.birth_date, r.email, case when r.is_minor then null else r.phone end,
            'ACTIVE', 'ACCESS_REQUEST', r.id::text)
    returning id into v_person;
  else
    if not exists (select 1 from public.scd_people where id = v_person and organization_id = r.organization_id) then
      raise exception 'person not found' using errcode = 'P0002';
    end if;
    update public.scd_people
      set email = coalesce(email, r.email),
          phone = case when phone is null and not r.is_minor then r.phone else phone end,
          updated_at = now()
      where id = v_person;
  end if;

  select id into v_user from auth.users where lower(email) = r.email;
  if v_user is null then
    v_user := gen_random_uuid();
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                            created_at, updated_at, confirmation_token, recovery_token, email_change, email_change_token_new)
    values (v_user, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', r.email, '', now(),
            '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at)
    values (gen_random_uuid(), v_user, v_user::text, jsonb_build_object('sub', v_user::text, 'email', r.email, 'email_verified', true), 'email', now(), now());
  end if;

  select role into v_cur from public.scd_memberships where organization_id = r.organization_id and user_id = v_user;
  if v_cur is null then
    insert into public.scd_memberships (organization_id, user_id, role, scope, active) values (r.organization_id, v_user, p_role, '{}', true);
  elsif array_position(rank, v_cur::text) < array_position(rank, p_role::text) then
    update public.scd_memberships set role = p_role, active = true, updated_at = now() where organization_id = r.organization_id and user_id = v_user;
  end if;

  insert into public.scd_identity_links (organization_id, user_id, person_id, link_state, match_method, confidence, verified_by_user_id, verified_at)
  values (r.organization_id, v_user, v_person, 'VERIFIED_BY_STAFF', 'MANUAL_STAFF', 100, (select auth.uid()), now())
  on conflict (organization_id, user_id, person_id) do update
    set link_state = 'VERIFIED_BY_STAFF', match_method = 'MANUAL_STAFF', confidence = 100,
        verified_by_user_id = (select auth.uid()), verified_at = now(), updated_at = now();

  if p_child_person_id is not null then
    if not exists (select 1 from public.scd_people where id = p_child_person_id and organization_id = r.organization_id) then
      raise exception 'child not found' using errcode = 'P0002';
    end if;
    select fm.family_id into v_family from public.scd_family_members fm
      join public.scd_families f on f.id = fm.family_id and f.organization_id = r.organization_id
      where fm.person_id = p_child_person_id and not fm.is_guardian limit 1;
    if v_family is null then
      insert into public.scd_families (organization_id, display_name)
      select r.organization_id, 'Famiglia ' || initcap(last_name) from public.scd_people where id = p_child_person_id
      returning id into v_family;
      insert into public.scd_family_members (family_id, person_id, relationship, is_guardian) values (v_family, p_child_person_id, 'FIGLIO', false);
    end if;
    insert into public.scd_family_members (family_id, person_id, relationship, is_guardian)
    values (v_family, v_person, 'GENITORE', true)
    on conflict (family_id, person_id) do update set is_guardian = true;
  end if;

  update public.scd_access_requests
    set status = 'APPROVED', person_id = v_person, granted_role = p_role, review_note = left(p_note, 300),
        reviewed_by_user_id = (select auth.uid()), reviewed_at = now()
    where id = p_request_id;
  return v_person;
end;
$$;

create or replace function public.scd_reject_access_request(p_request_id uuid, p_note text)
returns boolean
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_org uuid;
begin
  select organization_id into v_org from public.scd_access_requests where id = p_request_id and status = 'PENDING';
  if v_org is null or not public.scd_has_org_role(v_org, array['DIRECTION','SECRETARIAT']::public.scd_role[]) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.scd_access_requests
    set status = 'REJECTED', review_note = left(p_note, 300), reviewed_by_user_id = (select auth.uid()), reviewed_at = now()
    where id = p_request_id;
  return true;
end;
$$;

revoke all on function public.scd_request_access(text, text, date, text, text, boolean) from public;
revoke all on function public.scd_access_request_matches(uuid) from public, anon;
revoke all on function public.scd_approve_access_request(uuid, uuid, public.scd_role, uuid, text) from public, anon;
revoke all on function public.scd_reject_access_request(uuid, text) from public, anon;
grant execute on function public.scd_request_access(text, text, date, text, text, boolean) to anon, authenticated;
grant execute on function public.scd_access_request_matches(uuid) to authenticated;
grant execute on function public.scd_approve_access_request(uuid, uuid, public.scd_role, uuid, text) to authenticated;
grant execute on function public.scd_reject_access_request(uuid, text) to authenticated;
