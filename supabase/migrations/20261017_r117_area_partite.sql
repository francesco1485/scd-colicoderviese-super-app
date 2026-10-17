-- r117: Area partite per squadra (UD-183, Francesco DG 17/10/2026 12:36). STAGED: NOT APPLIED.
-- Apply on SCD PULSE (ndevtxxijbcnskgysdit) only after Francesco writes "applica r117". Never on dfnwzwutvnwiitiffwvr.
--
-- What already existed and is REUSED, not duplicated (audit 2026-10-17):
--   * scd_events + scd_matches (r33/r51): the match row is created from the official calendar copy by
--     scd_staff_ensure_match (r62), source MASTER_CALENDARIO_2026_27, team in scd_events.metadata.team_id;
--   * convocazione: scd_match_callups + scd_staff_send_callups / withdraw / scd_my_callups / scd_respond_callup
--     (r53, r62, r67 push, r68, r69 multi-annata). Presa visione / impedimento, never "Ci sarò" (UD-099);
--   * distinta (our team): scd_match_sheets + scd_staff_save_match_sheet (r70);
--   * tabellino (score, minutes, goals, assists, cards of our players by roster id): scd_match_performance +
--     scd_match_team_stats + scd_staff_save_match_report (r92), it feeds the Fantacalcio;
--   * private storage bucket scd-private (r75): one bucket, a new path prefix <org>/match/<match_id>/...;
--   * team scope: scd_my_team_ids (r61/r61_1/r65_1): staff of that team (organigramma), teams added by the
--     Direzione in Accessi, the sports coordinator, and the office roles (DIRECTION, SECRETARIAT, REGISTRATION).
-- Official LND fields on scd_matches are added by another change (r115): this file does NOT touch scd_matches.
--
-- What r117 adds (additive, idempotent):
--   1. scd_match_reports: one row per match with the short report (resoconto), the opponent line-up and the opponent
--      scorers as free text, and the official LND score typed by the Segreteria/Direzione. The mister's tabellino is
--      «Provvisorio» until the official score is recorded and equal (computed at read time, never stored);
--   2. scd_match_documents: referto and distinte of both teams (PDF/photo) in scd-private under <org>/match/<id>/,
--      read and written only by the team scope; removal marks removed_at (row kept for the history);
--   3. scd_match_callups.impediment_code / impediment_note: when a family reports an impediment it may say why with
--      a category (no health details, the note is stripped of phones and e-mails);
--   4. functions (SECURITY DEFINER, fixed search_path, explicit checks): scd_staff_match_area,
--      scd_staff_save_match_notes, scd_staff_register_match_document, scd_staff_match_document_path,
--      scd_staff_remove_match_document, scd_office_set_official_result, scd_staff_match_status,
--      scd_report_callup_impediment, scd_storage_team_file_allowed (+ two storage policies).
-- RLS enabled on every new table with NO policies and no grants to anon/authenticated: access only through the
-- functions. Audit rows in scd_audit_events carry ids, kinds and counts only, never free text or names.
--
-- Engines: TEMPO (the mister fills the match in one place; the Segreteria stops chasing referti by WhatsApp) and
-- PERSONE (families see the call-up and the shared notes). Measure: share of played matches per month with
-- convocazione + distinta + tabellino + referto complete (from scd_staff_match_status), minutes of Segreteria per
-- month on the monthly check (r118), tabellini «Provvisorio» older than 7 days.
--
-- Rollback:
--   begin;
--   drop policy if exists scd_private_team_files_insert on storage.objects;
--   drop policy if exists scd_private_team_files_select on storage.objects;
--   drop function if exists public.scd_team_docs_retention_candidates();
--   drop function if exists public.scd_storage_team_file_allowed(text);
--   drop function if exists public.scd_report_callup_impediment(uuid, uuid, text, text);
--   drop function if exists public.scd_staff_match_status(uuid, text[]);
--   drop function if exists public.scd_office_set_official_result(uuid, uuid, integer, integer);
--   drop function if exists public.scd_staff_remove_match_document(uuid, uuid);
--   drop function if exists public.scd_staff_match_document_path(uuid, uuid);
--   drop function if exists public.scd_staff_register_match_document(uuid, uuid, jsonb);
--   drop function if exists public.scd_staff_save_match_notes(uuid, uuid, jsonb);
--   drop function if exists public.scd_staff_match_area(uuid, text);
--   drop function if exists public.scd_team_area_scope(uuid, uuid);
--   drop function if exists public.scd_team_text_clean(text, integer);
--   drop table if exists public.scd_match_documents;
--   drop table if exists public.scd_match_reports;
--   alter table public.scd_match_callups drop column if exists impediment_code, drop column if exists impediment_note;
--   commit;
-- Files already uploaded under <org>/match/ stay in scd-private and can be listed and removed by hand.

