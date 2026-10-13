-- r94: rosa pubblica di una squadra (brief Direzione 2026-10-13: "le squadre ci sono, dove prende calciatori").
-- Le squadre agonistiche (prima, u19, u16, u15) sono su liste ufficiali FIGC: i nomi si possono mostrare con la
-- regola automatica dell'età, senza consensi aggiuntivi: maggiorenni nome e cognome; minorenni nome + iniziale del
-- cognome in pubblico, nome intero per chi è tesserato attivo dell'organizzazione (scd_memberships, come r90).
-- Attività di base (2014, 2015, pulcini, primicalci, piccoli/piccoliamici): solo il numero degli iscritti, mai i nomi.
-- Mai date di nascita, telefoni, email o foto. Ruolo = fanta_role quando c'è, altrimenti null.

create or replace function public.scd_public_roster(p_org_slug text, p_team_code text)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  with org as (
    select id from public.scd_organizations where slug = p_org_slug
  ),
  code as (
    select case when lower(p_team_code) = 'piccoli' then 'piccoliamici' else lower(p_team_code) end as code
  ),
  team as (
    select t.id, t.code
    from public.scd_teams t
    cross join org
    cross join code
    join public.scd_seasons s on s.id = t.season_id and s.active
    where t.organization_id = org.id and t.code = code.code and t.status = 'ACTIVE'
    order by t.created_at desc
    limit 1
  ),
  member as (
    select exists (
      select 1 from public.scd_memberships m, org
      where m.organization_id = org.id and m.user_id = (select auth.uid()) and m.active
    ) as yes
  ),
  rows as (
    select a.id, a.fanta_role, p.first_name, p.last_name,
      p.birth_date is not null and p.birth_date <= current_date - interval '18 years' as adult
    from team
    join public.scd_team_memberships tm on tm.team_id = team.id and tm.valid_to is null
    join public.scd_athletes a on a.id = tm.athlete_id
    join public.scd_people p on p.id = a.person_id
    where p.left_at is null and coalesce(p.status, 'ACTIVE') <> 'LEFT'
  )
  select jsonb_build_object(
    'team', coalesce((select code from team), (select code from code)),
    'count', (select count(*) from rows),
    'players', case
      when (select code from team) in ('prima', 'u19', 'u16', 'u15') then coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', r.id,
          'name', case when r.adult or (select yes from member)
            then trim(coalesce(r.first_name, '') || ' ' || coalesce(r.last_name, ''))
            else trim(coalesce(r.first_name, '') || ' ' || left(coalesce(r.last_name, ''), 1) || '.') end,
          'role', case when r.fanta_role in ('P', 'D', 'C', 'A') then r.fanta_role else null end,
          'adult', r.adult)
          order by r.last_name, r.first_name)
        from rows r), '[]'::jsonb)
      else '[]'::jsonb
    end);
$$;
revoke all on function public.scd_public_roster(text, text) from public;
grant execute on function public.scd_public_roster(text, text) to anon, authenticated;
