-- r118: Area allenamenti + verifica mensile della Segreteria (UD-181, Francesco DG 17/10/2026 12:36).
-- STAGED: NOT APPLIED. Apply on SCD PULSE (ndevtxxijbcnskgysdit) only after Francesco writes "applica r118", after r117.
-- Never on dfnwzwutvnwiitiffwvr.
--
-- What already existed and is REUSED (audit 2026-10-17): scd_training_sessions and scd_training_attendance (r53:
-- team, start, duration, technical_theme, coach_notes; present/absence_reason per athlete) were created but closed
-- (no grants, no functions) and are empty on SCD PULSE (training_sessions 0, VERIFIED by the caller). They are
-- EXTENDED here, not duplicated. scd_notification_outbox (r104) gets one more kind for the monthly requests.
-- The weekly quadro (Drive snapshot) stays the public training timetable: a session row is the mister's record
-- of one training (what was done, who was there), created from the quadro slot or by hand.
--
-- What r118 adds (additive, idempotent):
--   1. scd_training_sessions: field_label, shared_note (visible to the team's athletes and families),
--      meeting_url (Google Meet only, for a «live» explanation or a videoconference: nothing is streamed or recorded
--      by the app; no recording of minors), live_note, status (PLANNED | DONE | CANCELLED), updated_by.
--      coach_notes stays private to the team staff;
--   2. scd_training_attendance: status (PRESENTE | ASSENTE | GIUSTIFICATO) recorded by the team staff, plus the
--      family's advance notice (notice_code, notice_note, noticed_at, noticed_by). The r53 'present' column is kept
--      equal to status = PRESENTE. No health data: the reasons are categories, notes are short and stripped of
--      contacts. rpe stays unused;
--   3. scd_training_drills: «dinamiche di gioco» library (title, description, optional image in scd-private
--      <org>/drill/<team_id>/...), audience STAFF_SQUADRA | STAFF_CLUB | SQUADRA (shared with the team's athletes
--      and families as text). Drawable pitch = phase 2;
--   4. scd_team_gap_requests: the «richieste di integrazione o giustificazione» the Segreteria creates after the
--      monthly check (one row per missing item, unique per team/month/item), answered by the team staff with
--      INTEGRATED or JUSTIFIED + note; plus one scd_notification_outbox row per team (kind INTEGRATION_REQUEST,
--      digest, no recipient e-mail: it lands in the Segreteria daily summary, nothing is sent to anyone else);
--   5. functions (SECURITY DEFINER, fixed search_path, explicit checks): staff training list / save / attendance /
--      record, drills list / save / archive / image path, family trainings + notice + drills, office training month
--      list, office create / list gap requests, staff list / answer gap requests.
-- The monthly check itself is computed by the app server (apps/superapp/src/lib/monthly-check.ts) from the official
-- calendar copy + scd_staff_match_status (r117) + scd_office_training_month; NOTHING is scheduled. Planned schedule,
-- to be approved by Francesco: 1st of each month 08:00 Europe/Rome, preparing the list for the Segreteria, who
-- presses «Crea le richieste».
-- RLS enabled on every new table with NO policies and no grants to anon/authenticated. Audit rows carry ids, kinds
-- and counts only.
--
-- Engines: TEMPO (attendance in one tap, no paper registers, monthly check prepared for the Segreteria) and PERSONE
-- (athletes and families see the shared notes, the drills and their own attendance). Measure: sessions per team per
-- month with attendance recorded / sessions held; gap requests created vs answered within 7 days; families who send
-- an advance absence notice.
--
-- Rollback:
--   begin;
--   drop function if exists public.scd_staff_answer_gap_request(uuid, uuid, text, text);
--   drop function if exists public.scd_staff_gap_requests(uuid);
--   drop function if exists public.scd_office_gap_requests(uuid, date);
--   drop function if exists public.scd_office_create_gap_requests(uuid, date, jsonb);
--   drop function if exists public.scd_office_training_month(uuid, date);
--   drop function if exists public.scd_my_team_drills(uuid);
--   drop function if exists public.scd_my_training_notice(uuid, uuid, uuid, text, text);
--   drop function if exists public.scd_my_trainings(uuid, date, date);
--   drop function if exists public.scd_staff_drill_image_path(uuid, uuid);
--   drop function if exists public.scd_staff_drill_archive(uuid, uuid);
--   drop function if exists public.scd_staff_drill_save(uuid, jsonb);
--   drop function if exists public.scd_staff_drills(uuid, text);
--   drop function if exists public.scd_staff_training_record(uuid, uuid, jsonb);
--   drop function if exists public.scd_staff_training_attendance(uuid, uuid);
--   drop function if exists public.scd_staff_training_save(uuid, jsonb);
--   drop function if exists public.scd_staff_training_list(uuid, text, date, date);
--   drop function if exists public.scd_team_scope_by_id(uuid, uuid);
--   drop table if exists public.scd_team_gap_requests;
--   drop table if exists public.scd_training_drills;
--   alter table public.scd_training_attendance drop column if exists status, drop column if exists notice_code,
--     drop column if exists notice_note, drop column if exists noticed_at, drop column if exists noticed_by;
--   alter table public.scd_training_sessions drop column if exists field_label, drop column if exists shared_note,
--     drop column if exists meeting_url, drop column if exists live_note, drop column if exists status,
--     drop column if exists updated_by;
--   delete from public.scd_notification_outbox where kind = 'INTEGRATION_REQUEST';
--   alter table public.scd_notification_outbox drop constraint if exists scd_notification_outbox_kind_check;
--   alter table public.scd_notification_outbox add constraint scd_notification_outbox_kind_check
--     check (kind in ('ROLE_DECLARED','REGISTRATION','AUTO_VERIFIED','DIGEST_ITEM'));
--   commit;

-- ---------------------------------------------------------------- 0. prerequisites
do $$
begin
  if to_regclass('public.scd_training_sessions') is null
     or to_regclass('public.scd_training_attendance') is null
     or to_regclass('public.scd_notification_outbox') is null
     or to_regclass('public.scd_match_reports') is null
     or to_regprocedure('public.scd_team_text_clean(text, integer)') is null
     or to_regprocedure('public.scd_my_team_ids(uuid)') is null
     or to_regprocedure('public.scd_my_family(uuid)') is null
  then
    raise exception 'r118 prerequisites missing: r53, r61, r104 and r117 must be applied first';
  end if;
end $$;

-- ---------------------------------------------------------------- 1. extend r53 tables
alter table public.scd_training_sessions
  add column if not exists field_label text check (field_label is null or char_length(field_label) <= 80),
  add column if not exists shared_note text check (shared_note is null or char_length(shared_note) <= 1000),
  add column if not exists meeting_url text check (meeting_url is null or meeting_url ~ '^https://meet\.google\.com/[a-z0-9-]{3,40}$'),
  add column if not exists live_note text check (live_note is null or char_length(live_note) <= 300),
  add column if not exists status text not null default 'PLANNED' check (status in ('PLANNED', 'DONE', 'CANCELLED')),
  add column if not exists updated_by uuid;

alter table public.scd_training_attendance
  add column if not exists status text check (status is null or status in ('PRESENTE', 'ASSENTE', 'GIUSTIFICATO')),
  add column if not exists notice_code text
    check (notice_code is null or notice_code in ('SCUOLA', 'FAMIGLIA', 'TRASPORTO', 'PERSONALE', 'ALTRO')),
  add column if not exists notice_note text check (notice_note is null or char_length(notice_note) <= 140),
  add column if not exists noticed_at timestamptz,
  add column if not exists noticed_by uuid;

-- ---------------------------------------------------------------- 2. new tables
create table if not exists public.scd_training_drills (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  team_id uuid references public.scd_teams(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 120),
  description text check (description is null or char_length(description) <= 3000),
  image_path text check (image_path is null or image_path ~ '^[0-9a-f-]{36}/drill/[0-9a-f-]{36}/[A-Za-z0-9._-]{1,140}$'),
  audience text not null default 'STAFF_SQUADRA' check (audience in ('STAFF_SQUADRA', 'STAFF_CLUB', 'SQUADRA')),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  check (team_id is not null or audience = 'STAFF_CLUB')
);
create index if not exists scd_training_drills_team_idx on public.scd_training_drills(organization_id, team_id) where archived_at is null;

create table if not exists public.scd_team_gap_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  team_id uuid not null references public.scd_teams(id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  item_kind text not null check (item_kind in ('CONVOCAZIONE', 'DISTINTA', 'TABELLINO', 'RESOCONTO', 'REFERTO', 'PRESENZE')),
  item_ref text not null check (char_length(item_ref) between 1 and 120),
  item_label text not null check (char_length(item_label) between 1 and 160),
  status text not null default 'OPEN' check (status in ('OPEN', 'INTEGRATED', 'JUSTIFIED', 'CLOSED')),
  answer_note text check (answer_note is null or char_length(answer_note) <= 300),
  created_by uuid,
  created_at timestamptz not null default now(),
  answered_by uuid,
  answered_at timestamptz,
  unique (organization_id, team_id, month, item_kind, item_ref)
);
create index if not exists scd_team_gap_requests_open_idx on public.scd_team_gap_requests(organization_id, team_id, status);

alter table public.scd_training_drills enable row level security;
alter table public.scd_team_gap_requests enable row level security;
revoke all on table public.scd_training_drills from anon, authenticated;
revoke all on table public.scd_team_gap_requests from anon, authenticated;

-- one more outbox kind (r104 constraint widened, every existing kind kept)
alter table public.scd_notification_outbox drop constraint if exists scd_notification_outbox_kind_check;
alter table public.scd_notification_outbox add constraint scd_notification_outbox_kind_check
  check (kind in ('ROLE_DECLARED', 'REGISTRATION', 'AUTO_VERIFIED', 'DIGEST_ITEM', 'INTEGRATION_REQUEST'));

comment on table public.scd_training_drills is 'r118: «dinamiche di gioco» library. SQUADRA = shared as text with the team athletes and families; images staff-only.';
comment on table public.scd_team_gap_requests is 'r118: monthly «richieste di integrazione o giustificazione» created by the Segreteria, answered by the team staff. No personal data: items are team-level.';

-- ---------------------------------------------------------------- 3. helper
create or replace function public.scd_team_scope_by_id(p_organization_id uuid, p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.scd_teams t
    where t.id = p_team_id and t.organization_id = p_organization_id
      and t.id in (select public.scd_my_team_ids(p_organization_id)));
$$;
revoke all on function public.scd_team_scope_by_id(uuid, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------- 4. staff: sessions
create or replace function public.scd_staff_training_list(p_organization_id uuid, p_team_code text, p_from date, p_to date)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_team uuid;
begin
  select t.id into v_team from public.scd_teams t
  where t.organization_id = p_organization_id and t.code = p_team_code
  order by (t.status = 'ACTIVE') desc, t.created_at desc limit 1;
  if v_team is null or not public.scd_team_scope_by_id(p_organization_id, v_team) then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 120 then
    return jsonb_build_object('ok', false, 'code', 'invalid');
  end if;
  return jsonb_build_object('ok', true, 'team_id', v_team, 'sessions', coalesce((
    select jsonb_agg(jsonb_build_object(
        'id', s.id, 'starts_at', s.starts_at, 'duration', s.duration_minutes, 'field', s.field_label,
        'theme', s.technical_theme, 'coach_notes', s.coach_notes, 'shared_note', s.shared_note,
        'meeting_url', s.meeting_url, 'live_note', s.live_note, 'status', s.status,
        'recorded', (select count(*) from public.scd_training_attendance a where a.training_session_id = s.id and a.status is not null),
        'present', (select count(*) from public.scd_training_attendance a where a.training_session_id = s.id and a.status = 'PRESENTE'),
        'absent', (select count(*) from public.scd_training_attendance a where a.training_session_id = s.id and a.status = 'ASSENTE'),
        'justified', (select count(*) from public.scd_training_attendance a where a.training_session_id = s.id and a.status = 'GIUSTIFICATO'),
        'notices', (select count(*) from public.scd_training_attendance a where a.training_session_id = s.id and a.noticed_at is not null))
      order by s.starts_at)
    from public.scd_training_sessions s
    where s.team_id = v_team and s.organization_id = p_organization_id
      and (s.starts_at at time zone 'Europe/Rome')::date between p_from and p_to), '[]'::jsonb));
end;
$$;

-- Create (no id) or update (id) a session. Keys: id, teamCode, startsAt, duration, field, theme, coachNotes,
-- sharedNote, meetingUrl, liveNote, status.
create or replace function public.scd_staff_training_save(p_organization_id uuid, p jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_id uuid;
  v_team uuid;
  v_starts timestamptz;
  v_duration integer;
  v_url text := nullif(btrim(coalesce(p->>'meetingUrl', '')), '');
begin
  if jsonb_typeof(p) <> 'object'
     or exists (select 1 from jsonb_object_keys(p) k where k not in ('id', 'teamCode', 'startsAt', 'duration', 'field', 'theme', 'coachNotes', 'sharedNote', 'meetingUrl', 'liveNote', 'status')) then
    return jsonb_build_object('ok', false, 'code', 'invalid');
  end if;
  if p ? 'id' and coalesce(p->>'id', '') <> '' then
    if (p->>'id') !~ '^[0-9a-f-]{36}$' then return jsonb_build_object('ok', false, 'code', 'invalid'); end if;
    select s.id, s.team_id into v_id, v_team from public.scd_training_sessions s
    where s.id = (p->>'id')::uuid and s.organization_id = p_organization_id;
  else
    select t.id into v_team from public.scd_teams t
    where t.organization_id = p_organization_id and t.code = p->>'teamCode'
    order by (t.status = 'ACTIVE') desc, t.created_at desc limit 1;
  end if;
  if v_team is null or not public.scd_team_scope_by_id(p_organization_id, v_team) then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  begin
    v_starts := (p->>'startsAt')::timestamptz;
    v_duration := coalesce((p->>'duration')::integer, 90);
  exception when others then
    return jsonb_build_object('ok', false, 'code', 'invalid');
  end;
  if v_starts is null or v_duration not between 15 and 240
     or v_starts < now() - interval '62 days' or v_starts > now() + interval '120 days'
     or (v_url is not null and v_url !~ '^https://meet\.google\.com/[a-z0-9-]{3,40}$')
     or coalesce(p->>'status', 'PLANNED') not in ('PLANNED', 'DONE', 'CANCELLED')
     or char_length(coalesce(p->>'theme', '')) > 200 or char_length(coalesce(p->>'coachNotes', '')) > 2000
     or char_length(coalesce(p->>'sharedNote', '')) > 1000 or char_length(coalesce(p->>'liveNote', '')) > 300
     or char_length(coalesce(p->>'field', '')) > 80 then
    return jsonb_build_object('ok', false, 'code', 'invalid');
  end if;

  if v_id is null then
    insert into public.scd_training_sessions
      (organization_id, team_id, starts_at, duration_minutes, field_label, technical_theme, coach_notes, shared_note,
       meeting_url, live_note, status, created_by_user_id, updated_by)
    values (p_organization_id, v_team, v_starts, v_duration, public.scd_team_text_clean(p->>'field', 80),
       public.scd_team_text_clean(p->>'theme', 200), public.scd_team_text_clean(p->>'coachNotes', 2000),
       public.scd_team_text_clean(p->>'sharedNote', 1000), v_url, public.scd_team_text_clean(p->>'liveNote', 300),
       coalesce(p->>'status', 'PLANNED'), (select auth.uid()), (select auth.uid()))
    returning id into v_id;
  else
    update public.scd_training_sessions set
      starts_at = v_starts, duration_minutes = v_duration, field_label = public.scd_team_text_clean(p->>'field', 80),
      technical_theme = public.scd_team_text_clean(p->>'theme', 200), coach_notes = public.scd_team_text_clean(p->>'coachNotes', 2000),
      shared_note = public.scd_team_text_clean(p->>'sharedNote', 1000), meeting_url = v_url,
      live_note = public.scd_team_text_clean(p->>'liveNote', 300), status = coalesce(p->>'status', 'PLANNED'),
      updated_by = (select auth.uid()), updated_at = now()
    where id = v_id;
  end if;
  insert into public.scd_audit_events (organization_id, actor_user_id, action, entity_type, entity_id, payload)
  values (p_organization_id, (select auth.uid()), 'TRAINING_SESSION_SAVED', 'scd_training_sessions', v_id,
          jsonb_build_object('team_id', v_team, 'status', coalesce(p->>'status', 'PLANNED'), 'meeting_link', v_url is not null));
  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

-- Roster of the session's team (membership valid on the session day) plus anyone already recorded.
create or replace function public.scd_staff_training_attendance(p_organization_id uuid, p_session_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_team uuid;
  v_day date;
begin
  select s.team_id, (s.starts_at at time zone 'Europe/Rome')::date into v_team, v_day
  from public.scd_training_sessions s where s.id = p_session_id and s.organization_id = p_organization_id;
  if v_team is null or not public.scd_team_scope_by_id(p_organization_id, v_team) then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  return jsonb_build_object('ok', true, 'rows', coalesce((
    select jsonb_agg(jsonb_build_object(
        'athlete_id', x.athlete_id, 'display_name', x.display_name, 'birth_year', x.birth_year,
        'status', at.status, 'reason', at.absence_reason, 'notice_code', at.notice_code, 'notice_note', at.notice_note,
        'noticed_at', at.noticed_at)
      order by x.last_name, x.first_name)
    from (
      select distinct on (a.id) a.id as athlete_id, p.last_name, p.first_name,
        coalesce(nullif(p.display_name, ''), trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, ''))) as display_name,
        extract(year from p.birth_date)::integer as birth_year
      from public.scd_athletes a
      join public.scd_people p on p.id = a.person_id
      where a.organization_id = p_organization_id and (
        exists (select 1 from public.scd_team_memberships tm where tm.athlete_id = a.id and tm.team_id = v_team
                and (tm.valid_from is null or tm.valid_from <= v_day) and (tm.valid_to is null or tm.valid_to >= v_day))
        or exists (select 1 from public.scd_training_attendance t2 where t2.training_session_id = p_session_id and t2.athlete_id = a.id))
    ) x
    left join public.scd_training_attendance at on at.training_session_id = p_session_id and at.athlete_id = x.athlete_id), '[]'::jsonb));
end;
$$;

-- Rows: [{athlete_id, status, reason}]. Only from the session day on. The reason is a short note, no health details.
create or replace function public.scd_staff_training_record(p_organization_id uuid, p_session_id uuid, p_rows jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_team uuid;
  v_starts timestamptz;
  v_n integer;
  r record;
begin
  select s.team_id, s.starts_at into v_team, v_starts
  from public.scd_training_sessions s where s.id = p_session_id and s.organization_id = p_organization_id;
  if v_team is null or not public.scd_team_scope_by_id(p_organization_id, v_team) then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  if (v_starts at time zone 'Europe/Rome')::date > (now() at time zone 'Europe/Rome')::date then
    return jsonb_build_object('ok', false, 'code', 'future');
  end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 or jsonb_array_length(p_rows) > 60
     or exists (select 1 from jsonb_array_elements(p_rows) x
                where jsonb_typeof(x) <> 'object'
                   or (x->>'athlete_id') !~ '^[0-9a-f-]{36}$'
                   or coalesce(x->>'status', '') not in ('PRESENTE', 'ASSENTE', 'GIUSTIFICATO')
                   or char_length(coalesce(x->>'reason', '')) > 140)
     or (select count(distinct x->>'athlete_id') from jsonb_array_elements(p_rows) x) <> jsonb_array_length(p_rows) then
    return jsonb_build_object('ok', false, 'code', 'invalid');
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_rows) x
    where (x->>'athlete_id')::uuid not in (
      select (y->>'athlete_id')::uuid
      from jsonb_array_elements(public.scd_staff_training_attendance(p_organization_id, p_session_id)->'rows') y)
  ) then
    return jsonb_build_object('ok', false, 'code', 'not_in_team');
  end if;
  for r in select x from jsonb_array_elements(p_rows) x loop
    insert into public.scd_training_attendance as t
      (organization_id, training_session_id, athlete_id, present, status, absence_reason, recorded_by_user_id)
    values (p_organization_id, p_session_id, (r.x->>'athlete_id')::uuid, r.x->>'status' = 'PRESENTE', r.x->>'status',
            case when r.x->>'status' = 'PRESENTE' then null else public.scd_team_text_clean(r.x->>'reason', 140) end, (select auth.uid()))
    on conflict (training_session_id, athlete_id) do update set
      present = excluded.present, status = excluded.status, absence_reason = excluded.absence_reason,
      recorded_by_user_id = excluded.recorded_by_user_id, updated_at = now();
  end loop;
  v_n := jsonb_array_length(p_rows);
  update public.scd_training_sessions set status = 'DONE', updated_at = now(), updated_by = (select auth.uid())
  where id = p_session_id and status = 'PLANNED';
  insert into public.scd_audit_events (organization_id, actor_user_id, action, entity_type, entity_id, payload)
  values (p_organization_id, (select auth.uid()), 'TRAINING_ATTENDANCE_RECORDED', 'scd_training_sessions', p_session_id,
          jsonb_build_object('rows', v_n,
            'present', (select count(*) from jsonb_array_elements(p_rows) x where x->>'status' = 'PRESENTE')));
  return jsonb_build_object('ok', true, 'rows', v_n);
end;
$$;

-- ---------------------------------------------------------------- 5. staff: drills («dinamiche di gioco»)
create or replace function public.scd_staff_drills(p_organization_id uuid, p_team_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_team uuid;
begin
  select t.id into v_team from public.scd_teams t
  where t.organization_id = p_organization_id and t.code = p_team_code
  order by (t.status = 'ACTIVE') desc, t.created_at desc limit 1;
  if v_team is null or not public.scd_team_scope_by_id(p_organization_id, v_team) then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  return jsonb_build_object('ok', true, 'drills', coalesce((
    select jsonb_agg(jsonb_build_object('id', d.id, 'title', d.title, 'description', d.description, 'audience', d.audience,
             'team_code', t.code, 'has_image', d.image_path is not null, 'mine', d.created_by = (select auth.uid()),
             'updated_at', d.updated_at) order by d.updated_at desc)
    from public.scd_training_drills d
    left join public.scd_teams t on t.id = d.team_id
    where d.organization_id = p_organization_id and d.archived_at is null
      and (d.team_id = v_team or d.audience = 'STAFF_CLUB')), '[]'::jsonb));
end;
$$;

-- Keys: id (update), teamCode, title, description, audience, imagePath.
create or replace function public.scd_staff_drill_save(p_organization_id uuid, p jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_id uuid;
  v_team uuid;
  v_aud text := coalesce(p->>'audience', 'STAFF_SQUADRA');
  v_img text := nullif(p->>'imagePath', '');
begin
  if jsonb_typeof(p) <> 'object'
     or exists (select 1 from jsonb_object_keys(p) k where k not in ('id', 'teamCode', 'title', 'description', 'audience', 'imagePath'))
     or char_length(btrim(coalesce(p->>'title', ''))) not between 3 and 120
     or char_length(coalesce(p->>'description', '')) > 3000
     or v_aud not in ('STAFF_SQUADRA', 'STAFF_CLUB', 'SQUADRA') then
    return jsonb_build_object('ok', false, 'code', 'invalid');
  end if;
  if coalesce(p->>'id', '') <> '' then
    if (p->>'id') !~ '^[0-9a-f-]{36}$' then return jsonb_build_object('ok', false, 'code', 'invalid'); end if;
    select d.id, d.team_id into v_id, v_team from public.scd_training_drills d
    where d.id = (p->>'id')::uuid and d.organization_id = p_organization_id and d.archived_at is null
      and (d.created_by = (select auth.uid())
           or public.scd_has_org_role(p_organization_id, array['DIRECTION', 'SECRETARIAT']::public.scd_role[]));
    if v_id is null then return jsonb_build_object('ok', false, 'code', 'forbidden'); end if;
  else
    select t.id into v_team from public.scd_teams t
    where t.organization_id = p_organization_id and t.code = p->>'teamCode'
    order by (t.status = 'ACTIVE') desc, t.created_at desc limit 1;
  end if;
  if v_team is null or not public.scd_team_scope_by_id(p_organization_id, v_team) then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  if v_img is not null and (split_part(v_img, '/', 1) <> p_organization_id::text or split_part(v_img, '/', 2) <> 'drill'
     or split_part(v_img, '/', 3) <> v_team::text or v_img !~ '^[0-9a-f-]{36}/drill/[0-9a-f-]{36}/[A-Za-z0-9._-]{1,140}$') then
    return jsonb_build_object('ok', false, 'code', 'path');
  end if;
  if v_id is null then
    insert into public.scd_training_drills (organization_id, team_id, title, description, image_path, audience, created_by)
    values (p_organization_id, v_team, public.scd_team_text_clean(p->>'title', 120), public.scd_team_text_clean(p->>'description', 3000),
            v_img, v_aud, (select auth.uid()))
    returning id into v_id;
  else
    update public.scd_training_drills set title = public.scd_team_text_clean(p->>'title', 120),
      description = public.scd_team_text_clean(p->>'description', 3000),
      image_path = case when p ? 'imagePath' then v_img else image_path end,
      audience = v_aud, updated_at = now()
    where id = v_id;
  end if;
  insert into public.scd_audit_events (organization_id, actor_user_id, action, entity_type, entity_id, payload)
  values (p_organization_id, (select auth.uid()), 'TRAINING_DRILL_SAVED', 'scd_training_drills', v_id,
          jsonb_build_object('team_id', v_team, 'audience', v_aud, 'image', v_img is not null));
  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

create or replace function public.scd_staff_drill_archive(p_organization_id uuid, p_drill_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_id uuid;
begin
  update public.scd_training_drills d set archived_at = now(), updated_at = now()
  where d.id = p_drill_id and d.organization_id = p_organization_id and d.archived_at is null
    and (select auth.uid()) is not null
    and (d.created_by = (select auth.uid())
         or public.scd_has_org_role(p_organization_id, array['DIRECTION', 'SECRETARIAT']::public.scd_role[]))
  returning d.id into v_id;
  if v_id is null then return jsonb_build_object('ok', false, 'code', 'forbidden'); end if;
  insert into public.scd_audit_events (organization_id, actor_user_id, action, entity_type, entity_id, payload)
  values (p_organization_id, (select auth.uid()), 'TRAINING_DRILL_ARCHIVED', 'scd_training_drills', v_id, '{}'::jsonb);
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.scd_staff_drill_image_path(p_organization_id uuid, p_drill_id uuid)
returns text
language sql
stable
security definer
set search_path to 'public'
as $$
  select d.image_path from public.scd_training_drills d
  where d.id = p_drill_id and d.organization_id = p_organization_id and d.archived_at is null and d.image_path is not null
    and d.team_id is not null and public.scd_team_scope_by_id(p_organization_id, d.team_id);
$$;

-- ---------------------------------------------------------------- 6. athletes and families
-- Trainings of the caller's circle (self + guarded family members, scd_my_family) between two days: what the mister
-- chose to share, the meeting link, the circle member's own attendance. Never coach_notes, never other athletes.
create or replace function public.scd_my_trainings(p_organization_id uuid, p_from date, p_to date)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  if (select auth.uid()) is null or p_from is null or p_to is null or p_to < p_from or p_to - p_from > 120 then
    return '[]'::jsonb;
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
        'person_id', f.person_id, 'display_name', f.display_name, 'relationship', f.relationship,
        'team_code', t.code,
        'sessions', coalesce((
          select jsonb_agg(jsonb_build_object(
              'id', s.id, 'starts_at', s.starts_at, 'duration', s.duration_minutes, 'field', s.field_label,
              'theme', s.technical_theme, 'shared_note', s.shared_note, 'meeting_url', s.meeting_url,
              'live_note', s.live_note, 'status', s.status,
              'my_status', at.status, 'my_notice', at.notice_code) order by s.starts_at)
          from public.scd_training_sessions s
          left join public.scd_training_attendance at on at.training_session_id = s.id and at.athlete_id = a.id
          where s.team_id = t.id and (s.starts_at at time zone 'Europe/Rome')::date between p_from and p_to), '[]'::jsonb),
        'season', (
          select jsonb_build_object(
            'recorded', count(*) filter (where at2.status is not null),
            'present', count(*) filter (where at2.status = 'PRESENTE'),
            'absent', count(*) filter (where at2.status = 'ASSENTE'),
            'justified', count(*) filter (where at2.status = 'GIUSTIFICATO'))
          from public.scd_training_attendance at2
          join public.scd_training_sessions s2 on s2.id = at2.training_session_id
          where at2.athlete_id = a.id and s2.team_id = t.id))
      order by f.display_name, t.code)
    from public.scd_my_family(p_organization_id) f
    join public.scd_athletes a on a.person_id = f.person_id and a.organization_id = p_organization_id
    join public.scd_team_memberships tm on tm.athlete_id = a.id and (tm.valid_to is null or tm.valid_to >= current_date)
    join public.scd_teams t on t.id = tm.team_id and t.organization_id = p_organization_id), '[]'::jsonb);
