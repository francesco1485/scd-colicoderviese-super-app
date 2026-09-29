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
assert(m.manifest.change_policy?.state_first===true,'state-first governance must remain enabled');
assert(m.manifest.change_policy?.no_write_without_verified_state===true,'NO STATE -> NO WRITE must remain enabled');
assert(m.manifest.change_policy?.unverified_is_not_false_or_absent===true,'UNVERIFIED semantics must remain explicit');

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
  'SCD_DRIVE','SCD_GMAIL','R20','CORE_SHEET','TESSERATI_SHEET','PULMINI_SHEET','MAIL_OPERATIONS_SHEET','SPONSOR_MASTER_SHEET','ECONOMIC_MASTER_SHEET','TOURNAMENTS_MASTER_SHEET',
  'FIGC','LND','CR_LOMBARDIA','SGS','SPORT_E_SALUTE','RASD','TUTTOCAMPO',
  'SCD_OFFICIAL_SITE','SCD_FACEBOOK','SCD_INSTAGRAM','TUTTITALIA',
  'SEGRETARIO_CALCIO','TEAMSYSTEM_SPORTIVI_IN_CLOUD','SQUBY','ATHLETIS'
],'source registry');
const sourceById=Object.fromEntries(sources.map(x=>[x.id,x]));
assert(sourceById.SCD_DRIVE.account==='sportclubcolico@gmail.com','Drive engine account changed');
assert(sourceById.SCD_GMAIL.account==='sportclubcolico@gmail.com','Gmail engine account changed');
assert(sourceById.R20.must_preserve===true,'R20 preservation rule missing');
assert(sourceById.MAIL_OPERATIONS_SHEET.resource_id==='1wx3ZXwmdZuAr8AM_h08GzOvephm5o5iHMvTLQpRmbJE','mail operations source id mismatch');
assert(sourceById.SPONSOR_MASTER_SHEET.resource_id==='1-5-MUnrrAltflJSATe6bKkjm_3SItO0gvadi_PXPoAQ','sponsor master source id mismatch');
assert(sourceById.TUTTOCAMPO.use==='CROSS_CHECK_AND_ENRICHMENT','Tuttocampo must remain secondary enrichment');
assert(sourceById.TEAMSYSTEM_SPORTIVI_IN_CLOUD.trust==='BENCHMARK','TeamSystem must remain benchmark, not factual source');

assert(m.drive_vault.dedup_by_hash===true,'Drive dedup by hash required');
assert(m.drive_vault.versioning_required===true,'Drive versioning required');
includesAll(m.drive_vault.existing_catalog_surfaces||[],['TESSERATI_SHEET/DRIVE AGGIORNAMENTI','TESSERATI_SHEET/REGISTRO FONTI V2'],'Drive existing catalog surfaces');
includesAll(m.drive_vault.catalog_fields||[],['DOCUMENT_ID','DRIVE_FILE_ID','HASH','VERSION','PERMISSIONS'],'Drive catalog');

assert(/Un solo EVENT_ID/i.test(m.calendar_event_engine.principle),'event single-source principle missing');
includesAll(m.calendar_event_engine.required_event_fields||[],[
  'EVENT_ID','SEASON_ID','TYPE','START_AT','END_AT','STATUS','SOURCE','TEAM_IDS','PERSON_IDS','VISIBILITY'
],'event model');

includesAll(m.gmail_intelligence.existing_runtime_surfaces||[],['MAIL_OPERATIONS_SHEET/01_EMAIL_ARCHIVE','MAIL_OPERATIONS_SHEET/17_SMART_CLASSIFIER','MAIL_OPERATIONS_SHEET/18_ACTION_QUEUE'],'Gmail existing runtime surfaces');
assert(m.completeness_engine.confidence_required===true,'Completeness Engine confidence required');
assert(m.product_direction?.default_entry_route==='#/pulse','R26 default entry route must be #/pulse');
assert(m.product_direction?.experience_model==='CLUB_GRAPH_DRIVEN','R26 experience model must remain graph-driven');
assert(m.product_direction?.visual_principle==='ABSTRACT_ADAPTIVE_SUBLIMATION','R26 visual principle mismatch');
assert(m.product_direction?.no_rewrite_rule===true,'R26 no-rewrite rule must remain true');
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
assert(m.architecture.feature_flags?.data_fabric_observability?.id==='FF-DATAFABRIC-OBSERVABILITY','Data Fabric observability feature flag missing');
assert(m.architecture.feature_flags?.data_fabric_observability?.runtime_env==='SCD_FEATURE_DATA_FABRIC_OBSERVABILITY','Data Fabric feature flag env mismatch');
assert(m.architecture.upstream_resilience?.retry_mode==='READ_ONLY_ONLY','upstream retries must remain read-only only');
assert(m.architecture.upstream_resilience?.max_attempts===2,'upstream read-only retry attempts mismatch');
includesAll(m.data_architecture?.provenance_contract?.ui_question_fields||[],['SOURCE','TABLE','FIELD','API','FALLBACK','REFRESH'],'provenance contract');
assert(m.north_star.r20_must_not_be_replaced_without_verified_migration===true,'R20 migration guardrail missing');

