import fs from 'node:fs';

const fail=m=>{console.error('SCD R56 SOCIAL LIVE READINESS FAIL: '+m);process.exitCode=1};
const read=p=>fs.readFileSync(p,'utf8');
const manifest=JSON.parse(read('SCD_SYSTEM_MANIFEST.json'));
const cfg=JSON.parse(read('config/scd-supabase.v1.json'));
const sql=read('supabase/migrations/20261002_r56_social_live_readiness.sql');
const server=read('server.js');
const runtime=read('scd-ng.js');
const html=read('index.html');
const sw=read('sw.js');
const css=read('scd-ng.css');

const v=String(manifest.manifest?.version||'0.0.0').split('.').map(Number);
if((v[0]||0)<3||((v[0]||0)===3&&(v[1]||0)<26))fail('manifest version must be >= 3.26.0');

const r56=manifest.product_direction?.social_live_readiness_r56;
if(r56?.release!=='R56'||r56?.state!=='SERVER_READ_MODEL_STAGED')fail('R56 manifest contract missing');
if(r56?.feature_flag!=='SCD_FEATURE_SOCIAL_VERIFIED_READS')fail('R56 feature flag mismatch');
for(const rule of ['SERVICE_ROLE_SERVER_ONLY','ONLY_ACTIVE_SOURCE_VERIFIED_ROWS_PUBLIC','MVP_REQUIRES_PUBLIC_MEDIA_AUTHORIZATION','NO_AUTOMATIC_GEOLOCATION']){
  if(!r56?.rules?.includes(rule))fail('R56 rule missing '+rule);
}

if(cfg.release!=='R56')fail('Supabase config release mismatch');
if(!cfg.domain_core?.migrations?.includes('supabase/migrations/20261002_r56_social_live_readiness.sql'))fail('R56 migration not registered');
if(cfg.domain_core?.social_interactive_core?.public_read_endpoint!=='/api/social/public-state')fail('R56 endpoint not registered in config');

for(const token of [
  'scd_fan_points_ledger_event_idx','scd_live_match_events_org_idx','scd_live_match_events_publisher_idx',
  'scd_match_callups_creator_idx','scd_match_callups_org_idx','scd_match_performance_org_idx',
  'scd_match_performance_recorder_idx','scd_social_mvp_candidates_athlete_idx','scd_social_mvp_candidates_org_idx',
  'scd_social_mvp_votes_candidate_idx','scd_social_mvp_votes_org_idx','scd_social_mvp_votes_voter_idx',
  'scd_social_reward_redemptions_org_idx','scd_social_reward_redemptions_reward_idx','scd_team_messages_org_idx',
  'scd_team_messages_sender_idx','scd_training_attendance_org_idx','scd_training_attendance_recorder_idx',
  'scd_training_sessions_creator_idx','scd_training_sessions_org_idx'
])if(!sql.includes(token))fail('index hardening missing '+token);

if(/grant\s+.+\s+to\s+(anon|authenticated)/i.test(sql))fail('R56 must not open direct browser grants');
if(/create\s+policy|drop\s+policy/i.test(sql))fail('R56 must not mutate RLS authorization policies');
if(/insert\s+into/i.test(sql))fail('R56 must not seed operational data');

for(const token of [
  'SCD_FEATURE_SOCIAL_VERIFIED_READS','SUPABASE_SERVICE_ROLE_KEY','buildPublicSocialState',
  '/api/social/public-state','source_verified_at','public_media_authorized','active:\'eq.true\'',
  "published:'eq.true'"
])if(!server.includes(token))fail('server read contract missing '+token);

if(/service_role/i.test(runtime+html))fail('service-role token must never appear in client runtime');
for(const token of [
  'function loadSocialInteractive','function renderSocialInteractive','function openRewardsCatalog',
  'function openDealsCatalog','function openMvpVerified','/api/social/public-state','r56-catalog','r56-mvp-list'
])if(!(runtime+css).includes(token))fail('Fan Zone runtime missing '+token);

if(!html.includes('./scd-ng.css?v=0.6.3')||!html.includes('./scd-ng.js?v=0.7.3'))fail('R56 active cache bust missing');
if(!sw.includes("const CACHE='scd-nextgen-0.7.3-r56'")||!sw.includes('./scd-ng.js?v=0.7.3'))fail('R56 PWA cache contract missing');

if(!process.exitCode)console.log('SCD R56 SOCIAL LIVE READINESS PASS',{
  manifest:manifest.manifest.version,
  serverReadModel:true,
  verifiedRowsOnly:true,
  directBrowserTables:false,
  noPermissionMutation:true,
  noFakeSeeds:true,
  fanZoneAutoActivation:true
});
