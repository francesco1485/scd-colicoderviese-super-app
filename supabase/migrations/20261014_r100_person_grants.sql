-- r100: per-person section grants (Direzione 2026-10-14, UD-112). STAGED: written, NOT applied.
-- Apply only after the Direzione's explicit OK ("serve l'OK della Direzione per applicare r100").
--
-- The decision supersedes any "derived access from roles":
--   * a role (e.g. "Dirigente annata 2015") is ONLY a description: it opens nothing automatically;
--   * every account gets only the base: public pages, own profile, own card;
--   * the Direzione enables EACH section for EACH person, with a level (READ / WRITE / APPROVE = Vede / Modifica /
--     Approva) and a perimeter (ALL / OWN_TEAMS / OWN_SITE / OWN_CHILDREN / SELF = Tutto / sue annate / sua sede /
--     suoi figli / solo sé);
--   * helpers never decide alone: scd_suggest_grants only RETURNS suggestions from the person's roles; copying grants
--     from another person (scd_copy_person_grants) is an explicit, audited Direzione action;
--   * hard blocks always stay: minors' health data and Safeguarding are never grantable (scd_can answers false for
--     them: they keep their dedicated flows), nobody edits their own grants, the club account is protected,
--     a minor receives only the SELF perimeter, sensitive sections need a written reason;
--   * every change is written to scd_access_audit (GRANT_SECTION / CHANGE_SECTION / REVOKE_SECTION / COPY_GRANTS).
--
-- Not wired into any existing policy or guard: applying r100 changes nobody's access by itself (no rows are
-- inserted here). The app reads scd_can only after it detects this migration (apps/superapp/src/lib/
-- person-grants.functions.ts grantsEngineState) and only where the Direzione decides to switch a guard over.
-- The catalogue literal below is kept equal to config/scd-sections.v1.json by apps/superapp/src/lib/
-- person-grants.test.ts. Additive only.

-- 1. Audit actions for section grants (the r65 check constraint is widened, existing values kept).
alter table public.scd_access_audit drop constraint if exists scd_access_audit_action_check;
alter table public.scd_access_audit add constraint scd_access_audit_action_check check (action in (
  'SET_ACCESS','GRANT_PERSON','REVOKE_LINK','APPROVE_REQUEST','REJECT_REQUEST',
  'GRANT_SECTION','CHANGE_SECTION','REVOKE_SECTION','COPY_GRANTS'));

-- 2. Section catalogue (config/scd-sections.v1.json).
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
  {"code":"partner","levels":["READ","WRITE"],"perimeters":["SELF"],"base":false,"hard_blocked":false,"direction_only":false,"sensitive":false}
]
$cat$::jsonb) as x(code text, levels jsonb, perimeters jsonb, base boolean, hard_blocked boolean, direction_only boolean, sensitive boolean);
$$;

-- True when (section, level, perimeter) may be stored as a grant: known, not base, not protected, not Direzione-only,
-- level and perimeter allowed for that section.
create or replace function public.scd_section_grantable(p_section text, p_level text, p_perimeter text)
returns boolean
language sql
immutable
set search_path to 'public'
as $$
  select exists (
    select 1 from public.scd_section_catalog() c
    where c.code = p_section and not c.base and not c.hard_blocked and not c.direction_only
      and p_level = any(c.levels) and p_perimeter = any(c.perimeters));
$$;

create or replace function public.scd_level_rank(p_level text)
returns integer
language sql
immutable
set search_path to 'public'
as $$ select coalesce(array_position(array['READ','WRITE','APPROVE'], p_level), 0); $$;

-- 3. The grants.
create table if not exists public.scd_person_grants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  person_id uuid not null references public.scd_people(id) on delete cascade,
  section_code text not null,
  level text not null check (level in ('READ','WRITE','APPROVE')),
  perimeter text not null check (perimeter in ('ALL','OWN_TEAMS','OWN_SITE','OWN_CHILDREN','SELF')),
  team_ids uuid[] not null default '{}',
  site text check (site in ('COLICO','DERVIO')),
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  note text not null default '' check (char_length(note) <= 300),
  constraint scd_person_grants_scope_shape check (
    (perimeter = 'OWN_TEAMS' and cardinality(team_ids) > 0 and site is null)
    or (perimeter = 'OWN_SITE' and site is not null and cardinality(team_ids) = 0)
    or (perimeter in ('ALL','OWN_CHILDREN','SELF') and cardinality(team_ids) = 0 and site is null)),
  constraint scd_person_grants_grantable check (public.scd_section_grantable(section_code, level, perimeter)),
  constraint scd_person_grants_revoked_after check (revoked_at is null or revoked_at >= granted_at)
);
create unique index if not exists scd_person_grants_one_active_idx
  on public.scd_person_grants(organization_id, person_id, section_code) where revoked_at is null;
