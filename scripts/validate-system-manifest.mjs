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
assert(m.identity_and_access.target_identity_engine==='SUPABASE_AUTH','target identity engine must be Supabase Auth');
assert(m.identity_and_access?.supabase_onboarding?.default_role==='USER_BASE','Supabase onboarding must default USER_BASE');
assert(m.identity_and_access?.supabase_onboarding?.self_role_selection===false,'Supabase onboarding cannot self-select role');
assert(m.identity_and_access?.supabase_onboarding?.client_context_function==='scd_my_context','Supabase context function mismatch');
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
  'SCD_OFFICIAL_SITE','SCD_FACEBOOK','SCD_INSTAGRAM','SCD_TIKTOK','SCD_YOUTUBE','SCD_PIXELLOT','LECCO_CHANNEL','SPRINT_E_SPORT_LOMBARDIA','SCD_ORGANIGRAMMA_2026_27','TUTTITALIA',
  'SEGRETARIO_CALCIO','TEAMSYSTEM_SPORTIVI_IN_CLOUD','SQUBY','ATHLETIS','SCD_SUPABASE','SCD_AI_WEEKLY_EDITORIAL','SCD_GOOGLE_CALENDAR'
],'source registry');
const sourceById=Object.fromEntries(sources.map(x=>[x.id,x]));
assert(sourceById.SCD_DRIVE.account==='sportclubcolico@gmail.com','Drive engine account changed');
assert(sourceById.SCD_GMAIL.account==='sportclubcolico@gmail.com','Gmail engine account changed');
assert(sourceById.SCD_GOOGLE_CALENDAR.account==='sportclubcolico@gmail.com','Calendar owner account changed');
assert(sourceById.SCD_GOOGLE_CALENDAR.resource_id==='4446ddfffc997074b2017673da3e459830fd1feeef3c9bb0525564f39c9d4122@group.calendar.google.com','Agenda SCD calendar id mismatch');
assert(sourceById.R20.must_preserve===true,'R20 preservation rule missing');
assert(sourceById.MAIL_OPERATIONS_SHEET.resource_id==='1wx3ZXwmdZuAr8AM_h08GzOvephm5o5iHMvTLQpRmbJE','mail operations source id mismatch');
assert(sourceById.SPONSOR_MASTER_SHEET.resource_id==='1-5-MUnrrAltflJSATe6bKkjm_3SItO0gvadi_PXPoAQ','sponsor master source id mismatch');
assert(sourceById.TUTTOCAMPO.use==='CROSS_CHECK_AND_ENRICHMENT','Tuttocampo must remain secondary enrichment');
assert(sourceById.TEAMSYSTEM_SPORTIVI_IN_CLOUD.trust==='BENCHMARK','TeamSystem must remain benchmark, not factual source');
assert(sourceById.SCD_SUPABASE.kind==='TARGET_DOMAIN_CORE','SCD Supabase source kind mismatch');
assert(sourceById.SCD_SUPABASE.state==='ACTIVE_HEALTHY','SCD Supabase project state must be ACTIVE_HEALTHY after R34 provisioning');
assert((sourceById.SCD_SUPABASE.rules||[]).includes('cepa_project_must_not_be_reused'),'CEPA Supabase isolation rule missing');
assert(sourceById.SCD_OFFICIAL_SITE.news_policy==='DISABLED_FOR_NEWS_UNTIL_FRESHNESS_VERIFIED','stale official site must stay disabled for app news');
assert(!(sourceById.SCD_OFFICIAL_SITE.authority_domains||[]).includes('PUBLIC_NEWS'),'official site must not remain news authority while stale');
assert(sourceById.SCD_AI_WEEKLY_EDITORIAL.trust==='DERIVED_VERIFIED','AI weekly editorial must be derived verified');
assert((sourceById.SCD_AI_WEEKLY_EDITORIAL.rules||[]).includes('must_include_evidence'),'AI weekly editorial evidence rule missing');
assert(sourceById.SCD_TIKTOK.kind==='PUBLIC_OFFICIAL_SCD','TikTok official source contract missing');
assert(sourceById.SCD_YOUTUBE.kind==='PUBLIC_OFFICIAL_SCD','YouTube official source contract missing');
assert(sourceById.SCD_PIXELLOT.kind==='PRIVATE_AUTHENTICATED_VIDEO_PLATFORM','Pixellot must remain private/authenticated');
assert(sourceById.SCD_ORGANIGRAMMA_2026_27.trust==='INTERNAL_VERIFIED','organigram source trust mismatch');
assert(m.product_direction?.media_and_social_hub?.pixellot_policy==='PRIVATE_BY_DEFAULT_AUTHORIZED_STAFF_ONLY','Pixellot privacy policy missing');
assert(m.product_direction?.staff_role_ingestion?.no_automatic_permission_grant===true,'staff source must never auto-grant app permissions');
assert(fs.existsSync(path.join(root,'config','scd-role-mapping-2026-27.v1.json')),'role mapping contract missing');

