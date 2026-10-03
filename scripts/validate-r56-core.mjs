import fs from 'node:fs';

const fail=m=>{console.error('SCD R56 CORE FAIL: '+m);process.exitCode=1};
const read=p=>fs.readFileSync(p,'utf8');
const manifest=JSON.parse(read('SCD_SYSTEM_MANIFEST.json'));
const cfg=JSON.parse(read('config/scd-supabase.v1.json'));
const sql=read('supabase/migrations/20261002_r56_identity_calendar_club_intelligence.sql');
const runtime=read('scd-ng.js');
const bridge=read('backend_patch_R56_identity_access.gs');
const http=read('backend_patch_R21_6_http_api.gs');
const server=read('server.js');
const html=read('index.html');
const css=read('scd-ng.css');
const comm=JSON.parse(read('config/scd-communication-matrix.v1.json'));
const engage=JSON.parse(read('config/scd-engagement-rules.v1.json'));
const calendarLib=read('lib/scd-calendar-fusion.js');

const v=String(manifest.manifest?.version||'0.0.0').split('.').map(Number);
if((v[0]||0)<3||((v[0]||0)===3&&(v[1]||0)<26))fail('manifest version must be >= 3.26.0');

for(const token of [
  'scd_identity_links','scd_access_invites','scd_access_events','scd_usage_consents',
  'scd_calendar_sources','scd_event_source_links','scd_communication_policies','scd_match_team_stats','scd_player_match_stats',
  'scd_fan_checkins','scd_engagement_challenges','scd_fantasy_leagues','scd_fantasy_entries','scd_access_daily_metrics'
])if(!sql.includes(token))fail('schema missing '+token);

for(const token of [
  "match_method in ('EMAIL_EXACT','PHONE_BIRTHDATE','MANUAL_STAFF','IMPORT_CANONICAL')",
  'setup_token_hash text not null unique',
  'must_set_password boolean not null default true',
  'minor_competitive_leaderboard boolean not null default false',
  'check (minor_competitive_leaderboard = false)',
  'check (monetary_entry = false)',
  'check (monetary_prize = false)',
  'create or replace view public.scd_player_match_stats',
  'from public.scd_match_performance'
])if(!sql.includes(token))fail('R56 safety invariant missing '+token);

for(const forbiddenTable of [
  'scd_identity_links','scd_access_invites','scd_access_events','scd_match_team_stats',
  'scd_fan_checkins','scd_engagement_challenges','scd_fantasy_leagues','scd_fantasy_entries'
]){
  if(new RegExp('insert\\s+into\\s+public\\.'+forbiddenTable,'i').test(sql))fail('R56 must not seed operational rows into '+forbiddenTable);
}
if(/\b(?:temporary_password|temp_password|password|pin)\b\s+(?:text|varchar|character varying)/i.test(sql))fail('credential storage column forbidden in schema');
if(/\b(?:password|pin)\s*=\s*['"][^'"]+['"]/i.test(sql))fail('hardcoded credential assignment forbidden in schema');

for(const token of [
  'function r56ResolveIdentity_',
  'function r56InviteAccess_',
  "matchMethod:'EMAIL_EXACT'",
  "matchMethod:'PHONE_BIRTHDATE'",
  'NAME_ONLY'
]){} // semantic checks below
if(!bridge.includes('function r56ResolveIdentity_'))fail('identity resolver missing');
if(!bridge.includes('function r56InviteAccess_'))fail('invite bridge missing');
if(/firstName.*lastName.*===/i.test(bridge))fail('name-only identity matching forbidden');
if(!bridge.includes('requestOtp(mail)'))fail('temporary one-time code delivery missing');
if(!bridge.includes('permanentPasswordEmailed:false'))fail('plaintext permanent password invariant missing');
for(const token of ['r56CanonicalPeopleSheet_','02 DB PERSONE V2','CANONICAL_EMAIL_EXACT','CANONICAL_PHONE_BIRTHDATE']){
  if(!bridge.includes(token))fail('canonical people resolver missing '+token);
}

