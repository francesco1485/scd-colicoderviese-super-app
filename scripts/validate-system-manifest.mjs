import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const manifestPath=path.join(root,'SCD_SYSTEM_MANIFEST.json');
const schemaPath=path.join(root,'SCD_SYSTEM_MANIFEST.schema.json');

function fail(message){
  console.error('SCD MANIFEST FAIL:',message);
  process.exitCode=1;
}
function assert(condition,message){ if(!condition) fail(message); }
function readJson(file){
  try{return JSON.parse(fs.readFileSync(file,'utf8'))}
  catch(error){fail('Invalid JSON '+path.basename(file)+': '+error.message);return null}
}
function unique(values,label){
  const set=new Set(values);
  assert(set.size===values.length,label+' contains duplicates');
}
function includesAll(actual,required,label){
  for(const item of required) assert(actual.includes(item),label+' missing '+item);
}

assert(fs.existsSync(manifestPath),'SCD_SYSTEM_MANIFEST.json missing');
assert(fs.existsSync(schemaPath),'SCD_SYSTEM_MANIFEST.schema.json missing');
const m=readJson(manifestPath);
const schema=readJson(schemaPath);
if(!m||!schema) process.exit(1);

const requiredTop=[
  'manifest','north_star','non_negotiable_invariants','product','visual_system','temporal_core',
  'identity_and_access','data_architecture','source_registry','drive_vault','gmail_intelligence',
  'entity_graph','calendar_event_engine','completeness_engine','communications','sky_and_avatar',
  'geo_spatial','security','evolution_engine','analytics','architecture','delivery_and_quality',
  'capability_map','known_noncompliance','development_contract'
];
includesAll(Object.keys(m),requiredTop,'manifest top-level');
assert(m.$schema==='./SCD_SYSTEM_MANIFEST.schema.json','$schema must point to local canonical schema');

assert(m.manifest.id==='scd-colicoderviese-system','wrong manifest id');
assert(/^\d+\.\d+\.\d+$/.test(m.manifest.version),'manifest version must be semver');
assert(m.manifest.status==='BINDING','manifest must remain BINDING');
assert(m.manifest.timezone==='Europe/Rome','manifest timezone must be Europe/Rome');
assert(m.manifest.change_policy?.manifest_first===true,'manifest-first governance must remain enabled');
assert(m.manifest.change_policy?.no_silent_reinterpretation===true,'silent reinterpretation must stay forbidden');

const core=m.product.core_experiences||[];
const coreIds=core.map(x=>x.id);
const expectedCore=['HOME_PUBLIC','CALENDAR_LIVE','ATHLETE_AREA','FAMILY_AREA','STAFF_DIRECTION','COMMUNICATIONS'];
assert(core.length===6,'exactly six core experiences are required');
includesAll(coreIds,expectedCore,'core experiences');
unique(coreIds,'core experience ids');
unique(core.map(x=>x.route),'core routes');
for(const screen of core){
  assert(screen.route.startsWith('/app/'),'core route must be app route: '+screen.id);
  assert(Boolean(screen.visual_master),'visual master missing for '+screen.id);
}
assert(m.product.navigation?.same_routes_across_channels===true,'web/app must share routes');
assert(m.product.navigation?.never_create_second_product_for_desktop===true,'desktop must remain same product');

const desktopRule=m.visual_system?.responsive_qa?.desktop_rule||'';
assert(/non limitare|not limit/i.test(desktopRule),'desktop rule must reject phone-only shell');
includesAll(
  m.visual_system.responsive_qa.required_mobile_viewports||[],
  ['360x800','390x844','393x852','430x932'],
  'mobile visual QA'
);
includesAll(
  m.visual_system.responsive_qa.required_desktop_viewports||[],
  ['1280x800','1440x900','1920x1080'],
  'desktop visual QA'
);
assert(m.visual_system.responsive_qa.visual_regression_required===true,'visual regression must be required');
assert(m.visual_system.source_of_truth==='APPROVED_SCD_VISUAL_BOARDS','approved boards must remain visual source of truth');

assert(m.temporal_core.canonical_timezone==='Europe/Rome','Temporal Core timezone mismatch');
assert(m.temporal_core.authoritative_time_required===true,'authoritative time must be required');

