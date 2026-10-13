-- r98 (UD-103, 13/10/2026 Direzione: "rendere il cervellone pieno e performante"): fast and forgiving
-- Cervellone search. Same signature, same return shape and the same access rules as r77/r81
-- (INTERNO for office staff, RISERVATO only for Direzione, null for everyone else); every item gains `match`.
--
--   * accents never matter: unaccent on the stored tsvector (text search configuration scd_italian_unaccent)
--     and on the query;
--   * prefix matching: every sanitized term becomes `term:*` ("pulm" finds "pulmini");
--   * typo tolerance: when full text finds fewer rows than p_limit, a trigram pass on titolo + ente + tags
--     (word similarity >= 0.45) adds "similar" rows, flagged match = 'fuzzy' and listed after the 'fts' rows;
--   * ranking: ts_rank_cd (prefix + exact term bonus) plus small boosts for open items, deadlines within
--     30 days and recent dates;
--   * counts: without a text query = visible catalogue per area (as before) from an index-only scan;
--     with a text query = matches per area from the rows already computed for this call (no second pass).
--
-- Written for SCD PULSE (ndevtxxijbcnskgysdit). Apply only after Direzione approval.

create schema if not exists extensions;
create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- Immutable unaccent (extensions.unaccent(text) is only STABLE, so it cannot be used in indexes).
create or replace function public.scd_unaccent(p_text text)
returns text
language sql
immutable
strict
parallel safe
as $$
  select extensions.unaccent('extensions.unaccent'::regdictionary, p_text);
$$;

-- Italian stemming with accents folded before stemming ("società" = "societa").
do $$
begin
  if not exists (select 1 from pg_ts_config where cfgname = 'scd_italian_unaccent' and cfgnamespace = 'public'::regnamespace) then
    create text search configuration public.scd_italian_unaccent (copy = pg_catalog.italian);
    alter text search configuration public.scd_italian_unaccent
      alter mapping for hword, hword_part, word with extensions.unaccent, pg_catalog.italian_stem;
  end if;
end;
$$;

-- Text used by the trigram pass: titolo + ente + tags, lower case, no accents.
-- array_to_string is only STABLE in core; on text[] it is deterministic, hence this immutable wrapper.
create or replace function public.scd_kb_trgm_text(p_titolo text, p_ente text, p_tags text[])
returns text
language sql
immutable
parallel safe
as $$
  select lower(public.scd_unaccent(coalesce(p_titolo, '') || ' ' || coalesce(p_ente, '') || ' ' || coalesce(pg_catalog.array_to_string(p_tags, ' '), '')));
$$;

-- Search terms from free text: no accents, lower case, only [a-z0-9] tokens, single letters dropped
-- (digits kept: "3 livello"), duplicates removed, first 8 terms, each at most 40 characters.
create or replace function public.scd_kb_query_terms(p_query text)
returns text[]
language sql
immutable
parallel safe
as $$
  select coalesce(array_agg(t order by first_pos), '{}'::text[])
  from (
    select t, min(pos) as first_pos
    from (
      select left(tok, 40) as t, pos
      from pg_catalog.regexp_split_to_table(lower(public.scd_unaccent(coalesce(p_query, ''))), '[^a-z0-9]+') with ordinality as s(tok, pos)
    ) raw
    where t <> '' and (length(t) >= 2 or t ~ '^[0-9]$')
    group by t
    order by min(pos)
    limit 8
  ) terms;
$$;

-- Open items get a ranking boost. stato is free text in the catalogue (APERTA, aperto, DA_PAGARE,
-- "in attesa di riscontro", SOLLECITATO, "vertenza aperta", ...): normalized here, never rewritten.
-- Plain expression (no unaccent: none of the open states carries an accent) so the planner inlines it.
create or replace function public.scd_kb_is_open(p_stato text)
returns boolean
language sql
immutable
parallel safe
as $$
  select coalesce(
    upper(replace(p_stato, '_', ' ')) ~ '^(APERT[OA]|IN ATTESA|DA (FARE|GESTIRE|PAGARE|INCASSARE|VERIFICARE)|SOLLECITAT|IN CONTESTAZIONE|VERTENZA APERTA)',
    false);
$$;

-- Stored tsvector with accents folded (weights unchanged: titolo A, ente/area/tags B, sintesi C).
create or replace function public.scd_kb_items_tsv()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  new.search := setweight(to_tsvector('public.scd_italian_unaccent', coalesce(new.titolo, '')), 'A') ||
    setweight(to_tsvector('public.scd_italian_unaccent', coalesce(new.ente, '') || ' ' || coalesce(new.area, '') || ' ' || coalesce(array_to_string(new.tags, ' '), '')), 'B') ||
    setweight(to_tsvector('public.scd_italian_unaccent', coalesce(new.sintesi, '')), 'C');
  return new;
end;
$$;

-- Backfill: the BEFORE trigger recomputes `search` for every row (updated_at untouched: content unchanged).
update public.scd_kb_items set search = null;

-- Stored once per row so the trigram recheck and the similarity score never recompute unaccent.
alter table public.scd_kb_items add column if not exists search_trgm text
  generated always as (public.scd_kb_trgm_text(titolo, ente, tags)) stored;
create index if not exists scd_kb_items_trgm_idx on public.scd_kb_items using gin (search_trgm extensions.gin_trgm_ops);
-- Catalogue counts per area for office staff (sensitivity filter) as an index-only scan.
create index if not exists scd_kb_items_area_sens_idx on public.scd_kb_items (organization_id, area, sensitivity);

