import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.env.SCD_BASE_URL||'http://127.0.0.1:4177';
fs.mkdirSync('test-output',{recursive:true});
const browser=await chromium.launch({headless:true});
const days=(n)=>{
 const current=new Date();
 const date=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(current);
 const vals=Object.fromEntries(date.map(x=>[x.type,x.value]));
 const d=new Date(Date.UTC(+vals.year,+vals.month-1,+vals.day+n));
 return d.toISOString().slice(0,10);
};
const events=[
 {eventId:'SCD-TEST-001',title:'Partita Campionato U16 TEST',date:days(0),time:'17:30',team:'ColicoDerviese U16',opponent:'Avversario CI',venue:'Campo test Colico',type:'GARA',visibility:'PUBLIC',source:'R20_CI_FIXTURE'},
 {eventId:'SCD-TEST-002',title:'Allenamento Under 16 TEST',date:days(0),time:'19:30',team:'Under 16',venue:'Centro sportivo Colico',type:'TRAINING',visibility:'PUBLIC',source:'R20_CI_FIXTURE'},
 {eventId:'SECRET-999',title:'DOCUMENTO PERSONALE SEGRETO',date:days(0),time:'20:00',type:'EVENT',visibility:'PRIVATE',private:true,source:'R20_CI_FIXTURE'}
];
async function fakeAPI(page){
 await page.route('**/api/newsroom*',async route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({calendar:{rows:[]},upcomingEvents:[],cards:[],partners:[{name:'Partner CI autorizzato',status:'ACTIVE'}],publicProfiles:[],sportData:{results:[],standings:[]}})}));
 await page.route('**/api/scd*',async route=>{
  const raw=route.request().postData();
  let req={};try{req=JSON.parse(raw||'{}')}catch{}
  const data=req.action==='public.calendar'?{rows:events}:{};
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,data})});
 });
}
for(const [label,width,height] of [['mobile',390,844],['desktop',1440,900]]){
 const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1,reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await fakeAPI(page);
 const result=await page.goto(base+'/?scdVision=1#pulse',{waitUntil:'networkidle',timeout:30000});
 assert.equal(result.status(),200,label+' HTTP 200');
 const consentBanner=page.locator('#scdCookieBanner');
 if(await consentBanner.isVisible()){await page.getByRole('button',{name:'Solo necessari'}).click();await consentBanner.waitFor({state:'hidden'});}
 assert.equal(await consentBanner.isVisible(),false,'Analytics consent must be manageable without obstructing UI');
 await page.waitForTimeout(1700);
 const diag=await page.evaluate(()=>({url:location.href,ready:document.readyState,flag:new URLSearchParams(location.search).get('scdVision'),api:!!window.SCDNextGen,adapter:typeof window.SCDNextGen?.publicSnapshot,home:!!document.getElementById('scdOneHome'),root:!!document.getElementById('view-pulse'),scripts:[...document.scripts].map(x=>x.src.split('/').pop()).filter(x=>/scd|native/.test(x))}));
 console.log('NATIVE BOOT DIAGNOSTIC '+label+': '+JSON.stringify(diag)+' | errors='+JSON.stringify(errors));
 if(!diag.home){await page.screenshot({path:'test-output/scd-one-native-debug-'+label+'.png',fullPage:true,animations:'disabled'});throw new Error('SCD native mount unavailable: '+JSON.stringify(diag)+' '+errors.join('; '));}
 await page.locator('[data-testid="one-home"]').waitFor();
 await page.getByText('Avversario CI').first().waitFor({timeout:20000});
 assert.ok((await page.getByText('Partner CI autorizzato').count())>=1,'Partner from public newsroom absent');
 assert.equal(await page.getByText('DOCUMENTO PERSONALE SEGRETO').count(),0,'Private event leaked into Home');
 assert.equal(await page.locator('#scdOneHome img[src="./assets/logo-scd.png"]').count()>0,true);
 assert.ok(await page.locator('.scd-one-sky img').evaluate(e=>e.complete&&e.naturalWidth>0),'Original mascot unavailable');
 assert.ok(await page.locator('.scd-one-hero').evaluate(e=>getComputedStyle(e).backgroundColor!==''),'Hero failed');
 const measures=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,hero:Math.round(document.querySelector('.scd-one-hero').getBoundingClientRect().height),buttons:document.querySelectorAll('.scd-one-shortcuts button').length}));
 assert.ok(measures.overflow<=2,JSON.stringify(measures));
 assert.equal(measures.buttons,4,'Four user-approved quick actions expected');
 await page.screenshot({path:'test-output/scd-one-native-home-'+label+'.png',fullPage:true,animations:'disabled'});
 await page.locator('[data-scd-filter="TRAINING"]').first().click();
 await page.locator('[data-testid="one-calendar"]').waitFor();
 const publicRows=page.locator('#scdOneCalendar .scd-one-event-dataset');
 await publicRows.getByText('Allenamento Under 16 TEST').waitFor();
 assert.equal(await publicRows.getByText('Partita Campionato U16 TEST').count(),0,'Training filter not applied');
 assert.equal(await publicRows.getByText('DOCUMENTO PERSONALE SEGRETO').count(),0,'Private event leaked into Calendar');
 await page.locator('#scdOneCalendar [data-scd-clear-filter]').click();
 await publicRows.getByText('Partita Campionato U16 TEST').waitFor();
 await page.locator('#scdOneCalendar').getByRole('button',{name:'Mese',exact:true}).click();
 await page.locator('[data-scd-tab="MONTH"][aria-pressed="true"]').waitFor();
 await page.screenshot({path:'test-output/scd-one-native-calendar-'+label+'.png',fullPage:true,animations:'disabled'});
 await page.locator('#scdOneCalendar [data-scd-go="desk"]').click();
 assert.equal(await page.locator('body').evaluate(x=>x.classList.contains('scd-one-public-view')),false,'Private route inherited public chrome');
 assert.equal(await page.locator('#scdOneHome img').count()>0,true,'Original runtime should remain mounted, not destroyed');
 assert.deepEqual(errors,[],'JavaScript errors '+label+': '+errors.join('\n'));
 console.log('SCD ONE NATIVE '+label+' PASS - official assets, verified R20 records, private exclusion, filters, calendar, desktop response, existing CORE route');
 await page.close();
}
const original=await browser.newPage({viewport:{width:390,height:844}});
await fakeAPI(original);
await original.goto(base+'/#pulse',{waitUntil:'domcontentloaded'});
assert.equal(await original.locator('#scdOneHome').count(),0,'Flag absent: original public site should remain default');
console.log('SCD ONE DEFAULT UNCHANGED PASS');
await original.close();
await browser.close();
