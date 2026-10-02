import { chromium } from 'playwright';
import fs from 'node:fs';

fs.mkdirSync('test-output',{recursive:true});
const rawHtml=fs.readFileSync('sponsor/app.html','utf8');
const css=fs.readFileSync('sponsor/app.css','utf8');
const js=fs.readFileSync('sponsor/app.js','utf8');
const motion=JSON.parse(fs.readFileSync('config/sponsor-motion-profiles.json','utf8'));
const scenes=JSON.parse(fs.readFileSync('config/scd-creative-scenes.json','utf8'));
const state=JSON.stringify({motion,scenes});

const stub='<script>const __m='+state+';const __r=(data,status=200)=>({ok:status>=200&&status<300,status,json:async()=>data,text:async()=>JSON.stringify(data),headers:new Headers()});window.fetch=async input=>{const u=String(input||"");if(u.includes("/api/sponsor/session"))return __r({user:{name:"QA Direzione",role:"DIRECTION"},capabilities:{profile:"DIRECTION",platform:true,settings:true}});if(u.includes("/api/sponsor/motion-profiles"))return __r({ok:true,data:__m.motion});if(u.includes("/api/sponsor/creative-scenes"))return __r({ok:true,data:__m.scenes});if(u.includes("/api/sponsor/community"))return __r({ok:true,data:{sourceMode:"SNAPSHOT_FALLBACK",sourceTable:"CONVENZIONI_MASTER",rows:[]}});if(u.includes("/api/sponsor/crm"))return __r({ok:true,data:{rows:[],kpi:{}}});if(u.includes("/api/sponsor/communication"))return __r({ok:true,data:[]});return __r({ok:true,data:{}})};<\/script>';
const html=rawHtml.replace(/<link rel="stylesheet"[^>]*>/g,'').replace(/<script src="\.\/app\.js[^"]*"[^>]*><\/script>/g,'').replace('</head>','<style>'+css+'</style></head>').replace('</body>',stub+'<script>'+js.replace(/<\/script>/gi,'<\\/script>')+'<\/script></body>');

const browser=await chromium.launch({headless:true});
try{
  for(const viewport of [{width:390,height:844,name:'mobile'},{width:1440,height:900,name:'desktop'}]){
    const page=await browser.newPage({viewport});
    const errors=[];
    page.on('pageerror',e=>errors.push(String(e)));
    await page.setContent(html,{waitUntil:'domcontentloaded'});
    await page.waitForTimeout(600);
    const count=await page.locator('#homeActionQueue .action-mini').count();
    if(count<6)throw new Error('home action queue too small: '+count);
    const strip=await page.locator('#sponsorStrip').innerText();
    for(const p of ['IPERAL','HDI MAGLIA','DELLOCA','CARCANO'])if(strip.includes(p))throw new Error('prospect in current sponsor strip: '+p);
    const contracts=await page.locator('#homeContracts').innerText();
    if(/\bAttivo\b/.test(contracts))throw new Error('hardcoded Attivo remains');
    await page.locator('[data-view="azioni"]').first().click();
    await page.waitForSelector('#view-azioni.active');
    if(await page.locator('#actionQueueGrid .action-radar-card').count()<25)throw new Error('cross-lane radar incomplete');
    await page.selectOption('#actionLane','SUPPLIER');
    await page.fill('#actionSearch','Gimoka');
    if(!(await page.locator('#actionQueueGrid').innerText()).includes('Gruppo Gimoka'))throw new Error('supplier filter failed');
    await page.fill('#globalSearch','Gimoka');
    await page.waitForSelector('#searchResults:not([hidden])');
    if(!(await page.locator('#searchResults').innerText()).includes('Fornitore'))throw new Error('global supplier search failed');
    if(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+3))throw new Error('horizontal overflow '+viewport.name);
    if(errors.length)throw new Error('page errors '+viewport.name+': '+errors.join(' | '));
    await page.screenshot({path:'test-output/sponsor-operations-'+viewport.name+'-'+viewport.width+'x'+viewport.height+'.png',fullPage:true});
    await page.close();
  }
  console.log('SCD SPONSOR OPERATIONS VISUAL QA PASS');
} finally { await browser.close(); }