assert(m.drive_vault.dedup_by_hash===true,'Drive dedup by hash required');
assert(m.drive_vault.versioning_required===true,'Drive versioning required');
includesAll(m.drive_vault.existing_catalog_surfaces||[],['TESSERATI_SHEET/DRIVE AGGIORNAMENTI','TESSERATI_SHEET/REGISTRO FONTI V2'],'Drive existing catalog surfaces');
includesAll(m.drive_vault.catalog_fields||[],['DOCUMENT_ID','DRIVE_FILE_ID','HASH','VERSION','PERMISSIONS'],'Drive catalog');

assert(/Un solo EVENT_ID/i.test(m.calendar_event_engine.principle),'event single-source principle missing');
assert(m.calendar_event_engine?.operational_agenda?.summary_recipient==='sportclubcolico@gmail.com','Agenda SCD summary recipient mismatch');
assert(m.communications?.crm_outbound_policy?.actor_private_copy==='BCC_AUTHENTICATED_ACTOR_IF_DIFFERENT_FROM_CLUB','CRM actor copy policy missing');
includesAll(m.calendar_event_engine.required_event_fields||[],[
  'EVENT_ID','SEASON_ID','TYPE','START_AT','END_AT','STATUS','SOURCE','TEAM_IDS','PERSON_IDS','VISIBILITY'
],'event model');

includesAll(m.gmail_intelligence.existing_runtime_surfaces||[],['MAIL_OPERATIONS_SHEET/01_EMAIL_ARCHIVE','MAIL_OPERATIONS_SHEET/17_SMART_CLASSIFIER','MAIL_OPERATIONS_SHEET/18_ACTION_QUEUE'],'Gmail existing runtime surfaces');
assert(m.completeness_engine.confidence_required===true,'Completeness Engine confidence required');
assert(m.product_direction?.default_entry_route==='#/pulse','R26 default entry route must be #/pulse');
assert(m.product_direction?.experience_model==='ADAPTIVE_CLUB_OS','R38 experience model must be adaptive club OS');
assert(m.product_direction?.visual_principle==='SPATIAL_SPORT_EDITORIAL_HIGH_IMPACT','R38 visual principle mismatch');
assert(m.product_direction?.cumulative_integration_rule===true,'cumulative integration rule missing');
assert(m.product_direction?.human_centered_os?.mental_state_inference===false,'mental state inference must remain false');
assert(m.product_direction?.human_centered_os?.dark_patterns===false,'dark patterns must remain false');
assert(m.development_contract?.human_centered_rules?.pleasant_work_is_product_requirement===true,'pleasant work requirement missing');
assert(m.product_direction?.weekly_sport_calendar?.scope==='ALL_AGE_GROUPS_ALL_SPORTING_ACTIVITY_CURRENT_WEEK','R40 weekly calendar scope mismatch');
assert(m.product_direction?.weekly_sport_calendar?.no_hidden_default_slice===true,'R40 weekly calendar must show all by default');
assert(m.product_direction?.public_core_navigation?.state==='DEDICATED_PUBLIC_VIEWS','public core navigation state missing');
assert((m.product_direction?.public_core_navigation?.routes||[]).some(x=>x.id==='CALENDAR'&&x.hash==='#calendar'),'dedicated calendar route missing');
assert((m.product_direction?.public_core_navigation?.routes||[]).some(x=>x.id==='TEAMS'&&x.hash==='#teams'),'dedicated teams route missing');
assert((m.capability_map||[]).some(x=>x.id==='CAP-PUBLIC-TEAMS'),'CAP-PUBLIC-TEAMS missing');
assert((m.capability_map||[]).some(x=>x.id==='CAP-PUBLIC-MATCHDAY'),'CAP-PUBLIC-MATCHDAY missing');
assert(m.product_direction?.public_matchday?.no_invented_stats===true,'R48 Matchday invented stats must remain forbidden');
assert(m.product_direction?.public_matchday?.no_prediction===true,'R48 Matchday predictions must remain disabled');
assert(m.product_direction?.public_matchday?.missing_data==='DATO_IN_AGGIORNAMENTO','R48 Matchday fail-closed state missing');
assert(m.product_direction?.team_hub?.roster==='NO_PRIVATE_ROSTER','R48 Team Hub private roster guard missing');
assert(m.product_direction?.team_hub?.followed_team_preference==='LOCAL_DEVICE_ONLY','R48 followed-team preference must remain local');
assert(m.product_direction?.media_and_social_hub?.video_arena?.pixellot==='PRIVATE_BY_DEFAULT_AUTHORIZED_STAFF_ONLY','R48 Video Arena Pixellot privacy guard missing');

