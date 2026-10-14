-- r102: "Lotteria dello sport" (Direzione 2026-10-14, UD-115). STAGED: written, NOT applied.
-- Apply only after the Direzione's explicit OK ("serve l'OK della Direzione per applicare r102").
-- Requires r100 (scd_can): the migration stops with an error if r100 is not applied first.
--
-- A short charity initiative ending with a day dedicated to all sports; ALL proceeds go to works on the calcetto
-- pitch of the parish church. Name, dates, prices, prizes and partners come later: no row is inserted here.
-- Legal frame (D.P.R. 430/2001, manifestazioni di sorte locali), enforced where it is a hard number:
--   * lotteria / pesca: tickets total value (price x quantity) <= 51.645,69 EUR (check constraint);
--   * tombola: total prize value <= 12.911,42 EUR (checked when a prize is saved);
--   * prizes are goods or services only: money, precious metal bars, securities, credit cards and bank instruments
--     are refused (scd_lottery_prize_forbidden, same patterns as apps/superapp/src/lib/lottery.ts, kept in sync by
--     apps/superapp/src/lib/lottery.test.ts);
--   * a ticket wins only if its register was returned and it is not among the unsold; registers not returned are void;
--   * winning numbers become public only after the Direzione confirms them; the public page only after the Direzione
--     publishes it.
-- Access (UD-112 sections, r100): read and write = scd_can('direzione','READ') or scd_can('tesoreria','READ');
-- publication and confirmation of the winners = active Direzione membership only. Every write goes through a
-- SECURITY DEFINER function and is written to scd_lottery_audit. No documents are stored: protocol numbers are text.
-- No sale, payment or gambling mechanic exists in the app: proceeds are entered by hand by the treasury. Additive only.

do $$
begin
  if to_regprocedure('public.scd_can(text,text,uuid,uuid,text,uuid)') is null then
    raise exception 'r102 needs r100 (scd_can): apply 20261014_r100_person_grants.sql first';
  end if;
end;
$$;

-- 1. Tables ------------------------------------------------------------------------------------------------------

create table if not exists public.scd_lotteries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  kind text not null default 'LOTTERIA' check (kind in ('LOTTERIA','TOMBOLA','PESCA')),
  title text not null default '' check (char_length(title) <= 120),
  beneficiary text not null check (char_length(beneficiary) between 3 and 400),
  sale_from date,
  sale_until date,
  draw_date date,
  draw_time time,
  draw_place text not null default '' check (char_length(draw_place) <= 200),
  draw_comune text not null default '' check (char_length(draw_comune) <= 80),
  sport_day date,
  sport_day_place text not null default '' check (char_length(sport_day_place) <= 200),
  ticket_price_cents integer check (ticket_price_cents is null or ticket_price_cents > 0),
  tickets_total integer check (tickets_total is null or tickets_total > 0),
  prizes_display_place text not null default '' check (char_length(prizes_display_place) <= 200),
  prize_delivery_place text not null default '' check (char_length(prize_delivery_place) <= 200),
  prize_delivery_until date,
  sale_points text not null default '' check (char_length(sale_points) <= 600),
  draw_order text check (draw_order in ('DAL_PRIMO','DALL_ULTIMO')),
  goal_cents integer check (goal_cents is null or goal_cents > 0),
  published_on date,
  published_by uuid references auth.users(id) on delete set null,
  winners_confirmed_on date,
  winners_confirmed_by uuid references auth.users(id) on delete set null,
  archived_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint scd_lotteries_ticket_cap check (
    kind = 'TOMBOLA' or ticket_price_cents is null or tickets_total is null
    or ticket_price_cents::bigint * tickets_total::bigint <= 5164569),
  constraint scd_lotteries_sale_order check (sale_from is null or sale_until is null or sale_from <= sale_until),
  constraint scd_lotteries_sale_before_draw check (sale_until is null or draw_date is null or sale_until <= draw_date),
  constraint scd_lotteries_delivery_after_draw check (prize_delivery_until is null or draw_date is null or prize_delivery_until >= draw_date)
);
create index if not exists scd_lotteries_org_idx on public.scd_lotteries(organization_id, archived_at);
comment on table public.scd_lotteries is
  'UD-115: charity lotteria / tombola / pesca of the club (D.P.R. 430/2001). Written only by SECURITY DEFINER functions.';

create table if not exists public.scd_lottery_series (
  id uuid primary key default gen_random_uuid(),
  lottery_id uuid not null references public.scd_lotteries(id) on delete cascade,
  series text not null check (series ~ '^[A-Z]{1,3}$'),
  first_number integer not null check (first_number >= 1),
  last_number integer not null,
  constraint scd_lottery_series_range check (last_number >= first_number),
  unique (lottery_id, series)
);

create table if not exists public.scd_lottery_compliance (
  lottery_id uuid not null references public.scd_lotteries(id) on delete cascade,
  item_code text not null check (item_code ~ '^[A-Z0-9_]{2,40}$'),
  status text not null default 'DA_FARE' check (status in ('DA_FARE','IN_CORSO','FATTO','NON_RICHIESTO')),
  protocol text not null default '' check (char_length(protocol) <= 120),
  done_on date,
  note text not null default '' check (char_length(note) <= 400),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (lottery_id, item_code)
);

