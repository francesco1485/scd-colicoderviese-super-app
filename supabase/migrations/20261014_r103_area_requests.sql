-- r103 (STAGED, DO NOT APPLY without explicit Direzione approval): area requests and dish polls of the assistant cast
-- (UD-114, Direzione 14/10/2026: "Importante sono i gestionali e gli avatar che devono creare e rendere tutto
-- interattivo e dinamico"). First area: the Club House of "Lo chef" (Accoglienza e Chef, UD-111):
--   * a family or an adult member sends a "richiesta d'ordine per feste e iniziative" (what, when, how many people,
--     contact preference); a person of the Club House office takes it, confirms it or answers "non possibile";
--     payment happens at the club till (SQUBY/SumUp), never in the app, and is not recorded here;
--   * the Club House office opens dish polls; every member of the organization votes once per poll and may change
--     the vote while the poll is open; counts are shown to who has voted and to everybody once the poll is closed.
-- No health data: allergies and intolerances are told in person (the app form refuses them). No amounts, no payment
-- data. Every step of a request is logged. Additive only: new tables and functions, nothing existing is changed.
-- The app works without this migration: every call fails and the UI stays closed (lib/area-requests.functions.ts).

create table if not exists public.scd_area_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id),
  area text not null check (area in ('club-house')),
  kind text not null check (kind in ('ORDINE_FESTA')),
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 2000),
  status text not null default 'NUOVA' check (status in ('NUOVA', 'IN_CARICO', 'CONFERMATA', 'NON_POSSIBILE', 'ANNULLATA')),
  answer text check (answer is null or char_length(answer) <= 300),
  requested_by uuid not null,
  requester_person_id uuid references public.scd_people(id),
  handled_by uuid,
  handled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists scd_area_requests_board on public.scd_area_requests (organization_id, area, status, created_at desc);
create index if not exists scd_area_requests_mine on public.scd_area_requests (organization_id, requested_by, created_at desc);
alter table public.scd_area_requests enable row level security;
revoke all on table public.scd_area_requests from anon, authenticated;

create table if not exists public.scd_area_request_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null,
  request_id uuid not null references public.scd_area_requests(id),
  action text not null check (action in ('NUOVA', 'IN_CARICO', 'CONFERMATA', 'NON_POSSIBILE', 'ANNULLATA')),
  actor uuid,
  note text check (note is null or char_length(note) <= 300),
  at timestamptz not null default now()
);
alter table public.scd_area_request_events enable row level security;
revoke all on table public.scd_area_request_events from anon, authenticated;

create table if not exists public.scd_area_polls (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id),
  area text not null check (area in ('club-house')),
  question text not null check (char_length(question) between 5 and 160),
  -- [{"key":"a","label":"Lasagne"}, ...] : 2 to 6 options
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 6),
  opens_at timestamptz not null default now(),
  closes_at timestamptz,
  created_by uuid not null,
  created_at timestamptz not null default now()
);
create index if not exists scd_area_polls_open on public.scd_area_polls (organization_id, area, closes_at);
alter table public.scd_area_polls enable row level security;
revoke all on table public.scd_area_polls from anon, authenticated;

create table if not exists public.scd_area_poll_votes (
  poll_id uuid not null references public.scd_area_polls(id),
  voter uuid not null,
  option_key text not null check (char_length(option_key) between 1 and 40),
  voted_at timestamptz not null default now(),
  primary key (poll_id, voter)
);
alter table public.scd_area_poll_votes enable row level security;
revoke all on table public.scd_area_poll_votes from anon, authenticated;

