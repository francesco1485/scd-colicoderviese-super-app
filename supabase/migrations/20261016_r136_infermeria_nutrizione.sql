-- r136: Infermeria and Nutrizionista (DG 15/10/2026 14:33 "infermeria, nutrizionista"; 16/10 06:23 "a pieno regime").
-- APPLIED on SCD PULSE (ndevtxxijbcnskgysdit) 16/10/2026 by the main session after Francesco wrote "Applica r136"
-- (07:04) and chose "Senza infortuni per ora". Before applying: prerequisites present; scd_access_admin_guard and
-- scd_proposal_queue verified identical to live except the r136 lines; catalogue identical to live r100 (35 entries).
-- After: RLS on kits/AED with 0 policies, no table grants, scd_health_staff not executable by authenticated,
-- catalogue 36 entries (nutrizione, no r101 sections), no injury objects, guard accepts "nutrizionista".
-- Requires r59/r61 (people, athletes, families, identity links), r66 (certificate register), r74 (scd_has_position),
-- r79 (scd_proposals, scd_proposal_ingest, scd_proposal_queue) and r100 (scd_person_grants, scd_level_rank) applied.
-- Section 1 recreates scd_section_catalog() identical to the LIVE catalogue of SCD PULSE (r100, verified 16/10/2026,
-- 35 entries) plus "nutrizione". r101 (chat CLOUD, not applied) is NOT included: when r101 is applied, its catalogue
-- must carry "nutrizione" too (request written to the CLOUD chat), otherwise the section disappears.
--
-- INJURIES REGISTER DEFERRED until the consent design (UD-043, UD-047: minors' health data only to the person, the
-- parent and the club doctor, with consent). This file creates no injury table and no injury function.
--
-- What it adds (no existing table or row is changed, no row is inserted; three existing functions are recreated with
-- their previous content plus one change each: the catalogue (+ "nutrizione"), the access guard (+ position
-- "nutrizionista") and the office work queue scd_proposal_queue (nutrition requests excluded)):
--   1. the "nutrizione" section in the catalogue (config/scd-sections.v1.json);
--   2. scd_health_staff(): who works in the Infermeria / Nutrizionista (Direzione membership or position "direzione",
--      position responsabile-infermeria / nutrizionista, or an active r100 grant of a verified identity link with
--      perimeter ALL, or OWN_SITE for the site);
--   3. Infermeria tables with RLS on and no policies (read and written only through the functions below):
--      scd_first_aid_kits (site, kit, last and next check), scd_aed_devices (site, device, pads and battery expiry);
--   4. scd_infermeria_certificate_board (read-only, one row per athlete) / _board / _kit_save / _aed_save;
--   5. Nutrizionista: scd_nutrition_request (families, own circle only, through scd_proposal_ingest as RISERVATO:
--      the work-queue title is only "Richiesta consulenza nutrizionista · <squadra>") and scd_nutrition_requests /
--      _request_update for the nutrition staff; scd_proposal_queue (r79) recreated identical except that area
--      'nutrizione' is excluded, so the office queue never shows them. No personal plan, diet or health detail is
--      stored anywhere.
--   6. scd_access_admin_guard (r87) recreated identical plus the assignable position "nutrizionista";
--
-- Health data rules: no free text, no diagnosis, symptom or therapy column; names returned as first name + surname
-- initial; exception messages never carry values; nothing is written to an audit or log table.
-- Never run on dfnwzwutvnwiitiffwvr. Target: SCD PULSE.

-- 1. Section catalogue: live (r100) entries unchanged, "nutrizione" appended.
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
  {"code":"nutrizione","levels":["READ","WRITE"],"perimeters":["ALL"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":true}
]
$cat$::jsonb) as x(code text, levels jsonb, perimeters jsonb, base boolean, hard_blocked boolean, direction_only boolean, sensitive boolean);
$$;

