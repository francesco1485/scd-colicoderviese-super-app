-- r120: «Spegni notizia» — the Direzione's switch for the daily Prima pagina of the public home (UD-188), 2026-10-17,
-- chat CLOUD (range r110-r129; r116-r119 used).
-- STAGED: NOT APPLIED. Apply only after Francesco writes "applica r120". Never apply from an agent.
-- Target: SCD PULSE (ndevtxxijbcnskgysdit). Never on dfnwzwutvnwiitiffwvr.
-- Requires (r33, r51): scd_organizations, scd_has_org_role, scd_audit_events. A guard below stops the migration when
-- one of them is missing.
--
-- Why (Francesco, Direttore Generale, 17/10/2026 17:20 «Spegni notizia» → «Costruisci il pulsante»): the Super
-- Giornalista publishes the front page by itself every morning (UD-187, file front-page.json on data/front-page); the
-- Direzione needs one tap to switch a story, or the whole front page of the day, off and on again.
--
-- What it adds (no write path for any agent):
--   1. scd_front_page_switch: one row per switched-off item of a Rome day; item_id '*' = the whole front page.
--      RLS on, no policy, no direct grant.
--   2. scd_front_page_set_hidden(org_slug, day, item_id, hidden) -> boolean: DIRECTION only (auth.uid() +
--      scd_has_org_role). hidden=true inserts the row, false deletes it. One audit row with item id and day only.
--   3. scd_public_front_page_hidden(org_slug, day) -> jsonb array of item ids: the ONE public read (anon,
--      authenticated), used by the server to filter the file before the page. Ids only, never who or when.
--
-- Security: SECURITY DEFINER with fixed search_path; anon can only execute 3. The day must be within yesterday..+7.
-- Engine: PERSONE (the Direzione keeps control of what the club says in public). Measure: switch-offs per week.
-- Additive and idempotent.
--
-- Rollback (only on Francesco's explicit order):
--   begin;
--   drop function if exists public.scd_public_front_page_hidden(text, date);
--   drop function if exists public.scd_front_page_set_hidden(text, date, text, boolean);
--   drop table if exists public.scd_front_page_switch;
--   commit;

begin;

do $$
begin
  if to_regclass('public.scd_organizations') is null
     or to_regclass('public.scd_audit_events') is null
     or to_regprocedure('public.scd_has_org_role(uuid, public.scd_role[])') is null then
    raise exception 'r120 prerequisites missing (r33, r51)';
  end if;
end
$$;

create table if not exists public.scd_front_page_switch (
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  day date not null,
  item_id text not null check (item_id = '*' or item_id ~ '^[a-z0-9][a-z0-9-]{0,63}$'),
  created_at timestamptz not null default now(),
  primary key (organization_id, day, item_id)
);

alter table public.scd_front_page_switch enable row level security;
revoke all on table public.scd_front_page_switch from public, anon, authenticated;

create or replace function public.scd_front_page_set_hidden(p_org_slug text, p_day date, p_item_id text, p_hidden boolean)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_org uuid;
begin
  select id into v_org from public.scd_organizations where slug = p_org_slug;
  if v_org is null or auth.uid() is null
     or not public.scd_has_org_role(v_org, array['DIRECTION']::public.scd_role[]) then
    raise exception 'front page switch: not allowed';
  end if;
  if p_day is null or p_day < current_date - 1 or p_day > current_date + 7 then
    raise exception 'front page switch: day out of range';
  end if;
  if p_item_id is null or not (p_item_id = '*' or p_item_id ~ '^[a-z0-9][a-z0-9-]{0,63}$') then
    raise exception 'front page switch: bad item';
  end if;
  if coalesce(p_hidden, true) then
    insert into public.scd_front_page_switch (organization_id, day, item_id)
    values (v_org, p_day, p_item_id)
    on conflict do nothing;
  else
    delete from public.scd_front_page_switch
     where organization_id = v_org and day = p_day and item_id = p_item_id;
  end if;
  insert into public.scd_audit_events (organization_id, actor_user_id, action, entity_type, entity_id, payload)
  values (v_org, auth.uid(), case when coalesce(p_hidden, true) then 'FRONT_PAGE_HIDE' else 'FRONT_PAGE_SHOW' end,
          'front_page_item', null, jsonb_build_object('item_id', p_item_id, 'day', p_day));
  return true;
end;
$$;

revoke all on function public.scd_front_page_set_hidden(text, date, text, boolean) from public, anon;
grant execute on function public.scd_front_page_set_hidden(text, date, text, boolean) to authenticated;

create or replace function public.scd_public_front_page_hidden(p_org_slug text, p_day date)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(jsonb_agg(s.item_id order by s.item_id), '[]'::jsonb)
  from public.scd_front_page_switch s
  join public.scd_organizations o on o.id = s.organization_id and o.slug = p_org_slug
  where s.day = p_day;
$$;

revoke all on function public.scd_public_front_page_hidden(text, date) from public;
grant execute on function public.scd_public_front_page_hidden(text, date) to anon, authenticated;

commit;
