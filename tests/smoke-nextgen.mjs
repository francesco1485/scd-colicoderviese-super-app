import { chromium } from 'playwright';
import fs from 'node:fs';

fs.mkdirSync('test-output',{recursive:true});
let checkpoint='BOOT';
function mark(name){checkpoint=name;console.log('[SMOKE CHECKPOINT]',name)}
function persistFailure(kind,err){
  const payload={kind,checkpoint,error:String(err?.stack||err?.message||err||'unknown'),at:new Date().toISOString()};
  try{fs.writeFileSync('test-output/smoke-checkpoint.json',JSON.stringify(payload,null,2))}catch{}
  console.error('[SMOKE FAILURE]',JSON.stringify(payload));
}
process.on('uncaughtException',err=>{persistFailure('uncaughtException',err);process.exit(1)});
process.on('unhandledRejection',err=>{persistFailure('unhandledRejection',err);process.exit(1)});
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
  mark('NOVA_VIEWPORT_'+viewport.width+'x'+viewport.height);
  const page=await browser.newPage({viewport});
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text())});

  await page.goto(base+'/#pulse',{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForSelector('#view-pulse.active');
  await page.waitForSelector('.home-first');
  await page.waitForSelector('#publicSearchInput');
  await page.waitForSelector('#sportHub');
  await page.waitForSelector('#matchCenter');
  await page.waitForSelector('#upcomingEvents');
  await page.waitForSelector('#mediaHub');
  await page.waitForSelector('#communityPulse');
  await page.waitForSelector('#institutionalStrip');
  await page.waitForSelector('#sponsorRail');
  await page.waitForSelector('#joinClub');
  await page.waitForSelector('#view-calendar',{state:'attached'});
  await page.waitForSelector('#view-teams',{state:'attached'});
  await page.waitForSelector('.hero-synth',{state:'attached'});
  await page.waitForSelector('.ng-command-ring',{state:'attached'});
  await page.waitForSelector('#weekRail');
  await page.waitForSelector('.ng-constellation',{state:'attached'});
  await page.waitForSelector('.newsroom');
  await page.waitForSelector('.worlds-preview',{state:'attached'});
  await page.waitForSelector('.ng-value-engine',{state:'attached'});
  await page.waitForTimeout(700);
  const runtimeFlags=await page.evaluate(()=>({nextGen:Boolean(window.SCDNextGen),meta:Boolean(window.SCDMeta),twin:Boolean(window.SCDTwin),experience:Boolean(window.SCDExperience),adaptive:Boolean(window.SCDAdaptive)}));
  if(!Object.values(runtimeFlags).every(Boolean))throw new Error('runtime boot incomplete '+JSON.stringify(runtimeFlags)+' browserErrors='+errors.join(' | '));
  await page.waitForFunction(()=>document.documentElement.scrollWidth<=window.innerWidth+3);

  const firstView=await page.locator('.home-first').evaluate(el=>({top:el.getBoundingClientRect().top,bottom:el.getBoundingClientRect().bottom}));
  if(firstView.top>300)throw new Error('current-week home entry not visible early enough: '+firstView.top);
  const homeBeforeHero=await page.evaluate(()=>document.querySelector('.home-first').compareDocumentPosition(document.querySelector('.hero')) & Node.DOCUMENT_POSITION_FOLLOWING);
  if(!homeBeforeHero)throw new Error('weekly home entry must precede secondary hero');
  const palette=await page.evaluate(()=>({
    bg:getComputedStyle(document.documentElement).getPropertyValue('--bg').trim(),
    blue:getComputedStyle(document.documentElement).getPropertyValue('--blue').trim(),
    gold:getComputedStyle(document.documentElement).getPropertyValue('--gold').trim()
  }));
  if(palette.bg!=='#f2f5f9'||palette.blue!=='#1664e8'||palette.gold!=='#ffc928')throw new Error('SCD Arena palette not applied '+JSON.stringify(palette));
  const arenaTheme=await page.evaluate(()=>document.body.dataset.scdTheme);
  if(arenaTheme!=='arena')throw new Error('SCD Arena theme marker missing');
  const arenaLabel=String(await page.locator('#sportHub .sport-superbar-title span').textContent()||'');
  if(!arenaLabel.includes('SCD ARENA'))throw new Error('SCD Arena identity missing');
    const sportHubButtons=await page.locator('#sportHub button').count();
  if(sportHubButtons!==6)throw new Error('Sport Hub actions mismatch: '+sportHubButtons);
  const officialLinks=await page.locator('#mediaHub .official-channels a').count();
  if(officialLinks!==5)throw new Error('Media Hub official links mismatch: '+officialLinks);
  const institutionalLogos=await page.locator('#institutionalStrip img').count();
  if(institutionalLogos!==3)throw new Error('institutional logos mismatch: '+institutionalLogos);
  const skyAsset=await page.locator('#mirrorFab img').getAttribute('src');
  if(!/assets\/sky\.png$/.test(String(skyAsset||'')))throw new Error('official Sky mascot missing from chatbot');
    const navLabels=await page.locator('.bottom-nav button').allTextContents();
  for(const label of ['Home','Calendario','Squadre','Community','Profilo'])if(!navLabels.some(x=>x.includes(label)))throw new Error('mobile nav missing '+label);
  const visibleLegacy=await page.evaluate(()=>['.home-secondary-hero','.ng-command-ring','.pulse-strip','.ng-constellation','.worlds-preview','.ng-value-engine'].filter(sel=>{const el=document.querySelector(sel);return el&&getComputedStyle(el).display!=='none'}));
  if(visibleLegacy.length)throw new Error('secondary clutter visible on public home: '+visibleLegacy.join(','));

  const realPhotoRefs=await page.evaluate(()=>[...document.querySelectorAll('img')].map(x=>x.getAttribute('src')||'').filter(x=>/hero-colico|event-insieme/i.test(x)));
  if(realPhotoRefs.length)throw new Error('forbidden real photography loaded: '+realPhotoRefs.join(','));

  const adaptive=await page.evaluate(()=>window.SCDAdaptive.snapshot());
  if(!['PHONE_COMPACT','PHONE','PHONE_LARGE','TABLET','LAPTOP','DESKTOP','WIDE','ULTRAWIDE'].includes(adaptive.viewportClass))throw new Error('adaptive viewport class missing');
  const adaptiveAttr=await page.evaluate(()=>String(document.documentElement.dataset.scdViewport||'').toUpperCase());
  if(adaptiveAttr!==adaptive.viewportClass)throw new Error('adaptive viewport dataset not applied');

  const meta=await page.evaluate(()=>window.SCDMeta.snapshot('base'));
  if(meta.mode!=='PRIVACY_FIRST_ON_DEVICE')throw new Error('Meta privacy-first mode missing');

  const cognitive=await page.evaluate(()=>window.SCDExperience.frictionSnapshot());
  if(cognitive.principle!=='NO_MENTAL_STATE_INFERENCE')throw new Error('Human OS guardrail missing');

  await page.evaluate(()=>window.SCDExperience.setMode('FOCUS'));
  if(await page.evaluate(()=>document.body.dataset.scdExperience)!=='focus')throw new Error('Focus mode failed');
  await page.evaluate(()=>window.SCDExperience.setMode('QUICK'));
  if(await page.evaluate(()=>document.body.dataset.scdExperience)!=='quick')throw new Error('Quick mode failed');
  await page.evaluate(()=>window.SCDExperience.setMode('DISCOVER'));
  if(await page.evaluate(()=>document.body.dataset.scdExperience)!=='discover')throw new Error('Discover mode failed');

  mark('CALENDAR_'+viewport.width);
  await page.evaluate(()=>window.SCDNextGen.setView('calendar'));
  await page.waitForSelector('#view-calendar.active');
  await page.waitForSelector('#calendarPublicList');
  if(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+3))throw new Error('calendar view horizontal overflow');
  mark('TEAMS_'+viewport.width);
  await page.evaluate(()=>window.SCDNextGen.setView('teams'));
  await page.waitForSelector('#view-teams.active');
  await page.waitForSelector('#publicTeamsGrid');
  await page.waitForSelector('#followTeamSelect');
  if(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+3))throw new Error('teams view horizontal overflow');
  if((await page.locator('#calendarPeriod [data-period]').count())!==3)throw new Error('calendar period controls missing');
  if((await page.locator('#calendarTypeFilter option').count())<5)throw new Error('calendar type filters missing');
  await page.evaluate(()=>window.SCDNextGen.setView('pulse'));

  mark('TWIN_'+viewport.width);
  await page.evaluate(()=>window.SCDNextGen.setView('twin'));
  await page.waitForSelector('#view-twin.active .twin-stage');
  await page.waitForSelector('#twinLocker');
  const beforeXp=await page.locator('#twinXp').textContent();
  await page.click('#missionBtn');
  const afterXp=await page.locator('#twinXp').textContent();
  if(beforeXp===afterXp)throw new Error('Twin XP did not evolve');

  mark('PRIVATE_DESK_'+viewport.width);
  await page.evaluate(()=>window.SCDNextGen.setView('desk'));
  await page.waitForSelector('#view-desk.active .desk-hero');
  await page.waitForSelector('.service-dock');
  await page.waitForSelector('#privateDeskLoginForm');
  if((await page.locator('#deskScopeStatus').textContent())!=='ACCESSO RICHIESTO')throw new Error('Private Desk anonymous gate missing');

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

