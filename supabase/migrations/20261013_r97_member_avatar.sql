-- r97: "Crea il tuo campione" v1 — member avatar choice, AI generation counter, card/credits profile — 2026-10-13.
-- Direzione 13/10/2026 09:45 ("ok procedi"): first version inside the members area (/la-mia-scd/campione), NOT
-- published. STATUS: PROPOSED — written, not applied. Applying it requires the Direzione approval of migrations
-- (UD-028 / plan D8). Until then the page runs in preview mode and says that saving is not active.
--
-- Principles:
--   * NO PHOTOS are stored, ever: only the chosen base key (a file of the app), nickname and shirt number.
--   * Owner-only: a member reads only their own row; writes only through security-definer RPCs that re-check the
--     rules on the server (minors and unknown ages: back-view bases only; nickname 2-14 characters; number 1-99).
--   * Age is computed here from club data, never trusted from the browser: a person linked to the account
--     (scd_identity_links, verified) whose e-mail is the account e-mail, or the account's own access request (r64).
--     Any minor found, or no birth date at all, means MINOR/UNKNOWN (fail-closed).
--   * Credits are read-only here: the balance is the sum of the existing append-only ledger scd_fan_points_ledger
--     (r53). Nothing in this migration awards or spends credits. Credits are never money.
--   * AI generation counter: one row per attempt (no prompt text, no image), hard caps 3/day and 10/month.