assert(m.product_direction?.ai_newsroom?.policy==='VERIFIED_STRUCTURED_FACTS_ONLY','R40 newsroom policy mismatch');
assert(m.product_direction?.ai_newsroom?.stale_site_content===false,'R40 newsroom must exclude stale site content');
assert(m.product_direction?.ai_newsroom?.fail_closed===true,'R40 newsroom must fail closed');
assert(m.development_contract?.weekly_newsroom?.runtime_endpoint==='/api/newsroom','R40 newsroom endpoint mismatch');
assert(m.manifest.change_policy?.cumulative_directives===true,'cumulative directive governance missing');
includesAll(m.completeness_engine.search_order||[],['DOMAIN_CORE','SCD_DRIVE','SCD_GMAIL_ATTACHMENTS'],'Completeness search order');

assert(m.communications.safeguarding.isolated===true,'Safeguarding must stay isolated');
includesAll(m.communications.safeguarding.excluded_from||[],['CRM','COMMUNITY','ORDINARY_MESSAGING','ANALYTICS'],'Safeguarding exclusions');
assert(m.communications.messaging.safeguarding_is_not_chat_level===true,'Safeguarding cannot be a chat level');
assert(m.communications.messaging.minor_safety.private_unsupervised_minor_chat_default===false,'unsupervised minor private chat must default false');

assert(m.sky_and_avatar.sky.must_not_bypass_permissions===true,'Sky must not bypass permissions');
assert(m.sky_and_avatar.personal_avatar.local_processing_default===true,'avatar local processing default required');
assert(m.sky_and_avatar.tamagotchi_evolution.forbidden_default.includes('hidden_biometric_scoring'),'Tamagotchi youth guardrail missing');
assert(m.sky_and_avatar.tamagotchi_evolution.forbidden_default.includes('talent_ranking'),'Twin talent ranking guardrail missing');
assert(m.sky_and_avatar?.mirror?.no_permission_bypass===true,'Mirror permission bypass must remain forbidden');
assert(m.analytics?.meta_adaptive?.storage==='LOCAL_DEVICE_ONLY_R38','Meta R38 must remain local-device only');
assert(m.analytics?.meta_adaptive?.external_sync===false,'Meta R38 external sync must remain off');

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
assert(m.architecture.feature_flags?.data_fabric_observability?.default_enabled===false,'Data Fabric observability must default off until R20 contract is live');
assert(m.architecture.feature_flags?.supabase_core?.id==='FF-SUPABASE-CORE','Supabase core feature flag missing');
assert(m.architecture.feature_flags?.supabase_core?.runtime_env==='SCD_FEATURE_SUPABASE_CORE','Supabase core runtime env mismatch');
assert(m.architecture.feature_flags?.supabase_core?.default_enabled===false,'Supabase core must default off before cutover');
assert(m.architecture.target?.domain_core==='SUPABASE_POSTGRESQL','target domain core must be Supabase PostgreSQL');
assert(m.architecture.target?.cepa_project_reuse_forbidden===true,'CEPA project reuse must remain forbidden');
includesAll(m.architecture.feature_flags?.data_fabric_observability?.activation_requires||[],['R20_ACTION_PUBLIC_DATAFABRIC_CONTRACT_SUPPORTED','R20_ACTION_DIRECTION_DATAFABRIC_STATUS_SUPPORTED','VERIFY_R20_DIRECT_GREEN','PRODUCTION_EVIDENCE_GREEN_WITH_FLAG_TRUE','DIRECTION_AUTHORIZED_SMOKE_GREEN'],'Data Fabric activation requirements');
assert(m.architecture.upstream_resilience?.retry_mode==='READ_ONLY_ONLY','upstream retries must remain read-only only');
assert(m.architecture.upstream_resilience?.max_attempts===2,'upstream read-only retry attempts mismatch');
includesAll(m.data_architecture?.provenance_contract?.ui_question_fields||[],['SOURCE','TABLE','FIELD','API','FALLBACK','REFRESH'],'provenance contract');
assert(m.data_architecture?.domain_core_target?.engine==='SUPABASE_POSTGRESQL','Supabase domain core target missing');
assert(m.data_architecture?.domain_core_target?.event_model==='ONE_EVENT_ID_MULTIPLE_PROJECTIONS','Supabase event model mismatch');
assert(m.data_architecture?.domain_core_target?.row_level_security_required===true,'Supabase RLS requirement missing');
assert(m.north_star.r20_must_not_be_replaced_without_verified_migration===true,'R20 migration guardrail missing');

