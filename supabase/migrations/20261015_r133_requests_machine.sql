-- r133: request machine ("macchina delle richieste"), first case AMICHEVOLE (2026-10-15, chat PC range r130-r149).
-- STAGED: NOT APPLIED. Apply only after Francesco writes "applica r133".
-- Requires (UNVERIFIED on the live project until checked at apply time): r33 (scd_organizations, scd_events,
-- scd_event_scopes, scd_teams), r35 (scd_has_org_role), r74 (scd_has_position).
--
-- Why (UD-154, Francesco 15/10/2026 15:07 and 15:17): a team asks the Segreteria for a friendly match with a message;
-- the Segreteria turns it into a draft, the person in charge of that birth-year group confirms it within 15 days in
-- the app, the match appears in the calendar only after the confirmation, and the Segreteria prints the federal form
-- for the Presidente's signature. One generic table for every kind of request (later TORNEO, PULMINO, CAMPO, VISITA):
-- only AMICHEVOLE is accepted today.
--
-- Who does what (mirror of apps/superapp/src/lib/request-machine.ts REQUEST_CONFIRMERS, kept equal by a test):
--   * Segreteria (SECRETARIAT, REGISTRATION) and Direzione (DIRECTION): create and edit drafts, send them for
--     confirmation, prepare the federal form;
--   * confirmation by birth-year group:
--       - Responsabile Attivita di Base (position responsabile-attivita-base): 2014, 2015, esordienti, pulcini,
--         primicalci, piccoli;
--       - Direttore Sportivo Agonistica (u16, u15) and Direttore Sportivo Generale (prima, u19): these positions do
--         NOT exist in the registry yet (adding a position is a roles change that needs Francesco). Until they exist
--         only the Direzione confirms for those groups (fail closed: nobody else can);
--       - Direzione (DIRECTION role, Presidente position) may always confirm on behalf;
--   * Direttore Generale and Coordinatore Attivita Sportiva see every request and get an in-app notice of every step
--     (rows of scd_request_events with notify_positions, read by scd_request_notices). No e-mail, no external message.
--
-- No personal data: requests are team-level (group key, date, venue, opponent club). Minors never appear.
-- RLS enabled on every new table with NO policies and no grants to anon/authenticated: access only through the
-- SECURITY DEFINER functions below (explicit role checks, fixed search_path, validated input).
-- Expiry: scd_requests_expire(org) marks SCADUTA the requests not confirmed in time; no cron (the app calls it when a
-- list is read).
--
-- Engines: TEMPO (no phone round-trips between Segreteria and teams; the form is prefilled) and PERSONE (families see
-- confirmed friendlies in the calendar). Measure: requests created per month, median hours from draft to
-- confirmation, share expired, minutes of Segreteria per form (paper vs app).
--
-- Additive only, idempotent (create if not exists / create or replace). Nothing existing is changed.
--
-- Rollback (only while no confirmed request has produced calendar rows that must stay; those rows keep
-- source_id 'SCD_RICHIESTE' and can be found and kept or removed by hand):
--   begin;
--   drop function if exists public.scd_request_notices(uuid);
--   drop function if exists public.scd_request_form(uuid, uuid);
--   drop function if exists public.scd_request_set_form_status(uuid, uuid, text);
--   drop function if exists public.scd_request_json(public.scd_requests);
--   drop function if exists public.scd_requests_to_confirm(uuid);
--   drop function if exists public.scd_requests_board(uuid);
--   drop function if exists public.scd_requests_expire(uuid);
--   drop function if exists public.scd_request_cancel(uuid, uuid, text);
--   drop function if exists public.scd_request_decide(uuid, uuid, text, text, uuid);
--   drop function if exists public.scd_request_send(uuid, uuid);
--   drop function if exists public.scd_request_update(uuid, uuid, jsonb);
--   drop function if exists public.scd_request_create(uuid, jsonb);
--   drop function if exists public.scd_club_create(uuid, jsonb);
--   drop function if exists public.scd_clubs_search(uuid, text);
--   drop function if exists public.scd_request_clean(jsonb);
--   drop function if exists public.scd_request_redact(text);
--   drop function if exists public.scd_request_can_confirm(uuid, text);
--   drop function if exists public.scd_request_actor(uuid);
--   drop function if exists public.scd_request_viewer(uuid);
--   drop function if exists public.scd_request_office(uuid);
--   drop function if exists public.scd_request_group_confirmers(text);
--   drop trigger if exists scd_request_events_append_only on public.scd_request_events;
--   drop function if exists public.scd_request_events_block_change();
--   drop table if exists public.scd_request_events;
--   drop table if exists public.scd_requests;
--   drop table if exists public.scd_clubs;
--   commit;

begin;

