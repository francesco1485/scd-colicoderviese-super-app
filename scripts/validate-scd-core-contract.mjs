import fs from 'node:fs';

function ok(condition,message){if(!condition)throw new Error(message)}
const html=fs.readFileSync('index.html','utf8');
const js=fs.readFileSync('scd-ng.js','utf8');
const css=fs.readFileSync('scd-core-control-room.css','utf8');
const server=fs.readFileSync('server.js','utf8');
const backend=fs.readFileSync('backend_patch_R21_6_http_api.gs','utf8');
const dataFabric=fs.readFileSync('backend_patch_R25_data_fabric.gs','utf8');

ok(html.includes('id="coreControlRoom"'),'Direction Control Room mount missing');
ok(html.includes('./scd-core-control-room.css?v=1.0.0'),'Control Room stylesheet not linked');
ok(html.includes('./lib/scd-core-control-room.js?v=1.0.0'),'Control Room engine not loaded');
for(const lane of ['OGGI','PRIORITÀ','DA FARE','DA APPROVARE','SCADENZE','CAMBIAMENTI']){
  ok(js.includes(lane),'missing Control Room lane '+lane);
}
for(const action of ['private.agenda.summary','direction.evolution','direction.diagnostics','direction.datafabric.status','direction.datafabric.actions']){
  ok(js.includes("'"+action+"'"),'frontend missing source action '+action);
  ok(server.includes("'"+action+"'"),'server whitelist missing source action '+action);
  ok(backend.includes("case '"+action+"'"),'Apps Script bridge missing source action '+action);
}
ok(dataFabric.includes('function r57DataFabricActions_'),'mail action queue backend reader missing');
ok(dataFabric.includes("source:'MAIL_OPERATIONS_SHEET/18_ACTION_QUEUE'"),'mail action provenance missing');
ok(js.includes("coreDirectionUser()"),'Control Room must remain role-gated');
ok(js.includes("state.privateData?.permissions?.direction===true")||js.includes("data?.permissions?.direction===true"),'Direction permission check missing');
ok(js.includes("if(['DASHBOARD','APPROVAZIONI','SCADENZE'].includes(module))"),'CORE operational modules must route to Control Room');
ok(js.includes("if(['CRM','CONTRATTI','REPORT'].includes(module))"),'commercial boundary must remain separate');
ok(!js.includes("if(['CRM','CONTRATTI','REPORT','APPROVAZIONI'].includes(module))"),'approvals must not be routed to Sponsor Platform');
ok(css.includes('@media(max-width:700px)'),'mobile Control Room composition missing');
ok(css.includes('prefers-reduced-motion:reduce'),'reduced-motion support missing');
ok(css.includes('.core-item-link'),'mail source link style missing');
ok(js.includes('Apri fonte Gmail'),'mail action source link missing');

await import('../lib/scd-core-control-room.js');
ok(globalThis.ScdCoreControlRoom?.build,'Control Room engine is not executable');
await import('../tests/scd-core-control-room-contract.mjs');

console.log('SCD CORE CONTRACT PASS');
