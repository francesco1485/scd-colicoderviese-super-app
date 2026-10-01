import fs from 'node:fs';

const fail=(m)=>{throw new Error('NEXTGEN CONTRACT FAIL: '+m)};
const read=(p)=>fs.readFileSync(p,'utf8');

const html=read('index.html');
const css=read('scd-ng.css');
const synth=read('scd-synth.css');
const js=read('scd-ng.js');
const interactions=read('scd-interactions.js');
const manifest=JSON.parse(read('SCD_SYSTEM_MANIFEST.json'));

const all=[html,css,synth,js,interactions].join('\n');

if(!html.includes('SCD Universe · Next Generation')) fail('NextGen title missing');
if(!html.includes('scd-synth.css')) fail('synthetic visual layer not mounted');
if(!html.includes('scd-interactions.js')) fail('interaction layer not mounted');
if(!html.includes('SCD TWIN')) fail('Twin surface missing');
if(!html.includes('SCD MIRROR')) fail('Mirror surface missing');
if(!html.includes('PRIVATE DESK')) fail('Private Desk missing');
if(!html.includes('SCD WEEKLY RADAR')) fail('Weekly Radar missing');
if(!html.includes('SCD AI NEWSROOM')) fail('AI Newsroom missing');

for(const forbidden of ['hero-colico.webp','event-insieme.webp','photoInput','t.photo']){
  if(all.includes(forbidden)) fail('forbidden real-photo runtime reference: '+forbidden);
}

if(!synth.includes('SYNTHETIC VISUAL STAGE') && !synth.includes('SCD NEXTGEN SYNTHETIC VISUAL SYSTEM')){
  fail('synthetic scene contract marker missing');
}
if(!interactions.includes('speechSynthesis')) fail('local TTS runtime missing');
if(!js.includes("fetch(API_BASE+'/api/newsroom'")) fail('newsroom must use same-origin API abstraction');
if(!js.includes("const API_BASE=''")) fail('NextGen canonical app must use same-origin API');
if(!js.includes("const twinKey='scd:twin:v1'")) fail('canonical Twin storage key missing');
if(!html.includes('scd-meta-engine.js')) fail('canonical Meta engine not mounted');
if(!html.includes('scd-twin.js')) fail('canonical Twin engine not mounted');

const preview=manifest.architecture?.nextgen_preview;
if(!['PREVIEW_NOT_PRODUCTION_PRIMARY','PRODUCTION_PRIMARY'].includes(preview?.state)) fail('invalid NextGen runtime state');
if(preview?.frontend_api_topology!=='SAME_ORIGIN') fail('same-origin topology missing');
if(preview?.visual_mode!=='SYNTHETIC_NO_REAL_PHOTOGRAPHY') fail('synthetic visual mode missing');
if(manifest.visual_system?.media_policy?.nextgen_real_photography_in_ui!==false) fail('real photography must be disabled in NextGen UI');
if(manifest.sky_and_avatar?.personal_avatar?.rendering_mode!=='SYNTHETIC_ONLY') fail('Twin rendering must be synthetic-only');
if(manifest.sky_and_avatar?.mirror?.separate_from_twin!==true) fail('Mirror and Twin must remain separate');

const capIds=new Set((manifest.capability_map||[]).map(x=>x.id));
for(const id of ['CAP-NEXTGEN-SYNTHETIC-UI','CAP-LOCAL-TTS','CAP-VALUE-ENGINE']){
  if(!capIds.has(id)) fail('missing capability '+id);
}

console.log(JSON.stringify({
  ok:true,
  manifestVersion:manifest.manifest.version,
  preview:preview?.canonical_preview_url,
  realPhotoRuntime:false,
  sameOriginApi:true,
  twinSynthetic:true,
  mirrorSeparate:true,
  localTts:true
},null,2));