create index if not exists scd_person_grants_person_idx on public.scd_person_grants(person_id, revoked_at);
create index if not exists scd_person_grants_granted_by_idx on public.scd_person_grants(granted_by);
create index if not exists scd_person_grants_revoked_by_idx on public.scd_person_grants(revoked_by);
comment on table public.scd_person_grants is
  'UD-112: what the Direzione enabled for each person, section by section (level + perimeter). Rows are revoked, never deleted. Written only by SECURITY DEFINER functions.';

alter table public.scd_person_grants enable row level security;
revoke all on table public.scd_person_grants from anon, authenticated;
grant select on table public.scd_person_grants to authenticated;
-- Direzione reads every grant of its organisation; a person reads only the grants on the persons linked to their login.
create policy "scd_person_grants_select_direction" on public.scd_person_grants
  for select to authenticated
  using (public.scd_has_org_role(organization_id, array['DIRECTION']::public.scd_role[]));
create policy "scd_person_grants_select_own" on public.scd_person_grants
  for select to authenticated
  using (exists (
    select 1 from public.scd_identity_links l
    where l.organization_id = scd_person_grants.organization_id and l.person_id = scd_person_grants.person_id
      and l.user_id = (select auth.uid()) and l.link_state <> 'REVOKED'));
-- No insert / update / delete policy: writes go only through the functions below.

-- 4. Guards.
-- True when the person is linked to the club account (SCD_GMAIL owner): protected, never edited from here.
create or replace function public.scd_is_club_account_person(p_organization_id uuid, p_person_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.scd_identity_links l join auth.users u on u.id = l.user_id
    where l.organization_id = p_organization_id and l.person_id = p_person_id and l.link_state <> 'REVOKED'
      and lower(u.email) = 'sportclubcolico@gmail.com');
$$;

-- Raises 42501 unless the caller is an active Direzione of the organisation, the person belongs to it, the person is
-- not linked to the caller's own login and is not the club account.
create or replace function public.scd_person_grants_guard(p_organization_id uuid, p_person_id uuid)
returns void
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  if (select auth.uid()) is null
     or not public.scd_has_org_role(p_organization_id, array['DIRECTION']::public.scd_role[]) then
    raise exception 'grants: Direzione only' using errcode = '42501';
  end if;
  if not exists (select 1 from public.scd_people where id = p_person_id and organization_id = p_organization_id) then
    raise exception 'person not found' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.scd_identity_links
             where organization_id = p_organization_id and person_id = p_person_id
               and user_id = (select auth.uid()) and link_state <> 'REVOKED') then
    raise exception 'cannot edit own access' using errcode = '42501';
  end if;
  if public.scd_is_club_account_person(p_organization_id, p_person_id) then
    raise exception 'club account is protected' using errcode = '42501';
  end if;
end;
$$;

-- 5. Write: replace the person's whole set of grants with p_grants (one row per section) and audit every change.
-- p_grants: [{"section":"mister","level":"WRITE","perimeter":"OWN_TEAMS","team_ids":["<uuid>"],"site":null}, ...]
create or replace function public.scd_set_person_grants(
  p_organization_id uuid, p_person_id uuid, p_grants jsonb, p_note text
)
returns integer
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_note text := left(trim(coalesce(p_note, '')), 300);
  v_birth date;
  v_minor boolean;
  v_changes integer := 0;
  g jsonb;
  v_section text;
  v_level text;
  v_perimeter text;
  v_teams uuid[];
  v_site text;
  v_cur public.scd_person_grants%rowtype;
  v_existed boolean;
  v_sections text[] := '{}';
