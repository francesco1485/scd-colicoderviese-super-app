import fs from 'node:fs';

const fail=m=>{console.error('SPONSOR OPERATIONS CONTRACT FAIL: '+m);process.exitCode=1};
const read=p=>fs.readFileSync(p,'utf8');
const html=read('sponsor/app.html');
const js=read('sponsor/app.js');
const css=read('sponsor/app.css');
const manifest=JSON.parse(read('SCD_SYSTEM_MANIFEST.json'));

if(manifest.product_direction?.sponsor_operations_radar?.state!=='PRIVATE_OPERATIONAL_WORKBENCH')fail('private sponsor workbench contract missing');
if(!(manifest.capability_map||[]).some(x=>x.id==='CAP-SPONSOR-OPERATIONS'))fail('CAP-SPONSOR-OPERATIONS missing');

for(const token of ['data-view="azioni"','id="view-azioni"','id="homeActionQueue"','id="actionQueueGrid"','id="actionSearch"','id="actionLane"']){
  if(!html.includes(token))fail('sponsor operations UI missing '+token);
}
for(const token of ['function commercialActions()','function renderActionQueue()','conventions.map','suppliers.map','commercialInitiatives.map','renderActionQueue();']){
  if(!js.includes(token))fail('sponsor operations runtime missing '+token);
}
if(!js.includes("const names=sponsors.map(s=>s.name);"))fail('current sponsor strip must derive only from documented sponsor records');
const strip=js.slice(js.indexOf('function renderSponsorStrip()'),js.indexOf('function homeContracts()'));
for(const prospect of ['IPERAL','HDI MAGLIA','DELLOCA','CARCANO']){
  if(strip.includes(prospect))fail('prospect/external name leaked into current sponsor strip: '+prospect);
}
const contracts=js.slice(js.indexOf('function homeContracts()'),js.indexOf('function homeProposals()'));
if(/status-badge">Attivo/.test(contracts))fail('contract status must not be hardcoded as Attivo');
if(!contracts.includes('esc(s.status)'))fail('contract cards must expose documented relationship status');
const badSelectorForEach=js.split('\n').filter(line=>/\$\([^)]*\)\??\.forEach\(/.test(line)&&!/\$\$\(/.test(line));
if(badSelectorForEach.length)fail('single-element selector used as collection: '+badSelectorForEach.join(' | '));
for(const token of ['...conventions.map','...suppliers.map','...commercialInitiatives.map','...audience.map']){
  if(!js.includes(token))fail('global search coverage missing '+token);
}
if(!html.includes('LOCALE'))fail('local poll must remain explicitly labeled local');
if(!css.includes('R45 SPONSOR OPERATIONS RADAR'))fail('R45 sponsor operations styling missing');

if(!process.exitCode)console.log('SCD SPONSOR OPERATIONS CONTRACT PASS',{
  manifestVersion:manifest.manifest?.version,
  lanes:manifest.product_direction?.sponsor_operations_radar?.lanes||[],
  prospectSeparation:true,
  actionQueue:true,
  searchCoverage:true
});
