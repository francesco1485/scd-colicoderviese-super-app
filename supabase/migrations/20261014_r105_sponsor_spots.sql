-- r105 (STAGED, DO NOT APPLY without explicit Direzione approval): spot register of the sponsor LED spots
-- (UD-119, Francesco 14/10/2026 18:14: "Poi Presidente o commerciale propone lo spot allo sponsor, che accetta o chiede
-- modifiche; tutto è gestito dal vivo attraverso l'app, che alimenta anche il LED wall").
--   * one row per spot of a confirmed sponsor (slug of apps/superapp/src/lib/sponsors.ts) with its status:
--     DA_APPROVARE -> APPROVATO | MODIFICHE_RICHIESTE; MODIFICHE_RICHIESTE -> DA_APPROVARE (new version proposed);
--     APPROVATO -> IN_ONDA; DA_APPROVARE -> IN_ONDA (Francesco: spots rotate now, approval follows);
--     IN_ONDA -> MODIFICHE_RICHIESTE (the sponsor asks for a change later);
--   * the sponsor's feedback (what to change) is written by the office that received it (sponsors have no account);
--   * every change is logged in an audit table: who, when, from which status to which, feedback.
-- Who writes: the club office of the sponsor area (Direzione org role, presidente, direttore-generale). A dedicated
-- "commerciale" position does not exist in the roles register yet: add it there (manifest change) before granting it.
-- The public home and the LED wall player never read these tables directly: the server reads the showable spots
-- through scd_sponsor_spot_showable (service role only); a spot with MODIFICHE_RICHIESTE is never returned.
-- No amounts, no contracts, no personal data. Additive only: new tables and functions, nothing existing is changed.
-- Until this migration is applied the app reads the status from apps/superapp/src/lib/sponsor-spots.ts.

create table if not exists public.scd_sponsor_spots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id),
  sponsor_slug text not null check (sponsor_slug ~ '^[a-z0-9-]{2,60}$'),
  spot_key text not null default 'led-2026-27' check (spot_key ~ '^[a-z0-9-]{2,40}$'),
  master_path text not null check (master_path ~ '^/media/ledwall/[a-z0-9/_.-]+\.mp4$'),
  preview_path text check (preview_path is null or preview_path ~ '^/media/ledwall/[a-z0-9/_.-]+\.mp4$'),
  drive_file_id text check (drive_file_id is null or drive_file_id ~ '^[A-Za-z0-9_-]{10,80}$'),
  status text not null default 'DA_APPROVARE' check (status in ('DA_APPROVARE', 'MODIFICHE_RICHIESTE', 'APPROVATO', 'IN_ONDA')),
  sponsor_feedback text check (sponsor_feedback is null or char_length(sponsor_feedback) <= 600),
  proposed_by uuid,
  proposed_at timestamptz not null default now(),
  status_changed_by uuid,
  status_changed_at timestamptz not null default now(),
  retired boolean not null default false,
  unique (organization_id, sponsor_slug, spot_key)
);
create index if not exists scd_sponsor_spots_board on public.scd_sponsor_spots (organization_id, status, retired);
alter table public.scd_sponsor_spots enable row level security;
revoke all on table public.scd_sponsor_spots from anon, authenticated;

create table if not exists public.scd_sponsor_spot_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null,
  spot_id uuid not null references public.scd_sponsor_spots(id),
  action text not null check (action in ('PROPOSTO', 'STATO', 'RITIRATO')),
  from_status text check (from_status is null or from_status in ('DA_APPROVARE', 'MODIFICHE_RICHIESTE', 'APPROVATO', 'IN_ONDA')),
  to_status text check (to_status is null or to_status in ('DA_APPROVARE', 'MODIFICHE_RICHIESTE', 'APPROVATO', 'IN_ONDA')),
  feedback text check (feedback is null or char_length(feedback) <= 600),
  actor uuid,
  at timestamptz not null default now()
);
create index if not exists scd_sponsor_spot_events_spot on public.scd_sponsor_spot_events (spot_id, at desc);
alter table public.scd_sponsor_spot_events enable row level security;
revoke all on table public.scd_sponsor_spot_events from anon, authenticated;

