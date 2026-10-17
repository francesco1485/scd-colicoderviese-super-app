-- r141: staff directory with role-based visibility, phone-sharing consent and the 2026/27 organigram, 2026-10-17,
-- chat PC (range r130-r149).
-- STAGED: NOT APPLIED. Apply only after Francesco writes "applica r141". Never apply from an agent.
-- Target: SCD PULSE (ndevtxxijbcnskgysdit). Never on dfnwzwutvnwiitiffwvr.
-- Requires r132 (scd_person_consents one-active index and audit columns, STAGED): apply "applica r132" first. The
-- guard below stops the migration when r132 or one of the r33 / r59 / r61 / r65_1 / r74 objects is missing.
--
-- Why (Francesco, Direttore Generale, 17/10/2026 11:11-11:13, plan answered «applica»; UD-167):
--   1. One staff directory inside the gestionale. Direzione / Segreteria see everybody; a mister sees the staff of
--      his own teams plus the club-level responsibles (pulmini, campi, magazzino, palestra, segreteria); a family sees
--      only the staff of the child's team plus the Segreteria.
--   2. Iride and the cast know who does what (names, roles, teams) from the same source; a phone number is given ONLY
--      to a logged-in member with a verified role allowed by rule 1 AND only when the staff member agreed; otherwise
--      Iride hands the message over to the Segreteria.
--   3. Per-person consent "share my number with the families and the staff of my teams", default NO until answered.
--   4. External contacts (AC Monza, FIGC Sondrio, Comuni, Croce Rossa, AVIS...) belong to the GROW CRM, not here.
--
-- What it adds (no new table, no new login, no parallel registry):
--   1. scd_person_consents (r59/r132) accepts consent_type TELEFONO_STAFF_CONDIVISO. The phone stays where it already
--      is: scd_people.phone (r33), stored once. No row = not answered = not shared.
--   2. scd_structure_roles (r59, the organigram registry) gains needs_review: a role the Direzione declared with a
--      doubt ("squadre da confermare", inferred, surname only) is shown as "da confermare".
--   3. Helpers (SECURITY DEFINER, fixed search_path, nothing for anon): scd_staff_office, scd_staff_club_areas,
--      scd_staff_visible_role_ids, scd_staff_visible_person_ids, scd_staff_phone_shared (internal, no grant).
--      Rule 1 reuses scd_has_org_role, scd_has_position, scd_my_person_ids, scd_my_team_ids and scd_my_family.
--   4. scd_staff_directory(org) -> {viewer, callerAdult, people[{personId, name, roles[], phoneState, phone}], me}:
--      the ONE read used by the Rubrica staff page, the family page and Iride. phone is filled only when rule 1
--      lets the caller see the person, the person agreed (TELEFONO_STAFF_CONDIVISO granted, not revoked), the caller
--      is an adult and a number exists. Staff who are minors are never listed. USER_BASE (not verified) gets null.
--   5. scd_set_my_phone_share(org, share): the staff member's own answer, written as a new consent row (the previous
--      active one is revoked, history kept, given_by_role SELF, channel APP).
--   6. scd_person_phone(org, person): phone for the office roles only (DIRECTION, SECRETARIAT, REGISTRATION, same
--      as the r63 people policy), used by /segreteria/persone after the column hardening below.
--   7. RLS (rule 1): the staff branch of scd_people_select_member (r63_1) is NARROWED from "every adult with a
--      structure role" to the people of scd_staff_visible_person_ids; office and own-family branches unchanged.
--   8. Column hardening (rule 3): authenticated loses SELECT on scd_people.phone (every other column stays
--      readable as before, the row policy still applies). Phones are read only through 4 (with consent) and 6 (office).
--      The unused view scd_v_people_active (select p.*) can no longer be read by authenticated: no app code uses it.
--   9. Seed of the organigram 2026/27 declared by the Direzione 17/10/2026 (79 rows: names, roles, teams, NO phones):
--      people are matched by a SHA-256 key of the normalised name (the repository is public: no names in clear),
--      only ACTIVE adult people of the club, exactly one match or the row is skipped and reported (counts and row
--      numbers only). Surname-only rows match only a person who already holds a structure role. An existing role of
--      the same person on the same team and kind (or the same club label) is left untouched. 7 rows whose name is
--      "da confermare" are NOT in the seed; 13 "Contatti esterni" rows are NOT here (GROW CRM follow-up).
--  10. U18 Élite (withdrawn, Direzione 17/10/2026 10:15): its active staff roles are closed (active false,
--      valid_to 17/10/2026) with a CAMBIO_RUOLO row in scd_person_events. Athlete memberships are NOT touched.
--
-- Security: no anon grant; every function checks the caller with auth.uid(); the directory never returns e-mail,
-- birth date, health, documents or minors; consent and phone are per person; the U18 closure and the seed write the
-- history table. Engines: PERSONE (families and staff reach the right person) and TEMPO (the Segreteria stops being
-- the phone book). Measure: share of active staff with an answered TELEFONO_STAFF_CONDIVISO consent (target 80% in
-- 30 days); Iride contact questions answered without a manual Segreteria step (scd_person_consents + assistant logs
-- "staff-contact" outcome); rows of the seed matched / skipped (NOTICE of this migration).
--
-- Rollback (only on Francesco's explicit order):
--   begin;
--   -- phone column back to authenticated, previous people policy (r63_1 text)
--   grant select on public.scd_people to authenticated;
--   alter policy scd_people_select_member on public.scd_people using (
--     public.scd_has_org_role(organization_id, array['DIRECTION','SECRETARIAT','REGISTRATION']::public.scd_role[])
--     or id in (select f.person_id from public.scd_my_family(organization_id) f)
--     or (public.scd_has_org_role(organization_id, array['MISTER','MANAGER','STAFF','TOURNAMENTS']::public.scd_role[])
--         and coalesce(public.scd_is_minor(birth_date), false) = false and public.scd_has_active_structure_role(id)));
--   drop function if exists public.scd_person_phone(uuid, uuid);
--   drop function if exists public.scd_set_my_phone_share(uuid, boolean);
--   drop function if exists public.scd_staff_directory(uuid);
--   drop function if exists public.scd_staff_visible_person_ids(uuid);
--   drop function if exists public.scd_staff_visible_role_ids(uuid);
--   drop function if exists public.scd_staff_phone_shared(uuid);
--   drop function if exists public.scd_staff_club_areas();
--   drop function if exists public.scd_staff_office(uuid);
--   -- seeded roles: update public.scd_structure_roles set active = false, valid_to = current_date
--   --   where source_record_id like 'r141:%';  (U18 roles: re-open by hand from scd_person_events if ever needed)
--   -- consent rows TELEFONO_STAFF_CONDIVISO must be deleted before the r132 check is restored
--   alter table public.scd_structure_roles drop column if exists needs_review;
--   commit;

begin;

-- ---------------------------------------------------------------- 0. prerequisites (fail closed)
do $$
begin
  if to_regclass('public.scd_people') is null
     or to_regclass('public.scd_structure_roles') is null
     or to_regclass('public.scd_person_consents') is null
     or to_regclass('public.scd_person_events') is null
     or to_regclass('public.scd_teams') is null
     or to_regclass('public.scd_seasons') is null
     or to_regclass('public.scd_athletes') is null
     or to_regclass('public.scd_team_memberships') is null
     or to_regclass('public.scd_memberships') is null
     or to_regclass('public.scd_person_consents_one_active_uidx') is null
     or to_regprocedure('public.scd_has_org_role(uuid, public.scd_role[])') is null
     or to_regprocedure('public.scd_has_position(uuid, text[])') is null
     or to_regprocedure('public.scd_my_person_ids(uuid)') is null
     or to_regprocedure('public.scd_my_team_ids(uuid)') is null
     or to_regprocedure('public.scd_my_family(uuid)') is null
     or to_regprocedure('public.scd_is_minor(date)') is null then
    raise exception 'r141 prerequisites missing (r33, r59, r61, r65_1, r74, r132)';
  end if;
end;
$$;

-- ---------------------------------------------------------------- 1. consent type (r59 + r132 values kept)
do $$
declare
  c record;
begin
  for c in
    select con.conname from pg_constraint con
    where con.conrelid = 'public.scd_person_consents'::regclass and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%consent_type%'
  loop
    execute format('alter table public.scd_person_consents drop constraint %I', c.conname);
  end loop;
end;
$$;
alter table public.scd_person_consents
  add constraint scd_person_consents_consent_type_check check (consent_type in (
    'IMMAGINI_ISTITUZIONALI','COMUNICAZIONI_PROMOZIONALI','PULMINO_SERVIZIO','USCITA_AUTONOMA','AVATAR_APP','FOTO_PARTITA_APP',
    'IMMAGINE_NOME','COMM_EMAIL','PRESA_VISIONE_INFORMATIVA','PRESA_VISIONE_AUTISTA',
    'TELEFONO_STAFF_CONDIVISO'
  ));

-- ---------------------------------------------------------------- 2. "da confermare" on the organigram registry
alter table public.scd_structure_roles add column if not exists needs_review boolean not null default false;
comment on column public.scd_structure_roles.needs_review is
  'r141: role declared by the Direzione with a doubt (teams, inferred person, surname only): shown as "da confermare".';

-- ---------------------------------------------------------------- 3. helpers of rule 1
-- Direzione / Segreteria: see every staff member.
create or replace function public.scd_staff_office(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select public.scd_has_org_role(p_organization_id, array['DIRECTION','SECRETARIAT']::public.scd_role[])
      or public.scd_has_position(p_organization_id, array['direzione','presidente','direttore-generale','segreteria','segreteria-presenza','segreteria-remoto']);
$$;

-- Club-level responsibles every mister sees (Francesco 17/10/2026: pulmini, campi, magazzino, palestra, segreteria).
-- Mirror: apps/superapp/src/lib/staff-directory.ts STAFF_CLUB_AREAS (a test keeps them equal).
create or replace function public.scd_staff_club_areas()
returns text[]
language sql
immutable
set search_path to 'public'
as $$ select array['pulmini','campi','magazzino','palestra','segreteria']::text[] $$;

-- Active consent "share my number" of a person. Internal: called only inside the functions below.
create or replace function public.scd_staff_phone_shared(p_person_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.scd_person_consents c
    where c.person_id = p_person_id and c.consent_type = 'TELEFONO_STAFF_CONDIVISO' and c.granted and c.revoked_at is null
  );
$$;

-- Structure roles the caller may see (rule 1). Adults only, active people, active roles shown in the app.
--   office  -> every role;
--   staff   (role MISTER / STAFF / MANAGER / TOURNAMENTS / REGISTRATION, or a linked active structure role)
--           -> roles of scd_my_team_ids (own teams; coordinator and office: all) + club-level roles of the club areas;
--   member  (any verified role, i.e. not USER_BASE) -> roles of the teams of the caller's own circle
--           (scd_my_family: self and children) + the Segreteria.
create or replace function public.scd_staff_visible_role_ids(p_organization_id uuid)
returns setof uuid
language sql
stable
security definer
set search_path to 'public'
as $$
  with ctx as (
    select
      public.scd_staff_office(p_organization_id) as office,
      (
        public.scd_has_org_role(p_organization_id, array['MISTER','STAFF','MANAGER','TOURNAMENTS','REGISTRATION']::public.scd_role[])
        or exists (
          select 1 from public.scd_structure_roles r
          where r.organization_id = p_organization_id and r.active
            and (r.valid_to is null or r.valid_to >= current_date)
            and r.person_id in (select public.scd_my_person_ids(p_organization_id))
        )
      ) as staff,
      exists (
        select 1 from public.scd_memberships m
        where m.organization_id = p_organization_id and m.user_id = (select auth.uid()) and m.active
          and m.role <> 'USER_BASE'::public.scd_role
      ) as member
  ),
  roles as (
    select r.id, r.team_id, r.area_id
    from public.scd_structure_roles r
    join public.scd_people p on p.id = r.person_id and p.organization_id = p_organization_id and p.status = 'ACTIVE'
    where r.organization_id = p_organization_id and r.active and r.show_in_app
      and (r.valid_to is null or r.valid_to >= current_date)
      and coalesce(public.scd_is_minor(p.birth_date), false) = false
  ),
  staff_teams as (
    select x.id from public.scd_my_team_ids(p_organization_id) as x(id)
    where (select staff from ctx)
  ),
  family_teams as (
    select distinct tm.team_id
    from public.scd_my_family(p_organization_id) f
    join public.scd_athletes a on a.person_id = f.person_id and a.organization_id = p_organization_id
    join public.scd_team_memberships tm on tm.athlete_id = a.id and (tm.valid_to is null or tm.valid_to >= current_date)
    where (select member from ctx)
  )
  select r.id
  from roles r, ctx
  where ctx.office
     or (ctx.staff and (
           (r.team_id is not null and r.team_id in (select id from staff_teams))
           or (r.team_id is null and r.area_id = any(public.scd_staff_club_areas()))))
     or (ctx.member and (
           (r.team_id is not null and r.team_id in (select team_id from family_teams))
           or (r.team_id is null and r.area_id = 'segreteria')));
$$;

create or replace function public.scd_staff_visible_person_ids(p_organization_id uuid)
returns setof uuid
language sql
stable
security definer
set search_path to 'public'
as $$
  select distinct r.person_id from public.scd_structure_roles r
  where r.id in (select public.scd_staff_visible_role_ids(p_organization_id));
$$;

-- ---------------------------------------------------------------- 4. the directory (page, family card, Iride)
create or replace function public.scd_staff_directory(p_organization_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_adult boolean;
  v_office boolean;
  v_staff boolean;
  v_me jsonb;
  v_people jsonb;
begin
  if not exists (
    select 1 from public.scd_memberships m
    where m.organization_id = p_organization_id and m.user_id = (select auth.uid()) and m.active
      and m.role <> 'USER_BASE'::public.scd_role
  ) then
    return null;
  end if;
  -- A caller bound to a minor (or with no verified person and only the ATHLETE role) never receives a number:
  -- no 1:1 adult-minor contact.
  v_adult := not exists (
      select 1 from public.scd_people p
      where p.id in (select public.scd_my_person_ids(p_organization_id))
        and coalesce(public.scd_is_minor(p.birth_date), false)
    )
    and not (
      public.scd_has_org_role(p_organization_id, array['ATHLETE']::public.scd_role[])
      and not exists (
        select 1 from public.scd_people p
        where p.id in (select public.scd_my_person_ids(p_organization_id)) and p.birth_date is not null
      )
    );
  v_office := public.scd_staff_office(p_organization_id);
  v_staff := public.scd_has_org_role(p_organization_id, array['MISTER','STAFF','MANAGER','TOURNAMENTS','REGISTRATION']::public.scd_role[])
    or exists (
      select 1 from public.scd_structure_roles r
      where r.organization_id = p_organization_id and r.active and (r.valid_to is null or r.valid_to >= current_date)
        and r.person_id in (select public.scd_my_person_ids(p_organization_id))
    );

  select coalesce(jsonb_agg(x.j order by x.name), '[]'::jsonb) into v_people
  from (
    select
      coalesce(nullif(p.display_name, ''), trim(p.first_name || ' ' || p.last_name)) as name,
      jsonb_build_object(
        'personId', p.id,
        'name', coalesce(nullif(p.display_name, ''), trim(p.first_name || ' ' || p.last_name)),
        'roles', jsonb_agg(jsonb_build_object(
            'label', r.role_label, 'kind', r.role_kind, 'teamCode', t.code, 'teamName', t.name,
            'area', r.area_id, 'needsReview', coalesce(r.needs_review, false))
          order by t.code nulls last, r.role_label),
        'phoneState', case
            when not v_adult or not public.scd_staff_phone_shared(p.id) then 'NOT_SHARED'
            when nullif(btrim(coalesce(p.phone, '')), '') is null then 'NO_NUMBER'
            else 'SHARED' end,
        'phone', case
            when v_adult and public.scd_staff_phone_shared(p.id) then nullif(btrim(coalesce(p.phone, '')), '')
            else null end
      ) as j
    from public.scd_structure_roles r
    join public.scd_people p on p.id = r.person_id
    left join public.scd_teams t on t.id = r.team_id
    where r.id in (select public.scd_staff_visible_role_ids(p_organization_id))
    group by p.id, p.display_name, p.first_name, p.last_name, p.phone
  ) x;

  -- The caller's own staff record: consent answer only (never the own number back).
  select jsonb_build_object(
      'personId', p.id,
      'consent', (select c.granted from public.scd_person_consents c
                  where c.person_id = p.id and c.consent_type = 'TELEFONO_STAFF_CONDIVISO' and c.revoked_at is null
                  order by c.given_at desc limit 1),
      'consentAt', (select c.given_at from public.scd_person_consents c
                    where c.person_id = p.id and c.consent_type = 'TELEFONO_STAFF_CONDIVISO' and c.revoked_at is null
                    order by c.given_at desc limit 1),
      'hasPhone', nullif(btrim(coalesce(p.phone, '')), '') is not null)
    into v_me
  from public.scd_people p
  where p.id in (select public.scd_my_person_ids(p_organization_id))
    and p.organization_id = p_organization_id and p.status = 'ACTIVE'
    and coalesce(public.scd_is_minor(p.birth_date), false) = false
    and exists (
      select 1 from public.scd_structure_roles r
      where r.person_id = p.id and r.active and (r.valid_to is null or r.valid_to >= current_date)
    )
  order by p.created_at
  limit 1;

  return jsonb_build_object(
    'viewer', case when v_office then 'OFFICE' when v_staff then 'STAFF' else 'FAMILY' end,
    'callerAdult', v_adult,
    'clubAreas', to_jsonb(public.scd_staff_club_areas()),
    'people', v_people,
    'me', v_me
  );
end;
$$;

-- ---------------------------------------------------------------- 5. the staff member's own answer
create or replace function public.scd_set_my_phone_share(p_organization_id uuid, p_share boolean)
returns jsonb
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_person uuid;
  v_now timestamptz := now();
begin
  if p_share is null then
    raise exception 'answer required' using errcode = '22023';
  end if;
  select p.id into v_person
  from public.scd_people p
  where p.id in (select public.scd_my_person_ids(p_organization_id))
    and p.organization_id = p_organization_id and p.status = 'ACTIVE'
    and coalesce(public.scd_is_minor(p.birth_date), false) = false
    and exists (
      select 1 from public.scd_structure_roles r
      where r.person_id = p.id and r.active and (r.valid_to is null or r.valid_to >= current_date)
    )
  order by p.created_at
  limit 1;
  if v_person is null then
    raise exception 'not a staff member of this club' using errcode = '42501';
  end if;
  update public.scd_person_consents
     set revoked_at = v_now, revoked_by_person_id = v_person
   where person_id = v_person and consent_type = 'TELEFONO_STAFF_CONDIVISO' and revoked_at is null;
  insert into public.scd_person_consents
    (organization_id, person_id, consent_type, granted, given_by_person_id, policy_version, given_at, source_id,
     given_by_role, channel)
  values
    (p_organization_id, v_person, 'TELEFONO_STAFF_CONDIVISO', p_share, v_person, 'r141-2026-10-17', v_now, 'SUPERAPP',
     'SELF', 'APP');
  return jsonb_build_object('ok', true, 'share', p_share, 'at', v_now);
end;
$$;

-- ---------------------------------------------------------------- 6. office read of a phone (after 8)
create or replace function public.scd_person_phone(p_organization_id uuid, p_person_id uuid)
returns text
language sql
stable
security definer
set search_path to 'public'
as $$
  select p.phone from public.scd_people p
  where p.id = p_person_id and p.organization_id = p_organization_id
    and public.scd_has_org_role(p_organization_id, array['DIRECTION','SECRETARIAT','REGISTRATION']::public.scd_role[]);
$$;

revoke all on function public.scd_staff_office(uuid) from public, anon;
revoke all on function public.scd_staff_club_areas() from public, anon;
revoke all on function public.scd_staff_phone_shared(uuid) from public, anon, authenticated;
revoke all on function public.scd_staff_visible_role_ids(uuid) from public, anon;
revoke all on function public.scd_staff_visible_person_ids(uuid) from public, anon;
revoke all on function public.scd_staff_directory(uuid) from public, anon;
revoke all on function public.scd_set_my_phone_share(uuid, boolean) from public, anon;
revoke all on function public.scd_person_phone(uuid, uuid) from public, anon;
grant execute on function public.scd_staff_office(uuid) to authenticated;
grant execute on function public.scd_staff_club_areas() to authenticated;
grant execute on function public.scd_staff_visible_role_ids(uuid) to authenticated;
grant execute on function public.scd_staff_visible_person_ids(uuid) to authenticated;
grant execute on function public.scd_staff_directory(uuid) to authenticated;
grant execute on function public.scd_set_my_phone_share(uuid, boolean) to authenticated;
grant execute on function public.scd_person_phone(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------- 7. RLS rule 1: staff branch narrowed (r63_1)
alter policy scd_people_select_member on public.scd_people
  using (
    public.scd_has_org_role(organization_id, array['DIRECTION','SECRETARIAT','REGISTRATION']::public.scd_role[])
    or id in (select f.person_id from public.scd_my_family(organization_id) f)
    or (
      public.scd_has_org_role(organization_id, array['MISTER','MANAGER','STAFF','TOURNAMENTS']::public.scd_role[])
      and coalesce(public.scd_is_minor(birth_date), false) = false
      and id in (select public.scd_staff_visible_person_ids(organization_id))
    )
  );

-- ---------------------------------------------------------------- 8. rule 3: phone column out of direct reads
do $$
declare
  v_cols text;
begin
  select string_agg(quote_ident(c.column_name), ', ' order by c.ordinal_position) into v_cols
  from information_schema.columns c
  where c.table_schema = 'public' and c.table_name = 'scd_people' and c.column_name <> 'phone';
  execute 'revoke select on public.scd_people from authenticated';
  execute format('grant select (%s) on public.scd_people to authenticated', v_cols);
end;
$$;

-- ---------------------------------------------------------------- 9-10. organigram 2026/27 and U18 closure
-- Session-only helpers (pg_temp): they disappear with the session, nothing callable stays in the database.
create or replace function pg_temp.scd_r141_key(p_text text)
returns text
language sql
immutable
as $$
  select encode(sha256(convert_to(regexp_replace(lower(translate(coalesce(p_text, ''),
    'ÀÁÂÄÃÈÉÊËÌÍÎÏÒÓÔÖÕÙÚÛÜÇÑàáâäãèéêëìíîïòóôöõùúûüçñ',
    'aaaaaeeeeiiiiooooouuuucnaaaaaeeeeiiiiooooouuuucn')), '[^a-z]', '', 'g'), 'UTF8')), 'hex');
$$;

create or replace function pg_temp.scd_r141_seed(p_organization_id uuid, p_rows jsonb, p_source text)
returns jsonb
language plpgsql
as $$
declare
  r jsonb;
  v_keys text[];
  v_season uuid;
  v_team uuid;
  v_person uuid;
  v_n integer;
  v_inserted integer := 0;
  v_present integer := 0;
  v_skipped jsonb := '[]'::jsonb;
begin
  select s.id into v_season from public.scd_seasons s
  where s.organization_id = p_organization_id and s.active
  order by s.starts_on desc limit 1;

  for r in select value from jsonb_array_elements(p_rows) loop
    v_keys := array(select jsonb_array_elements_text(r -> 'keys'));
    v_team := null;
    if r ->> 'team' is not null then
      select count(*), (array_agg(t.id))[1] into v_n, v_team
      from public.scd_teams t
      where t.organization_id = p_organization_id and t.season_id = v_season and t.code = r ->> 'team';
      if v_n <> 1 then
        v_skipped := v_skipped || jsonb_build_object('n', r -> 'n', 'reason', 'TEAM_NOT_FOUND');
        continue;
      end if;
    end if;

    select count(*), (array_agg(p.id))[1] into v_n, v_person
    from public.scd_people p
    where p.organization_id = p_organization_id and p.status = 'ACTIVE'
      and coalesce(public.scd_is_minor(p.birth_date), false) = false
      and (r ->> 'bornBefore' is null or (p.birth_date is not null and p.birth_date < (r ->> 'bornBefore')::date))
      and case
        when r ->> 'mode' = 'SURNAME' then
          pg_temp.scd_r141_key(p.last_name) = any(v_keys)
          and exists (
            select 1 from public.scd_structure_roles x
            where x.person_id = p.id and x.active and (x.valid_to is null or x.valid_to >= current_date))
        else
          pg_temp.scd_r141_key(p.last_name || p.first_name) = any(v_keys)
          or pg_temp.scd_r141_key(p.first_name || p.last_name) = any(v_keys)
      end;
    if v_n = 0 then
      v_skipped := v_skipped || jsonb_build_object('n', r -> 'n', 'reason', 'PERSON_NOT_FOUND');
      continue;
    elsif v_n > 1 then
      v_skipped := v_skipped || jsonb_build_object('n', r -> 'n', 'reason', 'PERSON_AMBIGUOUS');
      continue;
    end if;

    if exists (
      select 1 from public.scd_structure_roles x
      where x.organization_id = p_organization_id and x.person_id = v_person and x.active
        and (x.valid_to is null or x.valid_to >= current_date)
        and (
          (v_team is not null and x.team_id = v_team and x.role_kind = r ->> 'kind')
          or (v_team is null and x.team_id is null and lower(x.role_label) = lower(r ->> 'label'))
        )
    ) then
      v_present := v_present + 1;
      continue;
    end if;

    insert into public.scd_structure_roles
      (organization_id, person_id, season_id, role_label, role_kind, team_id, area_id, show_in_app,
       valid_from, active, source_id, source_record_id, needs_review)
    values
      (p_organization_id, v_person, v_season, r ->> 'label', r ->> 'kind', v_team, r ->> 'area', true,
       date '2026-10-17', true, p_source, 'r141:' || (r ->> 'n'), coalesce((r ->> 'review')::boolean, false));
    insert into public.scd_person_events (organization_id, person_id, event_type, event_date, reason, note)
    values (p_organization_id, v_person, 'CAMBIO_RUOLO', date '2026-10-17',
            'Organigramma 2026/27 dichiarato dalla Direzione', 'r141: ' || (r ->> 'label'));
    v_inserted := v_inserted + 1;
  end loop;

  return jsonb_build_object('rows', jsonb_array_length(p_rows), 'inserted', v_inserted,
                            'alreadyPresent', v_present, 'skipped', v_skipped);
end;
$$;

create or replace function pg_temp.scd_r141_close_u18(p_organization_id uuid)
returns integer
language plpgsql
as $$
declare
  v_closed integer;
begin
  with closed as (
    update public.scd_structure_roles r
       set active = false,
           valid_to = case when r.valid_from is not null and r.valid_from > date '2026-10-17' then r.valid_from
                           else least(coalesce(r.valid_to, date '2026-10-17'), date '2026-10-17') end,
           updated_at = now()
     where r.organization_id = p_organization_id and r.active
       and r.team_id in (select t.id from public.scd_teams t where t.organization_id = p_organization_id and t.code = 'u18')
    returning r.organization_id, r.person_id, r.role_label
  ), events as (
    insert into public.scd_person_events (organization_id, person_id, event_type, event_date, reason, note)
    select c.organization_id, c.person_id, 'CAMBIO_RUOLO', date '2026-10-17',
           'U18 Élite ritirata (Direzione 17/10/2026)', 'r141: ruolo chiuso: ' || c.role_label
    from closed c
    returning 1
  )
  select count(*) into v_closed from events;
  return v_closed;
end;
$$;

do $do$
declare
  v_org uuid;
  v_seed jsonb;
  v_u18 integer;
begin
  select o.id into v_org from public.scd_organizations o where o.slug = 'scd-colicoderviese';
  if v_org is null then
    raise notice 'r141: organization scd-colicoderviese not found, organigram seed and U18 closure skipped';
    return;
  end if;
  -- Organigramma dichiarato dalla Direzione 17/10/2026 (row n = line of the private declaration file).
  -- keys = SHA-256 of the normalised "surname name" (and of it without the last given name for 3+ words).
  v_seed := pg_temp.scd_r141_seed(v_org, $seed$
[
  {"n":2,"team":"prima","label":"Mister","kind":"MISTER","area":null,"mode":"FULL","keys":["88e632ded6e5c6a3e88346bf0a746448daf8b791d5a0668c5c3d6936becec164"],"bornBefore":null,"review":false},
  {"n":3,"team":"prima","label":"Secondo allenatore","kind":"MISTER","area":null,"mode":"FULL","keys":["6e7d0228933d4c89df0b6228735d7f05af79cdd4e1513137d785d5ce08851d86"],"bornBefore":null,"review":false},
  {"n":4,"team":"prima","label":"Team manager","kind":"DIRIGENTE","area":null,"mode":"FULL","keys":["71f66fa4984ee14937b44b8d76c04c4c2118504a62417aee5afd842582ec94cf"],"bornBefore":null,"review":false},
  {"n":5,"team":"prima","label":"Preparatore atletico","kind":"STAFF","area":null,"mode":"FULL","keys":["0c904116866fad9ee12847531fad0a59d2b4a96598772a31dd5ba8b1dcc98991"],"bornBefore":null,"review":false},
  {"n":6,"team":"prima","label":"Preparatore portieri","kind":"STAFF","area":null,"mode":"FULL","keys":["ad83e3ea854a93d1ab29886706e7a5eddfc9177a7226394a275c01a649b7b875"],"bornBefore":null,"review":false},
  {"n":7,"team":"u19","label":"Mister","kind":"MISTER","area":null,"mode":"SURNAME","keys":["202225986848353e63e4ff54761073613d487acdfcbe5f6917017543cc1f54c7"],"bornBefore":null,"review":true},
  {"n":8,"team":"u19","label":"Secondo allenatore","kind":"MISTER","area":null,"mode":"FULL","keys":["1f203639fb8542ce5c53294808c18f0248ddcc1d5090c15b8a7f955d7ab3a716"],"bornBefore":null,"review":false},
  {"n":9,"team":"u19","label":"Dirigente accompagnatore","kind":"DIRIGENTE","area":null,"mode":"FULL","keys":["4511f60ddf2e0d388b78e123abd23879200346412dc06ad5beb28eb969965405"],"bornBefore":null,"review":false},
  {"n":10,"team":"u19","label":"Dirigente accompagnatore","kind":"DIRIGENTE","area":null,"mode":"FULL","keys":["3cf9f7ba2f1c8d33c9a6a88cbba5186b884d194b69b601a452e7228a5ab1f12e"],"bornBefore":null,"review":false},
  {"n":11,"team":"u16","label":"Mister","kind":"MISTER","area":null,"mode":"FULL","keys":["e533406dbbbd3c9d493e7d2cb9239061d112e0afe094bcef4a2c09c92f010190"],"bornBefore":null,"review":false},
  {"n":12,"team":"u16","label":"Secondo allenatore","kind":"MISTER","area":null,"mode":"FULL","keys":["510e3302ec4f4ab28d6854db648a12e11ead284d78ae99041a5c2d44b40183e6"],"bornBefore":null,"review":false},
  {"n":13,"team":"u15","label":"Mister","kind":"MISTER","area":null,"mode":"FULL","keys":["b1c43eecdc3c0e9134ba726b46551f5d33140f19637b5fffc3159b54ff35e094"],"bornBefore":null,"review":false},
  {"n":14,"team":"u15","label":"Secondo allenatore","kind":"MISTER","area":null,"mode":"SURNAME","keys":["01cb5c9a4afa48fb74a0eca872b6085c00916eca09a7f35b23163d434da48280"],"bornBefore":null,"review":true},
  {"n":15,"team":"u15","label":"Dirigente accompagnatore","kind":"DIRIGENTE","area":null,"mode":"FULL","keys":["68b5bdf22770b8887cb9a1ef872ccf2f480d34f9660cf54b5461cd3088588c06"],"bornBefore":null,"review":false},
  {"n":16,"team":"2014","label":"Mister","kind":"MISTER","area":null,"mode":"SURNAME","keys":["c564b5299484bc18cac31adc54dc7d2eb4a7a43612918f2db18e01323630e146"],"bornBefore":null,"review":true},
  {"n":17,"team":"2014","label":"Secondo allenatore","kind":"MISTER","area":null,"mode":"FULL","keys":["4de407d1356bebf8ef24028c99d19730a89d667dac057b601123b80ea403b5a9"],"bornBefore":null,"review":false},
  {"n":18,"team":"2015","label":"Mister","kind":"MISTER","area":null,"mode":"FULL","keys":["38e92d90148f4fb954d70b97be1e128ac95c1c33e7a822edc831647fd1f745c1","04a3b97776f00041936573e959ea86db0f94a2928ab7c60f004165b3a2527b98"],"bornBefore":null,"review":false},
  {"n":19,"team":"2015","label":"Secondo allenatore","kind":"MISTER","area":null,"mode":"FULL","keys":["96b80ba2d3096962d397dd2a3f641c6eea55cd169fefa08f7daaea845ebce8f4"],"bornBefore":null,"review":false},
  {"n":20,"team":"2015","label":"Dirigente accompagnatore","kind":"DIRIGENTE","area":null,"mode":"FULL","keys":["0eb4af0ddc3c9980274cb07ea1d408bce2ef2989f12e403dcd94e98b56050390"],"bornBefore":null,"review":false},
  {"n":21,"team":"pulcini","label":"Mister","kind":"MISTER","area":null,"mode":"FULL","keys":["4327449595ba52ea005e111f36f76ff52e4242741b9ef9822daeaa3a6cd8ac9d","98c48ac9d7c9b8c7a329d97451dc6c8efc0d791423a3f318ab9a7cd0785a1f34"],"bornBefore":null,"review":false},
  {"n":22,"team":"pulcini","label":"Secondo allenatore","kind":"MISTER","area":null,"mode":"FULL","keys":["3fd38566c4c24dec572b34151262186450e3fdde1beb82f801fa69409466e214"],"bornBefore":null,"review":false},
  {"n":23,"team":"primicalci","label":"Mister","kind":"MISTER","area":null,"mode":"FULL","keys":["1be537e74a23b1fe6f8a2eb16d261f81378dccfde4c20e9ba0386268bfa21e28","ae2773ae6fe746da06c0f9bac542f2ebb8ceb7102f5ae5e6ddc401c5d2b069d0"],"bornBefore":null,"review":false},
  {"n":24,"team":"primicalci","label":"Secondo allenatore","kind":"MISTER","area":null,"mode":"FULL","keys":["5803ededd092651d31ec7f6074bd74436a2ca8b52eb3dc93595036d4fc8b3434"],"bornBefore":null,"review":false},
  {"n":25,"team":"primicalci","label":"Dirigente accompagnatore","kind":"DIRIGENTE","area":null,"mode":"FULL","keys":["9b47f21c3b9888aa02925f3331f8a36a5c24c78d6324ced936a5447f33a677ca"],"bornBefore":null,"review":true},
  {"n":26,"team":"piccoliamici","label":"Mister","kind":"MISTER","area":null,"mode":"SURNAME","keys":["121224acd3bd0b816afe508ac0d628a41881c6a0772f1eb43015a6d11fd0bb05"],"bornBefore":null,"review":true},
  {"n":27,"team":"piccoliamici","label":"Secondo allenatore","kind":"MISTER","area":null,"mode":"FULL","keys":["3c92565755ce3ffa6792ab72be3ab95b957e02e3713c612dca980bc4d7711b05"],"bornBefore":null,"review":false},
  {"n":28,"team":null,"label":"Preparatore portieri Settore Giovanile","kind":"STAFF","area":"settore-giovanile","mode":"FULL","keys":["ae7559edc0dfe76c95a17fa59bd39777989e38d9b2325e678982e77828cd5047","b8d7e7439edb6c24ac2f16bd5d2289752a20fd447e7cc98b3fb9d7e4e04e3add"],"bornBefore":null,"review":false},
  {"n":29,"team":null,"label":"Massaggiatore","kind":"STAFF","area":"infermeria","mode":"FULL","keys":["0b359c0d3fa8f4b6217a48f22f3fa91f29d5cefbdf49bb838576c4801ceb4184","a537b1f5a8957cfc060f021ee91069876c7cda1c08454f2a8011bb3c07eb5e8b"],"bornBefore":null,"review":true},
  {"n":30,"team":null,"label":"Massaggiatore","kind":"STAFF","area":"infermeria","mode":"FULL","keys":["be2ff159ae70139976200df37b2eb40d750ebd8fb53812112ed9f0fd65b4e49d"],"bornBefore":null,"review":true},
  {"n":31,"team":null,"label":"Segreteria e responsabile da remoto","kind":"RESPONSABILE","area":"segreteria","mode":"FULL","keys":["3f51f1f112499774ad8069855136909e4071edf9ff18dd7cd333d86ed129f57c"],"bornBefore":null,"review":false},
  {"n":32,"team":null,"label":"Segreteria front office","kind":"STAFF","area":"segreteria","mode":"FULL","keys":["44f1538193073206cc54522671798429c69a039699fec3050452dfc4df0fc4c9"],"bornBefore":null,"review":false},
  {"n":33,"team":null,"label":"Responsabile Safeguarding (tutela minori)","kind":"RESPONSABILE","area":"safeguarding","mode":"FULL","keys":["d4d307e27a6d1bea9defff5ed065a435213e1314b3a9198d84abc34e43e047f5"],"bornBefore":null,"review":false},
  {"n":34,"team":null,"label":"Responsabile campi e manutenzione","kind":"RESPONSABILE","area":"campi","mode":"FULL","keys":["0db191ce111b8b5a0f1bcf331c64f0519f120baee67183e646549dd9f5203895"],"bornBefore":"1970-01-01","review":true},
  {"n":36,"team":null,"label":"Collaboratore pulizie e lavanderia","kind":"STAFF","area":"pulizie","mode":"FULL","keys":["3adc765da97249d1067e69a83311213b65a0cd2f8b69ba0dc584af37be122405"],"bornBefore":null,"review":false},
  {"n":37,"team":null,"label":"Collaboratore pulizie e lavanderia","kind":"STAFF","area":"pulizie","mode":"FULL","keys":["0fcb4af5ec027e80e3948401f8944aa28c4b78970fd437110c095a9e3c18501e"],"bornBefore":null,"review":false},
  {"n":38,"team":null,"label":"Responsabile bar e ristorante Club House Colico e Dervio","kind":"RESPONSABILE","area":"club-house","mode":"FULL","keys":["0bc766706d42c83f864351f2951cdc6df8e3b8493de8fbc6180c630a3cf3158f"],"bornBefore":null,"review":false},
  {"n":39,"team":null,"label":"Tesoreria","kind":"RESPONSABILE","area":"tesoreria","mode":"FULL","keys":["8f9ec293160357b7c2656ccad68defe056e4cf6fb550741cbd7457c3178120af"],"bornBefore":null,"review":false},
  {"n":40,"team":null,"label":"Biglietteria","kind":"STAFF","area":"biglietteria","mode":"FULL","keys":["44f1538193073206cc54522671798429c69a039699fec3050452dfc4df0fc4c9"],"bornBefore":null,"review":false},
  {"n":41,"team":null,"label":"Biglietteria","kind":"STAFF","area":"biglietteria","mode":"FULL","keys":["1526941b1efbce7fe0dc2cb247384f7c6b8f2e720d4499e9a83dc6210d5ff1aa"],"bornBefore":null,"review":false},
  {"n":42,"team":null,"label":"Addetta collaboratrice Club House","kind":"STAFF","area":"club-house","mode":"FULL","keys":["7dfd11057bf555f0557008c5b2bea1598a2544f0bf0eca3c1dcb7bc4372986de"],"bornBefore":null,"review":false},
  {"n":43,"team":null,"label":"Coordinatore attività sportive","kind":"RESPONSABILE","area":"coordinamento-sportivo","mode":"FULL","keys":["1f203639fb8542ce5c53294808c18f0248ddcc1d5090c15b8a7f955d7ab3a716"],"bornBefore":null,"review":false},
  {"n":44,"team":null,"label":"Responsabile attività di base","kind":"RESPONSABILE","area":"attivita-base","mode":"FULL","keys":["28a344a02a0659d218cf1ee99b43f8f25e6ee6d5a63b532c5f574ef0961b3ce0","e341e3666b9377a14964cb35886357dc065687901475806d4a3539264e702403"],"bornBefore":null,"review":false},
  {"n":45,"team":null,"label":"Responsabile area tecnica","kind":"RESPONSABILE","area":"area-tecnica","mode":"FULL","keys":["9f911ee87633bd0ace3ac4cbc7a03297482a16e5517562ed79adb50cde48aabb"],"bornBefore":null,"review":false},
  {"n":47,"team":null,"label":"Dirigente autista pulmini","kind":"AUTISTA","area":"pulmini","mode":"FULL","keys":["6baec6f5af8f2ca48e6f2d6723298a03b93c6ba05aa3db711820f34fd13865ec"],"bornBefore":null,"review":false},
  {"n":48,"team":null,"label":"Responsabile servizio pulmini","kind":"RESPONSABILE","area":"pulmini","mode":"FULL","keys":["1972c545c7cf21b20d153568fdca12e94b1c9fb0375543a77625670bc41b3eb4"],"bornBefore":null,"review":false},
  {"n":49,"team":null,"label":"Dirigente autista pulmini","kind":"AUTISTA","area":"pulmini","mode":"FULL","keys":["1972c545c7cf21b20d153568fdca12e94b1c9fb0375543a77625670bc41b3eb4"],"bornBefore":null,"review":false},
  {"n":50,"team":null,"label":"Dirigente autista pulmini","kind":"AUTISTA","area":"pulmini","mode":"FULL","keys":["1be537e74a23b1fe6f8a2eb16d261f81378dccfde4c20e9ba0386268bfa21e28","ae2773ae6fe746da06c0f9bac542f2ebb8ceb7102f5ae5e6ddc401c5d2b069d0"],"bornBefore":null,"review":false},
  {"n":51,"team":null,"label":"Dirigente autista pulmini","kind":"AUTISTA","area":"pulmini","mode":"FULL","keys":["c556030deebda21cb5b7733b531a633c2abcb597037e4a9b10096e2df89d8778"],"bornBefore":null,"review":false},
  {"n":52,"team":"u16","label":"Dirigente accompagnatore","kind":"DIRIGENTE","area":null,"mode":"FULL","keys":["e33c3944019c59d1673ce939d82414aebc81fee3055cbcbeb2034a1a6f308496"],"bornBefore":null,"review":false},
  {"n":53,"team":null,"label":"Dirigente responsabile arbitri","kind":"DIRIGENTE","area":"arbitri","mode":"FULL","keys":["7b32a96b9427614062a7e72761cad5082d77add72a1a574fbe20b8c00c4e5a5a"],"bornBefore":null,"review":false},
  {"n":54,"team":"pulcini","label":"Dirigente accompagnatore","kind":"DIRIGENTE","area":null,"mode":"FULL","keys":["7465142098a7ac1ab45026c9013ab1d4b8ae94e64c37659f1cf24bed5cacb905"],"bornBefore":null,"review":false},
  {"n":55,"team":null,"label":"Direttore Generale","kind":"ORGANO_SOCIETARIO","area":"direzione","mode":"FULL","keys":["b5a0b2ed9e963604fc041904f4cd257a9634fedb69913f450dd7f1fdc2bd6eac"],"bornBefore":null,"review":false},
  {"n":56,"team":null,"label":"Presidente","kind":"ORGANO_SOCIETARIO","area":"direzione","mode":"FULL","keys":["8cf3223119c1faa36040404283bfa8638eade339ad7d342633538637480657ea"],"bornBefore":null,"review":false},
  {"n":57,"team":null,"label":"Consigliere","kind":"ORGANO_SOCIETARIO","area":"direzione","mode":"FULL","keys":["cd5381dc263d4bbaae2f3095f982216e141dbd0ba16ddde566f0e12eb3cedb49"],"bornBefore":null,"review":false},
  {"n":58,"team":null,"label":"Vicepresidente","kind":"ORGANO_SOCIETARIO","area":"direzione","mode":"FULL","keys":["1f11c04bd8b92362a6041ac3352eb82fc63905fbc646704f7da92973be6b75f2"],"bornBefore":null,"review":false},
  {"n":59,"team":null,"label":"Direttore sportivo Prima Squadra e Juniores","kind":"ORGANO_SOCIETARIO","area":"direzione","mode":"FULL","keys":["8d8d9962f20b50be4e085ef1e206cfe48c27dd18afd8957bbab6d86adf63e286"],"bornBefore":null,"review":false},
  {"n":61,"team":null,"label":"Responsabile magazzino attrezzi","kind":"RESPONSABILE","area":"magazzino","mode":"FULL","keys":["0eb4af0ddc3c9980274cb07ea1d408bce2ef2989f12e403dcd94e98b56050390"],"bornBefore":null,"review":false},
  {"n":62,"team":null,"label":"Responsabile magazzino attrezzi","kind":"RESPONSABILE","area":"magazzino","mode":"FULL","keys":["3adc765da97249d1067e69a83311213b65a0cd2f8b69ba0dc584af37be122405"],"bornBefore":null,"review":false},
  {"n":63,"team":null,"label":"Responsabile magazzino abbigliamento e kit","kind":"RESPONSABILE","area":"magazzino","mode":"FULL","keys":["0bc766706d42c83f864351f2951cdc6df8e3b8493de8fbc6180c630a3cf3158f"],"bornBefore":null,"review":true},
  {"n":64,"team":null,"label":"Responsabile magazzino abbigliamento e kit","kind":"RESPONSABILE","area":"magazzino","mode":"FULL","keys":["44f1538193073206cc54522671798429c69a039699fec3050452dfc4df0fc4c9"],"bornBefore":null,"review":true},
  {"n":65,"team":null,"label":"Responsabile palestra","kind":"RESPONSABILE","area":"palestra","mode":"FULL","keys":["0c904116866fad9ee12847531fad0a59d2b4a96598772a31dd5ba8b1dcc98991"],"bornBefore":null,"review":false},
  {"n":66,"team":null,"label":"Responsabile calendari, quadro settimanale e rotazione campi","kind":"RESPONSABILE","area":"calendari","mode":"FULL","keys":["28a344a02a0659d218cf1ee99b43f8f25e6ee6d5a63b532c5f574ef0961b3ce0","e341e3666b9377a14964cb35886357dc065687901475806d4a3539264e702403"],"bornBefore":null,"review":false},
  {"n":67,"team":null,"label":"Responsabile calendari, quadro settimanale e rotazione campi","kind":"RESPONSABILE","area":"calendari","mode":"FULL","keys":["1f203639fb8542ce5c53294808c18f0248ddcc1d5090c15b8a7f955d7ab3a716"],"bornBefore":null,"review":false},
  {"n":68,"team":null,"label":"Responsabile calendari, quadro settimanale e rotazione campi","kind":"RESPONSABILE","area":"calendari","mode":"FULL","keys":["b5a0b2ed9e963604fc041904f4cd257a9634fedb69913f450dd7f1fdc2bd6eac"],"bornBefore":null,"review":false},
  {"n":70,"team":null,"label":"Responsabile sponsor e stampa","kind":"RESPONSABILE","area":"sponsor","mode":"FULL","keys":["b5a0b2ed9e963604fc041904f4cd257a9634fedb69913f450dd7f1fdc2bd6eac"],"bornBefore":null,"review":false},
  {"n":71,"team":null,"label":"Responsabile sponsor e stampa","kind":"RESPONSABILE","area":"sponsor","mode":"FULL","keys":["8cf3223119c1faa36040404283bfa8638eade339ad7d342633538637480657ea"],"bornBefore":null,"review":false},
  {"n":72,"team":null,"label":"Responsabile sponsor e stampa","kind":"RESPONSABILE","area":"sponsor","mode":"FULL","keys":["cd5381dc263d4bbaae2f3095f982216e141dbd0ba16ddde566f0e12eb3cedb49"],"bornBefore":null,"review":false},
  {"n":73,"team":null,"label":"Segretario verbalizzatore","kind":"ORGANO_SOCIETARIO","area":"direzione","mode":"FULL","keys":["8f9ec293160357b7c2656ccad68defe056e4cf6fb550741cbd7457c3178120af"],"bornBefore":null,"review":false},
  {"n":75,"team":null,"label":"Responsabile eventi e tornei","kind":"RESPONSABILE","area":"tornei","mode":"FULL","keys":["b5a0b2ed9e963604fc041904f4cd257a9634fedb69913f450dd7f1fdc2bd6eac"],"bornBefore":null,"review":false},
  {"n":76,"team":null,"label":"Responsabile acquisti e magazzino acquisti","kind":"RESPONSABILE","area":"acquisti","mode":"FULL","keys":["b5a0b2ed9e963604fc041904f4cd257a9634fedb69913f450dd7f1fdc2bd6eac"],"bornBefore":null,"review":false},
  {"n":77,"team":null,"label":"Responsabile acquisti e magazzino acquisti","kind":"RESPONSABILE","area":"acquisti","mode":"FULL","keys":["8cf3223119c1faa36040404283bfa8638eade339ad7d342633538637480657ea"],"bornBefore":null,"review":false},
  {"n":78,"team":null,"label":"Responsabile acquisti e magazzino acquisti","kind":"RESPONSABILE","area":"acquisti","mode":"FULL","keys":["0bc766706d42c83f864351f2951cdc6df8e3b8493de8fbc6180c630a3cf3158f"],"bornBefore":null,"review":false},
  {"n":79,"team":null,"label":"Responsabile rapporti con altre società e affiliazioni","kind":"RESPONSABILE","area":"affiliazioni","mode":"FULL","keys":["28a344a02a0659d218cf1ee99b43f8f25e6ee6d5a63b532c5f574ef0961b3ce0","e341e3666b9377a14964cb35886357dc065687901475806d4a3539264e702403"],"bornBefore":null,"review":false},
  {"n":80,"team":null,"label":"Responsabile rapporti con altre società e affiliazioni","kind":"RESPONSABILE","area":"affiliazioni","mode":"FULL","keys":["1f203639fb8542ce5c53294808c18f0248ddcc1d5090c15b8a7f955d7ab3a716"],"bornBefore":null,"review":false},
  {"n":81,"team":null,"label":"Responsabile rapporti con altre società e affiliazioni","kind":"RESPONSABILE","area":"affiliazioni","mode":"FULL","keys":["b5a0b2ed9e963604fc041904f4cd257a9634fedb69913f450dd7f1fdc2bd6eac"],"bornBefore":null,"review":false},
  {"n":82,"team":null,"label":"Responsabile organizzazione iniziative FIGC e affiliazioni","kind":"RESPONSABILE","area":"affiliazioni","mode":"FULL","keys":["28a344a02a0659d218cf1ee99b43f8f25e6ee6d5a63b532c5f574ef0961b3ce0","e341e3666b9377a14964cb35886357dc065687901475806d4a3539264e702403"],"bornBefore":null,"review":false},
  {"n":83,"team":null,"label":"Responsabile organizzazione iniziative FIGC e affiliazioni","kind":"RESPONSABILE","area":"affiliazioni","mode":"FULL","keys":["b5a0b2ed9e963604fc041904f4cd257a9634fedb69913f450dd7f1fdc2bd6eac"],"bornBefore":null,"review":false},
  {"n":84,"team":null,"label":"Responsabile organizzazione iniziative FIGC e affiliazioni","kind":"RESPONSABILE","area":"affiliazioni","mode":"FULL","keys":["1f203639fb8542ce5c53294808c18f0248ddcc1d5090c15b8a7f955d7ab3a716"],"bornBefore":null,"review":false},
  {"n":87,"team":null,"label":"Tuttofare struttura","kind":"STAFF","area":"campi","mode":"FULL","keys":["513a89bb9f6b2b387e55daf86c6d57bd8f2dbae1cbc3d1f6b7337084d5dc8293"],"bornBefore":null,"review":false}
]$seed$::jsonb, 'DIREZIONE_2026-10-17');
  v_u18 := pg_temp.scd_r141_close_u18(v_org);
  raise notice 'r141 organigram seed: %', v_seed;
  raise notice 'r141 U18 Élite staff roles closed: %', v_u18;
end;
$do$;

drop function if exists pg_temp.scd_r141_close_u18(uuid);
drop function if exists pg_temp.scd_r141_seed(uuid, jsonb, text);
drop function if exists pg_temp.scd_r141_key(text);

commit;
