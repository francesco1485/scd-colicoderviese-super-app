-- R56 — Identity, Access, Calendar & Club Intelligence
-- Additive, privacy-first, fail-closed, future-ready.
-- No operational users, minors, fixtures, rewards or scores are seeded.

create table if not exists public.scd_identity_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  person_id uuid not null references public.scd_people(id) on delete cascade,
  link_state text not null default 'PENDING_REVIEW'
    check (link_state in ('AUTO_VERIFIED','VERIFIED_BY_STAFF','PENDING_REVIEW','REJECTED','REVOKED')),
  match_method text not null
    check (match_method in ('EMAIL_EXACT','PHONE_BIRTHDATE','MANUAL_STAFF','IMPORT_CANONICAL')),
  confidence smallint not null default 0 check (confidence between 0 and 100),
  verified_by_user_id uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id, person_id)
);

create table if not exists public.scd_access_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  email text not null,
  person_id uuid references public.scd_people(id) on delete set null,
  intended_role public.scd_role not null default 'USER_BASE',
  intended_scope jsonb not null default '{}'::jsonb,
  delivery_channel text not null default 'EMAIL' check (delivery_channel in ('EMAIL')),
  setup_token_hash text not null unique,
  must_set_password boolean not null default true,
  expires_at timestamptz not null,
  status text not null default 'PENDING'
    check (status in ('PENDING','SENT','OPENED','ACCEPTED','EXPIRED','REVOKED','FAILED')),
  sent_at timestamptz,
  accepted_at timestamptz,
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scd_access_events (
  id bigint generated always as identity primary key,
  organization_id uuid references public.scd_organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null
    check (event_type in ('LOGIN_SUCCESS','LOGIN_FAILURE','LOGOUT','SESSION_START','SESSION_END','PASSWORD_SET','INVITE_ACCEPTED','PUBLIC_VISIT','PWA_OPEN')),
  analytics_consent boolean,
  anonymous_session_hash text,
  client_class text,
  source text not null default 'SCD_APP',
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.scd_calendar_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  code text not null,
  name text not null,
  source_type text not null
    check (source_type in ('FEDERATION_OFFICIAL','R20_MANAGER','GOOGLE_CALENDAR','CLUB_EVENT','TUTTOCAMPO_VERIFIED','MANUAL_DIRECTION')),
  authority_rank smallint not null default 50 check (authority_rank between 1 and 100),
  enabled boolean not null default false,
  read_only boolean not null default true,
  sync_mode text not null default 'MANUAL_REVIEW'
    check (sync_mode in ('POLL','PUSH','MANUAL_REVIEW','IMPORT')),
  endpoint_ref text,
  last_sync_at timestamptz,
  last_sync_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table if not exists public.scd_event_source_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  event_id uuid not null references public.scd_events(id) on delete cascade,
  calendar_source_id uuid not null references public.scd_calendar_sources(id) on delete cascade,
  external_event_key text not null,
  source_updated_at timestamptz,
  reconciliation_state text not null default 'MATCHED'
    check (reconciliation_state in ('MATCHED','PENDING_REVIEW','CONFLICT','SUPERSEDED','REMOVED')),
  source_payload_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (calendar_source_id, external_event_key)
);

create table if not exists public.scd_match_team_stats (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  match_id uuid not null references public.scd_matches(id) on delete cascade,
  team_id uuid references public.scd_teams(id) on delete set null,
  is_scd_team boolean not null default true,
  goals_for integer not null default 0 check (goals_for >= 0),
  goals_against integer not null default 0 check (goals_against >= 0),
  yellow_cards integer not null default 0 check (yellow_cards >= 0),
  red_cards integer not null default 0 check (red_cards >= 0),
  result_code text check (result_code in ('W','D','L')),
  source_id text not null,
  source_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, team_id)
);

create table if not exists public.scd_player_match_stats (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  match_id uuid not null references public.scd_matches(id) on delete cascade,
  athlete_id uuid not null references public.scd_athletes(id) on delete cascade,
  minutes_played integer check (minutes_played between 0 and 130),
  goals integer not null default 0 check (goals >= 0),
  assists integer not null default 0 check (assists >= 0),
  yellow_cards integer not null default 0 check (yellow_cards between 0 and 2),
  red_cards integer not null default 0 check (red_cards between 0 and 1),
  public_allowed boolean not null default false,
  source_id text not null,
  source_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, athlete_id)
);

create table if not exists public.scd_fan_checkins (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.scd_events(id) on delete cascade,
  method text not null check (method in ('QR','STAFF_CONFIRM','TICKET','APP_GEOFENCE_OPT_IN')),
  verified boolean not null default false,
  verified_by_user_id uuid references auth.users(id) on delete set null,
  checked_in_at timestamptz not null default now(),
  unique (user_id, event_id)
);

