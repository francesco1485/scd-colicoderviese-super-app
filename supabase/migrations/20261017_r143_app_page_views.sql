-- r143: "Numeri dell'app" — daily page-view COUNTERS of the public pages of the Super App (2026-10-16, chat PC range
-- r130-r149, next after r140).
-- STAGED: NOT APPLIED. Apply only after Francesco writes "applica r143". Never apply from an agent.
-- Target: SCD PULSE (ndevtxxijbcnskgysdit). Never on dfnwzwutvnwiitiffwvr.
-- Requires: r33 (scd_organizations), r35 (scd_has_org_role), r74 (scd_has_position) live; pg_cron available (r140
-- installed it on SCD PULSE, applied 16/10/2026 20:03). A guard below stops the migration when one is missing.
--
-- Why (Francesco, DG, 16/10/2026 22:34, VERIFIED): «area dove dobbiamo sapere quanti accessi sono stati fatti, quanti
-- sono arrivati sopra all'app… capiamo come migliorare».
--
-- Consent mode DECIDED by Francesco 16/10/2026 23:35 («a», option A): cookieless anonymous daily totals without
-- consent (nothing read or stored on the device, aggregated counts only). The cookie banner and /privacy were updated
-- in the same branch (commit 11c8739; legal basis: legitimate interest in measuring the use of the public pages in
-- aggregated form). Cookie-based statistics would still need consent (manifest rule unchanged). The counter is inert
-- until r143 exists.
--
-- What it adds (and nothing else):
--   1. public.scd_app_page_views_daily (day, path, source, device, views): aggregated counters only. No IP, no user
--      id, no user agent, no cookie, no per-person row, no time of day. RLS on, NO policies, every privilege revoked
--      from anon and authenticated: the table is read and written only through the functions below.
--   2. public.scd_track_page_view(p_path, p_source, p_device) SECURITY DEFINER, search_path '': +1 on today's row
--      (Europe/Rome). Normalises the path (query string and hash cut, lower case, repeated slashes merged, uuid,
--      numeric or unusual segments -> ':id', at most 8 segments) and refuses anything else silently (returns without
--      writing): input longer than 2048 characters, path not starting with '/', longer than 120 characters, first
--      segment outside the ALLOWLIST of public pages (home '/' plus the public prefixes of
--      apps/superapp/src/lib/http-policy.ts without /entra; mirror: apps/superapp/src/lib/page-views.ts
--      PUBLIC_PATH_SEGMENTS, kept equal by page-views-migration.test.ts), source outside
--      direct/instagram/facebook/tiktok/whatsapp/google/qr/other, device outside phone/tablet/desktop.
--      Abuse caps: a row stops at 100000 views; at most 5000 distinct rows per day. Executable ONLY by service_role:
--      the app server calls it (server function trackPageView, per-IP limit 60/minute in memory, IP never stored or
--      logged), so nobody can inflate or fill the counters by calling the RPC directly with the public key.
--   3. public.scd_app_stats(p_days) SECURITY DEFINER, search_path '': the rows of the last p_days days (1..366, today
--      included), only for the Direzione (role DIRECTION, or position direzione / presidente / direttore-generale in
--      any organisation, via scd_has_org_role / scd_has_position as in r139); others get 42501 'forbidden'.
--      Executable by authenticated only.
--   4. public.scd_app_page_views_purge() (service role only) deletes the rows older than 25 months, and one daily
--      pg_cron job 'scd_app_page_views_purge' at 01:27 UTC calls it (pattern of r140; idempotent: a job with the same
--      name is unscheduled first).
--
-- Data: no personal data and no minors' data: a row says "on 17/10 the page /calendario was opened 42 times from
-- Instagram on a phone". Unique visitors are NOT counted (that would need an identifier on the device).
--
-- Engines: PERSONE (how many families and fans reach the app and from which social) and SOLDI (real audience numbers
-- for sponsors, never invented). Measure: visits per week, share from social, share from phone, top pages; the page
-- /gestionale/numeri shows them to the Direzione.
--
-- Live state: NOT read by the agent that wrote this file (no database tool in that session). Check before applying
-- (read-only):
--   select to_regclass('public.scd_app_page_views_daily');
--   select extname, extversion from pg_extension where extname = 'pg_cron';
--   select jobname, schedule, command from cron.job order by jobid;
-- Check after applying (read-only):
--   select jobname, schedule, command, username, active from cron.job where jobname = 'scd_app_page_views_purge';
--   select grantee, privilege_type from information_schema.role_table_grants where table_name = 'scd_app_page_views_daily';
--
-- Idempotent (create if not exists / create or replace / job unscheduled and rescheduled).
--
-- Rollback (only on Francesco's explicit order; the counters are lost):
--   begin;
--   select cron.unschedule(jobid) from cron.job where jobname = 'scd_app_page_views_purge';
--   drop function if exists public.scd_app_page_views_purge();
--   drop function if exists public.scd_app_stats(integer);
--   drop function if exists public.scd_track_page_view(text, text, text);
--   drop table if exists public.scd_app_page_views_daily;
--   commit;

begin;

-- ---------------------------------------------------------------- 0. prerequisites (fail closed)
do $$
begin
  if to_regclass('public.scd_organizations') is null
     or to_regprocedure('public.scd_has_org_role(uuid, public.scd_role[])') is null
     or to_regprocedure('public.scd_has_position(uuid, text[])') is null then
    raise exception 'r143 prerequisites missing (r33, r35, r74)';
  end if;
end;
$$;

-- ---------------------------------------------------------------- 1. counters (aggregated only)
create table if not exists public.scd_app_page_views_daily (
  day date not null,
  path text not null check (char_length(path) between 1 and 120 and left(path, 1) = '/'),
  source text not null check (source in ('direct','instagram','facebook','tiktok','whatsapp','google','qr','other')),
  device text not null check (device in ('phone','tablet','desktop')),
  views integer not null default 0 check (views >= 0),
  primary key (day, path, source, device)
);
alter table public.scd_app_page_views_daily enable row level security;
revoke all on table public.scd_app_page_views_daily from public, anon, authenticated;

-- ---------------------------------------------------------------- 2. +1 on today's row (service role only, called by the app server)
create or replace function public.scd_track_page_view(p_path text, p_source text, p_device text)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare
  v_path text;
  v_day date := (now() at time zone 'Europe/Rome')::date;
  v_segments text[];
begin
  if p_path is null or p_source is null or p_device is null then return; end if;
  if char_length(p_path) > 2048 then return; end if;
  if p_source not in ('direct','instagram','facebook','tiktok','whatsapp','google','qr','other') then return; end if;
  if p_device not in ('phone','tablet','desktop') then return; end if;
  -- query string and hash never stored
  v_path := split_part(split_part(p_path, '?', 1), '#', 1);
  if left(v_path, 1) <> '/' or char_length(v_path) > 120 then return; end if;
  v_path := lower(v_path);
  select coalesce(array_agg(
           case
             when s ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then ':id'
             when s ~ '^[0-9]+$' then ':id'
             when s !~ '^[a-z0-9][a-z0-9._-]{0,59}$' then ':id'
             else s
           end order by n), array[]::text[])
    into v_segments
    from unnest(string_to_array(v_path, '/')) with ordinality as u(s, n)
   where s <> '';
  if cardinality(v_segments) > 8 then return; end if;
  v_path := '/' || array_to_string(v_segments, '/');
  -- only the public pages are counted: home or a path equal to / below an allowlisted prefix (mirror: lib/page-views.ts PUBLIC_PATH_SEGMENTS)
  if cardinality(v_segments) > 0 and not exists (select 1 from unnest(array[
    'calendario','card','classifiche','community','comunicazioni','contatti','elimina-account','eventi','fantacalcio',
    'fornitori','guida','impianti','installa','kit','partner','privacy','rassegna-stampa','safeguarding','societa',
    'sponsor','squadre/prima','squadre/u16','squadre/u19','top11','tornei','vetta-legnone'
  ]) as a(p) where v_path = '/' || a.p or v_path like '/' || a.p || '/%') then return; end if;
  if char_length(v_path) > 120 then return; end if;
  -- abuse cap: at most 5000 distinct rows per day
  if not exists (select 1 from public.scd_app_page_views_daily d
                  where d.day = v_day and d.path = v_path and d.source = p_source and d.device = p_device)
     and (select count(*) from public.scd_app_page_views_daily d where d.day = v_day) >= 5000 then
    return;
  end if;
  insert into public.scd_app_page_views_daily as t (day, path, source, device, views)
  values (v_day, v_path, p_source, p_device, 1)
  on conflict (day, path, source, device) do update set views = t.views + 1 where t.views < 100000;
end;
$$;
revoke all on function public.scd_track_page_view(text, text, text) from public, anon, authenticated;
grant execute on function public.scd_track_page_view(text, text, text) to service_role;

-- ---------------------------------------------------------------- 3. read for the Direzione
create or replace function public.scd_app_stats(p_days integer)
returns table (day date, path text, source text, device text, views integer)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_today date := (now() at time zone 'Europe/Rome')::date;
begin
  if (select auth.uid()) is null or not exists (
    select 1 from public.scd_organizations o
     where public.scd_has_org_role(o.id, array['DIRECTION']::public.scd_role[])
        or public.scd_has_position(o.id, array['direzione','presidente','direttore-generale'])
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_days is null or p_days < 1 or p_days > 366 then
    raise exception 'invalid days' using errcode = '22023';
  end if;
  return query
    select d.day, d.path, d.source, d.device, d.views
      from public.scd_app_page_views_daily d
     where d.day > v_today - p_days and d.day <= v_today
     order by d.day, d.path, d.source, d.device;
end;
$$;
revoke all on function public.scd_app_stats(integer) from public, anon, authenticated;
grant execute on function public.scd_app_stats(integer) to authenticated;

-- ---------------------------------------------------------------- 4. retention: 25 months (service role, daily job)
create or replace function public.scd_app_page_views_purge()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_n integer;
begin
  delete from public.scd_app_page_views_daily
   where day < ((now() at time zone 'Europe/Rome')::date - interval '25 months')::date;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;
revoke all on function public.scd_app_page_views_purge() from public, anon, authenticated;
grant execute on function public.scd_app_page_views_purge() to service_role;

-- ---------------------------------------------------------------- 5. daily purge job (pg_cron, pattern of r140)
do $$
begin
  if not exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    raise exception 'r143: pg_cron not available on this server';
  end if;
end;
$$;

create extension if not exists pg_cron with schema pg_catalog;

do $$
declare
  v_job record;
begin
  for v_job in select jobid from cron.job where jobname = 'scd_app_page_views_purge' loop
    perform cron.unschedule(v_job.jobid);
  end loop;
  perform cron.schedule('scd_app_page_views_purge', '27 1 * * *', 'select public.scd_app_page_views_purge();');
  if not has_function_privilege(current_user, 'public.scd_app_page_views_purge()', 'execute') then
    raise exception 'r143: % cannot execute public.scd_app_page_views_purge()', current_user;
  end if;
  if (select count(*) from cron.job where jobname = 'scd_app_page_views_purge') <> 1 then
    raise exception 'r143: job scd_app_page_views_purge not scheduled exactly once';
  end if;
end;
$$;

commit;
