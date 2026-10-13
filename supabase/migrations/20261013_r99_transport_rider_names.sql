-- r99: Pulmini — riders' names for the transport staff (UD-108, Direzione 13/10/2026 17:53).
-- "devi mettere i pulmini con i ragazzi solo i nomi sotto agli allenamenti e devo sapere in ogni pulmino chi c'è
-- sempre e dove va e che percorso fa se premo sul pulmino".
--
-- r74 copied the service users of "05_PULMINI - Master Flotta e Trasporti" WITHOUT names. The Direzione now asks
-- for the names under each training, so the copy job may carry first and last name of each service user, from
-- the same Master (no new source, no name matching with scd_people). Minimisation:
--   * only first_name / last_name are added (no phone, parent, address, note of the child);
--   * the table keeps RLS with no policies and no grants: rows are read only through the function below;
--   * the function answers only to the people who already read the Pulmini board (r74 rule: Direzione,
--     Segreteria, responsabile trasporti, Presidente, DG, autisti) and returns names, team, line, vehicle and
--     weekday flags — nothing else; the Super App server shows first name + surname initial.
-- Not applied automatically: personal data of minors, applied by the Direzione (SCD:STATE gate).

alter table public.scd_transport_riders add column if not exists first_name text;
alter table public.scd_transport_riders add column if not exists last_name text;
alter table public.scd_transport_riders add column if not exists vehicle_label text;

comment on column public.scd_transport_riders.first_name is 'UD-108: first name from the Master Pulmini (02 UTENTI SERVIZIO). Read only through scd_transport_rider_roster.';
comment on column public.scd_transport_riders.last_name is 'UD-108: last name from the Master Pulmini. The app shows only the initial (RIDER_NAME_FORMAT).';
comment on column public.scd_transport_riders.vehicle_label is 'UD-108: van written in the Master for this rider (P1..P4 / Pulmino 1..4), when present.';

-- The copy job stores the names when the payload carries them (tools/sync/pulmini_master_payload.py).
create or replace function public.scd_transport_sync_rider_names(p_organization_id uuid, p_payload jsonb)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_n integer;
begin
  update public.scd_transport_riders r
  set first_name = left(nullif(btrim(x->>'firstName'), ''), 40),
      last_name = left(nullif(btrim(x->>'lastName'), ''), 40),
      vehicle_label = left(nullif(btrim(x->>'vehicle'), ''), 20)
  from jsonb_array_elements(coalesce(p_payload->'riders', '[]')) x
  where r.organization_id = p_organization_id and r.source_record_id = x->>'id';
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;
revoke all on function public.scd_transport_sync_rider_names(uuid, jsonb) from public, anon, authenticated;

-- Roster for the vans under the trainings. Same audience as scd_transport_board; null for everyone else.
create or replace function public.scd_transport_rider_roster(p_organization_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_allowed boolean := public.scd_has_org_role(p_organization_id, array['DIRECTION','SECRETARIAT']::public.scd_role[])
    or public.scd_has_position(p_organization_id, array['responsabile-trasporti','direzione','presidente','direttore-generale','autista']);
begin
  if not v_allowed then
    return null;
  end if;
  return jsonb_build_object(
    'canSeeNames', true,
    'riders', coalesce((select jsonb_agg(jsonb_build_object(
        'firstName', r.first_name, 'lastName', r.last_name, 'teamGroup', r.team_group,
        'serviceStatus', r.service_status, 'line', r.line_label, 'vehicle', r.vehicle_label, 'days', r.days)
        order by r.team_group, r.last_name, r.first_name)
      from public.scd_transport_riders r
      where r.organization_id = p_organization_id and r.active
        and coalesce(r.service_status, '') <> 'NON ATTIVO'), '[]'));
end;
$$;
revoke all on function public.scd_transport_rider_roster(uuid) from public, anon;
grant execute on function public.scd_transport_rider_roster(uuid) to authenticated;
