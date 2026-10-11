-- r65: personalised access and authorisations (Direzione 2026-10-11: "dare accessi e autorizzazioni personalizzati").
-- Every login = one membership (coarse role) + scope.positions (extra areas from config/superapp-areas.v1.json).
--   * office (DIRECTION, SECRETARIAT) list accounts, change role, add/remove area positions, suspend/reactivate,
--     give access to a person, revoke a person link; every change is written to scd_access_audit;
--   * only DIRECTION grants or removes office roles (DIRECTION, SECRETARIAT, REGISTRATION, TOURNAMENTS) and office
--     positions (direzione, presidente, direttore-generale, dirigenza, segreteria), or edits an office account;
--   * nobody edits their own account (no self-lockout, no self-promotion); at least one active DIRECTION must remain;
--   * person links are revoked (link_state REVOKED), never deleted.
-- ASSIGNABLE positions below must stay in sync with apps/superapp/src/lib/session.ts KNOWN_POSITIONS
-- (checked by apps/superapp/src/lib/access-admin.test.ts). Additive only.

create table if not exists public.scd_access_audit (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  target_user_id uuid references auth.users(id) on delete set null,
  target_person_id uuid references public.scd_people(id) on delete set null,
  action text not null check (action in ('SET_ACCESS','GRANT_PERSON','REVOKE_LINK','APPROVE_REQUEST','REJECT_REQUEST')),
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists scd_access_audit_org_idx on public.scd_access_audit(organization_id, created_at desc);
alter table public.scd_access_audit enable row level security;
revoke all on table public.scd_access_audit from anon, authenticated;
grant select on table public.scd_access_audit to authenticated;
create policy "scd_access_audit_select_office" on public.scd_access_audit
  for select to authenticated
  using (public.scd_has_org_role(organization_id, array['DIRECTION','SECRETARIAT']::public.scd_role[]));
comment on table public.scd_access_audit is 'Who changed which access, when. Written only by SECURITY DEFINER admin functions.';

-- Shared rule check. Raises 42501 when the caller may not act; returns the caller's own role.
create or replace function public.scd_access_admin_guard(
  p_organization_id uuid, p_target_user uuid, p_new_role public.scd_role, p_new_positions text[]
)
returns public.scd_role
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_actor public.scd_role;
  v_target public.scd_role;
  office_roles text[] := array['DIRECTION','SECRETARIAT','REGISTRATION','TOURNAMENTS'];
  office_pos text[] := array['direzione','presidente','direttore-generale','dirigenza','segreteria'];
  assignable text[] := array['direzione','presidente','direttore-generale','dirigenza','responsabile-attivita-base',
    'coordinatore-attivita-sportiva','dirigente-annata','mister','responsabile-trasporti','autista','responsabile-club-house',
    'addetto-biglietteria','responsabile-magazzino','responsabile-campi','segreteria','partner'];
  p text;
begin
  select role into v_actor from public.scd_memberships
  where organization_id = p_organization_id and user_id = (select auth.uid()) and active;
  if v_actor is null or v_actor not in ('DIRECTION','SECRETARIAT') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_target_user is not null and p_target_user = (select auth.uid()) then
    raise exception 'cannot edit own access' using errcode = '42501';
  end if;
  if p_target_user is not null then
    select role into v_target from public.scd_memberships where organization_id = p_organization_id and user_id = p_target_user;
    if v_actor <> 'DIRECTION' and v_target::text = any(office_roles) then
      raise exception 'office account: Direzione only' using errcode = '42501';
    end if;
  end if;
  if p_new_role is not null and v_actor <> 'DIRECTION' and p_new_role::text = any(office_roles) then
    raise exception 'office role: Direzione only' using errcode = '42501';
  end if;
  foreach p in array coalesce(p_new_positions, '{}') loop
    if not (p = any(assignable)) then raise exception 'unknown position %', p using errcode = '22023'; end if;
    if v_actor <> 'DIRECTION' and p = any(office_pos) then
      raise exception 'office position: Direzione only' using errcode = '42501';
    end if;
  end loop;
  return v_actor;
end;
$$;

create or replace function public.scd_admin_accounts(p_organization_id uuid)
returns table (
  user_id uuid, email text, role public.scd_role, positions text[], active boolean,
  last_sign_in_at timestamptz, created_at timestamptz, persons jsonb
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select m.user_id, u.email::text, m.role,
    coalesce((select array_agg(x) from jsonb_array_elements_text(case when jsonb_typeof(m.scope->'positions') = 'array' then m.scope->'positions' else '[]'::jsonb end) x), '{}'),
    m.active, u.last_sign_in_at, m.created_at,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'name', p.display_name,
        'kind', case
          when exists (select 1 from public.scd_athletes a where a.person_id = p.id) then 'atleta'
          when exists (select 1 from public.scd_structure_roles s where s.person_id = p.id and s.active) then 'staff'
          when exists (select 1 from public.scd_family_members fm where fm.person_id = p.id and fm.is_guardian) then 'genitore'
          else 'altro' end,
        'link', l.link_state) order by p.display_name)
      from public.scd_identity_links l join public.scd_people p on p.id = l.person_id
      where l.organization_id = m.organization_id and l.user_id = m.user_id and l.link_state <> 'REVOKED'), '[]'::jsonb)
  from public.scd_memberships m
  join auth.users u on u.id = m.user_id
  where m.organization_id = p_organization_id
    and public.scd_has_org_role(p_organization_id, array['DIRECTION','SECRETARIAT']::public.scd_role[])
  order by u.email;