create or replace function public.scd_kb_search(
  p_organization_id uuid, p_query text default null, p_area text default null, p_stagione text default null,
  p_kind text default null, p_only_due boolean default false, p_limit integer default 30
)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
set pg_trgm.word_similarity_threshold to '0.45'
set client_min_messages to 'warning'
as $$
declare
  v_level text := public.scd_kb_level(p_organization_id);
  v_limit integer := least(greatest(coalesce(p_limit, 30), 1), 200);
  v_terms text[] := public.scd_kb_query_terms(p_query);
  v_text boolean;
  v_norm text;
  v_keep text[] := '{}';
  v_q tsquery;
  v_qx tsquery;
  v_t tsquery;
  v_term text;
begin
  if v_level is null then return null; end if;
  v_text := cardinality(v_terms) > 0;
  -- AND of prefix terms (v_q) for matching, AND of whole terms (v_qx) as a ranking bonus.
  -- Stop words ("di", "la") drop out of both passes; if nothing is left the search returns no rows.
  foreach v_term in array v_terms loop
    v_t := to_tsquery('public.scd_italian_unaccent', v_term || ':*');
    if numnode(v_t) > 0 then
      v_keep := v_keep || v_term;
      v_q := case when v_q is null then v_t else v_q && v_t end;
      v_qx := case when v_qx is null then to_tsquery('public.scd_italian_unaccent', v_term) else v_qx && to_tsquery('public.scd_italian_unaccent', v_term) end;
    end if;
  end loop;
  -- Trigram text: the meaningful terms only, at least 3 characters overall.
  v_norm := array_to_string(v_keep, ' ');
  if length(v_norm) < 3 then v_norm := null; end if;

  return (
    with visible as not materialized (
      select k.*
      from public.scd_kb_items k
      where k.organization_id = p_organization_id
        and (k.sensitivity <> 'RISERVATO' or v_level = 'RISERVATO')
        and (p_area is null or k.area = p_area)
        and (p_stagione is null or k.stagione = p_stagione)
        and (p_kind is null or k.kind = p_kind)
        and (not p_only_due or (k.scadenza is not null and k.scadenza >= current_date - 30))
    ),
    fts as materialized (
      select v.id, v.area, v.scadenza, v.data,
             ts_rank_cd(v.search, v_q, 32) + case when v_qx is not null and v.search @@ v_qx then 0.1 else 0 end as score
      from visible v
      where v_text and v_q is not null and v.search @@ v_q
    ),
    fts_top as (
      select f.id, f.area, f.score, 0 as match_ord
      from fts f
      order by case when p_only_due then f.scadenza end asc nulls last, f.score desc, f.data desc nulls last
      limit v_limit
    ),
    fuzzy as (
      select v.id, v.area,
             extensions.word_similarity(v_norm, v.search_trgm) as score,
             1 as match_ord
      from visible v
      where v_text and v_norm is not null
        and (select count(*) from fts) < v_limit
        and v_norm operator(extensions.<%) v.search_trgm
        and not exists (select 1 from fts f where f.id = v.id)
      order by score desc, v.data desc nulls last
      limit v_limit
    ),
    browse as (
      select v.id, v.area, 0::real as score, 0 as match_ord
      from visible v
      where not v_text
      order by case when p_only_due then v.scadenza end asc nulls last, v.data desc nulls last
      limit v_limit
    ),
    picked as (
      select * from fts_top
      union all
      select * from fuzzy
      union all
      select * from browse
    ),
    ranked as (
      select p.match_ord, k.id, k.kind, k.area, k.stagione, k.titolo, k.sintesi, k.ente, k.data, k.scadenza, k.stato,
             k.importo, k.fonte, k.link, k.tags,
             round((p.score
               + case when public.scd_kb_is_open(k.stato) then 0.05 else 0 end
               + case when k.scadenza between current_date and current_date + 30 then 0.08 else 0 end
               + case when k.data is not null and k.data <= current_date and k.data > current_date - 730
                      then 0.04 * (1 - (current_date - k.data) / 730.0) else 0 end)::numeric, 4)::double precision as rank,
             case when not v_text then null when p.match_ord = 0 then 'fts' else 'fuzzy' end as match
      from picked p
      join public.scd_kb_items k on k.id = p.id
    ),
    page as (
      select r.* from ranked r
      order by r.match_ord,
               case when p_only_due then r.scadenza end asc nulls last,
               r.rank desc, r.data desc nulls last
      limit v_limit
    )
    select jsonb_build_object(
      'level', v_level,
      'items', coalesce((
        select jsonb_agg((to_jsonb(x) - 'match_ord') order by x.match_ord, case when p_only_due then x.scadenza end asc nulls last, x.rank desc, x.data desc nulls last)
        from page x), '[]'::jsonb),
      'counts', case
        when v_text then coalesce((
          select jsonb_object_agg(area, n) from (
            select area, count(*) as n from (select id, area from fts union all select id, area from fuzzy) m group by area
          ) c), '{}'::jsonb)
        else (
          select jsonb_object_agg(area, n) from (
            select k.area, count(*) as n from public.scd_kb_items k
            where k.organization_id = p_organization_id and (k.sensitivity <> 'RISERVATO' or v_level = 'RISERVATO')
            group by k.area
          ) c)
        end)
  );
end;
$$;
revoke all on function public.scd_kb_search(uuid, text, text, text, text, boolean, integer) from public, anon;
grant execute on function public.scd_kb_search(uuid, text, text, text, text, boolean, integer) to authenticated;

analyze public.scd_kb_items;
