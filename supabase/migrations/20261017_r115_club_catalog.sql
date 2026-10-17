-- r115: data entry of Club House (platform 07), Convenzioni (platform 19) and club cards ("tessere"), 2026-10-17,
-- chat CLOUD range r110-r129 (r110, r113, r114 in use; r111/r112/r113 reported applied on SCD PULSE; r115 is the next
-- free number in the repository and in every remote branch on 17/10/2026).
-- STAGED: NOT APPLIED. Apply only after Francesco writes "applica r115". Never apply from an agent.
-- Requires: r35 (scd_has_org_role), r74 (scd_has_position), scd_organizations with slug. A guard stops the migration
-- if they are missing.
--
-- Why (Francesco, DG, 17/10/2026 12:22): «quando sarà pronta la piattaforma delle tessere, convenzioni e delle Club
-- House per lavorarci e iniziare a inserire tutto». Until today the three platforms were static code
-- (config/scd-club-cards.v1.json, lib/home-promos.ts CONVENZIONI = [], an unloaded price list in /tesoreria/club-house):
-- nobody at the club could enter anything. This adds ONE register for the three, written only from the gestionale.
--
-- What it adds:
--   1. scd_club_catalog: one row per entry. Platform CLUB_HOUSE: ORARIO (opening hours per site), LISTINO (price list
--      item), MENU_GRUPPI (group menu). Platform CONVENZIONI: CONVENZIONE (partner, offer, validity, how to use it,
--      category, cards that give access, link). Platform TESSERE: CARD_TIPO (another card or membership type),
--      CARD_VANTAGGIO (benefit of one or more of the three club cards), CARD_REGOLA (rule). The three club cards and
--      their activation amounts stay in config/scd-club-cards.v1.json (Direzione policy V1.2/V1.4): this register only
--      adds to them, it never duplicates them. Evening events of the Club House are NOT here: they are the r135
--      register "Attività in struttura" (area CLUB_HOUSE, kind ATTIVITA_SERALE), written through r137.
--      Status BOZZA / PUBBLICATA / ARCHIVIATA. Rows are never deleted (ARCHIVIATA instead).
--   2. scd_club_catalog_events: append-only audit (who, when, before/after). RLS on, no policies, no grants.
--   3. scd_club_catalog_writer(org, platform): the write gate (internal). Direzione (role DIRECTION, positions
--      presidente, direttore-generale) writes all three; CLUB_HOUSE also position responsabile-club-house; TESSERE also
--      role SECRETARIAT and position segreteria; CONVENZIONI only the Direzione. Mirror of lib/club-catalog.ts
--      CATALOG_WRITERS, kept equal by club-catalog.test.ts. Nobody's role or position is changed here.
--   4. scd_club_catalog_access(org) -> {platforms}: tells the page which editors to open (missing = not applied).
--   5. scd_club_catalog_list(org, platform): every row of a platform for its writers (42501 for anyone else).
--   6. scd_club_catalog_save(org, id, entry): create (id null) or change one row; validated input, one audit row
--      per real change, "unchanged" when nothing changes.
--   7. scd_public_club_catalog(org_slug): PUBLISHED rows inside their validity (Europe/Rome day), anyone. No author,
--      no audit, no drafts.
--
-- No personal data: titles and texts refuse e-mail addresses and phone numbers (a partner is reached through its https
-- link); no names of people are asked; no minors' data. Prices are entered by the club in euro cents; a missing price
-- stays null and the pages say "prezzo da confermare", never 0.
--
-- Engines: SOLDI (listino, menu gruppi and convenzioni make the Club House and the cards sell) and TEMPO (the
-- responsible enters once, every page reads the same row). Measure: published rows per platform
-- (scd_club_catalog where status = 'PUBBLICATA'), days from the first BOZZA to PUBBLICATA (scd_club_catalog_events),
-- public pages still showing "da confermare" trending to zero.
--
-- Additive only, idempotent (create if not exists / create or replace). Nothing existing is changed.
--
-- Rollback:
--   begin;
--   drop function if exists public.scd_public_club_catalog(text);
--   drop function if exists public.scd_club_catalog_save(uuid, uuid, jsonb);
--   drop function if exists public.scd_club_catalog_list(uuid, text);
--   drop function if exists public.scd_club_catalog_access(uuid);
--   drop function if exists public.scd_club_catalog_json(public.scd_club_catalog);
--   drop function if exists public.scd_club_catalog_clean(text, jsonb);
--   drop function if exists public.scd_club_catalog_writer(uuid, text);
--   drop trigger if exists scd_club_catalog_events_append_only on public.scd_club_catalog_events;
--   drop function if exists public.scd_club_catalog_events_block_change();
--   drop table if exists public.scd_club_catalog_events;
--   drop table if exists public.scd_club_catalog;
--   commit;

