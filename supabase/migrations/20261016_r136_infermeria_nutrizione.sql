-- r136: Infermeria and Nutrizionista (DG 15/10/2026 14:33 "infermeria, nutrizionista"; 16/10 06:23 "a pieno regime").
-- STAGED: written, NOT applied. Apply only after the explicit "applica" of the Direzione.
-- Requires r59/r61 (people, athletes, families, identity links), r66 (certificate register), r74 (scd_has_position),
-- r79 (scd_proposals, scd_proposal_ingest) and r100 (scd_person_grants, scd_level_rank) applied.
-- Apply after r101: section 1 recreates scd_section_catalog() with every r101 entry identical and appends
-- "nutrizione". If r101 is ever applied after r136, run r136 again (the whole file is idempotent).
--
-- What it adds (no existing table or row is changed, no row is inserted; two existing functions, the catalogue and
-- the access guard, are recreated with their previous content plus one entry each):
--   1. the "nutrizione" section in the catalogue (config/scd-sections.v1.json);
--   2. scd_health_staff(): who works in the Infermeria / Nutrizionista (Direzione membership, position
--      responsabile-infermeria / nutrizionista, or an active r100 grant with perimeter ALL, or OWN_SITE for the site);
--   3. Infermeria tables with RLS on and no policies (read and written only through the functions below):
--      scd_health_injuries (athlete, date, body-area CATEGORY from a fixed list, status, return-to-play steps),
--      scd_first_aid_kits (site, kit, last and next check), scd_aed_devices (site, device, pads and battery expiry);
--   4. scd_infermeria_certificate_board / _board / _injury_save / _kit_save / _aed_save;
--   5. Nutrizionista: scd_nutrition_request (families, own circle only, through scd_proposal_ingest: the work-queue
--      title is only "Richiesta consulenza nutrizionista · <squadra>") and scd_nutrition_requests / _request_update
--      for the nutrition staff. No personal plan, diet or health detail is stored anywhere.
--   6. scd_access_admin_guard (r87) recreated identical plus the assignable position "nutrizionista";
--
-- Health data rules: no free text, no diagnosis, symptom or therapy column; names returned as first name + surname
-- initial; exception messages never carry values; nothing is written to an audit or log table.
-- Never run on dfnwzwutvnwiitiffwvr. Target: SCD PULSE.