// Sponsor public journey: real browser interaction on desktop and mobile.
mark('SPONSOR_BROWSER_JOURNEY');
for(const viewport of [{width:390,height:844},{width:1440,height:900}]){
  const sponsor=await browser.newPage({viewport});
  const sponsorErrors=[];
  sponsor.on('pageerror',e=>sponsorErrors.push(String(e)));
  sponsor.on('console',m=>{if(m.type()==='error')sponsorErrors.push('console: '+m.text())});

  await sponsor.goto(base+'/sponsor/',{waitUntil:'domcontentloaded',timeout:30000});
  await sponsor.waitForSelector('.ledwall-launch');
  await sponsor.waitForSelector('.opportunity-grid.extended');
  await sponsor.waitForSelector('#ecosistema');
  await sponsor.waitForSelector('#convenzioni');

  await sponsor.click('[data-open="access"]');
  await sponsor.waitForSelector('#accessModal:not([hidden])');
  await sponsor.click('#accessModal [data-close]');
  await sponsor.waitForSelector('#accessModal',{state:'hidden'});

  const reservedHref=await sponsor.locator('.access-button').getAttribute('href');
  if(reservedHref!=='https://scd-colicoderviese-official-r21.onrender.com/sponsor/?login=1')throw new Error('reserved access direct link mismatch: '+reservedHref);
  const footerReserved=await sponsor.locator('.footer-actions a').getAttribute('href');
  if(footerReserved!==reservedHref)throw new Error('footer reserved access link mismatch');

  const overflow=await sponsor.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+3);
  if(overflow)throw new Error('sponsor public horizontal overflow '+viewport.width+'px');
  if(sponsorErrors.length)throw new Error('sponsor browser errors '+viewport.width+'px: '+sponsorErrors.join(' | '));

  await sponsor.screenshot({path:'test-output/sponsor-'+viewport.width+'x'+viewport.height+'.png',fullPage:true});
  await sponsor.close();
}

mark('API_CHECKS');
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

const pwaManifest=await api.request.get(base+'/manifest.webmanifest');
if(!pwaManifest.ok())throw new Error('manifest.webmanifest missing');
const pwaJson=await pwaManifest.json();
if(pwaJson.theme_color!=='#041c3a'||pwaJson.background_color!=='#f2f5f9')throw new Error('SCD Arena PWA colors missing');
for(const resource of ['/sw.js','/robots.txt','/sitemap.xml']){
  const rr=await api.request.get(base+resource);
  if(!rr.ok())throw new Error(resource+' missing');
}
await api.close();

if(allErrors.length)throw new Error('browser errors: '+allErrors.join(' || '));
console.log('SCD NOVA smoke PASS',{viewports:viewports.map(v=>v.width+'x'+v.height)});
await browser.close();
