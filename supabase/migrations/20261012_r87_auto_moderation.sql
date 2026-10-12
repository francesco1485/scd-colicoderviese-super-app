-- r87: Moderatore automatico (Francesco 12/10/2026: "non posso stare ad accettare continui post ... deve essere un criterio
-- interno di auto verifica fatto con regole nazionali e internazionali ... gli atleti devono essere inseriti perché hanno
-- autorizzato il trattamento dei dati personali tramite il link pre iscrizione ... troviamo un moderatore").
-- Three layers, all additive:
--   1. Rules in the database (always on, cannot be bypassed from the browser): names of minors of the club, contact data,
--      links outside the official channels, scores for the attività di base, abusive words. BLOCK / REVIEW / ALLOW.
--   2. Trust of the author: an author with approved posts and no rejection in 90 days publishes at once when the rules
--      allow; a new author goes through the AI check (layer 3) or, without AI, to the human queue once.
--   3. AI check applied by the app server (Claude) with a secret token: ALLOW publishes, REVIEW queues, BLOCK rejects.
-- Authors: office, staff, and now athletes and families (ATHLETE / FAMILY memberships linked to a person through the
-- pre-registration link) on the channels of their own teams. Under 14: no publishing (art. 2-quinquies Codice privacy).
-- Reports: two reports from different members hide a post again until a human looks at it. A "moderatore" position
-- joins the content office. Every automatic verdict is stored on the post.

alter table public.scd_posts add column if not exists moderation jsonb;
alter table public.scd_posts add column if not exists author_kind text not null default 'STAFF'
  check (author_kind in ('OFFICE', 'STAFF', 'ATHLETE', 'FAMILY'));
alter table public.scd_posts add column if not exists report_count int not null default 0;

create table if not exists public.scd_post_reports (
  post_id uuid not null references public.scd_posts(id),
  user_id uuid not null,
  reason text not null check (reason in ('MINORE', 'OFFESA', 'DATI_PERSONALI', 'FALSO', 'ALTRO')),
  note text check (note is null or char_length(note) <= 300),
  at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table public.scd_post_reports enable row level security;
revoke all on table public.scd_post_reports from anon, authenticated;

-- Secrets the app server proves itself with (sha256 of the token). Never readable by clients.
create table if not exists public.scd_private_settings (
  organization_id uuid not null references public.scd_organizations(id),
  key text not null,
  value text not null,
  updated_at timestamptz not null default now(),
  primary key (organization_id, key)
);
alter table public.scd_private_settings enable row level security;
revoke all on table public.scd_private_settings from anon, authenticated;

-- The content office now includes the moderator position.
create or replace function public.scd_content_office(p_organization_id uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select public.scd_has_org_role(p_organization_id, array['DIRECTION','SECRETARIAT']::public.scd_role[])
    or public.scd_has_position(p_organization_id, array['direzione','presidente','direttore-generale','segreteria','moderatore']);
$$;

-- Trust: approved posts in 180 days, minus rejections (a rejection in 90 days removes the trust).
create or replace function public.scd_author_trusted(p_organization_id uuid, p_user uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from public.scd_posts p where p.organization_id = p_organization_id and p.author = p_user
      and p.status = 'APPROVED' and p.created_at > now() - interval '180 days')
    and not exists (select 1 from public.scd_posts p where p.organization_id = p_organization_id and p.author = p_user
      and p.status = 'REJECTED' and p.created_at > now() - interval '90 days');
$$;
revoke all on function public.scd_author_trusted(uuid, uuid) from public, anon;

-- Layer 1: deterministic rules. Returns {"verdict": ALLOW|REVIEW|BLOCK, "reasons": [...]}.
create or replace function public.scd_auto_rules(p_organization_id uuid, p_channel text, p_title text, p_body text)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
declare
  v_text text := lower(coalesce(p_title, '') || ' ' || coalesce(p_body, ''));
  v_reasons text[] := '{}';
  v_verdict text := 'ALLOW';
  v_base boolean := p_channel ~ '^team:(pulcini|primicalci|piccoli|piccoliamici|esordienti|2014|2015)$';
  v_name record;
  v_links text[];
  v_link text;
begin
  -- Names of minors of the club (first + last, either order). The names never leave the database.
  for v_name in select lower(trim(first_name)) f, lower(trim(last_name)) l from public.scd_people
      where organization_id = p_organization_id and birth_date > current_date - interval '18 years'
        and char_length(coalesce(first_name, '')) >= 3 and char_length(coalesce(last_name, '')) >= 3 loop
    if position(v_name.f || ' ' || v_name.l in v_text) > 0 or position(v_name.l || ' ' || v_name.f in v_text) > 0 then
      v_verdict := 'BLOCK';
      v_reasons := array_append(v_reasons, 'NOME_MINORE');
      exit;
    end if;
  end loop;
  -- Abusive words (short list; the AI layer covers the rest).
  if v_text ~ '\m(stronz|merd|coglion|vaffancul|puttan|bastard|frocio|negro|troia|cazzo)' then
    v_verdict := 'BLOCK';
    v_reasons := array_append(v_reasons, 'LINGUAGGIO');
  end if;
  -- Scores for the attività di base (SGS CU n.2 2026/27).
  if v_base and v_text ~ '\d+\s*[-–:]\s*\d+' then
    v_verdict := 'BLOCK';
    v_reasons := array_append(v_reasons, 'RISULTATO_ATTIVITA_BASE');
  end if;
  -- Contact data of people: phone numbers and e-mails need a human look.
  if v_text ~ '(\+39|\m3\d{2}[ .]?\d{6,7}\M)' or v_text ~ '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}' then
    if v_verdict = 'ALLOW' then v_verdict := 'REVIEW'; end if;
    v_reasons := array_append(v_reasons, 'DATI_CONTATTO');
  end if;
  -- Links: only official channels and the club's own spaces pass without a look.
  v_links := array(select m[1] from regexp_matches(v_text, 'https?://([a-z0-9.-]+)', 'g') m);
  foreach v_link in array coalesce(v_links, '{}') loop
    if v_link !~ '(^|\.)(colicoderviese\.it|scdcolicoderviese\.it|youtube\.com|youtu\.be|facebook\.com|instagram\.com|tiktok\.com|drive\.google\.com|onrender\.com|lnd\.it|figc\.it)$' then
      if v_verdict = 'ALLOW' then v_verdict := 'REVIEW'; end if;
      v_reasons := array_append(v_reasons, 'LINK_ESTERNO');
      exit;
    end if;
  end loop;
  return jsonb_build_object('verdict', v_verdict, 'reasons', to_jsonb(v_reasons), 'engine', 'rules', 'at', now());
end;
$$;
revoke all on function public.scd_auto_rules(uuid, text, text, text) from public, anon;

-- Who may write, and on which channels. Office: everything. Staff: teams and events. Athletes and families
-- (linked to a person): only the channels of their own teams, and never under 14.
create or replace function public.scd_author_kind(p_organization_id uuid, p_channel text)
returns text language plpgsql stable security definer set search_path to 'public' as $$
declare
  v_self record;
  v_team text;
  v_codes text[];
begin
  if public.scd_content_office(p_organization_id) then return 'OFFICE'; end if;
  if public.scd_has_org_role(p_organization_id, array['REGISTRATION','MANAGER','MISTER','STAFF','TOURNAMENTS']::public.scd_role[]) then
    return case when p_channel = 'club' then null else 'STAFF' end;
  end if;
  if not public.scd_has_org_role(p_organization_id, array['ATHLETE','FAMILY']::public.scd_role[]) then return null; end if;
  if p_channel !~ '^team:' then return null; end if;
  v_team := substr(p_channel, 6);
  if v_team = 'piccoli' then v_team := 'piccoliamici'; end if;
  select * into v_self from public.scd_my_family(p_organization_id) f where f.relationship = 'SELF' limit 1;
  if v_self.person_id is null then return null; end if;
  if v_self.is_minor and v_self.birth_year > extract(year from current_date)::int - 14 then return null; end if;
  select array_agg(distinct c) into v_codes from public.scd_my_family(p_organization_id) f, unnest(f.team_codes) c;
  if v_codes is null or not (v_team = any (v_codes)) then return null; end if;
  return case when v_self.is_minor then 'ATHLETE' else
    case when public.scd_has_org_role(p_organization_id, array['ATHLETE']::public.scd_role[]) then 'ATHLETE' else 'FAMILY' end end;
end;
$$;
revoke all on function public.scd_author_kind(uuid, text) from public, anon;

-- Write a post (v2). Office → APPROVED. Others → rules; BLOCK → REJECTED with the reason; REVIEW → PENDING (human);
-- ALLOW → PENDING with moderation.verdict = 'CHECKING' for the AI layer (the app server applies the final verdict).
create or replace function public.scd_create_post(p_organization_id uuid, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_channel text := nullif(trim(p_payload->>'channel'), '');
  v_kind text := coalesce(nullif(p_payload->>'kind', ''), 'NEWS');
  v_title text := left(nullif(trim(p_payload->>'title'), ''), 120);
  v_body text := left(nullif(trim(p_payload->>'body'), ''), 2000);
  v_media text := left(nullif(trim(p_payload->>'mediaUrl'), ''), 500);
  v_live text := left(nullif(trim(p_payload->>'liveUrl'), ''), 500);
  v_minors boolean := coalesce((p_payload->>'minorsOk')::boolean, false);
  v_names boolean := coalesce((p_payload->>'noNamesOk')::boolean, false);
  v_result boolean := coalesce((p_payload->>'noResultOk')::boolean, false);
  v_base boolean := coalesce((p_payload->>'baseActivity')::boolean, false);
  v_author_kind text;
  v_rules jsonb;
  v_status text;
  v_note text;
  v_mod jsonb;
  v_id uuid;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'code', 'forbidden'); end if;
  if v_channel is null or v_body is null then return jsonb_build_object('ok', false, 'code', 'missing'); end if;
  if v_channel !~ '^(club|team:[a-z0-9_-]{1,40}|event:[a-z0-9_-]{1,60})$' then return jsonb_build_object('ok', false, 'code', 'channel'); end if;
  if v_kind not in ('NEWS', 'MATCH', 'LIVE') then return jsonb_build_object('ok', false, 'code', 'kind'); end if;
  v_author_kind := public.scd_author_kind(p_organization_id, v_channel);
  if v_author_kind is null then return jsonb_build_object('ok', false, 'code', 'forbidden'); end if;
  if not v_minors or not v_names then return jsonb_build_object('ok', false, 'code', 'checks'); end if;
  if v_base and not v_result then return jsonb_build_object('ok', false, 'code', 'checks'); end if;
  if v_kind = 'LIVE' and (v_author_kind not in ('OFFICE', 'STAFF') or v_live is null or v_live !~ '^https://') then
    return jsonb_build_object('ok', false, 'code', 'live');
  end if;
  if v_media is not null and v_media !~ '^(/media/|https://)' then return jsonb_build_object('ok', false, 'code', 'media'); end if;

  if v_author_kind = 'OFFICE' then
    v_status := 'APPROVED';
    v_mod := jsonb_build_object('verdict', 'ALLOW', 'reasons', '[]'::jsonb, 'engine', 'office', 'at', now());
  else
    v_rules := public.scd_auto_rules(p_organization_id, v_channel, v_title, v_body);
    v_mod := v_rules;
    if v_rules->>'verdict' = 'BLOCK' then
      v_status := 'REJECTED';
      v_note := 'Bloccato dal moderatore automatico: ' || array_to_string(array(select jsonb_array_elements_text(v_rules->'reasons')), ', ');
    elsif v_rules->>'verdict' = 'REVIEW' then
      v_status := 'PENDING';
    else
      v_status := 'PENDING';
      v_mod := v_mod || jsonb_build_object('verdict', 'CHECKING', 'trusted', public.scd_author_trusted(p_organization_id, auth.uid()));
    end if;
  end if;

  insert into public.scd_posts (organization_id, channel_key, kind, title, body, media_url, live_url, minors_ok, no_names_ok,
      no_result_ok, status, author, author_kind, moderation, decision_note, decided_by, decided_at, published_at)
    values (p_organization_id, v_channel, v_kind, v_title, v_body, v_media, v_live, v_minors, v_names, v_result,
      v_status, auth.uid(), v_author_kind, v_mod, v_note,
      case when v_status in ('APPROVED', 'REJECTED') then auth.uid() end,
      case when v_status in ('APPROVED', 'REJECTED') then now() end,
      case when v_status = 'APPROVED' then now() end)
    returning id into v_id;
  insert into public.scd_post_events (organization_id, post_id, action, actor, note) values (p_organization_id, v_id, 'CREATED', auth.uid(), v_mod::text);
  if v_status = 'APPROVED' then
    insert into public.scd_post_events (organization_id, post_id, action, actor) values (p_organization_id, v_id, 'APPROVED', auth.uid());
  elsif v_status = 'REJECTED' then
    insert into public.scd_post_events (organization_id, post_id, action, actor, note) values (p_organization_id, v_id, 'REJECTED', null, v_note);
  end if;
  return jsonb_build_object('ok', true, 'id', v_id, 'status', v_status,
    'checking', v_mod->>'verdict' = 'CHECKING', 'reasons', coalesce(v_mod->'reasons', '[]'::jsonb));
end;
$$;

-- Layer 3 landing: the app server (holder of the token) applies the AI verdict, or the trust rule when no AI ran.
create or replace function public.scd_apply_auto_moderation(p_organization_id uuid, p_post_id uuid, p_token text, p_verdict jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_hash text;
  v_post public.scd_posts;
  v_verdict text := upper(coalesce(p_verdict->>'verdict', 'REVIEW'));
  v_status text;
  v_note text;
begin
  select value into v_hash from public.scd_private_settings where organization_id = p_organization_id and key = 'moderation_token_sha256';
  if v_hash is null or p_token is null or encode(extensions.digest(p_token::bytea, 'sha256'::text), 'hex') <> v_hash then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  select * into v_post from public.scd_posts where id = p_post_id and organization_id = p_organization_id;
  if v_post.id is null then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  if v_post.status <> 'PENDING' or coalesce(v_post.moderation->>'verdict', '') <> 'CHECKING' then
    return jsonb_build_object('ok', true, 'status', v_post.status, 'unchanged', true);
  end if;
  if v_verdict not in ('ALLOW', 'REVIEW', 'BLOCK') then v_verdict := 'REVIEW'; end if;
  if v_verdict = 'BLOCK' then
    v_status := 'REJECTED';
    v_note := 'Bloccato dal moderatore automatico: ' || left(coalesce(p_verdict->>'reason', 'contenuto non adatto'), 200);
  elsif v_verdict = 'ALLOW' then
    v_status := 'APPROVED';
  else
    v_status := 'PENDING';
    v_note := null;
  end if;
  update public.scd_posts set status = v_status, decision_note = v_note,
    moderation = coalesce(moderation, '{}'::jsonb) || p_verdict || jsonb_build_object('verdict', v_verdict, 'at', now()),
    decided_by = null, decided_at = case when v_status <> 'PENDING' then now() end,
    published_at = case when v_status = 'APPROVED' then now() end, updated_at = now()
    where id = p_post_id;
  insert into public.scd_post_events (organization_id, post_id, action, actor, note)
    values (p_organization_id, p_post_id, case v_status when 'APPROVED' then 'APPROVED' when 'REJECTED' then 'REJECTED' else 'EDITED' end, null,
      'auto:' || coalesce(p_verdict->>'engine', 'ai') || ' ' || v_verdict);
  return jsonb_build_object('ok', true, 'status', v_status);
end;
$$;
revoke all on function public.scd_apply_auto_moderation(uuid, uuid, text, jsonb) from public, anon;
grant execute on function public.scd_apply_auto_moderation(uuid, uuid, text, jsonb) to authenticated;

-- Report a published post. Two reports from different members hide it until the office decides.
create or replace function public.scd_report_post(p_organization_id uuid, p_post_id uuid, p_reason text, p_note text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_count int;
begin
  if auth.uid() is null or not exists (select 1 from public.scd_memberships m
      where m.organization_id = p_organization_id and m.user_id = auth.uid() and m.active) then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  if p_reason not in ('MINORE', 'OFFESA', 'DATI_PERSONALI', 'FALSO', 'ALTRO') then
    return jsonb_build_object('ok', false, 'code', 'reason');
  end if;
  if not exists (select 1 from public.scd_posts p where p.id = p_post_id and p.organization_id = p_organization_id and p.status = 'APPROVED') then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;
  insert into public.scd_post_reports (post_id, user_id, reason, note) values (p_post_id, auth.uid(), p_reason, left(nullif(trim(p_note), ''), 300))
    on conflict (post_id, user_id) do update set reason = excluded.reason, note = excluded.note, at = now();
  select count(*) into v_count from public.scd_post_reports where post_id = p_post_id;
  update public.scd_posts set report_count = v_count, updated_at = now() where id = p_post_id;
  if v_count >= 2 then
    update public.scd_posts set status = 'PENDING', moderation = coalesce(moderation, '{}'::jsonb) || jsonb_build_object('verdict', 'REPORTED', 'reports', v_count, 'at', now()),
      updated_at = now() where id = p_post_id;
    insert into public.scd_post_events (organization_id, post_id, action, actor, note) values (p_organization_id, p_post_id, 'EDITED', auth.uid(), 'hidden after ' || v_count || ' reports');
  end if;
  return jsonb_build_object('ok', true, 'reports', v_count, 'hidden', v_count >= 2);
end;
$$;
revoke all on function public.scd_report_post(uuid, uuid, text, text) from public, anon;
grant execute on function public.scd_report_post(uuid, uuid, text, text) to authenticated;

-- The feed json now carries the moderation summary for the office (kind of author, verdict, reports).
create or replace function public.scd_post_json(p public.scd_posts, p_viewer uuid)
returns jsonb language sql stable set search_path to 'public' as $$
  select jsonb_build_object(
    'id', p.id, 'channel', p.channel_key, 'kind', p.kind, 'title', p.title, 'body', p.body,
    'mediaUrl', p.media_url, 'liveUrl', p.live_url, 'status', p.status,
    'publishedAt', p.published_at, 'createdAt', p.created_at, 'decisionNote', p.decision_note,
    'authorKind', p.author_kind, 'verdict', p.moderation->>'verdict', 'reasons', coalesce(p.moderation->'reasons', '[]'::jsonb),
    'reports', p.report_count,
    'forza', (select count(*) from public.scd_post_reactions r where r.post_id = p.id),
    'mine', p_viewer is not null and exists (select 1 from public.scd_post_reactions r where r.post_id = p.id and r.user_id = p_viewer),
    'own', p_viewer is not null and p.author = p_viewer);
$$;

-- The moderator position becomes assignable by Direzione and Segreteria (same guard as r76, plus 'moderatore').
create or replace function public.scd_access_admin_guard(
  p_organization_id uuid, p_target_user uuid, p_new_role public.scd_role, p_new_positions text[]
)
returns public.scd_role
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_actor public.scd_role;
  v_target public.scd_role;
  office_roles text[] := array['DIRECTION','SECRETARIAT','REGISTRATION','TOURNAMENTS'];
  office_pos text[] := array['direzione','presidente','direttore-generale','dirigenza','segreteria','tesoreria'];
  assignable text[] := array['direzione','presidente','direttore-generale','dirigenza','responsabile-attivita-base',
    'coordinatore-attivita-sportiva','dirigente-annata','mister','responsabile-trasporti','autista','responsabile-club-house',
    'addetto-biglietteria','responsabile-magazzino','responsabile-campi','segreteria','partner',
    'tesoreria','segreteria-presenza','segreteria-remoto','responsabile-tornei','responsabile-struttura','responsabile-struttura-colico',
    'responsabile-struttura-dervio','responsabile-lavanderia','collaboratore-lavanderia-pulizia','responsabile-infermeria','collaboratore-magazzino',
    'dirigente-collaboratore','moderatore'];
  p text;
begin
  select role into v_actor from public.scd_memberships
  where organization_id = p_organization_id and user_id = (select auth.uid()) and active;
  if v_actor is null or v_actor not in ('DIRECTION','SECRETARIAT') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_target_user is not null and p_target_user = (select auth.uid()) then
    raise exception 'cannot edit own access' using errcode = '42501';
  end if;
  if p_target_user is not null then
    select role into v_target from public.scd_memberships where organization_id = p_organization_id and user_id = p_target_user;
    if v_actor <> 'DIRECTION' and v_target::text = any(office_roles) then
      raise exception 'office account: Direzione only' using errcode = '42501';
    end if;
  end if;
  if p_new_role is not null and v_actor <> 'DIRECTION' and p_new_role::text = any(office_roles) then
    raise exception 'office role: Direzione only' using errcode = '42501';
  end if;
  foreach p in array coalesce(p_new_positions, '{}') loop
    if not (p = any(assignable)) then raise exception 'unknown position %', p using errcode = '22023'; end if;
    if v_actor <> 'DIRECTION' and p = any(office_pos) then
      raise exception 'office position: Direzione only' using errcode = '42501';
    end if;
  end loop;
  return v_actor;
end;
$$;
