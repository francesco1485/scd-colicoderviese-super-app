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
const developmentSnapshot=JSON.parse(fs.readFileSync(new URL('../config/sponsor-development.snapshot.json',import.meta.url),'utf8'));

for(const action of [
  'private.crm.summary',
  'private.crm.detail',
  'private.communication.templates',
  'private.communication.preview',
  'private.communication.send',
  'private.communication.health',
  'private.agenda.summary',
  'private.agenda.create',
  'private.development.summary'
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
assert(bridge.includes("options.bcc = actorCopy"),'authenticated actor private BCC copy missing');
assert(bridge.includes("internalCopyTo"),'mail preview actor copy disclosure missing');
assert(server.includes("u.pathname==='/api/sponsor/agenda'"),'protected Agenda SCD route missing');
assert(bridge.includes("CalendarApp.getCalendarById"),'Google Calendar write bridge missing');
assert(bridge.includes("r216AgendaEligibleUsers_"),'Agenda authorized user filter missing');
assert(bridge.includes("UTENTI"),'Agenda must resolve invitees from canonical users');
assert(bridge.includes("MailApp.sendEmail(ctx.summaryEmail"),'Agenda institutional summary email missing');
assert(bridge.includes("event.deleteEvent()"),'Agenda fail-closed rollback when summary mail fails');
assert(html.includes('id="agendaForm"'),'Agenda SCD builder UI missing');
assert(html.includes('id="agendaInvitees"'),'Agenda authorized invitee UI missing');
assert(js.includes("fetch('/api/sponsor/agenda'"),'Agenda SCD frontend API missing');
assert(js.includes("if(name==='eventi')loadAgenda()"),'Agenda lazy loading missing');
assert(server.includes("u.pathname==='/api/sponsor/development'"),'protected Development route missing');
assert(bridge.includes("r216CrmTable_('INIZIATIVE_COMMERCIALI')"),'Development canonical initiatives source missing');
assert(bridge.includes("r216CrmTable_('FORNITORI_SPONSOR_RADAR')"),'Development supplier radar source missing');
assert(bridge.includes("r216CrmTable_('STAKEHOLDERS_MASTER')"),'Development stakeholder source missing');
assert(bridge.includes("sourceMode:'LIVE_MASTER'"),'Development source mode contract missing');
assert(bridge.includes("futureDrawerIsNotImminent:true"),'Development drawer governance missing');
assert(server.includes('SPONSOR_DEVELOPMENT_SNAPSHOT'),'Development verified snapshot fallback missing');
assert(server.includes("snap.sourceMode==='SNAPSHOT_VERIFIED'"),'Development snapshot mode validation missing');
assert(server.includes("snap.source?.spreadsheetId==='1jb5Jt1ZYzJA-3oQd85AmwVhAoFQpBPfcsy4HupBzDFA'"),'Development snapshot canonical source validation missing');
assert(developmentSnapshot.schema==='SCD_SPONSOR_DEVELOPMENT_SNAPSHOT_V1','Development snapshot schema mismatch');
assert(developmentSnapshot.sourceMode==='SNAPSHOT_VERIFIED','Development snapshot must not present as live');
assert(Array.isArray(developmentSnapshot.rows)&&developmentSnapshot.rows.length>=18,'Development snapshot canonical rows missing');
assert(html.includes('id="developmentInspector"'),'Development inspector UI missing');
assert(js.includes("fetch('/api/sponsor/development'"),'Development frontend API missing');
assert(js.includes("developmentState.sourceMode==='SNAPSHOT_VERIFIED'"),'Development snapshot disclosure label missing');
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