-- ---------------------------------------------------------------- 0. prerequisites
do $$
begin
  if to_regclass('public.scd_matches') is null
     or to_regclass('public.scd_match_sheets') is null
     or to_regclass('public.scd_match_team_stats') is null
     or to_regclass('public.scd_audit_events') is null
     or to_regprocedure('public.scd_my_team_ids(uuid)') is null
     or to_regprocedure('public.scd_match_team_id(uuid)') is null
     or to_regprocedure('public.scd_my_family(uuid)') is null
     or to_regprocedure('public.scd_has_org_role(uuid, public.scd_role[])') is null
     or not exists (select 1 from information_schema.columns
                    where table_schema = 'public' and table_name = 'scd_match_callups' and column_name = 'withdrawn_at')
  then
    raise exception 'r117 prerequisites missing: r33, r53, r61, r62, r68, r70 and r92 must be applied first';
  end if;
end $$;

-- ---------------------------------------------------------------- 1. tables
create table if not exists public.scd_match_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  match_id uuid not null unique references public.scd_matches(id) on delete cascade,
  summary text check (summary is null or char_length(summary) <= 2000),
  opponent_lineup text check (opponent_lineup is null or char_length(opponent_lineup) <= 1500),
  opponent_scorers text check (opponent_scorers is null or char_length(opponent_scorers) <= 600),
  official_goals_for integer check (official_goals_for is null or official_goals_for between 0 and 30),
  official_goals_against integer check (official_goals_against is null or official_goals_against between 0 and 30),
  official_checked_at timestamptz,
  official_checked_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((official_goals_for is null) = (official_goals_against is null))
);

create table if not exists public.scd_match_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  match_id uuid not null references public.scd_matches(id) on delete cascade,
  kind text not null check (kind in ('REFERTO', 'DISTINTA_NOSTRA', 'DISTINTA_AVVERSARI', 'ALTRO')),
  storage_path text not null unique
    check (storage_path ~ '^[0-9a-f-]{36}/match/[0-9a-f-]{36}/[A-Za-z0-9._-]{1,140}$'),
  file_name text not null check (char_length(file_name) between 1 and 160),
  mime_type text not null check (mime_type in ('application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/webp')),
  size_bytes bigint not null check (size_bytes between 1 and 15728640),
  uploaded_by uuid,
  created_at timestamptz not null default now(),
  removed_at timestamptz,
  removed_by uuid
);
create index if not exists scd_match_documents_match_idx on public.scd_match_documents(match_id) where removed_at is null;

alter table public.scd_match_callups
  add column if not exists impediment_code text
    check (impediment_code is null or impediment_code in ('SCUOLA', 'FAMIGLIA', 'TRASPORTO', 'PERSONALE', 'ALTRO')),
  add column if not exists impediment_note text check (impediment_note is null or char_length(impediment_note) <= 140);

alter table public.scd_match_reports enable row level security;
alter table public.scd_match_documents enable row level security;
revoke all on table public.scd_match_reports from anon, authenticated;
revoke all on table public.scd_match_documents from anon, authenticated;

comment on table public.scd_match_reports is 'r117: resoconto, opponent line-up and scorers (free text, no minors of other clubs by full name required), official LND score typed by the office. Tabellino state is computed: PROVVISORIO until the official score equals scd_match_team_stats.';
comment on table public.scd_match_documents is 'r117: referto and distinte of both teams in scd-private <org>/match/<match_id>/. Team scope only. removed_at keeps the history.';