assert(m.identity_and_access.single_account===true,'single-account rule must remain enabled');
assert(m.identity_and_access.default_role==='USER_BASE','default role must be USER_BASE');
assert(m.identity_and_access.self_select_role_at_registration===false,'users must not self-assign roles');
assert(m.identity_and_access.authorization==='SERVER_SIDE_ONLY','authorization must be server-side');
includesAll(
  m.identity_and_access.roles||[],
  ['USER_BASE','FAMILY','ATHLETE','MISTER','STAFF','MANAGER','SECRETARIAT','REGISTRATION','TOURNAMENTS','DIRECTION'],
  'roles'
);

const sources=m.source_registry.sources||[];
const sourceIds=sources.map(x=>x.id);
unique(sourceIds,'source ids');
includesAll(sourceIds,[
  'SCD_DRIVE','SCD_GMAIL','R20','CORE_SHEET','TESSERATI_SHEET','PULMINI_SHEET','SPONSOR_SHEET',
  'FIGC','LND','CR_LOMBARDIA','SGS','SPORT_E_SALUTE','RASD','TUTTOCAMPO',
  'SCD_OFFICIAL_SITE','SCD_FACEBOOK','SCD_INSTAGRAM','TUTTITALIA',
  'SEGRETARIO_CALCIO','TEAMSYSTEM_SPORTIVI_IN_CLOUD','SQUBY','ATHLETIS'
],'source registry');
const sourceById=Object.fromEntries(sources.map(x=>[x.id,x]));
assert(sourceById.SCD_DRIVE.account==='sportclubcolico@gmail.com','Drive engine account changed');
assert(sourceById.SCD_GMAIL.account==='sportclubcolico@gmail.com','Gmail engine account changed');
assert(sourceById.R20.must_preserve===true,'R20 preservation rule missing');
assert(sourceById.TUTTOCAMPO.use==='CROSS_CHECK_AND_ENRICHMENT','Tuttocampo must remain secondary enrichment');
assert(sourceById.TEAMSYSTEM_SPORTIVI_IN_CLOUD.trust==='BENCHMARK','TeamSystem must remain benchmark, not factual source');

assert(m.drive_vault.dedup_by_hash===true,'Drive dedup by hash required');
assert(m.drive_vault.versioning_required===true,'Drive versioning required');
includesAll(m.drive_vault.catalog_fields||[],['DOCUMENT_ID','DRIVE_FILE_ID','HASH','VERSION','PERMISSIONS'],'Drive catalog');

assert(/Un solo EVENT_ID/i.test(m.calendar_event_engine.principle),'event single-source principle missing');
includesAll(m.calendar_event_engine.required_event_fields||[],[
  'EVENT_ID','SEASON_ID','TYPE','START_AT','END_AT','STATUS','SOURCE','TEAM_IDS','PERSON_IDS','VISIBILITY'
],'event model');

assert(m.completeness_engine.confidence_required===true,'Completeness Engine confidence required');
includesAll(m.completeness_engine.search_order||[],['DOMAIN_CORE','SCD_DRIVE','SCD_GMAIL_ATTACHMENTS'],'Completeness search order');

assert(m.communications.safeguarding.isolated===true,'Safeguarding must stay isolated');
includesAll(m.communications.safeguarding.excluded_from||[],['CRM','COMMUNITY','ORDINARY_MESSAGING','ANALYTICS'],'Safeguarding exclusions');
assert(m.communications.messaging.safeguarding_is_not_chat_level===true,'Safeguarding cannot be a chat level');
assert(m.communications.messaging.minor_safety.private_unsupervised_minor_chat_default===false,'unsupervised minor private chat must default false');

assert(m.sky_and_avatar.sky.must_not_bypass_permissions===true,'Sky must not bypass permissions');
assert(m.sky_and_avatar.personal_avatar.local_processing_default===true,'avatar local processing default required');
assert(m.sky_and_avatar.tamagotchi_evolution.forbidden_default.includes('hidden_biometric_scoring'),'Tamagotchi youth guardrail missing');

assert(m.geo_spatial.edge_first===true,'geo must remain edge-first');
assert(m.geo_spatial.precise_location_default===false,'precise location must not default on');
assert(m.geo_spatial.location_must_not_be_used_for_hidden_tracking===true,'hidden location tracking must stay forbidden');

assert(m.security.model==='ZERO_TRUST','Zero Trust security model required');
assert(m.security.no_custom_crypto===true,'custom crypto must remain forbidden');
assert(m.security.server_side_authorization===true,'server-side authorization required');

