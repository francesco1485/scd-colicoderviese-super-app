import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=new URL('../',import.meta.url);
const load=path=>fs.readFileSync(new URL(path,base),'utf8');
const html=load('docs/visual-lab/scd-ecosistema.html');
const css=load('docs/visual-lab/scd-ecosistema.css');
const js=load('docs/visual-lab/scd-ecosistema.js');
const directives=JSON.parse(load('config/user-directives.v1.json'));

for(const id of ['universe','sponsor','gestionale']){
  assert(html.includes('data-platform="'+id+'"'),'missing real platform panel '+id);
  assert(html.includes('data-switch="'+id+'"'),'missing usable navigation '+id);
}
assert(html.includes('../../assets/logo-scd.png'),'use locked official club identity, not generated crest');
assert(html.includes('../../assets/sky.webp'),'use locked official mascot source, not generated mascot');
assert(css.includes('../../assets/hero-colico.webp'),'reuse official territorial image through CSS, not a fake in-page photo');
assert((html.match(/id="assistantDialog"/g)||[]).length===1,'one shared assistant shell only');
assert(html.includes('id="assistantMessages"'),'shared assistant message stream missing');
assert(html.includes('id="assistantForm"'),'shared assistant input missing');
assert(html.includes('data-assistant-open'),'shared assistant must be accessible from every platform');
assert(!/<input[^>]*type=["']password/i.test(html),'no fake password prompt in visual review');
assert(!/fetch\s*\(|XMLHttpRequest\s*\(|localStorage|sessionStorage/.test(js),'visual lab must not call APIs or persist personal data');
assert(!/innerHTML\s*=/.test(js),'user text must not be rendered as HTML');
assert(js.includes('function setPlatform'),'navigation must change real visible view');
assert(js.includes('function respondTo'),'shared FAQ prototype must work for input');
assert(js.includes('aria-current'),'platform nav must expose active state to assistive tech');
assert(js.includes('scrollIntoView'),'switch must reset scroll for mobile navigation');
assert(css.includes('@media (max-width: 740px)'),'mobile layout missing');
assert(css.includes('prefers-reduced-motion'),'reduced motion missing');
assert(css.includes(':focus-visible'),'keyboard focus missing');
assert(css.includes('min-height:44px'),'touch targets missing');
assert(css.includes('var(--scd-yellow)'),'consistent shared palette missing');
assert(!/\b(?:256 atleti|12 squadre|256K|€ 18\.200)\b/i.test(html),'no invented operational statistics');
assert(html.includes('DATI NON COLLEGATI'),'explicit source limitation must be visible');
assert(directives.directives.some(x=>x.id==='UD-013'),'public-first gate remains canonical');
console.log('SCD ECOSYSTEM INTERACTIVE LAB CONTRACT PASS',{platforms:3,sharedAssistant:1,visual:'PENDING_VISUAL_APPROVAL',production:false});