-- ---------------------------------------------------------------- 1. opponent clubs registry
create table if not exists public.scd_clubs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id),
  name text not null check (char_length(name) between 2 and 120),
  city text check (city is null or char_length(city) between 2 and 80),
  province text check (province is null or province ~ '^[A-Z]{2}$'),
  figc_matricola text check (figc_matricola is null or figc_matricola ~ '^[0-9]{3,10}$'),
  -- slug of config/scd-opponent-crests.v1.json (the only allowed source of opponent crests)
  crest_asset_key text check (crest_asset_key is null or crest_asset_key ~ '^[a-z0-9-]{2,80}$'),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists scd_clubs_name_city_uidx
  on public.scd_clubs (organization_id, lower(name), lower(coalesce(city, '')));
alter table public.scd_clubs enable row level security;
revoke all on table public.scd_clubs from anon, authenticated;

-- ---------------------------------------------------------------- 2. requests (generic)
create table if not exists public.scd_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id),
  kind text not null check (kind in ('AMICHEVOLE')),
  channel text not null check (channel in ('WHATSAPP','EMAIL','APP','SEGRETERIA')),
  raw_text text check (raw_text is null or char_length(raw_text) <= 1000),
  payload jsonb not null default '{}'::jsonb
    check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 2000),
  team_key text check (team_key is null or team_key ~ '^[a-z0-9]{2,20}$'),
  proposed_starts_at timestamptz,
  venue_text text check (venue_text is null or char_length(venue_text) <= 160),
  opponent_club_id uuid references public.scd_clubs(id),
  opponent_text text check (opponent_text is null or char_length(opponent_text) <= 120),
  status text not null default 'BOZZA'
    check (status in ('BOZZA','DA_CONFERMARE','CONFERMATA','RIFIUTATA','SCADUTA','ANNULLATA')),
  expires_at timestamptz not null default (now() + interval '15 days'),
  sent_at timestamptz,
  confirmed_by uuid,
  confirmed_at timestamptz,
  decision_note text check (decision_note is null or char_length(decision_note) <= 300),
  event_id uuid references public.scd_events(id),
  form_status text check (form_status is null or form_status in ('DA_PREPARARE','PRONTO','FIRMATO','INVIATO')),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'CONFERMATA' or (confirmed_at is not null and event_id is not null and form_status is not null))
);
create index if not exists scd_requests_board_idx on public.scd_requests (organization_id, status, created_at desc);
create index if not exists scd_requests_expiry_idx on public.scd_requests (organization_id, expires_at) where status = 'DA_CONFERMARE';
create index if not exists scd_requests_team_idx on public.scd_requests (organization_id, team_key, status);
alter table public.scd_requests enable row level security;
revoke all on table public.scd_requests from anon, authenticated;

-- ---------------------------------------------------------------- 3. append-only log (also the in-app notices)
create table if not exists public.scd_request_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null,
  request_id uuid not null references public.scd_requests(id),
  action text not null check (action in ('CREATA','MODIFICATA','INVIATA','CONFERMATA','RIFIUTATA','SCADUTA','ANNULLATA','MODULO')),
  actor uuid,
  note text check (note is null or char_length(note) <= 300),
  -- positions told in the app about this step (Direttore Generale and Coordinatore always)
  notify_positions text[] not null default array['direttore-generale','coordinatore-attivita-sportiva'],
  at timestamptz not null default now()
);
create index if not exists scd_request_events_req_idx on public.scd_request_events (request_id, at);
create index if not exists scd_request_events_org_idx on public.scd_request_events (organization_id, at desc);
alter table public.scd_request_events enable row level security;
revoke all on table public.scd_request_events from anon, authenticated;

create or replace function public.scd_request_events_block_change()
returns trigger language plpgsql set search_path to 'public' as $$
begin
  raise exception 'scd_request_events is append-only' using errcode = '42501';
end;
$$;
revoke all on function public.scd_request_events_block_change() from public, anon, authenticated;
drop trigger if exists scd_request_events_append_only on public.scd_request_events;
create trigger scd_request_events_append_only before update or delete on public.scd_request_events
  for each row execute function public.scd_request_events_block_change();

-- ---------------------------------------------------------------- 4. who is who
-- Confirmer positions of a birth-year group. NULL = unknown group (refused). Empty array = only the Direzione
-- (the Direttore Sportivo positions are not in the registry yet). Mirror of REQUEST_CONFIRMERS.
create or replace function public.scd_request_group_confirmers(p_team_key text)
returns text[] language sql immutable set search_path to 'public' as $$
  select case
    when p_team_key in ('2014','2015','esordienti','pulcini','primicalci','piccoli') then array['responsabile-attivita-base']
    when p_team_key in ('u16','u15') then array[]::text[]
    when p_team_key in ('prima','u19') then array[]::text[]
    else null
  end;