begin
  perform public.scd_person_grants_guard(p_organization_id, p_person_id);
  if p_grants is null or jsonb_typeof(p_grants) <> 'array' then
    raise exception 'grants must be an array' using errcode = '22023';
  end if;
  select birth_date into v_birth from public.scd_people where id = p_person_id;
  v_minor := v_birth is not null and v_birth > current_date - interval '18 years';

  -- Validate everything before touching anything.
  for g in select * from jsonb_array_elements(p_grants) loop
    v_section := g->>'section';
    v_level := g->>'level';
    v_perimeter := g->>'perimeter';
    if v_section is null or v_section = any(v_sections) then
      raise exception 'duplicate or missing section %', coalesce(v_section, '?') using errcode = '22023';
    end if;
    v_sections := v_sections || v_section;
    if not public.scd_section_grantable(v_section, v_level, v_perimeter) then
      raise exception 'section not grantable % % %', v_section, v_level, v_perimeter using errcode = '22023';
    end if;
    if v_minor and v_perimeter <> 'SELF' then
      raise exception 'minor: SELF only' using errcode = '22023';
    end if;
    v_teams := case when v_perimeter = 'OWN_TEAMS' then
                 (select coalesce(array_agg(distinct x::uuid order by x::uuid), '{}') from jsonb_array_elements_text(coalesce(g->'team_ids', '[]'::jsonb)) x)
               else '{}' end;
    v_site := case when v_perimeter = 'OWN_SITE' then g->>'site' else null end;
    if v_perimeter = 'OWN_TEAMS' then
      if cardinality(v_teams) = 0 then raise exception 'OWN_TEAMS needs teams' using errcode = '22023'; end if;
      if exists (select 1 from unnest(v_teams) t where not exists (
                   select 1 from public.scd_teams st where st.id = t and st.organization_id = p_organization_id)) then
        raise exception 'unknown team' using errcode = '22023';
      end if;
    end if;
    if v_perimeter = 'OWN_SITE' and coalesce(v_site, '') not in ('COLICO','DERVIO') then
      raise exception 'OWN_SITE needs a site' using errcode = '22023';
    end if;
    -- A new or changed grant on a sensitive section needs a written reason (unchanged rows do not).
    if (select c.sensitive from public.scd_section_catalog() c where c.code = v_section)
       and char_length(v_note) < 3
       and not exists (select 1 from public.scd_person_grants x
                       where x.organization_id = p_organization_id and x.person_id = p_person_id and x.revoked_at is null
                         and x.section_code = v_section and x.level = v_level and x.perimeter = v_perimeter
                         and x.team_ids = v_teams and x.site is not distinct from v_site) then
      raise exception 'sensitive section needs a reason' using errcode = '22023';
    end if;
  end loop;

  -- Revoke what is no longer in the set.
  for v_cur in
    select * from public.scd_person_grants
    where organization_id = p_organization_id and person_id = p_person_id and revoked_at is null
      and not (section_code = any(v_sections))
    for update
  loop
    update public.scd_person_grants set revoked_at = now(), revoked_by = (select auth.uid()) where id = v_cur.id;
    insert into public.scd_access_audit (organization_id, actor_user_id, target_person_id, action, detail)
    values (p_organization_id, (select auth.uid()), p_person_id, 'REVOKE_SECTION', jsonb_build_object(
      'section', v_cur.section_code,
      'before', jsonb_build_object('level', v_cur.level, 'perimeter', v_cur.perimeter, 'team_ids', to_jsonb(v_cur.team_ids), 'site', v_cur.site),
      'note', v_note));
    v_changes := v_changes + 1;
  end loop;

  -- Add or change.
  for g in select * from jsonb_array_elements(p_grants) loop
    v_section := g->>'section';
    v_level := g->>'level';
    v_perimeter := g->>'perimeter';
    v_teams := case when v_perimeter = 'OWN_TEAMS' then
                 (select coalesce(array_agg(distinct x::uuid order by x::uuid), '{}') from jsonb_array_elements_text(coalesce(g->'team_ids', '[]'::jsonb)) x)
               else '{}' end;
    v_site := case when v_perimeter = 'OWN_SITE' then g->>'site' else null end;

    select * into v_cur from public.scd_person_grants
    where organization_id = p_organization_id and person_id = p_person_id and section_code = v_section and revoked_at is null
    for update;
    v_existed := found;
    if v_existed then
      if v_cur.level = v_level and v_cur.perimeter = v_perimeter and v_cur.team_ids = v_teams
         and v_cur.site is not distinct from v_site then
        continue;
      end if;
      update public.scd_person_grants set revoked_at = now(), revoked_by = (select auth.uid()) where id = v_cur.id;
    end if;
    insert into public.scd_person_grants (organization_id, person_id, section_code, level, perimeter, team_ids, site, granted_by, note)
    values (p_organization_id, p_person_id, v_section, v_level, v_perimeter, v_teams, v_site, (select auth.uid()), v_note);
    insert into public.scd_access_audit (organization_id, actor_user_id, target_person_id, action, detail)
    values (p_organization_id, (select auth.uid()), p_person_id,
            case when v_existed then 'CHANGE_SECTION' else 'GRANT_SECTION' end,
            jsonb_build_object(
              'section', v_section,
              'before', case when v_existed then jsonb_build_object('level', v_cur.level, 'perimeter', v_cur.perimeter, 'team_ids', to_jsonb(v_cur.team_ids), 'site', v_cur.site) else null end,
              'after', jsonb_build_object('level', v_level, 'perimeter', v_perimeter, 'team_ids', to_jsonb(v_teams), 'site', v_site),
              'note', v_note));
    v_changes := v_changes + 1;
  end loop;
  return v_changes;
