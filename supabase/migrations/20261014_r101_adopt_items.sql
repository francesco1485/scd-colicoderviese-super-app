-- r101: "Adotta un oggetto" (Direzione 2026-10-14 11:09, UD-113). STAGED: written, NOT applied.
-- Apply only after the Direzione's explicit OK. Additive only: two new tables, one public view, two RPCs.
--
--   * scd_adopt_items     catalogue of things the club needs (price set by the Direzione, never guessed);
--   * scd_adoptions       who adopted what: PRIVATE (contacts never leave Direzione/Segreteria), with the
--                         consent flag for public thanks and the treasury receipt reference;
--   * scd_adopt_items_public  view for the public page: counters and state only; the adopter's public name only
--                         when that adopter gave written consent; no contact data, no amounts per person;
--   * companies are also recorded in GROW (crm) by the Segreteria: this migration never copies them, to avoid a
--     parallel registry; scd_adoptions.crm_partner_id keeps the link when it exists.
-- Minors never adopt in their own name: kind is FAMIGLIA / TIFOSO / AZIENDA and the adopter is an adult.

create table if not exists public.scd_adopt_items (
  id text primary key,
  organization_id uuid not null references public.scd_organizations(id),
  name text not null check (length(name) between 2 and 80),
  category text not null check (category in ('campo','allenamento','sicurezza','squadra','trasporti','club-house')),
  purpose text not null check (length(purpose) between 3 and 240),
  price_eur numeric(10,2) check (price_eur is null or price_eur > 0),
  needed integer not null default 1 check (needed > 0),
  shareable boolean not null default false,
  state text not null default 'DA_ADOTTARE' check (state in ('DA_ADOTTARE','IN_ADOZIONE','ADOTTATO','CONSEGNATO')),
  active boolean not null default true,
  sort integer not null default 100,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create table if not exists public.scd_adoptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id),
  item_id text not null references public.scd_adopt_items(id),
  kind text not null check (kind in ('FAMIGLIA','TIFOSO','AZIENDA')),
  adopter_name text not null check (length(adopter_name) between 2 and 120),
  adopter_email text,
  adopter_phone text,
  quantity integer not null default 1 check (quantity > 0),
  amount_eur numeric(10,2) check (amount_eur is null or amount_eur >= 0),
  status text not null default 'PROMESSA' check (status in ('PROMESSA','INCASSATA','CONSEGNATA','ANNULLATA')),
  public_thanks_consent boolean not null default false,
  public_name text check (public_name is null or length(public_name) between 2 and 80),
  plate_text text check (plate_text is null or length(plate_text) <= 80),
  receipt_ref text,
  crm_partner_id uuid,
  note text check (note is null or length(note) <= 500),
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now()
);
create index if not exists scd_adoptions_item_idx on public.scd_adoptions(item_id) where status <> 'ANNULLATA';

alter table public.scd_adopt_items enable row level security;
alter table public.scd_adoptions enable row level security;

-- Office test: Direzione and Segreteria of the organization.
create or replace function public.scd_adopt_is_office(p_organization_id uuid, p_direction_only boolean default false)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.scd_memberships m
    where m.user_id = auth.uid() and m.organization_id = p_organization_id and m.active
      and (m.role::text = 'DIRECTION' or (not p_direction_only and m.role::text = 'SECRETARIAT'))
  );
$$;
revoke all on function public.scd_adopt_is_office(uuid, boolean) from public, anon;
grant execute on function public.scd_adopt_is_office(uuid, boolean) to authenticated;

-- Items: everyone reads active items through the view; only the office reads the table; writes via RPC only.
drop policy if exists scd_adopt_items_office_read on public.scd_adopt_items;
create policy scd_adopt_items_office_read on public.scd_adopt_items for select to authenticated
  using (public.scd_adopt_is_office(organization_id));

-- Adoptions: office only. No direct writes.
drop policy if exists scd_adoptions_office_read on public.scd_adoptions;
create policy scd_adoptions_office_read on public.scd_adoptions for select to authenticated
  using (public.scd_adopt_is_office(organization_id));

revoke insert, update, delete on public.scd_adopt_items from anon, authenticated;
revoke insert, update, delete on public.scd_adoptions from anon, authenticated;
revoke select on public.scd_adoptions from anon;

