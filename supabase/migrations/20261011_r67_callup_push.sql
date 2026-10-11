-- r67: phone notifications for call-ups (Web Push).
--   * scd_push_subscriptions: one row per browser/phone that said yes; RLS on, NO policies — only the functions
--     below touch it (own rows for the caller, delivery list for the service role used by the callup-push edge function);
--   * a subscription is disabled, never removed (unsubscribe or a gone endpoint);
--   * scd_match_callups.notified_at: each call-up is notified once, so a repeated send cannot spam a family;
--   * recipients of a call-up = active accounts linked (verified) to the athlete or to a guardian of the athlete's family,
--     the same circle as scd_my_family / scd_my_callups;
--   * the notification carries only first name, match title and date — never phones, e-mails or health data.
-- Additive only: no existing policy, role or grant changes.

create table if not exists public.scd_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id),
  user_id uuid not null,
  endpoint text not null unique check (endpoint ~ '^https://' and length(endpoint) <= 1000),
  p256dh text not null check (length(p256dh) between 40 and 200),
  auth text not null check (length(auth) between 10 and 100),
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_sent_at timestamptz,
  disabled_at timestamptz,
  disabled_reason text
);
create index if not exists scd_push_subscriptions_user_idx on public.scd_push_subscriptions (organization_id, user_id) where disabled_at is null;
alter table public.scd_push_subscriptions enable row level security;
revoke all on table public.scd_push_subscriptions from anon, authenticated;

alter table public.scd_match_callups add column if not exists notified_at timestamptz;

-- Caller saves (or re-enables) this device.
create or replace function public.scd_push_subscribe(p_organization_id uuid, p_endpoint text, p_p256dh text, p_auth text, p_user_agent text)
returns boolean
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
begin
  if (select auth.uid()) is null or not exists (
    select 1 from public.scd_memberships m
    where m.organization_id = p_organization_id and m.user_id = (select auth.uid()) and m.active
  ) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  insert into public.scd_push_subscriptions (organization_id, user_id, endpoint, p256dh, auth, user_agent)
  values (p_organization_id, (select auth.uid()), p_endpoint, p_p256dh, p_auth, left(p_user_agent, 200))
  on conflict (endpoint) do update
    set organization_id = excluded.organization_id, user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth,
        user_agent = excluded.user_agent, updated_at = now(), disabled_at = null, disabled_reason = null;
  return true;
end;
$$;

-- Caller turns this device off (kept, disabled).
create or replace function public.scd_push_unsubscribe(p_endpoint text)
returns boolean
language sql
volatile
security definer
set search_path to 'public'
as $$
  update public.scd_push_subscriptions
    set disabled_at = now(), disabled_reason = 'USER', updated_at = now()
    where endpoint = p_endpoint and user_id = (select auth.uid()) and disabled_at is null
  returning true;
$$;

-- How many active devices the caller has (no endpoints returned).
create or replace function public.scd_push_my_devices(p_organization_id uuid)
returns integer
language sql
stable
security definer
set search_path to 'public'
as $$
  select count(*)::integer from public.scd_push_subscriptions
  where organization_id = p_organization_id and user_id = (select auth.uid()) and disabled_at is null;
$$;

-- Service role only: who to notify for the not-yet-notified call-ups of one match.
create or replace function public.scd_push_callup_targets(p_match_id uuid)
returns table (
  callup_id uuid,
  first_name text,
  title text,
  starts_at timestamptz,
  time_known boolean,
  meeting_at timestamptz,
  subscription_id uuid,
  endpoint text,
  p256dh text,
  auth text
)
language sql
stable
security definer
set search_path to 'public'
as $$
  with pending as (
    select c.id as callup_id, c.organization_id, a.person_id, p.first_name, e.title, e.starts_at,
           coalesce((e.metadata->>'time_known')::boolean, false) as time_known, c.meeting_at
    from public.scd_match_callups c
    join public.scd_athletes a on a.id = c.athlete_id
    join public.scd_people p on p.id = a.person_id
    join public.scd_matches m on m.id = c.match_id
    join public.scd_events e on e.id = m.event_id
    where c.match_id = p_match_id and c.notified_at is null and e.starts_at >= now() - interval '3 hours'
  ),
  circle as (
    select pd.callup_id, pd.person_id as recipient_person from pending pd
    union
    select pd.callup_id, g.person_id
    from pending pd
    join public.scd_family_members fm on fm.person_id = pd.person_id
    join public.scd_families f on f.id = fm.family_id and f.organization_id = pd.organization_id
    join public.scd_family_members g on g.family_id = fm.family_id and g.is_guardian and g.person_id <> pd.person_id
  ),
  users as (
    select distinct c.callup_id, l.user_id
    from circle c
    join pending pd on pd.callup_id = c.callup_id
    join public.scd_identity_links l
      on l.person_id = c.recipient_person and l.organization_id = pd.organization_id
     and l.link_state in ('AUTO_VERIFIED','VERIFIED_BY_STAFF')
    join public.scd_memberships mb on mb.organization_id = l.organization_id and mb.user_id = l.user_id and mb.active
  )
  select pd.callup_id, pd.first_name, pd.title, pd.starts_at, pd.time_known, pd.meeting_at, s.id, s.endpoint, s.p256dh, s.auth
  from users u
  join pending pd on pd.callup_id = u.callup_id
  join public.scd_push_subscriptions s on s.user_id = u.user_id and s.organization_id = pd.organization_id and s.disabled_at is null;
$$;

-- Service role only: record what was delivered.
create or replace function public.scd_push_mark_sent(p_callup_ids uuid[], p_sent_subscription_ids uuid[], p_gone_subscription_ids uuid[])
returns boolean
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
begin
  update public.scd_match_callups set notified_at = now() where id = any(coalesce(p_callup_ids, '{}')) and notified_at is null;
  update public.scd_push_subscriptions set last_sent_at = now() where id = any(coalesce(p_sent_subscription_ids, '{}'));
  update public.scd_push_subscriptions set disabled_at = now(), disabled_reason = 'GONE', updated_at = now()
    where id = any(coalesce(p_gone_subscription_ids, '{}')) and disabled_at is null;
  return true;
end;
$$;

revoke all on function public.scd_push_subscribe(uuid, text, text, text, text) from public, anon;
revoke all on function public.scd_push_unsubscribe(text) from public, anon;
revoke all on function public.scd_push_my_devices(uuid) from public, anon;
revoke all on function public.scd_push_callup_targets(uuid) from public, anon, authenticated;
revoke all on function public.scd_push_mark_sent(uuid[], uuid[], uuid[]) from public, anon, authenticated;
grant execute on function public.scd_push_subscribe(uuid, text, text, text, text) to authenticated;
grant execute on function public.scd_push_unsubscribe(text) to authenticated;
grant execute on function public.scd_push_my_devices(uuid) to authenticated;
grant execute on function public.scd_push_callup_targets(uuid) to service_role;
grant execute on function public.scd_push_mark_sent(uuid[], uuid[], uuid[]) to service_role;
