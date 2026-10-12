-- r81 (UD-085, telaio T4): documents catalogued by audience, on top of the Cervellone (scd_kb_items, r77).
-- No second registry: a document gets `audiences` (FAMIGLIE, ATLETI, STAFF, DIRIGENTI, GESTIONE) and the
-- library shows each person only the documents meant for them. Families and athletes see only PUBBLICO items.
-- Only Direzione changes audiences; every change is logged.

alter table public.scd_kb_items add column if not exists audiences text[] not null default '{}';
alter table public.scd_kb_items add constraint scd_kb_items_audiences_check check (
  audiences <@ array['FAMIGLIE','ATLETI','STAFF','DIRIGENTI','GESTIONE']::text[]
  and (not (audiences && array['FAMIGLIE','ATLETI']::text[]) or sensitivity = 'PUBBLICO')
  and (not ('STAFF' = any(audiences)) or sensitivity <> 'RISERVATO')
);
create index if not exists scd_kb_items_audiences_idx on public.scd_kb_items using gin (audiences);

create table if not exists public.scd_kb_audience_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.scd_organizations(id),
  source_ref text not null,
  audiences_before text[] not null,
  audiences_after text[] not null,
  sensitivity_after text not null,
  actor uuid not null default auth.uid(),
  at timestamptz not null default now()
);
alter table public.scd_kb_audience_events enable row level security;
revoke all on public.scd_kb_audience_events from anon, authenticated;

-- Audiences of the caller, from active memberships and positions.
create or replace function public.scd_doc_audiences(p_organization_id uuid)
returns text[]
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(array_agg(distinct a), '{}') from (
    select 'GESTIONE' as a where public.scd_kb_level(p_organization_id) is not null
    union all
    select 'DIRIGENTI' where public.scd_has_org_role(p_organization_id, array['DIRECTION','MANAGER']::public.scd_role[])
      or public.scd_has_position(p_organization_id, array['direzione','presidente','direttore-generale','dirigenza','dirigente-annata'])
    union all
    select 'STAFF' where public.scd_has_org_role(p_organization_id, array['DIRECTION','MANAGER','MISTER','STAFF','SECRETARIAT','REGISTRATION','TOURNAMENTS']::public.scd_role[])
    union all
    select 'FAMIGLIE' where public.scd_has_org_role(p_organization_id, array['FAMILY']::public.scd_role[])
    union all
    select 'ATLETI' where public.scd_has_org_role(p_organization_id, array['ATHLETE']::public.scd_role[])
  ) x;
$$;
revoke all on function public.scd_doc_audiences(uuid) from public, anon;
grant execute on function public.scd_doc_audiences(uuid) to authenticated;