$$;
revoke all on function public.scd_request_group_confirmers(text) from public, anon, authenticated;

-- Segreteria and Direzione: drafts and federal form.
create or replace function public.scd_request_office(p_organization_id uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select auth.uid() is not null
    and public.scd_has_org_role(p_organization_id, array['DIRECTION','SECRETARIAT','REGISTRATION']::public.scd_role[]);
$$;
revoke all on function public.scd_request_office(uuid) from public, anon, authenticated;

-- Everybody who sees every request: office, Presidente, Direttore Generale, Coordinatore Attivita Sportiva.
create or replace function public.scd_request_viewer(p_organization_id uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select auth.uid() is not null and (
    public.scd_request_office(p_organization_id)
    or public.scd_has_position(p_organization_id, array['presidente','direttore-generale','coordinatore-attivita-sportiva']));
$$;
revoke all on function public.scd_request_viewer(uuid) from public, anon, authenticated;

-- Anybody with a part in the machine (viewer or confirmer of at least one group): may search and add clubs.
create or replace function public.scd_request_actor(p_organization_id uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select auth.uid() is not null and (
    public.scd_request_viewer(p_organization_id)
    or public.scd_has_position(p_organization_id, array['responsabile-attivita-base']));
$$;
revoke all on function public.scd_request_actor(uuid) from public, anon, authenticated;

-- May confirm a request of this group: Direzione (role or Presidente) always, otherwise the group's confirmer.
create or replace function public.scd_request_can_confirm(p_organization_id uuid, p_team_key text)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select auth.uid() is not null
    and public.scd_request_group_confirmers(p_team_key) is not null
    and (
      public.scd_has_org_role(p_organization_id, array['DIRECTION']::public.scd_role[])
      or public.scd_has_position(p_organization_id, array['presidente'])
      or (cardinality(public.scd_request_group_confirmers(p_team_key)) > 0
          and public.scd_has_position(p_organization_id, public.scd_request_group_confirmers(p_team_key))));
$$;
revoke all on function public.scd_request_can_confirm(uuid, text) from public, anon, authenticated;

-- ---------------------------------------------------------------- 5a. redaction of contacts in free text
-- Phone numbers (9+ digits, optional +/00 prefix, spaces or dashes) and e-mail addresses become [telefono] / [email]
-- before anything is stored. Mirror of lib/request-machine.ts redactContacts (same patterns, tested on both sides).
create or replace function public.scd_request_redact(p_text text)
returns text language sql immutable set search_path to 'public' as $$
  select case when p_text is null then null else
    regexp_replace(
      regexp_replace(p_text, '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', '[email]', 'g'),
      '(\+|00)?[0-9]([ -]?[0-9]){8,}', '[telefono]', 'g')
  end;
$$;
revoke all on function public.scd_request_redact(text) from public, anon, authenticated;

-- ---------------------------------------------------------------- 5. input cleaning (mirror of lib/request-machine.ts validateDraft)
-- Returns the cleaned draft or {"error": code}. The browser is never trusted.
create or replace function public.scd_request_clean(p jsonb)
returns jsonb language plpgsql stable set search_path to 'public' as $$
declare
  v_team text := nullif(btrim(coalesce(p->>'teamKey', '')), '');
  v_starts timestamptz;
  v_venue text := nullif(left(btrim(coalesce(p->>'venue', '')), 160), '');
  v_opp text := nullif(left(btrim(coalesce(p->>'opponentText', '')), 120), '');
  v_club uuid;
  v_home text := nullif(p->>'homeAway', '');
  -- territorial scope of the friendly (federal notice period): Lombardy opponents are REGIONALE/PROVINCIALE/LOCALE
  v_scope text := nullif(p->>'scope', '');
  v_note text := nullif(left(btrim(public.scd_request_redact(coalesce(p->>'note', ''))), 300), '');
  v_raw text := nullif(btrim(public.scd_request_redact(coalesce(p->>'rawText', ''))), '');
  v_channel text := coalesce(nullif(p->>'channel', ''), 'SEGRETERIA');
begin
  if p is null or jsonb_typeof(p) <> 'object' or octet_length(p::text) > 4000 then return jsonb_build_object('error', 'invalid'); end if;
  if v_team is not null and public.scd_request_group_confirmers(v_team) is null then return jsonb_build_object('error', 'team'); end if;
  if v_home is not null and v_home not in ('CASA','FUORI') then return jsonb_build_object('error', 'invalid'); end if;
  if v_scope is not null and v_scope not in ('LOCALE','PROVINCIALE','REGIONALE','NAZIONALE','INTERNAZIONALE','ESTERO') then
    return jsonb_build_object('error', 'invalid');
  end if;
  -- Piccoli Amici: no national or international friendlies (CU n.5 SGS 2026/27 par. 4)
  if v_team = 'piccoli' and v_scope in ('NAZIONALE','INTERNAZIONALE','ESTERO') then return jsonb_build_object('error', 'scope'); end if;
  if v_channel not in ('WHATSAPP','EMAIL','APP','SEGRETERIA') then return jsonb_build_object('error', 'invalid'); end if;
  if v_raw is not null and char_length(p->>'rawText') > 1000 then return jsonb_build_object('error', 'too_long'); end if;
  begin
    v_starts := nullif(p->>'startsAt', '')::timestamptz;
    v_club := nullif(p->>'opponentClubId', '')::uuid;
  exception when others then
    return jsonb_build_object('error', 'invalid');
  end;
  if v_starts is not null and (v_starts < now() or v_starts > now() + interval '400 days') then
    return jsonb_build_object('error', 'date');
  end if;
  return jsonb_build_object('teamKey', v_team, 'startsAt', v_starts, 'venue', v_venue, 'opponentText', v_opp,
    'opponentClubId', v_club, 'homeAway', v_home, 'scope', v_scope, 'note', v_note, 'rawText', v_raw, 'channel', v_channel);
end;
$$;
revoke all on function public.scd_request_clean(jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------- 6. clubs
create or replace function public.scd_clubs_search(p_organization_id uuid, p_query text)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
declare
  v_q text := btrim(coalesce(p_query, ''));
begin
  if not public.scd_request_actor(p_organization_id) then raise exception 'forbidden' using errcode = '42501'; end if;
  if char_length(v_q) < 2 or char_length(v_q) > 60 then return '[]'::jsonb; end if;
  v_q := replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_');
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'city', c.city, 'province', c.province,
      'figcMatricola', c.figc_matricola, 'crestKey', c.crest_asset_key) order by c.name)
    from (select * from public.scd_clubs
          where organization_id = p_organization_id and (name ilike '%' || v_q || '%' or city ilike '%' || v_q || '%')
          order by name limit 10) c), '[]'::jsonb);