-- ---------------------------------------------------------------- 2. helpers (not callable by clients)
-- Free text from staff or families: trimmed, e-mails and phone numbers replaced, cut to p_max. Null when empty.
create or replace function public.scd_team_text_clean(p_text text, p_max integer)
returns text
language sql
immutable
set search_path to 'public'
as $$
  select nullif(left(btrim(
    regexp_replace(
      regexp_replace(coalesce(p_text, ''), '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', '[email]', 'g'),
      '(\+|00)?[0-9]([ ./-]?[0-9]){7,}', '[telefono]', 'g')), p_max), '');
$$;
revoke all on function public.scd_team_text_clean(text, integer) from public, anon, authenticated;

-- True when the caller is in the team scope of the match (scd_my_team_ids) and the match is in the organization.
create or replace function public.scd_team_area_scope(p_organization_id uuid, p_match_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.scd_matches m
    where m.id = p_match_id and m.organization_id = p_organization_id
      and public.scd_match_team_id(m.id) is not null
      and public.scd_match_team_id(m.id) in (select public.scd_my_team_ids(p_organization_id)));
$$;
revoke all on function public.scd_team_area_scope(uuid, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------- 3. staff: one match
-- Everything the team staff sees about one calendar match. {"exists": false} when the match row is not created yet
-- (it is created by the first convocazione, resoconto or document). Raises 42501 outside the team scope.
create or replace function public.scd_staff_match_area(p_organization_id uuid, p_source_record_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_match uuid;
  v_team uuid;
  v_starts timestamptz;
  v_code text;
  v_rep public.scd_match_reports;
  v_ts public.scd_match_team_stats;
  v_sheet text;
begin
  if (select auth.uid()) is null then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select m.id, nullif(e.metadata->>'team_id', '')::uuid, e.starts_at into v_match, v_team, v_starts
  from public.scd_events e join public.scd_matches m on m.event_id = e.id
  where e.organization_id = p_organization_id and e.source_id = 'MASTER_CALENDARIO_2026_27'
    and e.source_record_id = p_source_record_id;
  if v_match is null then
    return jsonb_build_object('exists', false);
  end if;
  if v_team is null or v_team not in (select public.scd_my_team_ids(p_organization_id)) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select code into v_code from public.scd_teams where id = v_team;
  select * into v_rep from public.scd_match_reports where match_id = v_match;
  select * into v_ts from public.scd_match_team_stats ts where ts.match_id = v_match and ts.is_scd_team limit 1;
  select status into v_sheet from public.scd_match_sheets where match_id = v_match;

  return jsonb_build_object(
    'exists', true,
    'match_id', v_match,
    'team_code', v_code,
    'starts_at', v_starts,
    'played', v_starts <= now(),
    'callups', (
      select jsonb_build_object(
        'sent', count(*),
        'seen', count(*) filter (where c.response_status = 'CONFIRMED'),
        'impediments', count(*) filter (where c.response_status = 'DECLINED'),
        'pending', count(*) filter (where c.response_status = 'PENDING'))
      from public.scd_match_callups c where c.match_id = v_match and c.withdrawn_at is null),
    'impediments', coalesce((
      select jsonb_agg(jsonb_build_object(
          'athlete_id', c.athlete_id,
          'display_name', coalesce(nullif(p.display_name, ''), trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, ''))),
          'code', c.impediment_code,
          'note', c.impediment_note)
        order by p.last_name, p.first_name)
      from public.scd_match_callups c
      join public.scd_athletes a on a.id = c.athlete_id
      join public.scd_people p on p.id = a.person_id
      where c.match_id = v_match and c.withdrawn_at is null and c.response_status = 'DECLINED'), '[]'::jsonb),
    'sheet_status', coalesce(v_sheet, 'NONE'),
    'tabellino', case when v_ts.id is null then null else jsonb_build_object(
        'goals_for', v_ts.goals_for, 'goals_against', v_ts.goals_against, 'recorded_at', v_ts.updated_at) end,
    'report', jsonb_build_object(
      'summary', v_rep.summary,
      'opponent_lineup', v_rep.opponent_lineup,
      'opponent_scorers', v_rep.opponent_scorers,
      'official_goals_for', v_rep.official_goals_for,
      'official_goals_against', v_rep.official_goals_against,
      'official_checked_at', v_rep.official_checked_at,
      'updated_at', v_rep.updated_at),
    'documents', coalesce((
      select jsonb_agg(jsonb_build_object('id', d.id, 'kind', d.kind, 'file_name', d.file_name, 'mime', d.mime_type,
               'size', d.size_bytes, 'created_at', d.created_at) order by d.created_at)
      from public.scd_match_documents d where d.match_id = v_match and d.removed_at is null), '[]'::jsonb));
