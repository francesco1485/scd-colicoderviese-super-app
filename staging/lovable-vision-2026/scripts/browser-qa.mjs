import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.env.SCD_BASE_URL||'http://127.0.0.1:4173';
const scenarios=[
 ['home','Questa settimana'],
 ['calendar','Calendario'],
 ['athlete','Area Atleta'],
 ['family','Area Riservata'],
 ['staff','Area Staff'],
 ['communications','Comunicazioni']
];
const b=await chromium.launch({headless:true});
fs.mkdirSync('test-output',{recursive:true});
let n=0;
for(const [screen,title] of scenarios){
 const page=await b.newPage({viewport:{width:390,height:900},deviceScaleFactor:1,reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 const response=await page.goto(base+'/vision-2026?screen='+screen,{waitUntil:'networkidle',timeout:30000});
 assert.equal(response.status(),200,'HTTP 200 '+screen);
 const phone=page.locator('[data-testid="phone"]');
 await phone.waitFor();
 const screenshotText=await phone.innerText();
 assert.ok(screenshotText.includes(title),'Real screen was not rendered: '+screen);
 assert.ok(screenshotText.includes(screen==='staff'?'Dashboard':'Home')&&screenshotText.includes(screen==='staff'?'Comunicazioni':'Calendario'),'Navigation missing in '+screen);
 assert.equal(await phone.locator('img').count()>=1,true,'Official image expected in '+screen);
 assert.ok(await phone.locator('img').first().evaluate(el=>el.complete&&el.naturalWidth>0),'Official crest fails '+screen);
 assert.ok((await phone.boundingBox()).width>320,'Phone too narrow in '+screen);
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
 assert.ok(overflow<=2,'Horizontal overflow in '+screen+': '+overflow);
 await phone.screenshot({path:'test-output/SCD-'+screen+'-mobile-phone.png',animations:'disabled'});
 n++;
 if(screen==='home'){
  assert.equal(await phone.locator('.scd6-quick').count(),4);
  await page.getByRole('button',{name:'Apri Sky'}).click();
  await page.getByRole('dialog').getByText('Sky, assistente virtuale').waitFor();
  await page.getByRole('dialog').getByRole('button',{name:'Chiudi dettaglio'}).click();
  await page.locator('[data-testid="bottom-calendar"]').click();
  assert.ok((await phone.innerText()).includes('7 – 13 Aprile 2025'),'Home -> Calendar failed');
 }
 if(screen==='calendar'){
  await page.getByRole('button',{name:'Settimana successiva'}).click();
  assert.ok((await page.locator('.scd6-weekpicker').innerText()).includes('Settimana successiva'));
  await page.getByRole('button',{name:'Settimana precedente'}).click();
  await page.getByRole('button',{name:'Mese',exact:true}).click();
  assert.equal(await page.locator('.scd6-calendar-month').count(),1);
 }
 if(screen==='athlete'){
  await page.getByRole('button',{name:'Famiglia',exact:true}).click();
  assert.ok((await page.locator('.scd6-minor-header').first().innerText()).includes('nostri figli'));
 }
 if(screen==='family'){
  await page.getByRole('button',{name:'Paga ora'}).click();
  await page.getByRole('dialog').getByText('Pagamento quote').waitFor();
  await page.getByRole('dialog').getByRole('button',{name:'Chiudi dettaglio'}).click();
 }
 if(screen==='staff'){assert.equal(await phone.locator('.scd6-statsrow button').count(),4);}
 if(screen==='communications'){
  await page.getByRole('button',{name:'Social',exact:true}).click();
  assert.ok((await page.locator('.scd6-other-tab').innerText()).includes('Social'));
 }
 assert.deepEqual(errors,[],'Browser JavaScript errors '+screen);
 console.log('SCD SIX MOBILE '+screen+' PASS: original logo, correct section, no overflow, real navigation, PNG');
 await page.close();
}
const desktop=await b.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1,reducedMotion:'reduce'});
const response=await desktop.goto(base+'/vision-2026?screen=home',{waitUntil:'networkidle'});
assert.equal(response.status(),200);
assert.ok((await desktop.locator('.scd6-stage-content').boundingBox()).width>450);
await desktop.screenshot({path:'test-output/SCD-six-desktop-stage.png',fullPage:true,animations:'disabled'});
await desktop.getByTestId('pick-staff').click();
assert.ok((await desktop.locator('.scd6-staffhero').innerText()).includes('Area Staff'));
await desktop.screenshot({path:'test-output/SCD-staff-desktop-stage.png',fullPage:true,animations:'disabled'});
assert.equal(await desktop.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false,'Desktop overflow');
console.log('SCD SIX DESKTOP PASS: responsive single-screen application + switcher');
await desktop.close();
await b.close();
console.log('SCD SIX total screenshots='+String(n+2)+'; no fabrication of live data; production unchanged');
