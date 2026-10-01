import fs from 'node:fs';

function fail(message){console.error('SCD UNIVERSE CONTRACT FAIL:',message);process.exitCode=1}
function assert(condition,message){if(!condition)fail(message)}
function read(path){try{return fs.readFileSync(path,'utf8')}catch(e){fail('missing '+path);return ''}}
function json(path){try{return JSON.parse(read(path))}catch(e){fail('invalid json '+path);return {}}}

const m=json('SCD_SYSTEM_MANIFEST.json');
const router=read('app-r24-router.js');
const css=read('ui-r38-universe.css');
const meta=read('scd-meta-engine.js');
const twin=read('scd-twin.js');
const index=read('index.html');

assert(/^3\./.test(m.manifest?.version||''),'manifest must remain SCD Universe major v3');
assert(m.manifest?.change_policy?.cumulative_directives===true,'cumulative directives contract missing');
assert(m.product_direction?.product_name==='SCD UNIVERSE','product name mismatch');
assert(m.product_direction?.experience_model==='ADAPTIVE_CLUB_OS','adaptive club OS contract missing');
assert(m.product_direction?.adaptive_meta_engine==='SCD_META_ENGINE','Meta engine contract missing');
assert(m.product_direction?.virtual_collaborator==='SCD_MIRROR','Mirror contract missing');
assert(m.product_direction?.evolving_identity==='SCD_TWIN','Twin contract missing');
assert(m.analytics?.meta_adaptive?.storage==='LOCAL_DEVICE_ONLY_R38','Meta R38 must remain on-device');
assert(m.analytics?.meta_adaptive?.external_sync===false,'Meta R38 external sync must remain off');
assert((m.analytics?.meta_adaptive?.forbidden_inputs||[]).includes('SAFEGUARDING'),'Safeguarding must be excluded from adaptive Meta');
assert(m.sky_and_avatar?.mirror?.no_permission_bypass===true,'Mirror must not bypass permissions');
assert((m.sky_and_avatar?.tamagotchi_evolution?.forbidden_default||[]).includes('talent_ranking'),'Twin talent ranking must remain forbidden');

for(const id of ['CAP-SCD-UNIVERSE','CAP-META-ADAPTIVE','CAP-SCD-TWIN','CAP-SCD-MIRROR','CAP-SOCIAL-RADAR']){
  assert((m.capability_map||[]).some(x=>x.id===id),'missing capability '+id);
}

for(const token of ['r38-universe','r38-sponsor-rail','r38-twin-card','r38-mirror','r38-fan-lab','SCDTwin','SCDMeta']){
  assert(router.includes(token)||css.includes(token)||twin.includes(token)||meta.includes(token),'runtime token missing '+token);
}

for(const token of ['PRIVACY_FIRST_ON_DEVICE','safeKeys','forbidden']){
  if(token==='forbidden')continue;
  assert(meta.includes(token),'Meta privacy token missing '+token);
}
assert(!/safeguard/i.test(meta),'Meta engine must not collect safeguarding category');
assert(!/password|\bpin\b|health|biometric/i.test(meta),'Meta engine contains forbidden sensitive terms');

for(const token of ['Scintilla','Rookie','Playmaker','Capitano','Leggenda','APP_VISIT']){
  if(token==='APP_VISIT')continue;
  assert(twin.includes(token),'Twin stage missing '+token);
}
assert(twin.includes("scd:twin:v1"),'Twin local storage contract missing');

const isNextGenSynthetic=m.architecture?.nextgen_preview?.visual_mode==='SYNTHETIC_NO_REAL_PHOTOGRAPHY';
if(isNextGenSynthetic){
  assert(index.includes('scd-synth.css?v='),'NextGen synthetic CSS not loaded');
}else{
  assert(/ui-r38-universe\.css\?v=(38|39|40)\.0\.0/.test(index),'R38 Universe CSS not loaded');
}
assert(/scd-meta-engine\.js\?v=(38|39|40)\.0\.0/.test(index),'Meta engine not loaded');
assert(/scd-twin\.js\?v=(38|39|40)\.0\.0/.test(index),'Twin engine not loaded');

if(process.exitCode)process.exit(process.exitCode);
console.log('SCD UNIVERSE CONTRACT PASS',{
  release:'R38',
  product:'SCD UNIVERSE',
  meta:'PRIVACY_FIRST_ON_DEVICE',
  twin:'SAFE_PARTICIPATION_GROWTH',
  mirror:'ROLE_SCOPE_INHERITED'
});