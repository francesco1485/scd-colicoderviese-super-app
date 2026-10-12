-- r86: Social structure of the Super App (UD-089, Francesco 12/10/2026: "le notizie di tutti come Instagram e poi tu vai a
-- seguire chi ti interessa ... area privata interna per vedere le tue cose e creare i tuoi contenuti mentre la società ha
-- area interna gestionale"). Three things, additive only:
--   * scd_posts: a post of an official channel (club, a team, an event). Written by staff, published only when APPROVED.
--     Direzione / Segreteria publish directly; mister, dirigenti and staff send to the approval queue. Every post carries
--     the two minors checks (no recognisable minor without liberatoria, no names of minors) and, for the attività di base,
--     the "no result" check (SGS CU n.2 2026/27). Nothing here stores a person's name: the author is only a user id.
--   * scd_follows: who follows which channel ("Per te" = followed channels first).
--   * scd_post_reactions: "Forza SCD" (one per user and post). Counts are public, identities are not.
-- Channel keys: 'club' | 'team:<master calendar group id>' | 'event:<event id>'. The app validates the group ids against
-- the official calendar copy; the database only checks the shape. Approved posts are readable by anyone (the public feed),
-- the rest only by the author and the content office.

create table if not exists public.scd_posts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id),
  channel_key text not null check (channel_key ~ '^(club|team:[a-z0-9_-]{1,40}|event:[a-z0-9_-]{1,60})$'),
  kind text not null default 'NEWS' check (kind in ('NEWS', 'MATCH', 'LIVE')),
  title text check (title is null or char_length(title) <= 120),
  body text not null check (char_length(body) between 1 and 2000),
  media_url text check (media_url is null or (char_length(media_url) <= 500 and media_url ~ '^(/media/|https://)')),
  live_url text check (live_url is null or (char_length(live_url) <= 500 and live_url ~ '^https://')),
  minors_ok boolean not null default false,
  no_names_ok boolean not null default false,
  no_result_ok boolean not null default false,
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED', 'ARCHIVED')),
  author uuid not null,
  decided_by uuid,
  decided_at timestamptz,
  decision_note text check (decision_note is null or char_length(decision_note) <= 300),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists scd_posts_feed on public.scd_posts (organization_id, status, published_at desc);
create index if not exists scd_posts_channel on public.scd_posts (organization_id, channel_key, published_at desc);
alter table public.scd_posts enable row level security;
revoke all on table public.scd_posts from anon, authenticated;

create table if not exists public.scd_post_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null,
  post_id uuid not null references public.scd_posts(id),
  action text not null check (action in ('CREATED', 'APPROVED', 'REJECTED', 'ARCHIVED', 'EDITED')),
  actor uuid,
  note text,
  at timestamptz not null default now()
);
alter table public.scd_post_events enable row level security;
revoke all on table public.scd_post_events from anon, authenticated;

create table if not exists public.scd_follows (
  organization_id uuid not null references public.scd_organizations(id),
  user_id uuid not null,
  channel_key text not null check (channel_key ~ '^(club|team:[a-z0-9_-]{1,40}|event:[a-z0-9_-]{1,60})$'),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id, channel_key)
);
alter table public.scd_follows enable row level security;
revoke all on table public.scd_follows from anon, authenticated;