end;
$$;

-- Advance absence notice by the athlete or a guardian, before the session starts. The staff records the real status.
create or replace function public.scd_my_training_notice(p_organization_id uuid, p_session_id uuid, p_person_id uuid, p_code text, p_note text)
returns jsonb
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_athlete uuid;
  v_starts timestamptz;
begin
  if (p_code is not null and p_code not in ('SCUOLA', 'FAMIGLIA', 'TRASPORTO', 'PERSONALE', 'ALTRO')) or char_length(coalesce(p_note, '')) > 140 then
    return jsonb_build_object('ok', false, 'code', 'invalid');
  end if;
  if (select auth.uid()) is null or p_person_id not in (select f.person_id from public.scd_my_family(p_organization_id) f) then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  select a.id, s.starts_at into v_athlete, v_starts
  from public.scd_training_sessions s
  join public.scd_team_memberships tm on tm.team_id = s.team_id and (tm.valid_to is null or tm.valid_to >= current_date)
  join public.scd_athletes a on a.id = tm.athlete_id and a.person_id = p_person_id
  where s.id = p_session_id and s.organization_id = p_organization_id and s.status <> 'CANCELLED'
  limit 1;
  if v_athlete is null then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  if v_starts <= now() then
    return jsonb_build_object('ok', false, 'code', 'started');
  end if;
  if p_code is null then
    update public.scd_training_attendance set notice_code = null, notice_note = null, noticed_at = null, noticed_by = null, updated_at = now()
    where training_session_id = p_session_id and athlete_id = v_athlete;
  else
    insert into public.scd_training_attendance as t
      (organization_id, training_session_id, athlete_id, present, notice_code, notice_note, noticed_at, noticed_by)
    values (p_organization_id, p_session_id, v_athlete, false, p_code, public.scd_team_text_clean(p_note, 140), now(), (select auth.uid()))
    on conflict (training_session_id, athlete_id) do update set
      notice_code = excluded.notice_code, notice_note = excluded.notice_note, noticed_at = now(),
      noticed_by = excluded.noticed_by, updated_at = now();
  end if;
  insert into public.scd_audit_events (organization_id, actor_user_id, action, entity_type, entity_id, payload)
  values (p_organization_id, (select auth.uid()), 'TRAINING_NOTICE', 'scd_training_sessions', p_session_id,
          jsonb_build_object('code', p_code, 'cleared', p_code is null));
  return jsonb_build_object('ok', true);
