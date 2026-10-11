-- r66: medical certificate register for the secretariat (UD-065).
--   * scd_athletes.medical_certificate_expires_at stays the single source of truth (manifest operative_engine);
--   * new provenance columns say whether a date is only declared (registration form) or checked by the
--     secretariat on the paper certificate, who checked it and when, and the certificate kind;
--   * dates already imported from the registration form become DECLARED (manifest rule
--     CERTIFICATE_DATE_IS_DECLARED_UNTIL_SECRETARIAT_CHECKS);
--   * one audited write function, Direzione and Segreteria only; every change lands in scd_audit_events;
--   * one read function for the office list (no phones, e-mails or fiscal codes).
-- Additive only: no RLS policy, role or grant on existing tables changes.

alter table public.scd_athletes
  add column if not exists medical_certificate_status text,
  add column if not exists medical_certificate_kind text,
  add column if not exists medical_certificate_checked_at timestamptz,
  add column if not exists medical_certificate_checked_by uuid;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'scd_athletes_medical_certificate_status_check') then
    alter table public.scd_athletes add constraint scd_athletes_medical_certificate_status_check
      check (medical_certificate_status is null or medical_certificate_status in ('DECLARED', 'VERIFIED'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'scd_athletes_medical_certificate_kind_check') then
    alter table public.scd_athletes add constraint scd_athletes_medical_certificate_kind_check
      check (medical_certificate_kind is null or medical_certificate_kind in ('AGONISTICO', 'NON_AGONISTICO'));
  end if;
end $$;

update public.scd_athletes
  set medical_certificate_status = 'DECLARED'
  where medical_certificate_expires_at is not null and medical_certificate_status is null;

-- Office list: one row per active athlete and current team (an athlete in two teams appears twice).
create or replace function public.scd_certificate_register(p_organization_id uuid)
returns table (
  athlete_id uuid,
  display_name text,
  birth_year integer,
  is_minor boolean,
  team_code text,
  team_name text,
  registration_status text,
  expires_at date,
  status text,
  kind text,
  checked_at timestamptz
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select
    a.id,
    coalesce(nullif(p.display_name, ''), trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, ''))),
    extract(year from p.birth_date)::integer,
    public.scd_is_minor(p.birth_date),
    t.code,
    t.name,
    a.registration_status,
    a.medical_certificate_expires_at,
    a.medical_certificate_status,
    a.medical_certificate_kind,
    a.medical_certificate_checked_at
  from public.scd_athletes a
  join public.scd_people p on p.id = a.person_id
  left join public.scd_team_memberships tm
    on tm.athlete_id = a.id and (tm.valid_to is null or tm.valid_to >= current_date)
  left join public.scd_teams t on t.id = tm.team_id
  where a.organization_id = p_organization_id
    and p.status <> 'ARCHIVED'
    and p.left_at is null
    and public.scd_has_org_role(p_organization_id, array['DIRECTION','SECRETARIAT','REGISTRATION']::public.scd_role[])
  order by t.code nulls last, p.last_name, p.first_name;
$$;

create or replace function public.scd_set_certificate(
  p_organization_id uuid,
  p_athlete_id uuid,
  p_expires_at date,
  p_kind text,
  p_verified boolean,
  p_note text
)
returns boolean
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_before jsonb;
  v_status text;
begin
  if not public.scd_has_org_role(p_organization_id, array['DIRECTION','SECRETARIAT']::public.scd_role[]) then
    raise exception 'Direzione or Segreteria only' using errcode = '42501';
  end if;
  if p_kind is not null and p_kind not in ('AGONISTICO', 'NON_AGONISTICO') then
    raise exception 'unknown certificate kind' using errcode = '22023';
  end if;
  if p_expires_at is not null and (p_expires_at < current_date - interval '3 years' or p_expires_at > current_date + interval '2 years') then
    raise exception 'certificate date out of range' using errcode = '22023';
  end if;

  select jsonb_build_object(
           'expires_at', medical_certificate_expires_at,
           'status', medical_certificate_status,
           'kind', medical_certificate_kind)
    into v_before
    from public.scd_athletes
    where id = p_athlete_id and organization_id = p_organization_id
    for update;
  if not found then
    raise exception 'athlete not found' using errcode = 'P0002';
  end if;

  v_status := case
    when p_expires_at is null then null
    when p_verified then 'VERIFIED'
    else 'DECLARED'
  end;

  update public.scd_athletes
    set medical_certificate_expires_at = p_expires_at,
        medical_certificate_status = v_status,
        medical_certificate_kind = case when p_expires_at is null then null else p_kind end,
        medical_certificate_checked_at = case when v_status = 'VERIFIED' then now() else null end,
        medical_certificate_checked_by = case when v_status = 'VERIFIED' then (select auth.uid()) else null end,
        updated_at = now()
    where id = p_athlete_id and organization_id = p_organization_id;

  insert into public.scd_audit_events (organization_id, actor_user_id, action, entity_type, entity_id, payload)
  values (p_organization_id, (select auth.uid()), 'CERTIFICATE_SET', 'scd_athletes', p_athlete_id,
          jsonb_build_object(
            'before', v_before,
            'after', jsonb_build_object('expires_at', p_expires_at, 'status', v_status, 'kind', case when p_expires_at is null then null else p_kind end),
            'note', left(coalesce(p_note, ''), 300)));
  return true;
end;
$$;

revoke all on function public.scd_certificate_register(uuid) from public, anon;
revoke all on function public.scd_set_certificate(uuid, uuid, date, text, boolean, text) from public, anon;
grant execute on function public.scd_certificate_register(uuid) to authenticated;
grant execute on function public.scd_set_certificate(uuid, uuid, date, text, boolean, text) to authenticated;
