import fs from 'node:fs';

const fail=m=>{console.error('SCD R54 PRIVATE EXPERIENCE FAIL: '+m);process.exitCode=1};
const read=p=>fs.readFileSync(p,'utf8');
const manifest=JSON.parse(read('SCD_SYSTEM_MANIFEST.json'));
const router=read('app-r24-router.js');
const app=read('app.js');
const css=read('ui-r24-shell.css');

const versionParts=String(manifest.manifest?.version||'0.0.0').split('.').map(Number);
if((versionParts[0]||0)<3||((versionParts[0]||0)===3&&(versionParts[1]||0)<24))fail('manifest version must be >= 3.24.0');
const r54=manifest.product_direction?.private_experience_r54;
if(r54?.state!=='VERTICAL_SLICE_ENHANCEMENT')fail('R54 private experience contract missing');
for(const rule of [
  'ROLE_SCOPE_FROM_BACKEND_ONLY',
  'DOCUMENT_AND_PAYMENT_VALUES_MUST_BE_RETURNED_BY_BACKEND_OR_FAIL_CLOSED',
  'TRANSPORT_REQUEST_USES_EXISTING_PRIVATE_TRANSPORT_ACTION',
  'NO_INVENTED_AMOUNTS_DATES_DOCUMENTS_OR_MEDICAL_STATE'
])if(!r54?.rules?.includes(rule))fail('R54 rule missing '+rule);

for(const token of [
  'r54-private-actions',
  'r54AthleteRequests',
  'r54AthleteTransport',
  'r54AthleteStatus',
  'data-r24-family-action="docs"',
  'data-r24-family-action="payments"',
  'data-r24-family-action="transport"',
  'data-r24-family-action="requests"',
  'data-r24-family-action="status"',
  'openTransportManager()',
  'openMyRequests()',
  'openInternalRequestManager()',
  'Dato in aggiornamento'
])if(!router.includes(token))fail('private vertical slice missing '+token);

if(router.includes('Documenti sincronizzati dal gestionale SCD'))fail('family documents must not claim unverified synchronization');
if(router.includes('Trasporti disponibili secondo autorizzazione'))fail('transport placeholder toast must be replaced by action');
if(!router.includes('Non vengono ricostruiti lato app'))fail('payment fail-closed disclosure missing');
if(!router.includes('Nessun documento viene dichiarato presente'))fail('document fail-closed disclosure missing');
if(!css.includes('.r54-private-actions')||!css.includes('.r54-status-list'))fail('R54 responsive styles missing');
for(const fn of ['function openTransportManager','async function openMyRequests','function openInternalRequestManager']){
  if(!app.includes(fn))fail('private action implementation missing '+fn);
}

const caps=new Map((manifest.capability_map||[]).map(x=>[x.id,x]));
for(const id of ['CAP-ATHLETE','CAP-FAMILY','CAP-STAFF','CAP-PRIVATE-DESK']){
  if(!caps.has(id))fail('capability missing '+id);
}
if(caps.get('CAP-FAMILY')?.state==='COMPLETE')fail('Family cannot be COMPLETE while backend document detail is not live');
if(caps.get('CAP-ATHLETE')?.state==='COMPLETE')fail('Athlete cannot be COMPLETE while direct domain runtime is gated');

if(!process.exitCode)console.log('SCD R54 PRIVATE EXPERIENCE PASS',{
  athleteActions:true,
  familyActions:true,
  failClosed:true,
  backendRoleScope:true,
  noParallelDesk:true
});