-- Public view (security definer by owner): counters, state and consented public names only.
create or replace view public.scd_adopt_items_public as
  select i.id, i.name, i.category, i.purpose, i.price_eur, i.needed, i.shareable, i.sort,
         least(i.needed, coalesce(sum(a.quantity) filter (where a.status in ('INCASSATA','CONSEGNATA')), 0))::int as adopted,
         case
           when i.state = 'CONSEGNATO' then 'CONSEGNATO'
           when coalesce(sum(a.quantity) filter (where a.status in ('INCASSATA','CONSEGNATA')), 0) >= i.needed then 'ADOTTATO'
           when i.state = 'ADOTTATO' then 'ADOTTATO'
           when count(a.id) filter (where a.status <> 'ANNULLATA') > 0 or i.state = 'IN_ADOZIONE' then 'IN_ADOZIONE'
           else 'DA_ADOTTARE'
         end as state,
         (array_agg(a.public_name order by a.created_at)
            filter (where a.public_thanks_consent and a.public_name is not null and a.status in ('INCASSATA','CONSEGNATA')))[1] as public_name
  from public.scd_adopt_items i
  left join public.scd_adoptions a on a.item_id = i.id
  where i.active
  group by i.id;
grant select on public.scd_adopt_items_public to anon, authenticated;

-- RPC: Direzione creates or edits a catalogue item.
create or replace function public.scd_adopt_upsert_item(
  p_organization_id uuid, p_id text, p_name text, p_category text, p_purpose text,
  p_price_eur numeric, p_needed integer, p_shareable boolean, p_state text, p_active boolean, p_sort integer)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not public.scd_adopt_is_office(p_organization_id, true) then return jsonb_build_object('ok', false, 'code', 'NOT_ALLOWED'); end if;
  if p_id !~ '^[a-z0-9-]{2,40}$' then return jsonb_build_object('ok', false, 'code', 'BAD_ID'); end if;
  insert into public.scd_adopt_items as t (id, organization_id, name, category, purpose, price_eur, needed, shareable, state, active, sort, updated_by)
  values (p_id, p_organization_id, p_name, p_category, p_purpose, p_price_eur, coalesce(p_needed, 1), coalesce(p_shareable, false),
          coalesce(p_state, 'DA_ADOTTARE'), coalesce(p_active, true), coalesce(p_sort, 100), auth.uid())
  on conflict (id) do update set
    name = excluded.name, category = excluded.category, purpose = excluded.purpose, price_eur = excluded.price_eur,
    needed = excluded.needed, shareable = excluded.shareable, state = excluded.state, active = excluded.active,
    sort = excluded.sort, updated_at = now(), updated_by = auth.uid()
  where t.organization_id = p_organization_id;
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.scd_adopt_upsert_item(uuid, text, text, text, text, numeric, integer, boolean, text, boolean, integer) from public, anon;
grant execute on function public.scd_adopt_upsert_item(uuid, text, text, text, text, numeric, integer, boolean, text, boolean, integer) to authenticated;

