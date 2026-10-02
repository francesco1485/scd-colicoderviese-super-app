-- R53 — Football Private Core + Social Interactive Foundation
-- Additive, fail-closed and privacy-first. No sample people, results, sponsors, rewards or deadlines are seeded.
-- Existing invariants remain canonical:
--   EVENT_ID = public.scd_events.id
--   medical expiry = public.scd_athletes.medical_certificate_expires_at
--   LND/FIGC state = public.scd_tesseramenti.portal_status

create table if not exists public.scd_training_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  team_id uuid not null references public.scd_teams(id) on delete cascade,
  event_id uuid unique references public.scd_events(id) on delete set null,
  starts_at timestamptz not null,
  duration_minutes integer not null default 90 check (duration_minutes between 1 and 360),
  technical_theme text,
  coach_notes text,
  created_by_user_id uuid references auth.users(id) on delete set null,
  source_id text not null default 'SCD_STAFF',
  source_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scd_training_attendance (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  training_session_id uuid not null references public.scd_training_sessions(id) on delete cascade,
  athlete_id uuid not null references public.scd_athletes(id) on delete cascade,
  present boolean not null default true,
  absence_reason text,
  rpe smallint check (rpe between 1 and 10),
  recorded_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (training_session_id, athlete_id)
);

create table if not exists public.scd_match_performance (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  match_id uuid not null references public.scd_matches(id) on delete cascade,
  athlete_id uuid not null references public.scd_athletes(id) on delete cascade,
  starter boolean not null default false,
  minutes_played integer not null default 0 check (minutes_played between 0 and 130),
  goals integer not null default 0 check (goals >= 0),
  assists integer not null default 0 check (assists >= 0),
  yellow_cards integer not null default 0 check (yellow_cards between 0 and 2),
  red_card boolean not null default false,
  staff_rating numeric(3,1) check (staff_rating is null or staff_rating between 0 and 10),
  technical_note text,
  recorded_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, athlete_id)
);

create table if not exists public.scd_match_callups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  match_id uuid not null references public.scd_matches(id) on delete cascade,
  athlete_id uuid not null references public.scd_athletes(id) on delete cascade,
  meeting_at timestamptz,
  meeting_place text,
  kit_note text,
  response_status text not null default 'PENDING'
    check (response_status in ('PENDING','CONFIRMED','DECLINED')),
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, athlete_id)
);

create or replace function public.scd_validate_match_callup_eligibility()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_person_id uuid;
  v_medical_expiry date;
  v_match_date date;
  v_season_id uuid;
  v_registration_ok boolean;
begin
  select a.person_id, a.medical_certificate_expires_at
    into v_person_id, v_medical_expiry
  from public.scd_athletes a
  where a.id = new.athlete_id
    and a.organization_id = new.organization_id;

  if v_person_id is null then
    raise exception 'SCD_CALLUP_BLOCKED: athlete not found in organization';
  end if;

  select (e.starts_at at time zone 'Europe/Rome')::date, e.season_id
    into v_match_date, v_season_id
  from public.scd_matches m
  join public.scd_events e on e.id = m.event_id
  where m.id = new.match_id
    and m.organization_id = new.organization_id;

  if v_match_date is null then
    raise exception 'SCD_CALLUP_BLOCKED: canonical match event unavailable';
  end if;

  if v_medical_expiry is null or v_medical_expiry < v_match_date then
    raise exception 'SCD_CALLUP_BLOCKED: medical certificate not valid on match date';
  end if;

  select exists (
    select 1
    from public.scd_tesseramenti t
    where t.organization_id = new.organization_id
      and t.person_id = v_person_id
      and t.portal_status = 'APPROVATO_FIGC'
      and (v_season_id is null or t.season_id = v_season_id)
  ) into v_registration_ok;

  if not v_registration_ok then
    raise exception 'SCD_CALLUP_BLOCKED: FIGC registration not approved for canonical season';
  end if;

  return new;
end;
$$;

revoke all on function public.scd_validate_match_callup_eligibility() from public, anon, authenticated;