end;
$$;

-- Resoconto and opponent free text. Keys missing from p are kept as they are; empty strings clear.
create or replace function public.scd_staff_save_match_notes(p_organization_id uuid, p_match_id uuid, p jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_id uuid;
begin
  if (select auth.uid()) is null or not public.scd_team_area_scope(p_organization_id, p_match_id) then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  if jsonb_typeof(p) <> 'object'
     or exists (select 1 from jsonb_object_keys(p) k where k not in ('summary', 'opponentLineup', 'opponentScorers'))
     or exists (select 1 from jsonb_each(p) e where jsonb_typeof(e.value) not in ('string', 'null'))
     or char_length(coalesce(p->>'summary', '')) > 2000
     or char_length(coalesce(p->>'opponentLineup', '')) > 1500
     or char_length(coalesce(p->>'opponentScorers', '')) > 600 then
    return jsonb_build_object('ok', false, 'code', 'invalid');
  end if;

  insert into public.scd_match_reports as r (organization_id, match_id, summary, opponent_lineup, opponent_scorers, updated_by)
  values (p_organization_id, p_match_id,
          public.scd_team_text_clean(p->>'summary', 2000),
          public.scd_team_text_clean(p->>'opponentLineup', 1500),
          public.scd_team_text_clean(p->>'opponentScorers', 600),
          (select auth.uid()))
  on conflict (match_id) do update set
    summary = case when p ? 'summary' then excluded.summary else r.summary end,
    opponent_lineup = case when p ? 'opponentLineup' then excluded.opponent_lineup else r.opponent_lineup end,
    opponent_scorers = case when p ? 'opponentScorers' then excluded.opponent_scorers else r.opponent_scorers end,
    updated_by = excluded.updated_by,
    updated_at = now()
  returning id into v_id;

  insert into public.scd_audit_events (organization_id, actor_user_id, action, entity_type, entity_id, payload)
  values (p_organization_id, (select auth.uid()), 'MATCH_NOTES_SAVED', 'scd_matches', p_match_id,
          jsonb_build_object('fields', (select coalesce(jsonb_agg(k order by k), '[]'::jsonb) from jsonb_object_keys(p) k)));
  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

-- Register a file already uploaded by the same caller to scd-private under <org>/match/<match_id>/.
create or replace function public.scd_staff_register_match_document(p_organization_id uuid, p_match_id uuid, p jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_path text := p->>'path';
  v_id uuid;
begin
  if (select auth.uid()) is null or not public.scd_team_area_scope(p_organization_id, p_match_id) then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  if v_path is null
     or split_part(v_path, '/', 1) <> p_organization_id::text
     or split_part(v_path, '/', 2) <> 'match'
     or split_part(v_path, '/', 3) <> p_match_id::text
     or v_path !~ '^[0-9a-f-]{36}/match/[0-9a-f-]{36}/[A-Za-z0-9._-]{1,140}$' then
    return jsonb_build_object('ok', false, 'code', 'path');
  end if;
  if coalesce(p->>'kind', '') not in ('REFERTO', 'DISTINTA_NOSTRA', 'DISTINTA_AVVERSARI', 'ALTRO')
     or coalesce(p->>'mime', '') not in ('application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/webp')
     or coalesce(p->>'size', '') !~ '^[0-9]{1,9}$' or (p->>'size')::bigint not between 1 and 15728640 then
    return jsonb_build_object('ok', false, 'code', 'invalid');
  end if;
  insert into public.scd_match_documents (organization_id, match_id, kind, storage_path, file_name, mime_type, size_bytes, uploaded_by)
  values (p_organization_id, p_match_id, p->>'kind', v_path,
          coalesce(public.scd_team_text_clean(p->>'fileName', 160), 'documento'), p->>'mime', (p->>'size')::bigint, (select auth.uid()))
  on conflict (storage_path) do nothing
  returning id into v_id;
  if v_id is null then
    return jsonb_build_object('ok', false, 'code', 'duplicate');
  end if;
  insert into public.scd_audit_events (organization_id, actor_user_id, action, entity_type, entity_id, payload)
  values (p_organization_id, (select auth.uid()), 'MATCH_DOCUMENT_ADDED', 'scd_match_documents', v_id,
          jsonb_build_object('match_id', p_match_id, 'kind', p->>'kind'));
  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

-- Storage path of a document the caller may open (null otherwise). The app turns it into a 2-minute signed link.
create or replace function public.scd_staff_match_document_path(p_organization_id uuid, p_document_id uuid)
returns text
language sql
stable
security definer
set search_path to 'public'
as $$
  select d.storage_path from public.scd_match_documents d
  where d.id = p_document_id and d.organization_id = p_organization_id and d.removed_at is null
    and (select auth.uid()) is not null
    and public.scd_team_area_scope(p_organization_id, d.match_id);
$$;

create or replace function public.scd_staff_remove_match_document(p_organization_id uuid, p_document_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_match uuid;
begin
  select d.match_id into v_match from public.scd_match_documents d
  where d.id = p_document_id and d.organization_id = p_organization_id and d.removed_at is null;
  if v_match is null or (select auth.uid()) is null or not public.scd_team_area_scope(p_organization_id, v_match) then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  update public.scd_match_documents set removed_at = now(), removed_by = (select auth.uid()) where id = p_document_id;
  insert into public.scd_audit_events (organization_id, actor_user_id, action, entity_type, entity_id, payload)
  values (p_organization_id, (select auth.uid()), 'MATCH_DOCUMENT_REMOVED', 'scd_match_documents', p_document_id,
          jsonb_build_object('match_id', v_match));
  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------- 4. office: official LND score
-- The Segreteria or the Direzione types the official score read on the LND portal (null, null clears it).
create or replace function public.scd_office_set_official_result(p_organization_id uuid, p_match_id uuid, p_goals_for integer, p_goals_against integer)
returns jsonb
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
begin
  if (select auth.uid()) is null
     or not public.scd_has_org_role(p_organization_id, array['DIRECTION', 'SECRETARIAT']::public.scd_role[])
     or not exists (select 1 from public.scd_matches m where m.id = p_match_id and m.organization_id = p_organization_id) then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  if (p_goals_for is null) <> (p_goals_against is null)
     or (p_goals_for is not null and (p_goals_for not between 0 and 30 or p_goals_against not between 0 and 30)) then
    return jsonb_build_object('ok', false, 'code', 'invalid');
  end if;
  insert into public.scd_match_reports as r (organization_id, match_id, official_goals_for, official_goals_against, official_checked_at, official_checked_by)
  values (p_organization_id, p_match_id, p_goals_for, p_goals_against, now(), (select auth.uid()))
  on conflict (match_id) do update set
    official_goals_for = excluded.official_goals_for, official_goals_against = excluded.official_goals_against,
    official_checked_at = now(), official_checked_by = excluded.official_checked_by, updated_at = now();
  insert into public.scd_audit_events (organization_id, actor_user_id, action, entity_type, entity_id, payload)
  values (p_organization_id, (select auth.uid()), 'MATCH_OFFICIAL_RESULT_SET', 'scd_matches', p_match_id,
          jsonb_build_object('cleared', p_goals_for is null));
  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------- 5. status of many matches (area list, monthly check)
-- One row per calendar id that has a match row in the caller's team scope. Calendar ids without a row are simply
-- absent: the app reads them as "nothing recorded yet". Counts only, no names.
create or replace function public.scd_staff_match_status(p_organization_id uuid, p_source_record_ids text[])
returns table (
  source_record_id text,
  match_id uuid,
  team_code text,
  callups_sent integer,
  callups_seen integer,
  sheet_status text,
  tabellino boolean,
  goals_for integer,
  goals_against integer,
  official_goals_for integer,
  official_goals_against integer,
  has_summary boolean,
  has_referto boolean,
  has_opponent_sheet boolean
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select e.source_record_id, m.id, t.code,
    (select count(*)::integer from public.scd_match_callups c where c.match_id = m.id and c.withdrawn_at is null),
    (select count(*)::integer from public.scd_match_callups c where c.match_id = m.id and c.withdrawn_at is null and c.response_status = 'CONFIRMED'),
    coalesce((select s.status from public.scd_match_sheets s where s.match_id = m.id), 'NONE'),
    ts.id is not null, ts.goals_for, ts.goals_against,
    r.official_goals_for, r.official_goals_against,
    coalesce(r.summary, '') <> '',
    exists (select 1 from public.scd_match_documents d where d.match_id = m.id and d.removed_at is null and d.kind = 'REFERTO'),
    exists (select 1 from public.scd_match_documents d where d.match_id = m.id and d.removed_at is null and d.kind = 'DISTINTA_AVVERSARI')
      or coalesce(r.opponent_lineup, '') <> ''
  from public.scd_events e
  join public.scd_matches m on m.event_id = e.id
  join public.scd_teams t on t.id = nullif(e.metadata->>'team_id', '')::uuid
  left join public.scd_match_team_stats ts on ts.match_id = m.id and ts.is_scd_team
  left join public.scd_match_reports r on r.match_id = m.id
  where (select auth.uid()) is not null
    and e.organization_id = p_organization_id
    and e.source_id = 'MASTER_CALENDARIO_2026_27'
    and e.source_record_id = any(coalesce(p_source_record_ids, '{}'::text[]))
    and coalesce(array_length(p_source_record_ids, 1), 0) <= 400
    and t.id in (select public.scd_my_team_ids(p_organization_id));
$$;

-- ---------------------------------------------------------------- 6. family: impediment with a reason category
-- Same rules as scd_respond_callup (r68): athlete or guardian circle only, not withdrawn, before kick-off.
-- The call-up stays valid: the mister decides. No health details: the note is short and stripped of contacts.
create or replace function public.scd_report_callup_impediment(p_organization_id uuid, p_callup_id uuid, p_code text, p_note text)
returns jsonb
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_person uuid;
  v_starts timestamptz;
begin
  if coalesce(p_code, '') not in ('SCUOLA', 'FAMIGLIA', 'TRASPORTO', 'PERSONALE', 'ALTRO') or char_length(coalesce(p_note, '')) > 140 then
    return jsonb_build_object('ok', false, 'code', 'invalid');
  end if;
  select a.person_id, e.starts_at into v_person, v_starts
  from public.scd_match_callups c
  join public.scd_athletes a on a.id = c.athlete_id
  join public.scd_matches m on m.id = c.match_id
  join public.scd_events e on e.id = m.event_id
  where c.id = p_callup_id and c.organization_id = p_organization_id and c.withdrawn_at is null;
  if v_person is null or (select auth.uid()) is null
     or v_person not in (select f.person_id from public.scd_my_family(p_organization_id) f) then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  if v_starts < now() then
    return jsonb_build_object('ok', false, 'code', 'started');
  end if;
  update public.scd_match_callups
    set response_status = 'DECLINED', impediment_code = p_code,
        impediment_note = public.scd_team_text_clean(p_note, 140), updated_at = now()
    where id = p_callup_id;
  insert into public.scd_audit_events (organization_id, actor_user_id, action, entity_type, entity_id, payload)
  values (p_organization_id, (select auth.uid()), 'CALLUP_IMPEDIMENT_REPORTED', 'scd_match_callups', p_callup_id,
          jsonb_build_object('code', p_code));
  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------- 7. storage (bucket scd-private from r75)
-- <org>/match/<match_id>/<file>: team scope of the match. <org>/drill/<team_id>/<file>: team scope of the team
-- (used by r118 for the image of a «dinamica di gioco»). Anything else: false.
create or replace function public.scd_storage_team_file_allowed(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_org uuid;
  v_ref uuid;
  v_kind text := split_part(p_name, '/', 2);
begin
  if (select auth.uid()) is null or v_kind not in ('match', 'drill')
     or p_name !~ '^[0-9a-f-]{36}/(match|drill)/[0-9a-f-]{36}/[A-Za-z0-9._-]{1,140}$' then
    return false;
  end if;
  begin
    v_org := split_part(p_name, '/', 1)::uuid;
    v_ref := split_part(p_name, '/', 3)::uuid;
  exception when others then
    return false;
  end;
  if v_kind = 'match' then
    -- A removed document (removed_at set) is closed for everyone, staff included: the row stays as history only.
    if exists (select 1 from public.scd_match_documents d where d.storage_path = p_name and d.removed_at is not null) then
      return false;
    end if;
    return public.scd_team_area_scope(v_org, v_ref);
  end if;
  return exists (select 1 from public.scd_teams t where t.id = v_ref and t.organization_id = v_org
                 and t.id in (select public.scd_my_team_ids(v_org)));
end;
$$;

-- Retention placeholder (NOT scheduled, nothing deletes anything): removed match documents older than 30 days,
-- candidates for the storage clean-up. The retention term is «da confermare con Francesco»; until then the files stay.
create or replace function public.scd_team_docs_retention_candidates()
returns table (document_id uuid, organization_id uuid, match_id uuid, storage_path text, removed_at timestamptz)
language sql
stable
security definer
set search_path to 'public'
as $$
  select d.id, d.organization_id, d.match_id, d.storage_path, d.removed_at
  from public.scd_match_documents d
  where d.removed_at is not null and d.removed_at < now() - interval '30 days'
  order by d.removed_at;
$$;
revoke all on function public.scd_team_docs_retention_candidates() from public, anon, authenticated;
grant execute on function public.scd_team_docs_retention_candidates() to service_role;
comment on function public.scd_team_docs_retention_candidates() is 'r117: retention placeholder, not scheduled. Term 30 days da confermare con Francesco. service_role only.';

do $$
begin
  if to_regclass('storage.objects') is not null then
    if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'scd_private_team_files_insert') then
      create policy scd_private_team_files_insert on storage.objects for insert to authenticated
        with check (bucket_id = 'scd-private' and public.scd_storage_team_file_allowed(name));
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'scd_private_team_files_select') then
      create policy scd_private_team_files_select on storage.objects for select to authenticated
        using (bucket_id = 'scd-private' and public.scd_storage_team_file_allowed(name));
    end if;
  end if;
end $$;

-- ---------------------------------------------------------------- 8. grants
revoke all on function public.scd_staff_match_area(uuid, text) from public, anon;
revoke all on function public.scd_staff_save_match_notes(uuid, uuid, jsonb) from public, anon;
revoke all on function public.scd_staff_register_match_document(uuid, uuid, jsonb) from public, anon;
revoke all on function public.scd_staff_match_document_path(uuid, uuid) from public, anon;
revoke all on function public.scd_staff_remove_match_document(uuid, uuid) from public, anon;
revoke all on function public.scd_office_set_official_result(uuid, uuid, integer, integer) from public, anon;
revoke all on function public.scd_staff_match_status(uuid, text[]) from public, anon;
revoke all on function public.scd_report_callup_impediment(uuid, uuid, text, text) from public, anon;
revoke all on function public.scd_storage_team_file_allowed(text) from public, anon;
grant execute on function public.scd_staff_match_area(uuid, text) to authenticated;
grant execute on function public.scd_staff_save_match_notes(uuid, uuid, jsonb) to authenticated;
grant execute on function public.scd_staff_register_match_document(uuid, uuid, jsonb) to authenticated;
grant execute on function public.scd_staff_match_document_path(uuid, uuid) to authenticated;
grant execute on function public.scd_staff_remove_match_document(uuid, uuid) to authenticated;
grant execute on function public.scd_office_set_official_result(uuid, uuid, integer, integer) to authenticated;
grant execute on function public.scd_staff_match_status(uuid, text[]) to authenticated;
grant execute on function public.scd_report_callup_impediment(uuid, uuid, text, text) to authenticated;
grant execute on function public.scd_storage_team_file_allowed(text) to authenticated;
