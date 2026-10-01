import { chromium } from 'playwright';
import fs from 'node:fs';

fs.mkdirSync('test-output',{recursive:true});
const base=process.env.SCD_TEST_URL||'http://127.0.0.1:10000';
const viewports=[
  {width:360,height:800},
  {width:390,height:844},
  {width:393,height:852},
  {width:430,height:932},
  {width:1280,height:800},
  {width:1440,height:900},
  {width:1920,height:1080}
];

const browser=await chromium.launch({headless:true});
const allErrors=[];

for(const viewport of viewports){
  const page=await browser.newPage({viewport});
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text())});

  await page.goto(base+'/#pulse',{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForSelector('#view-pulse.active');
  await page.waitForSelector('.hero-synth');
  await page.waitForSelector('.ng-command-ring');
  await page.waitForSelector('#weekRail');
  await page.waitForSelector('.ng-constellation');
  await page.waitForSelector('.newsroom');
  await page.waitForSelector('.worlds-preview');
  await page.waitForSelector('.ng-value-engine');
  await page.waitForFunction(()=>Boolean(window.SCDNextGen)&&Boolean(window.SCDMeta)&&Boolean(window.SCDTwin)&&Boolean(window.SCDExperience)&&Boolean(window.SCDAdaptive));
  await page.waitForFunction(()=>document.documentElement.scrollWidth<=window.innerWidth+3);

  const realPhotoRefs=await page.evaluate(()=>[...document.querySelectorAll('img')].map(x=>x.getAttribute('src')||'').filter(x=>/hero-colico|event-insieme/i.test(x)));
  if(realPhotoRefs.length)throw new Error('forbidden real photography loaded: '+realPhotoRefs.join(','));

  const adaptive=await page.evaluate(()=>window.SCDAdaptive.snapshot());
  if(!['phone','phone-wide','tablet','desktop','wide'].includes(adaptive.viewportClass))throw new Error('adaptive viewport class missing');
  const adaptiveAttr=await page.evaluate(()=>document.documentElement.dataset.scdViewportClass||'');
  if(adaptiveAttr!==adaptive.viewportClass)throw new Error('adaptive viewport dataset not applied');

  const meta=await page.evaluate(()=>window.SCDMeta.snapshot('base'));
  if(meta.mode!=='PRIVACY_FIRST_ON_DEVICE')throw new Error('Meta privacy-first mode missing');

  const cognitive=await page.evaluate(()=>window.SCDExperience.frictionSnapshot());
  if(cognitive.principle!=='NO_MENTAL_STATE_INFERENCE')throw new Error('Human OS guardrail missing');

  await page.click('[data-experience-mode="FOCUS"]');
  if(await page.evaluate(()=>document.body.dataset.scdExperience)!=='focus')throw new Error('Focus mode failed');
  await page.click('[data-experience-mode="QUICK"]');
  if(await page.evaluate(()=>document.body.dataset.scdExperience)!=='quick')throw new Error('Quick mode failed');
  await page.click('[data-experience-mode="DISCOVER"]');
  if(await page.evaluate(()=>document.body.dataset.scdExperience)!=='discover')throw new Error('Discover mode failed');

  await page.evaluate(()=>window.SCDNextGen.setView('twin'));
  await page.waitForSelector('#view-twin.active .twin-stage');
  await page.waitForSelector('#twinLocker');
  const beforeXp=await page.locator('#twinXp').textContent();
  await page.click('#missionBtn');
  const afterXp=await page.locator('#twinXp').textContent();
  if(beforeXp===afterXp)throw new Error('Twin XP did not evolve');

  await page.evaluate(()=>window.SCDNextGen.setView('desk'));
  await page.waitForSelector('#view-desk.active .desk-hero');
  await page.waitForSelector('.service-dock');

  await page.evaluate(()=>window.SCDNextGen.openMirror());
  await page.waitForSelector('#mirror.open');
  await page.fill('#mirrorInput','Che devo fare oggi?');
  await page.click('#mirrorForm button');
  await page.waitForFunction(()=>document.querySelectorAll('#mirrorMessages .msg.ai').length>=2);
  await page.click('#closeMirror');

  await page.evaluate(()=>window.SCDNextGen.setView('pulse'));

  const shellWidth=await page.locator('.app').evaluate(el=>Math.round(el.getBoundingClientRect().width));
  if(viewport.width>=1280 && shellWidth<1200)throw new Error('desktop shell too narrow: '+shellWidth+'px');

  if([390,430,1440,1920].includes(viewport.width)){
    await page.screenshot({path:'test-output/nova-'+viewport.width+'x'+viewport.height+'.png',fullPage:true});
  }

  if(errors.length)allErrors.push(viewport.width+'x'+viewport.height+': '+errors.join(' | '));
  await page.close();
}

const api=await browser.newPage();
const health=await api.request.get(base+'/health');
if(!health.ok())throw new Error('health endpoint failed '+health.status());
const healthJson=await health.json();
if(healthJson.service!=='SCD Super App')throw new Error('invalid health service');

const newsroom=await api.request.get(base+'/api/newsroom');
if(!newsroom.ok())throw new Error('newsroom endpoint failed '+newsroom.status());
const newsroomJson=await newsroom.json();
if(newsroomJson.staleSiteContent!==false||newsroomJson.editorialPolicy!=='VERIFIED_STRUCTURED_FACTS_ONLY')throw new Error('invalid newsroom policy');
if(!Array.isArray(newsroomJson.calendar?.rows)||!Array.isArray(newsroomJson.cards))throw new Error('invalid newsroom payload');

const capabilities=await api.request.get(base+'/api/capabilities');
if(!capabilities.ok())throw new Error('capabilities endpoint failed '+capabilities.status());
const cap=await capabilities.json();
if(typeof cap.featureFlags?.supabaseCore!=='boolean')throw new Error('supabase feature flag missing');

for(const resource of ['/manifest.webmanifest','/sw.js','/robots.txt','/sitemap.xml']){
  const rr=await api.request.get(base+resource);
  if(!rr.ok())throw new Error(resource+' missing');
}
await api.close();

if(allErrors.length)throw new Error('browser errors: '+allErrors.join(' || '));
console.log('SCD NOVA smoke PASS',{viewports:viewports.map(v=>v.width+'x'+v.height)});
await browser.close();
