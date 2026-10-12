-- r77 (UD-077): Cervellone knowledge base. One row per catalogued item (archived document, Drive file,
-- mail index bucket, economic record of organizations, history fact, facility fact, Canva design) so the
-- Super App assistant and the staff can find anything fast. No personal data of families or minors:
-- people only by role, detail stays in the original linked by `link`. Access only through SECURITY DEFINER
-- functions: office staff read INTERNO, Direzione also RISERVATO; only Direzione writes.

create table if not exists public.scd_kb_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  source_ref text not null,
  kind text not null check (kind in ('DOCUMENTO','FILE_DRIVE','INDICE_POSTA','ECONOMIA','STORIA','ENTE','IMPIANTO','CANVA','REGOLA')),
  area text not null,
  stagione text,
  titolo text not null,
  sintesi text,
  ente text,
  data date,
  scadenza date,
  stato text,
  importo numeric(12,2),
  fonte text not null check (fonte in ('mail','drive','canva','documento','app')),
  link text,
  tags text[] not null default '{}',
  sensitivity text not null default 'INTERNO' check (sensitivity in ('PUBBLICO','INTERNO','RISERVATO')),
  batch text,
  search tsvector,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, source_ref)
);
create index if not exists scd_kb_items_search_idx on public.scd_kb_items using gin (search);
create index if not exists scd_kb_items_area_idx on public.scd_kb_items (organization_id, area, stagione);
create index if not exists scd_kb_items_due_idx on public.scd_kb_items (organization_id, scadenza) where scadenza is not null;
create or replace function public.scd_kb_items_tsv()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  new.search := setweight(to_tsvector('italian', coalesce(new.titolo, '')), 'A') ||
    setweight(to_tsvector('italian', coalesce(new.ente, '') || ' ' || coalesce(new.area, '') || ' ' || coalesce(array_to_string(new.tags, ' '), '')), 'B') ||
    setweight(to_tsvector('italian', coalesce(new.sintesi, '')), 'C');
  return new;
end;
$$;
create trigger scd_kb_items_tsv before insert or update on public.scd_kb_items for each row execute function public.scd_kb_items_tsv();
alter table public.scd_kb_items enable row level security;
revoke all on public.scd_kb_items from anon, authenticated;

-- 'RISERVATO' (Direzione), 'INTERNO' (office staff), or null.
create or replace function public.scd_kb_level(p_organization_id uuid)
returns text
language sql
stable
set search_path to 'public'
as $$
  select case
    when public.scd_has_org_role(p_organization_id, array['DIRECTION']::public.scd_role[])
      or public.scd_has_position(p_organization_id, array['direzione','presidente','direttore-generale']) then 'RISERVATO'
    when public.scd_has_org_role(p_organization_id, array['SECRETARIAT','REGISTRATION','TOURNAMENTS']::public.scd_role[])
      or public.scd_has_position(p_organization_id, array['segreteria','tesoreria','segreteria-presenza','segreteria-remoto','dirigenza']) then 'INTERNO'
    else null end;
$$;

-- Search: free text (Italian stemming) + optional filters. Deadlines first when asked with only_due.
create or replace function public.scd_kb_search(
  p_organization_id uuid, p_query text default null, p_area text default null, p_stagione text default null,
  p_kind text default null, p_only_due boolean default false, p_limit integer default 30
)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_level text := public.scd_kb_level(p_organization_id);
  v_q tsquery;
begin
  if v_level is null then return null; end if;
  if coalesce(trim(p_query), '') <> '' then v_q := websearch_to_tsquery('italian', p_query); end if;
  return jsonb_build_object('level', v_level, 'items', coalesce((
    select jsonb_agg(row_to_json(x)::jsonb) from (
      select k.id, k.kind, k.area, k.stagione, k.titolo, k.sintesi, k.ente, k.data, k.scadenza, k.stato, k.importo, k.fonte, k.link, k.tags,
             case when v_q is null then 0 else ts_rank(k.search, v_q) end as rank
      from public.scd_kb_items k
      where k.organization_id = p_organization_id
        and (k.sensitivity <> 'RISERVATO' or v_level = 'RISERVATO')
        and (v_q is null or k.search @@ v_q)
        and (p_area is null or k.area = p_area)
        and (p_stagione is null or k.stagione = p_stagione)
        and (p_kind is null or k.kind = p_kind)
        and (not p_only_due or (k.scadenza is not null and k.scadenza >= current_date - 30))
      order by case when p_only_due then k.scadenza end asc nulls last, rank desc, k.data desc nulls last
      limit least(greatest(coalesce(p_limit, 30), 1), 200)
    ) x), '[]'::jsonb),
    'counts', (select jsonb_object_agg(area, n) from (select area, count(*) n from public.scd_kb_items
                where organization_id = p_organization_id and (sensitivity <> 'RISERVATO' or v_level = 'RISERVATO') group by area) c));
end;
$$;
revoke all on function public.scd_kb_search(uuid, text, text, text, text, boolean, integer) from public, anon;
grant execute on function public.scd_kb_search(uuid, text, text, text, text, boolean, integer) to authenticated;

-- Ingest (Direzione only): upsert by source_ref, audited once per batch.
create or replace function public.scd_kb_upsert(p_organization_id uuid, p_items jsonb, p_batch text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_n integer;
begin
  if public.scd_kb_level(p_organization_id) is distinct from 'RISERVATO' then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  insert into public.scd_kb_items as k (organization_id, source_ref, kind, area, stagione, titolo, sintesi, ente, data, scadenza, stato, importo, fonte, link, tags, sensitivity, batch)
  select p_organization_id, i->>'source_ref', i->>'kind', i->>'area', nullif(i->>'stagione', ''), left(i->>'titolo', 300), left(nullif(i->>'sintesi', ''), 4000),
         left(nullif(i->>'ente', ''), 200), nullif(i->>'data', '')::date, nullif(i->>'scadenza', '')::date, nullif(i->>'stato', ''),
         nullif(i->>'importo', '')::numeric, i->>'fonte', nullif(i->>'link', ''),
         coalesce((select array_agg(t) from jsonb_array_elements_text(coalesce(i->'tags', '[]'::jsonb)) t), '{}'),
         coalesce(nullif(i->>'sensitivity', ''), 'INTERNO'), p_batch
  from jsonb_array_elements(p_items) i
  on conflict (organization_id, source_ref) do update set
    kind = excluded.kind, area = excluded.area, stagione = excluded.stagione, titolo = excluded.titolo, sintesi = excluded.sintesi,
    ente = excluded.ente, data = excluded.data, scadenza = excluded.scadenza, stato = excluded.stato, importo = excluded.importo,
    fonte = excluded.fonte, link = excluded.link, tags = excluded.tags, sensitivity = excluded.sensitivity, batch = excluded.batch, updated_at = now();
  get diagnostics v_n = row_count;
  insert into public.scd_audit_events (organization_id, actor_user_id, action, entity_type, entity_id, payload)
  values (p_organization_id, auth.uid(), 'KB_UPSERT', 'scd_kb_items', null, jsonb_build_object('batch', p_batch, 'rows', v_n));
  return jsonb_build_object('ok', true, 'rows', v_n);
end;
$$;
revoke all on function public.scd_kb_upsert(uuid, jsonb, text) from public, anon;
grant execute on function public.scd_kb_upsert(uuid, jsonb, text) to authenticated;