-- RPC: Direzione or Segreteria records an adoption or moves its status (receipt reference required when cashed).
create or replace function public.scd_adopt_record(
  p_organization_id uuid, p_adoption_id uuid, p_item_id text, p_kind text, p_adopter_name text,
  p_adopter_email text, p_adopter_phone text, p_quantity integer, p_amount_eur numeric, p_status text,
  p_public_thanks_consent boolean, p_public_name text, p_plate_text text, p_receipt_ref text, p_note text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_id uuid;
begin
  if not public.scd_adopt_is_office(p_organization_id) then return jsonb_build_object('ok', false, 'code', 'NOT_ALLOWED'); end if;
  if not exists (select 1 from public.scd_adopt_items i where i.id = p_item_id and i.organization_id = p_organization_id) then
    return jsonb_build_object('ok', false, 'code', 'ITEM_NOT_FOUND');
  end if;
  if p_status in ('INCASSATA','CONSEGNATA') and coalesce(btrim(p_receipt_ref), '') = '' then
    return jsonb_build_object('ok', false, 'code', 'RECEIPT_REQUIRED');
  end if;
  if coalesce(p_public_thanks_consent, false) = false and p_public_name is not null then
    return jsonb_build_object('ok', false, 'code', 'CONSENT_REQUIRED');
  end if;
  if p_adoption_id is null then
    insert into public.scd_adoptions (organization_id, item_id, kind, adopter_name, adopter_email, adopter_phone, quantity, amount_eur,
      status, public_thanks_consent, public_name, plate_text, receipt_ref, note, created_by)
    values (p_organization_id, p_item_id, p_kind, p_adopter_name, nullif(btrim(p_adopter_email), ''), nullif(btrim(p_adopter_phone), ''),
      coalesce(p_quantity, 1), p_amount_eur, coalesce(p_status, 'PROMESSA'), coalesce(p_public_thanks_consent, false),
      nullif(btrim(p_public_name), ''), nullif(btrim(p_plate_text), ''), nullif(btrim(p_receipt_ref), ''), p_note, auth.uid())
    returning id into v_id;
  else
    update public.scd_adoptions set
      item_id = p_item_id, kind = p_kind, adopter_name = p_adopter_name,
      adopter_email = nullif(btrim(p_adopter_email), ''), adopter_phone = nullif(btrim(p_adopter_phone), ''),
      quantity = coalesce(p_quantity, 1), amount_eur = p_amount_eur, status = coalesce(p_status, status),
      public_thanks_consent = coalesce(p_public_thanks_consent, false), public_name = nullif(btrim(p_public_name), ''),
      plate_text = nullif(btrim(p_plate_text), ''), receipt_ref = nullif(btrim(p_receipt_ref), ''), note = p_note, updated_at = now()
    where id = p_adoption_id and organization_id = p_organization_id
    returning id into v_id;
    if v_id is null then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); end if;
  end if;
  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;
revoke all on function public.scd_adopt_record(uuid, uuid, text, text, text, text, text, integer, numeric, text, boolean, text, text, text, text) from public, anon;
grant execute on function public.scd_adopt_record(uuid, uuid, text, text, text, text, text, integer, numeric, text, boolean, text, text, text, text) to authenticated;

-- Seed: the Direzione's list (prices NULL until the Direzione sets them; four vans VERIFIED).
insert into public.scd_adopt_items (id, organization_id, name, category, purpose, needed, shareable, sort)
select v.id, o.id, v.name, v.category, v.purpose, v.needed, v.shareable, v.sort
from (select id from public.scd_organizations order by created_at limit 1) o
cross join (values
  ('porta-11', 'Porta da calcio a 11', 'campo', 'Porte regolamentari per le partite e gli allenamenti della prima squadra e delle annate grandi.', 1, false, 10),
  ('porta-7', 'Porta da calcio a 7', 'campo', 'Porte trasportabili per l''attività di base e le partite a 7 e a 9.', 1, false, 20),
  ('panchina', 'Panchina a bordo campo', 'campo', 'Panchine coperte per staff e ragazzi durante partite e allenamenti.', 1, false, 30),
  ('palloni', 'Set di palloni', 'allenamento', 'Palloni per gli allenamenti delle annate, dai Piccoli Amici alla Juniores.', 1, true, 40),
  ('materiale-tecnico', 'Materiale tecnico', 'allenamento', 'Coni, cinesini, ostacoli, pettorine e scale per lavorare bene in campo.', 1, true, 50),
  ('defibrillatore', 'Defibrillatore', 'sicurezza', 'Un defibrillatore sempre pronto al campo, con teca e manutenzione.', 1, true, 60),
  ('kit-squadra', 'Kit di una squadra', 'squadra', 'Maglie, pantaloncini e calzettoni per un''intera annata.', 1, false, 70),
  ('pulmino', 'Un pulmino per una stagione', 'trasporti', 'Carburante e manutenzione di uno dei quattro pulmini che portano i ragazzi al campo.', 4, true, 80),
  ('club-house', 'Un pezzo della Club House', 'club-house', 'Arredi e attrezzature per la Club House di Colico e Dervio.', 1, true, 90)
) as v(id, name, category, purpose, needed, shareable, sort)
on conflict (id) do nothing;