$$;

create or replace function public.scd_admin_set_access(
  p_organization_id uuid, p_user_id uuid, p_role public.scd_role, p_positions text[], p_active boolean, p_note text
)
returns boolean
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_before record;
  v_positions text[] := (select coalesce(array_agg(distinct x order by x), '{}') from unnest(coalesce(p_positions, '{}')) x);
begin
  perform public.scd_access_admin_guard(p_organization_id, p_user_id, p_role, v_positions);
  select role, scope, active into v_before from public.scd_memberships
  where organization_id = p_organization_id and user_id = p_user_id for update;
  if not found then raise exception 'account not found' using errcode = 'P0002'; end if;
  if v_before.role = 'DIRECTION' and v_before.active and (p_role <> 'DIRECTION' or not p_active)
     and (select count(*) from public.scd_memberships where organization_id = p_organization_id and role = 'DIRECTION' and active) <= 1 then
    raise exception 'last Direzione account' using errcode = '22023';
  end if;
  update public.scd_memberships
    set role = p_role,
        scope = jsonb_set(coalesce(scope, '{}'::jsonb), '{positions}', to_jsonb(v_positions)),
        active = p_active,
        updated_at = now()
    where organization_id = p_organization_id and user_id = p_user_id;
  insert into public.scd_access_audit (organization_id, actor_user_id, target_user_id, action, detail)
  values (p_organization_id, (select auth.uid()), p_user_id, 'SET_ACCESS', jsonb_build_object(
    'before', jsonb_build_object('role', v_before.role, 'positions', coalesce(v_before.scope->'positions', '[]'::jsonb), 'active', v_before.active),
    'after', jsonb_build_object('role', p_role, 'positions', to_jsonb(v_positions), 'active', p_active),
    'note', left(coalesce(p_note, ''), 300)));
  return true;
end;
$$;

create or replace function public.scd_admin_grant_person_access(
  p_organization_id uuid, p_person_id uuid, p_email text, p_role public.scd_role, p_positions text[], p_note text
)
returns uuid
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_user uuid;
  v_cur public.scd_role;
  v_positions text[] := (select coalesce(array_agg(distinct x order by x), '{}') from unnest(coalesce(p_positions, '{}')) x);
