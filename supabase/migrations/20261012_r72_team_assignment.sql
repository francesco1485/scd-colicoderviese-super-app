-- r72: Secretariat team assignment (UD-071 follow-up, 2026-10-12).
--   The 61 people in status PENDING ("tesseramento in corso") and every athlete who changes team need one
--   audited action from the app: confirm the person (PENDING -> ACTIVE) and put the athlete in a team
--   (add a second team for multi-annata call-ups, or move: the previous membership is closed, never removed).
--   Registration status (tesseramento FIGC) is only flagged VERIFIED when the Secretariat says it saw it.
-- Additive only: one function, Direzione / Segreteria only, history in scd_person_events + scd_audit_events.

create or replace function public.scd_staff_assign_team(
  p_organization_id uuid,
  p_person_id uuid,
  p_team_code text,
  p_mode text,
  p_registration_seen boolean,
  p_note text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_person public.scd_people%rowtype;
  v_athlete_id uuid;
  v_team_id uuid;
  v_team_name text;
  v_from_team uuid;
  v_closed int := 0;
  v_added boolean := false;
  v_activated boolean := false;
  v_verified boolean := false;
begin
  if not public.scd_has_org_role(p_organization_id, array['DIRECTION','SECRETARIAT']::public.scd_role[]) then
    raise exception 'Direzione or Segreteria only' using errcode = '42501';
  end if;
  if p_mode not in ('ADD', 'MOVE') then
    raise exception 'unknown mode' using errcode = '22023';
  end if;

  select * into v_person from public.scd_people
    where id = p_person_id and organization_id = p_organization_id for update;
  if not found then
    raise exception 'person not found' using errcode = 'P0002';
  end if;
  if v_person.status not in ('ACTIVE', 'PENDING') then
    raise exception 'person not active' using errcode = '22023';
  end if;

  select id into v_athlete_id from public.scd_athletes
    where person_id = p_person_id and organization_id = p_organization_id limit 1;
  if v_athlete_id is null then
    raise exception 'not an athlete' using errcode = 'P0002';
  end if;

  select id, name into v_team_id, v_team_name from public.scd_teams
    where organization_id = p_organization_id and code = p_team_code and status = 'ACTIVE';
  if v_team_id is null then
    raise exception 'team not found' using errcode = 'P0002';
  end if;

  if p_mode = 'MOVE' then
    select team_id into v_from_team from public.scd_team_memberships
      where athlete_id = v_athlete_id and team_id <> v_team_id
        and (valid_to is null or valid_to >= current_date)
      order by created_at desc limit 1;
    update public.scd_team_memberships
      set valid_to = current_date - 1,
          valid_from = least(coalesce(valid_from, current_date - 1), current_date - 1)
      where athlete_id = v_athlete_id and team_id <> v_team_id
        and (valid_to is null or valid_to >= current_date);
    get diagnostics v_closed = row_count;
  end if;

  if exists (select 1 from public.scd_team_memberships
               where athlete_id = v_athlete_id and team_id = v_team_id
                 and (valid_to is null or valid_to >= current_date)) then
    v_added := false;
  elsif exists (select 1 from public.scd_team_memberships where athlete_id = v_athlete_id and team_id = v_team_id) then
    update public.scd_team_memberships
      set valid_from = current_date, valid_to = null, source_state = 'SUPERAPP_SEGRETERIA'
      where athlete_id = v_athlete_id and team_id = v_team_id;
    v_added := true;
  else
    insert into public.scd_team_memberships (organization_id, team_id, athlete_id, valid_from, valid_to, source_state)
    values (p_organization_id, v_team_id, v_athlete_id, current_date, null, 'SUPERAPP_SEGRETERIA');
    v_added := true;
  end if;

  if v_person.status = 'PENDING' then
    update public.scd_people set status = 'ACTIVE', updated_at = now()
      where id = p_person_id;
    v_activated := true;
  end if;

  if p_registration_seen then
    update public.scd_athletes set registration_status = 'VERIFIED', updated_at = now()
      where id = v_athlete_id and registration_status <> 'VERIFIED';
    v_verified := found;
  end if;

  if v_added or v_activated then
    insert into public.scd_person_events (organization_id, person_id, event_type, event_date, reason, from_team_id, to_team_id, note, actor_user_id)
    values (p_organization_id, p_person_id,
            case when v_activated then 'ENTRATA' else 'CAMBIO_SQUADRA' end,
            current_date,
            case when v_activated then 'Tesseramento confermato · ' || v_team_name else 'Squadra: ' || v_team_name end,
            v_from_team, v_team_id, p_note, (select auth.uid()));
  end if;

  insert into public.scd_audit_events (organization_id, actor_user_id, action, entity_type, entity_id, payload)
  values (p_organization_id, (select auth.uid()), 'TEAM_ASSIGN', 'scd_people', p_person_id,
          jsonb_build_object('team', p_team_code, 'mode', p_mode, 'added', v_added, 'closed', v_closed,
                             'activated', v_activated, 'verified', v_verified, 'note', p_note));

  return jsonb_build_object('added', v_added, 'closed', v_closed, 'activated', v_activated, 'verified', v_verified, 'team', v_team_name);
end;
$$;

revoke all on function public.scd_staff_assign_team(uuid, uuid, text, text, boolean, text) from public, anon;
grant execute on function public.scd_staff_assign_team(uuid, uuid, text, text, boolean, text) to authenticated;
