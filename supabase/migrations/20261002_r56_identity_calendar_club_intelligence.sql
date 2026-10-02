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


create table if not exists public.scd_usage_consents (
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  analytics_allowed boolean not null default false,
  personalization_allowed boolean not null default false,
  policy_version text not null,
  updated_at timestamptz not null default now(),
  primary key (organization_id,user_id)
);

create or replace view public.scd_access_daily_metrics
with (security_invoker=true)
as
select
  organization_id,
  (occurred_at at time zone 'Europe/Rome')::date as access_date,
  count(*) filter (where event_type='LOGIN_SUCCESS') as login_events,
  count(distinct user_id) filter (where user_id is not null) as active_authenticated_users,
  count(*) filter (where event_type='PUBLIC_VISIT') as public_visits,
  count(*) filter (where event_type='PWA_OPEN') as pwa_opens
from public.scd_access_events
group by organization_id,(occurred_at at time zone 'Europe/Rome')::date;

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


insert into public.scd_calendar_sources
(organization_id,code,name,source_type,authority_rank,enabled,read_only,sync_mode)
select id,'FIGC_LND_CRL','FIGC / LND / CR Lombardia','FEDERATION_OFFICIAL',100,false,true,'MANUAL_REVIEW'
from public.scd_organizations where slug='scd-colicoderviese'
on conflict (organization_id,code) do nothing;

insert into public.scd_calendar_sources
(organization_id,code,name,source_type,authority_rank,enabled,read_only,sync_mode)
select id,'RM_INTERNAL','Calendario interno Responsabile','R20_MANAGER',85,true,false,'MANUAL_REVIEW'
from public.scd_organizations where slug='scd-colicoderviese'
on conflict (organization_id,code) do nothing;

insert into public.scd_calendar_sources
(organization_id,code,name,source_type,authority_rank,enabled,read_only,sync_mode)
select id,'SCD_GOOGLE_CALENDAR','Google Calendar SCD','GOOGLE_CALENDAR',80,false,false,'PUSH'
from public.scd_organizations where slug='scd-colicoderviese'
on conflict (organization_id,code) do nothing;

insert into public.scd_calendar_sources
(organization_id,code,name,source_type,authority_rank,enabled,read_only,sync_mode)
select id,'SCD_CLUB_EVENT','Eventi e iniziative SCD','CLUB_EVENT',70,true,false,'MANUAL_REVIEW'
from public.scd_organizations where slug='scd-colicoderviese'
on conflict (organization_id,code) do nothing;

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


create table if not exists public.scd_communication_policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scd_organizations(id) on delete cascade,
  channel_kind text not null
    check (channel_kind in ('TEAM','FAMILY','STAFF','DIRECTION','ANNOUNCEMENT')),
  label text not null,
  sender_roles public.scd_role[] not null,
  audience_roles public.scd_role[] not null,
  reply_mode text not null default 'MODERATED'
    check (reply_mode in ('OPEN','MODERATED','READ_ONLY')),
  minor_policy text not null default 'NO_UNSUPERVISED_1TO1'
    check (minor_policy in ('NO_UNSUPERVISED_1TO1','GUARDIAN_OR_STAFF_PRESENT','NOT_APPLICABLE')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id,channel_kind)
);

insert into public.scd_communication_policies
(organization_id,channel_kind,label,sender_roles,audience_roles,reply_mode,minor_policy)
select id,'TEAM','Canale squadra',
array['MISTER','STAFF','MANAGER','DIRECTION']::public.scd_role[],
array['ATHLETE','FAMILY','MISTER','STAFF','MANAGER']::public.scd_role[],
'MODERATED','GUARDIAN_OR_STAFF_PRESENT'
from public.scd_organizations where slug='scd-colicoderviese'
on conflict (organization_id,channel_kind) do nothing;

insert into public.scd_communication_policies
(organization_id,channel_kind,label,sender_roles,audience_roles,reply_mode,minor_policy)
select id,'FAMILY','Comunicazioni famiglie',
array['SECRETARIAT','REGISTRATION','MANAGER','DIRECTION']::public.scd_role[],
array['FAMILY']::public.scd_role[],
'MODERATED','GUARDIAN_OR_STAFF_PRESENT'
from public.scd_organizations where slug='scd-colicoderviese'
on conflict (organization_id,channel_kind) do nothing;

insert into public.scd_communication_policies
(organization_id,channel_kind,label,sender_roles,audience_roles,reply_mode,minor_policy)
select id,'STAFF','Canale staff',
array['MISTER','STAFF','MANAGER','SECRETARIAT','DIRECTION']::public.scd_role[],
array['MISTER','STAFF','MANAGER','SECRETARIAT','REGISTRATION','TOURNAMENTS','DIRECTION']::public.scd_role[],
'OPEN','NOT_APPLICABLE'
from public.scd_organizations where slug='scd-colicoderviese'
on conflict (organization_id,channel_kind) do nothing;

insert into public.scd_communication_policies
(organization_id,channel_kind,label,sender_roles,audience_roles,reply_mode,minor_policy)
select id,'ANNOUNCEMENT','Avvisi ufficiali',
array['SECRETARIAT','MANAGER','DIRECTION']::public.scd_role[],
array['USER_BASE','FAMILY','ATHLETE','MISTER','STAFF','MANAGER','SECRETARIAT','REGISTRATION','TOURNAMENTS','DIRECTION']::public.scd_role[],
'READ_ONLY','NO_UNSUPERVISED_1TO1'
from public.scd_organizations where slug='scd-colicoderviese'
on conflict (organization_id,channel_kind) do nothing;

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