end;
$$;

-- Drills the team staff shared with the team (audience SQUADRA), text only.
create or replace function public.scd_my_team_drills(p_organization_id uuid)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'title', d.title, 'description', d.description,
           'team_code', t.code, 'updated_at', d.updated_at) order by d.updated_at desc), '[]'::jsonb)
  from public.scd_training_drills d
  join public.scd_teams t on t.id = d.team_id
  where (select auth.uid()) is not null and d.organization_id = p_organization_id and d.archived_at is null
    and d.audience = 'SQUADRA'
    and d.team_id in (
      select tm.team_id from public.scd_my_family(p_organization_id) f
      join public.scd_athletes a on a.person_id = f.person_id and a.organization_id = p_organization_id
      join public.scd_team_memberships tm on tm.athlete_id = a.id and (tm.valid_to is null or tm.valid_to >= current_date));
$$;

-- ---------------------------------------------------------------- 7. Segreteria: monthly check
-- Sessions of one month (all teams) with the number of attendance rows recorded. Office roles only.
create or replace function public.scd_office_training_month(p_organization_id uuid, p_month date)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  if (select auth.uid()) is null
     or not public.scd_has_org_role(p_organization_id, array['DIRECTION', 'SECRETARIAT']::public.scd_role[])
     or p_month is null or extract(day from p_month) <> 1 then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  return jsonb_build_object('ok', true, 'sessions', coalesce((
    select jsonb_agg(jsonb_build_object('id', s.id, 'team_code', t.code, 'starts_at', s.starts_at, 'status', s.status,
             'recorded', (select count(*) from public.scd_training_attendance a where a.training_session_id = s.id and a.status is not null))
           order by s.starts_at)
    from public.scd_training_sessions s
    join public.scd_teams t on t.id = s.team_id
    where s.organization_id = p_organization_id
      and (s.starts_at at time zone 'Europe/Rome')::date >= p_month
      and (s.starts_at at time zone 'Europe/Rome')::date < (p_month + interval '1 month')::date), '[]'::jsonb));
