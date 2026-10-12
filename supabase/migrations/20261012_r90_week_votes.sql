-- r90: "Top 11 della settimana" votata dai tesserati (UD-094). Candidati: atleti in rosa delle squadre agonistiche
-- (prima, u19, u16, u15) che sono maggiorenni oppure hanno il consenso IMMAGINE_NOME registrato e non revocato
-- (scd_person_consents). Attività di base mai (SGS CU n.2 2026/27: niente classifiche individuali). Ogni tesserato ha
-- 3 voti a settimana (lunedì-domenica, Europe/Rome). I conteggi della settimana in corso restano chiusi; la Top 11
-- esce il lunedì per la settimana precedente. Nomi: solo nome e iniziale del cognome per i minorenni.

create table if not exists public.scd_week_votes (
  organization_id uuid not null references public.scd_organizations(id),
  week_start date not null,
  voter uuid not null,
  athlete_id uuid not null references public.scd_athletes(id),
  created_at timestamptz not null default now(),
  primary key (organization_id, week_start, voter, athlete_id)
);
create index if not exists scd_week_votes_week on public.scd_week_votes (organization_id, week_start, athlete_id);
alter table public.scd_week_votes enable row level security;
revoke all on table public.scd_week_votes from anon, authenticated;

create or replace function public.scd_week_start(p_day date default (now() at time zone 'Europe/Rome')::date)
returns date language sql immutable as $$
  select p_day - ((extract(isodow from p_day)::int) - 1);
$$;

-- Candidates the vote may show (names only as allowed). Any active member.
create or replace function public.scd_vote_candidates(p_organization_id uuid)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select case when auth.uid() is null or not exists (select 1 from public.scd_memberships m
      where m.organization_id = p_organization_id and m.user_id = (select auth.uid()) and m.active) then '[]'::jsonb
  else coalesce((select jsonb_agg(jsonb_build_object(
      'athleteId', a.id, 'team', t.code,
      'name', case when p.birth_date <= current_date - interval '18 years'
        then trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, ''))
        else trim(coalesce(p.first_name, '') || ' ' || left(coalesce(p.last_name, ''), 1) || '.') end,
      'adult', p.birth_date <= current_date - interval '18 years')
      order by t.code, p.last_name, p.first_name)
    from public.scd_team_memberships tm
    join public.scd_teams t on t.id = tm.team_id and t.organization_id = p_organization_id and t.code in ('prima','u19','u16','u15')
    join public.scd_athletes a on a.id = tm.athlete_id
    join public.scd_people p on p.id = a.person_id
    where tm.valid_to is null and p.birth_date is not null
      and (p.birth_date <= current_date - interval '18 years'
        or exists (select 1 from public.scd_person_consents c where c.person_id = p.id and c.consent_type = 'IMMAGINE_NOME'
                   and c.granted and c.revoked_at is null))), '[]'::jsonb)
  end;
$$;
revoke all on function public.scd_vote_candidates(uuid) from public, anon;
grant execute on function public.scd_vote_candidates(uuid) to authenticated;

create or replace function public.scd_my_week_votes(p_organization_id uuid)
returns jsonb language sql stable security definer set search_path to 'public' as $$
  select coalesce((select jsonb_agg(v.athlete_id) from public.scd_week_votes v
    where v.organization_id = p_organization_id and v.voter = (select auth.uid()) and v.week_start = public.scd_week_start()), '[]'::jsonb);
$$;
revoke all on function public.scd_my_week_votes(uuid) from public, anon;
grant execute on function public.scd_my_week_votes(uuid) to authenticated;

-- Cast or withdraw one vote of the current week. Max 3 per voter per week; only candidates of the list above.
create or replace function public.scd_cast_week_vote(p_organization_id uuid, p_athlete_id uuid, p_on boolean)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_week date := public.scd_week_start();
  v_count int;
begin
  if auth.uid() is null or not exists (select 1 from public.scd_memberships m
      where m.organization_id = p_organization_id and m.user_id = auth.uid() and m.active) then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  if not p_on then
    delete from public.scd_week_votes where organization_id = p_organization_id and week_start = v_week and voter = auth.uid() and athlete_id = p_athlete_id;
    return jsonb_build_object('ok', true, 'on', false);
  end if;
  if not exists (select 1 from jsonb_array_elements(public.scd_vote_candidates(p_organization_id)) c where (c->>'athleteId')::uuid = p_athlete_id) then
    return jsonb_build_object('ok', false, 'code', 'candidate');
  end if;
  select count(*) into v_count from public.scd_week_votes where organization_id = p_organization_id and week_start = v_week and voter = auth.uid();
  if v_count >= 3 and not exists (select 1 from public.scd_week_votes where organization_id = p_organization_id and week_start = v_week and voter = auth.uid() and athlete_id = p_athlete_id) then
    return jsonb_build_object('ok', false, 'code', 'limit');
  end if;
  insert into public.scd_week_votes (organization_id, week_start, voter, athlete_id) values (p_organization_id, v_week, auth.uid(), p_athlete_id)
    on conflict do nothing;
  return jsonb_build_object('ok', true, 'on', true);
end;
$$;
revoke all on function public.scd_cast_week_vote(uuid, uuid, boolean) from public, anon;
grant execute on function public.scd_cast_week_vote(uuid, uuid, boolean) to authenticated;

-- Top 11 of a closed week (public). The current week returns an empty list: the vote is still open.
create or replace function public.scd_top11(p_org_slug text, p_week_start date default null)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  with org as (select id from public.scd_organizations where slug = p_org_slug),
  wk as (select coalesce(p_week_start, public.scd_week_start() - 7) as week_start)
  select jsonb_build_object('weekStart', (select week_start from wk), 'closed', (select week_start from wk) < public.scd_week_start(),
    'voters', (select count(distinct v.voter) from public.scd_week_votes v, org, wk where v.organization_id = org.id and v.week_start = wk.week_start),
    'top', case when (select week_start from wk) >= public.scd_week_start() then '[]'::jsonb else coalesce((
      select jsonb_agg(jsonb_build_object('athleteId', x.athlete_id, 'team', x.code, 'name', x.name, 'votes', x.n) order by x.n desc, x.name)
      from (
        select v.athlete_id, t.code, count(*) n,
          case when p.birth_date <= current_date - interval '18 years' then trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, ''))
               else trim(coalesce(p.first_name, '') || ' ' || left(coalesce(p.last_name, ''), 1) || '.') end as name
        from public.scd_week_votes v
        cross join org
        cross join wk
        join public.scd_athletes a on a.id = v.athlete_id
        join public.scd_people p on p.id = a.person_id
        join public.scd_team_memberships tm on tm.athlete_id = a.id and tm.valid_to is null
        join public.scd_teams t on t.id = tm.team_id and t.code in ('prima','u19','u16','u15')
        where v.organization_id = org.id and v.week_start = wk.week_start
        group by v.athlete_id, t.code, p.first_name, p.last_name, p.birth_date
        order by n desc limit 11) x), '[]'::jsonb) end);
$$;
revoke all on function public.scd_top11(text, date) from public;
grant execute on function public.scd_top11(text, date) to anon, authenticated;
