-- r89: Avviso push a chi segue un canale quando esce un nuovo post (UD-089 "segui chi ti interessa"). Solo post
-- APPROVED, una volta sola (notified_at), mai all'autore, mai dati di minori nel testo dell'avviso (titolo o prime
-- parole del post, già passati dal moderatore). Targets and marks are reachable only by the edge function (service role).

alter table public.scd_posts add column if not exists notified_at timestamptz;

create or replace function public.scd_push_post_targets(p_post_id uuid)
returns table (
  post_id uuid,
  channel_key text,
  title text,
  body text,
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
  select p.id, p.channel_key, p.title, left(p.body, 140), s.id, s.endpoint, s.p256dh, s.auth
  from public.scd_posts p
  join public.scd_follows f on f.organization_id = p.organization_id and f.channel_key = p.channel_key and f.user_id <> p.author
  join public.scd_push_subscriptions s on s.organization_id = p.organization_id and s.user_id = f.user_id and s.disabled_at is null
  where p.id = p_post_id and p.status = 'APPROVED' and p.notified_at is null;
$$;
revoke all on function public.scd_push_post_targets(uuid) from public, anon, authenticated;
grant execute on function public.scd_push_post_targets(uuid) to service_role;

-- May the caller trigger the notification of this post? The author or the content office, and the post must be live.
create or replace function public.scd_push_post_allowed(p_post_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.scd_posts p
    where p.id = p_post_id and p.status = 'APPROVED'
      and (p.author = (select auth.uid()) or public.scd_content_office(p.organization_id)));
$$;
revoke all on function public.scd_push_post_allowed(uuid) from public, anon;
grant execute on function public.scd_push_post_allowed(uuid) to authenticated;

create or replace function public.scd_push_mark_post_sent(p_post_id uuid, p_sent_subscription_ids uuid[], p_gone_subscription_ids uuid[])
returns boolean
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
begin
  update public.scd_posts set notified_at = now() where id = p_post_id and notified_at is null;
  update public.scd_push_subscriptions set last_sent_at = now() where id = any(coalesce(p_sent_subscription_ids, '{}'));
  update public.scd_push_subscriptions set disabled_at = now(), disabled_reason = 'GONE', updated_at = now()
    where id = any(coalesce(p_gone_subscription_ids, '{}')) and disabled_at is null;
  return true;
end;
$$;
revoke all on function public.scd_push_mark_post_sent(uuid, uuid[], uuid[]) from public, anon, authenticated;
grant execute on function public.scd_push_mark_post_sent(uuid, uuid[], uuid[]) to service_role;
