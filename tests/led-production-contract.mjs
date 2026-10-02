import fs from 'node:fs';

function fail(m){console.error('LED production contract FAIL:',m);process.exit(1)}
function assert(c,m){if(!c)fail(m)}

const cfg=JSON.parse(fs.readFileSync(new URL('../config/sponsor-motion-profiles.json',import.meta.url),'utf8'));
const html=fs.readFileSync(new URL('../sponsor/app.html',import.meta.url),'utf8');
const js=fs.readFileSync(new URL('../sponsor/app.js',import.meta.url),'utf8');

assert(cfg.schemaVersion==='1.1.0','motion profile schema must be 1.1.0');
assert(cfg.previewSource?.width===1920&&cfg.previewSource?.height===1080,'preview source must remain 1920x1080');
assert(cfg.previewSource?.fps===25,'preview source fps must remain 25');
assert(cfg.previewSource?.durationSeconds===20,'source preview duration must remain 20s');
assert(cfg.productionTarget?.durationSeconds===40,'final sponsor production target must be 40s');
assert(cfg.productionTarget?.resolutionStatus==='NATIVE_LED_RESOLUTION_TO_BE_MEASURED','native LED resolution must stay unresolved until measured');
assert(cfg.productionTarget?.logoRequirement==='OFFICIAL_APPROVED_LOGO_REQUIRED_BEFORE_FINAL_MP4','official logo gate missing');
assert(cfg.productionTarget?.cameraSafe===true,'camera-safe production rule missing');
assert(cfg.productionTarget?.stadiumReadable===true,'stadium readability rule missing');

assert(cfg.productionTarget?.storyboardDurationSeconds===40,'40s storyboard duration missing');
assert(Array.isArray(cfg.productionTarget?.requiredGates)&&cfg.productionTarget.requiredGates.includes('OFFICIAL_APPROVED_LOGO'),'official logo production gate list missing');
assert(Array.isArray(cfg.productionTarget?.previewModes)&&cfg.productionTarget.previewModes.includes('TRIBUNA')&&cfg.productionTarget.previewModes.includes('CAMERA'),'tribuna/camera preview modes missing');


for(const name of ['GGlass','TA Cleaning','AGC Medical']){
  const p=cfg.profiles.find(x=>x.partnerName===name);
  assert(p,'motion profile missing: '+name);
  assert(p.motionConcept,'motion concept missing: '+name);
  assert(p.stadiumView,'stadium view missing: '+name);
  assert(p.cameraView,'camera view missing: '+name);
  assert(p.lakeIdentity,'lake identity missing: '+name);
  assert(Array.isArray(p.proofPlan)&&p.proofPlan.length>=4,'proof plan incomplete: '+name);
  assert(p.sceneId==='SCENE-TRIBUNA-LAKE-CONCEPT','tribuna/lake scene mapping missing: '+name);
  assert(p.simulationLabel==='SIMULAZIONE_CONCETTUALE_NON_DOCUMENTARIA','simulation disclosure missing: '+name);
  assert(Array.isArray(p.motionTimeline)&&p.motionTimeline.length===5,'40s motion timeline must have 5 phases: '+name);
  assert(p.motionTimeline[0].from===0&&p.motionTimeline[p.motionTimeline.length-1].to===40,'motion timeline must cover 0-40s: '+name);
}

for(const token of ['LED PRODUCTION HUB','id="ledProfileList"','id="ledProfileDetail"','id="ledProductionSpecs"']){
  assert(html.includes(token),'LED Production Hub UI missing: '+token);
}
for(const token of ['initLedProductionHub','renderLedProfileDetail','ledMotionBrief','/api/sponsor/motion-profiles','fetchMotionConfig','led-tribuna-simulator','data-led-sim-view-btn','data-led-cue','SIMULAZIONE CONCETTUALE · NON FOTO DOCUMENTARIA']){
  assert(js.includes(token),'LED Production Hub interaction missing: '+token);
}
assert(js.includes("p.logoAssetStatus!=='APPROVED_OFFICIAL_ASSET'"),'final MP4 logo gate missing in UI');
assert(js.includes('MASTER MP4 BLOCCATO'),'blocked master state missing');
assert(js.includes('Risoluzione LED nativa: da rilevare alla consegna'),'native LED unresolved notice missing');
assert(!js.includes("fetch('/config/sponsor-motion-profiles.json'"),'must not use public config bypass');
console.log('LED production contract PASS');
