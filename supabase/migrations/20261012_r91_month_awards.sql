-- r91: Premi del mese (UD-094): per ogni squadra agonistica il giocatore più votato del mese precedente (somma dei voti
-- settimanali). Pubblico, solo per mesi chiusi. Stesse regole di nome dei minorenni della Top 11. Nessun premio in denaro.
create or replace function public.scd_month_awards(p_org_slug text, p_month date default null)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  with org as (select id from public.scd_organizations where slug = p_org_slug),
  mo as (select date_trunc('month', coalesce(p_month, (now() at time zone 'Europe/Rome')::date - interval '1 month'))::date as month_start),
  votes as (
    select t.code, v.athlete_id, count(*) n,
      case when p.birth_date <= current_date - interval '18 years' then trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, ''))
           else trim(coalesce(p.first_name, '') || ' ' || left(coalesce(p.last_name, ''), 1) || '.') end as name
    from public.scd_week_votes v
    cross join org
    cross join mo
    join public.scd_athletes a on a.id = v.athlete_id
    join public.scd_people p on p.id = a.person_id
    join public.scd_team_memberships tm on tm.athlete_id = a.id and tm.valid_to is null
    join public.scd_teams t on t.id = tm.team_id and t.code in ('prima','u19','u16','u15')
    where v.organization_id = org.id and v.week_start >= mo.month_start and v.week_start < mo.month_start + interval '1 month'
    group by t.code, v.athlete_id, p.first_name, p.last_name, p.birth_date
  ),
  ranked as (select *, row_number() over (partition by code order by n desc, name) rn from votes)
  select jsonb_build_object('month', (select month_start from mo),
    'closed', (select month_start from mo) < date_trunc('month', (now() at time zone 'Europe/Rome')::date)::date,
    'awards', case when (select month_start from mo) >= date_trunc('month', (now() at time zone 'Europe/Rome')::date)::date then '[]'::jsonb
      else coalesce((select jsonb_agg(jsonb_build_object('team', r.code, 'athleteId', r.athlete_id, 'name', r.name, 'votes', r.n) order by r.code) from ranked r where r.rn = 1), '[]'::jsonb) end);
$$;
revoke all on function public.scd_month_awards(text, date) from public;
grant execute on function public.scd_month_awards(text, date) to anon, authenticated;
