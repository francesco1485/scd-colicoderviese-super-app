import { chromium } from 'playwright';
import fs from 'node:fs';

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
const routeToView={home:'pulse',calendar:'calendar',teams:'teams',social:'social',profile:'twin'};
fs.mkdirSync('test-output/one-01',{recursive:true});

function assert(condition,message){
  if(!condition)throw new Error(message);
}
async function overflowDiagnostics(page){
  return page.evaluate(()=>{
    const vw=window.innerWidth;
    const rows=[...document.querySelectorAll('body *')].map(el=>{
      const r=el.getBoundingClientRect();
      return {tag:el.tagName,id:el.id||'',cls:String(el.className||'').slice(0,120),left:Math.round(r.left),right:Math.round(r.right),width:Math.round(r.width)};
    }).filter(x=>x.width>0&&(x.right>vw+3||x.left< -3))
      .sort((a,b)=>Math.max(b.right-vw,-b.left)-Math.max(a.right-vw,-a.left))
      .slice(0,12);
    return {viewport:vw,scrollWidth:document.documentElement.scrollWidth,rows};
  });
}

const browser=await chromium.launch({headless:true});
for(const viewport of viewports){
  const page=await browser.newPage({viewport});
  const pageErrors=[];
  page.on('pageerror',error=>pageErrors.push(String(error)));

  if([390,1440].includes(viewport.width)){
    await page.goto(base+'/#twin',{waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForSelector('#view-twin.active');
    assert(new URL(page.url()).hash==='#profile','legacy deep link must canonicalize to #profile');

    await page.goto(base+'/#teams?team=__SCD_TEST_UNKNOWN__',{waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForSelector('#view-teams.active');
    assert(new URL(page.url()).hash==='#teams?team=__SCD_TEST_UNKNOWN__','team deep-link query must remain stable');
  }

  await page.goto(base+'/#home',{waitUntil:'domcontentloaded',timeout:30000});
  const banner=page.locator('#scdCookieBanner:not([hidden])');
  if(await banner.count()){
    const reject=page.locator('#scdAnalyticsReject');
    if(await reject.count())await reject.click();
  }

  await page.waitForSelector('#view-pulse.active');
  await page.waitForSelector('.bottom-nav');
  await page.waitForSelector('#pulseNow');
  await page.waitForSelector('#pulseNext');
  await page.waitForSelector('#pulseChanged');
  await page.waitForSelector('#pulseAttention');

  const navRoutes=await page.locator('.bottom-nav [data-route]').evaluateAll(nodes=>nodes.map(node=>node.dataset.route));
  assert(JSON.stringify(navRoutes)===JSON.stringify(['home','calendar','teams','social','profile']),'canonical navigation order mismatch '+JSON.stringify(navRoutes));

  const palette=await page.evaluate(()=>({
    deep:getComputedStyle(document.documentElement).getPropertyValue('--r57-deep').trim(),
    gold:getComputedStyle(document.documentElement).getPropertyValue('--r57-gold').trim(),
    cyan:getComputedStyle(document.documentElement).getPropertyValue('--r57-cyan').trim()
  }));
  assert(palette.deep==='#031A35','canonical navy missing '+JSON.stringify(palette));
  assert(palette.gold==='#FFD500','canonical gold missing '+JSON.stringify(palette));
  assert(palette.cyan==='#20B7E6','canonical cyan missing '+JSON.stringify(palette));

  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+3);
  if(overflow){
    const diag=await overflowDiagnostics(page);
    throw new Error('horizontal overflow on '+viewport.width+'x'+viewport.height+' '+JSON.stringify(diag));
  }

  const navBox=await page.locator('.bottom-nav').boundingBox();
  assert(navBox,'navigation box missing');
  if(viewport.width<=900){
    assert(navBox.width<=viewport.width-8,'mobile nav too wide '+JSON.stringify(navBox));
    assert(navBox.y>viewport.height/2,'mobile nav is not a bottom navigation '+JSON.stringify(navBox));
  }else{
    assert(navBox.x<110,'desktop navigation must be a left command rail '+JSON.stringify(navBox));
    assert(navBox.height>navBox.width,'desktop command rail must be vertical '+JSON.stringify(navBox));
  }

  for(const [route,view] of Object.entries(routeToView)){
    await page.click('.bottom-nav [data-route="'+route+'"]');
    await page.waitForSelector('#view-'+view+'.active');
    const routeOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+3);
    if(routeOverflow){
      const diag=await overflowDiagnostics(page);
      throw new Error('horizontal overflow in '+route+' at '+viewport.width+'x'+viewport.height+' '+JSON.stringify(diag));
    }
  }

  await page.click('.bottom-nav [data-route="social"]');
  await page.waitForSelector('#view-social.active');
  await page.waitForSelector('.social-main');
  const socialBackground=await page.locator('.social-main').evaluate(el=>getComputedStyle(el).backgroundImage+' '+getComputedStyle(el).backgroundColor);
  assert(!/rgb\(255,\s*255,\s*255\)/.test(socialBackground),'legacy white Social surface still active');

  await page.click('.bottom-nav [data-route="home"]');
  await page.waitForSelector('#view-pulse.active');

  await page.screenshot({path:'test-output/one-01/home-'+viewport.width+'x'+viewport.height+'.png',fullPage:true});
  if([390,1440].includes(viewport.width)){
    await page.click('.bottom-nav [data-route="social"]');
    await page.waitForSelector('#view-social.active');
    await page.screenshot({path:'test-output/one-01/social-'+viewport.width+'x'+viewport.height+'.png',fullPage:true});

    await page.click('.bottom-nav [data-route="profile"]');
    await page.waitForSelector('#view-twin.active');
    await page.waitForSelector('#profileCommand');
    await page.screenshot({path:'test-output/one-01/profile-'+viewport.width+'x'+viewport.height+'.png',fullPage:true});
  }

  assert(pageErrors.length===0,'page errors '+viewport.width+'x'+viewport.height+': '+pageErrors.join(' | '));
  await page.close();
}
await browser.close();
console.log('SCD ONE VISUAL QA PASS',viewports.map(v=>v.width+'x'+v.height));
