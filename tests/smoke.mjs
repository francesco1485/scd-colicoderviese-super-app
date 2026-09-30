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
  {width:1440,height:900}
];

const browser=await chromium.launch({headless:true});
const allErrors=[];

async function goRoute(page,route){
  await page.evaluate(r=>window.R24.go(r),route);
  await page.waitForFunction(r=>location.hash==='#/'+r,route);
  if(route==='pulse')await page.waitForSelector('#appRouteView:not([hidden]) .r38-universe');
  else if(route==='home')await page.waitForSelector('#appRouteView:not([hidden]) .r24-home-hero');
  else await page.waitForSelector('#appRouteView:not([hidden]) .r24-screen-head');
}

for(const viewport of viewports){
  const page=await browser.newPage({viewport});
  const errors=[];
  const apiActions=[];
  page.on('request',req=>{
    if(req.method()==='POST'&&req.url().includes('/api/scd')){
      try{apiActions.push(JSON.parse(req.postData()||'{}').action||'')}catch{}
    }
  });
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('console',msg=>{if(msg.type()==='error')errors.push('console: '+msg.text())});

  await page.goto(base+'#/pulse',{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForSelector('body.r24-router-ready');
  await page.waitForSelector('#appRouteView:not([hidden]) .r38-universe');
  await page.waitForSelector('.r38-hero');
  await page.waitForSelector('.r38-sponsor-rail');
  await page.waitForSelector('.r38-worlds');
  await page.waitForSelector('.r38-twin-card');
  await page.waitForSelector('.r38-mirror');
  await page.waitForSelector('.r38-fan-lab');
  await page.waitForSelector('.mobile-nav [data-nav="calendar"]',{state:'attached'});
  await page.waitForSelector('#clubClock',{state:'attached'});
  await page.waitForFunction(()=>document.querySelector('#clubClock')?.textContent?.length>8);
  await page.waitForFunction(()=>document.documentElement.scrollWidth<=window.innerWidth+3);
  await page.waitForFunction(()=>Boolean(window.SCDMeta)&&Boolean(window.SCDTwin));
  const metaMode=await page.evaluate(()=>window.SCDMeta.snapshot('base').mode);
  if(metaMode!=='PRIVACY_FIRST_ON_DEVICE')throw new Error('SCD Meta privacy mode missing');

  if(viewport.width===390)await page.screenshot({path:'test-output/r38-universe-390x844.png',fullPage:true});
  if(viewport.width===1440){
    const shellWidth=await page.locator('.app-shell').evaluate(el=>Math.round(el.getBoundingClientRect().width));
    if(shellWidth<1200)throw new Error('desktop app shell is still phone-sized: '+shellWidth+'px');
    await page.screenshot({path:'test-output/r38-universe-desktop-1440x900.png',fullPage:true});
  }

  // Legacy R24 home remains available during migration, but Pulse is the default entry.
  await goRoute(page,'home');
  await page.waitForSelector('.r24-home-kpis');
  if(viewport.width===390)await page.screenshot({path:'test-output/r24-home-legacy-390x844.png',fullPage:true});

  await goRoute(page,'calendar');
  await page.waitForSelector('#r24CalendarRows');
  await page.waitForSelector('.r24-segment [data-cal-filter="ALL"]');
  if(viewport.width===390)await page.screenshot({path:'test-output/r24-calendar-390x844.png',fullPage:true});
  if(viewport.width===1440)await page.screenshot({path:'test-output/r24-calendar-desktop-1440x900.png',fullPage:true});

  await goRoute(page,'communications');
  await page.waitForSelector('.r24-important');
  await page.waitForSelector('.r24-comms-list');
  if(viewport.width===390)await page.screenshot({path:'test-output/r24-communications-390x844.png',fullPage:true});

  await goRoute(page,'services');
  await page.waitForSelector('.r24-service-grid');
  if(viewport.width===390)await page.screenshot({path:'test-output/r24-services-390x844.png',fullPage:true});

  // Secondary public team flow remains available as a detail modal.
  await page.evaluate(()=>openTeams());
  await page.waitForSelector('.teams-app-screen');
  await page.click('#modalClose');

  await goRoute(page,'profile');
  await page.waitForSelector('#r24ProfileAvatar');
  await page.click('#r24ProfileAvatar');
  await page.waitForSelector('#avatarPreview');
  await page.click('#modalClose');

  await goRoute(page,'profile');
  await page.click('#r24ProfileRequests');
  await page.waitForSelector('#requestHistoryMount');
  await page.click('#modalClose');

  await goRoute(page,'profile');
  await page.click('#r24ProfileLink');
  await page.waitForSelector('#tesseratoLinkForm');
  if(viewport.width===390)await page.screenshot({path:'test-output/r24-tesserato-onboarding-390x844.png',fullPage:true});
  await page.click('#tlCancel');

  await goRoute(page,'profile');
  await page.waitForSelector('a[href*="delete-account.html"]');
  const deleteHref=await page.locator('a[href*="delete-account.html"]').getAttribute('href');
  if(!deleteHref||!deleteHref.includes('delete-account.html'))throw new Error('account deletion path missing');
  if(viewport.width===390)await page.screenshot({path:'test-output/r24-profile-390x844.png',fullPage:true});

  const safeBefore=apiActions.length;
  await goRoute(page,'services');
  await page.click('#r24Safeguarding');
  await page.waitForSelector('#safeForm');
  await page.fill('#safeMessage','QA safeguarding local-only');
  await page.click('#safeForm button[type="submit"]');
  await page.waitForSelector('#safeStatus .status-box');
  const safeActions=apiActions.slice(safeBefore);
  if(safeActions.includes('safeguarding.submit'))throw new Error('safeguarding must not transit ordinary API');
  await page.click('#modalClose');

  // Login entry remains wired to R20 auth.
  await goRoute(page,'profile');
  await page.click('#r24ProfileLogin');
  await page.waitForSelector('#mgmtLoginForm');
  await page.click('#modalClose');

  if(viewport.width===390){
    await page.evaluate(()=>{
      state.sessionToken='qa-session';
      state.featureFlags={...state.featureFlags,dataFabricObservability:true};
      state.privateData={
        user:{name:'QA SCD',email:'qa@example.test',role:'STAFF',area:'U16',staff:true},
        permissions:{direction:true,manageAccess:true},
        personal:[
          {code:'P001',firstName:'Luca',lastName:'Test',teamName:'U16 Elite',figcStatus:'TESSERATO',certificateStatus:'VALIDO',paymentStatus:'REGOLARE'},
          {code:'P002',firstName:'Emma',lastName:'Test',teamName:'U12',figcStatus:'TESSERATA',certificateStatus:'VALIDO',paymentStatus:'REGOLARE'}
        ],
        teams:[{key:'U16',name:'U16 Elite'}],
        attendance:{teams:[{key:'U16',name:'U16 Elite'}]},
        roster:{U16:[{code:'P001',name:'Giocatore Test'}]},
        convocations:[{id:'CV1',team:'U16 Elite',date:'2026-10-01',meetingTime:'18:00',meetingPlace:'Colico',playerCode:'P001',response:'DA CONFERMARE'}],
        pendingPlayerAuthorizations:[{id:'AUTH1',player:'Giocatore Test',action:'COLLEGAMENTO',requester:'famiglia@example.test',motivation:'QA'}],
        direction:{requests:[{id:'R1',subject:'Richiesta test',status:'APERTA',team:'U16'}]},
        transport:{kpis:{requests:2}}
      };
      window.R24.go('staff');
    });
    await page.waitForSelector('.r24-service-grid.staff');
    await page.waitForSelector('#r24Attendance');
    await page.waitForSelector('#r28DataFabric');
    await page.screenshot({path:'test-output/r28-staff-direction-390x844.png',fullPage:true});

    await page.evaluate(()=>{
      window.mgmtApi=async(action)=>{
        if(action==='direction.datafabric.status')return {
          ok:true,release:'R25',checkedAt:'2026-09-29T17:30:00.000Z',
          counts:{emailArchive:120,classifier:118,actionQueue:9,driveCatalog:44,sourceRegistry:12,eventKernel:301},
          policy:{criticalChanges:'HUMAN_CONFIRMATION_REQUIRED',destructiveAutoWrite:false,safeguarding:'ISOLATED'},
          observability:{
            gmail:{status:'OK',lastSync:'2026-09-29T17:15:00.000Z',lastSuccess:'2026-09-29T17:15:00.000Z',lastError:''},
            drive:{status:'OK',lastSync:'2026-09-29T17:00:00.000Z',lastSuccess:'2026-09-29T17:00:00.000Z',lastError:''}
          },
          provenance:{
            gmail:{source:'SCD_GMAIL',table:'01_EMAIL_ARCHIVE',field:'UID',api:'direction.datafabric.scan.gmail',fallback:'NO_WRITE',refresh:'15m'},
            drive:{source:'SCD_DRIVE',table:'DRIVE AGGIORNAMENTI',field:'ID DRIVE',api:'direction.datafabric.scan.drive',fallback:'NO_WRITE',refresh:'1h'}
          }
        };
        return {};
      };
    });
    await page.click('#r28DataFabric');
    await page.waitForSelector('#r28FabricRows [data-r28-provenance]');
    await page.screenshot({path:'test-output/r28-data-fabric-390x844.png',fullPage:true});
    await page.click('#modalClose');

    await goRoute(page,'family');
    await page.waitForSelector('.r24-family-strip');
    await page.screenshot({path:'test-output/r24-family-390x844.png',fullPage:true});

    await goRoute(page,'athlete');
    await page.waitForSelector('.r24-athlete-hero');
    await page.screenshot({path:'test-output/r24-athlete-390x844.png',fullPage:true});

    await goRoute(page,'staff');
    await page.click('#r24Attendance');
    await page.waitForSelector('#attTeam');
    await page.click('#modalClose');

    await goRoute(page,'staff');
    await page.click('#r24Convocations');
    await page.waitForSelector('#convForm');
    await page.click('#modalClose');

    await goRoute(page,'staff');
    await page.click('#r24Messages');
    await page.waitForSelector('#msgForm');
    await page.click('#modalClose');

    await goRoute(page,'staff');
    await page.click('#r24Access');
    await page.waitForSelector('#accessForm');
    await page.click('#modalClose');
  }

  if(errors.length)allErrors.push(viewport.width+'x'+viewport.height+': '+errors.join(' | '));
  await page.close();
}

const api=await browser.newPage();
const health=await api.request.get(base+'/health');
if(!health.ok())throw new Error('health endpoint failed '+health.status());
const capabilities=await api.request.get(base+'/api/capabilities');
if(!capabilities.ok())throw new Error('capabilities endpoint failed '+capabilities.status());
const capabilitiesJson=await capabilities.json();
if(typeof capabilitiesJson.featureFlags?.dataFabricObservability!=='boolean')throw new Error('dataFabricObservability feature flag missing');
const time=await api.request.get(base+'/api/time');
if(!time.ok())throw new Error('time endpoint failed '+time.status());
const timeJson=await time.json();
if(timeJson.timeZone!=='Europe/Rome'||!timeJson.epochMs)throw new Error('invalid authoritative time payload');
const robots=await api.request.get(base+'/robots.txt');
if(!robots.ok())throw new Error('robots.txt missing');
const sitemap=await api.request.get(base+'/sitemap.xml');
if(!sitemap.ok())throw new Error('sitemap.xml missing');
const deletePage=await api.request.get(base+'/delete-account.html');
if(!deletePage.ok())throw new Error('delete-account.html missing');
const deleteHtml=await deletePage.text();
if(!deleteHtml.includes('deleteForm')||!deleteHtml.includes('ELIMINAZIONE ACCOUNT'))throw new Error('invalid account deletion resource');
await api.close();

if(allErrors.length)throw new Error('browser errors: '+allErrors.join(' || '));
console.log('SCD R38 smoke PASS',{viewports:viewports.map(v=>v.width+'x'+v.height)});
await browser.close();