end;
$$;

-- 6. Copy: an explicit Direzione action. The source's active grants that are valid for the target replace the
-- target's grant on the same section; sections the source does not have are left as they are. Audited as
-- COPY_GRANTS plus one row per changed section.
create or replace function public.scd_copy_person_grants(
  p_organization_id uuid, p_from_person_id uuid, p_to_person_id uuid, p_note text
)
returns integer
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_birth date;
  v_minor boolean;
  v_merged jsonb;
  v_changes integer;
  v_copied jsonb;
begin
  perform public.scd_person_grants_guard(p_organization_id, p_to_person_id);
  if p_from_person_id = p_to_person_id then raise exception 'same person' using errcode = '22023'; end if;
  if not exists (select 1 from public.scd_people where id = p_from_person_id and organization_id = p_organization_id) then
    raise exception 'person not found' using errcode = 'P0002';
  end if;
  select birth_date into v_birth from public.scd_people where id = p_to_person_id;
  v_minor := v_birth is not null and v_birth > current_date - interval '18 years';

  with src as (
    select g.section_code, g.level, g.perimeter, g.team_ids, g.site
    from public.scd_person_grants g
    where g.organization_id = p_organization_id and g.person_id = p_from_person_id and g.revoked_at is null
      and public.scd_section_grantable(g.section_code, g.level, g.perimeter)
      and (not v_minor or g.perimeter = 'SELF')
  ),
  dst as (
    select g.section_code, g.level, g.perimeter, g.team_ids, g.site
    from public.scd_person_grants g
    where g.organization_id = p_organization_id and g.person_id = p_to_person_id and g.revoked_at is null
      and not exists (select 1 from src where src.section_code = g.section_code)
  ),
  merged as (select * from src union all select * from dst)
  select coalesce(jsonb_agg(jsonb_build_object('section', section_code, 'level', level, 'perimeter', perimeter,
                                               'team_ids', to_jsonb(team_ids), 'site', site)), '[]'::jsonb),
         (select coalesce(jsonb_agg(section_code), '[]'::jsonb) from src)
    into v_merged, v_copied
  from merged;

  v_changes := public.scd_set_person_grants(p_organization_id, p_to_person_id, v_merged, p_note);
  insert into public.scd_access_audit (organization_id, actor_user_id, target_person_id, action, detail)
  values (p_organization_id, (select auth.uid()), p_to_person_id, 'COPY_GRANTS', jsonb_build_object(
    'from_person_id', p_from_person_id, 'sections', v_copied, 'changes', v_changes, 'note', left(coalesce(p_note, ''), 300)));
  return v_changes;
end;
$$;

-- 7. The check: ONLY active grants plus the hard blocks. Roles are not consulted, except that an active Direzione
-- membership opens every section that is not protected (the Direzione is who grants). With no context the answer is
-- "may open the section"; with a team / site / subject person the grant's perimeter must cover it.
create or replace function public.scd_can(
  p_section_code text,
  p_level text,
  p_organization_id uuid default null,
  p_team_id uuid default null,
  p_site text default null,
  p_subject_person_id uuid default null
)
returns boolean
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_uid uuid := (select auth.uid());
  v_cat record;
  v_org uuid;
  v_role public.scd_role;
  v_active boolean;
  v_persons uuid[];
  v_no_ctx boolean := p_team_id is null and p_site is null and p_subject_person_id is null;