for(const action of ['public.identity.resolve','auth.identity.resolve','auth.access.log','direction.access.invite','direction.access.metrics']){
  if(!server.includes("'"+action+"'"))fail('server action missing '+action);
  if(!http.includes("case '"+action+"'"))fail('R20 route missing '+action);
}
if(!bridge.includes('function r56PublicIdentityResolve_'))fail('safe public identity resolver missing');
if(!bridge.includes('matched:null')||!bridge.includes('role:null'))fail('public identity resolver must not enumerate account data');
if(/case 'public\.identity\.resolve':[\s\S]{0,220}r56ResolveIdentity_\(/.test(http))fail('public route must not use private identity resolver');
if(!runtime.includes("privatePost('auth.identity.resolve'"))fail('authenticated identity resolution missing');
if(!runtime.includes("privatePost('auth.access.log'"))fail('authenticated access audit missing');
for(const token of ['ACCESSI','SICUREZZA','openPrivateAccessManager','openPrivateSecurity','public.identity.resolve','auth.identity.resolve','auth.access.log','direction.access.invite']){
  if(!runtime.includes(token))fail('runtime missing '+token);
}
if(!html.includes('id="scdCookieBanner"'))fail('analytics consent surface missing');
if(!runtime.includes("R56_ANALYTICS_COOKIE='scd_analytics_consent'"))fail('analytics consent cookie missing');
if(!runtime.includes("postAction('public.telemetry'"))fail('aggregate telemetry bridge missing');
if(!runtime.includes("if(r56AnalyticsConsent()!=='yes')return"))fail('optional telemetry must be consent gated');
if(!sql.includes('scd_usage_consents'))fail('usage consent table missing');
if(!sql.includes('scd_access_daily_metrics'))fail('daily access aggregate view missing');
if(!css.includes('.scd-cookie-banner'))fail('analytics consent styles missing');

const idc=manifest.product_direction?.identity_access_r56;
if(idc?.release!=='R56')fail('identity access manifest missing');
if(!(idc?.rules||[]).includes('NAME_ONLY_IDENTITY_MATCH_FORBIDDEN'))fail('identity safety rule missing');
const ci=manifest.product_direction?.club_intelligence_r56;
if(ci?.sport_stats?.minor_public_talent_ranking!==false)fail('minor public ranking must be false');
if(ci?.engagement?.fantasy!=='NO_MONEY_NO_BETTING')fail('fantasy safety contract missing');

if(comm.release!=='R56')fail('communication matrix release mismatch');
if(comm.minors?.direct_1to1_default!==false)fail('minor direct messaging default must be false');
if(comm.channels?.SAFEGUARDING?.reply!=='ISOLATED_NOT_CHAT')fail('safeguarding must remain isolated');
if(engage.release!=='R56')fail('engagement rules release mismatch');
if(engage.global_rules?.money_entry!==false||engage.global_rules?.money_prizes!==false||engage.global_rules?.betting!==false)fail('engagement must remain no-money/no-betting');
if(engage.global_rules?.minor_public_individual_performance_ranking!==false)fail('minor public performance ranking forbidden');
if(engage.fantasy?.minor_individual_player_ranking!==false)fail('minor fantasy individual ranking forbidden');
for(const token of ['FEDERATION_OFFICIAL:100','R20_MANAGER:85','NO_STRONG_LINK','CANONICAL_EVENT_ID_REQUIRED'])if(!calendarLib.includes(token))fail('calendar fusion guard missing '+token);

if(!sql.includes('create table if not exists public.scd_communication_policies'))fail('communication policy table missing');
for(const channel of ["'TEAM'","'FAMILY'","'STAFF'","'ANNOUNCEMENT'"])if(!sql.includes(channel))fail('communication channel missing '+channel);
if(!/create or replace view public\.scd_player_match_stats[\s\S]*from public\.scd_match_performance/i.test(sql))fail('player stats must derive from canonical performance');
if(/create table if not exists public\.scd_player_match_stats/i.test(sql))fail('duplicate player stats table forbidden');
if(!sql.includes("'FIGC_LND_CRL','FIGC / LND / CR Lombardia','FEDERATION_OFFICIAL',100"))fail('federation calendar rank mismatch');
if(!sql.includes("'RM_INTERNAL','Calendario interno Responsabile','R20_MANAGER',85"))fail('RM calendar rank mismatch');

if(cfg.release!=='R56'||cfg.schema_version!=='1.3.0')fail('Supabase R56 contract mismatch');
if(!cfg.domain_core?.migrations?.includes('supabase/migrations/20261002_r56_identity_calendar_club_intelligence.sql'))fail('R56 migration not registered');

if(!process.exitCode)console.log('SCD R56 CORE PASS',{
  identityAccess:true,
  secureInvite:true,
  identityPreflight:true,
  analyticsConsent:true,
  calendarFusion:true,
  sportStats:true,
  healthyGamification:true,
  noMinorTalentRanking:true,
  noBetting:true
});