assert(m.evolution_engine.production_self_modification===false,'autonomous production self-modification must remain false');
assert(m.analytics.privacy_first===true,'analytics must remain privacy-first');
includesAll(m.analytics.forbidden_payloads||[],['PASSWORD','PIN','SAFEGUARDING_CONTENT','PRIVATE_MESSAGES'],'analytics forbidden payloads');

assert(m.architecture.r22_role==='ORCHESTRATION_COMMAND_EVENT_PLUGIN_LAYER_NOT_SECOND_GESTIONALE','R22 cannot become a second gestionale');
assert(m.architecture.extensibility.data_ui_separation===true,'data/UI separation required');
assert(m.north_star.r20_must_not_be_replaced_without_verified_migration===true,'R20 migration guardrail missing');

const caps=m.capability_map||[];
unique(caps.map(x=>x.id),'capability ids');
for(const cap of caps){
  assert(/^CAP-/.test(cap.id),'invalid capability id '+cap.id);
  assert(['IMPLEMENTED','INTERNAL_TEST','PARTIAL','REBUILD_REQUIRED','PLANNED','DESIGN_ONLY','ROADMAP'].includes(cap.state),'invalid capability state '+cap.id);
}
includesAll(caps.map(x=>x.id),[
  'CAP-HOME','CAP-CALENDAR','CAP-ATHLETE','CAP-FAMILY','CAP-STAFF','CAP-COMMS',
  'CAP-DRIVE-CATALOG','CAP-GMAIL-INGESTION','CAP-ENTITY-GRAPH','CAP-COMPLETENESS',
  'CAP-CHAT','CAP-CONFIDENCE','CAP-ANCONFIDENCE','CAP-SAFEGUARDING','CAP-SKY','CAP-AVATAR',
  'CAP-TAMAGOTCHI','CAP-GEO','CAP-R22','CAP-PWA','CAP-ANDROID','CAP-IOS'
],'capability map');

const gaps=m.known_noncompliance||[];
includesAll(gaps.map(x=>x.id),['GAP-UI-001','GAP-UI-002','GAP-DATA-001','GAP-EVENT-001','GAP-COMMS-001'],'known noncompliance');

const requiredRepoFiles=[
  'AGENTS.md',
  '.github/pull_request_template.md',
  'SCD_SYSTEM_MANIFEST.json',
  'SCD_SYSTEM_MANIFEST.schema.json',
  'scripts/validate-system-manifest.mjs',
  'PROJECT_CONSTITUTION.md',
  'SCD_PERMANENT_COMMANDS.md',
  'VISUAL_SYSTEM_LOCK.md'
];
for(const file of requiredRepoFiles){
  assert(fs.existsSync(path.join(root,file)),'required governance file missing: '+file);
}

for(const legacy of ['PROJECT_CONSTITUTION.md','SCD_PERMANENT_COMMANDS.md','VISUAL_SYSTEM_LOCK.md']){
  const header=fs.readFileSync(path.join(root,legacy),'utf8').slice(0,700);
  assert(header.includes('SCD_SYSTEM_MANIFEST.json'),'legacy document must point to canonical manifest: '+legacy);
}

const pkg=readJson(path.join(root,'package.json'));
assert(pkg?.scripts?.['test:manifest']==='node scripts/validate-system-manifest.mjs','package.json must expose test:manifest');

for(const workflow of ['.github/workflows/e2e.yml','.github/workflows/pages.yml','.github/workflows/command-platform.yml','.github/workflows/system-manifest.yml']){
  const file=path.join(root,workflow);
  assert(fs.existsSync(file),'workflow missing: '+workflow);
  const text=fs.readFileSync(file,'utf8');
  assert(text.includes('test:manifest'),'workflow does not enforce manifest: '+workflow);
}

const serialized=JSON.stringify(m);
for(const forbiddenKey of ['"password":','"token":','"secret":','"private_key":']){
  assert(!serialized.toLowerCase().includes(forbiddenKey),'manifest appears to contain a committed secret field: '+forbiddenKey);
}

if(process.exitCode) process.exit(process.exitCode);
console.log('SCD SYSTEM MANIFEST PASS',{
  version:m.manifest.version,
  coreExperiences:core.length,
  sources:sources.length,
  capabilities:caps.length,
  knownGaps:gaps.length
});