begin
  if v_uid is null or public.scd_level_rank(p_level) = 0 then return false; end if;
  select * into v_cat from public.scd_section_catalog() c where c.code = p_section_code;
  if not found or v_cat.hard_blocked then return false; end if;

  select m.organization_id, m.role, m.active into v_org, v_role, v_active
  from public.scd_memberships m
  where m.user_id = v_uid and (p_organization_id is null or m.organization_id = p_organization_id)
  order by m.active desc, m.created_at
  limit 1;
  if v_org is null or not v_active then return false; end if;
  if v_role = 'DIRECTION' then return true; end if;
  if v_cat.direction_only then return false; end if;
  if v_cat.base then
    return exists (select 1 from unnest(v_cat.levels) l where public.scd_level_rank(l) >= public.scd_level_rank(p_level));
  end if;

  select coalesce(array_agg(l.person_id), '{}') into v_persons
  from public.scd_identity_links l
  where l.organization_id = v_org and l.user_id = v_uid and l.link_state <> 'REVOKED';
  if cardinality(v_persons) = 0 then return false; end if;

  return exists (
    select 1 from public.scd_person_grants g
    where g.organization_id = v_org and g.person_id = any(v_persons) and g.revoked_at is null
      and g.section_code = p_section_code
      and public.scd_level_rank(g.level) >= public.scd_level_rank(p_level)
      and (
        v_no_ctx
        or g.perimeter = 'ALL'
        or (g.perimeter = 'OWN_TEAMS' and (
              (p_team_id is not null and p_team_id = any(g.team_ids))
              or (p_subject_person_id is not null and (
                    exists (select 1 from public.scd_athletes a
                            join public.scd_team_memberships tm on tm.athlete_id = a.id
                            where a.person_id = p_subject_person_id and tm.team_id = any(g.team_ids)
                              and (tm.valid_to is null or tm.valid_to >= current_date))
                    or exists (select 1 from public.scd_structure_roles r
                               where r.person_id = p_subject_person_id and r.active and r.team_id = any(g.team_ids)
                                 and (r.valid_to is null or r.valid_to >= current_date))))))
        or (g.perimeter = 'OWN_SITE' and p_site is not null and g.site = upper(p_site))
        or (g.perimeter = 'OWN_CHILDREN' and p_subject_person_id is not null
            and not (p_subject_person_id = any(v_persons))
            and exists (select 1 from public.scd_family_members child
                        join public.scd_family_members guardian on guardian.family_id = child.family_id
                        where child.person_id = p_subject_person_id
                          and guardian.person_id = any(v_persons) and guardian.is_guardian))
        or (g.perimeter = 'SELF' and p_subject_person_id is not null and p_subject_person_id = any(v_persons))
      ));
end;
$$;