-- Office of the sponsor area.
create or replace function public.scd_spot_office(p_organization_id uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select auth.uid() is not null and (
    public.scd_has_org_role(p_organization_id, array['DIRECTION']::public.scd_role[])
    or public.scd_has_position(p_organization_id, array['presidente','direttore-generale']));
$$;
revoke all on function public.scd_spot_office(uuid) from public, anon;

-- Allowed status changes (mirrors the comment at the top of this file).
create or replace function public.scd_spot_transition_ok(p_from text, p_to text)
returns boolean language sql immutable security definer set search_path to 'public' as $$
  select (p_from, p_to) in (
    ('DA_APPROVARE', 'APPROVATO'), ('DA_APPROVARE', 'MODIFICHE_RICHIESTE'), ('DA_APPROVARE', 'IN_ONDA'),
    ('MODIFICHE_RICHIESTE', 'DA_APPROVARE'), ('APPROVATO', 'IN_ONDA'), ('APPROVATO', 'MODIFICHE_RICHIESTE'),
    ('IN_ONDA', 'MODIFICHE_RICHIESTE'));
$$;
revoke all on function public.scd_spot_transition_ok(text, text) from public, anon;

-- Propose a spot (or a new version after MODIFICHE_RICHIESTE): status back to DA_APPROVARE, feedback kept in the log.
create or replace function public.scd_sponsor_spot_propose(
  p_organization_id uuid, p_sponsor_slug text, p_spot_key text, p_master_path text, p_preview_path text, p_drive_file_id text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_row public.scd_sponsor_spots%rowtype;
  v_from text;
begin
  if not public.scd_spot_office(p_organization_id) then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  if p_sponsor_slug !~ '^[a-z0-9-]{2,60}$' or coalesce(p_spot_key, '') !~ '^[a-z0-9-]{2,40}$'
     or p_master_path !~ '^/media/ledwall/[a-z0-9/_.-]+\.mp4$'
     or (p_preview_path is not null and p_preview_path !~ '^/media/ledwall/[a-z0-9/_.-]+\.mp4$')
     or (p_drive_file_id is not null and p_drive_file_id !~ '^[A-Za-z0-9_-]{10,80}$') then
    return jsonb_build_object('ok', false, 'code', 'invalid');
  end if;
  select * into v_row from public.scd_sponsor_spots
    where organization_id = p_organization_id and sponsor_slug = p_sponsor_slug and spot_key = p_spot_key for update;
  if found then
    v_from := v_row.status;
    if v_row.status not in ('DA_APPROVARE', 'MODIFICHE_RICHIESTE') then
      return jsonb_build_object('ok', false, 'code', 'not_allowed');
    end if;
    update public.scd_sponsor_spots set master_path = p_master_path, preview_path = p_preview_path,
      drive_file_id = p_drive_file_id, status = 'DA_APPROVARE', proposed_by = auth.uid(), proposed_at = now(),
      status_changed_by = auth.uid(), status_changed_at = now(), retired = false
      where id = v_row.id;
  else
    insert into public.scd_sponsor_spots (organization_id, sponsor_slug, spot_key, master_path, preview_path, drive_file_id,
      proposed_by, status_changed_by)
    values (p_organization_id, p_sponsor_slug, p_spot_key, p_master_path, p_preview_path, p_drive_file_id, auth.uid(), auth.uid())
    returning * into v_row;
  end if;
  insert into public.scd_sponsor_spot_events (organization_id, spot_id, action, from_status, to_status, actor)
  values (p_organization_id, v_row.id, 'PROPOSTO', v_from, 'DA_APPROVARE', auth.uid());
  return jsonb_build_object('ok', true, 'id', v_row.id);
end;
$$;
revoke all on function public.scd_sponsor_spot_propose(uuid, text, text, text, text, text) from public, anon;
grant execute on function public.scd_sponsor_spot_propose(uuid, text, text, text, text, text) to authenticated;

-- Record the sponsor's answer or put a spot on air. MODIFICHE_RICHIESTE requires the feedback text.
create or replace function public.scd_sponsor_spot_set_status(p_organization_id uuid, p_spot_id uuid, p_status text, p_feedback text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_row public.scd_sponsor_spots%rowtype;
  v_feedback text := nullif(left(trim(coalesce(p_feedback, '')), 600), '');
begin
  if not public.scd_spot_office(p_organization_id) then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  select * into v_row from public.scd_sponsor_spots where id = p_spot_id and organization_id = p_organization_id for update;
  if not found or v_row.retired then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;
  if not public.scd_spot_transition_ok(v_row.status, p_status) then
    return jsonb_build_object('ok', false, 'code', 'not_allowed');
  end if;
  if p_status = 'MODIFICHE_RICHIESTE' and v_feedback is null then
    return jsonb_build_object('ok', false, 'code', 'feedback_required');
  end if;
  update public.scd_sponsor_spots set status = p_status,
    sponsor_feedback = case when p_status = 'MODIFICHE_RICHIESTE' then v_feedback else sponsor_feedback end,
    status_changed_by = auth.uid(), status_changed_at = now()
    where id = v_row.id;
  insert into public.scd_sponsor_spot_events (organization_id, spot_id, action, from_status, to_status, feedback, actor)
  values (p_organization_id, v_row.id, 'STATO', v_row.status, p_status, v_feedback, auth.uid());
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.scd_sponsor_spot_set_status(uuid, uuid, text, text) from public, anon;
grant execute on function public.scd_sponsor_spot_set_status(uuid, uuid, text, text) to authenticated;

-- Take a spot out of the rotation (it stays in the register and in the log).
create or replace function public.scd_sponsor_spot_retire(p_organization_id uuid, p_spot_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_status text;
begin
  if not public.scd_spot_office(p_organization_id) then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  update public.scd_sponsor_spots set retired = true, status_changed_by = auth.uid(), status_changed_at = now()
    where id = p_spot_id and organization_id = p_organization_id and not retired
    returning status into v_status;
  if v_status is null then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;
  insert into public.scd_sponsor_spot_events (organization_id, spot_id, action, from_status, to_status, actor)
  values (p_organization_id, p_spot_id, 'RITIRATO', v_status, v_status, auth.uid());
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.scd_sponsor_spot_retire(uuid, uuid) from public, anon;
grant execute on function public.scd_sponsor_spot_retire(uuid, uuid) to authenticated;

-- The gestionale vetrina: every spot with status, feedback and the last 20 log lines. Office only.
create or replace function public.scd_sponsor_spot_board(p_organization_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  if not public.scd_spot_office(p_organization_id) then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  return jsonb_build_object('ok', true, 'spots', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', s.id, 'sponsorSlug', s.sponsor_slug, 'spotKey', s.spot_key, 'status', s.status,
      'feedback', s.sponsor_feedback, 'retired', s.retired, 'statusChangedAt', s.status_changed_at,
      'log', coalesce((select jsonb_agg(jsonb_build_object('action', e.action, 'from', e.from_status, 'to', e.to_status,
                         'feedback', e.feedback, 'at', e.at) order by e.at desc)
                       from (select * from public.scd_sponsor_spot_events ev where ev.spot_id = s.id order by ev.at desc limit 20) e), '[]'::jsonb)
    ) order by s.sponsor_slug)
    from public.scd_sponsor_spots s where s.organization_id = p_organization_id), '[]'::jsonb));
end;
$$;
revoke all on function public.scd_sponsor_spot_board(uuid) from public, anon;
grant execute on function public.scd_sponsor_spot_board(uuid) to authenticated;

-- Showable spots for the public home and the LED wall player (server side, service role only): never
-- MODIFICHE_RICHIESTE, never retired; only slug, key and status (no feedback, no actors).
create or replace function public.scd_sponsor_spot_showable(p_organization_id uuid)
returns table (sponsor_slug text, spot_key text, status text)
language sql
stable
security definer
set search_path to 'public'
as $$
  select s.sponsor_slug, s.spot_key, s.status from public.scd_sponsor_spots s
  where s.organization_id = p_organization_id and not s.retired and s.status in ('DA_APPROVARE', 'APPROVATO', 'IN_ONDA')
  order by s.sponsor_slug;
$$;
revoke all on function public.scd_sponsor_spot_showable(uuid) from public, anon, authenticated;
grant execute on function public.scd_sponsor_spot_showable(uuid) to service_role;
