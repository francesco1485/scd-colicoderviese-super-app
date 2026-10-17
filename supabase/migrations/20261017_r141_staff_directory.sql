-- r141: staff directory with role-based visibility, phone-sharing consent and the 2026/27 organigram, 2026-10-17,
-- chat PC (range r130-r149).
-- STAGED: NOT APPLIED. Apply only after Francesco writes "applica r141". Never apply from an agent.
-- Target: SCD PULSE (ndevtxxijbcnskgysdit). Never on dfnwzwutvnwiitiffwvr.
-- Requires r132 (scd_person_consents one-active index and audit columns), APPLIED on SCD PULSE 15/10/2026 (coordinator,
-- 17/10/2026). The guard below still stops the migration when r132 or one of the r33 / r59 / r61 / r65_1 / r74 objects
-- is missing (fresh environments).
--
-- HOW TO APPLY (the organigram names are NOT in this public repository):
--   run, in ONE execution / session, first the private seed file kept outside git
--   (scratchpad annate/r141_seed_private.sql, generated from organigramma_dichiarato.csv: it creates and fills the
--   session table pg_temp.r141_seed), then this migration. Without the private table the migration applies everything
--   else, skips the organigram seed with a NOTICE and can be re-run later with the seed (idempotent).
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
--      is an adult and a number exists. Caller adult = office or staff role, or a linked person with a KNOWN birth
--      date of 18+; unknown age = minor = no numbers. Staff who are minors are never listed. USER_BASE gets null.
--   5. scd_set_my_phone_share(org, share): the staff member's own answer, written as a new consent row (the previous
--      active one is revoked, history kept, given_by_role SELF, channel APP).
--   6. scd_person_phone(org, person): phone for the office roles only (DIRECTION, SECRETARIAT, REGISTRATION, same
--      as the r63 people policy), used by /segreteria/persone after the column hardening below; every read is
--      written to scd_audit_events (action PHONE_READ, ids only, never the number).
--   7. RLS (rule 1): the staff branch of scd_people_select_member (r63_1) is NARROWED from "every adult with a
--      structure role" to the people of scd_staff_visible_person_ids; office and own-family branches unchanged.
--      Column grants after 8 (documented on the column): authenticated reads every scd_people column except phone,
--      every scd_structure_roles column except contact_phone; row policies unchanged; anon nothing.
--   8. Column hardening (rule 3): authenticated loses SELECT on scd_people.phone (every other column stays
--      readable as before, the row policy still applies). Phones are read only through 4 (with consent) and 6 (office).
--      The unused view scd_v_people_active (select p.*) can no longer be read by authenticated: no app code uses it.
--   9. Seed of the organigram 2026/27 declared by the Direzione 17/10/2026 (names, roles, teams, NO phones), read at
--      apply time from the private session table pg_temp.r141_seed (never committed; dropped at the end). Only ACTIVE
--      adult people of the club, exactly one match of the normalised full name or the row is skipped and reported
--      (row numbers and reasons only). Surname-only rows match only a person who already holds a structure role.
--      FAIL CLOSED: every row declared with a doubt (surname only, inferred person, homonym, "squadre da confermare")
--      is inserted INACTIVE with needs_review = true, so it grants no roster, call-up or directory access until the
--      Direzione confirms it in the gestionale. An existing role of the same person on the same team and kind (or the
--      same club label, or the same seed row) is left untouched. Names "da confermare" and "Contatti esterni" rows
--      are not in the private seed (GROW CRM follow-up).
--  11. scd_my_team_ids (r65_1 text) and the public staff view scd_v_structure_public (r59) ignore needs_review roles.
--  12. Column hardening also for the legacy duplicate scd_structure_roles.contact_phone (not readable by
--      authenticated); anon keeps no privilege on scd_people.
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
--   grant select on public.scd_structure_roles to authenticated;
--   -- r65_1 scd_my_team_ids and r59 scd_v_structure_public: re-run their original text
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
     or to_regclass('public.scd_audit_events') is null
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
    select r.id, r.team_id, r.area_id, coalesce(r.needs_review, false) as review
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
     or (not r.review and ctx.staff and (
           (r.team_id is not null and r.team_id in (select id from staff_teams))
           or (r.team_id is null and r.area_id = any(public.scd_staff_club_areas()))))
     or (not r.review and ctx.member and (
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
  v_office := public.scd_staff_office(p_organization_id);
  v_staff := public.scd_has_org_role(p_organization_id, array['MISTER','STAFF','MANAGER','TOURNAMENTS','REGISTRATION']::public.scd_role[])
    or exists (
      select 1 from public.scd_structure_roles r
      where r.organization_id = p_organization_id and r.active and (r.valid_to is null or r.valid_to >= current_date)
        and r.person_id in (select public.scd_my_person_ids(p_organization_id))
    );
  -- Adult caller (no 1:1 adult-minor contact): office or staff role, or a linked person with a KNOWN birth date of 18+,
  -- and never a caller bound to a minor. Unknown age = minor = no numbers.
  v_adult := not exists (
      select 1 from public.scd_people p
      where p.id in (select public.scd_my_person_ids(p_organization_id))
        and coalesce(public.scd_is_minor(p.birth_date), false)
    )
    and (
      v_office or v_staff
      or exists (
        select 1 from public.scd_people p
        where p.id in (select public.scd_my_person_ids(p_organization_id))
          and p.birth_date is not null and public.scd_is_minor(p.birth_date) = false
      )
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
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_phone text;
begin
  if not public.scd_has_org_role(p_organization_id, array['DIRECTION','SECRETARIAT','REGISTRATION']::public.scd_role[]) then
    return null;
  end if;
  select p.phone into v_phone from public.scd_people p
  where p.id = p_person_id and p.organization_id = p_organization_id;
  if not found then
    return null;
  end if;
  -- Every office read is traced (ids only, never the number), like CONTATTO_LETTO in r139.
  insert into public.scd_audit_events (organization_id, actor_user_id, action, entity_type, entity_id, payload)
  values (p_organization_id, (select auth.uid()), 'PHONE_READ', 'scd_people', p_person_id,
          jsonb_build_object('source', 'r141', 'hasPhone', v_phone is not null));
  return v_phone;
end;
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
  select string_agg(quote_ident(c.column_name), ', ' order by c.ordinal_position) into v_cols
  from information_schema.columns c
  where c.table_schema = 'public' and c.table_name = 'scd_structure_roles' and c.column_name <> 'contact_phone';
  execute 'revoke select on public.scd_structure_roles from authenticated';
  execute format('grant select (%s) on public.scd_structure_roles to authenticated', v_cols);
end;
$$;
revoke all on public.scd_people from anon;
revoke all on public.scd_structure_roles from anon;
comment on column public.scd_people.phone is
  'r141: not readable by authenticated (column grant). Read through scd_staff_directory (consent, rule 1) or scd_person_phone (office, audited).';
comment on column public.scd_structure_roles.contact_phone is
  'r141: legacy duplicate, not readable by authenticated; the phone lives once on scd_people.phone.';

-- ---------------------------------------------------------------- 11. roles "da confermare" grant nothing
-- scd_my_team_ids: r65_1 text, plus "not needs_review" on the two structure-role branches.
create or replace function public.scd_my_team_ids(p_organization_id uuid)
returns setof uuid
language sql
stable
security definer
set search_path to 'public'
as $$
  with me as (
    select m.scope from public.scd_memberships m
    where m.organization_id = p_organization_id and m.user_id = (select auth.uid()) and m.active
  )
  select t.id
  from public.scd_teams t
  where t.organization_id = p_organization_id
    and (
      public.scd_has_org_role(p_organization_id, array['DIRECTION','SECRETARIAT','REGISTRATION']::public.scd_role[])
      or exists (select 1 from me where coalesce(me.scope->'positions', '[]'::jsonb) ? 'coordinatore-attivita-sportiva')
      or exists (select 1 from me where coalesce(me.scope->'teams', '[]'::jsonb) ? t.code)
      or exists (
        select 1 from public.scd_structure_roles r
        where r.organization_id = p_organization_id and r.active and r.role_kind = 'RESPONSABILE'
          and r.area_id = 'coordinamento-sportivo' and (r.valid_to is null or r.valid_to >= current_date)
          and not coalesce(r.needs_review, false)
          and r.person_id in (select public.scd_my_person_ids(p_organization_id))
      )
      or exists (
        select 1 from public.scd_structure_roles r
        where r.team_id = t.id and r.active and r.role_kind in ('MISTER','DIRIGENTE','STAFF','RESPONSABILE')
          and (r.valid_to is null or r.valid_to >= current_date)
          and not coalesce(r.needs_review, false)
          and r.person_id in (select public.scd_my_person_ids(p_organization_id))
      )
    );
$$;
revoke all on function public.scd_my_team_ids(uuid) from public, anon;
grant execute on function public.scd_my_team_ids(uuid) to authenticated;

-- Public "omini" view (r59 text, same columns): roles "da confermare" are not shown.
create or replace view public.scd_v_structure_public
with (security_invoker = true) as
  select s.id, s.organization_id, s.display_name, s.role_label, s.role_kind, s.team_code, s.team_name, s.area_id
  from public.scd_v_structure_active s
  join public.scd_people p on p.id = s.person_id
  where s.show_in_app = true
    and coalesce(public.scd_is_minor(p.birth_date), false) = false
    and not exists (select 1 from public.scd_structure_roles x where x.id = s.id and x.needs_review);

-- ---------------------------------------------------------------- 9-10. organigram 2026/27 and U18 closure
-- Session-only helpers (pg_temp): they disappear with the session, nothing callable stays in the database.
create or replace function pg_temp.scd_r141_key(p_text text)
returns text
language sql
immutable
as $$
  select regexp_replace(lower(translate(coalesce(p_text, ''),
    'ÀÁÂÄÃÈÉÊËÌÍÎÏÒÓÔÖÕÙÚÛÜÇÑàáâäãèéêëìíîïòóôöõùúûüçñ',
    'aaaaaeeeeiiiiooooouuuucnaaaaaeeeeiiiiooooouuuucn')), '[^a-z]', '', 'g');
$$;

create or replace function pg_temp.scd_r141_seed(p_organization_id uuid, p_rows jsonb, p_source text)
returns jsonb
language plpgsql
as $$
declare
  r jsonb;
  v_keys text[];
  v_words text[];
  v_review boolean;
  v_season uuid;
  v_team uuid;
  v_person uuid;
  v_n integer;
  v_inserted integer := 0;
  v_inactive integer := 0;
  v_present integer := 0;
  v_skipped jsonb := '[]'::jsonb;
begin
  select s.id into v_season from public.scd_seasons s
  where s.organization_id = p_organization_id and s.active
  order by s.starts_on desc limit 1;

  for r in select value from jsonb_array_elements(p_rows) loop
    -- Full name, and without the last given name for 3+ words ("Surname Name Second" -> "Surname Name").
    v_words := regexp_split_to_array(btrim(coalesce(r ->> 'person', '')), '\s+');
    v_keys := array[pg_temp.scd_r141_key(r ->> 'person')];
    if coalesce(array_length(v_words, 1), 0) >= 3 then
      v_keys := v_keys || pg_temp.scd_r141_key(array_to_string(v_words[1:array_length(v_words, 1) - 1], ' '));
    end if;
    if coalesce(pg_temp.scd_r141_key(r ->> 'person'), '') = '' then
      v_skipped := v_skipped || jsonb_build_object('n', r -> 'n', 'reason', 'NO_NAME');
      continue;
    end if;
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
    ) or exists (
      select 1 from public.scd_structure_roles x
      where x.organization_id = p_organization_id and x.person_id = v_person and x.source_record_id = 'r141:' || (r ->> 'n')
    ) then
      v_present := v_present + 1;
      continue;
    end if;

    -- FAIL CLOSED: a row declared with a doubt is stored inactive and "da confermare": no access until confirmed.
    v_review := coalesce((r ->> 'review')::boolean, false) or r ->> 'mode' = 'SURNAME';
    insert into public.scd_structure_roles
      (organization_id, person_id, season_id, role_label, role_kind, team_id, area_id, show_in_app,
       valid_from, active, source_id, source_record_id, needs_review)
    values
      (p_organization_id, v_person, v_season, r ->> 'label', r ->> 'kind', v_team, r ->> 'area', true,
       date '2026-10-17', not v_review, p_source, 'r141:' || (r ->> 'n'), v_review);
    insert into public.scd_person_events (organization_id, person_id, event_type, event_date, reason, note)
    values (p_organization_id, v_person, 'CAMBIO_RUOLO', date '2026-10-17',
            'Organigramma 2026/27 dichiarato dalla Direzione',
            'r141: ' || (r ->> 'label') || case when v_review then ' (da confermare, non attivo)' else '' end);
    v_inserted := v_inserted + 1;
    if v_review then
      v_inactive := v_inactive + 1;
    end if;
  end loop;

  return jsonb_build_object('rows', jsonb_array_length(p_rows), 'inserted', v_inserted, 'insertedInactive', v_inactive,
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
  v_rows jsonb;
  v_u18 integer;
begin
  select o.id into v_org from public.scd_organizations o where o.slug = 'scd-colicoderviese';
  if v_org is null then
    raise notice 'r141: organization scd-colicoderviese not found, organigram seed and U18 closure skipped';
    return;
  end if;
  -- Organigram declared by the Direzione 17/10/2026, from the private session table (row n = line of the private
  -- declaration file). Not in this repository.
  if to_regclass('pg_temp.r141_seed') is null then
    raise notice 'r141: private seed pg_temp.r141_seed not loaded, organigram seed skipped (re-run with it)';
    v_seed := null;
  else
    execute 'select coalesce(jsonb_agg(to_jsonb(s) order by s.n), ''[]''::jsonb) from pg_temp.r141_seed s' into v_rows;
    v_seed := pg_temp.scd_r141_seed(v_org, v_rows, 'DIREZIONE_2026-10-17');
  end if;
  v_u18 := pg_temp.scd_r141_close_u18(v_org);
  raise notice 'r141 organigram seed: %', v_seed;
  raise notice 'r141 U18 Élite staff roles closed: %', v_u18;
end;
$do$;

drop function if exists pg_temp.scd_r141_close_u18(uuid);
drop function if exists pg_temp.scd_r141_seed(uuid, jsonb, text);
drop function if exists pg_temp.scd_r141_key(text);
drop table if exists pg_temp.r141_seed;

commit;