-- 8. Suggestions from the person's roles: RETURNED, never applied. Same mapping as
-- config/scd-sections.v1.json roleSuggestions and apps/superapp/src/lib/session.ts ROLE_POSITIONS.
create or replace function public.scd_suggest_grants(p_organization_id uuid, p_person_id uuid)
returns table (section_code text, level text, perimeter text, team_ids uuid[], site text, reason text)
language sql
stable
security definer
set search_path to 'public'
as $$
  with rules as (
    select * from jsonb_to_recordset($sug$
[
  {"position":"mister","section":"mister","level":"WRITE","perimeter":"OWN_TEAMS","site":null},
  {"position":"mister","section":"quadro","level":"READ","perimeter":"OWN_TEAMS","site":null},
  {"position":"mister","section":"certificati","level":"READ","perimeter":"OWN_TEAMS","site":null},
  {"position":"mister","section":"pulmini","level":"READ","perimeter":"OWN_TEAMS","site":null},
  {"position":"dirigente-annata","section":"mister","level":"WRITE","perimeter":"OWN_TEAMS","site":null},
  {"position":"dirigente-annata","section":"quadro","level":"READ","perimeter":"OWN_TEAMS","site":null},
  {"position":"dirigente-annata","section":"certificati","level":"READ","perimeter":"OWN_TEAMS","site":null},
  {"position":"dirigente-annata","section":"pulmini","level":"READ","perimeter":"OWN_TEAMS","site":null},
  {"position":"coordinatore-attivita-sportiva","section":"mister","level":"READ","perimeter":"ALL","site":null},
  {"position":"coordinatore-attivita-sportiva","section":"quadro","level":"WRITE","perimeter":"ALL","site":null},
  {"position":"coordinatore-attivita-sportiva","section":"impianti-campi","level":"WRITE","perimeter":"ALL","site":null},
  {"position":"coordinatore-attivita-sportiva","section":"organigramma","level":"READ","perimeter":"ALL","site":null},
  {"position":"responsabile-attivita-base","section":"mister","level":"READ","perimeter":"ALL","site":null},
  {"position":"responsabile-attivita-base","section":"quadro","level":"WRITE","perimeter":"ALL","site":null},
  {"position":"responsabile-attivita-base","section":"impianti-campi","level":"WRITE","perimeter":"ALL","site":null},
  {"position":"responsabile-attivita-base","section":"organigramma","level":"READ","perimeter":"ALL","site":null},
  {"position":"responsabile-trasporti","section":"pulmini","level":"APPROVE","perimeter":"ALL","site":null},
  {"position":"autista","section":"pulmini","level":"READ","perimeter":"SELF","site":null},
  {"position":"responsabile-magazzino","section":"magazzino","level":"APPROVE","perimeter":"ALL","site":null},
  {"position":"responsabile-magazzino","section":"magazzino-cassa","level":"WRITE","perimeter":"ALL","site":null},
  {"position":"collaboratore-magazzino","section":"magazzino","level":"WRITE","perimeter":"ALL","site":null},
  {"position":"responsabile-club-house","section":"club-house","level":"WRITE","perimeter":"ALL","site":null},
  {"position":"addetto-biglietteria","section":"biglietteria","level":"WRITE","perimeter":"ALL","site":null},
  {"position":"responsabile-campi","section":"impianti-campi","level":"WRITE","perimeter":"ALL","site":null},
  {"position":"responsabile-campi","section":"mappa","level":"READ","perimeter":"ALL","site":null},
  {"position":"responsabile-struttura","section":"impianti-campi","level":"WRITE","perimeter":"ALL","site":null},
  {"position":"responsabile-struttura","section":"mappa","level":"READ","perimeter":"ALL","site":null},
  {"position":"responsabile-struttura-colico","section":"impianti-campi","level":"WRITE","perimeter":"OWN_SITE","site":"COLICO"},
  {"position":"responsabile-struttura-colico","section":"mappa","level":"READ","perimeter":"OWN_SITE","site":"COLICO"},
  {"position":"responsabile-struttura-dervio","section":"impianti-campi","level":"WRITE","perimeter":"OWN_SITE","site":"DERVIO"},
  {"position":"responsabile-struttura-dervio","section":"mappa","level":"READ","perimeter":"OWN_SITE","site":"DERVIO"},
  {"position":"responsabile-infermeria","section":"infermeria","level":"WRITE","perimeter":"ALL","site":null},
  {"position":"segreteria","section":"segreteria","level":"WRITE","perimeter":"ALL","site":null},
  {"position":"segreteria","section":"persone","level":"WRITE","perimeter":"ALL","site":null},
  {"position":"segreteria","section":"certificati","level":"WRITE","perimeter":"ALL","site":null},
  {"position":"segreteria","section":"coda","level":"WRITE","perimeter":"ALL","site":null},
  {"position":"segreteria","section":"posta","level":"WRITE","perimeter":"ALL","site":null},
  {"position":"segreteria","section":"quote","level":"READ","perimeter":"ALL","site":null},
  {"position":"segreteria-presenza","section":"segreteria","level":"WRITE","perimeter":"ALL","site":null},
  {"position":"segreteria-presenza","section":"certificati","level":"READ","perimeter":"ALL","site":null},
  {"position":"segreteria-remoto","section":"segreteria","level":"WRITE","perimeter":"ALL","site":null},
  {"position":"segreteria-remoto","section":"coda","level":"WRITE","perimeter":"ALL","site":null},
  {"position":"tesoreria","section":"tesoreria","level":"READ","perimeter":"ALL","site":null},
  {"position":"tesoreria","section":"quote","level":"WRITE","perimeter":"ALL","site":null},
  {"position":"tesoreria","section":"compensi","level":"WRITE","perimeter":"ALL","site":null},
  {"position":"tesoreria","section":"scadenzario","level":"WRITE","perimeter":"ALL","site":null},
  {"position":"tesoreria","section":"movimenti","level":"WRITE","perimeter":"ALL","site":null},
  {"position":"moderatore","section":"crea","level":"APPROVE","perimeter":"ALL","site":null},
  {"position":"responsabile-tornei","section":"crm","level":"WRITE","perimeter":"ALL","site":null},
  {"position":"dirigenza","section":"direzione","level":"READ","perimeter":"ALL","site":null},
  {"position":"dirigenza","section":"acquisti","level":"WRITE","perimeter":"ALL","site":null},
  {"position":"famiglia","section":"famiglia","level":"WRITE","perimeter":"OWN_CHILDREN","site":null},
  {"position":"atleta","section":"famiglia","level":"READ","perimeter":"SELF","site":null},
  {"position":"partner","section":"partner","level":"WRITE","perimeter":"SELF","site":null}
]
$sug$::jsonb) as r(position text, section text, level text, perimeter text, site text)
  ),
  role_positions as (
    select * from jsonb_to_recordset($rp$
[
  {"role":"DIRECTION","position":"direzione"},
  {"role":"DIRECTION","position":"dirigenza"},
  {"role":"SECRETARIAT","position":"segreteria"},
  {"role":"REGISTRATION","position":"segreteria"},
  {"role":"MANAGER","position":"dirigente-annata"},
  {"role":"MISTER","position":"mister"},
  {"role":"FAMILY","position":"famiglia"},
  {"role":"ATHLETE","position":"atleta"}
]
$rp$::jsonb) as rp(role text, position text)
  ),
  kind_positions as (
    select key as kind, value as position from jsonb_each_text($kp$
{
  "MISTER": "mister",
  "DIRIGENTE": "dirigente-annata",
  "AUTISTA": "autista",
  "ORGANO_SOCIETARIO": "dirigenza"
}
$kp$::jsonb)
  ),
  allowed as (
    select public.scd_has_org_role(p_organization_id, array['DIRECTION']::public.scd_role[]) as ok
  ),
  accounts as (
    select m.role::text as role, m.scope
    from public.scd_identity_links l
    join public.scd_memberships m on m.user_id = l.user_id and m.organization_id = l.organization_id and m.active
    where l.organization_id = p_organization_id and l.person_id = p_person_id and l.link_state <> 'REVOKED'
  ),
  roles as (
    select r.role_label, r.role_kind, r.team_id
    from public.scd_structure_roles r
    where r.organization_id = p_organization_id and r.person_id = p_person_id and r.active
      and (r.valid_to is null or r.valid_to >= current_date)
  ),
  positions as (
    select rp.position, 'Accesso: ' || replace(rp.position, '-', ' ') as why from accounts a join role_positions rp on rp.role = a.role
    union
    select x, 'Accesso: ' || replace(x, '-', ' ') from accounts a,
      jsonb_array_elements_text(case when jsonb_typeof(a.scope->'positions') = 'array' then a.scope->'positions' else '[]'::jsonb end) x
    union
    select kp.position, 'Ruolo: ' || r.role_label from roles r join kind_positions kp on kp.kind = r.role_kind
    union
    select 'famiglia', 'Genitore o tutore' where exists (
      select 1 from public.scd_family_members fm where fm.person_id = p_person_id and fm.is_guardian)
    union
    select 'atleta', 'Atleta' where exists (select 1 from public.scd_athletes a where a.person_id = p_person_id)
  ),
  team_list as (
    select coalesce(array_agg(distinct team_id order by team_id) filter (where team_id is not null), '{}') as ids from roles
  ),
  candidates as (
    select r.section, r.level, r.perimeter, r.site, p.why,
           case r.perimeter when 'ALL' then 4 when 'OWN_SITE' then 3 when 'OWN_TEAMS' then 2 when 'OWN_CHILDREN' then 1 else 0 end as breadth
    from positions p join rules r on r.position = p.position
    where public.scd_section_grantable(r.section, r.level, r.perimeter)
  ),
  widest as (
    select distinct on (section) section, perimeter, site
    from candidates order by section, breadth desc, site nulls last
  ),
  agg as (
    select c.section,
           (array['READ','WRITE','APPROVE'])[max(public.scd_level_rank(c.level))] as level,
           string_agg(distinct c.why, '; ') as reason
    from candidates c group by c.section
  )
  select a.section, a.level, w.perimeter,
         case when w.perimeter = 'OWN_TEAMS' then (select ids from team_list) else '{}'::uuid[] end,
         case when w.perimeter = 'OWN_SITE' then w.site else null end,
         a.reason
  from agg a join widest w on w.section = a.section
  where (select ok from allowed)
  order by a.section;
