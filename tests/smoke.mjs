import { chromium } from 'playwright';
import fs from 'node:fs';
fs.mkdirSync('test-output',{recursive:true});

const base=process.env.SCD_TEST_URL||'http://127.0.0.1:10000';
const viewports=[
  {width:360,height:800},
  {width:390,height:844},
  {width:393,height:852},
  {width:430,height:932}
];

const browser=await chromium.launch({headless:true});
const allErrors=[];

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

  await page.goto(base,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForSelector('#home');
  await page.waitForSelector('body.scd-ui-v21-11');
  await page.waitForSelector('.home-kpis');
  await page.waitForSelector('.mobile-nav [data-nav="calendar"]');
  if(viewport.width===390) await page.screenshot({path:'test-output/home-390x844.png',fullPage:true});
  await page.waitForFunction(()=>document.documentElement.scrollWidth<=window.innerWidth+3);
  await page.waitForSelector('#clubClock');
  await page.waitForFunction(()=>document.querySelector('#clubClock')?.textContent?.length>8);

  await page.locator('.mobile-nav [data-action="calendar"]').click();
  await page.waitForSelector('.calendar-app-screen');
  await page.waitForSelector('.calendar-tabs');
  await page.waitForSelector('#calendarRows');
  if(viewport.width===390) await page.screenshot({path:'test-output/calendar-390x844.png',fullPage:true});
  await page.click('#modalClose');

  await page.locator('[data-action="teams"]').first().click();
  await page.waitForSelector('.teams-app-screen');
  if(viewport.width===390) await page.screenshot({path:'test-output/teams-390x844.png',fullPage:true});
  await page.click('#modalClose');

  await page.evaluate(()=>openLocationHub());
  await page.waitForSelector('#locateMe');
  await page.click('#modalClose');

  await page.click('[data-action="sponsor"]');
  await page.waitForSelector('#publicActionForm');
  await page.click('#modalClose');

  await page.click('[data-action="avatar"]');
  await page.waitForSelector('#avatarPreview');
  await page.click('#modalClose');

  await page.click('[data-action="requests"]');
  await page.waitForSelector('#requestHistoryMount');
  await page.click('#modalClose');

  const safeBefore=apiActions.length;
  await page.locator('[data-action="safeguarding"]').first().click();
  await page.waitForSelector('#safeForm');
  await page.fill('#safeMessage','QA safeguarding local-only');
  await page.click('#safeForm button[type="submit"]');
  await page.waitForSelector('#safeStatus .status-box');
  const safeActions=apiActions.slice(safeBefore);
  if(safeActions.includes('safeguarding.submit')) throw new Error('safeguarding must not transit ordinary API');
  await page.click('#modalClose');

  await page.click('#mobileProfile');
  await page.waitForSelector('.profile-app-screen');
  await page.waitForSelector('.profile-hub-grid');
  if(viewport.width===390){
    await page.screenshot({path:'test-output/profile-390x844.png',fullPage:true});
    await page.click('#profileCommunications');
    await page.waitForSelector('.communications-app-screen');
    await page.screenshot({path:'test-output/communications-390x844.png',fullPage:true});
    await page.click('#modalClose');
    await page.click('#mobileProfile');
    await page.waitForSelector('.profile-app-screen');
  }
  await page.click('#profileR20');
  await page.waitForSelector('#mgmtLoginForm');
  await page.click('#modalClose');

  if(viewport.width===390){
    await page.evaluate(()=>{
      openManagementHome({
        user:{name:'QA SCD',email:'qa@example.test',role:'STAFF',area:'U16',staff:true},
        permissions:{direction:true,manageAccess:true},
        personal:[{firstName:'Atleta',lastName:'Test',teamName:'U16',figcStatus:'TESSERATO',certificateStatus:'VALIDO'}],
        teams:[{key:'U16',name:'U16 Elite'}],
        attendance:{teams:[{key:'U16',name:'U16 Elite'}]},
        roster:{U16:[{code:'P001',name:'Giocatore Test'}]},
        convocations:[{id:'CV1',team:'U16 Elite',date:'2026-10-01',meetingTime:'18:00',meetingPlace:'Colico',playerCode:'P001',response:'DA CONFERMARE'}],
        pendingPlayerAuthorizations:[{id:'AUTH1',player:'Giocatore Test',action:'COLLEGAMENTO',requester:'famiglia@example.test',motivation:'QA'}],
        direction:{requests:[{id:'R1',subject:'Richiesta test',status:'APERTA',team:'U16'}]},
        transport:{kpis:{requests:2}}
      });
    });
    await page.waitForSelector('.mgmt-grid');
    await page.waitForSelector('.mgmt-detail');
    await page.screenshot({path:'test-output/staff-direction-390x844.png',fullPage:true});

    await page.click('#mgmtAttendance');
    await page.waitForSelector('#attTeam');
    await page.click('#modalClose');

    await page.evaluate(()=>openManagementHome(state.privateData));
    await page.click('#mgmtConvocations');
    await page.waitForSelector('#convForm');
    await page.click('#modalClose');

    await page.evaluate(()=>openManagementHome(state.privateData));
    await page.click('#mgmtNewRequest');
    await page.waitForSelector('#internalRequestForm');
    await page.click('#modalClose');

    await page.evaluate(()=>openManagementHome(state.privateData));
    await page.click('#mgmtPin');
    await page.waitForSelector('#pinForm');
    await page.click('#modalClose');

    await page.evaluate(()=>openManagementHome(state.privateData));
    await page.click('#mgmtAccess');
    await page.waitForSelector('#accessForm');
    await page.click('#modalClose');
  }

  if(errors.length) allErrors.push(viewport.width+'x'+viewport.height+': '+errors.join(' | '));
  await page.close();
}

const api=await browser.newPage();
const health=await api.request.get(base+'/health');
if(!health.ok()) throw new Error('health endpoint failed '+health.status());
const time=await api.request.get(base+'/api/time');
if(!time.ok()) throw new Error('time endpoint failed '+time.status());
const timeJson=await time.json();
if(timeJson.timeZone!=='Europe/Rome'||!timeJson.epochMs) throw new Error('invalid authoritative time payload');
const robots=await api.request.get(base+'/robots.txt');
if(!robots.ok()) throw new Error('robots.txt missing');
const sitemap=await api.request.get(base+'/sitemap.xml');
if(!sitemap.ok()) throw new Error('sitemap.xml missing');
await api.close();

if(allErrors.length) throw new Error('browser errors: '+allErrors.join(' || '));
console.log('SCD smoke PASS', {viewports:viewports.map(v=>v.width+'x'+v.height)});
await browser.close();
