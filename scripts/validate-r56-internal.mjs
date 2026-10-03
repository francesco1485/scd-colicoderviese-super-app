import fs from 'node:fs';

const fail=m=>{console.error('SCD R56 INTERNAL CONTRACT FAIL: '+m);process.exitCode=1};
const read=p=>fs.readFileSync(p,'utf8');

const manifest=JSON.parse(read('SCD_SYSTEM_MANIFEST.json'));
const cfg=JSON.parse(read('config/scd-supabase.v1.json'));
const bridge=read('backend_patch_R21_6_http_api.gs');
const identity=read('backend_patch_R56_identity_access.gs');
const server=read('server.js');
const runtime=read('scd-ng.js');
const html=read('index.html');
const sql=read('supabase/migrations/20261002_r56_identity_calendar_club_intelligence.sql');

const version=String(manifest.manifest?.version||'0.0.0').split('.').map(Number);
if((version[0]||0)<3||((version[0]||0)===3&&(version[1]||0)<26))fail('manifest version must be >= 3.26.0');

const identityContract=manifest.product_direction?.identity_access_r56;
const intel=manifest.product_direction?.club_intelligence_r56;
if(identityContract?.release!=='R56')fail('identity_access_r56 contract missing');
if(intel?.release!=='R56')fail('club_intelligence_r56 contract missing');
for(const rule of [
  'ONE_ACCOUNT_PER_PERSON',
  'NO_CLIENT_ROLE_SELECTION',
  'NAME_ONLY_IDENTITY_MATCH_FORBIDDEN',
  'NO_PLAINTEXT_PERMANENT_PASSWORD_EMAIL',
  'DIRECTION_ONLY_ACCESS_ASSIGNMENT'
])if(!identityContract?.rules?.includes(rule))fail('identity rule missing '+rule);

if(!bridge.includes("case 'public.identity.resolve':"))fail('public identity preflight action missing');
if(!bridge.includes("r56PublicIdentityResolve_"))fail('public identity preflight must use safe resolver');
if(/case 'public\.identity\.resolve':[\s\S]{0,220}r56ResolveIdentity_\(/.test(bridge))fail('public identity action leaks private resolver');
if(!identity.includes("matched:null")||!identity.includes("role:null"))fail('public resolver must not enumerate account state or role');
if(!identity.includes("requestOtp(mail)"))fail('existing account preflight must use one-time code');
if(!identity.includes("mustChangePin:true"))fail('invite must require first-access credential change');
for(const token of ['r56CanonicalPeopleSheet_','02 DB PERSONE V2','CANONICAL_EMAIL_EXACT','CANONICAL_PHONE_BIRTHDATE',"personId:String(row[0]","email:email_(row[6]","phone:r56NormalizePhone_(row[7]","role:String(row[10]"]){
  if(!identity.includes(token))fail('canonical Tesserati identity binding missing '+token);
}
if(/MailApp\.sendEmail[\s\S]{0,500}(password|password permanente)/i.test(identity))fail('invite email must not contain permanent password');
if(!identity.includes("r56RequireDirection_"))fail('Direction gate missing on invites');

for(const action of ["auth.identity.resolve","auth.access.log","direction.access.invite","direction.access.metrics"]){
  if(!bridge.includes("case '"+action+"':"))fail('bridge action missing '+action);
  if(!server.includes("'"+action+"'"))fail('server allowlist missing '+action);
}
if(!runtime.includes("privatePost('auth.identity.resolve'"))fail('authenticated identity resolution missing in active UI');
if(!runtime.includes("privatePost('auth.access.log'"))fail('authenticated access audit missing in active UI');
if(!runtime.includes("privatePost('direction.access.metrics'"))fail('Direction access metrics UI missing');
if(!runtime.includes("METRICHE:['▥','Metriche Accessi'"))fail('Direction metrics module missing');
if(/identity\?\.matched===true/.test(runtime))fail('public UI must not branch on account enumeration result');

if(!html.includes('id="scdCookieBanner"'))fail('analytics consent banner missing');
if(!runtime.includes("R56_ANALYTICS_COOKIE='scd_analytics_consent'"))fail('first-party analytics consent cookie missing');
if(!runtime.includes("if(r56AnalyticsConsent()!=='yes')return"))fail('non-essential telemetry must be consent gated');

for(const token of [
  'scd_identity_links','scd_access_invites','scd_access_events','scd_usage_consents',
  'scd_calendar_sources','scd_event_source_links','scd_communication_policies',
  'scd_match_team_stats','scd_fan_checkins','scd_engagement_challenges',
  'scd_fantasy_leagues','scd_fantasy_entries'
])if(!sql.includes(token))fail('R56 schema missing '+token);

if(!/create or replace view public\.scd_player_match_stats[\s\S]*from public\.scd_match_performance/i.test(sql))fail('player stats must derive from canonical scd_match_performance');
if(/create table if not exists public\.scd_player_match_stats/i.test(sql))fail('duplicate player stats table forbidden');
if(!sql.includes('scd_access_daily_metrics'))fail('daily access aggregate view missing');

const sourceRanks={};
for(const [code,rank] of [...sql.matchAll(/select id,'([^']+)'[^\n]*\n?[^\n]*?(\d+),(?:true|false),(?:true|false),'[^']+'/g)]){
  sourceRanks[code]=Number(rank);
}
if(!sql.includes("'FIGC_LND_CRL'")||!sql.includes("'RM_INTERNAL'")||!sql.includes("'SCD_GOOGLE_CALENDAR'")||!sql.includes("'SCD_CLUB_EVENT'"))fail('calendar source registry incomplete');
if(!sql.includes("'FIGC_LND_CRL','FIGC / LND / CR Lombardia','FEDERATION_OFFICIAL',100"))fail('federation authority rank must be 100');
if(!sql.includes("'RM_INTERNAL','Calendario interno Responsabile','R20_MANAGER',85"))fail('RM calendar authority rank must be 85');

