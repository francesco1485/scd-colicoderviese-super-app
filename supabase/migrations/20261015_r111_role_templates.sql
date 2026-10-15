-- r111: role templates on top of r100 person grants (Direzione 15/10/2026). STAGED: written, NOT applied.
-- Apply only after Francesco writes "applica r111". Never on project dfnwzwutvnwiitiffwvr.
--
-- Francesco's decisions (claude.ai project doc claude/SCD_DELEGHE_DECISIONI_2026-10-15.md, verbatim):
--   1. "confermo ma deve esserci anche possibilita di creare uno vuoto da zero sempre in tutte le piattaforme"
--   2. "a creare puo essere presidente e direttore generale"
--   3. "inarico di squadra vede cose della squadra , il responsabile vede piu squadre e piu aree o piu piattaforme
--      in base alle autorizzazioni che la direzione gli da dopo aver avuto accesso a quelle basi"
--
-- What this adds (additive only; r100 keeps working exactly as it is):
--   * scd_section_platform(code): every section belongs to one platform, ONE (families/public), CORE (management)
--     or GROW (sponsors). Kept equal to config/scd-sections.v1.json by apps/superapp/src/lib/role-templates.test.ts.
--   * scd_role_templates + scd_role_template_grants: a role template is a NAMED, REUSABLE set of section grants for
--     one platform. A new template always starts EMPTY (every section "Nessuno" = no rows). A template opens nothing
--     by itself: the Direzione loads it into a person's checklist and saves it through r100 scd_set_person_grants,
--     choosing the concrete teams / site for that person (team role = only the teams chosen for that person).
--   * scd_is_role_creator(org): only an active Direzione account linked to the person holding the active structure
--     role "Presidente" or "Direttore Generale" creates, edits or deactivates templates.
--   * Base access first: a trigger refuses a new or wider grant for a person without an active account of the club
--     (verified link + active membership). Revoking or narrowing a grant is never blocked.
--   * Creator identity cannot be self-assigned: triggers on scd_structure_roles and scd_identity_links refuse, from
--     anyone who is not already a creator, any row that adds, changes or links the structure roles "Presidente" /
--     "Direttore Generale" (migrations and the service role, with no user, are not affected). This also covers
--     closing them or marking the person as left (r59): only a creator or the service role does it.
--     Bootstrap VERIFIED 15/10/2026 on SCD PULSE: Presidente and Direttore Generale already have an AUTO_VERIFIED
--     link and an active DIRECTION membership, so they are creators as soon as r111 is applied.
--   * Audit actions CREATE_ROLE / CHANGE_ROLE / ROLE_STATUS in scd_access_audit.
--
-- Rollback (only on Francesco's explicit order; templates are lost, person grants are untouched):
--   drop trigger if exists scd_identity_links_creator_guard on public.scd_identity_links;
--   drop trigger if exists scd_structure_roles_creator_guard on public.scd_structure_roles;
--   drop function if exists public.scd_identity_links_creator_guard();
--   drop function if exists public.scd_structure_roles_creator_guard();
--   drop function if exists public.scd_is_creator_label(text);
--   drop trigger if exists scd_person_grants_base_access on public.scd_person_grants;
--   drop function if exists public.scd_person_grants_base_access_check();
--   drop function if exists public.scd_set_role_template_active(uuid, uuid, boolean, text);
--   drop function if exists public.scd_set_role_template(uuid, uuid, text, text, jsonb, text);
--   drop function if exists public.scd_create_role_template(uuid, text, text, text, jsonb);
--   drop function if exists public.scd_role_template_grants_valid(text, jsonb);
--   drop table if exists public.scd_role_template_grants;
--   drop table if exists public.scd_role_templates;
--   drop function if exists public.scd_person_has_base_access(uuid, uuid);
--   drop function if exists public.scd_role_label_key(text);
--   drop function if exists public.scd_is_role_creator(uuid);
--   drop function if exists public.scd_section_platform(text);
--   (the widened audit constraint can stay: it only allows more values)

-- 1. Audit actions (r100 values kept).
alter table public.scd_access_audit drop constraint if exists scd_access_audit_action_check;
alter table public.scd_access_audit add constraint scd_access_audit_action_check check (action in (
  'SET_ACCESS','GRANT_PERSON','REVOKE_LINK','APPROVE_REQUEST','REJECT_REQUEST',
  'GRANT_SECTION','CHANGE_SECTION','REVOKE_SECTION','COPY_GRANTS',
  'CREATE_ROLE','CHANGE_ROLE','ROLE_STATUS'));

-- 2. Platform of each section (config/scd-sections.v1.json "platform"). Unknown codes answer null.
create or replace function public.scd_section_platform(p_code text)
returns text
language sql
immutable
set search_path to 'public'
as $$
  select x.platform
  from jsonb_to_recordset($plat$
[
  {"code":"pubblico","platform":"ONE"},
  {"code":"profilo","platform":"ONE"},
  {"code":"tessera","platform":"ONE"},
  {"code":"mister","platform":"CORE"},
  {"code":"quadro","platform":"CORE"},
  {"code":"impianti-campi","platform":"CORE"},
  {"code":"mappa","platform":"CORE"},
  {"code":"organigramma","platform":"CORE"},
  {"code":"pulmini","platform":"CORE"},
  {"code":"famiglia","platform":"ONE"},
  {"code":"infermeria","platform":"CORE"},
  {"code":"salute-minori","platform":"CORE"},
  {"code":"safeguarding","platform":"CORE"},
  {"code":"magazzino","platform":"CORE"},
  {"code":"club-house","platform":"CORE"},
  {"code":"biglietteria","platform":"CORE"},
  {"code":"magazzino-cassa","platform":"CORE"},
  {"code":"segreteria","platform":"CORE"},
  {"code":"persone","platform":"CORE"},
  {"code":"certificati","platform":"CORE"},
  {"code":"coda","platform":"CORE"},
  {"code":"posta","platform":"CORE"},
  {"code":"crm","platform":"GROW"},
  {"code":"crea","platform":"CORE"},
  {"code":"tesoreria","platform":"CORE"},
  {"code":"quote","platform":"CORE"},
  {"code":"compensi","platform":"CORE"},
  {"code":"scadenzario","platform":"CORE"},
  {"code":"movimenti","platform":"CORE"},
  {"code":"direzione","platform":"CORE"},
  {"code":"acquisti","platform":"CORE"},
  {"code":"cervellone","platform":"CORE"},
  {"code":"accessi","platform":"CORE"},
  {"code":"posta-collega","platform":"CORE"},
  {"code":"partner","platform":"GROW"},
  {"code":"fondo-solidale","platform":"CORE"},
  {"code":"adotta","platform":"GROW"},
  {"code":"donazioni","platform":"CORE"},
  {"code":"proposte","platform":"CORE"}
]
$plat$::jsonb) as x(code text, platform text)
  where x.code = p_code;
$$;

-- 3. Who may create / edit / deactivate templates: an active Direzione account whose linked person holds the active
-- structure role "Presidente" or "Direttore Generale" in the same organisation.
create or replace function public.scd_is_role_creator(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select (select auth.uid()) is not null
    and public.scd_has_org_role(p_organization_id, array['DIRECTION']::public.scd_role[])
    and exists (
      select 1
      from public.scd_identity_links l
      join public.scd_structure_roles r on r.person_id = l.person_id and r.organization_id = l.organization_id
      where l.organization_id = p_organization_id and l.user_id = (select auth.uid())
        and l.link_state in ('AUTO_VERIFIED', 'VERIFIED_BY_STAFF')
        and r.active and (r.valid_to is null or r.valid_to >= current_date)
        and lower(btrim(r.role_label)) in ('presidente', 'direttore generale'));
$$;

-- Canonical form of a role name for uniqueness: trimmed, inner spaces collapsed, lower case (same as cleanLabel in TS).
create or replace function public.scd_role_label_key(p_label text)
returns text
language sql
immutable
set search_path to 'public'
as $$ select lower(regexp_replace(btrim(coalesce(p_label, '')), '\s+', ' ', 'g')); $$;

-- True when the person has at least one active account of the organisation (the "base" access).
create or replace function public.scd_person_has_base_access(p_organization_id uuid, p_person_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1
    from public.scd_identity_links l
    join public.scd_memberships m on m.user_id = l.user_id and m.organization_id = l.organization_id
    where l.organization_id = p_organization_id and l.person_id = p_person_id
      and l.link_state in ('AUTO_VERIFIED', 'VERIFIED_BY_STAFF')
      and m.active);
$$;

-- 4. Templates.
create table if not exists public.scd_role_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  platform text not null check (platform in ('ONE','CORE','GROW')),
  label text not null check (char_length(btrim(label)) between 2 and 80),
  description text not null default '' check (char_length(description) <= 300),
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
create unique index if not exists scd_role_templates_label_idx
  on public.scd_role_templates(organization_id, platform, public.scd_role_label_key(label)) where active;
create index if not exists scd_role_templates_org_idx on public.scd_role_templates(organization_id, platform, active);
create index if not exists scd_role_templates_created_by_idx on public.scd_role_templates(created_by);
create index if not exists scd_role_templates_updated_by_idx on public.scd_role_templates(updated_by);
comment on table public.scd_role_templates is
  'Direzione 15/10/2026: named reusable sets of section grants, one platform each, always created empty. Opens nothing by itself: loaded into a person''s checklist and saved through scd_set_person_grants. Written only by SECURITY DEFINER functions (Presidente / Direttore Generale).';

-- One row per section that is NOT "Nessuno". Perimeter only: teams and site are chosen per person when applied.
create table if not exists public.scd_role_template_grants (
  template_id uuid not null references public.scd_role_templates(id) on delete cascade,
  section_code text not null,
  level text not null check (level in ('READ','WRITE','APPROVE')),
  perimeter text not null check (perimeter in ('ALL','OWN_TEAMS','OWN_SITE','OWN_CHILDREN','SELF')),
  primary key (template_id, section_code),
  constraint scd_role_template_grants_grantable check (public.scd_section_grantable(section_code, level, perimeter))
);

alter table public.scd_role_templates enable row level security;
alter table public.scd_role_template_grants enable row level security;
revoke all on table public.scd_role_templates from anon, authenticated;
revoke all on table public.scd_role_template_grants from anon, authenticated;
grant select on table public.scd_role_templates to authenticated;
grant select on table public.scd_role_template_grants to authenticated;
drop policy if exists "scd_role_templates_select_direction" on public.scd_role_templates;
drop policy if exists "scd_role_template_grants_select_direction" on public.scd_role_template_grants;
create policy "scd_role_templates_select_direction" on public.scd_role_templates
  for select to authenticated
  using (public.scd_has_org_role(organization_id, array['DIRECTION']::public.scd_role[]));
create policy "scd_role_template_grants_select_direction" on public.scd_role_template_grants
  for select to authenticated
  using (exists (
    select 1 from public.scd_role_templates t
    where t.id = scd_role_template_grants.template_id
      and public.scd_has_org_role(t.organization_id, array['DIRECTION']::public.scd_role[])));
-- No insert / update / delete policy: writes go only through the functions below.

-- Null when p_grants is a valid set for the platform, otherwise the reason.
-- p_grants: [{"section":"mister","level":"WRITE","perimeter":"OWN_TEAMS"}, ...]
create or replace function public.scd_role_template_grants_valid(p_platform text, p_grants jsonb)
returns text
language plpgsql
immutable
set search_path to 'public'
as $$
declare
  g jsonb;
  v_seen text[] := '{}';
  v_section text;
begin
  if p_grants is null or jsonb_typeof(p_grants) <> 'array' then return 'grants must be an array'; end if;
  if jsonb_array_length(p_grants) > 60 then return 'too many sections'; end if;
  for g in select * from jsonb_array_elements(p_grants) loop
    v_section := g->>'section';
    if v_section is null or v_section = any(v_seen) then return 'duplicate or missing section'; end if;
    v_seen := v_seen || v_section;
    if public.scd_section_platform(v_section) is distinct from p_platform then return 'section of another platform'; end if;
    if not public.scd_section_grantable(v_section, g->>'level', g->>'perimeter') then return 'section not grantable'; end if;
  end loop;
  return null;
end;
$$;

-- 5. Write functions (Presidente / Direttore Generale only).
-- Creates a role on a platform. Without p_grants (or with []) the role is EMPTY; with a model's sections they are
-- validated and saved in the same transaction.
create or replace function public.scd_create_role_template(
  p_organization_id uuid, p_platform text, p_label text, p_description text, p_grants jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_id uuid;
  v_problem text;
  v_label text := regexp_replace(btrim(coalesce(p_label, '')), '\s+', ' ', 'g');
begin
  if not public.scd_is_role_creator(p_organization_id) then
    raise exception 'roles: Presidente or Direttore Generale only' using errcode = '42501';
  end if;
  if p_platform is null or p_platform not in ('ONE','CORE','GROW') then raise exception 'unknown platform' using errcode = '22023'; end if;
  v_problem := public.scd_role_template_grants_valid(p_platform, coalesce(p_grants, '[]'::jsonb));
  if v_problem is not null then raise exception '%', v_problem using errcode = '22023'; end if;
  if char_length(v_label) < 2 or char_length(v_label) > 80 then raise exception 'label length' using errcode = '22023'; end if;
  if exists (select 1 from public.scd_role_templates
             where organization_id = p_organization_id and platform = p_platform and active
               and public.scd_role_label_key(label) = public.scd_role_label_key(v_label)) then
    raise exception 'role label already used' using errcode = '23505';
  end if;
  insert into public.scd_role_templates (organization_id, platform, label, description, created_by, updated_by)
  values (p_organization_id, p_platform, v_label, left(btrim(coalesce(p_description, '')), 300), (select auth.uid()), (select auth.uid()))
  returning id into v_id;
  insert into public.scd_role_template_grants (template_id, section_code, level, perimeter)
  select v_id, g->>'section', g->>'level', g->>'perimeter' from jsonb_array_elements(coalesce(p_grants, '[]'::jsonb)) g;
  insert into public.scd_access_audit (organization_id, actor_user_id, action, detail)
  values (p_organization_id, (select auth.uid()), 'CREATE_ROLE', jsonb_build_object(
    'template_id', v_id, 'platform', p_platform, 'label', v_label,
    'empty', jsonb_array_length(coalesce(p_grants, '[]'::jsonb)) = 0,
    'sections', (select coalesce(jsonb_agg(jsonb_build_object('section', g->>'section', 'level', g->>'level', 'perimeter', g->>'perimeter') order by g->>'section'), '[]'::jsonb)
                 from jsonb_array_elements(coalesce(p_grants, '[]'::jsonb)) g)));
  return v_id;
end;
$$;

-- Replaces name, description and the whole set of sections of an active template. Returns the number of sections.
create or replace function public.scd_set_role_template(
  p_organization_id uuid, p_template_id uuid, p_label text, p_description text, p_grants jsonb, p_note text
)
returns integer
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_t public.scd_role_templates%rowtype;
  v_label text := regexp_replace(btrim(coalesce(p_label, '')), '\s+', ' ', 'g');
  v_problem text;
  v_before jsonb;
  v_count integer;
begin
  if not public.scd_is_role_creator(p_organization_id) then
    raise exception 'roles: Presidente or Direttore Generale only' using errcode = '42501';
  end if;
  select * into v_t from public.scd_role_templates
  where id = p_template_id and organization_id = p_organization_id for update;
  if not found then raise exception 'role not found' using errcode = 'P0002'; end if;
  if not v_t.active then raise exception 'role is not active' using errcode = '22023'; end if;
  if char_length(v_label) < 2 or char_length(v_label) > 80 then raise exception 'label length' using errcode = '22023'; end if;
  if exists (select 1 from public.scd_role_templates
             where organization_id = p_organization_id and platform = v_t.platform and active and id <> v_t.id
               and public.scd_role_label_key(label) = public.scd_role_label_key(v_label)) then
    raise exception 'role label already used' using errcode = '23505';
  end if;
  v_problem := public.scd_role_template_grants_valid(v_t.platform, p_grants);
  if v_problem is not null then raise exception '%', v_problem using errcode = '22023'; end if;

  select coalesce(jsonb_agg(jsonb_build_object('section', section_code, 'level', level, 'perimeter', perimeter) order by section_code), '[]'::jsonb)
    into v_before
  from public.scd_role_template_grants where template_id = v_t.id;

  delete from public.scd_role_template_grants where template_id = v_t.id;
  insert into public.scd_role_template_grants (template_id, section_code, level, perimeter)
  select v_t.id, g->>'section', g->>'level', g->>'perimeter' from jsonb_array_elements(p_grants) g;
  get diagnostics v_count = row_count;

  update public.scd_role_templates
  set label = v_label, description = left(btrim(coalesce(p_description, '')), 300),
      updated_by = (select auth.uid()), updated_at = now()
  where id = v_t.id;

  insert into public.scd_access_audit (organization_id, actor_user_id, action, detail)
  values (p_organization_id, (select auth.uid()), 'CHANGE_ROLE', jsonb_build_object(
    'template_id', v_t.id, 'platform', v_t.platform,
    'label_before', v_t.label, 'label', v_label,
    'before', v_before,
    'after', (select coalesce(jsonb_agg(jsonb_build_object('section', g->>'section', 'level', g->>'level', 'perimeter', g->>'perimeter') order by g->>'section'), '[]'::jsonb)
              from jsonb_array_elements(p_grants) g),
    'note', left(btrim(coalesce(p_note, '')), 300)));
  return v_count;
end;
$$;

-- Deactivate / reactivate (never deleted). Reactivating checks the label is still free on that platform.
create or replace function public.scd_set_role_template_active(
  p_organization_id uuid, p_template_id uuid, p_active boolean, p_note text
)
returns boolean
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_t public.scd_role_templates%rowtype;
begin
  if not public.scd_is_role_creator(p_organization_id) then
    raise exception 'roles: Presidente or Direttore Generale only' using errcode = '42501';
  end if;
  if p_active is null then raise exception 'active must be set' using errcode = '22023'; end if;
  select * into v_t from public.scd_role_templates
  where id = p_template_id and organization_id = p_organization_id for update;
  if not found then raise exception 'role not found' using errcode = 'P0002'; end if;
  if v_t.active = p_active then return false; end if;
  if p_active and exists (select 1 from public.scd_role_templates
                          where organization_id = p_organization_id and platform = v_t.platform and active and id <> v_t.id
                            and public.scd_role_label_key(label) = public.scd_role_label_key(v_t.label)) then
    raise exception 'role label already used' using errcode = '23505';
  end if;
  update public.scd_role_templates set active = p_active, updated_by = (select auth.uid()), updated_at = now()
  where id = v_t.id;
  insert into public.scd_access_audit (organization_id, actor_user_id, action, detail)
  values (p_organization_id, (select auth.uid()), 'ROLE_STATUS', jsonb_build_object(
    'template_id', v_t.id, 'platform', v_t.platform, 'label', v_t.label, 'active', p_active,
    'note', left(btrim(coalesce(p_note, '')), 300)));
  return true;
end;
$$;

-- 6. Base access first: a new grant needs an active account of the club for that person.
create or replace function public.scd_person_grants_base_access_check()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if public.scd_person_has_base_access(new.organization_id, new.person_id) then return new; end if;
  -- Without base access a grant can only be NARROWED: r100 stores a change as "revoke the old row + insert the new
  -- one" in the same transaction, so the insert passes when it replaces a row revoked in this transaction by the
  -- same user with an equal or higher level and an equal or wider perimeter.
  if exists (
    select 1 from public.scd_person_grants o
    where o.organization_id = new.organization_id and o.person_id = new.person_id and o.section_code = new.section_code
      and o.id <> new.id and o.revoked_at = now() and o.revoked_by is not distinct from (select auth.uid())
      and public.scd_level_rank(o.level) >= public.scd_level_rank(new.level)
      and (o.perimeter = 'ALL'
           or (o.perimeter = new.perimeter
               and (new.perimeter <> 'OWN_TEAMS' or new.team_ids <@ o.team_ids)
               and o.site is not distinct from new.site))) then
    return new;
  end if;
  raise exception 'base access missing' using errcode = '22023';
end;
$$;
drop trigger if exists scd_person_grants_base_access on public.scd_person_grants;
create trigger scd_person_grants_base_access
  before insert on public.scd_person_grants
  for each row execute function public.scd_person_grants_base_access_check();

-- 6b. The creator identity cannot be self-assigned from the app (scd_structure_roles is writable by Direzione and
-- Segreteria since r59, and r65 lets the Direzione link accounts to people).
create or replace function public.scd_is_creator_label(p_label text)
returns boolean
language sql
immutable
set search_path to 'public'
as $$ select lower(btrim(coalesce(p_label, ''))) in ('presidente', 'direttore generale'); $$;

create or replace function public.scd_structure_roles_creator_guard()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_org uuid := coalesce(new.organization_id, old.organization_id);
begin
  if (select auth.uid()) is null then return coalesce(new, old); end if;
  if tg_op = 'UPDATE' and new.organization_id is distinct from old.organization_id
     and (public.scd_is_creator_label(old.role_label) or public.scd_is_creator_label(new.role_label)) then
    raise exception 'only Presidente or Direttore Generale change these roles' using errcode = '42501';
  end if;
  if (tg_op <> 'INSERT' and public.scd_is_creator_label(old.role_label))
     or (tg_op <> 'DELETE' and public.scd_is_creator_label(new.role_label)) then
    if not public.scd_is_role_creator(v_org) then
      raise exception 'only Presidente or Direttore Generale change these roles' using errcode = '42501';
    end if;
  end if;
  return coalesce(new, old);
end;
$$;
drop trigger if exists scd_structure_roles_creator_guard on public.scd_structure_roles;
create trigger scd_structure_roles_creator_guard
  before insert or update or delete on public.scd_structure_roles
  for each row execute function public.scd_structure_roles_creator_guard();

create or replace function public.scd_identity_links_creator_guard()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if (select auth.uid()) is null then return new; end if;
  if new.link_state in ('AUTO_VERIFIED', 'VERIFIED_BY_STAFF')
     and (tg_op = 'INSERT' or old.person_id is distinct from new.person_id or old.user_id is distinct from new.user_id
          or old.link_state not in ('AUTO_VERIFIED', 'VERIFIED_BY_STAFF'))
     and exists (select 1 from public.scd_structure_roles r
                 where r.organization_id = new.organization_id and r.person_id = new.person_id and r.active
                   and (r.valid_to is null or r.valid_to >= current_date)
                   and public.scd_is_creator_label(r.role_label))
     and not public.scd_is_role_creator(new.organization_id) then
    raise exception 'only Presidente or Direttore Generale link accounts to these people' using errcode = '42501';
  end if;
  return new;
end;
$$;
drop trigger if exists scd_identity_links_creator_guard on public.scd_identity_links;
create trigger scd_identity_links_creator_guard
  before insert or update on public.scd_identity_links
  for each row execute function public.scd_identity_links_creator_guard();

-- 7. Execute rights.
revoke all on function public.scd_section_platform(text) from public, anon;
revoke all on function public.scd_is_role_creator(uuid) from public, anon;
revoke all on function public.scd_person_has_base_access(uuid, uuid) from public, anon, authenticated;
revoke all on function public.scd_role_template_grants_valid(text, jsonb) from public, anon;
revoke all on function public.scd_role_label_key(text) from public, anon;
revoke all on function public.scd_is_creator_label(text) from public, anon;
revoke all on function public.scd_structure_roles_creator_guard() from public, anon, authenticated;
revoke all on function public.scd_identity_links_creator_guard() from public, anon, authenticated;
revoke all on function public.scd_create_role_template(uuid, text, text, text, jsonb) from public, anon;
revoke all on function public.scd_set_role_template(uuid, uuid, text, text, jsonb, text) from public, anon;
revoke all on function public.scd_set_role_template_active(uuid, uuid, boolean, text) from public, anon;
revoke all on function public.scd_person_grants_base_access_check() from public, anon, authenticated;
grant execute on function public.scd_section_platform(text) to authenticated;
grant execute on function public.scd_is_role_creator(uuid) to authenticated;
grant execute on function public.scd_role_template_grants_valid(text, jsonb) to authenticated;
grant execute on function public.scd_role_label_key(text) to authenticated;
grant execute on function public.scd_create_role_template(uuid, text, text, text, jsonb) to authenticated;
grant execute on function public.scd_set_role_template(uuid, uuid, text, text, jsonb, text) to authenticated;
grant execute on function public.scd_set_role_template_active(uuid, uuid, boolean, text) to authenticated;
