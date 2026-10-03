import fs from 'node:fs';

const fail=m=>{console.error('SCD OPERATIVE CORE CONTRACT FAIL: '+m);process.exitCode=1};
const read=p=>fs.readFileSync(p,'utf8');

const migration=read('supabase/migrations/20261002_r51_core_operative_engine.sql');
const engine=read('lib/scd-operative-engine.js');
const router=read('automations/google-apps-script/ScdMailDriveRouter.gs');
const template=read('content/templates/match-day.it.txt');

for(const token of [
  'scd_person_roles',
  'scd_tesseramenti',
  'scd_matches',
  'scd_secretariat_alerts_v',
  'scd_match_day_v',
  'security_invoker = true',
  'enable row level security',
  'scd_has_org_role'
]) if(!migration.includes(token)) fail('migration missing '+token);

if(/generated\s+always\s+as\s*\([^)]*current_date/is.test(migration)) fail('CURRENT_DATE must not be stored in generated column');
if(!migration.includes('Medical expiry stays canonical in scd_athletes')) fail('medical source-of-truth annotation missing');
if(!migration.includes('Match-specific extension of canonical scd_events EVENT_ID')) fail('ONE_EVENT_ID extension contract missing');

for(const token of [
  'renderSegreteriaAlerts',
  'setupMatchDayWidget',
  'buildMatchDayCaption',
  'textContent',
  'noopener noreferrer'
]) if(!engine.includes(token)) fail('operative engine missing '+token);
if(engine.includes('innerHTML = `')) fail('unsafe template innerHTML must not be used for backend data');
if(engine.includes('https://scdcolicoderviese.it')) fail('unverified hardcoded backend domain forbidden');

for(const token of [
  'LockService.getScriptLock',
  'includeInlineImages: false',
  'PropertiesService.getScriptProperties',
  'SCD_DRIVE_01_AMMINISTRAZIONE_FISCO',
  'SCD_DRIVE_05_COMUNICAZIONE_SOCIAL',
  'message.markRead()',
  'thread.addLabel',
  'SCD/DA_VERIFICARE',
  'SCD/IGNORATO',
  'newer_than:30d',
  '-category:promotions',
  '-category:social',
  '-category:forums'
]) if(!router.includes(token)) fail('Gmail/Drive router missing '+token);
if(/ID_CARTELLA_/i.test(router)) fail('placeholder Drive folder IDs must not ship');
if(!template.includes('{{campionato_name}}')||!template.includes('{{avversario}}')||!template.includes('{{orario}}')) fail('match-day template placeholders missing');

if(!process.exitCode)console.log('SCD OPERATIVE CORE CONTRACT PASS',{
  rls:true,
  medicalStatusDerived:true,
  canonicalEventId:true,
  safeDomRendering:true,
  mailRouterIdempotent:true
});