const stateGate=m.development_contract?.state_gate||{};
assert(stateGate.id==='SCD:STATE','SCD:STATE hard gate missing');
assert(stateGate.mode==='PRECONDITION_GATE','SCD:STATE must remain a precondition gate');
assert(stateGate.failure_rule==='NO_STATE_NO_WRITE','NO STATE -> NO WRITE rule missing');
includesAll(stateGate.required_before||[],['FILE_WRITE','COMMIT','PUSH','BRANCH_CREATE','MERGE','DEPLOY','DATA_WRITE','CONFIG_CHANGE'],'SCD:STATE write coverage');
includesAll(stateGate.minimum_evidence||[],['REPOSITORY','CURRENT_MAIN_SHA','CURRENT_WORKING_BRANCH','CI_STATUS','PAGES_STATUS','MANIFEST_VERSION_OR_HASH','RELEASE_DEPENDENCIES','KNOWN_BLOCKERS','SAFE_NEXT_ACTION'],'SCD:STATE evidence');
includesAll(stateGate.allowed_status_values||[],['VERIFIED','UNVERIFIED','NOT_AVAILABLE','NOT_APPLICABLE'],'SCD:STATE statuses');
includesAll(m.development_contract?.operating_cycle||[],['SCD:STATE','SCD:INVENTORY','SCD:GAP','SCD:PLAN','SCD:BUILD','SCD:DATA','SCD:QA','SCD:MERGE','SCD:DEPLOY','SCD:PROVE','SCD:ROLLBACK'],'development operating cycle');
const releaseEvidence=m.delivery_and_quality?.release_truth?.required_evidence||[];
includesAll(releaseEvidence,['VERSION','COMMIT','PR','CI_STATUS','SCREENSHOT_MOBILE','SCREENSHOT_DESKTOP','DATA_SOURCES','KNOWN_LIMITATIONS','ROLLBACK'],'release evidence');
assert(m.delivery_and_quality?.production_evidence?.required===true,'production evidence must remain required');
assert(m.delivery_and_quality?.production_evidence?.workflow==='.github/workflows/production-evidence.yml','production evidence workflow mismatch');
assert(m.delivery_and_quality?.production_evidence?.r20_contract_action==='public.datafabric.contract','R20 public contract probe mismatch');
const r25r26=(m.development_contract?.release_dependencies||[]).find(x=>x.predecessor==='R25'&&x.successor==='R26');
assert(r25r26?.relation==='REQUIRED_PREDECESSOR','R25 -> R26 dependency must remain explicit');
assert(r25r26?.status==='SATISFIED_IN_MAIN','R25 -> R26 dependency must be recorded as satisfied in main');

const caps=m.capability_map||[];
unique(caps.map(x=>x.id),'capability ids');
for(const cap of caps){
  assert(/^CAP-/.test(cap.id),'invalid capability id '+cap.id);
  assert(['IMPLEMENTED','INTERNAL_TEST','PARTIAL','REBUILD_REQUIRED','PLANNED','DESIGN_ONLY','ROADMAP'].includes(cap.state),'invalid capability state '+cap.id);
}
includesAll(caps.map(x=>x.id),[
  'CAP-HOME','CAP-CALENDAR','CAP-ATHLETE','CAP-FAMILY','CAP-STAFF','CAP-COMMS','CAP-RUNTIME-EVIDENCE','CAP-UPSTREAM-RESILIENCE',
  'CAP-DRIVE-CATALOG','CAP-GMAIL-INGESTION','CAP-DATAFABRIC-OBSERVABILITY','CAP-ENTITY-GRAPH','CAP-COMPLETENESS',
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
  'VISUAL_SYSTEM_LOCK.md',
  '.github/workflows/manifest-pr-policy.yml',
  'docs/adr/ADR-0001-scd-state-hard-gate.md',
  'docs/adr/ADR-0002-datafabric-observability.md',
  'docs/adr/ADR-0003-production-evidence.md',
  'docs/adr/ADR-0004-read-only-upstream-retry.md',
  'tests/upstream-resilience.mjs',
  'scripts/verify-production.mjs',
  '.github/workflows/production-evidence.yml'
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
assert(pkg?.scripts?.['test:resilience']==='node tests/upstream-resilience.mjs','package.json must expose test:resilience');

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
