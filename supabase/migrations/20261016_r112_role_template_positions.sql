-- r112: link role templates (r111) to the organigram positions (r138). 2026-10-16, chat cloud (squad deleghe).
-- APPLIED on SCD PULSE (ndevtxxijbcnskgysdit) 17/10/2026 ~00:00 after Francesco «ok ruoli - applica r112 - applica r113» (16/10 23:58). Never on dfnwzwutvnwiitiffwvr.
-- Target: SCD PULSE (ndevtxxijbcnskgysdit).
-- Requires r111 (scd_role_templates, scd_is_role_creator) and r138 (scd_position_catalog), both VERIFIED applied on
-- SCD PULSE 16/10/2026 by read-only SELECTs (r111 function bodies byte-identical to 20261015_r111_role_templates.sql;
-- r138: 118 positions, 0 held, 0 role templates). A guard below stops the migration when one of them is missing.
--
-- Why: Francesco 15/10/2026 (claude/SCD_DELEGHE_DECISIONI_2026-10-15.md) — roles are created per platform, always
-- possible empty, only by the Presidente and the Direttore Generale; 16/10/2026 13:35 (r138) — every organigram
-- position is ready to receive a tesserato. The two lists must not drift apart or be duplicated: a role template
-- (WHAT a person sees) can name the organigram position (WHO it is meant for). Nothing else.
--
-- What it adds:
--   1. scd_role_templates.position_code (nullable): the organigram position a role is meant for. Composite FK to
--      scd_position_catalog (organization_id, code), so it can only name a position of the same club. Every existing
--      template keeps null: nothing is linked or changed.
--   2. scd_set_role_template_position(org, template, position_code, note) -> boolean (true = changed): only the
--      Presidente or the Direttore Generale (r111 scd_is_role_creator); the template must be active; a new link only to
--      an ACTIVE position (a PROPOSED custom position waits for approval); null removes the link. Audited CHANGE_ROLE
--      with position_before / position.
--   3. Hardening of the r111 creator guards: a structure role whose position_code is 'presidente' or
--      'direttore-generale' (r138 column) is protected like the role_label "Presidente" / "Direttore Generale": only a
--      creator or the service role adds, changes, closes or links it. The creator rule itself (scd_is_role_creator,
--      role_label) is unchanged.
--
-- What it does NOT do: the link opens nothing and grants nothing. It is a suggestion shown when the Direzione loads a
-- role on a person ("Carica un ruolo"): the role's sections still arrive as yellow proposals, with the person's own
-- teams or site, saved only through r100 scd_set_person_grants and the r111 base-access trigger. Holding a position
-- (scd_structure_roles.position_code) never gives access by itself, and the creator rule of r111 stays on role_label.
--
-- Security: no new table, no new grant on tables; written only through the SECURITY DEFINER function with fixed
-- search_path and an explicit creator check; anon cannot execute it. No personal data.
--
-- Additive and idempotent (add column if not exists / create or replace). Existing rows are never updated.
--
-- Rollback (only on Francesco's explicit order; the links are lost, templates and grants are untouched):
--   begin;
--   -- re-run sections 6b of 20261015_r111_role_templates.sql (r111 text of the two guards), then:
--   drop function if exists public.scd_is_creator_position(text);
--   drop function if exists public.scd_set_role_template_position(uuid, uuid, text, text);
--   alter table public.scd_role_templates drop constraint if exists scd_role_templates_position_fk;
--   drop index if exists public.scd_role_templates_position_idx;
--   alter table public.scd_role_templates drop column if exists position_code;
--   commit;

begin;

-- 0. Prerequisites (fail closed).
do $$
begin
  if to_regclass('public.scd_role_templates') is null
     or to_regclass('public.scd_position_catalog') is null
     or to_regclass('public.scd_access_audit') is null
     or to_regprocedure('public.scd_is_role_creator(uuid)') is null then
    raise exception 'r112 prerequisites missing (r111, r138)';
  end if;
end;
$$;

-- 1. The position a role is meant for.
alter table public.scd_role_templates add column if not exists position_code text;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'scd_role_templates_position_fk') then
    alter table public.scd_role_templates add constraint scd_role_templates_position_fk
      foreign key (organization_id, position_code) references public.scd_position_catalog (organization_id, code);
  end if;