create table if not exists public.scd_member_avatars (
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  method text not null default 'BASE' check (method in ('BASE')),
  base_key text not null check (base_key in ('lampo-7','falco-9','muro-1','roccia-10','mister','tifosa')),
  base_view text not null check (base_view in ('BACK','THREE_QUARTER','FACE')),
  nickname text not null check (char_length(nickname) between 2 and 14 and nickname !~ '\d{5,}'),
  shirt_number smallint not null check (shirt_number between 1 and 99),
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

comment on table public.scd_member_avatars is
  'Crea il tuo campione v1: chosen realistic base (AI-generated original, not a photo), nickname, shirt number. No photos, no biometric data. Owner-only; writes via scd_set_my_avatar.';

create table if not exists public.scd_avatar_generation_log (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  outcome text not null default 'RESERVED' check (outcome in ('RESERVED','DONE','BLOCKED','FAILED')),
  created_at timestamptz not null default now()
);
create index if not exists scd_avatar_generation_log_user_idx
  on public.scd_avatar_generation_log (organization_id, user_id, created_at desc);

comment on table public.scd_avatar_generation_log is
  'One row per AI avatar generation attempt for daily/monthly caps. Never stores prompt text or images.';

alter table public.scd_member_avatars enable row level security;
alter table public.scd_avatar_generation_log enable row level security;

revoke all on table public.scd_member_avatars from anon, authenticated;
revoke all on table public.scd_avatar_generation_log from anon, authenticated;
grant select on table public.scd_member_avatars to authenticated;
grant select on table public.scd_avatar_generation_log to authenticated;

drop policy if exists scd_member_avatars_select_own on public.scd_member_avatars;
create policy scd_member_avatars_select_own on public.scd_member_avatars
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists scd_avatar_generation_log_select_own on public.scd_avatar_generation_log;
create policy scd_avatar_generation_log_select_own on public.scd_avatar_generation_log
  for select to authenticated using (user_id = (select auth.uid()));

-- Age band of the calling user: 'ADULT', 'MINOR' or 'UNKNOWN' (UNKNOWN is treated as minor by every caller).
create or replace function public.scd_my_age_band(p_organization_id uuid)
returns text
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_minor boolean := false;
  v_adult boolean := false;
  r record;
begin
  if v_uid is null then return 'UNKNOWN'; end if;
  select lower(email) into v_email from auth.users where id = v_uid;
  if v_email is null then return 'UNKNOWN'; end if;

  for r in
    select p.birth_date
    from public.scd_identity_links l
    join public.scd_memberships m
      on m.organization_id = l.organization_id and m.user_id = l.user_id and m.active
    join public.scd_people p on p.id = l.person_id
    where l.organization_id = p_organization_id
      and l.user_id = v_uid
      and l.link_state in ('AUTO_VERIFIED','VERIFIED_BY_STAFF')
      and lower(coalesce(p.email, '')) = v_email
    union all
    select a.birth_date
    from public.scd_access_requests a
    where a.organization_id = p_organization_id
      and lower(a.email) = v_email
      and a.status = 'APPROVED'
  loop
    if r.birth_date is null then continue; end if;
    if r.birth_date > current_date - interval '18 years' then v_minor := true; else v_adult := true; end if;
  end loop;

  if v_minor then return 'MINOR'; end if;
  if v_adult then return 'ADULT'; end if;
  return 'UNKNOWN';
end;
$$;

-- Everything the page needs in one read: age band, credits balance (read-only), saved avatar, today's/month's
-- generation counts. Returns null fields when there is nothing; never another user's data.
create or replace function public.scd_my_member_profile(p_organization_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
  v_balance integer;
  v_rows integer;
  v_avatar jsonb;
  v_today integer;
  v_month integer;
begin
  if v_uid is null then return null; end if;
  if not exists (select 1 from public.scd_memberships m
                 where m.organization_id = p_organization_id and m.user_id = v_uid and m.active) then
    return null;
  end if;

  select coalesce(sum(l.points), 0)::integer, count(*)::integer into v_balance, v_rows
  from public.scd_fan_points_ledger l
  where l.organization_id = p_organization_id and l.user_id = v_uid;

  select jsonb_build_object('base_key', a.base_key, 'nickname', a.nickname, 'shirt_number', a.shirt_number,
                            'updated_at', a.updated_at)
    into v_avatar
  from public.scd_member_avatars a
  where a.organization_id = p_organization_id and a.user_id = v_uid;

  select count(*) filter (where g.created_at >= date_trunc('day', now() at time zone 'Europe/Rome') at time zone 'Europe/Rome'),
         count(*) filter (where g.created_at >= date_trunc('month', now() at time zone 'Europe/Rome') at time zone 'Europe/Rome')
    into v_today, v_month
  from public.scd_avatar_generation_log g
  where g.organization_id = p_organization_id and g.user_id = v_uid and g.outcome <> 'BLOCKED';

  return jsonb_build_object(
    'age_band', public.scd_my_age_band(p_organization_id),
    'credits_balance', greatest(v_balance, 0),
    'ledger_rows', v_rows,
    'avatar', v_avatar,
    'gen_today', coalesce(v_today, 0),
    'gen_month', coalesce(v_month, 0)
  );
end;
$$;

-- Save the chosen base. Re-checks every rule on the server; answers a code the page turns into Italian text.
create or replace function public.scd_set_my_avatar(
  p_organization_id uuid, p_base_key text, p_nickname text, p_shirt_number integer
)
returns text
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
  v_view text;
  v_nick text := regexp_replace(trim(coalesce(p_nickname, '')), '\s+', ' ', 'g');
  v_band text;
begin
  if v_uid is null then return 'NOT_SIGNED_IN'; end if;
  if not exists (select 1 from public.scd_memberships m
                 where m.organization_id = p_organization_id and m.user_id = v_uid and m.active) then
    return 'NOT_MEMBER';
  end if;

  v_view := case p_base_key
    when 'lampo-7' then 'BACK' when 'falco-9' then 'BACK' when 'muro-1' then 'BACK'
    when 'roccia-10' then 'THREE_QUARTER' when 'mister' then 'FACE' when 'tifosa' then 'FACE'
    else null end;
  if v_view is null then return 'INVALID_BASE'; end if;

  v_band := public.scd_my_age_band(p_organization_id);
  if v_band <> 'ADULT' and v_view <> 'BACK' then return 'BACK_VIEW_ONLY'; end if;

  if char_length(v_nick) not between 2 and 14
     or v_nick !~ '^[[:alnum:]][[:alnum:] ''.-]*$'
     or v_nick ~ '\d{5,}' then
    return 'INVALID_NICKNAME';
  end if;
  if p_shirt_number is null or p_shirt_number not between 1 and 99 then return 'INVALID_NUMBER'; end if;

  insert into public.scd_member_avatars (organization_id, user_id, method, base_key, base_view, nickname, shirt_number, updated_at)
  values (p_organization_id, v_uid, 'BASE', p_base_key, v_view, v_nick, p_shirt_number, now())
  on conflict (organization_id, user_id) do update
    set method = excluded.method, base_key = excluded.base_key, base_view = excluded.base_view,
        nickname = excluded.nickname, shirt_number = excluded.shirt_number, updated_at = now();
  return 'SAVED';
end;
$$;

-- Reserve one AI generation attempt within the caps (hard maximum 3/day, 10/month whatever the caller asks).
create or replace function public.scd_avatar_generation_reserve(
  p_organization_id uuid, p_daily_cap integer default 3, p_monthly_cap integer default 10
)
returns jsonb
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
  v_daily integer := least(greatest(coalesce(p_daily_cap, 3), 0), 3);
  v_monthly integer := least(greatest(coalesce(p_monthly_cap, 10), 0), 10);
  v_today integer;
  v_month integer;
  v_id bigint;
begin
  if v_uid is null then return jsonb_build_object('allowed', false, 'reason', 'NOT_SIGNED_IN'); end if;
  if not exists (select 1 from public.scd_memberships m
                 where m.organization_id = p_organization_id and m.user_id = v_uid and m.active) then
    return jsonb_build_object('allowed', false, 'reason', 'NOT_MEMBER');
  end if;
  -- Serialise attempts of the same user so two parallel requests cannot both pass the cap.
  perform pg_advisory_xact_lock(hashtextextended('scd_avatar_gen:' || v_uid::text, 0));

  select count(*) filter (where g.created_at >= date_trunc('day', now() at time zone 'Europe/Rome') at time zone 'Europe/Rome'),
         count(*) filter (where g.created_at >= date_trunc('month', now() at time zone 'Europe/Rome') at time zone 'Europe/Rome')
    into v_today, v_month
  from public.scd_avatar_generation_log g
  where g.organization_id = p_organization_id and g.user_id = v_uid and g.outcome <> 'BLOCKED';

  if v_month >= v_monthly then
    return jsonb_build_object('allowed', false, 'reason', 'MONTHLY_CAP', 'today', v_today, 'month', v_month);
  end if;
  if v_today >= v_daily then
    return jsonb_build_object('allowed', false, 'reason', 'DAILY_CAP', 'today', v_today, 'month', v_month);
  end if;

  insert into public.scd_avatar_generation_log (organization_id, user_id, outcome)
  values (p_organization_id, v_uid, 'RESERVED') returning id into v_id;
  return jsonb_build_object('allowed', true, 'id', v_id, 'today', v_today + 1, 'month', v_month + 1);
end;
$$;

-- Close a reserved attempt (DONE / FAILED / BLOCKED). BLOCKED attempts (moderation by the provider) do not count.
create or replace function public.scd_avatar_generation_close(p_id bigint, p_outcome text)
returns boolean
language sql
volatile
security definer
set search_path to 'public'
as $$
  update public.scd_avatar_generation_log
     set outcome = p_outcome
   where id = p_id and user_id = (select auth.uid()) and outcome = 'RESERVED'
     and p_outcome in ('DONE','FAILED','BLOCKED')
  returning true;
$$;

revoke all on function public.scd_my_age_band(uuid) from public, anon;
revoke all on function public.scd_my_member_profile(uuid) from public, anon;
revoke all on function public.scd_set_my_avatar(uuid, text, text, integer) from public, anon;
revoke all on function public.scd_avatar_generation_reserve(uuid, integer, integer) from public, anon;
revoke all on function public.scd_avatar_generation_close(bigint, text) from public, anon;
grant execute on function public.scd_my_age_band(uuid) to authenticated;
grant execute on function public.scd_my_member_profile(uuid) to authenticated;
grant execute on function public.scd_set_my_avatar(uuid, text, text, integer) to authenticated;
grant execute on function public.scd_avatar_generation_reserve(uuid, integer, integer) to authenticated;
grant execute on function public.scd_avatar_generation_close(bigint, text) to authenticated;