for(const channel of ["'TEAM'","'FAMILY'","'STAFF'","'ANNOUNCEMENT'"]){
  if(!sql.includes(channel))fail('communication policy missing '+channel);
}
if(!sql.includes('NO_UNSUPERVISED_1TO1')&&!sql.includes('GUARDIAN_OR_STAFF_PRESENT'))fail('minor messaging guard missing');

if(!sql.includes('scd_validate_fantasy_policy'))fail('fantasy policy trigger missing');
{
  const fnStart=sql.indexOf('create or replace function public.scd_validate_fantasy_policy()');
  const fnEnd=sql.indexOf('drop trigger if exists scd_fantasy_policy_guard',fnStart);
  const fnBlock=fnStart>=0&&fnEnd>fnStart?sql.slice(fnStart,fnEnd):'';
  if(!fnBlock.includes('as $')||!fnBlock.includes('$;'))fail('fantasy policy function must use valid dollar quoting');
}
if(!/monetary_entry\s+boolean\s+not null default false/i.test(sql))fail('fantasy monetary entry guard missing');
if(!/monetary_prize\s+boolean\s+not null default false/i.test(sql))fail('fantasy monetary prize guard missing');
if(!sql.includes("public player ranking is not allowed for minor/all-ages modes"))fail('minor public ranking guard missing');

for(const forbidden of ['PASSWORD','PIN','HEALTH_DATA','SAFEGUARDING','PRIVATE_MESSAGES','DOCUMENT_CONTENT','RAW_LOCATION']){
  if(!intel?.analytics?.forbidden?.includes(forbidden))fail('analytics forbidden payload missing '+forbidden);
}
if(intel?.sport_stats?.minor_public_talent_ranking!==false)fail('minor public talent ranking must remain false');
if(intel?.engagement?.fantasy!=='NO_MONEY_NO_BETTING')fail('fantasy safety contract mismatch');

if(cfg.release!=='R56'||cfg.schema_version!=='1.3.0')fail('Supabase R56 config mismatch');
if(!cfg.domain_core?.migrations?.includes('supabase/migrations/20261002_r56_identity_calendar_club_intelligence.sql'))fail('R56 migration not registered');

if(!process.exitCode)console.log('SCD R56 INTERNAL CONTRACT PASS',{
  identityEnumerationSafe:true,
  oneTimeInvite:true,
  accessAudit:true,
  consentedAnalytics:true,
  canonicalCalendar:true,
  communicationMatrix:true,
  singlePlayerStatsSource:true,
  minorSafeEngagement:true,
  fantasyNoMoney:true
});
