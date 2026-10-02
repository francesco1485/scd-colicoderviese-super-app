import fs from 'node:fs';

function fail(m){console.error('Sponsor vision contract FAIL:',m);process.exit(1)}
function assert(c,m){if(!c)fail(m)}

const pub=fs.readFileSync(new URL('../sponsor/index.html',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../sponsor/app.html',import.meta.url),'utf8');
const js=fs.readFileSync(new URL('../sponsor/app.js',import.meta.url),'utf8');
const pubJs=fs.readFileSync(new URL('../sponsor/sponsor.js',import.meta.url),'utf8');

for(const token of [
  'LEDWall SCD',
  'Divise sublimatiche',
  'Striscioni & cartellonistica',
  'Gazebo & Partner Corner',
  'Strutture brandizzate',
  'Tornei brandizzati',
  'Mascotte Partner',
  'Pixellot & Match Content',
  'Merchandising SCD',
  'Carta Tifoso',
  'Carta Tesserato',
  'Web App Partner Hub'
]) assert(pub.includes(token),'public sponsor concept missing: '+token);

for(const token of [
  'Catalogo sponsorizzazioni',
  'Card, merchandising & convenzioni',
  'LED, Video & Pixellot',
  'Pubblico → Community → Partner → Area riservata'
]) assert(app.includes(token),'reserved-area concept missing: '+token);

assert(pub.includes('PRONTA PER FORMALIZZAZIONE'),'convention formalization status missing');
assert(pub.includes('IN ATTIVAZIONE'),'convention activation status missing');

for(const token of [
  'GGlass',
  'TA Cleaning',
  'AGC Medical',
  'Preview video: 1920×1080 · 25 fps · 20 sec',
  'Non un cartellone. Un palinsesto.',
  'SCD Supporter Card',
  'SCD Tesserato Card',
  'La passione che ti porta più vicino.',
  'Dentro la squadra. Dentro i vantaggi.',
  'Più vicini al club. Più valore sul territorio.'
]) assert(pub.includes(token),'R47 commercial experience missing: '+token);

assert(pub.includes('I loghi ufficiali saranno mostrati solo dopo caricamento'),'official logo governance missing');
for(const token of [
  'IL CENTRO SPORTIVO CHE CRESCE',
  'INIT-CENTRO-RICARICA-EV',
  'INIT-CENTRO-FITNESS-KOMPAN',
  'INIT-CENTRO-PLAY-KOMPAN',
  'INIT-CENTRO-GAZEBO-NUOVO',
  'INIT-CENTRO-TRIBUNA-C2',
  'INIT-CENTRO-INFERMERIA',
  'INIT-CENTRO-SICUREZZA-VERISURE',
  'INIT-CENTRO-PERCORSO-ACCESSIBILE',
  'INIT-CENTRO-AREA-SABBIA',
  'INIT-FONDO-SOLIDALE',
  'Fondo Solidale SCD',
  'id="donationConsole"',
  'id="solidarityIntentForm"',
  'id="donationReport"',
  'Rendiconto pubblico in attesa di una fonte ufficiale verificata',
  'data-donation-amount="25"',
  'Nessun elenco pubblico donatori',
  'agevolazioni fiscali dipendono dalla normativa applicabile',
  'name="project"'
]) assert(pub.includes(token),'R50.4 Center development public surface missing: '+token);
assert(pub.includes('KOMPAN Italia è il produttore in confronto tecnico'),'KOMPAN verified supplier/product status missing');
assert(pub.includes('Nessuna sponsorizzazione è implicita.'),'KOMPAN must not be represented as acquired sponsor');
assert(pub.includes('sistema Verisure già contrattualizzato'),'Verisure contracted supplier status missing');
assert(pub.includes('Sono già presenti preventivi da confrontare'),'Tribuna quote state missing');
assert(pubJs.includes('[data-project-interest]'),'Center development lead interaction missing');
for(const token of [
  'SCD DEVELOPMENT PIPELINE',
  'id="developmentKpi"',
  'id="developmentSearch"',
  'id="developmentScope"',
  'id="developmentInspector"'
]) assert(app.includes(token),'R50.8 Development workspace missing: '+token);
for(const token of [
  "fetch('/api/sponsor/development'",
  'developmentState',
  'loadDevelopment',
  'renderDevelopmentInspector',
  "if(name==='iniziative')loadDevelopment()",
  'PREVENTIVI RICEVUTI · DA RICONCILIARE',
  'CASSETTO STRATEGICO',
  'NON VERIFICATI',
  'SNAPSHOT VERIFICATO'
]) assert(js.includes(token),'R51.1 Development interaction missing: '+token);
assert(pubJs.includes('/api/public/donation-config'),'Solidarity Fund config endpoint missing');
assert(pubJs.includes('/api/public/donation-intent'),'Solidarity Fund intent endpoint missing');
assert(pubJs.includes('loadDonationConfig'),'Solidarity Fund config loader missing');
assert(pubJs.includes('syncDonationAmount'),'Solidarity Fund amount synchronization missing');
assert(pubJs.includes("$('[data-donation-amount]').forEach"),'Solidarity Fund amount controls must use multi-selector helper');
assert(!/(^|[^$])\$\('\[data-donation-amount\]'\)\.forEach/m.test(pubJs),'single selector incorrectly used for donation amount collection');
assert(js.includes("SOSPESA · NON INVIARE"),'suspended prospect visibility missing');
assert(js.includes("Pixellot & Match Content"),'internal video asset missing');
assert(js.includes("Partner Hub Web App"),'internal web app partner asset missing');
assert(pub.includes('sponsor-wall-experience'),'public Sponsor Wall experience missing');
assert(pub.includes('data-wall-mode="INTERVISTE"'),'Sponsor Wall interview mode missing');
assert(pub.includes('data-wall-mode="EVENTI"'),'Sponsor Wall event mode missing');
assert(pub.includes('data-wall-mode="WEB"'),'Sponsor Wall web mode missing');
assert(pubJs.includes('setSponsorWallMode'),'Sponsor Wall interaction missing');

for(const token of [
  'SCD Partner OS',
  'view-partnerhub',
  'view-campaigns',
  'view-mediahub',
  'Partner Hub',
  'Campaign Studio',
  'Media Hub',
  'COLICO · LAKE COMO'
]) assert(app.includes(token),'Partner OS interactive module missing: '+token);
assert(js.includes('renderPartnerHub'),'Partner Hub renderer missing');
assert(js.includes('renderCampaignStudio'),'Campaign Studio renderer missing');
assert(js.includes('renderSponsorWall'),'Sponsor Wall renderer missing');


for(const token of [
  'SCD CLUB EXPERIENCE · ALTO LARIO / LAGO DI COMO',
  'Standard internazionale. Identità profondamente locale.',
  'data-club-module="partner"',
  'data-club-module="led"',
  'data-club-module="media"',
  'data-club-module="community"',
  'data-club-module="events"',
  'data-club-module="territory"',
  'BRIEF',
  'RINNOVO'
]) assert(pub.includes(token),'R48 public club system missing: '+token);

for(const token of [
  'Club Standard 360°',
  'Creative Factory',
  'SPONSOR ACTIVATION DESIGN',
  'id="activationSponsor"',
  'id="partnerWallGrid"',
  'SCD BENEFIT NETWORK',
  'SCD Supporter Card',
  'SCD Tesserato Card'
]) assert(app.includes(token),'R48 reserved club system missing: '+token);

for(const token of [
  'const activationCopy=',
  'renderActivationStudio',
  'renderPartnerWall',
  'scd_activation_scenario_v1'
]) assert(js.includes(token),'R48 app interaction missing: '+token);


for(const token of [
  'view-territory',
  'SCD TERRITORY HUB',
  'Colico non è lo sfondo. È parte del prodotto.',
  'id="partnerHubJourney"',
  'PARTNER JOURNEY',
  'Crea attivazione'
]) assert(app.includes(token),'R49 world club structure missing: '+token);

for(const token of [
  'const territoryModules=',
  'renderTerritoryHub',
  'partnerJourneyFor',
  'campaignPreview',
  'campaignAssetMap'
]) assert(js.includes(token),'R49 world club interaction missing: '+token);

assert(js.includes("$$('.view').forEach"),'multi-view selector must use $$ helper');
assert(js.includes("$$('[data-view]').forEach"),'multi-action selector must use $$ helper');
assert(js.includes("$$('[data-campaign-filter]').forEach"),'campaign filters must use $$ helper');
assert(!/(^|[^$])\$\('\[data-view\]'\)\.forEach/m.test(js),'single selector incorrectly used for multiple view actions');
for(const token of [
  'id="homeOperationalFocus"',
  'id="focusSourceState"',
  'id="focusKpis"',
  'id="focusActions"',
  'id="focusAgenda"',
  'Da fare adesso'
]) assert(app.includes(token),'R53.1 Operational Focus UI missing: '+token);
for(const token of [
  'function operationalMeta',
  'function operationalProjects',
  'function renderOperationalFocus',
  'function loadOperationalFocus',
  'function prepareAgendaForProject',
  "if(name==='home')loadOperationalFocus()",
  'Riconcilia documenti, fornitore e importi verificati',
  'Programma il prossimo sopralluogo o confronto tecnico'
]) assert(js.includes(token),'R53.1 Operational Focus interaction missing: '+token);
assert(js.includes("$('[data-focus-project]').forEach"),'Operational Focus project controls must use $ helper');
assert(js.includes("$('[data-focus-agenda]').forEach"),'Operational Focus agenda controls must use $ helper');
assert(!/(^|[^$])\$\('\[data-focus-project\]'\)\.forEach/m.test(js),'single selector incorrectly used for Operational Focus project actions');
assert(js.includes("$('[data-motion-id]').forEach"),'motion profile controls must use $ helper');
assert(!/(^|[^$])\$\('\[data-motion-id\]'\)\.forEach/m.test(js),'single selector incorrectly used for motion profile collection');


assert(js.includes('function partnerHubRecords()'),'Partner Hub CRM synchronization missing');
assert(js.includes("source:'CRM'"),'Partner Hub CRM source marker missing');
assert(js.includes('syncActivationPartnersFromCrm'),'Activation Studio CRM synchronization missing');
assert(js.includes('if(s.crmId){openView(\'crm\');openCrmProfile(s.crmId)}'),'Partner Hub CRM drill-down missing');


assert(app.includes('id="partnerHubEvidence"'),'Partner Hub evidence bar missing');
assert(js.includes('async function hydratePartnerHubDetail'),'Partner Hub CRM detail hydration missing');
assert(js.includes('data.agreements'),'Partner Hub agreement hydration missing');
assert(js.includes('data.touchpoints'),'Partner Hub touchpoint hydration missing');

assert(pubJs.includes('const $$=s=>Array.from(document.querySelectorAll(s));'),'public multi-selector helper missing');
assert(!pubJs.includes('const $=s=>Array.from(document.querySelectorAll(s));'),'public selector helper duplicated');


for(const token of [
  'Creative Factory',
  'id="activationHeadline"',
  'id="activationMessage"',
  'id="activationCta"',
  'id="activationFormat"',
  'id="activationTheme"',
  'id="activationLogoState"',
  'data-creative-preset="territory"',
  'id="activationCopyBrief"',
  'id="activationExport"',
  'id="activationBrandName"',
  'data-preview-mode="LED"'
]) assert(app.includes(token),'R50 Creative Factory structure missing: '+token);

for(const token of [
  'activationPayload',
  'activationBriefText',
  'renderActivationBrief',
  'applyCreativePreset',
  'downloadActivationJson',
  'copyActivationBrief',
  "scd_activation_scenario_v2"
]) assert(js.includes(token),'R50 Creative Factory interaction missing: '+token);

console.log('Sponsor vision contract PASS');
