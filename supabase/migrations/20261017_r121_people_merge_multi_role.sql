-- r121: one person = one card with many roles (UD-189), 2026-10-17, chat CLOUD (range r110-r129; r116-r120 used).
-- STAGED: NOT APPLIED. Apply only after Francesco writes "applica r121". Never apply from an agent.
-- Target: SCD PULSE (ndevtxxijbcnskgysdit). Never on dfnwzwutvnwiitiffwvr.
-- Requires: r64 (scd_access_requests, scd_approve_access_request), r65 (scd_access_audit), r111 (scd_is_role_creator,
-- scd_is_creator_label), r112 (scd_is_creator_position, applied 17/10), r138 (scd_position_catalog). A guard below stops the migration when
-- one of them is missing.
--
-- Why (Francesco, Direttore Generale, 17/10/2026 17:51 on the access-request dialog): «uno può essere più cose come
-- prevede lo statuto e la legge». The dialog let the office pick ONE existing card and ONE role, so a person already
-- in the registry twice (e.g. Presidente from the tesserati master + parent from the registrations) stayed split, and
-- "none of these" created a third card. The registry already holds many roles per person (scd_structure_roles with
-- position codes from the FIGC/LND/SGS/RASD catalogue, family links, team memberships, r100 section grants): only the
-- approval path was single-choice.
--
-- What it adds:
--   1. scd_merge_people(keep, drop, note) -> uuid: moves EVERYTHING that points at `drop` (every foreign key to
--      scd_people, found from the catalogue at run time, so future tables are covered) to `keep`, fills keep's empty
--      fields (email, phone, birth date, fiscal code, display name) from drop, writes one MERGE_PEOPLE audit row and
--      deletes drop. Fail closed: different organisations, different birth dates, two athlete records, two active
--      grants on the same section, two active consents of the same type, the same tesseramento or transport request
--      on both, cards of two different accounts, a minor's card with an account, a card linked to the caller,
--      section grants moved by anyone but the Direzione -> exception, nothing changes (one transaction). Who: a
--      signed-in Direzione or Segreteria person only (no session = refused: agents never merge); when either card holds
--      a Presidente / Direttore Generale position, only a role creator (r111: Presidente or DG).
--   2. scd_approve_access_request_multi(request, person, merge_ids[], role, positions jsonb, child_ids[], note) -> uuid:
--      the same approval as r64 (account, base role that only goes up, verified identity link) after merging the
--      chosen duplicate cards into `person`, then every child as guardian link and every position from the catalogue
--      as an active organigram row (position_code, label and kind from scd_position_catalog; an optional team). Roles
--      already held are kept, never duplicated. Office roles (Direzione, Segreteria) stay out, as in r64. Every chosen
--      card must be the requester (same birth date when known; never a minor's or a dateless athlete's card for an
--      adult's request: the child whose parent used the same e-mail). Presidente / DG seats only by role creators.
--
-- Engine: PERSONE (one card per human, every hat they wear) and TEMPO (no third card to clean up later).
-- Measure: duplicate cards with the same e-mail or name + birth date; requests approved with more than one role.
-- Additive and idempotent (create or replace; the audit check is widened keeping every existing value).
--
-- Rollback (only on Francesco's explicit order; merges already done are not undone by it):
--   begin;
--   drop function if exists public.scd_approve_access_request_multi(uuid, uuid, uuid[], public.scd_role, jsonb, uuid[], text);
--   drop function if exists public.scd_merge_people(uuid, uuid, text);
--   commit;

do $$
begin
  if to_regclass('public.scd_access_requests') is null
     or to_regclass('public.scd_access_audit') is null
     or to_regclass('public.scd_position_catalog') is null
     or to_regprocedure('public.scd_approve_access_request(uuid, uuid, public.scd_role, uuid, text)') is null
     or to_regprocedure('public.scd_is_role_creator(uuid)') is null
     or to_regprocedure('public.scd_is_creator_label(text)') is null
     or to_regprocedure('public.scd_is_creator_position(text)') is null then
    raise exception 'r121 prerequisites missing (r64, r65, r111, r112, r138)';
  end if;
end
$$;

-- 1. Audit action for merges (every value already allowed is kept).
alter table public.scd_access_audit drop constraint if exists scd_access_audit_action_check;
alter table public.scd_access_audit add constraint scd_access_audit_action_check check (action in (
  'SET_ACCESS','GRANT_PERSON','REVOKE_LINK','APPROVE_REQUEST','REJECT_REQUEST',
  'GRANT_SECTION','CHANGE_SECTION','REVOKE_SECTION','COPY_GRANTS',
  'CREATE_ROLE','CHANGE_ROLE','ROLE_STATUS','CREATE_POSITION','POSITION_STATUS',
  'MERGE_PEOPLE'));

-- 2. Merge two cards of the same human.
create or replace function public.scd_merge_people(p_keep uuid, p_drop uuid, p_note text)
returns uuid
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  k public.scd_people%rowtype;
  d public.scd_people%rowtype;
  fk record;
  v_creator_card boolean;
  v_moved jsonb := '{}'::jsonb;
  v_n bigint;
begin
  if p_keep is null or p_drop is null or p_keep = p_drop then
    raise exception 'merge: two different cards are needed' using errcode = '22023';
  end if;
  select * into k from public.scd_people where id = p_keep for update;
  select * into d from public.scd_people where id = p_drop for update;
  if k.id is null or d.id is null then raise exception 'merge: card not found' using errcode = 'P0002'; end if;
  if k.organization_id <> d.organization_id then raise exception 'merge: not allowed' using errcode = '42501'; end if;

  -- Who: only a signed-in person of the office. No session (service role, an agent through a connector) = no merge.
  if auth.uid() is null
     or not public.scd_has_org_role(k.organization_id, array['DIRECTION','SECRETARIAT']::public.scd_role[]) then
    raise exception 'merge: not allowed' using errcode = '42501';
  end if;
  select exists (
    select 1 from public.scd_structure_roles r
    where r.person_id in (p_keep, p_drop) and r.active
      and (public.scd_is_creator_label(r.role_label) or public.scd_is_creator_position(r.position_code))
  ) into v_creator_card;
  if v_creator_card and not public.scd_is_role_creator(k.organization_id) then
    raise exception 'merge: only Presidente or Direttore Generale merge these cards' using errcode = '42501';
  end if;
  -- Nobody merges a card linked to their own account (no self-service on one's own identity).
  if exists (select 1 from public.scd_identity_links l where l.person_id in (p_keep, p_drop) and l.user_id = auth.uid()) then
    raise exception 'merge: own card' using errcode = '42501';
  end if;
  -- Two accounts are two people: cards linked to different accounts are never merged.
  if exists (select 1 from public.scd_identity_links a join public.scd_identity_links b
               on b.person_id = p_drop and b.user_id <> a.user_id
              and b.link_state in ('AUTO_VERIFIED', 'VERIFIED_BY_STAFF')
             where a.person_id = p_keep and a.link_state in ('AUTO_VERIFIED', 'VERIFIED_BY_STAFF')) then
    raise exception 'merge: cards of two different accounts' using errcode = '22023';
  end if;
  -- A minor's card (under 18, or an athlete with no birth date) never joins a card that has an account.
  if ((d.birth_date is not null and d.birth_date > current_date - interval '18 years')
        or (d.birth_date is null and exists (select 1 from public.scd_athletes a where a.person_id = p_drop))
        or (k.birth_date is not null and k.birth_date > current_date - interval '18 years')
        or (k.birth_date is null and exists (select 1 from public.scd_athletes a where a.person_id = p_keep)))
     and exists (select 1 from public.scd_identity_links l where l.person_id in (p_keep, p_drop)) then
    raise exception 'merge: a minor card with an account' using errcode = '22023';
  end if;
  -- Section grants are the Direzione's (r100): only the Direzione moves them.
  if exists (select 1 from public.scd_person_grants g where g.person_id = p_drop and g.revoked_at is null)
     and not public.scd_has_org_role(k.organization_id, array['DIRECTION']::public.scd_role[]) then
    raise exception 'merge: sections only the Direzione moves' using errcode = '42501';
  end if;
  -- A reference this function does not know how to move (multi-column foreign key) stops the merge.
  if exists (select 1 from pg_constraint c where c.contype = 'f' and c.confrelid = 'public.scd_people'::regclass
               and cardinality(c.conkey) > 1) then
    raise exception 'merge: unknown reference to people, update r121' using errcode = '22023';
  end if;

  if k.birth_date is not null and d.birth_date is not null and k.birth_date <> d.birth_date then
    raise exception 'merge: different birth dates' using errcode = '22023';
  end if;

  -- Conflicts a person must solve by hand (fail closed, nothing changes).
  if exists (select 1 from public.scd_athletes a where a.person_id = p_keep)
     and exists (select 1 from public.scd_athletes a where a.person_id = p_drop) then
    raise exception 'merge: both cards are athletes' using errcode = '22023';
  end if;
  if exists (select 1 from public.scd_person_grants a join public.scd_person_grants b
               on b.section_code = a.section_code and b.person_id = p_drop and b.revoked_at is null
             where a.person_id = p_keep and a.revoked_at is null) then
    raise exception 'merge: both cards have access to the same section' using errcode = '22023';
  end if;
  if exists (select 1 from public.scd_person_consents a join public.scd_person_consents b
               on b.consent_type = a.consent_type and b.person_id = p_drop and b.revoked_at is null
             where a.person_id = p_keep and a.revoked_at is null) then
    raise exception 'merge: both cards have the same active consent' using errcode = '22023';
  end if;
  if exists (select 1 from public.scd_tesseramenti a join public.scd_tesseramenti b
               on b.person_id = p_drop and b.season_id = a.season_id
              and coalesce(b.team_id, '00000000-0000-0000-0000-000000000000'::uuid)
                = coalesce(a.team_id, '00000000-0000-0000-0000-000000000000'::uuid)
             where a.person_id = p_keep) then
    raise exception 'merge: same tesseramento on both cards' using errcode = '22023';
  end if;
  if exists (select 1 from public.scd_transport_requests a join public.scd_transport_requests b
               on b.person_id = p_drop and b.event_source_id = a.event_source_id
             where a.person_id = p_keep) then
    raise exception 'merge: same transport request on both cards' using errcode = '22023';
  end if;

  -- Tables with a unique key on the person: move what keep lacks, then drop the rest.
  insert into public.scd_family_members (family_id, person_id, relationship, is_guardian)
  select f.family_id, p_keep, f.relationship, f.is_guardian from public.scd_family_members f where f.person_id = p_drop
  on conflict (family_id, person_id) do update
    set is_guardian = public.scd_family_members.is_guardian or excluded.is_guardian;
  get diagnostics v_n = row_count;
  v_moved := v_moved || jsonb_build_object('scd_family_members.person_id', v_n);
  delete from public.scd_family_members where person_id = p_drop;

  insert into public.scd_identity_links (organization_id, user_id, person_id, link_state, match_method, confidence,
                                         verified_by_user_id, verified_at)
  select l.organization_id, l.user_id, p_keep, l.link_state, l.match_method, l.confidence, l.verified_by_user_id, l.verified_at
  from public.scd_identity_links l where l.person_id = p_drop
  on conflict (organization_id, user_id, person_id) do nothing;
  get diagnostics v_n = row_count;
  v_moved := v_moved || jsonb_build_object('scd_identity_links.person_id', v_n);
  delete from public.scd_identity_links where person_id = p_drop;

  delete from public.scd_person_roles pr
  where pr.person_id = p_drop and pr.active
    and exists (select 1 from public.scd_person_roles x where x.person_id = p_keep and x.active and x.role = pr.role);

  -- Every other reference to drop, found from the catalogue (covers tables added later too).
  for fk in
    select c.conrelid::regclass as tbl, a.attname as col
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
    where c.contype = 'f' and c.confrelid = 'public.scd_people'::regclass
      and c.conrelid not in ('public.scd_family_members'::regclass, 'public.scd_identity_links'::regclass)
      and cardinality(c.conkey) = 1
  loop
    begin
      execute format('update %s set %I = $1 where %I = $2', fk.tbl, fk.col, fk.col) using p_keep, p_drop;
      get diagnostics v_n = row_count;
    exception when unique_violation then
      raise exception 'merge: duplicate data in %', fk.tbl using errcode = '22023';
    end;
    if v_n > 0 then v_moved := v_moved || jsonb_build_object(fk.tbl::text || '.' || fk.col, v_n); end if;
  end loop;

  update public.scd_people
     set email = coalesce(k.email, d.email),
         phone = coalesce(k.phone, d.phone),
         birth_date = coalesce(k.birth_date, d.birth_date),
         fiscal_code = coalesce(k.fiscal_code, d.fiscal_code),
         display_name = coalesce(k.display_name, d.display_name),
         updated_at = now()
   where id = p_keep;

  insert into public.scd_access_audit (organization_id, actor_user_id, target_person_id, action, detail)
  values (k.organization_id, auth.uid(), p_keep, 'MERGE_PEOPLE', jsonb_build_object(
    'merged_person_id', p_drop, 'merged_source_id', d.source_id, 'moved', v_moved, 'note', left(coalesce(p_note, ''), 300)));

  delete from public.scd_people where id = p_drop;
  return p_keep;
end;
$$;

revoke all on function public.scd_merge_people(uuid, uuid, text) from public, anon;
grant execute on function public.scd_merge_people(uuid, uuid, text) to authenticated;

-- 3. Approve a request with every role the person holds.
create or replace function public.scd_approve_access_request_multi(
  p_request_id uuid, p_person_id uuid, p_merge_ids uuid[], p_role public.scd_role,
  p_positions jsonb, p_child_ids uuid[], p_note text
)
returns uuid
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  r public.scd_access_requests%rowtype;
  v_person uuid := p_person_id;
  v_drop uuid;
  v_child uuid;
  v_family uuid;
  v_pos jsonb;
  v_code text;
  v_team uuid;
  c public.scd_position_catalog%rowtype;
  v_added int := 0;
begin
  select * into r from public.scd_access_requests where id = p_request_id for update;
  if r.id is null or auth.uid() is null
     or not public.scd_has_org_role(r.organization_id, array['DIRECTION','SECRETARIAT']::public.scd_role[]) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if r.status <> 'PENDING' then raise exception 'request already reviewed' using errcode = '22023'; end if;
  if p_positions is not null and jsonb_typeof(p_positions) <> 'array' then
    raise exception 'positions must be a list' using errcode = '22023';
  end if;
  if coalesce(jsonb_array_length(p_positions), 0) > 12 or coalesce(cardinality(p_child_ids), 0) > 8
     or coalesce(cardinality(p_merge_ids), 0) > 4 then
    raise exception 'too many items' using errcode = '22023';
  end if;
  if r.is_minor and coalesce(jsonb_array_length(p_positions), 0) > 0 then
    raise exception 'a minor holds no organigram position' using errcode = '22023';
  end if;

  -- Every chosen card must be the requester: same club, never another birth date, never a minor's card for an adult's
  -- request, never an athlete card without a birth date (it may be the child whose parent used the same e-mail).
  if coalesce(cardinality(p_merge_ids), 0) > 0 and v_person is null then
    raise exception 'merge needs the card to keep' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.scd_people p
    where p.id = any (array_append(coalesce(p_merge_ids, '{}'::uuid[]), v_person))
      and (p.organization_id <> r.organization_id
           or (p.birth_date is not null and p.birth_date <> r.birth_date)
           or (not r.is_minor and p.birth_date is not null and p.birth_date > current_date - interval '18 years')
           or (p.birth_date is null and exists (select 1 from public.scd_athletes a where a.person_id = p.id) and not r.is_minor))
  ) then
    raise exception 'card is not the requester' using errcode = '22023';
  end if;
  if v_person is not null and not exists (select 1 from public.scd_people where id = v_person and organization_id = r.organization_id) then
    raise exception 'person not found' using errcode = 'P0002';
  end if;
  if exists (select 1 from unnest(coalesce(p_merge_ids, '{}'::uuid[])) m(id)
             where not exists (select 1 from public.scd_people where id = m.id and organization_id = r.organization_id)) then
    raise exception 'person not found' using errcode = 'P0002';
  end if;

  -- Presidente / Direttore Generale seats are given only by those two (r111/r112), checked here, not only in the UI.
  if exists (select 1 from jsonb_array_elements(coalesce(p_positions, '[]'::jsonb)) e(x)
             join public.scd_position_catalog pc on pc.organization_id = r.organization_id and pc.code = e.x->>'code'
             where public.scd_is_creator_position(pc.code) or public.scd_is_creator_label(pc.label))
     and not public.scd_is_role_creator(r.organization_id) then
    raise exception 'only Presidente or Direttore Generale give these roles' using errcode = '42501';
  end if;

  -- Duplicate cards of the same human first, so the approval lands on one card.
  if coalesce(cardinality(p_merge_ids), 0) > 0 then
    foreach v_drop in array p_merge_ids loop
      if v_drop is not null and v_drop <> v_person then
        perform public.scd_merge_people(v_person, v_drop, coalesce(p_note, '') || ' [richiesta di accesso]');
      end if;
    end loop;
  end if;

  -- r64 approval: account, base role that only goes up, verified link, first child.
  v_person := public.scd_approve_access_request(p_request_id, v_person, p_role, p_child_ids[1], p_note);

  -- Further children.
  if coalesce(cardinality(p_child_ids), 0) > 1 then
    for i in 2 .. cardinality(p_child_ids) loop
      v_child := p_child_ids[i];
      continue when v_child is null or v_child = p_child_ids[1] or v_child = v_person;
      if not exists (select 1 from public.scd_people where id = v_child and organization_id = r.organization_id) then
        raise exception 'child not found' using errcode = 'P0002';
      end if;
      select fm.family_id into v_family from public.scd_family_members fm
        join public.scd_families f on f.id = fm.family_id and f.organization_id = r.organization_id
        where fm.person_id = v_child and not fm.is_guardian limit 1;
      if v_family is null then
        insert into public.scd_families (organization_id, display_name)
        select r.organization_id, 'Famiglia ' || initcap(last_name) from public.scd_people where id = v_child
        returning id into v_family;
        insert into public.scd_family_members (family_id, person_id, relationship, is_guardian) values (v_family, v_child, 'FIGLIO', false);
      end if;
      insert into public.scd_family_members (family_id, person_id, relationship, is_guardian)
      values (v_family, v_person, 'GENITORE', true)
      on conflict (family_id, person_id) do update set is_guardian = true;
      v_family := null;
    end loop;
  end if;

  -- Organigram positions from the catalogue; a position already held (same code and team) is not repeated.
  for v_pos in select * from jsonb_array_elements(coalesce(p_positions, '[]'::jsonb)) loop
    v_code := v_pos->>'code';
    v_team := nullif(v_pos->>'teamId', '')::uuid;
    select * into c from public.scd_position_catalog where organization_id = r.organization_id and code = v_code;
    if c.code is null or c.status <> 'ACTIVE' then raise exception 'unknown position' using errcode = '22023'; end if;
    if v_team is not null and not exists (select 1 from public.scd_teams t where t.id = v_team and t.organization_id = r.organization_id) then
      raise exception 'team not found' using errcode = 'P0002';
    end if;
    if not exists (select 1 from public.scd_structure_roles s
                   where s.person_id = v_person and s.active and s.position_code = c.code
                     and s.team_id is not distinct from v_team) then
      insert into public.scd_structure_roles (organization_id, person_id, role_label, role_kind, team_id, position_code,
                                              show_in_app, active, source_id, source_record_id)
      values (r.organization_id, v_person, c.label, c.role_kind, v_team, c.code, true, true, 'ACCESS_REQUEST', r.id::text);
      v_added := v_added + 1;
    end if;
  end loop;

  insert into public.scd_access_audit (organization_id, actor_user_id, target_person_id, action, detail)
  values (r.organization_id, auth.uid(), v_person, 'APPROVE_REQUEST', jsonb_build_object(
    'request_id', r.id, 'role', p_role, 'positions_added', v_added,
    'positions', coalesce(p_positions, '[]'::jsonb), 'children', coalesce(cardinality(p_child_ids), 0),
    'merged', coalesce(cardinality(p_merge_ids), 0)));
  return v_person;
end;
$$;

revoke all on function public.scd_approve_access_request_multi(uuid, uuid, uuid[], public.scd_role, jsonb, uuid[], text) from public, anon;
grant execute on function public.scd_approve_access_request_multi(uuid, uuid, uuid[], public.scd_role, jsonb, uuid[], text) to authenticated;