create table if not exists public.scd_lottery_prizes (
  id uuid primary key default gen_random_uuid(),
  lottery_id uuid not null references public.scd_lotteries(id) on delete cascade,
  rank integer not null check (rank >= 1),
  description text not null check (char_length(description) between 2 and 300),
  category text not null check (category in ('BENE','SERVIZIO')),
  origin text not null check (origin in ('DONATO','ACQUISTATO')),
  sponsor_slug text check (sponsor_slug is null or sponsor_slug ~ '^[a-z0-9-]{2,60}$'),
  donor_text text not null default '' check (char_length(donor_text) <= 120),
  declared_value_cents integer check (declared_value_cents is null or declared_value_cents >= 0),
  removed_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists scd_lottery_prizes_rank_idx on public.scd_lottery_prizes(lottery_id, rank) where removed_at is null;

create table if not exists public.scd_lottery_blocks (
  id uuid primary key default gen_random_uuid(),
  lottery_id uuid not null references public.scd_lotteries(id) on delete cascade,
  series text not null,
  from_number integer not null check (from_number >= 1),
  to_number integer not null,
  seller text not null check (char_length(seller) between 2 and 80),
  seller_adult_confirmed boolean not null check (seller_adult_confirmed),
  assigned_on date,
  status text not null default 'ASSEGNATO' check (status in ('ASSEGNATO','RESTITUITO','NON_RESTITUITO')),
  unsold jsonb not null default '[]'::jsonb check (jsonb_typeof(unsold) = 'array'),
  collected_cents integer check (collected_cents is null or collected_cents >= 0),
  note text not null default '' check (char_length(note) <= 300),
  removed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint scd_lottery_blocks_range check (to_number >= from_number),
  constraint scd_lottery_blocks_unsold_only_returned check (status = 'RESTITUITO' or unsold = '[]'::jsonb)
);
create index if not exists scd_lottery_blocks_lottery_idx on public.scd_lottery_blocks(lottery_id, series) where removed_at is null;

create table if not exists public.scd_lottery_draws (
  id uuid primary key default gen_random_uuid(),
  lottery_id uuid not null references public.scd_lotteries(id) on delete cascade,
  draw_order integer not null check (draw_order >= 1),
  series text not null,
  number integer not null check (number >= 1),
  state text not null check (state in ('VALIDO','NULLO','INVENDUTO','FUORI_BLOCCO','NON_EMESSO')),
  prize_id uuid references public.scd_lottery_prizes(id),
  drawn_at timestamptz not null default now(),
  recorded_by uuid references auth.users(id) on delete set null,
  constraint scd_lottery_draws_prize_only_valid check ((state = 'VALIDO') = (prize_id is not null)),
  unique (lottery_id, draw_order),
  unique (lottery_id, series, number)
);
create unique index if not exists scd_lottery_draws_prize_idx on public.scd_lottery_draws(prize_id) where prize_id is not null;

create table if not exists public.scd_lottery_ledger (
  id uuid primary key default gen_random_uuid(),
  lottery_id uuid not null references public.scd_lotteries(id) on delete cascade,
  kind text not null check (kind in ('INCASSO','COSTO')),
  label text not null check (char_length(label) between 2 and 200),
  amount_cents integer not null check (amount_cents > 0),
  entry_date date not null,
  cancelled_at timestamptz,
  cancelled_by uuid references auth.users(id) on delete set null,
  cancel_reason text check (cancel_reason is null or char_length(cancel_reason) <= 200),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists scd_lottery_ledger_lottery_idx on public.scd_lottery_ledger(lottery_id);

create table if not exists public.scd_lottery_audit (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  lottery_id uuid references public.scd_lotteries(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null check (action in (
    'SAVE_SETUP','SET_SERIES','SET_COMPLIANCE','SAVE_PRIZE','REMOVE_PRIZE','SAVE_BLOCK','REMOVE_BLOCK',
    'RECORD_DRAW','UNDO_DRAW','ADD_LEDGER','CANCEL_LEDGER','PUBLISH','UNPUBLISH','CONFIRM_WINNERS')),
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists scd_lottery_audit_lottery_idx on public.scd_lottery_audit(lottery_id, created_at desc);

-- 2. Who may act ---------------------------------------------------------------------------------------------------

-- 'DIREZIONE' (everything, publication included), 'EDITOR' (read and write), or null.
create or replace function public.scd_lottery_actor(p_organization_id uuid)
returns text
language sql
stable
security definer
set search_path to 'public'
as $$
  select case
    when (select auth.uid()) is null then null
    when public.scd_has_org_role(p_organization_id, array['DIRECTION']::public.scd_role[]) then 'DIREZIONE'
    when public.scd_can('direzione', 'READ', p_organization_id) or public.scd_can('tesoreria', 'READ', p_organization_id) then 'EDITOR'
    else null end;
$$;

-- Returns the lottery's organisation or raises 42501. p_need: 'WRITE' or 'DIREZIONE'.
create or replace function public.scd_lottery_guard(p_lottery_id uuid, p_need text)
returns uuid
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_org uuid;
  v_actor text;
begin
  select organization_id into v_org from public.scd_lotteries where id = p_lottery_id and archived_at is null;
  if v_org is null then raise exception 'lottery not found' using errcode = 'P0002'; end if;
  v_actor := public.scd_lottery_actor(v_org);
  if v_actor is null or (p_need = 'DIREZIONE' and v_actor <> 'DIREZIONE') then
    raise exception 'lottery: not allowed' using errcode = '42501';
  end if;
  return v_org;
end;
$$;

create or replace function public.scd_lottery_log(p_organization_id uuid, p_lottery_id uuid, p_action text, p_detail jsonb)
returns void
language sql
volatile
security definer
set search_path to 'public'
as $$
  insert into public.scd_lottery_audit (organization_id, lottery_id, actor_user_id, action, detail)
  values (p_organization_id, p_lottery_id, (select auth.uid()), p_action, coalesce(p_detail, '{}'::jsonb));
$$;

-- Forbidden prize text (goods and services only). Same patterns as lottery.ts FORBIDDEN (\m \M = word bounds).
create or replace function public.scd_lottery_prize_forbidden(p_text text)
returns boolean
language sql
immutable
set search_path to 'public'
as $$
  select exists (
    select 1
    from unnest(array[
      $re$\m(denaro|contant[ie]|soldi|banconot[ae]|premio in euro|euro in contanti|cash)\M$re$,
      $re$\m(lingott[oi]|barr[ae] d'(oro|argento)|(oro|argento|platino) in barr[ae]|metall[oi] prezios[oi] in barr[ae])\M$re$,
      $re$\m(titol[oi] (di stato|azionari|obbligazionari)|azioni (di|della|societarie)|obbligazion[ei]|btp|buon[oi] (del tesoro|fruttifer[oi]|postal[ei]))\M$re$,
      $re$\m(cart[ae] di credito|cart[ae] di debito|cart[ae] prepagat[ae]|prepagat[ae]|bancomat)\M$re$,
      $re$\m(assegn[oi]( circolar[ei]| bancar[io])?|bonific[oi]|librett[oi] (di risparmio|postal[ei])|conto corrente|deposito bancario|polizz[ae] di (investimento|capitalizzazione))\M$re$
    ]) as re
    where translate(lower(coalesce(p_text, '')), 'àáèéìíòóùú’`', 'aaeeiioouu''''') ~ re
  );
$$;

-- 3. Setup -------------------------------------------------------------------------------------------------------

-- Creates (p_lottery_id null) or updates the setup. p_setup keys as in lottery.ts LotterySetup (camelCase).
create or replace function public.scd_lottery_save_setup(p_organization_id uuid, p_lottery_id uuid, p_setup jsonb)
returns uuid
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_id uuid := p_lottery_id;
  v_org uuid;
  v_kind text := coalesce(p_setup->>'kind', 'LOTTERIA');
  v_sold boolean;
begin
  if p_setup is null or jsonb_typeof(p_setup) <> 'object' then raise exception 'setup must be an object' using errcode = '22023'; end if;
  if v_id is null then
    if public.scd_lottery_actor(p_organization_id) is null then raise exception 'lottery: not allowed' using errcode = '42501'; end if;
    v_org := p_organization_id;
  else
    v_org := public.scd_lottery_guard(v_id, 'WRITE');
    if v_org <> p_organization_id then raise exception 'lottery: wrong organization' using errcode = '42501'; end if;
    select exists (select 1 from public.scd_lottery_draws where lottery_id = v_id) into v_sold;
    if v_sold then raise exception 'lottery: draw already started' using errcode = '22023'; end if;
    -- Once registers are out, the tickets issued no longer change (the numbering plan depends on them).
    if exists (select 1 from public.scd_lottery_blocks where lottery_id = v_id and removed_at is null)
       and (select tickets_total from public.scd_lotteries where id = v_id) is distinct from nullif(p_setup->>'ticketsTotal', '')::integer then
      raise exception 'lottery: blocks already assigned' using errcode = '22023';
    end if;
  end if;

  if v_id is null then
    insert into public.scd_lotteries (organization_id, kind, beneficiary, created_by, updated_by)
    values (v_org, v_kind, coalesce(nullif(trim(p_setup->>'beneficiary'), ''), '-'), (select auth.uid()), (select auth.uid()))
    returning id into v_id;
  end if;

  update public.scd_lotteries set
    kind = v_kind,
    title = left(trim(coalesce(p_setup->>'title', '')), 120),
    beneficiary = trim(coalesce(p_setup->>'beneficiary', '')),
    sale_from = nullif(p_setup->>'saleFrom', '')::date,
    sale_until = nullif(p_setup->>'saleUntil', '')::date,
    draw_date = nullif(p_setup->>'drawDate', '')::date,
    draw_time = nullif(p_setup->>'drawTime', '')::time,
    draw_place = trim(coalesce(p_setup->>'drawPlace', '')),
    draw_comune = trim(coalesce(p_setup->>'drawComune', '')),
    sport_day = nullif(p_setup->>'sportDay', '')::date,
    sport_day_place = trim(coalesce(p_setup->>'sportDayPlace', '')),
    ticket_price_cents = nullif(p_setup->>'ticketPriceCents', '')::integer,
    tickets_total = nullif(p_setup->>'ticketsTotal', '')::integer,
    prizes_display_place = trim(coalesce(p_setup->>'prizesDisplayPlace', '')),
    prize_delivery_place = trim(coalesce(p_setup->>'prizeDeliveryPlace', '')),
    prize_delivery_until = nullif(p_setup->>'prizeDeliveryUntil', '')::date,
    sale_points = trim(coalesce(p_setup->>'salePoints', '')),
    draw_order = nullif(p_setup->>'drawOrder', ''),
    goal_cents = nullif(p_setup->>'goalCents', '')::integer,
    updated_by = (select auth.uid()),
    updated_at = now()
  where id = v_id;

  if v_kind = 'TOMBOLA' and (select coalesce(sum(declared_value_cents), 0) from public.scd_lottery_prizes
                             where lottery_id = v_id and removed_at is null) > 1291142 then
    raise exception 'tombola prize cap' using errcode = '22023';
  end if;
  perform public.scd_lottery_log(v_org, v_id, 'SAVE_SETUP', p_setup);
  return v_id;
end;
$$;

-- Replaces the numbering plan. Refused once a block is assigned.
create or replace function public.scd_lottery_set_series(p_lottery_id uuid, p_series jsonb)
returns integer
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_org uuid := public.scd_lottery_guard(p_lottery_id, 'WRITE');
  v_total integer;
  v_sum integer;
  v_n integer;
begin
  if p_series is null or jsonb_typeof(p_series) <> 'array' then raise exception 'series must be an array' using errcode = '22023'; end if;
  if exists (select 1 from public.scd_lottery_blocks where lottery_id = p_lottery_id and removed_at is null) then
    raise exception 'lottery: blocks already assigned' using errcode = '22023';
  end if;
  select tickets_total into v_total from public.scd_lotteries where id = p_lottery_id;
  select coalesce(sum((x->>'last')::integer - (x->>'first')::integer + 1), 0), count(*)
    into v_sum, v_n from jsonb_array_elements(p_series) x;
  if v_total is not null and v_n > 0 and v_sum <> v_total then
    raise exception 'series total % differs from tickets %', v_sum, v_total using errcode = '22023';
  end if;
  delete from public.scd_lottery_series where lottery_id = p_lottery_id;
  insert into public.scd_lottery_series (lottery_id, series, first_number, last_number)
  select p_lottery_id, x->>'series', (x->>'first')::integer, (x->>'last')::integer from jsonb_array_elements(p_series) x;
  perform public.scd_lottery_log(v_org, p_lottery_id, 'SET_SERIES', jsonb_build_object('series', p_series));
  return v_n;
end;
$$;

create or replace function public.scd_lottery_set_compliance(
  p_lottery_id uuid, p_code text, p_status text, p_protocol text, p_done_on date, p_note text
)
returns void
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_org uuid := public.scd_lottery_guard(p_lottery_id, 'WRITE');
begin
  insert into public.scd_lottery_compliance (lottery_id, item_code, status, protocol, done_on, note, updated_by, updated_at)
  values (p_lottery_id, p_code, p_status, left(trim(coalesce(p_protocol, '')), 120), p_done_on, left(trim(coalesce(p_note, '')), 400), (select auth.uid()), now())
  on conflict (lottery_id, item_code) do update set
    status = excluded.status, protocol = excluded.protocol, done_on = excluded.done_on, note = excluded.note,
    updated_by = excluded.updated_by, updated_at = excluded.updated_at;
  perform public.scd_lottery_log(v_org, p_lottery_id, 'SET_COMPLIANCE',
    jsonb_build_object('code', p_code, 'status', p_status, 'protocol', p_protocol, 'done_on', p_done_on));
end;
$$;

-- 4. Prizes ------------------------------------------------------------------------------------------------------

create or replace function public.scd_lottery_save_prize(p_lottery_id uuid, p_prize_id uuid, p_prize jsonb)
returns uuid
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_org uuid := public.scd_lottery_guard(p_lottery_id, 'WRITE');
  v_id uuid := p_prize_id;
  v_desc text := trim(coalesce(p_prize->>'description', ''));
  v_kind text;
begin
  if exists (select 1 from public.scd_lottery_draws where lottery_id = p_lottery_id) then
    raise exception 'lottery: draw already started' using errcode = '22023';
  end if;
  if public.scd_lottery_prize_forbidden(v_desc) then raise exception 'prize forbidden' using errcode = '22023'; end if;
  if v_id is null then
    insert into public.scd_lottery_prizes (lottery_id, rank, description, category, origin, sponsor_slug, donor_text, declared_value_cents)
    values (p_lottery_id, (p_prize->>'rank')::integer, v_desc, p_prize->>'category', p_prize->>'origin',
            nullif(p_prize->>'sponsorSlug', ''), trim(coalesce(p_prize->>'donorText', '')), nullif(p_prize->>'declaredValueCents', '')::integer)
    returning id into v_id;
  else
    update public.scd_lottery_prizes set
      rank = (p_prize->>'rank')::integer, description = v_desc, category = p_prize->>'category', origin = p_prize->>'origin',
      sponsor_slug = nullif(p_prize->>'sponsorSlug', ''), donor_text = trim(coalesce(p_prize->>'donorText', '')),
      declared_value_cents = nullif(p_prize->>'declaredValueCents', '')::integer
    where id = v_id and lottery_id = p_lottery_id and removed_at is null;
    if not found then raise exception 'prize not found' using errcode = 'P0002'; end if;
  end if;
  select kind into v_kind from public.scd_lotteries where id = p_lottery_id;
  if v_kind = 'TOMBOLA' and (select coalesce(sum(declared_value_cents), 0) from public.scd_lottery_prizes
                             where lottery_id = p_lottery_id and removed_at is null) > 1291142 then
    raise exception 'tombola prize cap' using errcode = '22023';
  end if;
  perform public.scd_lottery_log(v_org, p_lottery_id, 'SAVE_PRIZE', jsonb_build_object('prize_id', v_id) || p_prize);
  return v_id;
end;
$$;

create or replace function public.scd_lottery_remove_prize(p_prize_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_lottery uuid;
  v_org uuid;
begin
  select lottery_id into v_lottery from public.scd_lottery_prizes where id = p_prize_id and removed_at is null;
  if v_lottery is null then raise exception 'prize not found' using errcode = 'P0002'; end if;
  v_org := public.scd_lottery_guard(v_lottery, 'WRITE');
  if exists (select 1 from public.scd_lottery_draws where lottery_id = v_lottery) then
    raise exception 'lottery: draw already started' using errcode = '22023';
  end if;
  update public.scd_lottery_prizes set removed_at = now() where id = p_prize_id;
  perform public.scd_lottery_log(v_org, v_lottery, 'REMOVE_PRIZE', jsonb_build_object('prize_id', p_prize_id));
end;
$$;

-- 5. Ticket register ---------------------------------------------------------------------------------------------

create or replace function public.scd_lottery_save_block(p_lottery_id uuid, p_block_id uuid, p_block jsonb)
returns uuid
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_org uuid := public.scd_lottery_guard(p_lottery_id, 'WRITE');
  v_id uuid := p_block_id;
  v_series text := p_block->>'series';
  v_from integer := (p_block->>'from')::integer;
  v_to integer := (p_block->>'to')::integer;
  v_status text := coalesce(p_block->>'status', 'ASSEGNATO');
  v_unsold jsonb := case when v_status = 'RESTITUITO' then coalesce(p_block->'unsold', '[]'::jsonb) else '[]'::jsonb end;
begin
  if exists (select 1 from public.scd_lottery_draws where lottery_id = p_lottery_id) then
    raise exception 'lottery: draw already started' using errcode = '22023';
  end if;
  if not exists (select 1 from public.scd_lottery_series s where s.lottery_id = p_lottery_id and s.series = v_series
                   and v_from >= s.first_number and v_to <= s.last_number) then
    raise exception 'block outside series' using errcode = '22023';
  end if;
  if exists (select 1 from public.scd_lottery_blocks b where b.lottery_id = p_lottery_id and b.removed_at is null
               and b.series = v_series and b.id is distinct from v_id and b.from_number <= v_to and v_from <= b.to_number) then
    raise exception 'block overlaps' using errcode = '22023';
  end if;
  if jsonb_typeof(v_unsold) <> 'array' or exists (
       select 1 from jsonb_array_elements(v_unsold) r
       where (r->>'from')::integer < v_from or (r->>'to')::integer > v_to or (r->>'to')::integer < (r->>'from')::integer) then
    raise exception 'unsold outside block' using errcode = '22023';
  end if;
  if v_id is null then
    insert into public.scd_lottery_blocks (lottery_id, series, from_number, to_number, seller, seller_adult_confirmed, assigned_on,
                                           status, unsold, collected_cents, note)
    values (p_lottery_id, v_series, v_from, v_to, trim(p_block->>'seller'), coalesce((p_block->>'sellerAdultConfirmed')::boolean, false),
            nullif(p_block->>'assignedOn', '')::date, v_status, v_unsold, nullif(p_block->>'collectedCents', '')::integer,
            left(trim(coalesce(p_block->>'note', '')), 300))
    returning id into v_id;
  else
    update public.scd_lottery_blocks set
      series = v_series, from_number = v_from, to_number = v_to, seller = trim(p_block->>'seller'),
      seller_adult_confirmed = coalesce((p_block->>'sellerAdultConfirmed')::boolean, false),
      assigned_on = nullif(p_block->>'assignedOn', '')::date, status = v_status, unsold = v_unsold,
      collected_cents = nullif(p_block->>'collectedCents', '')::integer, note = left(trim(coalesce(p_block->>'note', '')), 300),
      updated_at = now()
    where id = v_id and lottery_id = p_lottery_id and removed_at is null;
    if not found then raise exception 'block not found' using errcode = 'P0002'; end if;
  end if;
  perform public.scd_lottery_log(v_org, p_lottery_id, 'SAVE_BLOCK', jsonb_build_object('block_id', v_id) || p_block);
  return v_id;
end;
$$;

create or replace function public.scd_lottery_remove_block(p_block_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_lottery uuid;
  v_org uuid;
begin
  select lottery_id into v_lottery from public.scd_lottery_blocks where id = p_block_id and removed_at is null;
  if v_lottery is null then raise exception 'block not found' using errcode = 'P0002'; end if;
  v_org := public.scd_lottery_guard(v_lottery, 'WRITE');
  if exists (select 1 from public.scd_lottery_draws where lottery_id = v_lottery) then
    raise exception 'lottery: draw already started' using errcode = '22023';
  end if;
  update public.scd_lottery_blocks set removed_at = now() where id = p_block_id;
  perform public.scd_lottery_log(v_org, v_lottery, 'REMOVE_BLOCK', jsonb_build_object('block_id', p_block_id));
end;
$$;

-- Same rule as lottery.ts ticketState.
create or replace function public.scd_lottery_ticket_state(p_lottery_id uuid, p_series text, p_number integer)
returns text
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  b public.scd_lottery_blocks%rowtype;
begin
  if not exists (select 1 from public.scd_lottery_series where lottery_id = p_lottery_id and series = p_series
                   and p_number between first_number and last_number) then
    return 'NON_EMESSO';
  end if;
  select * into b from public.scd_lottery_blocks
  where lottery_id = p_lottery_id and removed_at is null and series = p_series and p_number between from_number and to_number
  limit 1;
  if not found then return 'FUORI_BLOCCO'; end if;
  if b.status = 'ASSEGNATO' then return 'DA_RICONCILIARE'; end if;
  if b.status = 'NON_RESTITUITO' then return 'NULLO'; end if;
  if exists (select 1 from jsonb_array_elements(b.unsold) r
             where p_number between (r->>'from')::integer and (r->>'to')::integer) then
    return 'INVENDUTO';
  end if;
  return 'VALIDO';
end;
$$;

-- 6. Draw --------------------------------------------------------------------------------------------------------

-- Records the next drawn ticket. Needs every register back (no block ASSEGNATO). A valid ticket wins the next prize in
-- the regolamento order; any other outcome is recorded and the draw is repeated.
create or replace function public.scd_lottery_record_draw(p_lottery_id uuid, p_series text, p_number integer)
returns jsonb
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_org uuid := public.scd_lottery_guard(p_lottery_id, 'WRITE');
  v_l public.scd_lotteries%rowtype;
  v_state text;
  v_prize uuid;
  v_order integer;
begin
  select * into v_l from public.scd_lotteries where id = p_lottery_id for update;
  if v_l.winners_confirmed_on is not null then raise exception 'lottery: winners already confirmed' using errcode = '22023'; end if;
  if exists (select 1 from public.scd_lottery_blocks where lottery_id = p_lottery_id and removed_at is null and status = 'ASSEGNATO') then
    raise exception 'lottery: registers still out' using errcode = '22023';
  end if;
  if exists (select 1 from public.scd_lottery_draws where lottery_id = p_lottery_id and series = p_series and number = p_number) then
    raise exception 'ticket already drawn' using errcode = '22023';
  end if;
  v_state := public.scd_lottery_ticket_state(p_lottery_id, p_series, p_number);
  if v_state = 'VALIDO' then
    select p.id into v_prize from public.scd_lottery_prizes p
    where p.lottery_id = p_lottery_id and p.removed_at is null
      and not exists (select 1 from public.scd_lottery_draws d where d.prize_id = p.id)
    order by case when v_l.draw_order = 'DALL_ULTIMO' then -p.rank else p.rank end
    limit 1;
    if v_prize is null then raise exception 'no prizes left' using errcode = '22023'; end if;
  end if;
  select coalesce(max(draw_order), 0) + 1 into v_order from public.scd_lottery_draws where lottery_id = p_lottery_id;
  insert into public.scd_lottery_draws (lottery_id, draw_order, series, number, state, prize_id, recorded_by)
  values (p_lottery_id, v_order, p_series, p_number, v_state, v_prize, (select auth.uid()));
  perform public.scd_lottery_log(v_org, p_lottery_id, 'RECORD_DRAW',
    jsonb_build_object('order', v_order, 'series', p_series, 'number', p_number, 'state', v_state, 'prize_id', v_prize));
  return jsonb_build_object('order', v_order, 'state', v_state, 'prize_id', v_prize);
end;
$$;

-- Removes the last recorded extraction (typing mistake), only before the winners are confirmed. Audited.
create or replace function public.scd_lottery_undo_last_draw(p_lottery_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_org uuid := public.scd_lottery_guard(p_lottery_id, 'WRITE');
  d public.scd_lottery_draws%rowtype;
begin
  if (select winners_confirmed_on from public.scd_lotteries where id = p_lottery_id) is not null then
    raise exception 'lottery: winners already confirmed' using errcode = '22023';
  end if;
  select * into d from public.scd_lottery_draws where lottery_id = p_lottery_id order by draw_order desc limit 1 for update;
  if not found then return; end if;
  delete from public.scd_lottery_draws where id = d.id;
  perform public.scd_lottery_log(v_org, p_lottery_id, 'UNDO_DRAW', to_jsonb(d));
end;
$$;

-- 7. Funds -------------------------------------------------------------------------------------------------------

create or replace function public.scd_lottery_add_ledger(p_lottery_id uuid, p_kind text, p_label text, p_amount_cents integer, p_entry_date date)
returns uuid
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_org uuid := public.scd_lottery_guard(p_lottery_id, 'WRITE');
  v_id uuid;
begin
  insert into public.scd_lottery_ledger (lottery_id, kind, label, amount_cents, entry_date, created_by)
  values (p_lottery_id, p_kind, trim(p_label), p_amount_cents, p_entry_date, (select auth.uid()))
  returning id into v_id;
  perform public.scd_lottery_log(v_org, p_lottery_id, 'ADD_LEDGER',
    jsonb_build_object('entry_id', v_id, 'kind', p_kind, 'label', p_label, 'amount_cents', p_amount_cents, 'entry_date', p_entry_date));
  return v_id;
end;
$$;

create or replace function public.scd_lottery_cancel_ledger(p_entry_id uuid, p_reason text)
returns void
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_lottery uuid;
  v_org uuid;
begin
  select lottery_id into v_lottery from public.scd_lottery_ledger where id = p_entry_id and cancelled_at is null;
  if v_lottery is null then raise exception 'entry not found' using errcode = 'P0002'; end if;
  v_org := public.scd_lottery_guard(v_lottery, 'WRITE');
  update public.scd_lottery_ledger
  set cancelled_at = now(), cancelled_by = (select auth.uid()), cancel_reason = left(trim(coalesce(p_reason, '')), 200)
  where id = p_entry_id;
  perform public.scd_lottery_log(v_org, v_lottery, 'CANCEL_LEDGER', jsonb_build_object('entry_id', p_entry_id, 'reason', p_reason));
end;
$$;

-- 8. Publication (Direzione only) --------------------------------------------------------------------------------

create or replace function public.scd_lottery_set_published(p_lottery_id uuid, p_published boolean)
returns void
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_org uuid := public.scd_lottery_guard(p_lottery_id, 'DIREZIONE');
  v_today date := (now() at time zone 'Europe/Rome')::date;
begin
  if p_published then
    if exists (select 1 from public.scd_lotteries where id = p_lottery_id
                 and (trim(title) = '' or draw_date is null or sport_day is null or trim(sale_points) = '')) then
      raise exception 'lottery: name, draw date, sport day and sale points are needed to publish' using errcode = '22023';
    end if;
    update public.scd_lotteries set published_on = v_today, published_by = (select auth.uid()) where id = p_lottery_id;
  else
    update public.scd_lotteries set published_on = null, published_by = null where id = p_lottery_id;
  end if;
  perform public.scd_lottery_log(v_org, p_lottery_id, case when p_published then 'PUBLISH' else 'UNPUBLISH' end, '{}'::jsonb);
end;
$$;

-- Makes the winning numbers public. Needs every prize assigned.
create or replace function public.scd_lottery_confirm_winners(p_lottery_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_org uuid := public.scd_lottery_guard(p_lottery_id, 'DIREZIONE');
begin
  if not exists (select 1 from public.scd_lottery_prizes where lottery_id = p_lottery_id and removed_at is null)
     or exists (select 1 from public.scd_lottery_prizes p where p.lottery_id = p_lottery_id and p.removed_at is null
                  and not exists (select 1 from public.scd_lottery_draws d where d.prize_id = p.id)) then
    raise exception 'lottery: prizes still to draw' using errcode = '22023';
  end if;
  update public.scd_lotteries set winners_confirmed_on = (now() at time zone 'Europe/Rome')::date, winners_confirmed_by = (select auth.uid())
  where id = p_lottery_id;
  perform public.scd_lottery_log(v_org, p_lottery_id, 'CONFIRM_WINNERS', '{}'::jsonb);
end;
$$;

-- 9. Public projection (anon): only a published lottery; no seller names, no prize values, winners only once confirmed.
create or replace function public.scd_lottery_public(p_org_slug text)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce((
    select jsonb_build_object(
      'kind', l.kind, 'title', l.title, 'beneficiary', l.beneficiary,
      'saleFrom', l.sale_from, 'saleUntil', l.sale_until, 'drawDate', l.draw_date, 'drawTime', to_char(l.draw_time, 'HH24:MI'),
      'drawPlace', l.draw_place, 'sportDay', l.sport_day, 'sportDayPlace', l.sport_day_place,
      'ticketPriceCents', l.ticket_price_cents, 'salePoints', l.sale_points, 'prizesDisplayPlace', l.prizes_display_place,
      'prizeDeliveryPlace', l.prize_delivery_place, 'prizeDeliveryUntil', l.prize_delivery_until,
      'publishedOn', l.published_on, 'goalCents', l.goal_cents,
      'prizes', coalesce((select jsonb_agg(jsonb_build_object('rank', p.rank, 'description', p.description, 'sponsorSlug', p.sponsor_slug) order by p.rank)
                          from public.scd_lottery_prizes p where p.lottery_id = l.id and p.removed_at is null), '[]'::jsonb),
      'winners', case when l.winners_confirmed_on is null then null else coalesce((
                   select jsonb_agg(jsonb_build_object('rank', p.rank, 'prize', p.description, 'series', d.series, 'number', d.number) order by p.rank)
                   from public.scd_lottery_draws d join public.scd_lottery_prizes p on p.id = d.prize_id
                   where d.lottery_id = l.id and d.state = 'VALIDO'), '[]'::jsonb) end,
      'netCents', greatest(0, coalesce((select sum(case when g.kind = 'INCASSO' then g.amount_cents else -g.amount_cents end)
                                        from public.scd_lottery_ledger g where g.lottery_id = l.id and g.cancelled_at is null), 0)))
    from public.scd_lotteries l join public.scd_organizations o on o.id = l.organization_id
    where o.slug = p_org_slug and l.archived_at is null and l.published_on is not null
    order by l.published_on desc, l.created_at desc
    limit 1), 'null'::jsonb);
$$;

-- 10. Row level security: readers see their organisation's rows; no write policy (functions only). -----------------

alter table public.scd_lotteries enable row level security;
alter table public.scd_lottery_series enable row level security;
alter table public.scd_lottery_compliance enable row level security;
alter table public.scd_lottery_prizes enable row level security;
alter table public.scd_lottery_blocks enable row level security;
alter table public.scd_lottery_draws enable row level security;
alter table public.scd_lottery_ledger enable row level security;
alter table public.scd_lottery_audit enable row level security;
revoke all on public.scd_lotteries, public.scd_lottery_series, public.scd_lottery_compliance, public.scd_lottery_prizes,
  public.scd_lottery_blocks, public.scd_lottery_draws, public.scd_lottery_ledger, public.scd_lottery_audit from anon, authenticated;
grant select on public.scd_lotteries, public.scd_lottery_series, public.scd_lottery_compliance, public.scd_lottery_prizes,
  public.scd_lottery_blocks, public.scd_lottery_draws, public.scd_lottery_ledger, public.scd_lottery_audit to authenticated;

create or replace function public.scd_lottery_can_read(p_lottery_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (select 1 from public.scd_lotteries l where l.id = p_lottery_id and public.scd_lottery_actor(l.organization_id) is not null);
$$;

create policy "scd_lotteries_select" on public.scd_lotteries for select to authenticated
  using (public.scd_lottery_actor(organization_id) is not null);
create policy "scd_lottery_series_select" on public.scd_lottery_series for select to authenticated
  using (public.scd_lottery_can_read(lottery_id));
create policy "scd_lottery_compliance_select" on public.scd_lottery_compliance for select to authenticated
  using (public.scd_lottery_can_read(lottery_id));
create policy "scd_lottery_prizes_select" on public.scd_lottery_prizes for select to authenticated
  using (public.scd_lottery_can_read(lottery_id));
create policy "scd_lottery_blocks_select" on public.scd_lottery_blocks for select to authenticated
  using (public.scd_lottery_can_read(lottery_id));
create policy "scd_lottery_draws_select" on public.scd_lottery_draws for select to authenticated
  using (public.scd_lottery_can_read(lottery_id));
create policy "scd_lottery_ledger_select" on public.scd_lottery_ledger for select to authenticated
  using (public.scd_lottery_can_read(lottery_id));
create policy "scd_lottery_audit_select" on public.scd_lottery_audit for select to authenticated
  using (public.scd_lottery_actor(organization_id) is not null);

-- 11. Execute rights ---------------------------------------------------------------------------------------------

revoke all on function public.scd_lottery_actor(uuid) from public, anon;
revoke all on function public.scd_lottery_guard(uuid, text) from public, anon, authenticated;
revoke all on function public.scd_lottery_log(uuid, uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.scd_lottery_prize_forbidden(text) from public, anon;
revoke all on function public.scd_lottery_can_read(uuid) from public, anon;
revoke all on function public.scd_lottery_save_setup(uuid, uuid, jsonb) from public, anon;
revoke all on function public.scd_lottery_set_series(uuid, jsonb) from public, anon;
revoke all on function public.scd_lottery_set_compliance(uuid, text, text, text, date, text) from public, anon;
revoke all on function public.scd_lottery_save_prize(uuid, uuid, jsonb) from public, anon;
revoke all on function public.scd_lottery_remove_prize(uuid) from public, anon;
revoke all on function public.scd_lottery_save_block(uuid, uuid, jsonb) from public, anon;
revoke all on function public.scd_lottery_remove_block(uuid) from public, anon;
revoke all on function public.scd_lottery_ticket_state(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.scd_lottery_record_draw(uuid, text, integer) from public, anon;
revoke all on function public.scd_lottery_undo_last_draw(uuid) from public, anon;
revoke all on function public.scd_lottery_add_ledger(uuid, text, text, integer, date) from public, anon;
revoke all on function public.scd_lottery_cancel_ledger(uuid, text) from public, anon;
revoke all on function public.scd_lottery_set_published(uuid, boolean) from public, anon;
revoke all on function public.scd_lottery_confirm_winners(uuid) from public, anon;
revoke all on function public.scd_lottery_public(text) from public;
grant execute on function public.scd_lottery_actor(uuid) to authenticated;
grant execute on function public.scd_lottery_prize_forbidden(text) to authenticated;
grant execute on function public.scd_lottery_can_read(uuid) to authenticated;
grant execute on function public.scd_lottery_save_setup(uuid, uuid, jsonb) to authenticated;
grant execute on function public.scd_lottery_set_series(uuid, jsonb) to authenticated;
grant execute on function public.scd_lottery_set_compliance(uuid, text, text, text, date, text) to authenticated;
grant execute on function public.scd_lottery_save_prize(uuid, uuid, jsonb) to authenticated;
grant execute on function public.scd_lottery_remove_prize(uuid) to authenticated;
grant execute on function public.scd_lottery_save_block(uuid, uuid, jsonb) to authenticated;
grant execute on function public.scd_lottery_remove_block(uuid) to authenticated;
grant execute on function public.scd_lottery_record_draw(uuid, text, integer) to authenticated;
grant execute on function public.scd_lottery_undo_last_draw(uuid) to authenticated;
grant execute on function public.scd_lottery_add_ledger(uuid, text, text, integer, date) to authenticated;
grant execute on function public.scd_lottery_cancel_ledger(uuid, text) to authenticated;
grant execute on function public.scd_lottery_set_published(uuid, boolean) to authenticated;
grant execute on function public.scd_lottery_confirm_winners(uuid) to authenticated;
grant execute on function public.scd_lottery_public(text) to anon, authenticated;
