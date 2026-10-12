-- r93: "Auguri" (Direzione 2026-10-12). Today's birthdays of the club's athletes and staff, shown only to signed-in
-- members of the organization (never to anonymous visitors). Age rules are automatic: adults with full name,
-- minors with first name and initial of the surname; no age, no date, no photo is returned. Archived or departed
-- people are excluded. The day is computed in Europe/Rome; 29 February birthdays are wished on 28 February in
-- non-leap years.

create or replace function public.scd_birthdays_today(p_organization_id uuid)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  with today as (select (now() at time zone 'Europe/Rome')::date as d),
  people as (
    select distinct on (p.id) p.id, p.first_name, p.last_name, p.birth_date,
      coalesce((select t.code from public.scd_athletes a
                join public.scd_team_memberships tm on tm.athlete_id = a.id and tm.valid_to is null
                join public.scd_teams t on t.id = tm.team_id
                where a.person_id = p.id and a.organization_id = p_organization_id
                order by t.code limit 1), '') as team,
      exists (select 1 from public.scd_structure_roles r where r.person_id = p.id and r.organization_id = p_organization_id
              and r.active and (r.valid_to is null or r.valid_to >= current_date)) as staff
    from public.scd_people p
    where p.birth_date is not null and p.status <> 'ARCHIVED' and p.left_at is null
      and (exists (select 1 from public.scd_athletes a where a.person_id = p.id and a.organization_id = p_organization_id)
        or exists (select 1 from public.scd_structure_roles r where r.person_id = p.id and r.organization_id = p_organization_id and r.active))
  )
  select case when auth.uid() is null or not exists (select 1 from public.scd_memberships m
      where m.organization_id = p_organization_id and m.user_id = (select auth.uid()) and m.active) then '[]'::jsonb
  else coalesce((
    select jsonb_agg(jsonb_build_object(
        'id', x.id,
        'name', case when x.birth_date <= (select d from today) - interval '18 years'
          then trim(coalesce(x.first_name, '') || ' ' || coalesce(x.last_name, ''))
          else trim(coalesce(x.first_name, '') || ' ' || left(coalesce(x.last_name, ''), 1) || '.') end,
        'team', x.team,
        'staff', x.staff)
      order by x.staff desc, x.team, x.first_name)
    from people x, today
    where extract(month from x.birth_date) = extract(month from today.d)
      and (extract(day from x.birth_date) = extract(day from today.d)
        or (extract(month from x.birth_date) = 2 and extract(day from x.birth_date) = 29
            and extract(day from today.d) = 28 and not ((extract(year from today.d)::int % 4 = 0
              and extract(year from today.d)::int % 100 <> 0) or extract(year from today.d)::int % 400 = 0)))
  ), '[]'::jsonb) end;
$$;
revoke all on function public.scd_birthdays_today(uuid) from public, anon;
grant execute on function public.scd_birthdays_today(uuid) to authenticated;
