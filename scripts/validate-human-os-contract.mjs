import fs from 'node:fs';

function fail(message){console.error('SCD HUMAN OS CONTRACT FAIL:',message);process.exitCode=1}
function assert(condition,message){if(!condition)fail(message)}
function read(path){try{return fs.readFileSync(path,'utf8')}catch(e){fail('missing '+path);return ''}}
function json(path){try{return JSON.parse(read(path))}catch(e){fail('invalid json '+path);return {}}}

const m=json('SCD_SYSTEM_MANIFEST.json');
const router=read('app-r24-router.js');
const engine=read('scd-experience-engine.js');
const css=read('ui-r39-human.css');
const index=read('index.html');

assert(m.manifest?.version==='3.1.0','manifest must be 3.1.0 for R39');
assert(m.product_direction?.release==='R39','release must be R39');
assert(m.product_direction?.human_centered_os?.mental_state_inference===false,'mental-state inference must remain false');
assert(m.product_direction?.human_centered_os?.dark_patterns===false,'dark patterns must remain false');
assert(m.product_direction?.human_centered_os?.minor_compulsion_mechanics===false,'minor compulsion mechanics must remain false');
assert(m.product_direction?.economic_growth_loop?.verified_metrics_only===true,'growth metrics must be verified');
assert(m.product_direction?.economic_growth_loop?.no_fake_revenue===true,'fake revenue must remain forbidden');
assert(m.analytics?.human_centered?.inferred_mental_state===false,'analytics cannot infer mental state');
assert(m.analytics?.human_centered?.personal_vulnerability_targeting===false,'vulnerability targeting forbidden');

for(const id of ['CAP-HUMAN-OS','CAP-PRIVATE-DESK','CAP-COGNITIVE-ERGONOMICS','CAP-GROWTH-LOOP']){
  assert((m.capability_map||[]).some(x=>x.id===id),'missing capability '+id);
}

for(const token of ['DISCOVER','QUICK','FOCUS','NO_MENTAL_STATE_INFERENCE','scd:experience:v1']){
  assert(engine.includes(token),'experience engine missing '+token);
}
assert(!/stress|depress|anxi|mental state score|vulnerab.*score/i.test(engine),'experience engine must not infer psychological state');

for(const token of ['r39-experience-bar','r39-private-desk','r39-growth-loop']){
  assert(router.includes(token)||css.includes(token),'runtime token missing '+token);
}

assert(index.includes('ui-r39-human.css?v=39.0.0'),'R39 CSS not loaded');
assert(index.includes('scd-experience-engine.js?v=39.0.0'),'R39 experience engine not loaded');

if(process.exitCode)process.exit(process.exitCode);
console.log('SCD HUMAN OS CONTRACT PASS',{
  release:'R39',
  modes:['DISCOVER','QUICK','FOCUS'],
  privacy:'NO_MENTAL_STATE_INFERENCE',
  privateDesk:'ROLE_SCOPE',
  growth:'VERIFIED_METRICS_ONLY'
});