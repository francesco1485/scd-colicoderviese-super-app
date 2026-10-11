-- SCD Super App · identity elevator activation (UD-054)
-- Run in the Supabase SQL editor of project ndevtxxijbcnskgysdit AFTER the migrations r33–r59.
-- Idempotent: safe to run twice. Replace the two placeholders before running.
--
--   :director_email  → the e-mail the Direttore will use to log in (same as in Authentication → Users)
--
-- 0) Organization bootstrap (r35 trigger expects slug 'scd-colicoderviese').
insert into public.scd_organizations (slug, name)
values ('scd-colicoderviese', 'S.C.D. ColicoDerviese')
on conflict (slug) do nothing;

-- 1) Check that the schema is at r59 (all three must return true).
select
  to_regclass('public.scd_structure_roles') is not null as r59_structure_roles,
  to_regclass('public.scd_person_events') is not null   as r59_person_events,
  exists (select 1 from pg_proc where proname = 'scd_person_mark_left') as r59_mark_left;

-- 2) Give the Direttore the DIRECTION role.
--    The user must exist first: Authentication → Users → "Add user" (or "Invite") with :director_email.
--    The r35 trigger already created a USER_BASE membership; this upgrades it.
insert into public.scd_memberships (organization_id, user_id, role, scope, active)
select o.id, u.id, 'DIRECTION'::public.scd_role, '{"positions":["presidente","direttore-generale"]}'::jsonb, true
from public.scd_organizations o
join auth.users u on lower(u.email) = lower(':director_email')
where o.slug = 'scd-colicoderviese'
on conflict (organization_id, user_id) do update
  set role = excluded.role, scope = excluded.scope, active = true, updated_at = now();

-- 3) Verify: one row, role DIRECTION.
select u.email, m.role, m.scope, m.active
from public.scd_memberships m
join auth.users u on u.id = m.user_id
join public.scd_organizations o on o.id = m.organization_id
where o.slug = 'scd-colicoderviese' and lower(u.email) = lower(':director_email');

-- 4) Secretariat later: same statement with 'SECRETARIAT' and scope '{"positions":["segreteria"]}'.
-- 5) Transport manager / drivers: role 'STAFF' with scope '{"positions":["responsabile-trasporti"]}' or '["autista"]'.