-- 1. Section catalogue: r101 entries unchanged, "nutrizione" appended.
create or replace function public.scd_section_catalog()
returns table (code text, levels text[], perimeters text[], base boolean, hard_blocked boolean, direction_only boolean, sensitive boolean)
language sql
immutable
set search_path to 'public'
as $$
  select x.code,
         array(select jsonb_array_elements_text(x.levels)),
         array(select jsonb_array_elements_text(x.perimeters)),
         x.base, x.hard_blocked, x.direction_only, x.sensitive
  from jsonb_to_recordset($cat$
[
  {"code":"pubblico","levels":["READ"],"perimeters":["ALL"],"base":true,"hard_blocked":false,"direction_only":false,"sensitive":false},
  {"code":"profilo","levels":["WRITE"],"perimeters":["SELF"],"base":true,"hard_blocked":false,"direction_only":false,"sensitive":false},
  {"code":"tessera","levels":["READ"],"perimeters":["SELF"],"base":true,"hard_blocked":false,"direction_only":false,"sensitive":false},
  {"code":"mister","levels":["READ","WRITE","APPROVE"],"perimeters":["ALL","OWN_TEAMS"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":true},
  {"code":"quadro","levels":["READ","WRITE"],"perimeters":["ALL","OWN_TEAMS","OWN_SITE"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":false},
  {"code":"impianti-campi","levels":["READ","WRITE","APPROVE"],"perimeters":["ALL","OWN_SITE"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":false},
  {"code":"mappa","levels":["READ"],"perimeters":["ALL","OWN_SITE"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":false},
  {"code":"organigramma","levels":["READ","WRITE"],"perimeters":["ALL"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":false},
  {"code":"pulmini","levels":["READ","WRITE","APPROVE"],"perimeters":["ALL","OWN_TEAMS","SELF"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":true},
  {"code":"famiglia","levels":["READ","WRITE"],"perimeters":["OWN_CHILDREN","SELF"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":false},
  {"code":"infermeria","levels":["READ","WRITE"],"perimeters":["ALL","OWN_SITE","OWN_CHILDREN","SELF"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":true},
  {"code":"salute-minori","levels":[],"perimeters":[],"base":false,"hard_blocked":true,"direction_only":false,"sensitive":true},
  {"code":"safeguarding","levels":[],"perimeters":[],"base":false,"hard_blocked":true,"direction_only":false,"sensitive":true},
  {"code":"magazzino","levels":["READ","WRITE","APPROVE"],"perimeters":["ALL","OWN_SITE"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":false},
  {"code":"club-house","levels":["READ","WRITE"],"perimeters":["ALL","OWN_SITE"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":false},
  {"code":"biglietteria","levels":["READ","WRITE"],"perimeters":["ALL","OWN_SITE"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":false},
  {"code":"magazzino-cassa","levels":["READ","WRITE"],"perimeters":["ALL","OWN_SITE"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":false},
  {"code":"segreteria","levels":["READ","WRITE"],"perimeters":["ALL","OWN_TEAMS"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":false},
  {"code":"persone","levels":["READ","WRITE","APPROVE"],"perimeters":["ALL","OWN_TEAMS"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":true},
  {"code":"certificati","levels":["READ","WRITE"],"perimeters":["ALL","OWN_TEAMS"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":true},
  {"code":"coda","levels":["READ","WRITE","APPROVE"],"perimeters":["ALL"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":false},
  {"code":"posta","levels":["READ","WRITE","APPROVE"],"perimeters":["ALL"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":true},
  {"code":"crm","levels":["READ","WRITE","APPROVE"],"perimeters":["ALL"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":false},
  {"code":"crea","levels":["WRITE","APPROVE"],"perimeters":["ALL","OWN_TEAMS"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":false},
  {"code":"tesoreria","levels":["READ"],"perimeters":["ALL"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":true},
  {"code":"quote","levels":["READ","WRITE","APPROVE"],"perimeters":["ALL","OWN_TEAMS"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":true},
  {"code":"compensi","levels":["READ","WRITE","APPROVE"],"perimeters":["ALL","SELF"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":true},
  {"code":"scadenzario","levels":["READ","WRITE","APPROVE"],"perimeters":["ALL"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":false},
  {"code":"movimenti","levels":["READ","WRITE"],"perimeters":["ALL"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":true},
  {"code":"direzione","levels":["READ"],"perimeters":["ALL"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":false},
  {"code":"acquisti","levels":["READ","WRITE","APPROVE"],"perimeters":["ALL"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":false},
  {"code":"cervellone","levels":["READ","WRITE"],"perimeters":["ALL"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":true},
  {"code":"accessi","levels":["READ"],"perimeters":["ALL"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":true},
  {"code":"posta-collega","levels":[],"perimeters":[],"base":false,"hard_blocked":false,"direction_only":true,"sensitive":true},
  {"code":"partner","levels":["READ","WRITE"],"perimeters":["SELF"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":false},
  {"code":"fondo-solidale","levels":["READ","WRITE","APPROVE"],"perimeters":["ALL"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":true},
  {"code":"adotta","levels":["READ","WRITE","APPROVE"],"perimeters":["ALL"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":false},
  {"code":"donazioni","levels":["READ","WRITE","APPROVE"],"perimeters":["ALL"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":true},
  {"code":"proposte","levels":["READ","WRITE","APPROVE"],"perimeters":["ALL"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":false},
  {"code":"nutrizione","levels":["READ","WRITE"],"perimeters":["ALL"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":true}
]
$cat$::jsonb) as x(code text, levels jsonb, perimeters jsonb, base boolean, hard_blocked boolean, direction_only boolean, sensitive boolean);
$$;

-- 2. Who works in the health areas. p_site narrows OWN_SITE grants (kits and defibrillators of one site).
create or replace function public.scd_health_staff(p_organization_id uuid, p_section text, p_level text default 'READ', p_site text default null)
returns boolean
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null or p_organization_id is null or p_section not in ('infermeria', 'nutrizione') then
    return false;
  end if;
  if public.scd_level_rank(p_level) = 0 then
    return false;
  end if;
  if public.scd_has_org_role(p_organization_id, array['DIRECTION']::public.scd_role[]) then
    return true;
  end if;
  if public.scd_has_position(p_organization_id,
       case p_section when 'infermeria' then array['responsabile-infermeria'] else array['nutrizionista'] end) then
    return true;
  end if;
  return exists (
    select 1
    from public.scd_person_grants g
    join public.scd_identity_links l
      on l.organization_id = g.organization_id and l.person_id = g.person_id and l.user_id = v_uid and l.link_state <> 'REVOKED'
    join public.scd_memberships m
      on m.organization_id = g.organization_id and m.user_id = v_uid and m.active
    where g.organization_id = p_organization_id
      and g.section_code = p_section
      and g.revoked_at is null
      and public.scd_level_rank(g.level) >= public.scd_level_rank(p_level)
      and (g.perimeter = 'ALL' or (g.perimeter = 'OWN_SITE' and p_site is not null and g.site = upper(p_site))));
end;
$$;

-- First name + surname initial ("Mario R."): the only way a name leaves these functions.
create or replace function public.scd_health_short_name(p_first text, p_last text, p_display text)
returns text
language sql
immutable
set search_path to 'public'
as $$
  select case
    when nullif(trim(coalesce(p_first, '')), '') is not null
      then trim(p_first) || coalesce(' ' || upper(left(nullif(trim(coalesce(p_last, '')), ''), 1)) || '.', '')
    when nullif(trim(coalesce(p_display, '')), '') is not null
      then split_part(trim(p_display), ' ', 1)
        || coalesce(' ' || upper(left(nullif(regexp_replace(trim(p_display), '^\S+\s*', ''), ''), 1)) || '.', '')
    else null
  end;
$$;

-- 3. Infermeria tables. RLS on, no policies, no grants: only the SECURITY DEFINER functions below touch them.
create table if not exists public.scd_health_injuries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  athlete_id uuid not null references public.scd_athletes(id) on delete cascade,
  occurred_on date not null,
  body_area text not null check (body_area in ('TESTA_COLLO','SPALLA_BRACCIO','MANO_POLSO','TRONCO_SCHIENA','ANCA_COSCIA','GINOCCHIO','GAMBA_CAVIGLIA','PIEDE','ALTRO')),
  status text not null default 'FERMO' check (status in ('FERMO','IN_RECUPERO','RIENTRATO')),
  rtp_steps text[] not null default '{}'
    check (rtp_steps <@ array['STOP','VIA_LIBERA_MEDICO','LAVORO_DIFFERENZIATO','ALLENAMENTO_SQUADRA','OK_STAFF_MISTER']::text[]),
  check (status <> 'RIENTRATO' or rtp_steps @> array['STOP','VIA_LIBERA_MEDICO','LAVORO_DIFFERENZIATO','ALLENAMENTO_SQUADRA','OK_STAFF_MISTER']::text[]),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_by uuid,
  updated_at timestamptz not null default now()
);
create index if not exists scd_health_injuries_org_idx on public.scd_health_injuries (organization_id, status, occurred_on desc);
alter table public.scd_health_injuries enable row level security;

create table if not exists public.scd_first_aid_kits (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  site text not null check (site in ('COLICO','DERVIO')),
  kit text not null check (char_length(kit) between 2 and 60),
  last_check date,
  next_check date,
  check (last_check is null or next_check is null or next_check >= last_check),
  updated_by uuid,
  updated_at timestamptz not null default now(),
  unique (organization_id, site, kit)
);
alter table public.scd_first_aid_kits enable row level security;

create table if not exists public.scd_aed_devices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  site text not null check (site in ('COLICO','DERVIO')),
  device text not null check (char_length(device) between 2 and 60),
  pads_expires_on date,
  battery_expires_on date,
  last_check date,
  updated_by uuid,
  updated_at timestamptz not null default now(),
  unique (organization_id, site, device)
);
alter table public.scd_aed_devices enable row level security;

revoke all on table public.scd_health_injuries from public, anon, authenticated;
revoke all on table public.scd_first_aid_kits from public, anon, authenticated;
revoke all on table public.scd_aed_devices from public, anon, authenticated;

-- 4a. Certificate expiry board for the Infermeria: the same rows as scd_certificate_register (r66), names shortened,
-- read-only (dates are still corrected only in /segreteria/certificati).
create or replace function public.scd_infermeria_certificate_board(p_organization_id uuid)
returns table (
  athlete_id uuid,
  display_name text,
  birth_year integer,
  is_minor boolean,
  team_code text,
  team_name text,
  registration_status text,
  expires_at date,
  status text,
  kind text,
  checked_at timestamptz
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select
    a.id,
    public.scd_health_short_name(p.first_name, p.last_name, p.display_name),
    extract(year from p.birth_date)::integer,
    public.scd_is_minor(p.birth_date),
    t.code,
    t.name,
    a.registration_status,
    a.medical_certificate_expires_at,
    a.medical_certificate_status,
    a.medical_certificate_kind,
    a.medical_certificate_checked_at
  from public.scd_athletes a
  join public.scd_people p on p.id = a.person_id
  left join public.scd_team_memberships tm
    on tm.athlete_id = a.id and (tm.valid_to is null or tm.valid_to >= current_date)
  left join public.scd_teams t on t.id = tm.team_id
  where a.organization_id = p_organization_id
    and p.status <> 'ARCHIVED'
    and p.left_at is null
    and public.scd_health_staff(p_organization_id, 'infermeria', 'READ', null)
  order by t.code nulls last, p.last_name, p.first_name;
$$;

-- 4b. The Infermeria board: injuries (perimeter ALL only), kits and defibrillators (ALL or the granted site).
-- Null when the caller has no infermeria access at all.
create or replace function public.scd_infermeria_board(p_organization_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_all boolean := public.scd_health_staff(p_organization_id, 'infermeria', 'READ', null);
  v_sites text[] := array[]::text[];
begin
  if v_all then
    v_sites := array['COLICO','DERVIO'];
  else
    if public.scd_health_staff(p_organization_id, 'infermeria', 'READ', 'COLICO') then v_sites := array_append(v_sites, 'COLICO'); end if;
    if public.scd_health_staff(p_organization_id, 'infermeria', 'READ', 'DERVIO') then v_sites := array_append(v_sites, 'DERVIO'); end if;
  end if;
  if not v_all and cardinality(v_sites) = 0 then
    return null;
  end if;
  return jsonb_build_object(
    'canWrite', public.scd_health_staff(p_organization_id, 'infermeria', 'WRITE', null),
    'canWriteSites', to_jsonb(array(select s from unnest(array['COLICO','DERVIO']) s
                                    where public.scd_health_staff(p_organization_id, 'infermeria', 'WRITE', s))),
    'seesInjuries', v_all,
    'injuries', case when not v_all then '[]'::jsonb else coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id, 'athlete_id', i.athlete_id,
        'short_name', public.scd_health_short_name(p.first_name, p.last_name, p.display_name),
        'team_name', (select t.name from public.scd_team_memberships tm join public.scd_teams t on t.id = tm.team_id
                      where tm.athlete_id = i.athlete_id and (tm.valid_to is null or tm.valid_to >= current_date)
                      order by t.code limit 1),
        'occurred_on', i.occurred_on, 'body_area', i.body_area, 'status', i.status,
        'rtp_steps', to_jsonb(i.rtp_steps), 'updated_at', i.updated_at)
        order by i.occurred_on desc)
      from public.scd_health_injuries i
      join public.scd_athletes a on a.id = i.athlete_id
      join public.scd_people p on p.id = a.person_id
      where i.organization_id = p_organization_id
        and (i.status <> 'RIENTRATO' or i.updated_at > now() - interval '60 days')), '[]'::jsonb) end,
    'kits', coalesce((
      select jsonb_agg(jsonb_build_object('id', k.id, 'site', k.site, 'kit', k.kit, 'last_check', k.last_check, 'next_check', k.next_check)
        order by k.site, k.kit)
      from public.scd_first_aid_kits k
      where k.organization_id = p_organization_id and k.site = any(v_sites)), '[]'::jsonb),
    'aeds', coalesce((
      select jsonb_agg(jsonb_build_object('id', d.id, 'site', d.site, 'device', d.device, 'pads_expires_on', d.pads_expires_on,
          'battery_expires_on', d.battery_expires_on, 'last_check', d.last_check)
        order by d.site, d.device)
      from public.scd_aed_devices d
      where d.organization_id = p_organization_id and d.site = any(v_sites)), '[]'::jsonb)
  );
end;
$$;

-- 4c. Injury entry (insert when p_id is null, else update). WRITE with perimeter ALL. No free text exists.
create or replace function public.scd_infermeria_injury_save(
  p_organization_id uuid,
  p_id uuid,
  p_athlete_id uuid,
  p_occurred_on date,
  p_body_area text,
  p_status text,
  p_rtp_steps text[]
)
returns uuid
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_id uuid;
  v_steps text[] := coalesce(p_rtp_steps, '{}');
begin
  if not public.scd_health_staff(p_organization_id, 'infermeria', 'WRITE', null) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_occurred_on is null or p_occurred_on > current_date or p_occurred_on < current_date - 400 then
    raise exception 'date out of range' using errcode = '22023';
  end if;
  if not exists (select 1 from public.scd_athletes a where a.id = p_athlete_id and a.organization_id = p_organization_id) then
    raise exception 'athlete not found' using errcode = '22023';
  end if;
  -- Validate here so that a constraint error (whose DETAIL would echo the row) is never raised.
  if p_body_area is null or p_body_area not in ('TESTA_COLLO','SPALLA_BRACCIO','MANO_POLSO','TRONCO_SCHIENA','ANCA_COSCIA','GINOCCHIO','GAMBA_CAVIGLIA','PIEDE','ALTRO')
     or p_status is null or p_status not in ('FERMO','IN_RECUPERO','RIENTRATO')
     or not v_steps <@ array['STOP','VIA_LIBERA_MEDICO','LAVORO_DIFFERENZIATO','ALLENAMENTO_SQUADRA','OK_STAFF_MISTER']::text[] then
    raise exception 'invalid entry' using errcode = '22023';
  end if;
  if p_status = 'RIENTRATO' and not v_steps @> array['STOP','VIA_LIBERA_MEDICO','LAVORO_DIFFERENZIATO','ALLENAMENTO_SQUADRA','OK_STAFF_MISTER']::text[] then
    raise exception 'return to play incomplete' using errcode = '22023';
  end if;
  v_steps := array(select distinct s from unnest(v_steps) s order by s);
  if p_id is null then
    insert into public.scd_health_injuries (organization_id, athlete_id, occurred_on, body_area, status, rtp_steps, created_by, updated_by)
    values (p_organization_id, p_athlete_id, p_occurred_on, p_body_area, coalesce(p_status, 'FERMO'), v_steps, auth.uid(), auth.uid())
    returning id into v_id;
  else
    update public.scd_health_injuries
       set athlete_id = p_athlete_id, occurred_on = p_occurred_on, body_area = p_body_area, status = p_status,
           rtp_steps = v_steps, updated_by = auth.uid(), updated_at = now()
     where id = p_id and organization_id = p_organization_id
    returning id into v_id;
    if v_id is null then
      raise exception 'injury not found' using errcode = '22023';
    end if;
  end if;
  return v_id;
end;
$$;

-- 4d. First-aid kit check (upsert on site + kit). WRITE for that site.
create or replace function public.scd_infermeria_kit_save(
  p_organization_id uuid,
  p_site text,
  p_kit text,
  p_last_check date,
  p_next_check date
)
returns uuid
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_id uuid;
begin
  if not public.scd_health_staff(p_organization_id, 'infermeria', 'WRITE', p_site) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if upper(coalesce(p_site, '')) not in ('COLICO','DERVIO') or char_length(trim(coalesce(p_kit, ''))) not between 2 and 60
     or (p_last_check is not null and p_next_check is not null and p_next_check < p_last_check) then
    raise exception 'invalid entry' using errcode = '22023';
  end if;
  insert into public.scd_first_aid_kits (organization_id, site, kit, last_check, next_check, updated_by)
  values (p_organization_id, upper(p_site), trim(p_kit), p_last_check, p_next_check, auth.uid())
  on conflict (organization_id, site, kit) do update
    set last_check = excluded.last_check, next_check = excluded.next_check, updated_by = excluded.updated_by, updated_at = now()
  returning id into v_id;
  return v_id;
end;
$$;

-- 4e. Defibrillator (DAE / BLSD) check (upsert on site + device). WRITE for that site.
create or replace function public.scd_infermeria_aed_save(
  p_organization_id uuid,
  p_site text,
  p_device text,
  p_pads_expires_on date,
  p_battery_expires_on date,
  p_last_check date
)
returns uuid
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_id uuid;
begin
  if not public.scd_health_staff(p_organization_id, 'infermeria', 'WRITE', p_site) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if upper(coalesce(p_site, '')) not in ('COLICO','DERVIO') or char_length(trim(coalesce(p_device, ''))) not between 2 and 60 then
    raise exception 'invalid entry' using errcode = '22023';
  end if;
  insert into public.scd_aed_devices (organization_id, site, device, pads_expires_on, battery_expires_on, last_check, updated_by)
  values (p_organization_id, upper(p_site), trim(p_device), p_pads_expires_on, p_battery_expires_on, p_last_check, auth.uid())
  on conflict (organization_id, site, device) do update
    set pads_expires_on = excluded.pads_expires_on, battery_expires_on = excluded.battery_expires_on,
        last_check = excluded.last_check, updated_by = excluded.updated_by, updated_at = now()
  returning id into v_id;
  return v_id;
end;
$$;

-- 5a. Consultation request from a family or an adult athlete, ONLY for a person of the caller's own circle
-- (themself or a person of a family where they are guardian). Goes to the existing work queue through
-- scd_proposal_ingest (r79). Title: team only. No child name, no health detail, no note.
-- Answers RECEIVED | ALREADY (an open request exists for that person) | LIMIT (3 per requester per day)
-- | NOT_ALLOWED | NOT_SIGNED_IN.
create or replace function public.scd_nutrition_request(p_organization_id uuid, p_person_id uuid)
returns text
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_uid uuid := (select auth.uid());
  v_team text;
  v_ref_prefix text := 'nutrizione:' || coalesce(p_person_id::text, '') || ':';
  v_res jsonb;
begin
  if v_uid is null then
    return 'NOT_SIGNED_IN';
  end if;
  if p_person_id is null or not (
       p_person_id in (select public.scd_my_person_ids(p_organization_id))
       or exists (
         select 1
         from public.scd_family_members guardian
         join public.scd_families f on f.id = guardian.family_id and f.organization_id = p_organization_id
         join public.scd_family_members child on child.family_id = guardian.family_id and child.person_id = p_person_id
         where guardian.is_guardian
           and guardian.person_id in (select public.scd_my_person_ids(p_organization_id)))) then
    return 'NOT_ALLOWED';
  end if;
  if exists (select 1 from public.scd_proposals q
             where q.organization_id = p_organization_id and q.area = 'nutrizione'
               and q.source_ref like v_ref_prefix || '%'
               and q.status in ('NEW','IN_PROGRESS','NEEDS_INFO','SNOOZED')) then
    return 'ALREADY';
  end if;
  if (select count(*) from public.scd_proposals q
      where q.organization_id = p_organization_id and q.area = 'nutrizione'
        and q.suggested ->> 'requester' = v_uid::text and q.created_at > now() - interval '1 day') >= 3 then
    return 'LIMIT';
  end if;
  select t.name into v_team
  from public.scd_athletes a
  join public.scd_team_memberships tm on tm.athlete_id = a.id and (tm.valid_to is null or tm.valid_to >= current_date)
  join public.scd_teams t on t.id = tm.team_id
  where a.person_id = p_person_id and a.organization_id = p_organization_id
  order by t.code
  limit 1;
  v_res := public.scd_proposal_ingest(p_organization_id, jsonb_build_array(jsonb_build_object(
    'area', 'nutrizione',
    'kind', 'RICHIESTA',
    'title', 'Richiesta consulenza nutrizionista · ' || coalesce(nullif(trim(v_team), ''), 'squadra non indicata'),
    'reason', 'Richiesta dalla famiglia nell''app: la segreteria ricontatta il genitore.',
    'sourceKind', 'MANUAL',
    'sourceRef', v_ref_prefix || to_char(now(), 'YYYYMMDDHH24MISSUS'),
    'suggested', jsonb_build_object('action', 'contact_family', 'requester', v_uid))));
  if coalesce((v_res ->> 'new')::int, 0) = 1 then
    return 'RECEIVED';
  end if;
  return 'ALREADY';
end;
$$;

-- 5b. Open nutrition requests for the nutrition staff: title (team), status, date and the ADULT to call back
-- (the requester's linked person, shortened). Null for everybody else.
create or replace function public.scd_nutrition_requests(p_organization_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  if not public.scd_health_staff(p_organization_id, 'nutrizione', 'READ', null) then
    return null;
  end if;
  return jsonb_build_object(
    'canWrite', public.scd_health_staff(p_organization_id, 'nutrizione', 'WRITE', null),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
          'id', q.id, 'title', q.title, 'status', q.status, 'created_at', q.created_at,
          'mine', q.assignee = auth.uid(),
          'contact', (select public.scd_health_short_name(p.first_name, p.last_name, p.display_name)
                      from public.scd_identity_links l
                      join public.scd_people p on p.id = l.person_id
                      where l.organization_id = q.organization_id
                        and l.user_id::text = q.suggested ->> 'requester'
                        and l.link_state <> 'REVOKED'
                        and coalesce(public.scd_is_minor(p.birth_date), false) = false
                      order by l.person_id limit 1))
        order by q.created_at)
      from public.scd_proposals q
      where q.organization_id = p_organization_id and q.area = 'nutrizione'
        and q.status in ('NEW','IN_PROGRESS','NEEDS_INFO','SNOOZED')), '[]'::jsonb));
end;
$$;

-- 5c. Take or close a nutrition request (WRITE). Logged in scd_proposal_events without any note.
create or replace function public.scd_nutrition_request_update(p_organization_id uuid, p_id uuid, p_action text)
returns boolean
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_id uuid;
begin
  if not public.scd_health_staff(p_organization_id, 'nutrizione', 'WRITE', null) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_action not in ('take', 'close') then
    raise exception 'unknown action' using errcode = '22023';
  end if;
  update public.scd_proposals
     set status = case p_action when 'take' then 'IN_PROGRESS' else 'ACCEPTED' end,
         assignee = case p_action when 'take' then auth.uid() else assignee end,
         decided_by = case p_action when 'close' then auth.uid() else decided_by end,
         decided_at = case p_action when 'close' then now() else decided_at end,
         updated_at = now()
   where id = p_id and organization_id = p_organization_id and area = 'nutrizione'
     and status in ('NEW','IN_PROGRESS','NEEDS_INFO','SNOOZED')
  returning id into v_id;
  if v_id is null then
    return false;
  end if;
  insert into public.scd_proposal_events (proposal_id, actor, action)
  values (v_id, auth.uid(), case p_action when 'take' then 'TAKE' else 'ACCEPT' end);
  return true;
end;
$$;

-- 6. The "nutrizionista" position becomes assignable (Direzione and Segreteria, like responsabile-infermeria):
-- scd_access_admin_guard recreated IDENTICAL to r87 except for the one appended position. It opens nothing by itself:
-- the /nutrizionista gate reads the position, scd_health_staff reads position or grant.
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
  office_pos text[] := array['direzione','presidente','direttore-generale','dirigenza','segreteria','tesoreria'];
  assignable text[] := array['direzione','presidente','direttore-generale','dirigenza','responsabile-attivita-base',
    'coordinatore-attivita-sportiva','dirigente-annata','mister','responsabile-trasporti','autista','responsabile-club-house',
    'addetto-biglietteria','responsabile-magazzino','responsabile-campi','segreteria','partner',
    'tesoreria','segreteria-presenza','segreteria-remoto','responsabile-tornei','responsabile-struttura','responsabile-struttura-colico',
    'responsabile-struttura-dervio','responsabile-lavanderia','collaboratore-lavanderia-pulizia','responsabile-infermeria','collaboratore-magazzino',
    'dirigente-collaboratore','moderatore','nutrizionista'];
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

-- Grants: helpers private, entry points for signed-in users only (each checks access itself).
revoke all on function public.scd_health_staff(uuid, text, text, text) from public, anon;
revoke all on function public.scd_health_short_name(text, text, text) from public, anon;
revoke all on function public.scd_infermeria_certificate_board(uuid) from public, anon;
revoke all on function public.scd_infermeria_board(uuid) from public, anon;
revoke all on function public.scd_infermeria_injury_save(uuid, uuid, uuid, date, text, text, text[]) from public, anon;
revoke all on function public.scd_infermeria_kit_save(uuid, text, text, date, date) from public, anon;
revoke all on function public.scd_infermeria_aed_save(uuid, text, text, date, date, date) from public, anon;
revoke all on function public.scd_nutrition_request(uuid, uuid) from public, anon;
revoke all on function public.scd_nutrition_requests(uuid) from public, anon;
revoke all on function public.scd_nutrition_request_update(uuid, uuid, text) from public, anon;
grant execute on function public.scd_infermeria_certificate_board(uuid) to authenticated;
grant execute on function public.scd_infermeria_board(uuid) to authenticated;
grant execute on function public.scd_infermeria_injury_save(uuid, uuid, uuid, date, text, text, text[]) to authenticated;
grant execute on function public.scd_infermeria_kit_save(uuid, text, text, date, date) to authenticated;
grant execute on function public.scd_infermeria_aed_save(uuid, text, text, date, date, date) to authenticated;
grant execute on function public.scd_nutrition_request(uuid, uuid) to authenticated;
grant execute on function public.scd_nutrition_requests(uuid) to authenticated;
grant execute on function public.scd_nutrition_request_update(uuid, uuid, text) to authenticated;
