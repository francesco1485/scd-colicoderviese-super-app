import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const configPath=path.join(root,'config/scd-supabase.v1.json');
const migrationPath=path.join(root,'supabase/migrations/20260929_r33_club_graph_foundation.sql');

function fail(message){console.error('SCD SUPABASE CONTRACT FAIL:',message);process.exitCode=1}
function assert(condition,message){if(!condition)fail(message)}
function readJson(file){try{return JSON.parse(fs.readFileSync(file,'utf8'))}catch(e){fail('Invalid JSON '+file+': '+e.message);return null}}

assert(fs.existsSync(configPath),'config/scd-supabase.v1.json missing');
assert(fs.existsSync(migrationPath),'R33 migration missing');
const cfg=readJson(configPath);
const sql=fs.existsSync(migrationPath)?fs.readFileSync(migrationPath,'utf8'):'';

if(cfg){
  assert(cfg.schema_version==='1.0.0','wrong Supabase contract schema version');
  assert(cfg.project?.state==='ACTIVE_HEALTHY','SCD Supabase project must be active after R34 provisioning');
  assert(cfg.project?.dedicated_project_required===true,'dedicated SCD Supabase project required');
  assert(cfg.project?.reuse_cepa_project===false,'CEPA Maglia OS Supabase project must not be reused');
  assert(cfg.project?.creation_requires_explicit_cost_confirmation===true,'Supabase project creation must remain cost-confirmed');
  assert(cfg.project?.project_id==='ndevtxxijbcnskgysdit','unexpected SCD Supabase project id');
  assert(cfg.project?.cost?.amount===0 && cfg.project?.cost?.confirmed===true,'Supabase project cost confirmation missing');
  assert(cfg.activation?.feature_flag==='FF-SUPABASE-CORE','wrong Supabase feature flag');
  assert(cfg.activation?.default_enabled===false,'Supabase core must default off before migration proof');
  assert(cfg.migration_mode==='STRANGLER_DUAL_RUN','migration must remain staged dual-run');
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

if(process.exitCode)process.exit(process.exitCode);
console.log('SCD SUPABASE CONTRACT PASS',{
  schema:cfg.schema_version,
  tables:requiredTables.length,
  projectState:cfg.project.state,
  migrationMode:cfg.migration_mode
});