-- Active member of the organization.
create or replace function public.scd_area_member(p_organization_id uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select auth.uid() is not null and exists (select 1 from public.scd_memberships m
    where m.organization_id = p_organization_id and m.user_id = (select auth.uid()) and m.active);
$$;
revoke all on function public.scd_area_member(uuid) from public, anon;

-- Office of an area: Direzione / Segreteria and the area positions (Club House: responsabile Club House, tesoreria).
create or replace function public.scd_area_office(p_organization_id uuid, p_area text)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select public.scd_has_org_role(p_organization_id, array['DIRECTION','SECRETARIAT']::public.scd_role[])
    or (p_area = 'club-house' and public.scd_has_position(p_organization_id, array['responsabile-club-house','tesoreria','direzione','presidente','direttore-generale']));
$$;
revoke all on function public.scd_area_office(uuid, text) from public, anon;

-- Orders only from adults or from a family account (a guardian), or from the area office. Unknown age: refused.
create or replace function public.scd_area_can_order(p_organization_id uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select public.scd_area_member(p_organization_id) and (
    public.scd_area_office(p_organization_id, 'club-house')
    or exists (select 1 from public.scd_people p
      where p.id in (select public.scd_my_person_ids(p_organization_id))
        and p.birth_date is not null and p.birth_date <= current_date - interval '18 years')
    or exists (select 1 from public.scd_family_members fm
      join public.scd_families f on f.id = fm.family_id and f.organization_id = p_organization_id
      where fm.person_id in (select public.scd_my_person_ids(p_organization_id)) and fm.is_guardian));
$$;
revoke all on function public.scd_area_can_order(uuid) from public, anon;

-- Create a request. Validation mirrors lib/area-requests.ts validateOrderRequest (the browser is never trusted).
create or replace function public.scd_area_request_create(p_organization_id uuid, p_area text, p_kind text, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_what text := left(trim(coalesce(p_payload->>'what', '')), 300);
  v_when date;
  v_time text := nullif(trim(coalesce(p_payload->>'time', '')), '');
  v_people int;
  v_contact text := p_payload->>'contact';
  v_occasion text := coalesce(p_payload->>'occasion', 'Altro');
  v_id uuid;
begin
  if p_area <> 'club-house' or p_kind <> 'ORDINE_FESTA' then
    return jsonb_build_object('ok', false, 'code', 'invalid');
  end if;
  if not public.scd_area_can_order(p_organization_id) then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  begin
    v_when := (p_payload->>'when')::date;
    v_people := (p_payload->>'people')::int;
  exception when others then
    return jsonb_build_object('ok', false, 'code', 'invalid');
  end;
  if char_length(v_what) < 3
     or v_what ~* '(allerg|intolleran|celiac|anafilass|diabet|lattosio|glutine)'
     or v_when is null or v_when < (now() at time zone 'Europe/Rome')::date
     or v_when > (now() at time zone 'Europe/Rome')::date + 365
     or (v_time is not null and v_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
     or v_people is null or v_people < 1 or v_people > 500
     or v_contact is null or v_contact not in ('app', 'email', 'telefono')
     or v_occasion not in ('Compleanno', 'Festa di squadra', 'Iniziativa del club', 'Altro') then
    return jsonb_build_object('ok', false, 'code', 'invalid');
  end if;
  insert into public.scd_area_requests (organization_id, area, kind, payload, requested_by, requester_person_id)
  values (p_organization_id, p_area, p_kind,
    jsonb_build_object('what', v_what, 'when', v_when, 'time', v_time, 'people', v_people, 'contact', v_contact, 'occasion', v_occasion),
    auth.uid(), (select public.scd_my_person_ids(p_organization_id) limit 1))
  returning id into v_id;
  insert into public.scd_area_request_events (organization_id, request_id, action, actor) values (p_organization_id, v_id, 'NUOVA', auth.uid());
  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;
revoke all on function public.scd_area_request_create(uuid, text, text, jsonb) from public, anon;
grant execute on function public.scd_area_request_create(uuid, text, text, jsonb) to authenticated;

-- The caller's own requests of an area (last 90 days).
create or replace function public.scd_my_area_requests(p_organization_id uuid, p_area text)
returns jsonb language sql stable security definer set search_path to 'public' as $$
  select case when not public.scd_area_member(p_organization_id) then '[]'::jsonb else coalesce((
    select jsonb_agg(jsonb_build_object('id', r.id, 'createdAt', r.created_at, 'status', r.status, 'payload', r.payload, 'answer', r.answer)
      order by r.created_at desc)
    from public.scd_area_requests r
    where r.organization_id = p_organization_id and r.area = p_area and r.requested_by = (select auth.uid())
      and r.created_at > now() - interval '90 days'), '[]'::jsonb) end;
$$;
revoke all on function public.scd_my_area_requests(uuid, text) from public, anon;
grant execute on function public.scd_my_area_requests(uuid, text) to authenticated;

-- Office board: open requests and the last 30 days, with the requester's display name (adults / guardians only).
create or replace function public.scd_area_requests_board(p_organization_id uuid, p_area text)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
begin
  if not public.scd_area_office(p_organization_id, p_area) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', r.id, 'createdAt', r.created_at, 'status', r.status, 'payload', r.payload, 'answer', r.answer,
      'requester', coalesce(nullif(p.display_name, ''), trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), 'Socio'))
      order by (r.payload->>'when'), r.created_at)
    from public.scd_area_requests r
    left join public.scd_people p on p.id = r.requester_person_id
    where r.organization_id = p_organization_id and r.area = p_area
      and (r.status in ('NUOVA', 'IN_CARICO') or r.updated_at > now() - interval '30 days')), '[]'::jsonb);
