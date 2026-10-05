import fs from 'node:fs';

const fail = (message) => {
  console.error('R57.D1 GRAPH CONTRACT FAIL: ' + message);
  process.exitCode = 1;
};

const sql = fs.readFileSync('supabase/migrations/20261003_r57_1_graph_fk_index_hardening.sql', 'utf8');
const audit = fs.readFileSync('docs/R57_D1_DATA_GRAPH_AUDIT.md', 'utf8');

const indexes = [
  'scd_fan_points_ledger_event_idx',
  'scd_live_match_events_org_idx',
  'scd_live_match_events_publisher_idx',
  'scd_match_callups_creator_idx',
  'scd_match_callups_org_idx',
  'scd_match_performance_org_idx',
  'scd_match_performance_recorder_idx',
  'scd_social_mvp_candidates_athlete_idx',
  'scd_social_mvp_candidates_org_idx',
  'scd_social_mvp_votes_candidate_idx',
  'scd_social_mvp_votes_org_idx',
  'scd_social_mvp_votes_voter_idx',
  'scd_social_reward_redemptions_org_idx',
  'scd_social_reward_redemptions_reward_idx',
  'scd_team_messages_org_idx',
  'scd_team_messages_sender_idx',
  'scd_training_attendance_org_idx',
  'scd_training_attendance_recorder_idx',
  'scd_training_sessions_creator_idx',
  'scd_training_sessions_org_idx'
];

for (const index of indexes) {
  if (!sql.includes('create index if not exists ' + index)) fail('missing staged index ' + index);
}

if (/\bdrop\s+table\b/i.test(sql)) fail('destructive DROP TABLE is forbidden');
if (/\bdelete\s+from\b/i.test(sql)) fail('data DELETE is forbidden');
if (/\btruncate\b/i.test(sql)) fail('TRUNCATE is forbidden');
if (/\balter\s+table\b/i.test(sql)) fail('authorization/schema mutation must not be mixed into index hardening');
if (/\bcreate\s+policy\b/i.test(sql)) fail('RLS activation must be a separate migration');

for (const token of [
  'R20 remains identity/role/scope authority',
  '14 tables with RLS enabled but no RLS policies',
  '20 foreign keys without covering indexes',
  'Do not introduce a second graph database',
  'SAFE_NEXT_ACTION'
]) {
  if (!audit.includes(token)) fail('audit evidence missing: ' + token);
}

if (!process.exitCode) {
  console.log('R57.D1 GRAPH CONTRACT PASS', {
    stagedIndexes: indexes.length,
    destructiveSql: false,
    rlsActivationMixedIn: false
  });
}
