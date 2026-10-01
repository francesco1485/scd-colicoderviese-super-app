import { chromium } from 'playwright';
import fs from 'node:fs';

fs.mkdirSync('test-output',{recursive:true});
const base=process.env.SCD_TEST_URL||'http://127.0.0.1:10000';
const rawHtml=fs.readFileSync('sponsor/app.html','utf8');
const css=fs.readFileSync('sponsor/app.css','utf8');
const js=fs.readFileSync('sponsor/app.js','utf8');

const html=rawHtml
  .replace(/<link rel="stylesheet"[^>]*>/g,'')
  .replace(/<script src="\.\/app\.js[^"]*"[^>]*><\/script>/g,'')
  .replace('<head>','<head><base href="'+base+'/sponsor/">')
  .replace('</head>','<style>'+css+'</style></head>')
  .replace('</body>','<script>window.fetch=async()=>({ok:true,json:async()=>({user:{name:"QA Direzione",role:"DIRECTION"},isDirection:true})});<\/script><script>'+js.replace(/<\/script>/gi,'<\\/script>')+'<\/script></body>');

const browser=await chromium.launch({headless:true});
const viewports=[
  {width:390,height:844,name:'mobile'},
  {width:1440,height:900,name:'desktop'}
];

for(const viewport of viewports){
  const page=await browser.newPage({viewport});
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text())});

  await page.setContent(html,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#view-home.active');
  await page.waitForSelector('#homeActionQueue .action-mini');
  const actionCount=await page.locator('#homeActionQueue .action-mini').count();
  if(actionCount<4)throw new Error('home commercial action queue too small: '+actionCount);

  const sponsorStrip=await page.locator('#sponsorStrip').innerText();
  for(const prospect of ['IPERAL','HDI MAGLIA','DELLOCA','CARCANO']){
    if(sponsorStrip.includes(prospect))throw new Error('prospect rendered as current sponsor: '+prospect);
  }

  const contractsText=await page.locator('#homeContracts').innerText();
  if(!contractsText.includes('DOCUMENTATO'))throw new Error('documented sponsor status missing');
  if(/\bAttivo\b/.test(contractsText))throw new Error('current contracts still hardcode Attivo');

  await page.click('[data-view="azioni"]');
  await page.waitForSelector('#view-azioni.active');
  const radarCount=await page.locator('#actionQueueGrid .action-radar-card').count();
  if(radarCount<10)throw new Error('action radar missing cross-lane records: '+radarCount);

  await page.selectOption('#actionLane','CONVENTION');
  const conventionCards=await page.locator('#actionQueueGrid .action-radar-card').count();
  if(conventionCards!==2)throw new Error('convention lane mismatch: '+conventionCards);

  await page.selectOption('#actionLane','ALL');
  await page.fill('#actionSearch','Gimoka');
  const supplierMatch=await page.locator('#actionQueueGrid .action-radar-card').allTextContents();
  if(!supplierMatch.some(x=>x.includes('Gruppo Gimoka')))throw new Error('supplier radar search failed');

  await page.fill('#globalSearch','Piadineria');
  await page.waitForSelector('#searchResults:not([hidden])');
  const searchText=await page.locator('#searchResults').innerText();
  if(!searchText.includes('Convenzione'))throw new Error('global search does not cover conventions');

  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+3);
  if(overflow)throw new Error('sponsor app horizontal overflow '+viewport.name);
  if(errors.length)throw new Error('browser errors '+viewport.name+': '+errors.join(' | '));

  await page.screenshot({path:'test-output/sponsor-'+viewport.name+'-'+viewport.width+'x'+viewport.height+'.png',fullPage:true});
  await page.close();
}

console.log('SCD SPONSOR VISUAL SMOKE PASS',{viewports:viewports.map(x=>x.width+'x'+x.height)});
await browser.close();