begin
  if v_email !~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' then raise exception 'invalid email' using errcode = '22023'; end if;
  if not exists (select 1 from public.scd_people where id = p_person_id and organization_id = p_organization_id) then
    raise exception 'person not found' using errcode = 'P0002';
  end if;
  select id into v_user from auth.users where lower(email) = v_email;
  perform public.scd_access_admin_guard(p_organization_id, v_user, p_role, v_positions);

  if v_user is null then
    v_user := gen_random_uuid();
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                            created_at, updated_at, confirmation_token, recovery_token, email_change, email_change_token_new)
    values (v_user, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', v_email, '', now(),
            '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at)
    values (gen_random_uuid(), v_user, v_user::text, jsonb_build_object('sub', v_user::text, 'email', v_email, 'email_verified', true), 'email', now(), now());
  end if;

  select role into v_cur from public.scd_memberships where organization_id = p_organization_id and user_id = v_user;
  if v_cur = 'DIRECTION' and p_role <> 'DIRECTION'
     and (select count(*) from public.scd_memberships where organization_id = p_organization_id and role = 'DIRECTION' and active) <= 1 then
    raise exception 'last Direzione account' using errcode = '22023';
  end if;
  if v_cur is null then
    insert into public.scd_memberships (organization_id, user_id, role, scope, active)
    values (p_organization_id, v_user, p_role, jsonb_build_object('positions', to_jsonb(v_positions)), true);
  else
    update public.scd_memberships
      set role = p_role, active = true,
          scope = jsonb_set(coalesce(scope, '{}'::jsonb), '{positions}', to_jsonb(v_positions)), updated_at = now()
      where organization_id = p_organization_id and user_id = v_user;
  end if;

  insert into public.scd_identity_links (organization_id, user_id, person_id, link_state, match_method, confidence, verified_by_user_id, verified_at)
  values (p_organization_id, v_user, p_person_id, 'VERIFIED_BY_STAFF', 'MANUAL_STAFF', 100, (select auth.uid()), now())
  on conflict (organization_id, user_id, person_id) do update
    set link_state = 'VERIFIED_BY_STAFF', match_method = 'MANUAL_STAFF', confidence = 100,
        verified_by_user_id = (select auth.uid()), verified_at = now(), updated_at = now();
  update public.scd_people set email = coalesce(email, v_email), updated_at = now() where id = p_person_id;

  insert into public.scd_access_audit (organization_id, actor_user_id, target_user_id, target_person_id, action, detail)
  values (p_organization_id, (select auth.uid()), v_user, p_person_id, 'GRANT_PERSON', jsonb_build_object(
    'role', p_role, 'positions', to_jsonb(v_positions), 'previous_role', v_cur, 'note', left(coalesce(p_note, ''), 300)));
  return v_user;
end;
$$;

create or replace function public.scd_admin_revoke_link(p_organization_id uuid, p_user_id uuid, p_person_id uuid, p_note text)
returns boolean
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
begin
  perform public.scd_access_admin_guard(p_organization_id, p_user_id, null, null);
  update public.scd_identity_links set link_state = 'REVOKED', updated_at = now()
  where organization_id = p_organization_id and user_id = p_user_id and person_id = p_person_id and link_state <> 'REVOKED';
  if not found then raise exception 'link not found' using errcode = 'P0002'; end if;
  insert into public.scd_access_audit (organization_id, actor_user_id, target_user_id, target_person_id, action, detail)
  values (p_organization_id, (select auth.uid()), p_user_id, p_person_id, 'REVOKE_LINK', jsonb_build_object('note', left(coalesce(p_note, ''), 300)));
  return true;
end;
$$;

create or replace function public.scd_admin_audit(p_organization_id uuid, p_limit integer default 50)
returns table (id bigint, created_at timestamptz, action text, actor_email text, target_email text, target_person text, detail jsonb)
language sql
stable
security definer
set search_path to 'public'
as $$
  select a.id, a.created_at, a.action, ua.email::text, ut.email::text, p.display_name, a.detail
  from public.scd_access_audit a
  left join auth.users ua on ua.id = a.actor_user_id
  left join auth.users ut on ut.id = a.target_user_id
  left join public.scd_people p on p.id = a.target_person_id
  where a.organization_id = p_organization_id
    and public.scd_has_org_role(p_organization_id, array['DIRECTION','SECRETARIAT']::public.scd_role[])
  order by a.created_at desc, a.id desc
  limit least(greatest(coalesce(p_limit, 50), 1), 200);
$$;


-- Approvals and rejections of r64 requests land in the same audit trail.
create or replace function public.scd_access_requests_audit()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.status <> old.status and new.status in ('APPROVED','REJECTED') then
    insert into public.scd_access_audit (organization_id, actor_user_id, target_user_id, target_person_id, action, detail)
    values (new.organization_id, new.reviewed_by_user_id,
            (select u.id from auth.users u where lower(u.email) = new.email limit 1),
            new.person_id,
            case when new.status = 'APPROVED' then 'APPROVE_REQUEST' else 'REJECT_REQUEST' end,
            jsonb_build_object('request_id', new.id, 'role', new.granted_role, 'note', coalesce(new.review_note, '')));
  end if;
  return new;
end;
$$;
revoke all on function public.scd_access_requests_audit() from public, anon, authenticated;
create or replace trigger scd_access_requests_audit_trg
  after update of status on public.scd_access_requests
  for each row execute function public.scd_access_requests_audit();

revoke all on function public.scd_access_admin_guard(uuid, uuid, public.scd_role, text[]) from public, anon, authenticated;
revoke all on function public.scd_admin_accounts(uuid) from public, anon;
revoke all on function public.scd_admin_set_access(uuid, uuid, public.scd_role, text[], boolean, text) from public, anon;
revoke all on function public.scd_admin_grant_person_access(uuid, uuid, text, public.scd_role, text[], text) from public, anon;
revoke all on function public.scd_admin_revoke_link(uuid, uuid, uuid, text) from public, anon;
revoke all on function public.scd_admin_audit(uuid, integer) from public, anon;
grant execute on function public.scd_admin_accounts(uuid) to authenticated;
grant execute on function public.scd_admin_set_access(uuid, uuid, public.scd_role, text[], boolean, text) to authenticated;
grant execute on function public.scd_admin_grant_person_access(uuid, uuid, text, public.scd_role, text[], text) to authenticated;
grant execute on function public.scd_admin_revoke_link(uuid, uuid, uuid, text) to authenticated;
grant execute on function public.scd_admin_audit(uuid, integer) to authenticated;
