import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const host=process.env.SCD_BASE_URL||'http://127.0.0.1:4173';
fs.mkdirSync('test-output',{recursive:true});
const browser=await chromium.launch({headless:true});
for (const [name,width,height] of [['mobile',390,844],['desktop',1440,900]]) {
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1,reducedMotion:'reduce'});
  const errors=[]; page.on('pageerror',e=>errors.push(String(e)));
  const res=await page.goto(host+'/vision-2026',{waitUntil:'networkidle',timeout:30000});
  assert.equal(res.status(),200);
  await page.getByRole('heading',{name:'Questa settimana'}).waitFor();
  await page.locator('[data-testid="sky-original"]').waitFor();
  for(const sel of ['[data-testid="sky-original"]','.scd-f-brand img']) {
    assert.ok(await page.locator(sel).evaluate(x=>x.complete&&x.naturalWidth>0),'Official image missing '+sel);
  }
  const measurements=await page.evaluate(()=>{
    const classes=['.scd-f-cover','.scd-f-quick','.scd-f-match','.scd-f-promos','.scd-f-sponsors','.scd-f-territory'];
    return {
      overflow:document.documentElement.scrollWidth-innerWidth,
      regions:classes.map(c=>{const e=document.querySelector(c);return {name:c,top:e.getBoundingClientRect().top,bottom:e.getBoundingClientRect().bottom,height:e.getBoundingClientRect().height};}),
      heroText:document.querySelector('.scd-f-headline h1').textContent
    };
  });
  assert.ok(measurements.overflow<=2,'Horizontal scroll '+name+' '+measurements.overflow);
  measurements.regions.forEach((e,i)=>assert.ok(e.height>20,'Missing/flattened '+e.name));
  console.log('BOARD_GEOMETRY '+name+' '+JSON.stringify(measurements.regions));
  await page.screenshot({path:'test-output/scd-one-viewport-'+name+'-'+width+'x'+height+'.png',fullPage:false});
  await page.screenshot({path:'test-output/scd-one-home-'+name+'-'+width+'x'+height+'.png',fullPage:true});
  if(name==='mobile') {
    const a=measurements.regions;
    for(let i=1;i<a.length;i++)assert.ok(a[i].top>=a[i-1].top-1,'Wrong mobile board order '+a[i].name);
    assert.ok(a[0].height>=250&&a[0].height<=360,'Hero proportions differ from primary board');
    assert.ok(a[1].height>=75&&a[1].height<=125,'Four shortcuts must be single compact row');
    assert.ok(a[2].height>=120&&a[2].height<=250,'Match module proportions out of range');
    assert.ok(a[3].height>=70&&a[3].height<=140,'Initiative modules proportions out of range');
    assert.ok(a[4].height>=85&&a[4].height<=155,'Sponsor bar proportions out of range');
    assert.ok(a[5].height>=110&&a[5].height<=240,'Territory module proportions out of range');
  }

  await page.locator('[data-testid="quick-allenamenti"]').click();
  await page.locator('[data-testid="activity-panel"]').getByText('Allenamenti · In aggiornamento').waitFor();
  await page.locator('[data-testid="quick-allenamenti"]').click();
  assert.equal(await page.locator('[data-testid="activity-panel"]').count(),0);
  await page.locator('[data-testid="sky-open"]').click();
  await page.getByRole('dialog').getByRole('heading',{name:'Ciao, sono Sky!'}).waitFor();
  await page.getByRole('button',{name:'Ho capito'}).click();
  assert.equal(await page.getByRole('dialog').count(),0);
  const nav='[data-testid="'+(name==='mobile'?'mobile-nav-':'nav-')+'calendar"]';
  await page.locator(nav).click();
  await page.getByRole('heading',{name:'Calendario'}).waitFor();
  const before=await page.locator('[data-testid="week-label"]').innerText();
  await page.getByRole('button',{name:'Settimana successiva'}).click();
  const after=await page.locator('[data-testid="week-label"]').innerText();
  assert.notEqual(before,after,'Week navigator is inert');
  await page.locator('[data-testid="'+(name==='mobile'?'mobile-nav-':'nav-')+'home"]').click();
  await page.getByRole('heading',{name:'Questa settimana'}).waitFor();
  assert.deepEqual(errors,[],'Runtime JS errors');
  console.log('SCD 1:1 HOME '+name+': original assets, mobile board structure, responsive, quick actions, Sky, calendar nav, week change, screenshot PASS; regions='+JSON.stringify(measurements.regions.map(z=>Math.round(z.height))));
  await page.close();
}
await browser.close();