drop trigger if exists scd_match_callups_eligibility_guard on public.scd_match_callups;
create trigger scd_match_callups_eligibility_guard
before insert or update of athlete_id, match_id, organization_id
on public.scd_match_callups
for each row execute function public.scd_validate_match_callup_eligibility();

create table if not exists public.scd_fan_gamification (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  points_rossoblu integer not null default 0 check (points_rossoblu >= 0),
  badge_level text not null default 'ROOKIE'
    check (badge_level in ('ROOKIE','SUPPORTER','ROSSOBLU','LARIO_LEGEND')),
  last_stadium_checkin_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists public.scd_fan_points_ledger (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  points integer not null check (points <> 0 and points between -10000 and 10000),
  reason_code text not null,
  event_id uuid references public.scd_events(id) on delete set null,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  unique (organization_id, idempotency_key)
);

create table if not exists public.scd_social_mvp_candidates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  match_id uuid not null references public.scd_matches(id) on delete cascade,
  athlete_id uuid not null references public.scd_athletes(id) on delete cascade,
  public_label text not null,
  public_media_authorized boolean not null default false,
  active boolean not null default true,
  source_verified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (match_id, athlete_id)
);

create table if not exists public.scd_social_mvp_votes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  match_id uuid not null references public.scd_matches(id) on delete cascade,
  voter_user_id uuid not null references auth.users(id) on delete cascade,
  candidate_id uuid not null references public.scd_social_mvp_candidates(id) on delete cascade,
  voted_at timestamptz not null default now(),
  unique (match_id, voter_user_id)
);

create table if not exists public.scd_social_sponsor_deals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  sponsor_source_id text not null,
  sponsor_source_record_id text not null,
  title text not null,
  discount_code text,
  discount_percentage integer check (discount_percentage between 1 and 100),
  latitude numeric(10,7),
  longitude numeric(10,7),
  radius_meters integer check (radius_meters is null or radius_meters between 25 and 50000),
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean not null default false,
  source_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at >= starts_at),
  unique (organization_id, sponsor_source_id, sponsor_source_record_id, title)
);

create table if not exists public.scd_social_rewards (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  title text not null,
  description text not null,
  points_cost integer not null check (points_cost > 0),
  quantity_available integer check (quantity_available is null or quantity_available >= 0),
  active boolean not null default false,
  source_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scd_social_reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reward_id uuid not null references public.scd_social_rewards(id) on delete restrict,
  points_spent integer not null check (points_spent > 0),
  claim_token_hash text not null unique,
  status text not null default 'PENDING'
    check (status in ('PENDING','CLAIMED_BAR','CLAIMED_SECRETARIAT','CANCELLED','EXPIRED')),
  redeemed_at timestamptz not null default now(),
  claimed_at timestamptz
);

create table if not exists public.scd_team_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  team_id uuid not null references public.scd_teams(id) on delete cascade,
  sender_user_id uuid references auth.users(id) on delete set null,
  body text not null check (char_length(body) between 1 and 2000),
  moderation_state text not null default 'VISIBLE'
    check (moderation_state in ('VISIBLE','HIDDEN','FLAGGED','REMOVED')),
  created_at timestamptz not null default now()
);

create table if not exists public.scd_live_match_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  match_id uuid not null references public.scd_matches(id) on delete cascade,
  minute_label text,
  event_type text not null,
  body text not null check (char_length(body) between 1 and 1000),
  published_by_user_id uuid references auth.users(id) on delete set null,
  published boolean not null default false,
  source_verified_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.scd_deadlines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  title text not null,
  description text,
  due_at timestamptz not null,
  alert_type text not null default 'MANUAL' check (alert_type in ('MANUAL','AUTOMATIC')),
  status text not null default 'OPEN' check (status in ('OPEN','IN_PROGRESS','DONE','CANCELLED')),
  source_id text not null default 'SCD_INTERNAL',
  source_record_id text,
  source_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists scd_training_sessions_team_start_idx on public.scd_training_sessions(team_id, starts_at desc);
