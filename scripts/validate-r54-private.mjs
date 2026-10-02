import fs from 'node:fs';

const fail=m=>{console.error('SCD R54 PRIVATE EXPERIENCE FAIL: '+m);process.exitCode=1};
const read=p=>fs.readFileSync(p,'utf8');
const manifest=JSON.parse(read('SCD_SYSTEM_MANIFEST.json'));
const runtime=read('scd-ng.js');
const css=read('scd-ng.css');
const html=read('index.html');
const sw=read('sw.js');

const versionParts=String(manifest.manifest?.version||'0.0.0').split('.').map(Number);
if((versionParts[0]||0)<3||((versionParts[0]||0)===3&&(versionParts[1]||0)<24))fail('manifest version must be >= 3.24.0');

const r54=manifest.product_direction?.private_experience_r54;
if(r54?.state!=='VERTICAL_SLICE_ENHANCEMENT')fail('R54 private experience contract missing');
for(const rule of [
  'NO_NEW_PARALLEL_PRIVATE_DESK',
  'ROLE_SCOPE_FROM_BACKEND_ONLY',
  'PROFILE_DATA_ONLY_FOR_AUTHORIZED_LINKED_PERSON',
  'DOCUMENT_AND_PAYMENT_VALUES_MUST_BE_RETURNED_BY_BACKEND_OR_FAIL_CLOSED',
  'TRANSPORT_REQUEST_USES_EXISTING_PRIVATE_TRANSPORT_ACTION',
  'REQUESTS_USE_EXISTING_ACCOUNT_REQUESTS_ACTION',
  'NO_INVENTED_AMOUNTS_DATES_DOCUMENTS_OR_MEDICAL_STATE'
])if(!r54?.rules?.includes(rule))fail('R54 rule missing '+rule);

for(const token of [
  'function openPrivatePeopleHub',
  'function openPrivateProfileStatus',
  'function openPrivateRequestForm',
  'async function openPrivateRequests',
  'function openPrivateTransport',
  'function openPrivateAttendance',
  'function openPrivateConvocations',
  'function openPrivateTeamMessage',
  "privatePost('account.requests'",
  "privatePost('private.request.submit'",
  "privatePost('private.transport.request'",
  "privatePost('private.attendance.get'",
  "privatePost('private.attendance.save'",
  "privatePost('private.convocation.create'",
  "privatePost('private.convocation.reply'",
  "privatePost('private.message.send'",
  "if(module==='TESSERATI'){openPrivatePeopleHub();return}",
  "if(module==='PULMINI'){openPrivateTransport",
  "if(module==='RICHIESTE'){openPrivateRequests();return}",
  "if(module==='PRESENZE'){openPrivateAttendance();return}",
  "if(module==='CONVOCAZIONI'){openPrivateConvocations();return}",
  'Nessun documento viene dichiarato presente',
  'Non vengono ricostruiti lato app',
  'Dato in aggiornamento'
])if(!runtime.includes(token))fail('active Private Desk missing '+token);

if(runtime.includes('Documenti sincronizzati dal gestionale SCD'))fail('active Private Desk must not claim unverified document synchronization');
if(runtime.includes('Trasporti disponibili secondo autorizzazione'))fail('active Private Desk must not use placeholder transport toast');
if((runtime.match(/function privateProfileName\(/g)||[]).length!==1)fail('duplicate privateProfileName implementation detected');
if((runtime.match(/function openPrivateProfileStatus\(/g)||[]).length!==1)fail('duplicate private profile status implementation detected');

for(const token of [
  '.r54-people-hub',
  '.r54-live-status-list',
  '.r54-live-callup',
  '.r54-profile-actions',
  '.r54-private-form',
  '.r54-request-list'
])if(!css.includes(token))fail('active R54 responsive style missing '+token);

if(!html.includes('./scd-ng.css?v=0.6.1')||!html.includes('./scd-ng.js?v=0.7.1'))fail('R54 active assets cache bust missing');
if(!sw.includes("scd-nextgen-0.7.1-r54")||!sw.includes('./scd-ng.css?v=0.6.1')||!sw.includes('./scd-ng.js?v=0.7.1'))fail('R54 PWA cache contract missing');

const caps=new Map((manifest.capability_map||[]).map(x=>[x.id,x]));
for(const id of ['CAP-ATHLETE','CAP-FAMILY','CAP-STAFF','CAP-PRIVATE-DESK']){
  if(!caps.has(id))fail('capability missing '+id);
}
if(caps.get('CAP-FAMILY')?.state==='COMPLETE')fail('Family cannot be COMPLETE while backend document detail is not live');
if(caps.get('CAP-ATHLETE')?.state==='COMPLETE')fail('Athlete cannot be COMPLETE while Supabase private runtime remains gated');

if(!process.exitCode)console.log('SCD R54 PRIVATE EXPERIENCE PASS',{
  activePrivateDesk:true,
  athleteFamilyProfiles:true,
  staffActions:true,
  failClosed:true,
  backendRoleScope:true,
  pwaCacheUpdated:true,
  noParallelDesk:true
});
