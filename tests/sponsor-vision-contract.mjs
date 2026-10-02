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

for(const token of [
  'function ensureSponsorOperationsSurface()',
  'data-view="azioni"',
  'id="view-azioni"',
  'id="homeActionQueue"',
  'id="actionQueueGrid"',
  'function commercialActions()',
  'function renderActionQueue()',
  '...suppliers.map',
  '...commercialInitiatives.map'
]) assert(js.includes(token),'Sponsor Operations runtime missing: '+token);

assert(js.includes("const names=sponsors.map(s=>s.name);"),'current sponsor strip must contain current sponsor records only');
const sponsorStripRuntime=js.slice(js.indexOf('function renderSponsorStrip()'),js.indexOf('function homeContracts()'));
for(const prospect of ['IPERAL','HDI MAGLIA','DELLOCA','CARCANO'])assert(!sponsorStripRuntime.includes(prospect),'prospect leaked into current sponsor strip: '+prospect);
const contractRuntime=js.slice(js.indexOf('function homeContracts()'),js.indexOf('function homeProposals()'));
assert(!/status-badge">Attivo/.test(contractRuntime),'contract status must not be hardcoded as Attivo');
assert(contractRuntime.includes('esc(s.status)'),'documented sponsor relationship status missing');

console.log('Sponsor vision contract PASS');
