-- r145: «Prima pagina» of the public home written every morning by the Super Giornalista agent, 2026-10-17, chat PC
-- (range r130-r149; r143 and r144 are held by other branches).
-- STAGED: NOT APPLIED. Apply only after Francesco writes "applica r145". Never apply from an agent.
-- Target: SCD PULSE (ndevtxxijbcnskgysdit). Never on dfnwzwutvnwiitiffwvr.
-- Requires (r33, r51): scd_organizations, scd_has_org_role, scd_audit_events. A guard below stops the migration when
-- one of them is missing.
--
-- Why (Francesco, Direttore Generale, 17/10/2026 16:36 and 16:40; UD-187):
--   «io mi sono affidato ad un agente che avevo chiesto di creare e essere sempre sulla prima pagina web app ma non vedo
--   nulla». The agent "SCD Prima pagina · Super Giornalista" runs every morning at 07:53 but only writes a Google Doc;
--   nothing reached the app. Decision 16:40: the front page goes online by itself, VERIFIED items only; the Direzione
--   can switch a story off.
--
-- What it adds:
--   1. scd_front_page_items: the items of one Rome day (apertura, brevi, domanda, persone, sponsor, app). RLS on, no
--      policy: nobody reads or writes the table directly with anon or authenticated keys.
--   2. scd_front_page_publish(org_slug, day, items jsonb) -> integer: replaces the items of that day. Executable ONLY by
--      the service role / postgres (the morning agent through the Supabase connector). Validates every item: slot in the
--      list, title 1-80 chars, body 0-280, kicker 0-40, cta 0-30, href an internal path ("/..." without "//", "..",
--      spaces or a scheme), verified = true (DA CONFERMARE items are refused, never stored), source required.
--      Items the Direzione hid stay hidden when the agent republishes the same id the same day.
--   3. scd_public_front_page(org_slug, day) -> jsonb: the ONE public read (anon, authenticated): visible items of that
--      day, ordered by slot then position; only whitelisted fields, never the source or who hid what.
--   4. scd_front_page_hide(org_slug, item_id, day, hidden) -> boolean: the Direzione (role DIRECTION) switches a story
--      off or on again; one audit row with the item id only.
--
-- Security: SECURITY DEFINER with fixed search_path; anon can only execute 3. No personal data: the agent's rules
-- forbid minors' names, faces, birth dates; teams are named as groups. Additive and idempotent.
-- Engines: PERSONE (visitors find the story of the day and enter the app) and TEMPO (the club's day is told without
-- manual work). Measure: front-page items online per day; share of days with an apertura; app visits from the home.
--
-- Rollback (only on Francesco's explicit order):
--   begin;
--   drop function if exists public.scd_front_page_hide(text, text, date, boolean);
--   drop function if exists public.scd_public_front_page(text, date);
--   drop function if exists public.scd_front_page_publish(text, date, jsonb);
--   drop table if exists public.scd_front_page_items;
--   commit;

begin;

-- ---------------------------------------------------------------- 0. prerequisites (fail closed)
do $$
begin
  if to_regclass('public.scd_organizations') is null
     or to_regclass('public.scd_audit_events') is null
     or to_regprocedure('public.scd_has_org_role(uuid, public.scd_role[])') is null then
    raise exception 'r145 prerequisites missing (r33, r51)';
  end if;
end
$$;

-- ---------------------------------------------------------------- 1. table
create table if not exists public.scd_front_page_items (
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  day date not null,
  item_id text not null check (item_id ~ '^[a-z0-9][a-z0-9-]{0,63}$'),
  slot text not null check (slot in ('apertura', 'breve', 'domanda', 'persone', 'sponsor', 'app')),
  position smallint not null default 0 check (position between 0 and 20),
  kicker text not null default '' check (char_length(kicker) <= 40),
  title text not null check (char_length(title) between 1 and 80),
  body text not null default '' check (char_length(body) <= 280),
  cta text not null default '' check (char_length(cta) <= 30),
  href text not null default '' check (href = '' or (href ~ '^/[A-Za-z0-9/_#?=&.-]*$' and href !~ '//' and href !~ '\.\.')),
  options text[] not null default '{}' check (cardinality(options) <= 4),
  source text not null check (char_length(source) between 1 and 300),
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, day, item_id)
);

