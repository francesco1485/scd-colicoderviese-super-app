import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const labPath=path.join(root,'docs/visual-lab/gestionale-foundation.html');
const outputDir=path.join(root,'test-output/gestionale-visual-foundation');
const viewports={PHONE_COMPACT:[360,800],PHONE:[390,844],TABLET:[820,1180],DESKTOP:[1440,1000],WIDE:[1920,1080]};
const templates=['T01_PUBLIC_EDITORIAL','T02_OPERATIONAL_HOME','T03_DOMAIN_HUB','T04_ENTITY_DETAIL','T05_SPATIAL_WORKSPACE','T06_COMMUNICATION_HUB','T07_DATA_FINANCE','T08_PROJECT_DEVELOPMENT'];
const primitives=['PERSON_TOKEN','PLAYER_TOKEN','TEAM_BADGE','ROLE_BADGE','NUMBER_BADGE','STATUS_CHIP','SOURCE_BADGE','CONSENT_BADGE','LOGO_LOCKUP','FACE_AVATAR','JERSEY_TOKEN','VEHICLE_TOKEN','SEAT_SLOT','LOCKER_SLOT','ROOM_SLOT','FIELD_ZONE','ASSET_TOKEN','WAREHOUSE_LOCATION','DOCUMENT_CHIP','PAYMENT_CHIP','MESSAGE_BUBBLE','NOTIFICATION_ITEM','TIMELINE_ITEM','ACTION_BUTTON','AI_SUGGESTION','PROVENANCE_TAG','WARNING_BLOCK_STATE','AVAILABILITY_INDICATOR','ASSIGNMENT_HANDLE','QR_BARCODE_OBJECT','MEDIA_TILE'];
function assert(c,m){if(!c)throw new Error(m)}
function staticAssertions(){
  assert(fs.existsSync(labPath),'visual lab file missing');
  const html=fs.readFileSync(labPath,'utf8');
  for(const id of templates)assert(html.includes(`data-scd-template="${id}"`),'template missing '+id);
  for(const id of primitives)assert(html.includes(`data-scd-primitive="${id}"`),'primitive missing '+id);
  assert(html.includes('DEMO_NOT_RUNTIME · NESSUN DATO SPORTIVO REALE'),'demo runtime warning missing');
  assert((html.match(/data-entity-id="PLAYER-DEMO-09"/g)||[]).length>=3,'player demo semantic reuse missing');
  const t01=html.split('data-scd-template="T01_PUBLIC_EDITORIAL"')[1]?.split('data-scd-template="T02_OPERATIONAL_HOME"')[0]||'';
  assert(!t01.includes('scd-vf-payment'),'public editorial template leaks payment component');
  const buttonTags=[...html.matchAll(/<button\b([^>]*)>/g)].map(x=>x[1]);
  for(const attrs of buttonTags)assert(/aria-label=/.test(attrs)||/data-label=/.test(attrs)||/title=/.test(attrs),'button without accessible naming hint');
  return html;
}
function dataUri(file){
  const ext=path.extname(file).toLowerCase();
  const buf=fs.readFileSync(file);
  const media=ext==='.png'?'image/png':ext==='.svg'?'image/svg+xml':'application/octet-stream';
  return `data:${media};base64,${buf.toString('base64')}`;
}
function inlineLab(){
  let html=staticAssertions();
  const css=fs.readFileSync(path.join(root,'styles/scd-visual-foundation.css'),'utf8');
  const labJs=fs.readFileSync(path.join(root,'docs/visual-lab/gestionale-foundation.js'),'utf8');
  html=html.replace('<link rel="stylesheet" href="../../styles/scd-visual-foundation.css">',`<style data-scd-inline-foundation>${css}</style>`);
  html=html.replace('<script src="./gestionale-foundation.js"></script>',`<script>${labJs}<\/script>`);
  html=html.replace(/src="(\.\.\/\.\.\/assets\/[^"]+)"/g,(_,rel)=>{
    const file=path.resolve(root,'docs/visual-lab',rel);
    assert(fs.existsSync(file),'visual asset missing '+rel);
    return `src="${dataUri(file)}"`;
  });
  return html;
}
async function runVisualQA(chromium){
  const html=inlineLab();
  fs.mkdirSync(outputDir,{recursive:true});
  const executablePath=process.env.SCD_CHROMIUM_EXECUTABLE||undefined;
  const headless=process.env.SCD_CHROMIUM_HEADED==='1'?false:true;
  const browser=await chromium.launch({headless,...(executablePath?{executablePath}:{}),args:executablePath?['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-first-run']:[]});
  try{
    for(const [name,[width,height]] of Object.entries(viewports)){
      const mobile=width<=480;
      const page=await browser.newPage({viewport:{width,height},hasTouch:mobile,isMobile:mobile});
      await page.setContent(html,{waitUntil:'load'});
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth);
      assert(!overflow,'horizontal overflow '+name);
      for(const id of templates)assert(await page.locator(`[data-scd-template="${id}"]`).count()===1,'template count '+id);
      for(const id of primitives)assert(await page.locator(`[data-scd-primitive="${id}"]`).count()>=1,'primitive DOM missing '+id);
      const player=page.locator('[data-entity-id="PLAYER-DEMO-09"]');
      assert(await player.count()>=3,'player semantic reuse missing');
      const labels=await player.evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label')));
      assert(new Set(labels).size===1&&labels[0],'player accessible name drift');
      const buttons=page.locator('button');
      for(let i=0;i<await buttons.count();i++)assert((await buttons.nth(i).getAttribute('aria-label'))||(await buttons.nth(i).innerText()).trim(),'unnamed button '+i);
      if(width<=390){
        const targets=await page.locator('button,[data-scd-interactive="true"]').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return [r.width,r.height]}));
        assert(targets.every(([w,h])=>w>=44&&h>=44),'mobile target below 44px '+name);
      }
      await page.screenshot({path:path.join(outputDir,`${name.toLowerCase()}.png`),fullPage:true});
      await page.close();
    }
    const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
    await page.setContent(html,{waitUntil:'load'});
    const durations=await page.locator('.scd-vf-player,.scd-vf-action,.scd-vf-ai-suggestion').evaluateAll(nodes=>nodes.flatMap(n=>getComputedStyle(n).transitionDuration.split(',')).map(v=>v.trim()).filter(Boolean));
    const ms=v=>v.endsWith('ms')?parseFloat(v):v.endsWith('s')?parseFloat(v)*1000:0;
    assert(durations.every(v=>ms(v)<=100),'reduced motion transition >100ms');
    await page.close();
  }finally{await browser.close()}
  console.log('GESTIONALE VISUAL QA PASS',{engine:'PLAYWRIGHT',screenshots:Object.keys(viewports).length});
}
try{
  const mod=await import('playwright');
  await runVisualQA(mod.chromium);
}catch(error){
  if(error?.code==='ERR_MODULE_NOT_FOUND')throw new Error('PLAYWRIGHT_REQUIRED_FOR_VISUAL_QA');
  throw error;
}