end;
$$;
revoke all on function public.scd_area_requests_board(uuid, text) from public, anon;
grant execute on function public.scd_area_requests_board(uuid, text) to authenticated;

-- Office decision. CONFERMATA means a person confirmed: payment at the till, never in the app.
create or replace function public.scd_area_request_decide(p_organization_id uuid, p_request_id uuid, p_status text, p_answer text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  v_area text;
begin
  select area into v_area from public.scd_area_requests where id = p_request_id and organization_id = p_organization_id for update;
  if v_area is null then return jsonb_build_object('ok', false, 'code', 'invalid'); end if;
  if not public.scd_area_office(p_organization_id, v_area) then return jsonb_build_object('ok', false, 'code', 'forbidden'); end if;
  if p_status not in ('IN_CARICO', 'CONFERMATA', 'NON_POSSIBILE') then return jsonb_build_object('ok', false, 'code', 'invalid'); end if;
  update public.scd_area_requests set status = p_status, answer = left(nullif(trim(p_answer), ''), 300),
    handled_by = auth.uid(), handled_at = now(), updated_at = now()
  where id = p_request_id;
  insert into public.scd_area_request_events (organization_id, request_id, action, actor, note)
  values (p_organization_id, p_request_id, p_status, auth.uid(), left(nullif(trim(p_answer), ''), 300));
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.scd_area_request_decide(uuid, uuid, text, text) from public, anon;
grant execute on function public.scd_area_request_decide(uuid, uuid, text, text) to authenticated;

-- The requester cancels a request that nobody has confirmed yet.
create or replace function public.scd_area_request_cancel(p_organization_id uuid, p_request_id uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
begin
  update public.scd_area_requests set status = 'ANNULLATA', updated_at = now()
  where id = p_request_id and organization_id = p_organization_id and requested_by = auth.uid() and status in ('NUOVA', 'IN_CARICO');
  if not found then return jsonb_build_object('ok', false, 'code', 'invalid'); end if;
  insert into public.scd_area_request_events (organization_id, request_id, action, actor) values (p_organization_id, p_request_id, 'ANNULLATA', auth.uid());
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.scd_area_request_cancel(uuid, uuid) from public, anon;
grant execute on function public.scd_area_request_cancel(uuid, uuid) to authenticated;

-- Dish polls: the area office opens one.
create or replace function public.scd_area_poll_create(p_organization_id uuid, p_area text, p_question text, p_options jsonb, p_closes_at timestamptz)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  v_id uuid;
begin
  if not public.scd_area_office(p_organization_id, p_area) then return jsonb_build_object('ok', false, 'code', 'forbidden'); end if;
  if jsonb_typeof(p_options) <> 'array' or jsonb_array_length(p_options) not between 2 and 6
     or exists (select 1 from jsonb_array_elements(p_options) o
       where coalesce(o->>'key', '') = '' or char_length(coalesce(o->>'label', '')) not between 1 and 60)
     or (select count(distinct o->>'key') from jsonb_array_elements(p_options) o) <> jsonb_array_length(p_options)
     or (p_closes_at is not null and p_closes_at <= now()) then
    return jsonb_build_object('ok', false, 'code', 'invalid');
  end if;
  insert into public.scd_area_polls (organization_id, area, question, options, closes_at, created_by)
  values (p_organization_id, p_area, left(trim(p_question), 160), p_options, p_closes_at, auth.uid())
  returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;
revoke all on function public.scd_area_poll_create(uuid, text, text, jsonb, timestamptz) from public, anon;
grant execute on function public.scd_area_poll_create(uuid, text, text, jsonb, timestamptz) to authenticated;

-- Open polls (and those closed in the last 7 days) with the caller's vote; counts after voting or after closing.
create or replace function public.scd_area_open_polls(p_organization_id uuid, p_area text)
returns jsonb language sql stable security definer set search_path to 'public' as $$
  select case when not public.scd_area_member(p_organization_id) then '[]'::jsonb else coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', pl.id, 'question', pl.question, 'closesAt', pl.closes_at,
      'closed', pl.closes_at is not null and pl.closes_at <= now(),
      'myVote', mv.option_key,
      'options', (select jsonb_agg(jsonb_build_object('key', o->>'key', 'label', o->>'label',
          'votes', case when mv.option_key is not null or (pl.closes_at is not null and pl.closes_at <= now())
            then (select count(*) from public.scd_area_poll_votes v where v.poll_id = pl.id and v.option_key = o->>'key') else null end))
        from jsonb_array_elements(pl.options) o))
      order by pl.created_at desc)
    from public.scd_area_polls pl
    left join public.scd_area_poll_votes mv on mv.poll_id = pl.id and mv.voter = (select auth.uid())
    where pl.organization_id = p_organization_id and pl.area = p_area and pl.opens_at <= now()
      and (pl.closes_at is null or pl.closes_at > now() - interval '7 days')), '[]'::jsonb) end;