end;
$$;

-- The Segreteria creates the requests computed by the app server for one month. Items:
-- [{teamCode, kind, ref, label}]. Existing (team, month, kind, ref) are left as they are. One outbox digest row per
-- team with new items (no recipient e-mail: Segreteria daily summary only). Office roles only.
create or replace function public.scd_office_create_gap_requests(p_organization_id uuid, p_month date, p_items jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_new integer := 0;
  v_n integer;
  r record;
  v_team uuid;
  v_team_name text;
  v_labels text;
begin
  if (select auth.uid()) is null
     or not public.scd_has_org_role(p_organization_id, array['DIRECTION', 'SECRETARIAT']::public.scd_role[]) then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  if p_month is null or extract(day from p_month) <> 1 or p_month > date_trunc('month', now() at time zone 'Europe/Rome')::date
     or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 500
     or exists (select 1 from jsonb_array_elements(p_items) x
                where jsonb_typeof(x) <> 'object'
                   or coalesce(x->>'kind', '') not in ('CONVOCAZIONE', 'DISTINTA', 'TABELLINO', 'RESOCONTO', 'REFERTO', 'PRESENZE')
                   or char_length(coalesce(x->>'ref', '')) not between 1 and 120
                   or char_length(coalesce(x->>'label', '')) not between 1 and 160
                   or not exists (select 1 from public.scd_teams t where t.organization_id = p_organization_id and t.code = x->>'teamCode')) then
    return jsonb_build_object('ok', false, 'code', 'invalid');
  end if;

  for r in select distinct x->>'teamCode' as code from jsonb_array_elements(p_items) x loop
    select t.id, t.name into v_team, v_team_name from public.scd_teams t
    where t.organization_id = p_organization_id and t.code = r.code
    order by (t.status = 'ACTIVE') desc, t.created_at desc limit 1;
    with ins as (
      insert into public.scd_team_gap_requests (organization_id, team_id, month, item_kind, item_ref, item_label, created_by)
      select p_organization_id, v_team, p_month, x->>'kind', x->>'ref', public.scd_team_text_clean(x->>'label', 160), (select auth.uid())
      from jsonb_array_elements(p_items) x where x->>'teamCode' = r.code
      on conflict (organization_id, team_id, month, item_kind, item_ref) do nothing
      returning item_label
    )
    select count(*), string_agg(item_label, '; ') into v_n, v_labels from ins;
    if v_n > 0 then
      v_new := v_new + v_n;
      insert into public.scd_notification_outbox (organization_id, kind, recipient_email, recipient_label, subject, body, digest)
      values (p_organization_id, 'INTEGRATION_REQUEST', null, left('Staff ' || v_team_name, 120),
              left('Da integrare o giustificare: ' || v_team_name || ' ' || to_char(p_month, 'MM/YYYY'), 200),
              left(v_n || ' richieste nell''Area squadra: ' || v_labels, 4000), true);
    end if;
  end loop;
  insert into public.scd_audit_events (organization_id, actor_user_id, action, entity_type, entity_id, payload)
  values (p_organization_id, (select auth.uid()), 'MONTHLY_GAP_REQUESTS_CREATED', 'scd_team_gap_requests', null,
          jsonb_build_object('month', p_month, 'items', jsonb_array_length(p_items), 'new', v_new));
  return jsonb_build_object('ok', true, 'created', v_new);
end;
$$;

create or replace function public.scd_office_gap_requests(p_organization_id uuid, p_month date)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select case when (select auth.uid()) is null
      or not public.scd_has_org_role(p_organization_id, array['DIRECTION', 'SECRETARIAT']::public.scd_role[]) then null
    else coalesce((
      select jsonb_agg(jsonb_build_object('id', g.id, 'team_code', t.code, 'kind', g.item_kind, 'ref', g.item_ref,
               'label', g.item_label, 'status', g.status, 'answer_note', g.answer_note, 'answered_at', g.answered_at,
               'created_at', g.created_at) order by t.code, g.created_at)
      from public.scd_team_gap_requests g join public.scd_teams t on t.id = g.team_id
      where g.organization_id = p_organization_id and g.month = p_month), '[]'::jsonb) end;
$$;

-- Team staff: open (and last 60 days answered) requests of the caller's teams.
create or replace function public.scd_staff_gap_requests(p_organization_id uuid)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', g.id, 'team_code', t.code, 'month', g.month, 'kind', g.item_kind,
           'ref', g.item_ref, 'label', g.item_label, 'status', g.status, 'answer_note', g.answer_note)
           order by g.status <> 'OPEN', g.month desc, t.code), '[]'::jsonb)
  from public.scd_team_gap_requests g join public.scd_teams t on t.id = g.team_id
  where (select auth.uid()) is not null and g.organization_id = p_organization_id
    and g.team_id in (select public.scd_my_team_ids(p_organization_id))
    and (g.status = 'OPEN' or g.answered_at > now() - interval '60 days');
