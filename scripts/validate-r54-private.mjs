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
if(r54?.release!=='R54'||r54?.state!=='VERTICAL_SLICE_ENHANCEMENT')fail('R54 private experience contract missing');
for(const rule of [
  'ROLE_SCOPE_FROM_BACKEND_ONLY',
  'DOCUMENT_AND_PAYMENT_VALUES_MUST_BE_RETURNED_BY_BACKEND_OR_FAIL_CLOSED',
  'TRANSPORT_REQUEST_USES_EXISTING_PRIVATE_TRANSPORT_ACTION',
  'NO_INVENTED_AMOUNTS_DATES_DOCUMENTS_OR_MEDICAL_STATE'
])if(!r54?.rules?.includes(rule))fail('R54 rule missing '+rule);

for(const token of [
  'function openPrivatePeopleHub',
  'function openPrivateProfileStatus',
  'function openPrivateTransport',
  'async function openPrivateRequests',
  'function openPrivateRequestForm',
  'function openPrivateAttendance',
  'function openPrivateConvocations',
  'function openPrivateTeamMessage',
  'data-r54-action="documents"',
  'data-r54-action="payments"',
  'data-r54-action="transport"',
  'data-r54-action="requests"',
  'data-r54-action="status"',
  'data-r54-callup="PRESENTE"',
  'data-r54-callup="ASSENTE"',
  "if(module==='TESSERATI'){openPrivatePeopleHub();return}",
  "if(module==='PULMINI'){openPrivateTransport();return}",
  "if(module==='RICHIESTE'){openPrivateRequests();return}",
  "if(module==='PRESENZE'){openPrivateAttendance();return}",
  "if(module==='CONVOCAZIONI'){openPrivateConvocations();return}"
])if(!runtime.includes(token))fail('live Private Desk missing '+token);

for(const action of [
  'private.transport.request','account.requests','private.attendance.get','private.attendance.save',
  'private.convocation.create','private.convocation.reply','private.message.send','private.request.submit'
])if(!runtime.includes(action))fail('live private action missing '+action);

if(!runtime.includes('Nessun documento viene dichiarato presente'))fail('document fail-closed disclosure missing');
if(!runtime.includes('Non vengono ricostruiti lato app'))fail('payment fail-closed disclosure missing');
if(runtime.includes('Documenti sincronizzati dal gestionale SCD'))fail('Private Desk must not claim unverified document synchronization');
if(runtime.includes('Trasporti disponibili secondo autorizzazione'))fail('placeholder transport toast must not remain in live runtime');

for(const token of [
  '.r54-people-hub','.r54-live-status-list','.r54-private-form','.r54-live-callup',
  '.r54-profile-actions','.r54-attendance-list','.r54-player-checks'
])if(!css.includes(token))fail('R54 responsive style missing '+token);

if(!html.includes('./scd-ng.css?v=0.6.1')||!html.includes('./scd-ng.js?v=0.7.1'))fail('R54 active assets cache bust missing');
if(!sw.includes("const CACHE='scd-nextgen-0.7.1-r54'")||!sw.includes('./scd-ng.js?v=0.7.1'))fail('R54 PWA cache contract missing');

const caps=new Map((manifest.capability_map||[]).map(x=>[x.id,x]));
for(const id of ['CAP-ATHLETE','CAP-FAMILY','CAP-STAFF','CAP-PRIVATE-DESK'])if(!caps.has(id))fail('capability missing '+id);
if(caps.get('CAP-FAMILY')?.state==='COMPLETE')fail('Family cannot be COMPLETE while detailed document backend is not live');
if(caps.get('CAP-ATHLETE')?.state==='COMPLETE')fail('Athlete cannot be COMPLETE while Supabase private cutover is gated');

if(!process.exitCode)console.log('SCD R54 PRIVATE EXPERIENCE PASS',{
  liveNovaPrivateDesk:true,
  athleteFamilyProfiles:true,
  staffActions:true,
  failClosed:true,
  backendRoleScope:true,
  noParallelDesk:true
});
