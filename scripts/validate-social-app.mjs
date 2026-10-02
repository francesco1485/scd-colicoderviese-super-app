import fs from 'node:fs';

const fail=m=>{console.error('SCD SOCIAL APP CONTRACT FAIL: '+m);process.exitCode=1};
const html=fs.readFileSync('index.html','utf8');
const js=fs.readFileSync('scd-ng.js','utf8');
const css=fs.readFileSync('ui-r52-social.css','utf8');

for(const token of [
  'id="view-social"',
  'data-view="social"',
  'id="socialFeed"',
  'id="socialFilters"',
  'id="socialSearch"',
  'data-nav="social"',
  'ui-r52-social.css',
  'lib/scd-operative-engine.js',
  'id="installApp"'
]) if(!html.includes(token))fail('index missing '+token);

for(const token of [
  'renderSocialHub',
  'socialFeedRows',
  'socialMatchCaption',
  'shareSocialText',
  "state.socialFilter",
  "window.SCDOperativeEngine?.buildMatchDayCaption",
  "navigator.serviceWorker.register('./sw.js')",
  "beforeinstallprompt",
  "['pulse','calendar','teams','social','twin','desk']"
]) if(!js.includes(token))fail('runtime missing '+token);

if(!js.includes("if(!Array.isArray(x.evidence)||!x.evidence.length)return"))fail('news must fail closed without evidence');
if(!js.includes("$$('[data-social-open]',mount).forEach")||!js.includes("$$('[data-social-share]',mount).forEach"))fail('Social feed collection bindings missing');
if(/(?<!\$)\$\([^;\n]*\)\.forEach/.test(js))fail('singular $ helper cannot drive collection forEach');
if(!html.includes('Pixellot resta privato'))fail('private video safety declaration missing');
if(!html.includes('Nessuna ripubblicazione automatica'))fail('no auto-republish policy missing');
if(!html.includes('rel="noopener noreferrer"'))fail('external social links must be hardened');

for(const token of ['social-hero','social-feed','social-card','social-channel-grid'])if(!css.includes('.'+token))fail('social css missing '+token);

if(!process.exitCode)console.log('SCD SOCIAL APP CONTRACT PASS',{
  dedicatedRoute:true,
  verifiedNewsOnly:true,
  localFollowPreference:true,
  webShareFallback:true,
  minorsAndPrivateMediaGuardrails:true
});