$$;

-- Team staff answers: INTEGRATED (done now in the app) or JUSTIFIED (with a reason). Office may also CLOSE.
create or replace function public.scd_staff_answer_gap_request(p_organization_id uuid, p_request_id uuid, p_status text, p_note text)
returns jsonb
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_team uuid;
  v_office boolean := public.scd_has_org_role(p_organization_id, array['DIRECTION', 'SECRETARIAT']::public.scd_role[]);
begin
  if coalesce(p_status, '') not in ('INTEGRATED', 'JUSTIFIED', 'CLOSED') or char_length(coalesce(p_note, '')) > 300
     or (p_status = 'JUSTIFIED' and char_length(btrim(coalesce(p_note, ''))) < 3) then
    return jsonb_build_object('ok', false, 'code', 'invalid');
  end if;
  select g.team_id into v_team from public.scd_team_gap_requests g
  where g.id = p_request_id and g.organization_id = p_organization_id;
  if v_team is null or (select auth.uid()) is null or not public.scd_team_scope_by_id(p_organization_id, v_team)
     or (p_status = 'CLOSED' and not v_office) then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  update public.scd_team_gap_requests set status = p_status, answer_note = public.scd_team_text_clean(p_note, 300),
    answered_by = (select auth.uid()), answered_at = now()
  where id = p_request_id;
  insert into public.scd_audit_events (organization_id, actor_user_id, action, entity_type, entity_id, payload)
  values (p_organization_id, (select auth.uid()), 'GAP_REQUEST_ANSWERED', 'scd_team_gap_requests', p_request_id,
          jsonb_build_object('status', p_status));
  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------- 8. grants