end;
$$;
create index if not exists scd_role_templates_position_idx
  on public.scd_role_templates (organization_id, position_code) where position_code is not null;
comment on column public.scd_role_templates.position_code is
  'r112: organigram position (r138 scd_position_catalog) this role is meant for. A suggestion only: opens and grants nothing.';

-- 2. Link / unlink (Presidente / Direttore Generale only).
create or replace function public.scd_set_role_template_position(
  p_organization_id uuid, p_template_id uuid, p_position_code text, p_note text
)
returns boolean
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_t public.scd_role_templates%rowtype;
  v_code text := nullif(btrim(coalesce(p_position_code, '')), '');
  v_status text;
begin
  if not public.scd_is_role_creator(p_organization_id) then
    raise exception 'roles: Presidente or Direttore Generale only' using errcode = '42501';
  end if;
  select * into v_t from public.scd_role_templates
  where id = p_template_id and organization_id = p_organization_id for update;
  if not found then raise exception 'role not found' using errcode = 'P0002'; end if;
  if not v_t.active then raise exception 'role is not active' using errcode = '22023'; end if;
  if v_t.position_code is not distinct from v_code then return false; end if;
  if v_code is not null then
    select c.status into v_status from public.scd_position_catalog c
    where c.organization_id = p_organization_id and c.code = v_code;
    if not found then raise exception 'unknown position' using errcode = '22023'; end if;
    if v_status <> 'ACTIVE' then raise exception 'position not active' using errcode = '22023'; end if;
  end if;
  update public.scd_role_templates
  set position_code = v_code, updated_by = (select auth.uid()), updated_at = now()
  where id = v_t.id;
  insert into public.scd_access_audit (organization_id, actor_user_id, action, detail)
  values (p_organization_id, (select auth.uid()), 'CHANGE_ROLE', jsonb_build_object(
    'template_id', v_t.id, 'platform', v_t.platform, 'label', v_t.label,
    'position_before', v_t.position_code, 'position', v_code,
    'note', left(btrim(coalesce(p_note, '')), 300)));
  return true;
end;
$$;

-- 3. Hardening of the r111 creator guard for the r138 column (privilege-escalation review 16/10/2026): r138 lets the
-- Direzione and the Segreteria write scd_structure_roles.position_code, and the r111 guard looks only at role_label.
-- Nobody gains creator rights from position_code today (scd_is_role_creator reads role_label), but the organigram must
-- not show a person as Presidente / Direttore Generale unless a creator or the service role put her there. Same text
-- as r111 except: a row also counts as a creator row when position_code is 'presidente' or 'direttore-generale'.
create or replace function public.scd_is_creator_position(p_code text)
returns boolean
language sql
immutable
set search_path to 'public'
as $$ select coalesce(p_code, '') in ('presidente', 'direttore-generale'); $$;

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
     and (public.scd_is_creator_label(old.role_label) or public.scd_is_creator_label(new.role_label)
          or public.scd_is_creator_position(old.position_code) or public.scd_is_creator_position(new.position_code)) then
    raise exception 'only Presidente or Direttore Generale change these roles' using errcode = '42501';
  end if;
  if (tg_op <> 'INSERT' and (public.scd_is_creator_label(old.role_label) or public.scd_is_creator_position(old.position_code)))
     or (tg_op <> 'DELETE' and (public.scd_is_creator_label(new.role_label) or public.scd_is_creator_position(new.position_code))) then
    if not public.scd_is_role_creator(v_org) then
      raise exception 'only Presidente or Direttore Generale change these roles' using errcode = '42501';
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

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
                   and (public.scd_is_creator_label(r.role_label) or public.scd_is_creator_position(r.position_code)))
     and not public.scd_is_role_creator(new.organization_id) then
    raise exception 'only Presidente or Direttore Generale link accounts to these people' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.scd_is_creator_position(text) from public, anon;
revoke all on function public.scd_structure_roles_creator_guard() from public, anon, authenticated;
revoke all on function public.scd_identity_links_creator_guard() from public, anon, authenticated;
revoke all on function public.scd_set_role_template_position(uuid, uuid, text, text) from public, anon;
grant execute on function public.scd_set_role_template_position(uuid, uuid, text, text) to authenticated;

commit;