create index if not exists scd_training_attendance_session_idx on public.scd_training_attendance(training_session_id);
create index if not exists scd_training_attendance_athlete_idx on public.scd_training_attendance(athlete_id);
create index if not exists scd_match_performance_match_idx on public.scd_match_performance(match_id);
create index if not exists scd_match_performance_athlete_idx on public.scd_match_performance(athlete_id);
create index if not exists scd_match_callups_match_idx on public.scd_match_callups(match_id);
create index if not exists scd_match_callups_athlete_idx on public.scd_match_callups(athlete_id);
create index if not exists scd_fan_gamification_user_idx on public.scd_fan_gamification(user_id);
create index if not exists scd_fan_points_ledger_user_created_idx on public.scd_fan_points_ledger(user_id, created_at desc);
create index if not exists scd_social_mvp_votes_match_idx on public.scd_social_mvp_votes(match_id);
create index if not exists scd_social_mvp_candidates_match_idx on public.scd_social_mvp_candidates(match_id, active);
create index if not exists scd_social_sponsor_deals_active_idx on public.scd_social_sponsor_deals(organization_id, active);
create index if not exists scd_social_rewards_active_idx on public.scd_social_rewards(organization_id, active);
create index if not exists scd_social_redemptions_user_idx on public.scd_social_reward_redemptions(user_id, redeemed_at desc);
create index if not exists scd_team_messages_team_created_idx on public.scd_team_messages(team_id, created_at desc);
create index if not exists scd_live_match_events_match_created_idx on public.scd_live_match_events(match_id, created_at);
create index if not exists scd_deadlines_due_idx on public.scd_deadlines(organization_id, status, due_at);

alter table public.scd_training_sessions enable row level security;
alter table public.scd_training_attendance enable row level security;
alter table public.scd_match_performance enable row level security;
alter table public.scd_match_callups enable row level security;
alter table public.scd_fan_gamification enable row level security;
alter table public.scd_fan_points_ledger enable row level security;
alter table public.scd_social_mvp_candidates enable row level security;
alter table public.scd_social_mvp_votes enable row level security;
alter table public.scd_social_sponsor_deals enable row level security;
alter table public.scd_social_rewards enable row level security;
alter table public.scd_social_reward_redemptions enable row level security;
alter table public.scd_team_messages enable row level security;
alter table public.scd_live_match_events enable row level security;
alter table public.scd_deadlines enable row level security;

-- R53 is staged behind server-side commands. No direct browser access until user/person/team binding is verified.
revoke all on table public.scd_training_sessions from anon, authenticated;
revoke all on table public.scd_training_attendance from anon, authenticated;
revoke all on table public.scd_match_performance from anon, authenticated;
revoke all on table public.scd_match_callups from anon, authenticated;
revoke all on table public.scd_fan_gamification from anon, authenticated;
revoke all on table public.scd_fan_points_ledger from anon, authenticated;
revoke all on table public.scd_social_mvp_candidates from anon, authenticated;
revoke all on table public.scd_social_mvp_votes from anon, authenticated;
revoke all on table public.scd_social_sponsor_deals from anon, authenticated;
revoke all on table public.scd_social_rewards from anon, authenticated;
revoke all on table public.scd_social_reward_redemptions from anon, authenticated;
revoke all on table public.scd_team_messages from anon, authenticated;
revoke all on table public.scd_live_match_events from anon, authenticated;
revoke all on table public.scd_deadlines from anon, authenticated;

comment on table public.scd_match_callups is 'Canonical match callups. Eligibility is checked against FIGC approval and medical validity on the canonical match date.';
comment on table public.scd_match_performance is 'Internal staff-only technical report. Never a public minor ranking source.';
comment on table public.scd_training_attendance is 'Private operational attendance. RPE is staff-only and must never feed public rankings or psychological inference.';
comment on table public.scd_social_mvp_candidates is 'MVP candidates must be explicitly enabled and public-safe; no automatic minor publication.';
comment on table public.scd_team_messages is 'Protected team channel foundation. No unsupervised minor 1:1 messaging.';
comment on table public.scd_social_reward_redemptions is 'Redemptions store only an opaque token hash. Claim codes are generated and validated server-side.';
comment on table public.scd_social_sponsor_deals is 'Verified territorial partner offers. Geolocation must remain explicit opt-in; continuous background tracking is forbidden.';