end;
$$;
revoke all on function public.scd_clubs_search(uuid, text) from public, anon;
grant execute on function public.scd_clubs_search(uuid, text) to authenticated;

-- Add an opponent club. Same name and city again returns the existing one ("exists"), never a duplicate.
create or replace function public.scd_club_create(p_organization_id uuid, p jsonb)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  v_name text := regexp_replace(btrim(coalesce(p->>'name', '')), '\s+', ' ', 'g');
  v_city text := nullif(regexp_replace(btrim(coalesce(p->>'city', '')), '\s+', ' ', 'g'), '');
  v_prov text := nullif(upper(btrim(coalesce(p->>'province', ''))), '');
  v_mat text := nullif(btrim(coalesce(p->>'figcMatricola', '')), '');
  v_crest text := nullif(btrim(coalesce(p->>'crestKey', '')), '');
  v_id uuid;
begin
  if not public.scd_request_actor(p_organization_id) then return jsonb_build_object('ok', false, 'code', 'forbidden'); end if;
  if p is null or jsonb_typeof(p) <> 'object' or char_length(v_name) not between 2 and 120
     or (v_city is not null and char_length(v_city) not between 2 and 80)
     or (v_prov is not null and v_prov !~ '^[A-Z]{2}$')
     or (v_mat is not null and v_mat !~ '^[0-9]{3,10}$')
     or (v_crest is not null and v_crest !~ '^[a-z0-9-]{2,80}$') then
    return jsonb_build_object('ok', false, 'code', 'invalid');
  end if;
  select id into v_id from public.scd_clubs
    where organization_id = p_organization_id and lower(name) = lower(v_name) and lower(coalesce(city, '')) = lower(coalesce(v_city, ''));
  if v_id is not null then return jsonb_build_object('ok', true, 'id', v_id, 'existing', true); end if;
  insert into public.scd_clubs (organization_id, name, city, province, figc_matricola, crest_asset_key, created_by)
  values (p_organization_id, v_name, v_city, v_prov, v_mat, v_crest, auth.uid())
  on conflict do nothing
  returning id into v_id;
  if v_id is null then
    select id into v_id from public.scd_clubs
      where organization_id = p_organization_id and lower(name) = lower(v_name) and lower(coalesce(city, '')) = lower(coalesce(v_city, ''));
    return jsonb_build_object('ok', true, 'id', v_id, 'existing', true);
  end if;
  return jsonb_build_object('ok', true, 'id', v_id, 'existing', false);