$$;

-- 9. Reads for the Direzione page.
-- Everything the page needs about one person, in one call (Direzione only; empty object otherwise).
create or replace function public.scd_person_grant_context(p_organization_id uuid, p_person_id uuid)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select case when not public.scd_has_org_role(p_organization_id, array['DIRECTION']::public.scd_role[]) then '{}'::jsonb
  else (
    select jsonb_build_object(
      'person', jsonb_build_object(
        'id', p.id,
        'name', coalesce(p.display_name, trim(p.first_name || ' ' || p.last_name)),
        'status', p.status,
        'birth_known', p.birth_date is not null,
        'minor', case when p.birth_date is null then null else p.birth_date > current_date - interval '18 years' end),
      'accounts', coalesce((
        select jsonb_agg(jsonb_build_object('email', u.email, 'role', m.role, 'active', m.active,
                                            'positions', coalesce(m.scope->'positions', '[]'::jsonb)) order by u.email)
        from public.scd_identity_links l
        join auth.users u on u.id = l.user_id
        left join public.scd_memberships m on m.user_id = l.user_id and m.organization_id = l.organization_id
        where l.organization_id = p_organization_id and l.person_id = p.id and l.link_state <> 'REVOKED'), '[]'::jsonb),
      'is_self', exists (select 1 from public.scd_identity_links l
                         where l.organization_id = p_organization_id and l.person_id = p.id
                           and l.user_id = (select auth.uid()) and l.link_state <> 'REVOKED'),
      'is_club_account', public.scd_is_club_account_person(p_organization_id, p.id),
      'roles', coalesce((
        select jsonb_agg(jsonb_build_object('kind', r.role_kind, 'label', r.role_label, 'team_id', r.team_id) order by r.role_label)
        from public.scd_structure_roles r
        where r.person_id = p.id and r.active and (r.valid_to is null or r.valid_to >= current_date)), '[]'::jsonb),
      'is_guardian', exists (select 1 from public.scd_family_members fm where fm.person_id = p.id and fm.is_guardian),
      'is_athlete', exists (select 1 from public.scd_athletes a where a.person_id = p.id))
    from public.scd_people p
    where p.id = p_person_id and p.organization_id = p_organization_id)
  end;
