-- R56 — Social Live Readiness + index hardening
-- Additive, non-destructive. No role grants, no RLS policy changes, no sample rows.
-- Direct browser access to R53 social/private tables remains revoked.
-- Purpose: remove verified FK index gaps before server-side social read activation.

create index if not exists scd_fan_points_ledger_event_idx
  on public.scd_fan_points_ledger(event_id);

create index if not exists scd_live_match_events_org_idx
  on public.scd_live_match_events(organization_id);

create index if not exists scd_live_match_events_publisher_idx
  on public.scd_live_match_events(published_by_user_id);

create index if not exists scd_match_callups_creator_idx
  on public.scd_match_callups(created_by_user_id);

create index if not exists scd_match_callups_org_idx
  on public.scd_match_callups(organization_id);

create index if not exists scd_match_performance_org_idx
  on public.scd_match_performance(organization_id);

create index if not exists scd_match_performance_recorder_idx
  on public.scd_match_performance(recorded_by_user_id);

create index if not exists scd_social_mvp_candidates_athlete_idx
  on public.scd_social_mvp_candidates(athlete_id);

create index if not exists scd_social_mvp_candidates_org_idx
  on public.scd_social_mvp_candidates(organization_id);

create index if not exists scd_social_mvp_votes_candidate_idx
  on public.scd_social_mvp_votes(candidate_id);

create index if not exists scd_social_mvp_votes_org_idx
  on public.scd_social_mvp_votes(organization_id);

create index if not exists scd_social_mvp_votes_voter_idx
  on public.scd_social_mvp_votes(voter_user_id);

create index if not exists scd_social_reward_redemptions_org_idx
  on public.scd_social_reward_redemptions(organization_id);

create index if not exists scd_social_reward_redemptions_reward_idx
  on public.scd_social_reward_redemptions(reward_id);

create index if not exists scd_team_messages_org_idx
  on public.scd_team_messages(organization_id);

create index if not exists scd_team_messages_sender_idx
  on public.scd_team_messages(sender_user_id);

create index if not exists scd_training_attendance_org_idx
  on public.scd_training_attendance(organization_id);

create index if not exists scd_training_attendance_recorder_idx
  on public.scd_training_attendance(recorded_by_user_id);

create index if not exists scd_training_sessions_creator_idx
  on public.scd_training_sessions(created_by_user_id);

create index if not exists scd_training_sessions_org_idx
  on public.scd_training_sessions(organization_id);

comment on table public.scd_social_mvp_candidates is
  'MVP candidates are server-published only when active, source-verified and public-media-authorized. Direct anon/authenticated access remains revoked.';

comment on table public.scd_social_rewards is
  'Reward catalog is server-published only for active, source-verified rows. Redemption stays server-authoritative.';

comment on table public.scd_social_sponsor_deals is
  'Territorial deals are server-published only for active, source-verified rows in their validity window. Geolocation remains explicit opt-in.';
