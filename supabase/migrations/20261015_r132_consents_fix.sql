-- r132: fix public.scd_person_consents (created in r59) — consent types already read by the code, and re-grant after
-- a revoke (2026-10-15, chat PC range r130-r149). STAGED: NOT APPLIED.
-- Apply only after Francesco writes "applica r132". Requires r59 (scd_person_consents, scd_people) already applied.
--
-- Why (compliance review 15/10/2026, two VERIFIED defects in the repository):
--   1. The CHECK on consent_type accepts only the r59 types, but r90 (Top 11, scd week votes) reads
--      consent_type = 'IMMAGINE_NOME' and r95 (comm hub, e-mail opt-out) reads consent_type = 'COMM_EMAIL'.
--      No row with those types can be stored today, so those checks can never find a consent: the Top 11 shows only
--      adults and an e-mail opt-out cannot be recorded. Added also PRESA_VISIONE_INFORMATIVA (privacy notice read)
--      and PRESA_VISIONE_AUTISTA (minibus driver rules read). All r59 values are kept.
--   2. unique (person_id, consent_type, policy_version) blocks a new choice after a revoke under the same policy
--      version (the revoked row still holds the key). Replaced by a partial unique index "one active choice":
--      unique (person_id, consent_type) where revoked_at is null. History rows (revoked) stay, unlimited.
--      Before the swap the migration counts rows that would violate the new index and raises with COUNTS ONLY
--      (no ids, no names), so the transaction is rolled back and nothing changes.
--   3. New nullable columns for the audit trail of who gave/revoked a consent and how:
--      given_by_role ('SELF','GUARDIAN','TUTOR'), channel ('APP','MODULO_ONLINE','CARTA','IMPORT'),
--      revoked_by_person_id -> scd_people(id).
--
-- Engines: PERSONE (families can give, revoke and give again a consent; minors' names in the Top 11 only with a
-- recorded guardian consent) and TEMPO (no manual workaround by the Segreteria for re-grants).
-- Measure: after apply, count of IMMAGINE_NOME / COMM_EMAIL rows (today structurally 0) and of re-grants
-- (rows per person/type with at least one revoked predecessor); zero failed inserts on the consent check.
--
-- No data changes, no new grants, no new or widened RLS policies. Idempotent: re-running is a no-op.
--
-- Rollback (works only while no row uses the new types and no person/type/version has a revoked + re-granted pair):
--   begin;
--   drop index if exists public.scd_person_consents_one_active_uidx;
--   alter table public.scd_person_consents drop column if exists revoked_by_person_id,
--     drop column if exists channel, drop column if exists given_by_role;
--   alter table public.scd_person_consents drop constraint if exists scd_person_consents_consent_type_check;
--   alter table public.scd_person_consents add constraint scd_person_consents_consent_type_check check (consent_type in (
--     'IMMAGINI_ISTITUZIONALI','COMUNICAZIONI_PROMOZIONALI','PULMINO_SERVIZIO','USCITA_AUTONOMA','AVATAR_APP','FOTO_PARTITA_APP'));
--   alter table public.scd_person_consents add constraint scd_person_consents_person_id_consent_type_policy_version_key
--     unique (person_id, consent_type, policy_version);
--   commit;

begin;

-- ---------------------------------------------------------------- 1. consent types
-- Drop every CHECK constraint on scd_person_consents that mentions consent_type, whatever its live name
-- (r59 used an inline check, default name scd_person_consents_consent_type_check), then add the extended one.
do $$
declare
  c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    where con.conrelid = 'public.scd_person_consents'::regclass
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%consent_type%'
  loop
    execute format('alter table public.scd_person_consents drop constraint %I', c.conname);
  end loop;
end
$$;

alter table public.scd_person_consents
  add constraint scd_person_consents_consent_type_check check (consent_type in (
    'IMMAGINI_ISTITUZIONALI','COMUNICAZIONI_PROMOZIONALI','PULMINO_SERVIZIO','USCITA_AUTONOMA','AVATAR_APP','FOTO_PARTITA_APP',
    'IMMAGINE_NOME','COMM_EMAIL','PRESA_VISIONE_INFORMATIVA','PRESA_VISIONE_AUTISTA'
  ));

-- ---------------------------------------------------------------- 2. one active choice per person and type
do $$
declare
  v_groups bigint;
  v_rows bigint;
  c record;
begin
  select count(*), coalesce(sum(n), 0)
    into v_groups, v_rows
  from (
    select count(*) as n
    from public.scd_person_consents
    where revoked_at is null
    group by person_id, consent_type
    having count(*) > 1
  ) d;

  if v_groups > 0 then
    raise exception 'r132 aborted: % person/consent_type pairs (% rows) have more than one active (not revoked) consent; resolve them before applying',
      v_groups, v_rows;
  end if;

  -- Drop the r59 unique (person_id, consent_type, policy_version), whatever its live name.
  for c in
    select con.conname
    from pg_constraint con
    where con.conrelid = 'public.scd_person_consents'::regclass
      and con.contype = 'u'
      and (
        select array_agg(att.attname::text order by att.attname)
        from unnest(con.conkey) k(attnum)
        join pg_attribute att on att.attrelid = con.conrelid and att.attnum = k.attnum
      ) = array['consent_type','person_id','policy_version']
  loop
    execute format('alter table public.scd_person_consents drop constraint %I', c.conname);
  end loop;
end
$$;

create unique index if not exists scd_person_consents_one_active_uidx
  on public.scd_person_consents (person_id, consent_type)
  where revoked_at is null;

-- ---------------------------------------------------------------- 3. audit columns (nullable, no backfill)
alter table public.scd_person_consents
  add column if not exists given_by_role text
    constraint scd_person_consents_given_by_role_check check (given_by_role in ('SELF','GUARDIAN','TUTOR')),
  add column if not exists channel text
    constraint scd_person_consents_channel_check check (channel in ('APP','MODULO_ONLINE','CARTA','IMPORT')),
  add column if not exists revoked_by_person_id uuid
    constraint scd_person_consents_revoked_by_person_id_fkey references public.scd_people(id) on delete set null;

comment on index public.scd_person_consents_one_active_uidx is
  'r132: one active (not revoked) choice per person and consent type; revoked rows are history.';
comment on column public.scd_person_consents.given_by_role is 'r132: SELF, GUARDIAN (parent of a minor) or TUTOR.';
comment on column public.scd_person_consents.channel is 'r132: APP, MODULO_ONLINE, CARTA or IMPORT.';
comment on column public.scd_person_consents.revoked_by_person_id is 'r132: person who revoked the consent.';

commit;