-- Library for the caller: documents whose audiences intersect the caller's, never above the caller's level.
create or replace function public.scd_doc_library(p_organization_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_aud text[] := public.scd_doc_audiences(p_organization_id);
  v_level text := public.scd_kb_level(p_organization_id);
  v_dir boolean := public.scd_has_org_role(p_organization_id, array['DIRECTION']::public.scd_role[])
    or public.scd_has_position(p_organization_id, array['direzione','presidente','direttore-generale']);
begin
  if cardinality(v_aud) = 0 then
    return jsonb_build_object('audiences', '[]'::jsonb, 'canEdit', false, 'items', '[]'::jsonb);
  end if;
  return jsonb_build_object(
    'audiences', to_jsonb(v_aud),
    'canEdit', v_dir,
    'items', coalesce((select jsonb_agg(jsonb_build_object(
        'ref', k.source_ref, 'title', k.titolo, 'summary', k.sintesi, 'area', k.area, 'season', k.stagione,
        'date', k.data, 'due', k.scadenza, 'link', k.link, 'audiences', to_jsonb(k.audiences),
        'sensitivity', k.sensitivity) order by k.area, k.titolo)
      from public.scd_kb_items k
      where k.organization_id = p_organization_id
        and k.kind = 'DOCUMENTO'
        and (
          (v_dir)
          or (k.audiences && v_aud and (
                k.sensitivity = 'PUBBLICO'
                or (k.sensitivity = 'INTERNO' and (v_level is not null or 'STAFF' = any(v_aud) or 'DIRIGENTI' = any(v_aud)))
                or (k.sensitivity = 'RISERVATO' and v_level = 'RISERVATO')))
        )), '[]'::jsonb));
end;
$$;
revoke all on function public.scd_doc_library(uuid) from public, anon;
grant execute on function public.scd_doc_library(uuid) to authenticated;

-- Direzione sets who sees a document. Families/athletes force PUBBLICO only when p_make_public is true.
create or replace function public.scd_doc_set_audiences(p_organization_id uuid, p_ref text, p_audiences text[], p_make_public boolean default false)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_row public.scd_kb_items;
  v_aud text[];
  v_sens text;
begin
  if not (public.scd_has_org_role(p_organization_id, array['DIRECTION']::public.scd_role[])
    or public.scd_has_position(p_organization_id, array['direzione','presidente','direttore-generale'])) then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  select * into v_row from public.scd_kb_items where organization_id = p_organization_id and source_ref = p_ref and kind = 'DOCUMENTO';
  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;
  select coalesce(array_agg(distinct a order by a), '{}') into v_aud
    from unnest(coalesce(p_audiences, '{}')) a
    where a in ('FAMIGLIE','ATLETI','STAFF','DIRIGENTI','GESTIONE');
  v_sens := v_row.sensitivity;
  if v_aud && array['FAMIGLIE','ATLETI']::text[] and v_sens <> 'PUBBLICO' then
    if not coalesce(p_make_public, false) then
      return jsonb_build_object('ok', false, 'code', 'needs_public');
    end if;
    v_sens := 'PUBBLICO';
  end if;
  if 'STAFF' = any(v_aud) and v_sens = 'RISERVATO' then
    return jsonb_build_object('ok', false, 'code', 'reserved');
  end if;
  update public.scd_kb_items set audiences = v_aud, sensitivity = v_sens, updated_at = now()
    where id = v_row.id;
  insert into public.scd_kb_audience_events (organization_id, source_ref, audiences_before, audiences_after, sensitivity_after)
    values (p_organization_id, p_ref, v_row.audiences, v_aud, v_sens);
  return jsonb_build_object('ok', true, 'audiences', to_jsonb(v_aud), 'sensitivity', v_sens);
end;
$$;
revoke all on function public.scd_doc_set_audiences(uuid, text, text[], boolean) from public, anon;
grant execute on function public.scd_doc_set_audiences(uuid, text, text[], boolean) to authenticated;

-- r81.1 seed (12/10/2026): first classification of the 49 catalogued documents.
-- The six registration-form documents are already public (config/scd-club-documents.v1.json) and keep the
-- audiences the club wrote in each document; safety and emergency documents go to staff; federal and
-- organisational documents to dirigenti; everything else stays with the office (GESTIONE). Direzione can change
-- any of these from /documenti (logged in scd_kb_audience_events).
update public.scd_kb_items set sensitivity = 'PUBBLICO', audiences = case
    when titolo ilike 'Regolamento Trasferte%' then array['FAMIGLIE','STAFF','DIRIGENTI','GESTIONE']
    when titolo ilike 'Liberatoria immagini%' then array['FAMIGLIE','ATLETI','GESTIONE']
    else array['FAMIGLIE','ATLETI','STAFF','DIRIGENTI','GESTIONE'] end
  where kind = 'DOCUMENTO' and link is not null and (
    titolo ilike 'Regolamento Generale Carta Valori%' or titolo ilike 'Codice Unico di Condotta%'
    or titolo ilike 'Regolamento Trasferte%' or titolo ilike 'Modello Organizzativo Safeguarding%'
    or titolo ilike 'Informativa Privacy%' or titolo ilike 'Liberatoria immagini%');
update public.scd_kb_items set audiences = array['STAFF','DIRIGENTI','GESTIONE']
  where kind = 'DOCUMENTO' and sensitivity = 'INTERNO' and (
    titolo ilike 'Piano di emergenza%' or titolo ilike 'Planimetria evacuazione%' or titolo ilike 'Registro antincendio%');
update public.scd_kb_items set audiences = array['DIRIGENTI','GESTIONE']
  where kind = 'DOCUMENTO' and sensitivity = 'INTERNO' and cardinality(audiences) = 0 and (
    area in ('FEDERAZIONE','SCUOLE_ENTI') or titolo ilike 'Regolamento utilizzo impianti%');
update public.scd_kb_items set audiences = array['GESTIONE']
  where kind = 'DOCUMENTO' and cardinality(audiences) = 0;