create table if not exists public.scd_post_reactions (
  organization_id uuid not null,
  post_id uuid not null references public.scd_posts(id),
  user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table public.scd_post_reactions enable row level security;
revoke all on table public.scd_post_reactions from anon, authenticated;

-- Who approves and archives content: Direzione, Segreteria and the positions of the communication area.
create or replace function public.scd_content_office(p_organization_id uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select public.scd_has_org_role(p_organization_id, array['DIRECTION','SECRETARIAT']::public.scd_role[])
    or public.scd_has_position(p_organization_id, array['direzione','presidente','direttore-generale','segreteria']);
$$;
revoke all on function public.scd_content_office(uuid) from public, anon;

-- Who may write a post at all: any staff membership. Base users, families and athletes do not (phase 1).
create or replace function public.scd_content_author(p_organization_id uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select public.scd_has_org_role(p_organization_id,
    array['DIRECTION','SECRETARIAT','REGISTRATION','MANAGER','MISTER','STAFF','TOURNAMENTS']::public.scd_role[]);
$$;
revoke all on function public.scd_content_author(uuid) from public, anon;

-- One post as the feed shows it. Reaction count is public; "mine" says whether the caller reacted (false for anonymous).
create or replace function public.scd_post_json(p public.scd_posts, p_viewer uuid)
returns jsonb language sql stable set search_path to 'public' as $$
  select jsonb_build_object(
    'id', p.id, 'channel', p.channel_key, 'kind', p.kind, 'title', p.title, 'body', p.body,
    'mediaUrl', p.media_url, 'liveUrl', p.live_url, 'status', p.status,
    'publishedAt', p.published_at, 'createdAt', p.created_at, 'decisionNote', p.decision_note,
    'forza', (select count(*) from public.scd_post_reactions r where r.post_id = p.id),
    'mine', p_viewer is not null and exists (select 1 from public.scd_post_reactions r where r.post_id = p.id and r.user_id = p_viewer),
    'own', p_viewer is not null and p.author = p_viewer);
$$;
revoke all on function public.scd_post_json(public.scd_posts, uuid) from public, anon;

-- Public feed: approved posts of the organization, newest first. Anyone, signed in or not.
create or replace function public.scd_public_feed(p_org_slug text, p_limit int default 40)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce((select jsonb_agg(public.scd_post_json(p, auth.uid()) order by p.published_at desc)
    from (select * from public.scd_posts p
          where p.organization_id = (select o.id from public.scd_organizations o where o.slug = p_org_slug)
            and p.status = 'APPROVED'
          order by p.published_at desc
          limit greatest(1, least(coalesce(p_limit, 40), 100))) p), '[]'::jsonb);
$$;
revoke all on function public.scd_public_feed(text, int) from public;
grant execute on function public.scd_public_feed(text, int) to anon, authenticated;

-- Approved posts of one channel (team page, event page). Anyone.
create or replace function public.scd_channel_feed(p_org_slug text, p_channel text, p_limit int default 20)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce((select jsonb_agg(public.scd_post_json(p, auth.uid()) order by p.published_at desc)
    from (select * from public.scd_posts p
          where p.organization_id = (select o.id from public.scd_organizations o where o.slug = p_org_slug)
            and p.status = 'APPROVED' and p.channel_key = p_channel
          order by p.published_at desc
          limit greatest(1, least(coalesce(p_limit, 20), 100))) p), '[]'::jsonb);
$$;
revoke all on function public.scd_channel_feed(text, text, int) from public;
grant execute on function public.scd_channel_feed(text, text, int) to anon, authenticated;

-- Followers per channel (public counts, no identities).
create or replace function public.scd_follow_counts(p_org_slug text)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce((select jsonb_object_agg(f.channel_key, f.n)
    from (select channel_key, count(*) n from public.scd_follows
          where organization_id = (select o.id from public.scd_organizations o where o.slug = p_org_slug)
          group by channel_key) f), '{}'::jsonb);
$$;
revoke all on function public.scd_follow_counts(text) from public;
grant execute on function public.scd_follow_counts(text) to anon, authenticated;

-- The caller's follows.
create or replace function public.scd_my_follows(p_organization_id uuid)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce((select jsonb_agg(f.channel_key order by f.created_at) from public.scd_follows f
    where f.organization_id = p_organization_id and f.user_id = (select auth.uid())), '[]'::jsonb);
$$;
revoke all on function public.scd_my_follows(uuid) from public, anon;
grant execute on function public.scd_my_follows(uuid) to authenticated;

-- Follow or unfollow a channel. Any active member (base access included: following is the first thing everyone can do).
create or replace function public.scd_set_follow(p_organization_id uuid, p_channel text, p_on boolean)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if auth.uid() is null or not exists (select 1 from public.scd_memberships m
      where m.organization_id = p_organization_id and m.user_id = auth.uid() and m.active) then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  if p_channel !~ '^(club|team:[a-z0-9_-]{1,40}|event:[a-z0-9_-]{1,60})$' then
    return jsonb_build_object('ok', false, 'code', 'channel');
  end if;
  if p_on then
    insert into public.scd_follows (organization_id, user_id, channel_key) values (p_organization_id, auth.uid(), p_channel)
      on conflict do nothing;
  else
    delete from public.scd_follows where organization_id = p_organization_id and user_id = auth.uid() and channel_key = p_channel;
  end if;
  return jsonb_build_object('ok', true, 'on', p_on);
end;
$$;
revoke all on function public.scd_set_follow(uuid, text, boolean) from public, anon;
grant execute on function public.scd_set_follow(uuid, text, boolean) to authenticated;

-- "Forza SCD": toggle the caller's reaction on an approved post. Any active member.
create or replace function public.scd_toggle_reaction(p_organization_id uuid, p_post_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_on boolean;
begin
  if auth.uid() is null or not exists (select 1 from public.scd_memberships m
      where m.organization_id = p_organization_id and m.user_id = auth.uid() and m.active) then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  if not exists (select 1 from public.scd_posts p where p.id = p_post_id and p.organization_id = p_organization_id and p.status = 'APPROVED') then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;
  if exists (select 1 from public.scd_post_reactions r where r.post_id = p_post_id and r.user_id = auth.uid()) then
    delete from public.scd_post_reactions where post_id = p_post_id and user_id = auth.uid();
    v_on := false;
  else
    insert into public.scd_post_reactions (organization_id, post_id, user_id) values (p_organization_id, p_post_id, auth.uid());
    v_on := true;
  end if;
  return jsonb_build_object('ok', true, 'on', v_on,
    'forza', (select count(*) from public.scd_post_reactions r where r.post_id = p_post_id));
end;
$$;
revoke all on function public.scd_toggle_reaction(uuid, uuid) from public, anon;
grant execute on function public.scd_toggle_reaction(uuid, uuid) to authenticated;

-- Write a post. Direzione / Segreteria: published at once. Other staff: sent to the queue. The three checks are required
-- (the third only for channels of the attività di base, passed by the app as baseActivity=true).
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
  v_office boolean;
  v_id uuid;
begin
  if auth.uid() is null or not public.scd_content_author(p_organization_id) then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  if v_channel is null or v_body is null then
    return jsonb_build_object('ok', false, 'code', 'missing');
  end if;
  if v_channel !~ '^(club|team:[a-z0-9_-]{1,40}|event:[a-z0-9_-]{1,60})$' then
    return jsonb_build_object('ok', false, 'code', 'channel');
  end if;
  if v_kind not in ('NEWS', 'MATCH', 'LIVE') then
    return jsonb_build_object('ok', false, 'code', 'kind');
  end if;
  if not v_minors or not v_names then
    return jsonb_build_object('ok', false, 'code', 'checks');
  end if;
  if v_base and not v_result then
    return jsonb_build_object('ok', false, 'code', 'checks');
  end if;
  if v_kind = 'LIVE' and (v_live is null or v_live !~ '^https://') then
    return jsonb_build_object('ok', false, 'code', 'live');
  end if;
  if v_media is not null and v_media !~ '^(/media/|https://)' then
    return jsonb_build_object('ok', false, 'code', 'media');
  end if;
  v_office := public.scd_content_office(p_organization_id);
  insert into public.scd_posts (organization_id, channel_key, kind, title, body, media_url, live_url, minors_ok, no_names_ok,
      no_result_ok, status, author, decided_by, decided_at, published_at)
    values (p_organization_id, v_channel, v_kind, v_title, v_body, v_media, v_live, v_minors, v_names, v_result,
      case when v_office then 'APPROVED' else 'PENDING' end, auth.uid(),
      case when v_office then auth.uid() end, case when v_office then now() end, case when v_office then now() end)
    returning id into v_id;
  insert into public.scd_post_events (organization_id, post_id, action, actor) values (p_organization_id, v_id, 'CREATED', auth.uid());
  if v_office then
    insert into public.scd_post_events (organization_id, post_id, action, actor) values (p_organization_id, v_id, 'APPROVED', auth.uid());
  end if;
  return jsonb_build_object('ok', true, 'id', v_id, 'status', case when v_office then 'APPROVED' else 'PENDING' end);
end;
$$;
revoke all on function public.scd_create_post(uuid, jsonb) from public, anon;
grant execute on function public.scd_create_post(uuid, jsonb) to authenticated;

-- The caller's own posts, every status, newest first.
create or replace function public.scd_my_posts(p_organization_id uuid)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce((select jsonb_agg(public.scd_post_json(p, auth.uid()) order by p.created_at desc)
    from public.scd_posts p where p.organization_id = p_organization_id and p.author = (select auth.uid())), '[]'::jsonb);
$$;
revoke all on function public.scd_my_posts(uuid) from public, anon;
grant execute on function public.scd_my_posts(uuid) to authenticated;

-- The approval queue (pending first, then the last decided ones). Null for anyone outside the content office.
create or replace function public.scd_posts_queue(p_organization_id uuid)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select case when not public.scd_content_office(p_organization_id) then null
  else coalesce((select jsonb_agg(public.scd_post_json(p, auth.uid())
      order by (p.status = 'PENDING') desc, coalesce(p.decided_at, p.created_at) desc)
    from (select * from public.scd_posts p where p.organization_id = p_organization_id
          and (p.status = 'PENDING' or p.created_at > now() - interval '30 days')
          order by (p.status = 'PENDING') desc, coalesce(p.decided_at, p.created_at) desc limit 100) p), '[]'::jsonb)
  end;
$$;
revoke all on function public.scd_posts_queue(uuid) from public, anon;
grant execute on function public.scd_posts_queue(uuid) to authenticated;

-- Content office decision: APPROVED, REJECTED (a reason is required) or ARCHIVED (takes a post off the feed). Logged.
create or replace function public.scd_decide_post(p_organization_id uuid, p_post_id uuid, p_decision text, p_note text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_status text;
  v_note text := left(nullif(trim(p_note), ''), 300);
begin
  if not public.scd_content_office(p_organization_id) then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  if p_decision not in ('APPROVED', 'REJECTED', 'ARCHIVED') then
    return jsonb_build_object('ok', false, 'code', 'decision');
  end if;
  if p_decision = 'REJECTED' and v_note is null then
    return jsonb_build_object('ok', false, 'code', 'note_required');
  end if;
  select status into v_status from public.scd_posts where id = p_post_id and organization_id = p_organization_id;
  if v_status is null then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;
  update public.scd_posts set status = p_decision, decision_note = v_note, decided_by = auth.uid(), decided_at = now(),
    published_at = case when p_decision = 'APPROVED' then coalesce(published_at, now()) else published_at end,
    updated_at = now()
    where id = p_post_id;
  insert into public.scd_post_events (organization_id, post_id, action, actor, note)
    values (p_organization_id, p_post_id, p_decision, auth.uid(), v_note);
  return jsonb_build_object('ok', true, 'status', p_decision);
end;
$$;
revoke all on function public.scd_decide_post(uuid, uuid, text, text) from public, anon;
grant execute on function public.scd_decide_post(uuid, uuid, text, text) to authenticated;