$$;
revoke all on function public.scd_area_open_polls(uuid, text) from public, anon;
grant execute on function public.scd_area_open_polls(uuid, text) to authenticated;

-- Vote (or change the vote) while the poll is open. One vote per member per poll.
create or replace function public.scd_area_poll_vote(p_organization_id uuid, p_poll_id uuid, p_option text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  v_poll public.scd_area_polls;
begin
  if not public.scd_area_member(p_organization_id) then return jsonb_build_object('ok', false, 'code', 'forbidden'); end if;
  select * into v_poll from public.scd_area_polls where id = p_poll_id and organization_id = p_organization_id;
  if v_poll.id is null then return jsonb_build_object('ok', false, 'code', 'invalid'); end if;
  if v_poll.opens_at > now() or (v_poll.closes_at is not null and v_poll.closes_at <= now()) then
    return jsonb_build_object('ok', false, 'code', 'closed');
  end if;
  if not exists (select 1 from jsonb_array_elements(v_poll.options) o where o->>'key' = p_option) then
    return jsonb_build_object('ok', false, 'code', 'option');
  end if;
  insert into public.scd_area_poll_votes (poll_id, voter, option_key) values (p_poll_id, auth.uid(), p_option)
  on conflict (poll_id, voter) do update set option_key = excluded.option_key, voted_at = now();
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.scd_area_poll_vote(uuid, uuid, text) from public, anon;
grant execute on function public.scd_area_poll_vote(uuid, uuid, text) to authenticated;