end;
$$;
revoke all on function public.scd_club_create(uuid, jsonb) from public, anon;
grant execute on function public.scd_club_create(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------- 7. drafts (Segreteria)
create or replace function public.scd_request_create(p_organization_id uuid, p jsonb)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  c jsonb;
  v_id uuid;
begin
  if not public.scd_request_office(p_organization_id) then return jsonb_build_object('ok', false, 'code', 'forbidden'); end if;
  if coalesce(p->>'kind', '') <> 'AMICHEVOLE' then return jsonb_build_object('ok', false, 'code', 'kind'); end if;
  c := public.scd_request_clean(p);
  if c ? 'error' then return jsonb_build_object('ok', false, 'code', c->>'error'); end if;
  if (c->>'opponentClubId') is not null and not exists (
       select 1 from public.scd_clubs where id = (c->>'opponentClubId')::uuid and organization_id = p_organization_id) then
    return jsonb_build_object('ok', false, 'code', 'club');
  end if;
  insert into public.scd_requests (organization_id, kind, channel, raw_text, payload, team_key, proposed_starts_at,
    venue_text, opponent_club_id, opponent_text, created_by)
  values (p_organization_id, 'AMICHEVOLE', c->>'channel', c->>'rawText',
    jsonb_strip_nulls(jsonb_build_object('homeAway', c->>'homeAway', 'scope', c->>'scope', 'note', c->>'note')),
    c->>'teamKey', (c->>'startsAt')::timestamptz, c->>'venue', (c->>'opponentClubId')::uuid, c->>'opponentText', auth.uid())
  returning id into v_id;
  insert into public.scd_request_events (organization_id, request_id, action, actor) values (p_organization_id, v_id, 'CREATA', auth.uid());
  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;
revoke all on function public.scd_request_create(uuid, jsonb) from public, anon;
grant execute on function public.scd_request_create(uuid, jsonb) to authenticated;

-- Edit a draft (BOZZA) or a request still waiting (DA_CONFERMARE). raw_text and channel never change.
create or replace function public.scd_request_update(p_organization_id uuid, p_request_id uuid, p jsonb)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  c jsonb;
  r public.scd_requests;
begin
  if not public.scd_request_office(p_organization_id) then return jsonb_build_object('ok', false, 'code', 'forbidden'); end if;
  select * into r from public.scd_requests where id = p_request_id and organization_id = p_organization_id for update;
  if r.id is null then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  if r.status not in ('BOZZA','DA_CONFERMARE') then return jsonb_build_object('ok', false, 'code', 'state'); end if;
  c := public.scd_request_clean(p);
  if c ? 'error' then return jsonb_build_object('ok', false, 'code', c->>'error'); end if;
  if (c->>'opponentClubId') is not null and not exists (
       select 1 from public.scd_clubs where id = (c->>'opponentClubId')::uuid and organization_id = p_organization_id) then
    return jsonb_build_object('ok', false, 'code', 'club');
  end if;
  if r.status = 'DA_CONFERMARE' and ((c->>'teamKey') is null or (c->>'startsAt') is null) then
    return jsonb_build_object('ok', false, 'code', 'incomplete');
  end if;
  update public.scd_requests set
    team_key = c->>'teamKey', proposed_starts_at = (c->>'startsAt')::timestamptz, venue_text = c->>'venue',
    opponent_club_id = (c->>'opponentClubId')::uuid, opponent_text = c->>'opponentText',
    payload = jsonb_strip_nulls(jsonb_build_object('homeAway', c->>'homeAway', 'scope', c->>'scope', 'note', c->>'note')),
    expires_at = case when r.status = 'DA_CONFERMARE'
      then least(r.expires_at, greatest((c->>'startsAt')::timestamptz, now())) else r.expires_at end,
    updated_at = now()
  where id = p_request_id;
  insert into public.scd_request_events (organization_id, request_id, action, actor) values (p_organization_id, p_request_id, 'MODIFICATA', auth.uid());
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.scd_request_update(uuid, uuid, jsonb) from public, anon;
grant execute on function public.scd_request_update(uuid, uuid, jsonb) to authenticated;

-- Send a complete draft to the person who confirms: 15 days from now, never later than the match itself.
create or replace function public.scd_request_send(p_organization_id uuid, p_request_id uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  r public.scd_requests;
begin
  if not public.scd_request_office(p_organization_id) then return jsonb_build_object('ok', false, 'code', 'forbidden'); end if;
  select * into r from public.scd_requests where id = p_request_id and organization_id = p_organization_id for update;
  if r.id is null then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  if r.status <> 'BOZZA' then return jsonb_build_object('ok', false, 'code', 'state'); end if;
  if r.team_key is null or r.proposed_starts_at is null or (r.opponent_club_id is null and r.opponent_text is null) then
    return jsonb_build_object('ok', false, 'code', 'incomplete');
  end if;
  if r.proposed_starts_at <= now() then return jsonb_build_object('ok', false, 'code', 'date'); end if;
  update public.scd_requests set status = 'DA_CONFERMARE', sent_at = now(),
    expires_at = least(now() + interval '15 days', r.proposed_starts_at), updated_at = now()
  where id = p_request_id;
  insert into public.scd_request_events (organization_id, request_id, action, actor, notify_positions)
  values (p_organization_id, p_request_id, 'INVIATA', auth.uid(),
    array['direttore-generale','coordinatore-attivita-sportiva'] || public.scd_request_group_confirmers(r.team_key));
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.scd_request_send(uuid, uuid) from public, anon;
grant execute on function public.scd_request_send(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------- 8. expiry (no cron)
create or replace function public.scd_requests_expire(p_organization_id uuid)
returns integer language plpgsql security definer set search_path to 'public' as $$
declare
  v_n integer;
begin
  if not public.scd_request_actor(p_organization_id) then return 0; end if;
  with gone as (
    update public.scd_requests set status = 'SCADUTA', updated_at = now()
    where organization_id = p_organization_id and status = 'DA_CONFERMARE' and expires_at <= now()
    returning id
  ), logged as (
    insert into public.scd_request_events (organization_id, request_id, action, actor, note)
    select p_organization_id, id, 'SCADUTA', null, 'Nessuna conferma entro il termine' from gone
    returning 1
  )
  select count(*) into v_n from logged;
  return v_n;
end;
$$;
revoke all on function public.scd_requests_expire(uuid) from public, anon;
grant execute on function public.scd_requests_expire(uuid) to authenticated;

-- ---------------------------------------------------------------- 9. decision (confirmer)
-- CONFERMA: the opponent must be a registered club (picked in the search bar or added as "Nuova societa");
-- a PLANNED, PUBLIC calendar row is created (team-level data only) and the federal form waits for the Segreteria.
create or replace function public.scd_request_decide(p_organization_id uuid, p_request_id uuid, p_decision text, p_note text, p_opponent_club_id uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  r public.scd_requests;
  v_club public.scd_clubs;
  v_event uuid;
  v_team uuid;
  v_note text := nullif(left(btrim(public.scd_request_redact(coalesce(p_note, ''))), 300), '');
  v_loc text;
begin
  if p_decision not in ('CONFERMA','RIFIUTA') then return jsonb_build_object('ok', false, 'code', 'invalid'); end if;
  select * into r from public.scd_requests where id = p_request_id and organization_id = p_organization_id for update;
  if r.id is null then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  if not public.scd_request_can_confirm(p_organization_id, r.team_key) then return jsonb_build_object('ok', false, 'code', 'forbidden'); end if;
  if r.status <> 'DA_CONFERMARE' then return jsonb_build_object('ok', false, 'code', 'state'); end if;
  if r.expires_at <= now() then
    update public.scd_requests set status = 'SCADUTA', updated_at = now() where id = r.id;
    insert into public.scd_request_events (organization_id, request_id, action, actor, note)
    values (p_organization_id, r.id, 'SCADUTA', null, 'Nessuna conferma entro il termine');
    return jsonb_build_object('ok', false, 'code', 'expired');
  end if;

  if p_decision = 'RIFIUTA' then
    update public.scd_requests set status = 'RIFIUTATA', confirmed_by = auth.uid(), confirmed_at = now(),
      decision_note = v_note, updated_at = now() where id = r.id;
    insert into public.scd_request_events (organization_id, request_id, action, actor, note)
    values (p_organization_id, r.id, 'RIFIUTATA', auth.uid(), v_note);
    return jsonb_build_object('ok', true);
  end if;

  select * into v_club from public.scd_clubs
    where id = coalesce(p_opponent_club_id, r.opponent_club_id) and organization_id = p_organization_id;
  if v_club.id is null then return jsonb_build_object('ok', false, 'code', 'club'); end if;
  if r.proposed_starts_at is null or r.proposed_starts_at <= now() then return jsonb_build_object('ok', false, 'code', 'date'); end if;

  -- Public location: only a known facility of the club, or "Trasferta" with the opponent's city; free text never.
  -- Mirror of lib/request-machine.ts publicLocation.
  v_loc := case
    when r.payload->>'homeAway' = 'FUORI' then 'Trasferta' || coalesce(' · ' || v_club.city, '')
    when r.venue_text ~* '^\s*colico\M.*\mcampo\s*1\s*$' then 'Colico · Campo 1'
    when r.venue_text ~* '^\s*colico\M.*\mcampo\s*2\s*$' then 'Colico · Campo 2'
    when r.venue_text ~* '^\s*colico\s*$' then 'Colico'
    when r.venue_text ~* '^\s*dervio\M' then 'Dervio'
    else null
  end;
  insert into public.scd_events (organization_id, event_type, title, starts_at, status, visibility, location_text,
    source_id, source_record_id, source_verified_at, source_confidence, metadata)
  values (p_organization_id, 'AMICHEVOLE', left('Amichevole ' || r.team_key || ' - ' || v_club.name, 200), r.proposed_starts_at,
    'PLANNED', 'PUBLIC', v_loc, 'SCD_RICHIESTE', r.id::text, now(), 100,
    jsonb_strip_nulls(jsonb_build_object('teamKey', r.team_key, 'opponent', v_club.name, 'opponentClubId', v_club.id,
      'crestKey', v_club.crest_asset_key, 'homeAway', r.payload->>'homeAway', 'requestId', r.id)))
  returning id into v_event;

  select t.id into v_team from public.scd_teams t
    where t.organization_id = p_organization_id
      and t.code = case when r.team_key = 'piccoli' then 'piccoliamici' else r.team_key end
    order by t.created_at desc limit 1;
  if v_team is not null then
    insert into public.scd_event_scopes (organization_id, event_id, team_id) values (p_organization_id, v_event, v_team);
  end if;

  update public.scd_requests set status = 'CONFERMATA', opponent_club_id = v_club.id, confirmed_by = auth.uid(),
    confirmed_at = now(), decision_note = v_note, event_id = v_event, form_status = 'DA_PREPARARE', updated_at = now()
  where id = r.id;
  insert into public.scd_request_events (organization_id, request_id, action, actor, note)
  values (p_organization_id, r.id, 'CONFERMATA', auth.uid(), coalesce(v_note, 'Modulo amichevole da preparare in Segreteria'));
  return jsonb_build_object('ok', true, 'eventId', v_event);
end;
$$;
revoke all on function public.scd_request_decide(uuid, uuid, text, text, uuid) from public, anon;
grant execute on function public.scd_request_decide(uuid, uuid, text, text, uuid) to authenticated;

-- Cancel a request nobody has confirmed yet (office or Direzione).
create or replace function public.scd_request_cancel(p_organization_id uuid, p_request_id uuid, p_note text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
begin
  if not public.scd_request_office(p_organization_id) then return jsonb_build_object('ok', false, 'code', 'forbidden'); end if;
  update public.scd_requests set status = 'ANNULLATA', decision_note = nullif(left(btrim(coalesce(p_note, '')), 300), ''), updated_at = now()
  where id = p_request_id and organization_id = p_organization_id and status in ('BOZZA','DA_CONFERMARE');
  if not found then return jsonb_build_object('ok', false, 'code', 'state'); end if;
  insert into public.scd_request_events (organization_id, request_id, action, actor, note)
  values (p_organization_id, p_request_id, 'ANNULLATA', auth.uid(), nullif(left(btrim(coalesce(p_note, '')), 300), ''));
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.scd_request_cancel(uuid, uuid, text) from public, anon;
grant execute on function public.scd_request_cancel(uuid, uuid, text) to authenticated;

-- Federal form: forward only DA_PREPARARE -> PRONTO -> FIRMATO -> INVIATO (sending is done by a person, outside the app).
create or replace function public.scd_request_set_form_status(p_organization_id uuid, p_request_id uuid, p_form_status text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  r public.scd_requests;
  v_order text[] := array['DA_PREPARARE','PRONTO','FIRMATO','INVIATO'];
begin
  if not public.scd_request_office(p_organization_id) then return jsonb_build_object('ok', false, 'code', 'forbidden'); end if;
  if p_form_status is null or not (p_form_status = any(v_order)) then return jsonb_build_object('ok', false, 'code', 'invalid'); end if;
  select * into r from public.scd_requests where id = p_request_id and organization_id = p_organization_id for update;
  if r.id is null then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  if r.status <> 'CONFERMATA' then return jsonb_build_object('ok', false, 'code', 'state'); end if;
  if array_position(v_order, p_form_status) <> array_position(v_order, r.form_status) + 1 then
    return jsonb_build_object('ok', false, 'code', 'state');
  end if;
  update public.scd_requests set form_status = p_form_status, updated_at = now() where id = r.id;
  insert into public.scd_request_events (organization_id, request_id, action, actor, note)
  values (p_organization_id, r.id, 'MODULO', auth.uid(), 'Modulo: ' || p_form_status);
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.scd_request_set_form_status(uuid, uuid, text) from public, anon;
grant execute on function public.scd_request_set_form_status(uuid, uuid, text) to authenticated;

-- ---------------------------------------------------------------- 10. reads
create or replace function public.scd_request_json(r public.scd_requests)
returns jsonb language sql stable set search_path to 'public' as $$
  select jsonb_build_object('id', r.id, 'kind', r.kind, 'channel', r.channel, 'rawText', r.raw_text, 'teamKey', r.team_key,
    'startsAt', r.proposed_starts_at, 'venue', r.venue_text, 'homeAway', r.payload->>'homeAway', 'scope', r.payload->>'scope', 'note', r.payload->>'note',
    'opponentText', r.opponent_text, 'status', r.status, 'expiresAt', r.expires_at, 'sentAt', r.sent_at,
    'confirmedAt', r.confirmed_at, 'decisionNote', r.decision_note, 'eventId', r.event_id, 'formStatus', r.form_status,
    'createdAt', r.created_at,
    'club', (select jsonb_build_object('id', c.id, 'name', c.name, 'city', c.city, 'province', c.province,
      'figcMatricola', c.figc_matricola, 'crestKey', c.crest_asset_key) from public.scd_clubs c where c.id = r.opponent_club_id));
$$;
revoke all on function public.scd_request_json(public.scd_requests) from public, anon, authenticated;

-- Board of the Segreteria and of who sees everything: open requests and the last 60 days.
create or replace function public.scd_requests_board(p_organization_id uuid)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
begin
  if not public.scd_request_viewer(p_organization_id) then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(public.scd_request_json(r) order by r.created_at desc)
    from public.scd_requests r
    where r.organization_id = p_organization_id
      and (r.status in ('BOZZA','DA_CONFERMARE') or (r.status = 'CONFERMATA' and r.form_status <> 'INVIATO')
           or r.updated_at > now() - interval '60 days')), '[]'::jsonb);
end;
$$;
revoke all on function public.scd_requests_board(uuid) from public, anon;
grant execute on function public.scd_requests_board(uuid) to authenticated;

-- What the caller has to confirm (only groups the caller may confirm) and the answers of the last 14 days.
create or replace function public.scd_requests_to_confirm(p_organization_id uuid)
returns jsonb language sql stable security definer set search_path to 'public' as $$
  select case when auth.uid() is null then '[]'::jsonb else coalesce((
    select jsonb_agg(public.scd_request_json(r) order by r.expires_at)
    from public.scd_requests r
    where r.organization_id = p_organization_id
      and (r.status = 'DA_CONFERMARE' or (r.status in ('CONFERMATA','RIFIUTATA','SCADUTA') and r.updated_at > now() - interval '14 days'))
      and public.scd_request_can_confirm(p_organization_id, r.team_key)), '[]'::jsonb) end;
$$;
revoke all on function public.scd_requests_to_confirm(uuid) from public, anon;
grant execute on function public.scd_requests_to_confirm(uuid) to authenticated;

-- Printable federal form data (office and viewers).
create or replace function public.scd_request_form(p_organization_id uuid, p_request_id uuid)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
declare
  r public.scd_requests;
begin
  if not public.scd_request_viewer(p_organization_id) then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into r from public.scd_requests where id = p_request_id and organization_id = p_organization_id;
  if r.id is null then return null; end if;
  return public.scd_request_json(r) || jsonb_build_object('organization',
    (select o.name from public.scd_organizations o where o.id = p_organization_id));
end;
$$;
revoke all on function public.scd_request_form(uuid, uuid) from public, anon;
grant execute on function public.scd_request_form(uuid, uuid) to authenticated;

-- In-app notices: steps of the last 30 days for the caller's positions (Direttore Generale, Coordinatore, and the
-- group confirmer when a request is sent), and every step for the Direzione. No e-mail, no external message.
create or replace function public.scd_request_notices(p_organization_id uuid)
returns jsonb language sql stable security definer set search_path to 'public' as $$
  select case when auth.uid() is null then '[]'::jsonb else coalesce((
    select jsonb_agg(jsonb_build_object('at', e.at, 'action', e.action, 'note', e.note, 'requestId', r.id,
      'teamKey', r.team_key, 'startsAt', r.proposed_starts_at, 'status', r.status,
      'opponent', coalesce((select c.name from public.scd_clubs c where c.id = r.opponent_club_id), r.opponent_text)) order by e.at desc)
    from (select * from public.scd_request_events
          where organization_id = p_organization_id and at > now() - interval '30 days'
          order by at desc limit 50) e
    join public.scd_requests r on r.id = e.request_id
    where public.scd_has_org_role(p_organization_id, array['DIRECTION']::public.scd_role[])
       or public.scd_has_position(p_organization_id, e.notify_positions)), '[]'::jsonb) end;
$$;
revoke all on function public.scd_request_notices(uuid) from public, anon;
grant execute on function public.scd_request_notices(uuid) to authenticated;

comment on table public.scd_requests is 'r133: generic request machine (UD-154). Only AMICHEVOLE today. Team-level, no personal data.';
comment on table public.scd_request_events is 'r133: append-only log of every step; notify_positions drives the in-app notices.';
comment on table public.scd_clubs is 'r133: opponent clubs registry (name, city, province, FIGC number, crest slug from config/scd-opponent-crests.v1.json).';

commit;
