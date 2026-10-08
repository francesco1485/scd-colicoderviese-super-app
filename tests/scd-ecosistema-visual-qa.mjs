import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const file=path.resolve('test-output/scd-ecosistema/scd-ecosistema-interattivo.html');
assert(fs.existsSync(file),'build offline review before visual QA');
const html=fs.readFileSync(file,'utf8');
const viewports={PHONE:{width:390,height:844},TABLET:{width:820,height:1180},DESKTOP:{width:1440,height:900}};
const browser=await chromium.launch({headless:true});
const outputs=[];
try{
 for(const [name,viewport] of Object.entries(viewports)){
  const page=await browser.newPage({viewport,reducedMotion:'reduce'});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.setContent(html,{waitUntil:'load'});
  assert.equal(await page.locator('[data-platform="universe"]').isVisible(),true,'Universe must be public first '+name);
  assert.equal(await page.locator('[data-platform="sponsor"]').isVisible(),false,'Sponsor preview initially hidden '+name);
  assert.equal(await page.locator('[data-platform="gestionale"]').isVisible(),false,'Management preview initially hidden '+name);
  assert.equal(await page.locator('[data-assistant-open]').count(),2,'same assistant launch from global and hero');
  const imgs=await page.locator('img').evaluateAll(nodes=>nodes.map(x=>({alt:x.alt,loaded:x.complete&&x.naturalWidth>0})));
  assert(imgs.every(x=>x.loaded),'official logo/Sky failed to load '+name+': '+JSON.stringify(imgs));
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1);
  assert.equal(overflow,false,'horizontal overflow on Universe '+name);
  await page.screenshot({path:path.join(path.dirname(file),name.toLowerCase()+'-universe.png'),fullPage:true});
  const buttons=page.locator('.filter-bar [data-filter]');
  await buttons.nth(1).click();
  assert.equal(await page.locator('.feature-card[data-category="community"]').first().isVisible(),false,'sport filter failed');
  await buttons.nth(0).click();
  assert.equal(await page.locator('.feature-card[data-category="community"]').first().isVisible(),true,'filter reset failed');
  await page.locator('[data-switch="sponsor"]').click();
  assert.equal(await page.locator('[data-platform="sponsor"]').isVisible(),true,'Sponsor switch failed '+name);
  assert.equal(await page.locator('[data-switch="sponsor"]').getAttribute('aria-current'),'page');
  assert.equal(await page.locator('[data-platform="universe"]').isVisible(),false,'Universe should hide after sponsor switch');
  await page.screenshot({path:path.join(path.dirname(file),name.toLowerCase()+'-sponsor.png'),fullPage:true});
  await page.locator('.assistant-launch').click();
  assert.equal(await page.locator('#assistantDialog').isVisible(),true,'assistant must open '+name);
  await page.locator('#assistantInput').fill('Come divento sponsor?');
  await page.locator('#assistantForm button[type="submit"]').click();
  const answer=await page.locator('#assistantMessages .bubble.bot').last().innerText();
  assert(answer.includes('sportclubcolico@gmail.com'),'safe guidance missing '+name);
  await page.screenshot({path:path.join(path.dirname(file),name.toLowerCase()+'-assistant.png'),fullPage:false});
  await page.locator('#assistantClose').click();
  await page.locator('[data-switch="gestionale"]').click();
  assert.equal(await page.locator('[data-platform="gestionale"]').isVisible(),true,'Management switch failed '+name);
  assert.equal(await page.locator('[data-platform="sponsor"]').isVisible(),false,'Sponsor must hide '+name);
  await page.locator('[data-role="family"]').click();
  assert((await page.locator('#roleSummary').innerText()).includes('Genitori e tutori'),'role panel not interactive');
  await page.locator('#reservedInfo').click();
  assert(await page.locator('#reservedDialog').isVisible(),'reserved explanation missing');
  await page.locator('#reservedClose').click();
  assert(!(await page.locator('#reservedDialog').isVisible()),'reserved dialog failed to close');
  await page.screenshot({path:path.join(path.dirname(file),name.toLowerCase()+'-gestionale.png'),fullPage:true});
  await page.locator('.assistant-launch').click();
  assert.equal(await page.locator('#assistantMessages .bubble.bot').count(),2,'assistant history should persist across switching '+name);
  await page.locator('#assistantClose').click();
  const finalOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1);
  assert.equal(finalOverflow,false,'management horizontal overflow '+name);
  assert.deepEqual(errors,[],'runtime console errors '+name);
  await page.close();
  outputs.push(name);
 }
 console.log('SCD_ECOSYSTEM_INTERACTIVE_VISUAL_QA_PASS',JSON.stringify({viewports:outputs,views:9,sharedAssistant:3,realOfficialAssets:true}));
}finally{
 await browser.close();
}
