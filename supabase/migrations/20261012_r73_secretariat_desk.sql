-- r73: Secretariat desk (2026-10-12). One read-only function returning the day's work queue as COUNTS only
-- (no names, no personal data), so /segreteria opens on what needs doing today. Direzione / Segreteria only.
-- Additive: no table changes.

create or replace function public.scd_secretariat_desk(p_organization_id uuid)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select case
    when not public.scd_has_org_role(p_organization_id, array['DIRECTION','SECRETARIAT']::public.scd_role[]) then null
    else jsonb_build_object(
      'as_of', now(),
      'access_requests_pending', (select count(*) from public.scd_access_requests
         where organization_id = p_organization_id and status = 'PENDING'),
      'people_pending', (select count(*) from public.scd_people p
         where p.organization_id = p_organization_id and p.status = 'PENDING'),
      'athletes_without_team', (select count(*) from public.scd_athletes a join public.scd_people p on p.id = a.person_id
         where a.organization_id = p_organization_id and p.status = 'ACTIVE'
           and not exists (select 1 from public.scd_team_memberships tm where tm.athlete_id = a.id
                             and (tm.valid_to is null or tm.valid_to >= current_date))),
      'registration_unverified', (select count(*) from public.scd_athletes a join public.scd_people p on p.id = a.person_id
         where a.organization_id = p_organization_id and p.status = 'ACTIVE' and a.registration_status <> 'VERIFIED'),
      'cert_missing', (select count(*) from public.scd_athletes a join public.scd_people p on p.id = a.person_id
         where a.organization_id = p_organization_id and p.status = 'ACTIVE' and a.medical_certificate_expires_at is null),
      'cert_expired', (select count(*) from public.scd_athletes a join public.scd_people p on p.id = a.person_id
         where a.organization_id = p_organization_id and p.status = 'ACTIVE'
           and a.medical_certificate_expires_at < current_date),
      'cert_expiring_30', (select count(*) from public.scd_athletes a join public.scd_people p on p.id = a.person_id
         where a.organization_id = p_organization_id and p.status = 'ACTIVE'
           and a.medical_certificate_expires_at >= current_date
           and a.medical_certificate_expires_at < current_date + interval '30 days'),
      'cert_declared', (select count(*) from public.scd_athletes a join public.scd_people p on p.id = a.person_id
         where a.organization_id = p_organization_id and p.status = 'ACTIVE'
           and a.medical_certificate_expires_at is not null and a.medical_certificate_status = 'DECLARED'),
      'callups_pending_72h', (select count(*) from public.scd_match_callups c
         join public.scd_matches m on m.id = c.match_id
         join public.scd_events e on e.id = m.event_id
         where c.organization_id = p_organization_id and c.withdrawn_at is null and c.response_status = 'PENDING'
           and e.starts_at between now() and now() + interval '72 hours'),
      'callups_total_72h', (select count(*) from public.scd_match_callups c
         join public.scd_matches m on m.id = c.match_id
         join public.scd_events e on e.id = m.event_id
         where c.organization_id = p_organization_id and c.withdrawn_at is null
           and e.starts_at between now() and now() + interval '72 hours'),
      'accounts_never_signed_in', (select count(*) from public.scd_memberships m
         join auth.users u on u.id = m.user_id
         where m.organization_id = p_organization_id and m.active and u.last_sign_in_at is null)
    ) end;
$$;

revoke all on function public.scd_secretariat_desk(uuid) from public, anon;
grant execute on function public.scd_secretariat_desk(uuid) to authenticated;