const stateGate=m.development_contract?.state_gate||{};
assert(stateGate.id==='SCD:STATE','SCD:STATE hard gate missing');
assert(stateGate.mode==='PRECONDITION_GATE','SCD:STATE must remain a precondition gate');
assert(stateGate.failure_rule==='NO_STATE_NO_WRITE','NO STATE -> NO WRITE rule missing');
includesAll(stateGate.required_before||[],['FILE_WRITE','COMMIT','PUSH','BRANCH_CREATE','MERGE','DEPLOY','DATA_WRITE','CONFIG_CHANGE'],'SCD:STATE write coverage');
includesAll(stateGate.minimum_evidence||[],['REPOSITORY','CURRENT_MAIN_SHA','CURRENT_WORKING_BRANCH','CI_STATUS','PAGES_STATUS','MANIFEST_VERSION_OR_HASH','RELEASE_DEPENDENCIES','KNOWN_BLOCKERS','SAFE_NEXT_ACTION'],'SCD:STATE evidence');
includesAll(stateGate.allowed_status_values||[],['VERIFIED','UNVERIFIED','NOT_AVAILABLE','NOT_APPLICABLE'],'SCD:STATE statuses');
includesAll(m.development_contract?.operating_cycle||[],['SCD:STATE','SCD:EXPERT','SCD:ARCHITECT','SCD:INVENTORY','SCD:GAP','SCD:PLAN','SCD:BUILD','SCD:DATA','SCD:QA','SCD:MERGE','SCD:DEPLOY','SCD:PROVE','SCD:ROLLBACK'],'development operating cycle');
const expert=m.development_contract?.global_expert_router||{};
assert(expert.command==='SCD:EXPERT','SCD:EXPERT command missing');
assert(expert.mode==='MULTIDISCIPLINARY_SOURCE_AWARE_ROUTER','SCD:EXPERT mode mismatch');
includesAll(expert.asset_decision_values||[],['KEEP_LOCKED','KEEP_ENHANCE','REBUILD_IMPROVE','RESEARCH_REAL_ASSET','GENERATE_ORIGINAL'],'SCD:EXPERT asset decisions');
assert(expert.cybersecurity_scope==='DEFENSIVE_AUTHORIZED_OSINT_AND_SECURE_ENGINEERING_ONLY','cybersecurity scope must remain defensive/authorized');
assert(expert.research_scope==='PUBLIC_AUTHORIZED_SOURCES_ONLY','research scope must remain public/authorized');
assert(expert.autonomy?.production_rule==='NO_CRITICAL_AUTONOMOUS_PRODUCTION_CHANGE','critical autonomous production change must remain forbidden');
assert(expert.paired_architect_command==='SCD:ARCHITECT','SCD:ARCHITECT pairing missing');
const architect=m.development_contract?.senior_principal_architect_protocol||{};
assert(architect.command==='SCD:ARCHITECT','Senior Principal architect command missing');
assert(architect.state==='BINDING','Senior Principal architect protocol must be binding');
assert(architect.level==='SENIOR_PRINCIPAL','Senior Principal level missing');
assert((architect.phases||[]).map(x=>x.id).join('|')==='VISION_ANALYSIS|ENGINE_DATA|ZERO_BUG_BUILD|AUTONOMOUS_CONTINUOUS_LOOP','Senior Principal four-phase protocol mismatch');
assert(architect.continuation_rules?.do_not_stop_after_single_file===true,'continuous loop must not stop after a single file');
assert(architect.continuation_rules?.do_not_request_permission_for_next_safe_step===true,'safe next steps must continue without micro-confirmations');
assert(architect.continuation_rules?.background_continuation==='ONLY_VIA_EXPLICIT_SCHEDULED_AUTOMATION','background continuation must require explicit scheduler');
assert(architect.continuation_rules?.truncation_boundary==='END_OF_COMPLETE_FILE_ONLY','truncation boundary must be complete file');
assert(architect.continuation_rules?.truncation_marker==="[STATO: IN CORSO - Scrivi 'PROCEDI' per iniettare il blocco successivo]",'continuation marker mismatch');
includesAll(architect.autonomous_guardrails||[],['SCD_STATE_REMAINS_REQUIRED_BEFORE_WRITE','NO_CRITICAL_AUTONOMOUS_PRODUCTION_CHANGE','NO_FAKE_SPORT_DATA','ROLLBACK_REQUIRED'],'Senior Principal autonomous guardrails');
const assetGate=m.development_contract?.asset_decision_gate||{};
assert(assetGate.command==='SCD:ASSET','SCD:ASSET command missing');
assert(assetGate.registry==='config/scd-assets.v1.json','asset registry path mismatch');
assert(assetGate.creative_reconstruction_of_official_assets===false,'official asset creative reconstruction must remain forbidden');
includesAll(assetGate.immutable_families||[],['CLUB_OFFICIAL','FEDERATION_OFFICIAL','AFFILIATION_OFFICIAL','KIT_OFFICIAL','OPPONENT_OFFICIAL','SPONSOR_OFFICIAL'],'immutable asset families');
const releaseEvidence=m.delivery_and_quality?.release_truth?.required_evidence||[];
includesAll(releaseEvidence,['VERSION','COMMIT','PR','CI_STATUS','SCREENSHOT_MOBILE','SCREENSHOT_DESKTOP','DATA_SOURCES','KNOWN_LIMITATIONS','ROLLBACK'],'release evidence');
assert(m.delivery_and_quality?.production_evidence?.required===true,'production evidence must remain required');
assert(m.delivery_and_quality?.production_evidence?.workflow==='.github/workflows/production-evidence.yml','production evidence workflow mismatch');
assert(m.delivery_and_quality?.production_evidence?.r20_contract_action==='public.datafabric.contract','R20 public contract probe mismatch');
assert(m.delivery_and_quality?.production_evidence?.feature_gated_checks?.['FF-DATAFABRIC-OBSERVABILITY']?.disabled_status==='GATED_OFF_NOT_LIVE','Data Fabric gated-off evidence state missing');
assert(m.development_contract?.runtime_activation?.core_live_without_datafabric===true,'Core live must remain independent from gated Data Fabric observability');
assert(m.development_contract?.runtime_activation?.data_fabric_activation==='BLOCKED_UNTIL_R20_DEPLOY','Data Fabric activation blocker must remain explicit');
assert(m.development_contract?.runtime_activation?.r20_direct_verifier==='scripts/verify-r20-direct.mjs','R20 direct verifier missing from runtime activation');
assert(m.development_contract?.runtime_activation?.canonical_url_must_be_preserved===true,'R20 canonical Web App URL must be preserved');
assert(m.development_contract?.supabase_transition?.mode==='STRANGLER_DUAL_RUN','Supabase transition must remain strangler dual-run');
assert(m.development_contract?.supabase_transition?.project_creation_requires_user_cost_confirmation===true,'Supabase project creation must remain cost-confirmed');
assert(m.development_contract?.supabase_transition?.reuse_cepa_project===false,'CEPA Supabase project must not be reused');
assert(m.development_contract?.supabase_transition?.current_primary==='R20','R20 must remain primary until verified cutover');
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
  'CAP-HOME','CAP-CALENDAR','CAP-ATHLETE','CAP-FAMILY','CAP-STAFF','CAP-COMMS','CAP-RUNTIME-EVIDENCE','CAP-UPSTREAM-RESILIENCE','CAP-R20-RUNTIME-ACTIVATION',
  'CAP-DRIVE-CATALOG','CAP-GMAIL-INGESTION','CAP-DATAFABRIC-OBSERVABILITY','CAP-ENTITY-GRAPH','CAP-COMPLETENESS','CAP-SUPABASE-CORE','CAP-SUPABASE-AUTH-CONTEXT',
  'CAP-CHAT','CAP-CONFIDENCE','CAP-ANCONFIDENCE','CAP-SAFEGUARDING','CAP-SKY','CAP-AVATAR',
  'CAP-TAMAGOTCHI','CAP-GEO','CAP-R22','CAP-PWA','CAP-ANDROID','CAP-IOS','CAP-MOBILE-SUPABASE-SHELL','CAP-SCD-UNIVERSE','CAP-META-ADAPTIVE','CAP-SCD-TWIN','CAP-SCD-MIRROR','CAP-SOCIAL-RADAR','CAP-HUMAN-OS','CAP-PRIVATE-DESK','CAP-COGNITIVE-ERGONOMICS','CAP-GROWTH-LOOP','CAP-WEEKLY-SPORT-CALENDAR','CAP-AI-NEWSROOM','CAP-MEDIA-SOCIAL-HUB','CAP-STAFF-ROLE-INGESTION','CAP-PUBLIC-MATCHDAY'
],'capability map');