create or replace view public.scd_player_match_stats
with (security_invoker=true)
as
select
  p.id,
  p.organization_id,
  p.match_id,
  p.athlete_id,
  p.minutes_played,
  p.goals,
  p.assists,
  p.yellow_cards,
  case when p.red_card then 1 else 0 end as red_cards,
  p.created_at,
  p.updated_at
from public.scd_match_performance p;

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


create or replace function public.scd_validate_fantasy_policy()
returns trigger
language plpgsql
security invoker
set search_path=public
as $
begin
  if new.audience_mode <> 'ADULT_REGISTERED' and new.public_player_ranking = true then
    raise exception 'SCD_FANTASY_POLICY: public player ranking is not allowed for minor/all-ages modes';
  end if;
  if new.monetary_entry or new.monetary_prize then
    raise exception 'SCD_FANTASY_POLICY: money-based fantasy is not allowed';
  end if;
  return new;
end;
$;

drop trigger if exists scd_fantasy_policy_guard on public.scd_fantasy_leagues;
create trigger scd_fantasy_policy_guard
before insert or update on public.scd_fantasy_leagues
for each row execute function public.scd_validate_fantasy_policy();

create index if not exists scd_identity_links_user_idx on public.scd_identity_links(user_id, link_state);
create index if not exists scd_identity_links_person_idx on public.scd_identity_links(person_id, link_state);
create index if not exists scd_access_invites_email_idx on public.scd_access_invites(organization_id, lower(email), status);
create index if not exists scd_access_events_day_idx on public.scd_access_events(occurred_at desc, event_type);
create index if not exists scd_calendar_sources_org_idx on public.scd_calendar_sources(organization_id, enabled, authority_rank desc);
create index if not exists scd_event_source_links_event_idx on public.scd_event_source_links(event_id, reconciliation_state);
create index if not exists scd_match_team_stats_team_idx on public.scd_match_team_stats(team_id, match_id);
create index if not exists scd_fan_checkins_event_idx on public.scd_fan_checkins(event_id, checked_in_at);
create index if not exists scd_engagement_challenges_status_idx on public.scd_engagement_challenges(organization_id, status, starts_at);
create index if not exists scd_fantasy_entries_league_idx on public.scd_fantasy_entries(league_id, points desc);

alter table public.scd_identity_links enable row level security;
alter table public.scd_access_invites enable row level security;
alter table public.scd_access_events enable row level security;
alter table public.scd_usage_consents enable row level security;
alter table public.scd_calendar_sources enable row level security;
alter table public.scd_event_source_links enable row level security;
alter table public.scd_communication_policies enable row level security;
alter table public.scd_match_team_stats enable row level security;
alter table public.scd_fan_checkins enable row level security;
alter table public.scd_engagement_challenges enable row level security;
alter table public.scd_fantasy_leagues enable row level security;
alter table public.scd_fantasy_entries enable row level security;


create policy "scd_usage_consents_self_select" on public.scd_usage_consents
for select to authenticated using (user_id=(select auth.uid()));
create policy "scd_usage_consents_self_insert" on public.scd_usage_consents
for insert to authenticated with check (user_id=(select auth.uid()) and public.scd_is_org_member(organization_id));
create policy "scd_usage_consents_self_update" on public.scd_usage_consents
for update to authenticated using (user_id=(select auth.uid()))
with check (user_id=(select auth.uid()) and public.scd_is_org_member(organization_id));

create policy "scd_communication_policies_member_select" on public.scd_communication_policies
for select to authenticated using (public.scd_is_org_member(organization_id));

revoke all on table public.scd_identity_links from anon, authenticated;
revoke all on table public.scd_access_invites from anon, authenticated;
revoke all on table public.scd_access_events from anon, authenticated;
revoke all on table public.scd_calendar_sources from anon, authenticated;
revoke all on table public.scd_event_source_links from anon, authenticated;
revoke all on table public.scd_match_team_stats from anon, authenticated;
revoke all on public.scd_player_match_stats from anon, authenticated;
revoke all on table public.scd_fan_checkins from anon, authenticated;
revoke all on table public.scd_engagement_challenges from anon, authenticated;
revoke all on table public.scd_fantasy_leagues from anon, authenticated;
revoke all on table public.scd_fantasy_entries from anon, authenticated;

comment on table public.scd_identity_links is 'Verified user-person binding. Name-only matching is forbidden.';
comment on table public.scd_access_invites is 'One-time setup invitations. Store only setup token hashes; never temporary credentials in clear text.';
comment on table public.scd_access_events is 'Minimal access/audit events. Never store PIN, password, safeguarding, health or private message content.';
comment on table public.scd_calendar_sources is 'Registry for federation, R20, Google Calendar and club event sources with explicit authority and sync state.';
comment on table public.scd_event_source_links is 'Many sources reconcile into one canonical EVENT_ID.';
comment on view public.scd_player_match_stats is 'Derived from canonical scd_match_performance; no second player-stat source of truth.';
comment on table public.scd_engagement_challenges is 'Healthy engagement challenges. Competitive minor leaderboards are blocked at database level.';
comment on table public.scd_fantasy_leagues is 'No money, no betting. Minor modes are cooperative/team-oriented by contract.';

comment on table public.scd_usage_consents is 'Optional analytics/personalization consent. Essential authenticated access audit does not store content or raw credentials.';
comment on table public.scd_communication_policies is 'Who may communicate with whom; ordinary messaging never creates unsupervised minor 1:1 channels.';
