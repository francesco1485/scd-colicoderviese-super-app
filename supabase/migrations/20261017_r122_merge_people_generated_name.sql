-- r122: fix scd_merge_people (r121) on the real schema, 2026-10-17, chat CLOUD (range r110-r129).
-- STAGED: NOT APPLIED. Apply only after Francesco writes "applica r122".
-- Target: SCD PULSE (ndevtxxijbcnskgysdit). Never on dfnwzwutvnwiitiffwvr.
--
-- Why: the first real merge (Ernesto Maglia, Presidente card + parent card, 17/10/2026 18:57) failed with
-- «column "display_name" can only be updated to DEFAULT». On SCD PULSE scd_people.display_name is a generated column
-- (trim(first_name || ' ' || last_name)); the r121 test schema had it as a plain column. Nothing changed (one
-- transaction). The only change here: the merge no longer writes display_name (the database derives it). Every other
-- rule of r121 is identical. The r121 PGlite test now uses the generated column, as in production.
--
-- Rollback: re-run the scd_merge_people block of r121 (it would bring the bug back; only on Francesco's order).

do $$
begin
  if to_regprocedure('public.scd_merge_people(uuid, uuid, text)') is null then
    raise exception 'r122 needs r121 applied first';
  end if;
end
$$;

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
             where a.person_id = p_keep) then
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
  -- A minor's card never joins a card that may be an adult's: no birth date, organigram roles, or guardian of a
  -- family the minor belongs to (a parent and a child with the same name, review 17/10).
  if (((d.birth_date is not null and d.birth_date > current_date - interval '18 years')
         or (d.birth_date is null and exists (select 1 from public.scd_athletes a where a.person_id = p_drop)))
        and (k.birth_date is null
             or exists (select 1 from public.scd_structure_roles r where r.person_id = p_keep and r.active)
             or exists (select 1 from public.scd_family_members g join public.scd_family_members c on c.family_id = g.family_id
                        where g.person_id = p_keep and g.is_guardian and c.person_id = p_drop)))
     or (((k.birth_date is not null and k.birth_date > current_date - interval '18 years')
         or (k.birth_date is null and exists (select 1 from public.scd_athletes a where a.person_id = p_keep)))
        and (d.birth_date is null
             or exists (select 1 from public.scd_structure_roles r where r.person_id = p_drop and r.active)
             or exists (select 1 from public.scd_family_members g join public.scd_family_members c on c.family_id = g.family_id
                        where g.person_id = p_drop and g.is_guardian and c.person_id = p_keep))) then
    raise exception 'merge: a minor card with an adult card' using errcode = '22023';
  end if;
  -- Section grants are the Direzione's (r100): only the Direzione moves them.
  if exists (select 1 from public.scd_person_grants g where g.person_id in (p_keep, p_drop) and g.revoked_at is null)
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
  -- At least one card must say when the person was born: two dateless cards are not proof of one human.
  if k.birth_date is null and d.birth_date is null then
    raise exception 'merge: no birth date on either card' using errcode = '22023';
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
