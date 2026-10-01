import fs from 'node:fs';

function fail(message){
  console.error('CRM/Communication contract FAIL:',message);
  process.exit(1);
}
function assert(cond,message){ if(!cond) fail(message); }

const bridge=fs.readFileSync(new URL('../backend_patch_R21_6_http_api.gs',import.meta.url),'utf8');
const server=fs.readFileSync(new URL('../server.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../sponsor/app.html',import.meta.url),'utf8');
const js=fs.readFileSync(new URL('../sponsor/app.js',import.meta.url),'utf8');

for(const action of [
  'private.crm.summary',
  'private.crm.detail',
  'private.communication.templates',
  'private.communication.preview',
  'private.communication.send',
  'private.communication.health'
]){
  assert(bridge.includes("case '"+action+"'"),'bridge action missing: '+action);
  assert(server.includes("'"+action+"'"),'server action missing: '+action);
}
assert(server.includes("u.pathname==='/api/sponsor/crm'"),'protected CRM route missing');
assert(server.includes("u.pathname==='/api/sponsor/communication'"),'protected communication route missing');
assert(bridge.includes("payload.confirm !== true"),'human confirmation gate missing');
assert(bridge.includes("CONTACT_POLICY"),'CRM contact policy enforcement missing');
assert(bridge.includes("SOSPESO")&&bridge.includes("NO_CONTACT"),'blocked contact policies missing');
assert(bridge.includes("Session.getEffectiveUser().getEmail()"),'effective sender verification missing');
assert(bridge.includes("DEFAULT_FROM_EMAIL"),'canonical institutional sender missing');
assert(bridge.includes("MAIL_ARCHIVIO"),'outbound audit archive missing');
assert(bridge.includes("notificationSent"),'public request mail delivery state missing');
assert(bridge.includes("remainingDailyQuota"),'mail quota diagnostics missing');
assert(server.includes("Il codice temporaneo non è stato inviato"),'OTP false-success guard missing');
assert(server.includes("UPSTREAM_WRITE_TIMEOUT_MS"),'write timeout separation missing');
assert(bridge.includes("TOUCHPOINTS_MASTER"),'CRM touchpoint audit missing');
assert(bridge.includes("SPONSOR_CONTRATTI"),'CRM agreement registry missing');
assert(js.includes("data.agreements"),'CRM 360 agreement UI missing');
assert(bridge.includes("SOCIETA_PROFILE"),'canonical society profile missing');
assert(bridge.includes("FIRME_RUOLI"),'role/person signature registry missing');
assert(bridge.includes("Firma personale non autorizzata: identita account/persona non coincidente."),'personal signature identity binding missing');
assert(bridge.includes("Firma di ruolo non autorizzata per l account autenticato."),'role signature account binding missing');
assert(bridge.includes("EMAIL_TEMPLATE"),'email template registry missing');
assert(bridge.includes("profile.LEGAL_NAME || profile.DISPLAY_NAME"),'legal institutional identity precedence missing');
assert(html.includes('id="crmEmailModal"'),'institutional email composer UI missing');
assert(html.includes('id="crmEmailConfirm"'),'explicit confirmation checkbox missing');
assert(js.includes("communicationApi('preview'"),'email preview flow missing');
assert(js.includes("communicationApi('send'"),'email send flow missing');
assert(js.includes('externalContactBlocked'),'blocked stakeholder UI enforcement missing');

console.log('CRM/Communication contract PASS');