revoke all on function public.scd_staff_training_list(uuid, text, date, date) from public, anon;
revoke all on function public.scd_staff_training_save(uuid, jsonb) from public, anon;
revoke all on function public.scd_staff_training_attendance(uuid, uuid) from public, anon;
revoke all on function public.scd_staff_training_record(uuid, uuid, jsonb) from public, anon;
revoke all on function public.scd_staff_drills(uuid, text) from public, anon;
revoke all on function public.scd_staff_drill_save(uuid, jsonb) from public, anon;
revoke all on function public.scd_staff_drill_archive(uuid, uuid) from public, anon;
revoke all on function public.scd_staff_drill_image_path(uuid, uuid) from public, anon;
revoke all on function public.scd_my_trainings(uuid, date, date) from public, anon;
revoke all on function public.scd_my_training_notice(uuid, uuid, uuid, text, text) from public, anon;
revoke all on function public.scd_my_team_drills(uuid) from public, anon;
revoke all on function public.scd_office_training_month(uuid, date) from public, anon;
revoke all on function public.scd_office_create_gap_requests(uuid, date, jsonb) from public, anon;
revoke all on function public.scd_office_gap_requests(uuid, date) from public, anon;
revoke all on function public.scd_staff_gap_requests(uuid) from public, anon;
revoke all on function public.scd_staff_answer_gap_request(uuid, uuid, text, text) from public, anon;
grant execute on function public.scd_staff_training_list(uuid, text, date, date) to authenticated;
grant execute on function public.scd_staff_training_save(uuid, jsonb) to authenticated;
grant execute on function public.scd_staff_training_attendance(uuid, uuid) to authenticated;
grant execute on function public.scd_staff_training_record(uuid, uuid, jsonb) to authenticated;
grant execute on function public.scd_staff_drills(uuid, text) to authenticated;
grant execute on function public.scd_staff_drill_save(uuid, jsonb) to authenticated;
grant execute on function public.scd_staff_drill_archive(uuid, uuid) to authenticated;
grant execute on function public.scd_staff_drill_image_path(uuid, uuid) to authenticated;
grant execute on function public.scd_my_trainings(uuid, date, date) to authenticated;
grant execute on function public.scd_my_training_notice(uuid, uuid, uuid, text, text) to authenticated;
grant execute on function public.scd_my_team_drills(uuid) to authenticated;
grant execute on function public.scd_office_training_month(uuid, date) to authenticated;
grant execute on function public.scd_office_create_gap_requests(uuid, date, jsonb) to authenticated;
grant execute on function public.scd_office_gap_requests(uuid, date) to authenticated;
grant execute on function public.scd_staff_gap_requests(uuid) to authenticated;
grant execute on function public.scd_staff_answer_gap_request(uuid, uuid, text, text) to authenticated;
