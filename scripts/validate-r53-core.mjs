import fs from 'node:fs';

const fail=m=>{console.error('SCD R53 CORE CONTRACT FAIL: '+m);process.exitCode=1};
const read=p=>fs.readFileSync(p,'utf8');
const sql=read('supabase/migrations/20261002_r53_football_social_private_core.sql');
const manifest=JSON.parse(read('SCD_SYSTEM_MANIFEST.json'));
const cfg=JSON.parse(read('config/scd-supabase.v1.json'));
const html=read('index.html');
const router=read('app-r24-router.js');
const socialCss=read('ui-r52-social.css');

for(const token of [
  'scd_training_sessions','scd_training_attendance','scd_match_performance','scd_match_callups',
  'scd_fan_gamification','scd_fan_points_ledger','scd_social_mvp_candidates','scd_social_mvp_votes',
  'scd_social_sponsor_deals','scd_social_rewards','scd_social_reward_redemptions',
  'scd_team_messages','scd_live_match_events','scd_validate_match_callup_eligibility'
]) if(!sql.includes(token)) fail('migration missing '+token);

for(const token of [
  "portal_status = 'APPROVATO_FIGC'",
  "medical_certificate_expires_at",
  "at time zone 'Europe/Rome'",
  "unique (match_id, voter_user_id)",
  "claim_token_hash text not null unique",
  "public_media_authorized boolean not null default false",
  "active boolean not null default false"
]) if(!sql.includes(token)) fail('safety/data-quality guard missing '+token);

if(/insert\s+into\s+public\.scd_(social|fan|deadlines|training|match)/i.test(sql)) fail('R53 migration must not seed invented operational rows');
if(/watchPosition|qrserver\.com|unsplash\.com|percentuale:\s*34/i.test(sql)) fail('unsafe/sample runtime token leaked into schema');
if(!/revoke all on table public\.scd_team_messages from anon, authenticated/i.test(sql)) fail('team messages must be direct-access gated');
if(!/revoke all on table public\.scd_match_performance from anon, authenticated/i.test(sql)) fail('performance data must be direct-access gated');

const capIds=new Set((manifest.capability_map||[]).map(x=>x.id));
for(const id of ['CAP-FOOTBALL-PRIVATE-CORE','CAP-SOCIAL-ENGAGEMENT']) if(!capIds.has(id)) fail('manifest capability missing '+id);
if(manifest.manifest?.version!=='3.23.0') fail('manifest version must be 3.23.0');
if(manifest.product_direction?.football_private_core?.state!=='SCHEMA_READY_RUNTIME_GATED') fail('football core must remain staged');
if(manifest.product_direction?.social_interactive_core?.state!=='FOUNDATION_READY_FAIL_CLOSED') fail('social interactive state mismatch');
if(!manifest.product_direction?.social_interactive_core?.rules?.includes('NO_CONTINUOUS_BACKGROUND_GEO_TRACKING')) fail('geolocation safety rule missing');
if(!manifest.product_direction?.social_interactive_core?.rules?.includes('REWARD_TOKEN_SERVER_GENERATED_AND_HASHED')) fail('reward token server authority missing');

if(cfg.release!=='R53') fail('Supabase config release mismatch');
if(!cfg.domain_core?.migrations?.includes('supabase/migrations/20261002_r53_football_social_private_core.sql')) fail('R53 migration not registered');

for(const token of ['socialInteractiveZone','socialMvpState','socialPointsLogin','socialRewardsState','socialDealsState']) if(!html.includes(token)) fail('Fan Zone surface missing '+token);
for(const token of ['r53-callup-card','data-r53-conv-reply','private.convocation.reply']) if(!router.includes(token)) fail('athlete callup vertical slice missing '+token);
if(!socialCss.includes('social-interactive-zone')) fail('R53 social responsive styles missing');
if(/Mauri Simone|Locatelli Andrea|Nuova Sondrio Calcio|92%|14\/03\/2027/.test(html+router)) fail('sample sports/private data must not ship in R53 surfaces');

if(!process.exitCode)console.log('SCD R53 CORE CONTRACT PASS',{
  footballPrivate:true,
  socialInteractive:true,
  failClosed:true,
  noFakeSeeds:true,
  canonicalMatchGuard:true,
  medicalFigcGuard:true
});