const gaps=m.known_noncompliance||[];
includesAll(gaps.map(x=>x.id),['GAP-UI-001','GAP-UI-002','GAP-DATA-001','GAP-EVENT-001','GAP-COMMS-001','GAP-CORE-001'],'known noncompliance');

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
  'docs/adr/ADR-0005-r20-runtime-activation.md',
  'docs/adr/ADR-0006-r32-safe-live-core.md',
  'docs/adr/ADR-0007-supabase-domain-core.md',
  'docs/adr/ADR-0008-supabase-auth-context.md',
  'docs/adr/ADR-0009-mobile-supabase-shell.md',
  'docs/adr/ADR-0010-r38-scd-universe.md',
  'docs/SCD_UNIVERSE_R38.md',
  'docs/SCD_HUMAN_OS_R39.md',
  'docs/adr/ADR-0011-human-centered-cognitive-os.md',
  'docs/adr/ADR-0012-r40-weekly-sport-ai-newsroom.md',
  'docs/architecture/SCD-AUTONOMOUS-DEVELOPMENT-PROTOCOL.md',
  'docs/SCD_NEWSROOM_R40.md',
  'content/weekly-news.json',
  'ui-r40-weekly.css',
  'scripts/validate-newsroom-contract.mjs',
  'ui-r39-human.css',
  'scd-experience-engine.js',
  'scripts/validate-human-os-contract.mjs',
  'ui-r38-universe.css',
  'scd-meta-engine.js',
  'scd-twin.js',
  'scripts/validate-universe-contract.mjs',
  'mobile/package.json',
  'mobile/app.json',
  'mobile/App.tsx',
  'mobile/src/lib/supabase.ts',
  'mobile/src/lib/context.ts',
  'scripts/validate-mobile-contract.mjs',
  'config/scd-supabase.v1.json',
  'config/scd-assets.v1.json',
  'supabase/migrations/20260929_r35_auth_context_rls_normalization.sql',
  'supabase/migrations/20260929_r33_club_graph_foundation.sql',
  'scripts/validate-supabase-contract.mjs',
  'docs/runbooks/R20-RUNTIME-DEPLOY.md',
  'scripts/verify-r20-direct.mjs',
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
assert(pkg?.scripts?.['verify:r20']==='node scripts/verify-r20-direct.mjs','package.json must expose verify:r20');
assert(pkg?.scripts?.['test:supabase-contract']==='node scripts/validate-supabase-contract.mjs','package.json must expose test:supabase-contract');
assert(pkg?.scripts?.['test:mobile-contract']==='node scripts/validate-mobile-contract.mjs','package.json must expose test:mobile-contract');
assert(pkg?.scripts?.['test:universe-contract']==='node scripts/validate-universe-contract.mjs','package.json must expose test:universe-contract');
assert(pkg?.scripts?.['test:human-os-contract']==='node scripts/validate-human-os-contract.mjs','package.json must expose test:human-os-contract');
assert(pkg?.scripts?.['test:newsroom-contract']==='node scripts/validate-newsroom-contract.mjs','package.json must expose test:newsroom-contract');

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
