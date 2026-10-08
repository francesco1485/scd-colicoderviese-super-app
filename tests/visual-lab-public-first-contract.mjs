import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const lab=read('docs/visual-lab/gestionale-foundation.html');
const css=read('docs/visual-lab/public-first-review.css');
const js=read('docs/visual-lab/gestionale-foundation.js');
const directives=JSON.parse(read('config/user-directives.v1.json'));
const manifest=JSON.parse(read('SCD_SYSTEM_MANIFEST.json'));

const publicStart=lab.indexOf('id="T01_PUBLIC_EDITORIAL" data-scd-template="T01_PUBLIC_EDITORIAL"');
const privateStart=lab.indexOf('<section class="template" id="T02_OPERATIONAL_HOME"');
assert(publicStart>=0&&privateStart>publicStart,'public T01 must precede private T02');
const publicSection=lab.slice(publicStart,privateStart);
assert(publicSection.includes('SCD UNIVERSE'),'public template must identify SCD Universe');
assert(publicSection.includes('data-public-access'),'public template must expose reserved-area entry');
assert(publicSection.includes('id="public-week"'),'public homepage must lead to the week');
assert(publicSection.includes('id="public-news"'),'public homepage must include newsroom');
assert(publicSection.includes('id="public-club"'),'public homepage must include club identity');
assert(publicSection.includes('id="public-partners"'),'public homepage must include partner section');
assert(!publicSection.includes('r58/manager'),'public UI must not link directly to internal management');
assert(!publicSection.includes('data-lab-select="T02_OPERATIONAL_HOME"'),'public UI must not bypass lab private gate');
assert(!publicSection.includes('type="password"'),'public UI must not expose operational authentication credentials');
assert(/<dialog\b[^>]*id="labReservedDialog"/.test(publicSection),'public reserved access must open a nonauthenticating preview dialog');
assert(/<section class="template" id="T02_OPERATIONAL_HOME"[^>]*\bhidden\b/.test(lab),'private template must be hidden on first load');
for (const id of ['T03_DOMAIN_HUB','T04_ENTITY_DETAIL','T05_SPATIAL_WORKSPACE','T06_COMMUNICATION_HUB','T07_DATA_FINANCE','T08_PROJECT_DEVELOPMENT']){
  assert(new RegExp('<section class="template" id="'+id+'"[^>]*\\bhidden\\b').test(lab),id+' must be a hidden design-only preview on first load');
}
assert(lab.includes('data-lab-select="T01_PUBLIC_EDITORIAL"'),'review toolbar needs public-first active tab');
assert(lab.includes('data-lab-select="T02_OPERATIONAL_HOME"'),'review toolbar needs clearly separate private design tab');
assert(lab.includes('public-first-review.css'),'Visual Lab must load isolated review styles');
assert(js.includes('activateLabTemplate'),'lab must expose internal templates through inspector, not public links');
assert(js.includes('showModal'),'public reserved button must explain authentication, not fake it');
assert(js.includes('labReservedDialog'),'reserved explanation must be wired');
assert(css.includes('[hidden]'),'hidden panels must stay hidden even with card display rules');
assert(css.includes('@media (max-width: 700px)'),'mobile public front-door layout required');
assert(css.includes('@media (min-width: 1200px)'),'wide desktop visual treatment required');
assert(css.includes('prefers-reduced-motion'),'reduced-motion fallback required');
assert(css.includes(':focus-visible'),'keyboard focus must remain visible');

const home=(manifest.product?.core_experiences||[]).find(x=>x.id==='HOME_PUBLIC');
const staff=(manifest.product?.core_experiences||[]).find(x=>x.id==='STAFF_DIRECTION');
assert(home&&staff,'canonical public and staff experiences must remain separate');
assert(home.audience.includes('PUBLIC'),'home must remain publicly accessible');
assert(!staff.audience.includes('PUBLIC'),'staff must not be public');
assert(directives.directives.some(x=>x.id==='UD-013'&&x.rules?.includes('SCD_UNIVERSE_IS_ONLY_PUBLIC_FRONT_DOOR')),'explicit user decision must be canonical');
assert(directives.directives.find(x=>x.id==='UD-013').rules.includes('PRIVATE_GESTIONALE_ONLY_AFTER_AUTHORIZED_RESERVED_ACCESS'),'private access decision missing');

console.log('SCD PUBLIC FIRST VISUAL LAB CONTRACT PASS', {
  public:'T01_PUBLIC_EDITORIAL',
  reserved:'T02_OPERATIONAL_HOME',
  graphicApproval:'PENDING_VISUAL_APPROVAL',
  publication:'BLOCKED',
  existingMacroTemplates:8
});
