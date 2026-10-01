import fs from 'node:fs';
import crypto from 'node:crypto';

const fail=m=>{console.error('ASSET/ADAPTIVE CONTRACT FAIL: '+m);process.exitCode=1};
const registry=JSON.parse(fs.readFileSync('config/scd-assets.v1.json','utf8'));
const manifest=JSON.parse(fs.readFileSync('SCD_SYSTEM_MANIFEST.json','utf8'));
const html=fs.readFileSync('index.html','utf8');
const adaptive=fs.readFileSync('scd-adaptive-engine.js','utf8');

function gitBlobSha(buf){
  const head=Buffer.from('blob '+buf.length+'\0');
  return crypto.createHash('sha1').update(Buffer.concat([head,buf])).digest('hex');
}

for(const asset of registry.locked_assets||[]){
  if(!fs.existsSync(asset.path)){fail('missing locked asset '+asset.path);continue}
  const actual=gitBlobSha(fs.readFileSync(asset.path));
  if(actual!==asset.git_blob_sha)fail('locked asset changed '+asset.path+' expected '+asset.git_blob_sha+' got '+actual);
}

for(const folder of ['assets/kits/','assets/opponents/','assets/sponsors/']){
  if(registry.folders && !Object.values(registry.folders).includes(folder))fail('missing canonical folder declaration '+folder);
}

if(manifest.visual_system?.asset_integrity?.official_asset_rule!=='NEVER_GENERATE_OR_REDRAW_WHEN_REAL_VERIFIABLE_ASSET_EXISTS')fail('official asset rule missing');
if(manifest.visual_system?.adaptive_experience?.strategy!=='FEATURE_DETECTION_CONTAINER_RESPONSIVE')fail('adaptive feature detection contract missing');
if(!html.includes('scd-adaptive-engine.js'))fail('adaptive runtime not mounted');
for(const token of ['ResizeObserver','visualViewport','prefers-reduced-motion','prefers-contrast','devicePixelRatio']){
  if(!adaptive.includes(token))fail('adaptive signal missing '+token);
}
for(const forbidden of ['userAgent','canvas.toDataURL','AudioContext','enumerateDevices']){
  if(adaptive.includes(forbidden))fail('fingerprinting-adjacent token forbidden '+forbidden);
}
if(!process.exitCode)console.log('SCD ASSET + ADAPTIVE CONTRACT PASS');
