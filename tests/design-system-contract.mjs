import fs from 'node:fs';

function fail(message){console.error('SCD design system contract FAIL:',message);process.exit(1)}
function assert(cond,message){if(!cond)fail(message)}

const visual=JSON.parse(fs.readFileSync(new URL('../config/scd-visual-system.json',import.meta.url),'utf8'));
const shared=fs.readFileSync(new URL('../sponsor/scd-design-system.css',import.meta.url),'utf8');
const pub=fs.readFileSync(new URL('../sponsor/index.html',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../sponsor/app.html',import.meta.url),'utf8');
const pages=fs.readFileSync(new URL('../scripts/build-pages.mjs',import.meta.url),'utf8');
const doc=fs.readFileSync(new URL('../docs/design/SCD-VISUAL-AND-MOTION-SYSTEM.md',import.meta.url),'utf8');
const motion=JSON.parse(fs.readFileSync(new URL('../config/sponsor-motion-profiles.json',import.meta.url),'utf8'));
const scenes=JSON.parse(fs.readFileSync(new URL('../config/scd-creative-scenes.json',import.meta.url),'utf8'));
const server=fs.readFileSync(new URL('../server.js',import.meta.url),'utf8');
const appJs=fs.readFileSync(new URL('../sponsor/app.js',import.meta.url),'utf8');

assert(visual.id==='SCD_VISUAL_SYSTEM','visual system id missing');
assert(visual.club==='S.C.D. ColicoDerviese','club identity mismatch');
assert(visual.territory.includes('Colico'),'territory identity missing');

const requiredColors={
  navy:'#031A35',
  blue:'#0870CF',
  lake:'#0B98DD',
  cyan:'#20B7E6',
  yellow:'#FFD500',
  white:'#FFFFFF'
};
for(const [key,value] of Object.entries(requiredColors)){
  assert(visual.colors?.[key]===value,'canonical color mismatch: '+key);
  assert(shared.toLowerCase().includes(value.toLowerCase()),'shared CSS missing canonical color: '+key);
}

assert(visual.motion?.reducedMotionRequired===true,'reduced motion policy missing');
assert(visual.motion?.ledPreview?.previewResolution==='1920x1080','LED preview resolution contract missing');
assert(visual.motion?.ledPreview?.fps===25,'LED preview fps contract missing');
assert(visual.motion?.ledPreview?.durationSeconds===20,'LED preview duration contract missing');
assert(visual.motion?.ledPreview?.nativeLedSpecStatus==='DA_RILEVARE_ALLA_CONSEGNA','native LED safeguard missing');

assert(shared.includes('@media (prefers-reduced-motion:reduce)'),'reduced-motion CSS missing');
assert(shared.includes('--scd-yellow:#ffd500'),'club yellow token missing');
assert(shared.includes('--scd-blue:#0870cf'),'club blue token missing');
assert(shared.includes('--scd-lake:#0b98dd'),'lake token missing');

for(const html of [pub,app]){
  assert(html.includes('./scd-design-system.css?v=1.0.0'),'canonical design stylesheet not loaded');
}
assert(pages.includes("'sponsor/scd-design-system.css'"),'Pages artifact does not include shared design system');

for(const token of [
  'Standard internazionale. Identita profondamente locale.',
  'Vision-to-Code',
  'LED / MP4',
  'logo ufficiale fornito/approvato',
  'camera-safe',
  'proof'
]) assert(doc.includes(token),'design governance doc missing: '+token);

assert(motion.source==='SCD_MEDIA_MOTION_LAB','motion profile source missing');
assert(motion.previewSource?.width===1920&&motion.previewSource?.height===1080,'motion preview resolution missing');
assert(motion.previewSource?.fps===25,'motion preview fps missing');
assert(motion.previewSource?.durationSeconds===20,'motion preview duration missing');
assert(motion.productionTarget?.durationSeconds===40,'LED production target duration missing');
assert(motion.productionTarget?.logoRequirement==='OFFICIAL_APPROVED_LOGO_REQUIRED_BEFORE_FINAL_MP4','final MP4 logo gate missing');
for(const partner of ['GGlass','TA Cleaning','AGC Medical']){
  const p=motion.profiles.find(x=>x.partnerName===partner);
  assert(Boolean(p),'motion profile missing: '+partner);
  assert(p.logoAssetStatus==='MISSING_OFFICIAL_REPO_ASSET','official logo safeguard missing: '+partner);
  assert(Boolean(p.stadiumView),'tribune-view rule missing: '+partner);
  assert(Boolean(p.cameraView),'camera-safe rule missing: '+partner);
  assert(Array.isArray(p.proofPlan)&&p.proofPlan.length>=3,'proof plan missing: '+partner);
}
assert(server.includes("'/api/sponsor/motion-profiles'"),'protected motion profile endpoint missing');
assert(server.includes('handleSponsorMotionProfiles'),'motion profile handler missing');
assert(app.includes('id="motionProfileGrid"'),'Motion Lab grid missing');
assert(app.includes('id="motionInspector"'),'Motion Lab inspector missing');
assert(appJs.includes('loadMotionProfiles'),'Motion Lab loader missing');
assert(appJs.includes('fetchMotionConfig'),'shared protected motion loader missing');
assert(!appJs.includes("fetch('/config/sponsor-motion-profiles.json'"),'motion config must not bypass protected endpoint');
assert(appJs.includes('renderMotionInspector'),'Motion Lab inspector renderer missing');

assert(scenes.id==='SCD_CREATIVE_SCENE_LIBRARY','creative scene library id missing');
assert(scenes.rule==='VISIONARY_BUT_GROUNDED','grounded visionary rule missing');
assert(Array.isArray(scenes.scenes)&&scenes.scenes.length>=6,'creative scene library too small');
for(const scene of scenes.scenes){
  assert(Boolean(scene.realityAnchor),'scene reality anchor missing: '+scene.id);
  assert(Boolean(scene.fantasyAllowance),'scene fantasy allowance missing: '+scene.id);
  assert(Array.isArray(scene.forbidden)&&scene.forbidden.length>=1,'scene forbidden rules missing: '+scene.id);
  assert(Boolean(scene.visualDirection),'scene visual direction missing: '+scene.id);
}
const lakeScene=scenes.scenes.find(x=>x.id==='SCENE-TRIBUNA-LAKE-CONCEPT');
assert(Boolean(lakeScene),'tribune/lake concept scene missing');
assert(lakeScene.forbidden.join(' ').toLowerCase().includes('fotografia documentaria'),'tribune/lake documentary safeguard missing');
assert(server.includes("'/api/sponsor/creative-scenes'"),'protected creative scene endpoint missing');
assert(app.includes('id="activationScene"'),'Creative Factory scene selector missing');
assert(app.includes('id="activationSceneGuide"'),'Creative Factory scene guide missing');
assert(appJs.includes('fetchCreativeScenes'),'creative scene loader missing');
assert(appJs.includes('renderActivationSceneGuide'),'creative scene guide renderer missing');

console.log('SCD design system contract PASS',{
  schema:visual.schemaVersion,
  colors:Object.keys(requiredColors).length,
  motion:visual.motion.ledPreview.previewResolution+' @ '+visual.motion.ledPreview.fps+'fps'
});
