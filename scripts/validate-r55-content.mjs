import fs from 'node:fs';

const fail=m=>{console.error('SCD R55 CONTENT FILL FAIL: '+m);process.exitCode=1};
const read=p=>fs.readFileSync(p,'utf8');
const manifest=JSON.parse(read('SCD_SYSTEM_MANIFEST.json'));
const content=JSON.parse(read('content/public-club.v1.json'));
const html=read('index.html');
const runtime=read('scd-ng.js');
const css=read('scd-ng.css');
const socialCss=read('ui-r52-social.css');
const sw=read('sw.js');

const v=String(manifest.manifest?.version||'0.0.0').split('.').map(Number);
if((v[0]||0)<3||((v[0]||0)===3&&(v[1]||0)<25))fail('manifest version must be >= 3.25.0');
const r55=manifest.product_direction?.public_content_r55;
if(r55?.release!=='R55'||r55?.state!=='CONTENT_LAYER_ACTIVE')fail('R55 manifest contract missing');
if(content?.source?.verified!==true)fail('public club source must be verified');
if(content?.source?.visibility!=='PUBLIC')fail('public club source visibility mismatch');
if(!Array.isArray(content?.items)||content.items.length<5)fail('public club catalog too sparse');
for(const item of content.items){
  if(item.public!==true)fail('non-public item leaked into public catalog '+item.id);
  if(!item.id||!item.type||!item.status||!item.title||!item.summary)fail('incomplete public club item');
}
const raw=JSON.stringify(content);
if(/Mauri Simone|Locatelli Andrea|Nuova Sondrio|ROSSOBLU_PIZZA_10|SCD_KIT_2026/i.test(raw))fail('sample/invented operational data leaked into curated catalog');

for(const token of [
  'id="clubNowContent"','id="clubContentRail"','data-social-filter="CLUB"',
  './scd-ng.css?v=0.6.2','./ui-r52-social.css?v=0.7.1','./scd-ng.js?v=0.7.2'
])if(!html.includes(token))fail('R55 HTML contract missing '+token);

for(const token of [
  'function loadClubContent','function renderClubContent','function openClubContent',
  "fetch('./content/public-club.v1.json'", "type:'CLUB'", "if(kind==='club')",
  "if(row.action==='club'"
])if(!runtime.includes(token))fail('R55 runtime contract missing '+token);

for(const token of ['.club-now-grid','.club-now-card','.club-content-details'])if(!css.includes(token))fail('R55 public content style missing '+token);
if(!socialCss.includes('.social-card[data-type="CLUB"]'))fail('R55 social content style missing');
if(!sw.includes("scd-nextgen-0.7.2-r55")||!sw.includes('./content/public-club.v1.json'))fail('R55 PWA cache contract missing');

if(!process.exitCode)console.log('SCD R55 CONTENT FILL PASS',{
  items:content.items.length,
  verifiedSource:true,
  home:true,
  social:true,
  search:true,
  failClosed:true
});