$$;

-- Audit rows of one person's section grants (Direzione only).
create or replace function public.scd_person_grant_audit(p_organization_id uuid, p_person_id uuid, p_limit integer default 50)
returns table (id bigint, created_at timestamptz, action text, actor_email text, detail jsonb)
language sql
stable
security definer
set search_path to 'public'
as $$
  select a.id, a.created_at, a.action, u.email::text, a.detail
  from public.scd_access_audit a
  left join auth.users u on u.id = a.actor_user_id
  where a.organization_id = p_organization_id and a.target_person_id = p_person_id
    and a.action in ('GRANT_SECTION','CHANGE_SECTION','REVOKE_SECTION','COPY_GRANTS','GRANT_PERSON','REVOKE_LINK')
    and public.scd_has_org_role(p_organization_id, array['DIRECTION']::public.scd_role[])
  order by a.created_at desc, a.id desc
  limit least(greatest(coalesce(p_limit, 50), 1), 200);
$$;

-- 10. Execute rights: helpers stay private; the API is for signed-in users (each function checks the Direzione).
revoke all on function public.scd_section_catalog() from public, anon;
revoke all on function public.scd_section_grantable(text, text, text) from public, anon;
revoke all on function public.scd_level_rank(text) from public, anon;
revoke all on function public.scd_is_club_account_person(uuid, uuid) from public, anon, authenticated;
revoke all on function public.scd_person_grants_guard(uuid, uuid) from public, anon, authenticated;
revoke all on function public.scd_set_person_grants(uuid, uuid, jsonb, text) from public, anon;
revoke all on function public.scd_copy_person_grants(uuid, uuid, uuid, text) from public, anon;
revoke all on function public.scd_can(text, text, uuid, uuid, text, uuid) from public, anon;
revoke all on function public.scd_suggest_grants(uuid, uuid) from public, anon;
revoke all on function public.scd_person_grant_context(uuid, uuid) from public, anon;
revoke all on function public.scd_person_grant_audit(uuid, uuid, integer) from public, anon;
grant execute on function public.scd_section_catalog() to authenticated;
grant execute on function public.scd_section_grantable(text, text, text) to authenticated;
grant execute on function public.scd_level_rank(text) to authenticated;
grant execute on function public.scd_set_person_grants(uuid, uuid, jsonb, text) to authenticated;
grant execute on function public.scd_copy_person_grants(uuid, uuid, uuid, text) to authenticated;
grant execute on function public.scd_can(text, text, uuid, uuid, text, uuid) to authenticated;
grant execute on function public.scd_suggest_grants(uuid, uuid) to authenticated;
grant execute on function public.scd_person_grant_context(uuid, uuid) to authenticated;
grant execute on function public.scd_person_grant_audit(uuid, uuid, integer) to authenticated;
