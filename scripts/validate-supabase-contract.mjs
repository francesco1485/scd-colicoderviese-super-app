import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const configPath=path.join(root,'config/scd-supabase.v1.json');
const migrationPath=path.join(root,'supabase/migrations/20260929_r33_club_graph_foundation.sql');
const authMigrationPath=path.join(root,'supabase/migrations/20260929_r35_auth_context_rls_normalization.sql');
const operativeMigrationPath=path.join(root,'supabase/migrations/20261002_r51_core_operative_engine.sql');
const operativeIndexMigrationPath=path.join(root,'supabase/migrations/20261002_r51_1_operative_index_hardening.sql');
const r53MigrationPath=path.join(root,'supabase/migrations/20261002_r53_football_social_private_core.sql');

function fail(message){console.error('SCD SUPABASE CONTRACT FAIL:',message);process.exitCode=1}
function assert(condition,message){if(!condition)fail(message)}
function readJson(file){try{return JSON.parse(fs.readFileSync(file,'utf8'))}catch(e){fail('Invalid JSON '+file+': '+e.message);return null}}

assert(fs.existsSync(configPath),'config/scd-supabase.v1.json missing');
assert(fs.existsSync(migrationPath),'R33 migration missing');
assert(fs.existsSync(authMigrationPath),'R35 auth migration missing');
assert(fs.existsSync(operativeMigrationPath),'R51 operative migration missing');
assert(fs.existsSync(operativeIndexMigrationPath),'R51.1 operative index migration missing');
assert(fs.existsSync(r53MigrationPath),'R53 football/social migration missing');
const cfg=readJson(configPath);
const sql=fs.existsSync(migrationPath)?fs.readFileSync(migrationPath,'utf8'):'';
const authSql=fs.existsSync(authMigrationPath)?fs.readFileSync(authMigrationPath,'utf8'):'';
const operativeSql=fs.existsSync(operativeMigrationPath)?fs.readFileSync(operativeMigrationPath,'utf8'):'';
const operativeIndexSql=fs.existsSync(operativeIndexMigrationPath)?fs.readFileSync(operativeIndexMigrationPath,'utf8'):'';

if(cfg){
  assert(cfg.schema_version==='1.2.0','wrong Supabase contract schema version');
  assert(cfg.project?.state==='ACTIVE_HEALTHY','SCD Supabase project must be active after R34 provisioning');
  assert(cfg.project?.dedicated_project_required===true,'dedicated SCD Supabase project required');
  assert(cfg.project?.reuse_cepa_project===false,'CEPA Maglia OS Supabase project must not be reused');
  assert(cfg.project?.creation_requires_explicit_cost_confirmation===true,'Supabase project creation must remain cost-confirmed');
  assert(cfg.project?.project_id==='ndevtxxijbcnskgysdit','unexpected SCD Supabase project id');
  assert(cfg.project?.cost?.amount===0 && cfg.project?.cost?.confirmed===true,'Supabase project cost confirmation missing');
  assert(cfg.activation?.feature_flag==='FF-SUPABASE-CORE','wrong Supabase feature flag');
  assert(cfg.activation?.default_enabled===false,'Supabase core must default off before migration proof');
  assert(cfg.migration_mode==='STRANGLER_DUAL_RUN','migration must remain staged dual-run');
  assert(cfg.auth_context?.signup_default_role==='USER_BASE','Auth signup must default USER_BASE');
  assert(cfg.auth_context?.self_role_selection===false,'Auth cannot self-select qualified role');
  assert(cfg.auth_context?.context_function==='scd_my_context','Auth context function mismatch');
  assert(cfg.domain_core?.operative_engine?.state==='SCHEMA_APPLIED_RUNTIME_GATED','operative engine must remain runtime gated after schema apply');
  assert(cfg.domain_core?.operative_engine?.medical_source_of_truth==='scd_athletes.medical_certificate_expires_at','medical source of truth mismatch');
  assert(cfg.domain_core?.operative_engine?.event_source_of_truth==='scd_events.id','event source of truth mismatch');
}

const requiredTables=[
  'scd_organizations','scd_profiles','scd_memberships','scd_seasons','scd_people',
  'scd_families','scd_family_members','scd_athletes','scd_categories','scd_teams',
  'scd_team_memberships','scd_events','scd_event_scopes','scd_documents',
  'scd_external_refs','scd_audit_events'
];
for(const table of requiredTables){
  assert(new RegExp('create table if not exists public\\.'+table+'\\b','i').test(sql),'missing table '+table);
  assert(new RegExp('alter table public\\.'+table+' enable row level security','i').test(sql),'RLS missing for '+table);
}
for(const token of ['scd_is_org_member','scd_has_org_role','public.datafabric.contract']){
  if(token==='public.datafabric.contract') continue;
  assert(sql.includes(token),'missing security helper '+token);
}
assert(sql.includes('ONE_EVENT_ID')||sql.includes('Single EVENT_ID'),'single event model annotation missing');
assert(sql.includes('scd_external_refs'),'legacy adapter bridge missing');
assert(!/\bdrop\s+(table|schema|database)\b/i.test(sql),'destructive DROP statement forbidden in R33 foundation');
assert(!/\btruncate\b/i.test(sql),'TRUNCATE forbidden in R33 foundation');
assert(!/service_role_key\s*[:=]\s*['"][^'"]+['"]/i.test(sql),'service role secret must never be committed');
for(const token of ['scd_handle_new_user','on_auth_user_created_scd','scd_my_context','USER_BASE']) assert(authSql.includes(token),'R35 auth contract missing '+token);
assert(!/create\s+policy[\s\S]{0,180}for\s+all/i.test(authSql),'R35 normalized write policies must not use FOR ALL');
assert(/security\s+definer[\s\S]{0,160}set\s+search_path\s*=\s*public/i.test(authSql),'Auth trigger security definer must pin search_path');

for(const token of ['scd_person_roles','scd_tesseramenti','scd_matches','scd_secretariat_alerts_v','scd_match_day_v','security_invoker = true']) assert(operativeSql.includes(token),'R51 operative contract missing '+token);
assert(!/generated\s+always\s+as\s*\([^)]*current_date/is.test(operativeSql),'R51 must derive date-sensitive medical status at read time');
assert(/alter table public\.scd_person_roles enable row level security/i.test(operativeSql),'R51 person roles RLS missing');
assert(/alter table public\.scd_tesseramenti enable row level security/i.test(operativeSql),'R51 registrations RLS missing');
assert(/alter table public\.scd_matches enable row level security/i.test(operativeSql),'R51 matches RLS missing');
for(const token of ['scd_tesseramenti_person_idx','scd_tesseramenti_season_idx','scd_tesseramenti_category_idx','scd_tesseramenti_team_idx']) assert(operativeIndexSql.includes(token),'R51.1 index hardening missing '+token);
for(const token of ['scd_training_sessions','scd_match_callups','scd_social_mvp_votes','scd_social_rewards','scd_team_messages']) assert(r53Sql.includes(token),'R53 Supabase core missing '+token);
assert(cfg.domain_core?.football_private_core?.state==='SCHEMA_READY_RUNTIME_GATED','R53 football core state mismatch');
assert(cfg.domain_core?.social_interactive_core?.state==='SCHEMA_READY_RUNTIME_GATED','R53 social core state mismatch');

if(process.exitCode)process.exit(process.exitCode);
console.log('SCD SUPABASE CONTRACT PASS',{
  schema:cfg.schema_version,
  tables:requiredTables.length,
  projectState:cfg.project.state,
  migrationMode:cfg.migration_mode
});