create table if not exists public.scd_engagement_challenges (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  title text not null,
  description text not null,
  audience_mode text not null
    check (audience_mode in ('ADULT_COMPETITIVE','ALL_AGES_PARTICIPATION','MINOR_COOPERATIVE','TEAM_COOPERATIVE')),
  metric_code text not null
    check (metric_code in ('ATTENDANCE','CHECKIN','TEAM_GOALS','TEAM_CLEAN_SHEET','TRAINING_PARTICIPATION','QUIZ','COMMUNITY_ACTION')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reward_id uuid references public.scd_social_rewards(id) on delete set null,
  status text not null default 'DRAFT' check (status in ('DRAFT','ACTIVE','CLOSED','CANCELLED')),
  public_leaderboard boolean not null default false,
  minor_competitive_leaderboard boolean not null default false,
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_at >= starts_at),
  check (minor_competitive_leaderboard = false)
);

create table if not exists public.scd_fantasy_leagues (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  name text not null,
  season_id uuid references public.scd_seasons(id) on delete set null,
  audience_mode text not null default 'ADULT_REGISTERED'
    check (audience_mode in ('ADULT_REGISTERED','ALL_AGES_TEAM_GAME','MINOR_COOPERATIVE')),
  status text not null default 'DRAFT' check (status in ('DRAFT','ACTIVE','CLOSED','CANCELLED')),
  monetary_entry boolean not null default false,
  monetary_prize boolean not null default false,
  public_player_ranking boolean not null default false,
  rules jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (monetary_entry = false),
  check (monetary_prize = false)
);

create table if not exists public.scd_fantasy_entries (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.scd_fantasy_leagues(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  points numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (league_id, user_id)
);

create index if not exists scd_identity_links_user_idx on public.scd_identity_links(user_id, link_state);
create index if not exists scd_identity_links_person_idx on public.scd_identity_links(person_id, link_state);
create index if not exists scd_access_invites_email_idx on public.scd_access_invites(organization_id, lower(email), status);
create index if not exists scd_access_events_day_idx on public.scd_access_events(occurred_at desc, event_type);
create index if not exists scd_calendar_sources_org_idx on public.scd_calendar_sources(organization_id, enabled, authority_rank desc);
create index if not exists scd_event_source_links_event_idx on public.scd_event_source_links(event_id, reconciliation_state);
create index if not exists scd_match_team_stats_team_idx on public.scd_match_team_stats(team_id, match_id);
create index if not exists scd_player_match_stats_athlete_idx on public.scd_player_match_stats(athlete_id, match_id);
create index if not exists scd_fan_checkins_event_idx on public.scd_fan_checkins(event_id, checked_in_at);
create index if not exists scd_engagement_challenges_status_idx on public.scd_engagement_challenges(organization_id, status, starts_at);
create index if not exists scd_fantasy_entries_league_idx on public.scd_fantasy_entries(league_id, points desc);

alter table public.scd_identity_links enable row level security;
alter table public.scd_access_invites enable row level security;
alter table public.scd_access_events enable row level security;
alter table public.scd_calendar_sources enable row level security;
alter table public.scd_event_source_links enable row level security;
alter table public.scd_match_team_stats enable row level security;
alter table public.scd_player_match_stats enable row level security;
alter table public.scd_fan_checkins enable row level security;
alter table public.scd_engagement_challenges enable row level security;
alter table public.scd_fantasy_leagues enable row level security;
alter table public.scd_fantasy_entries enable row level security;

revoke all on table public.scd_identity_links from anon, authenticated;
revoke all on table public.scd_access_invites from anon, authenticated;
revoke all on table public.scd_access_events from anon, authenticated;
revoke all on table public.scd_calendar_sources from anon, authenticated;
revoke all on table public.scd_event_source_links from anon, authenticated;
revoke all on table public.scd_match_team_stats from anon, authenticated;
revoke all on table public.scd_player_match_stats from anon, authenticated;
revoke all on table public.scd_fan_checkins from anon, authenticated;
revoke all on table public.scd_engagement_challenges from anon, authenticated;
revoke all on table public.scd_fantasy_leagues from anon, authenticated;
revoke all on table public.scd_fantasy_entries from anon, authenticated;

comment on table public.scd_identity_links is 'Verified user-person binding. Name-only matching is forbidden.';
comment on table public.scd_access_invites is 'One-time setup invitations. Store only setup token hashes; never plaintext temporary passwords.';
comment on table public.scd_access_events is 'Minimal access/audit events. Never store PIN, password, safeguarding, health or private message content.';
comment on table public.scd_calendar_sources is 'Registry for federation, R20, Google Calendar and club event sources with explicit authority and sync state.';
comment on table public.scd_event_source_links is 'Many sources reconcile into one canonical EVENT_ID.';
comment on table public.scd_player_match_stats is 'Internal player stats. public_allowed defaults false; minor public talent leaderboards are forbidden.';
comment on table public.scd_engagement_challenges is 'Healthy engagement challenges. Competitive minor leaderboards are blocked at database level.';
comment on table public.scd_fantasy_leagues is 'No money, no betting. Minor modes are cooperative/team-oriented by contract.';