begin;

-- ---------------------------------------------------------------- 0. prerequisites (fail closed)
do $$
begin
  if to_regclass('public.scd_organizations') is null
     or to_regprocedure('public.scd_has_org_role(uuid, public.scd_role[])') is null
     or to_regprocedure('public.scd_has_position(uuid, text[])') is null then
    raise exception 'r115 prerequisites missing (scd_organizations, r35, r74)';
  end if;
end;
$$;

-- ---------------------------------------------------------------- 1. the register
create table if not exists public.scd_club_catalog (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id),
  platform text not null check (platform in ('CLUB_HOUSE','CONVENZIONI','TESSERE')),
  kind text not null check (kind in ('ORARIO','LISTINO','MENU_GRUPPI','CONVENZIONE','CARD_TIPO','CARD_VANTAGGIO','CARD_REGOLA')),
  site text check (site is null or site in ('COLICO','DERVIO')),
  category text check (category is null or category ~ '^[A-Z_]{2,30}$'),
  title text not null check (char_length(title) between 2 and 80),
  body text check (body is null or char_length(body) <= 600),
  how_to text check (how_to is null or char_length(how_to) <= 300),
  cards text[] not null default '{}'::text[] check (cards <@ array['tesserato','sostenitore','partner']::text[]),
  link_url text check (link_url is null or (char_length(link_url) <= 300 and link_url ~ '^https://[^[:space:]]+$')),
  price_cents integer check (price_cents is null or price_cents between 0 and 1000000),
  days text check (days is null or char_length(days) <= 60),
  opens time,
  closes time,
  valid_from date,
  valid_until date,
  status text not null default 'BOZZA' check (status in ('BOZZA','PUBBLICATA','ARCHIVIATA')),
  sort integer not null default 100 check (sort between 0 and 9999),
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  constraint scd_club_catalog_kind_platform check (
    (platform = 'CLUB_HOUSE' and kind in ('ORARIO','LISTINO','MENU_GRUPPI'))
    or (platform = 'CONVENZIONI' and kind = 'CONVENZIONE')
    or (platform = 'TESSERE' and kind in ('CARD_TIPO','CARD_VANTAGGIO','CARD_REGOLA'))),
  constraint scd_club_catalog_validity check (valid_from is null or valid_until is null or valid_until >= valid_from)
);
create index if not exists scd_club_catalog_idx on public.scd_club_catalog (organization_id, platform, status, sort);
alter table public.scd_club_catalog enable row level security;
revoke all on table public.scd_club_catalog from anon, authenticated;

-- ---------------------------------------------------------------- 2. audit (append-only)
create table if not exists public.scd_club_catalog_events (
  id bigint generated always as identity primary key,
  entry_id uuid not null references public.scd_club_catalog(id),
  organization_id uuid not null references public.scd_organizations(id),
  at timestamptz not null default now(),
  actor uuid,
  action text not null check (action in ('CREATE','UPDATE')),
  before jsonb,
  after jsonb not null
);
create index if not exists scd_club_catalog_events_idx on public.scd_club_catalog_events (organization_id, entry_id, at);
alter table public.scd_club_catalog_events enable row level security;
revoke all on table public.scd_club_catalog_events from anon, authenticated;

create or replace function public.scd_club_catalog_events_block_change()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  raise exception 'scd_club_catalog_events is append-only' using errcode = '42501';
end;
$$;
revoke all on function public.scd_club_catalog_events_block_change() from public, anon, authenticated;
create or replace trigger scd_club_catalog_events_append_only
  before update or delete on public.scd_club_catalog_events
  for each row execute function public.scd_club_catalog_events_block_change();

