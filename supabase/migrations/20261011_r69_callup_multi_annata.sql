-- r69: a call-up may include athletes of every annata the mister can call up (UD-068).
-- "La convocazione non è la distinta": the mister calls up one or two days before whoever he wants, from the match's team
-- or from the other teams assigned to him (scd_my_team_ids: organigramma, squadre in più from Accessi, coordinator = all);
-- everyone called up must show up; the match sheet (distinta) is a separate step at the match.
-- Change vs r68: an athlete is NOT_IN_TEAM only if he belongs to none of the caller's teams (before: none but the match's team).
-- Eligibility (medical certificate on match day, FIGC registration) stays enforced by the r53 trigger. Same signature.

create or replace function public.scd_staff_send_callups(
  p_organization_id uuid,
  p_match_id uuid,
  p_athlete_ids uuid[],
  p_meeting_at timestamptz,
  p_meeting_place text,
  p_kit_note text
)
returns table (athlete_id uuid, outcome text)
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
#variable_conflict use_column
declare
  v_team uuid := public.scd_match_team_id(p_match_id);
  v_starts timestamptz;
  v_id uuid;
begin
  if v_team is null or v_team not in (select public.scd_my_team_ids(p_organization_id)) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select e.starts_at into v_starts from public.scd_matches m join public.scd_events e on e.id = m.event_id
  where m.id = p_match_id and m.organization_id = p_organization_id;
  if v_starts is null or v_starts < now() - interval '12 hours' then
    raise exception 'match already played' using errcode = '22023';
  end if;
  if coalesce(array_length(p_athlete_ids, 1), 0) = 0 or array_length(p_athlete_ids, 1) > 40 then
    raise exception 'between 1 and 40 athletes' using errcode = '22023';
  end if;

  foreach v_id in array p_athlete_ids loop
    athlete_id := v_id;
    if not exists (
      select 1 from public.scd_team_memberships tm
      where tm.athlete_id = v_id and (tm.valid_to is null or tm.valid_to >= current_date)
        and tm.team_id in (select public.scd_my_team_ids(p_organization_id))
    ) then
      outcome := 'NOT_IN_TEAM';
      return next;
      continue;
    end if;
    begin
      insert into public.scd_match_callups as c
        (organization_id, match_id, athlete_id, meeting_at, meeting_place, kit_note, response_status, created_by_user_id)
      values
        (p_organization_id, p_match_id, v_id, p_meeting_at, left(p_meeting_place, 160), left(p_kit_note, 300), 'PENDING', (select auth.uid()))
      on conflict (match_id, athlete_id) do update
        set meeting_at = excluded.meeting_at, meeting_place = excluded.meeting_place, kit_note = excluded.kit_note, updated_at = now(),
            response_status = case when c.withdrawn_at is not null then 'PENDING' else c.response_status end,
            notified_at = case when c.withdrawn_at is not null then null else c.notified_at end,
            withdrawn_at = null,
            withdrawn_by = null;
      outcome := 'SENT';
    exception when others then
      outcome := case
        when sqlerrm like '%medical certificate%' then 'CERTIFICATE'
        when sqlerrm like '%FIGC registration%' then 'REGISTRATION'
        else 'ERROR' end;
    end;
    return next;
  end loop;

  update public.scd_matches set convocazioni_status = 'INVIATE', updated_at = now()
  where id = p_match_id and exists (select 1 from public.scd_match_callups c where c.match_id = p_match_id and c.withdrawn_at is null);
end;
$$;