alter table public.scd_front_page_items enable row level security;
revoke all on table public.scd_front_page_items from public, anon, authenticated;

create index if not exists scd_front_page_items_day_idx
  on public.scd_front_page_items (organization_id, day);

-- ---------------------------------------------------------------- 2. publish (service role only)
create or replace function public.scd_front_page_publish(p_org_slug text, p_day date, p_items jsonb)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_org uuid;
  v_item jsonb;
  v_count integer := 0;
  v_hidden text[];
  v_options text[];
begin
  select id into v_org from public.scd_organizations where slug = p_org_slug;
  if v_org is null then
    raise exception 'front page: unknown organization';
  end if;
  if p_day is null or p_day < current_date - 1 or p_day > current_date + 7 then
    raise exception 'front page: day out of range';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 20 then
    raise exception 'front page: items must be an array of at most 20';
  end if;

  -- every item must be VERIFIED: DA CONFERMARE never reaches the table
  for v_item in select * from jsonb_array_elements(p_items) loop
    if coalesce((v_item->>'verified')::boolean, false) is not true then
      raise exception 'front page: item % is not verified', coalesce(v_item->>'id', '?');
    end if;
  end loop;

  select coalesce(array_agg(item_id), '{}') into v_hidden
  from public.scd_front_page_items
  where organization_id = v_org and day = p_day and hidden;

  delete from public.scd_front_page_items where organization_id = v_org and day = p_day;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select coalesce(array_agg(x), '{}') into v_options
    from jsonb_array_elements_text(coalesce(v_item->'options', '[]'::jsonb)) as x;
    insert into public.scd_front_page_items
      (organization_id, day, item_id, slot, position, kicker, title, body, cta, href, options, source, hidden)
    values (
      v_org, p_day,
      v_item->>'id',
      v_item->>'slot',
      coalesce((v_item->>'position')::smallint, v_count::smallint),
      coalesce(v_item->>'kicker', ''),
      v_item->>'title',
      coalesce(v_item->>'body', ''),
      coalesce(v_item->>'cta', ''),
      coalesce(v_item->>'href', ''),
      v_options,
      v_item->>'source',
      (v_item->>'id') = any (v_hidden)
    );
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.scd_front_page_publish(text, date, jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------- 3. public read (anon)
create or replace function public.scd_public_front_page(p_org_slug text, p_day date)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', i.item_id, 'slot', i.slot, 'kicker', i.kicker, 'title', i.title, 'body', i.body,
           'cta', i.cta, 'href', i.href, 'options', to_jsonb(i.options))
         order by array_position(array['apertura','breve','domanda','persone','sponsor','app'], i.slot), i.position, i.item_id),
         '[]'::jsonb)
  from public.scd_front_page_items i
  join public.scd_organizations o on o.id = i.organization_id and o.slug = p_org_slug
  where i.day = p_day and not i.hidden;
$$;

revoke all on function public.scd_public_front_page(text, date) from public;
grant execute on function public.scd_public_front_page(text, date) to anon, authenticated;

-- ---------------------------------------------------------------- 4. Direzione switches a story off / on
create or replace function public.scd_front_page_hide(p_org_slug text, p_item_id text, p_day date, p_hidden boolean)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_org uuid;
  v_rows integer;
begin
  select id into v_org from public.scd_organizations where slug = p_org_slug;
  if v_org is null or auth.uid() is null
     or not public.scd_has_org_role(v_org, array['DIRECTION']::public.scd_role[]) then
    raise exception 'front page: not allowed';
  end if;
  update public.scd_front_page_items
     set hidden = coalesce(p_hidden, true), updated_at = now()
   where organization_id = v_org and day = p_day and item_id = p_item_id;
  get diagnostics v_rows = row_count;
  if v_rows > 0 then
    insert into public.scd_audit_events (organization_id, actor_user_id, action, entity_type, entity_id, payload)
    values (v_org, auth.uid(), case when coalesce(p_hidden, true) then 'FRONT_PAGE_HIDE' else 'FRONT_PAGE_SHOW' end,
            'front_page_item', null, jsonb_build_object('item_id', p_item_id, 'day', p_day));
  end if;
  return v_rows > 0;
end;
$$;

revoke all on function public.scd_front_page_hide(text, text, date, boolean) from public, anon;
grant execute on function public.scd_front_page_hide(text, text, date, boolean) to authenticated;

commit;