-- ---------------------------------------------------------------- 3. who may write
create or replace function public.scd_club_catalog_writer(p_organization_id uuid, p_platform text)
returns boolean
language sql
stable
set search_path to 'public'
as $$
  select public.scd_has_org_role(p_organization_id, array['DIRECTION']::public.scd_role[])
    or public.scd_has_position(p_organization_id, array['presidente','direttore-generale'])
    or (p_platform = 'CLUB_HOUSE' and public.scd_has_position(p_organization_id, array['responsabile-club-house']))
    or (p_platform = 'TESSERE' and (public.scd_has_org_role(p_organization_id, array['SECRETARIAT']::public.scd_role[])
          or public.scd_has_position(p_organization_id, array['segreteria'])));
$$;
revoke all on function public.scd_club_catalog_writer(uuid, text) from public, anon, authenticated;

create or replace function public.scd_club_catalog_access(p_organization_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  if auth.uid() is null then return jsonb_build_object('platforms', '[]'::jsonb); end if;
  return jsonb_build_object('platforms', coalesce((
    select jsonb_agg(p order by o)
    from unnest(array['CLUB_HOUSE','CONVENZIONI','TESSERE']) with ordinality as t(p, o)
    where public.scd_club_catalog_writer(p_organization_id, p)), '[]'::jsonb));
end;
$$;
revoke all on function public.scd_club_catalog_access(uuid) from public, anon;
grant execute on function public.scd_club_catalog_access(uuid) to authenticated;

-- ---------------------------------------------------------------- 4. input check (mirror of validateCatalogDraft)
-- Input: {kind, site, category, title, body, howTo, cards[], linkUrl, priceCents, days, opens 'HH:MM', closes 'HH:MM',
-- validFrom, validUntil 'YYYY-MM-DD', status, sort}. Answer: {"code": "..."} on the first problem, else clean values.
create or replace function public.scd_club_catalog_clean(p_platform text, p jsonb)
returns jsonb
language plpgsql
stable
set search_path to 'public'
as $$
declare
  v_kind text := coalesce(p->>'kind', '');
  v_site text := nullif(btrim(coalesce(p->>'site', '')), '');
  v_cat text := nullif(btrim(coalesce(p->>'category', '')), '');
  v_title text := btrim(coalesce(p->>'title', ''));
  v_body text := nullif(btrim(coalesce(p->>'body', '')), '');
  v_how text := nullif(btrim(coalesce(p->>'howTo', '')), '');
  v_link text := nullif(btrim(coalesce(p->>'linkUrl', '')), '');
  v_days text := nullif(btrim(coalesce(p->>'days', '')), '');
  v_opens text := nullif(btrim(coalesce(p->>'opens', '')), '');
  v_closes text := nullif(btrim(coalesce(p->>'closes', '')), '');
  v_from text := nullif(btrim(coalesce(p->>'validFrom', '')), '');
  v_until text := nullif(btrim(coalesce(p->>'validUntil', '')), '');
  v_status text := coalesce(nullif(p->>'status', ''), 'BOZZA');
  v_cards text[] := '{}'::text[];
  v_price integer;
  v_sort integer := 100;
  c_mail constant text := '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}';
  c_phone constant text := '(\+|00)?[0-9]([ ./-]?[0-9]){8,}';
  c_time constant text := '^([01][0-9]|2[0-3]):[0-5][0-9]$';
  c_day constant text := '^\d{4}-\d{2}-\d{2}$';
begin
  if p is null or jsonb_typeof(p) <> 'object' then return jsonb_build_object('code', 'input'); end if;
  if not ((p_platform = 'CLUB_HOUSE' and v_kind in ('ORARIO','LISTINO','MENU_GRUPPI'))
       or (p_platform = 'CONVENZIONI' and v_kind = 'CONVENZIONE')
       or (p_platform = 'TESSERE' and v_kind in ('CARD_TIPO','CARD_VANTAGGIO','CARD_REGOLA'))) then
    return jsonb_build_object('code', 'kind');
  end if;
  if v_status not in ('BOZZA','PUBBLICATA','ARCHIVIATA') then return jsonb_build_object('code', 'status'); end if;
  if char_length(v_title) not between 2 and 80 then return jsonb_build_object('code', 'title'); end if;
  if v_body is not null and char_length(v_body) > 600 then return jsonb_build_object('code', 'body'); end if;
  if v_how is not null and char_length(v_how) > 300 then return jsonb_build_object('code', 'how_to'); end if;
  if v_days is not null and char_length(v_days) > 60 then return jsonb_build_object('code', 'days'); end if;
  if concat_ws(' ', v_title, v_body, v_how, v_days) ~ c_mail or concat_ws(' ', v_title, v_body, v_how, v_days) ~ c_phone then
    return jsonb_build_object('code', 'contact');
  end if;
  if v_site is not null and v_site not in ('COLICO','DERVIO') then return jsonb_build_object('code', 'site'); end if;
  if v_link is not null and (char_length(v_link) > 300 or v_link !~ '^https://[^[:space:]]+$') then
    return jsonb_build_object('code', 'link');
  end if;
  -- cards: array of the three club cards, no repeats
  if p ? 'cards' and jsonb_typeof(p->'cards') not in ('array','null') then return jsonb_build_object('code', 'cards'); end if;
  if jsonb_typeof(p->'cards') = 'array' then
    if exists (select 1 from jsonb_array_elements(p->'cards') e where jsonb_typeof(e) <> 'string'
               or e #>> '{}' not in ('tesserato','sostenitore','partner')) then
      return jsonb_build_object('code', 'cards');
    end if;
    select coalesce(array_agg(distinct e order by e), '{}'::text[]) into v_cards from jsonb_array_elements_text(p->'cards') e;
  end if;
  -- price in euro cents, integer, or null (= da confermare)
  if p ? 'priceCents' and jsonb_typeof(p->'priceCents') not in ('number','null') then return jsonb_build_object('code', 'price'); end if;
  if jsonb_typeof(p->'priceCents') = 'number' then
    if (p->>'priceCents') !~ '^\d{1,7}$' or (p->>'priceCents')::integer > 1000000 then return jsonb_build_object('code', 'price'); end if;
    v_price := (p->>'priceCents')::integer;
  end if;
  if p ? 'sort' and jsonb_typeof(p->'sort') = 'number' then
    if (p->>'sort') !~ '^\d{1,4}$' then return jsonb_build_object('code', 'input'); end if;
    v_sort := (p->>'sort')::integer;
  end if;
  if (v_opens is not null and v_opens !~ c_time) or (v_closes is not null and v_closes !~ c_time) then
    return jsonb_build_object('code', 'time');
  end if;
  if (v_from is not null and v_from !~ c_day) or (v_until is not null and v_until !~ c_day) then
    return jsonb_build_object('code', 'date');
  end if;
  begin
    perform v_from::date, v_until::date;
  exception when others then
    return jsonb_build_object('code', 'date');
  end;
  if v_from is not null and v_until is not null and v_until::date < v_from::date then return jsonb_build_object('code', 'date'); end if;

  -- per kind: what is required and what must stay empty
  if v_kind = 'ORARIO' then
    if v_site is null then return jsonb_build_object('code', 'site'); end if;
    if v_days is null or char_length(v_days) < 2 then return jsonb_build_object('code', 'days'); end if;
    if v_opens is null or v_closes is null or v_opens = v_closes then return jsonb_build_object('code', 'time'); end if;
    v_cat := null; v_price := null; v_cards := '{}'::text[];
  elsif v_kind = 'LISTINO' then
    if coalesce(v_cat, '') not in ('BAR','CUCINA','MERCHANDISING') then return jsonb_build_object('code', 'category'); end if;
    v_opens := null; v_closes := null; v_days := null;
  elsif v_kind = 'MENU_GRUPPI' then
    if v_body is null then return jsonb_build_object('code', 'body'); end if;
    v_cat := null; v_opens := null; v_closes := null;
  elsif v_kind = 'CONVENZIONE' then
    if v_body is null then return jsonb_build_object('code', 'body'); end if;
    if coalesce(v_cat, '') not in ('RISTORAZIONE','SPORT_SALUTE','NEGOZI','SERVIZI','ALTRO') then
      return jsonb_build_object('code', 'category');
    end if;
    v_price := null; v_opens := null; v_closes := null; v_days := null;
  elsif v_kind = 'CARD_TIPO' then
    if v_body is null then return jsonb_build_object('code', 'body'); end if;
    v_cat := null; v_opens := null; v_closes := null; v_days := null; v_cards := '{}'::text[];
  elsif v_kind = 'CARD_VANTAGGIO' then
    if cardinality(v_cards) = 0 then return jsonb_build_object('code', 'cards'); end if;
    v_cat := null; v_price := null; v_opens := null; v_closes := null; v_days := null;
  elsif v_kind = 'CARD_REGOLA' then
    if v_body is null then return jsonb_build_object('code', 'body'); end if;
    v_cat := null; v_price := null; v_opens := null; v_closes := null; v_days := null;
  end if;

  return jsonb_build_object(
    'kind', v_kind, 'site', v_site, 'category', v_cat, 'title', v_title, 'body', v_body, 'howTo', v_how,
    'cards', to_jsonb(v_cards), 'linkUrl', v_link, 'priceCents', v_price, 'days', v_days,
    'opens', v_opens, 'closes', v_closes, 'validFrom', v_from, 'validUntil', v_until,
    'status', v_status, 'sort', v_sort);
end;
$$;
revoke all on function public.scd_club_catalog_clean(text, jsonb) from public, anon, authenticated;

-- The fields of a row as the app reads them (never created_by / updated_by).
create or replace function public.scd_club_catalog_json(r public.scd_club_catalog)
returns jsonb
language sql
immutable
set search_path to 'public'
as $$
  select jsonb_build_object('id', r.id, 'platform', r.platform, 'kind', r.kind, 'site', r.site, 'category', r.category,
    'title', r.title, 'body', r.body, 'howTo', r.how_to, 'cards', to_jsonb(r.cards), 'linkUrl', r.link_url,
    'priceCents', r.price_cents, 'days', r.days, 'opens', to_char(r.opens, 'HH24:MI'), 'closes', to_char(r.closes, 'HH24:MI'),
    'validFrom', r.valid_from, 'validUntil', r.valid_until, 'status', r.status, 'sort', r.sort, 'updatedAt', r.updated_at);
$$;
revoke all on function public.scd_club_catalog_json(public.scd_club_catalog) from public, anon, authenticated;

-- ---------------------------------------------------------------- 5. read for the writers
create or replace function public.scd_club_catalog_list(p_organization_id uuid, p_platform text)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  if auth.uid() is null or p_platform not in ('CLUB_HOUSE','CONVENZIONI','TESSERE')
     or not public.scd_club_catalog_writer(p_organization_id, p_platform) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return coalesce((select jsonb_agg(public.scd_club_catalog_json(c) order by c.status = 'ARCHIVIATA', c.kind, c.sort, c.title)
    from public.scd_club_catalog c
    where c.organization_id = p_organization_id and c.platform = p_platform), '[]'::jsonb);
end;
$$;
revoke all on function public.scd_club_catalog_list(uuid, text) from public, anon;
grant execute on function public.scd_club_catalog_list(uuid, text) to authenticated;

-- ---------------------------------------------------------------- 6. write (create or change)
create or replace function public.scd_club_catalog_save(p_organization_id uuid, p_id uuid, p_entry jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_platform text := coalesce(p_entry->>'platform', '');
  v jsonb;
  v_old public.scd_club_catalog;
  v_row public.scd_club_catalog;
  v_cards text[];
begin
  if p_id is not null then
    select * into v_old from public.scd_club_catalog where id = p_id and organization_id = p_organization_id for update;
    if not found then
      if auth.uid() is null or not public.scd_club_catalog_writer(p_organization_id, v_platform) then
        raise exception 'not allowed' using errcode = '42501';
      end if;
      return jsonb_build_object('ok', false, 'code', 'not_found');
    end if;
    v_platform := v_old.platform; -- a row never changes platform
  end if;
  if auth.uid() is null or v_platform not in ('CLUB_HOUSE','CONVENZIONI','TESSERE')
     or not public.scd_club_catalog_writer(p_organization_id, v_platform) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  v := public.scd_club_catalog_clean(v_platform, p_entry);
  if v ? 'code' then return jsonb_build_object('ok', false, 'code', v->>'code'); end if;
  select coalesce(array_agg(e), '{}'::text[]) into v_cards from jsonb_array_elements_text(v->'cards') e;

  if p_id is null then
    insert into public.scd_club_catalog (organization_id, platform, kind, site, category, title, body, how_to, cards,
      link_url, price_cents, days, opens, closes, valid_from, valid_until, status, sort, created_by, updated_by)
    values (p_organization_id, v_platform, v->>'kind', v->>'site', v->>'category', v->>'title', v->>'body', v->>'howTo',
      v_cards, v->>'linkUrl', (v->>'priceCents')::integer, v->>'days', (v->>'opens')::time, (v->>'closes')::time,
      (v->>'validFrom')::date, (v->>'validUntil')::date, v->>'status', (v->>'sort')::integer, auth.uid(), auth.uid())
    returning * into v_row;
    insert into public.scd_club_catalog_events (entry_id, organization_id, actor, action, before, after)
    values (v_row.id, p_organization_id, auth.uid(), 'CREATE', null, public.scd_club_catalog_json(v_row) - 'updatedAt');
    return jsonb_build_object('ok', true, 'id', v_row.id);
  end if;

  if v_old.kind is distinct from v->>'kind' then return jsonb_build_object('ok', false, 'code', 'kind'); end if;
  if v_old.site is not distinct from v->>'site' and v_old.category is not distinct from v->>'category'
     and v_old.title = v->>'title' and v_old.body is not distinct from v->>'body'
     and v_old.how_to is not distinct from v->>'howTo' and v_old.cards = v_cards
     and v_old.link_url is not distinct from v->>'linkUrl' and v_old.price_cents is not distinct from (v->>'priceCents')::integer
     and v_old.days is not distinct from v->>'days' and v_old.opens is not distinct from (v->>'opens')::time
     and v_old.closes is not distinct from (v->>'closes')::time and v_old.valid_from is not distinct from (v->>'validFrom')::date
     and v_old.valid_until is not distinct from (v->>'validUntil')::date and v_old.status = v->>'status'
     and v_old.sort = (v->>'sort')::integer then
    return jsonb_build_object('ok', true, 'id', p_id, 'unchanged', true);
  end if;
  update public.scd_club_catalog set
    site = v->>'site', category = v->>'category', title = v->>'title', body = v->>'body', how_to = v->>'howTo',
    cards = v_cards, link_url = v->>'linkUrl', price_cents = (v->>'priceCents')::integer, days = v->>'days',
    opens = (v->>'opens')::time, closes = (v->>'closes')::time, valid_from = (v->>'validFrom')::date,
    valid_until = (v->>'validUntil')::date, status = v->>'status', sort = (v->>'sort')::integer,
    updated_at = now(), updated_by = auth.uid()
  where id = p_id
  returning * into v_row;
  insert into public.scd_club_catalog_events (entry_id, organization_id, actor, action, before, after)
  values (p_id, p_organization_id, auth.uid(), 'UPDATE', public.scd_club_catalog_json(v_old) - 'updatedAt',
    public.scd_club_catalog_json(v_row) - 'updatedAt');
  return jsonb_build_object('ok', true, 'id', p_id);
end;
$$;
revoke all on function public.scd_club_catalog_save(uuid, uuid, jsonb) from public, anon;
grant execute on function public.scd_club_catalog_save(uuid, uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------- 7. public read (published, inside validity)
create or replace function public.scd_public_club_catalog(p_org_slug text)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce((select jsonb_agg(public.scd_club_catalog_json(c) - 'status' order by c.platform, c.kind, c.sort, c.title)
    from public.scd_club_catalog c
    where c.organization_id = (select o.id from public.scd_organizations o where o.slug = p_org_slug)
      and c.status = 'PUBBLICATA'
      and (c.valid_from is null or c.valid_from <= (now() at time zone 'Europe/Rome')::date)
      and (c.valid_until is null or c.valid_until >= (now() at time zone 'Europe/Rome')::date)), '[]'::jsonb);
$$;
revoke all on function public.scd_public_club_catalog(text) from public;
grant execute on function public.scd_public_club_catalog(text) to anon, authenticated;

commit;
