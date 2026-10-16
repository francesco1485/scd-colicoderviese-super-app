-- r135: activities and duty shifts at the sports centres of Colico and Dervio ("Attivita in struttura"),
-- 2026-10-16, chat PC range r130-r149.
-- STAGED: NOT APPLIED. Apply only after Francesco writes "applica r135".
-- Requires (UNVERIFIED on the live project until checked at apply time): r33 (scd_organizations),
-- r35 (scd_has_org_role), r74 (scd_has_position).
--
-- Why (Francesco, DG, 15/10/2026 14:33 "attivita personale/tesserati in struttura", "attivita serali in struttura";
-- 16/10/2026 06:23 "facciamo lavorare tutti a pieno regime"): what happens at the centres besides official matches
-- and the training quadro (volunteer shifts, openings and closings, evening activities, Club House evenings, gym)
-- has no register today. The page /gestionale/struttura shows trainings (Quadro settimanale) and home matches
-- (Master Calendario) already known, and reads this table for everything else.
--
-- What it stores: one row per activity or shift. Site, area, kind, start and end, the ROLE responsible (a position
-- id such as "responsabile-struttura-colico", never a person's name), whether the shift is covered (without saying
-- by whom), short title and notes. No personal data: title and notes refuse e-mail addresses and phone numbers;
-- no minors' data of any kind. created_by is kept for audit and never returned by the read function.
--
-- Who reads (mirror of apps/superapp/src/lib/structure-activities.ts STRUCTURE_READER_ROLES and
-- STRUCTURE_READER_POSITIONS, kept equal by a test): Direzione and Segreteria roles, and the positions of the area
-- registry entry "struttura" (config/superapp-areas.v1.json). Nobody else, never anon.
-- RLS is enabled with NO policies and no grants to anon/authenticated: the only door is the SECURITY DEFINER read
-- function below (explicit role check, fixed search_path, bounded date range). Writes are NOT part of r135: rows
-- are added by the Direzione (SQL editor) until a write function with its form is approved.
--
-- Engines: TEMPO (who opens, who closes and which shifts are uncovered, seen in one place instead of phone calls)
-- and PERSONE (volunteers and members find their evening activities). SOLDI indirectly: Club House evenings.
-- Measure: shifts recorded per week, share of uncovered shifts 48 hours before start, Club House evenings per month.
--
-- Additive only, idempotent (create if not exists / create or replace). Nothing existing is changed.
--
-- Rollback:
--   begin;
--   drop function if exists public.scd_structure_week(uuid, date, date);
--   drop function if exists public.scd_structure_reader(uuid);
--   drop table if exists public.scd_structure_activities;
--   commit;

begin;

-- ---------------------------------------------------------------- 1. activities and shifts
create table if not exists public.scd_structure_activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id),
  site text not null check (site in ('COLICO','DERVIO')),
  area text not null check (area in ('CAMPO','SPOGLIATOI','CLUB_HOUSE','PALESTRA')),
  kind text not null check (kind in ('TURNO_VOLONTARIO','APERTURA','CHIUSURA','ATTIVITA_SERALE','EVENTO')),
  title text not null
    check (char_length(btrim(title)) between 2 and 80
      and title !~ '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}'
      and title !~ '(\+|00)?[0-9]([ -]?[0-9]){8,}'),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  -- position id of the registry (e.g. responsabile-struttura-colico), never a person's name
  responsible_role text check (responsible_role is null or responsible_role ~ '^[a-z0-9-]{2,60}$'),
  -- the shift has someone on it; who it is stays outside this table
  covered boolean not null default false,
  status text not null default 'PREVISTA' check (status in ('PREVISTA','ANNULLATA')),
  notes text
    check (notes is null or (char_length(notes) <= 300
      and notes !~ '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}'
      and notes !~ '(\+|00)?[0-9]([ -]?[0-9]){8,}')),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at and ends_at <= starts_at + interval '24 hours')
);
create index if not exists scd_structure_activities_week_idx
  on public.scd_structure_activities (organization_id, starts_at);
create index if not exists scd_structure_activities_site_idx
  on public.scd_structure_activities (organization_id, site, starts_at);
alter table public.scd_structure_activities enable row level security;
revoke all on table public.scd_structure_activities from anon, authenticated;

-- ---------------------------------------------------------------- 2. who may read (staff only)
create or replace function public.scd_structure_reader(p_organization_id uuid)
returns boolean
language sql
stable
set search_path to 'public'
as $$
  select public.scd_has_org_role(p_organization_id, array['DIRECTION','SECRETARIAT']::public.scd_role[])
    or public.scd_has_position(p_organization_id, array['presidente','direttore-generale','coordinatore-attivita-sportiva','responsabile-attivita-base','responsabile-struttura','responsabile-struttura-colico','responsabile-struttura-dervio','responsabile-campi','responsabile-club-house']);
$$;
revoke all on function public.scd_structure_reader(uuid) from public, anon;

-- ---------------------------------------------------------------- 3. read a range (at most 42 days)
create or replace function public.scd_structure_week(p_organization_id uuid, p_from date, p_to date)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  if auth.uid() is null or not public.scd_structure_reader(p_organization_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 42 then
    raise exception 'invalid range' using errcode = '22023';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
        'id', a.id,
        'site', a.site,
        'area', a.area,
        'kind', a.kind,
        'title', a.title,
        'startsAt', a.starts_at,
        'endsAt', a.ends_at,
        'responsibleRole', a.responsible_role,
        'covered', a.covered,
        'status', a.status,
        'notes', a.notes
      ) order by a.starts_at, a.site, a.area)
    from public.scd_structure_activities a
    where a.organization_id = p_organization_id
      and a.starts_at >= (p_from::timestamp at time zone 'Europe/Rome')
      and a.starts_at < ((p_to + 1)::timestamp at time zone 'Europe/Rome')
  ), '[]'::jsonb);
end;
$$;
revoke all on function public.scd_structure_week(uuid, date, date) from public, anon;
grant execute on function public.scd_structure_week(uuid, date, date) to authenticated;

commit;