-- 2. Who works in the health areas. p_site narrows OWN_SITE grants (kits and defibrillators of one site).
-- Same people the app lets in (work areas "infermeria" / "nutrizionista"): Direzione (membership role or position
-- "direzione") and the area position. r100 grants count only through a VERIFIED identity link.
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
       case p_section when 'infermeria' then array['direzione', 'responsabile-infermeria'] else array['direzione', 'nutrizionista'] end) then
    return true;
  end if;
  return exists (
    select 1
    from public.scd_person_grants g
    join public.scd_identity_links l
      on l.organization_id = g.organization_id and l.person_id = g.person_id and l.user_id = v_uid
     and l.link_state in ('AUTO_VERIFIED', 'VERIFIED_BY_STAFF')
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

revoke all on table public.scd_first_aid_kits from public, anon, authenticated;
revoke all on table public.scd_aed_devices from public, anon, authenticated;

-- 4a. Certificate expiry board for the Infermeria: the same data as scd_certificate_register (r66), ONE row per
-- athlete (first current team by code, so counts are never doubled), names shortened, read-only (dates are still
-- corrected only in /segreteria/certificati). Whole-club health staff only (no OWN_SITE).
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
  select x.athlete_id, x.display_name, x.birth_year, x.is_minor, x.team_code, x.team_name, x.registration_status,
         x.expires_at, x.status, x.kind, x.checked_at
  from (
    select distinct on (a.id)
      a.id as athlete_id,
      public.scd_health_short_name(p.first_name, p.last_name, p.display_name) as display_name,
      extract(year from p.birth_date)::integer as birth_year,
      public.scd_is_minor(p.birth_date) as is_minor,
      t.code as team_code,
      t.name as team_name,
      a.registration_status,
      a.medical_certificate_expires_at as expires_at,
      a.medical_certificate_status as status,
      a.medical_certificate_kind as kind,
      a.medical_certificate_checked_at as checked_at,
      p.last_name as sort_last,
      p.first_name as sort_first
    from public.scd_athletes a
    join public.scd_people p on p.id = a.person_id
    left join public.scd_team_memberships tm
      on tm.athlete_id = a.id and (tm.valid_to is null or tm.valid_to >= current_date)
    left join public.scd_teams t on t.id = tm.team_id
    where a.organization_id = p_organization_id
      and p.status <> 'ARCHIVED'
      and p.left_at is null
      and public.scd_health_staff(p_organization_id, 'infermeria', 'READ', null)
    order by a.id, t.code nulls last
  ) x
  order by x.team_code nulls last, x.sort_last, x.sort_first;
$$;

-- 4b. The Infermeria board: kits and defibrillators (ALL or the granted site). seesCertificates is true only for the
-- whole-club health staff (the certificate board answers nothing to an OWN_SITE grant). Null when the caller has no
-- infermeria access at all: the app shows "Non hai l'abilitazione", never zero.
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
    'seesCertificates', v_all,
    'sites', to_jsonb(v_sites),
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

-- 4c. First-aid kit check (upsert on site + kit). WRITE for that site.
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

-- 4d. Defibrillator (DAE / BLSD) check (upsert on site + device). WRITE for that site.
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
-- scd_proposal_ingest (r79) as RISERVATO, area 'nutrizione': the office queue (scd_proposal_queue, recreated in 5d)
-- never shows it; only the nutrition staff reads it (5b). Title: team only. No child name, no health detail, no note.
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
    'reason', 'Richiesta dalla famiglia nell''app: la nutrizionista ricontatta il genitore.',
    'sensitivity', 'RISERVATO',
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
                        and l.link_state in ('AUTO_VERIFIED', 'VERIFIED_BY_STAFF')
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

-- 5d. Office work queue (r79 scd_proposal_queue) recreated IDENTICAL to r79 except for the two lines marked
-- "r136": nutrition requests (area 'nutrizione') never appear in the office queue, not even to RISERVATO readers;
-- they are read only through scd_nutrition_requests (5b). The last-50 decisions window excludes them as well.
create or replace function public.scd_proposal_queue(p_organization_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_reserved boolean;
begin
  if not public.scd_fee_office(p_organization_id) then
    return null;
  end if;
  v_reserved := public.scd_proposal_reserved_reader(p_organization_id);
  return jsonb_build_object(
    'me', auth.uid(),
    'canReadReserved', v_reserved,
    'items', coalesce((select jsonb_agg(row_to_json(x)::jsonb order by x.open desc, x.due_at nulls last, x.created_at)
      from (
        select q.id, q.machine, q.area, q.kind, q.title, q.reason, q.sensitivity, q.source_kind as "sourceKind",
          q.source_url as "sourceUrl", q.source_at as "sourceAt", q.source_mailbox as "mailbox",
          q.target_ref as "targetRef", q.target_label as "targetLabel", q.suggested, q.confidence, q.status,
          q.assignee = auth.uid() as "mine", q.assignee is not null as "assigned", q.due_at, q.snooze_until as "snoozeUntil",
          q.duplicate_of as "duplicateOf", q.decided_at as "decidedAt", q.decision_note as "decisionNote", q.created_at,
          q.status in ('NEW','IN_PROGRESS','NEEDS_INFO') or (q.status = 'SNOOZED' and q.snooze_until <= now()) as open,
          fp.status_group as "targetState"
        from public.scd_proposals q
        left join public.scd_fee_positions fp
          on q.machine = 'M3' and fp.organization_id = q.organization_id and fp.source_record_id = q.target_ref and fp.active
        where q.organization_id = p_organization_id
          and q.area <> 'nutrizione' -- r136
          and (q.sensitivity <> 'RISERVATO' or v_reserved)
          and (q.status in ('NEW','IN_PROGRESS','NEEDS_INFO','SNOOZED')
               or q.id in (select id from public.scd_proposals d where d.organization_id = p_organization_id
                             and d.area <> 'nutrizione' -- r136
                             and d.status in ('ACCEPTED','REJECTED','DUPLICATE') order by d.decided_at desc nulls last limit 50))
      ) x), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.scd_proposal_queue(uuid) from public, anon;
grant execute on function public.scd_proposal_queue(uuid) to authenticated;

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

-- Grants: helpers private (callable only from the SECURITY DEFINER functions above, never through the API),
-- entry points for signed-in users only (each checks access itself).
revoke all on function public.scd_health_staff(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.scd_health_short_name(text, text, text) from public, anon, authenticated;
revoke all on function public.scd_infermeria_certificate_board(uuid) from public, anon;
revoke all on function public.scd_infermeria_board(uuid) from public, anon;
revoke all on function public.scd_infermeria_kit_save(uuid, text, text, date, date) from public, anon;
revoke all on function public.scd_infermeria_aed_save(uuid, text, text, date, date, date) from public, anon;
revoke all on function public.scd_nutrition_request(uuid, uuid) from public, anon;
revoke all on function public.scd_nutrition_requests(uuid) from public, anon;
revoke all on function public.scd_nutrition_request_update(uuid, uuid, text) from public, anon;
grant execute on function public.scd_infermeria_certificate_board(uuid) to authenticated;
grant execute on function public.scd_infermeria_board(uuid) to authenticated;
grant execute on function public.scd_infermeria_kit_save(uuid, text, text, date, date) to authenticated;
grant execute on function public.scd_infermeria_aed_save(uuid, text, text, date, date, date) to authenticated;
grant execute on function public.scd_nutrition_request(uuid, uuid) to authenticated;
grant execute on function public.scd_nutrition_requests(uuid) to authenticated;
grant execute on function public.scd_nutrition_request_update(uuid, uuid, text) to authenticated;
