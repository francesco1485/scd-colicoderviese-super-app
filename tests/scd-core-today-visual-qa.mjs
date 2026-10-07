import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const base=process.env.SCD_BASE_URL||'http://127.0.0.1:10000';
const out=path.join(process.cwd(),'test-output');
fs.mkdirSync(out,{recursive:true});

const viewports=[
  {name:'360x800',width:360,height:800},
  {name:'390x844',width:390,height:844},
  {name:'430x932',width:430,height:932},
  {name:'1280x800',width:1280,height:800},
  {name:'1440x900',width:1440,height:900},
  {name:'1920x1080',width:1920,height:1080}
];

const projection={
  ok:true,
  command:{command_id:'CMD-TODAY',trigger:'/today',intent:'render_today_attention',human_gate:false,audit_event:'CORE_TODAY_VIEWED'},
  runtime:{previewSafeMode:true,writePolicy:'READ_ONLY',sourceAuthority:'R20',contractVersion:'R58-CORE-TODAY-1.0'},
  projection:{
    generated_at:'2026-10-07T14:00:00.000Z',
    command_trigger:'/today',
    source_state:'PARTIAL',
    role_scope:['DIRECTION'],
    primary_attention:{
      id:'DASH-1',
      title:'Verifica il documento federale prima della scadenza',
      reason:'Priorità esplicita: ALTA · Scadenza: 2026-10-08T12:00:00.000Z · Stato: APERTO',
      owner:'Segreteria',
      due_at:'2026-10-08T12:00:00.000Z',
      source:'SCD_DRIVE',
      source_url:'https://drive.google.com/',
      verification_state:'VERIFIED',
      next_action:{label:'Apri il documento verificato',mode:'READ'}
    },
    changed:[],
    next:[
      {id:'MAIL-1',title:'Risposta istituzionale da verificare',reason:'Priorità esplicita: MEDIA',owner:'Direzione',due_at:'2026-10-09T12:00:00.000Z',source:'SCD_GMAIL',verification_state:'VERIFIED',next_action:{label:'Apri messaggio',mode:'READ'}},
      {id:'AGENDA-1',title:'Conferma riunione tecnica',reason:'Scadenza: 2026-10-10',owner:'Direzione',due_at:'2026-10-10T12:00:00.000Z',source:'R20',verification_state:'VERIFIED',next_action:{label:'Apri agenda',mode:'READ'}}
    ],
    coverage:{verified:['dashboard','mailactions'],missing:[{id:'agenda',error:'CI_AGENDA_UNAVAILABLE'}]},
    fail_closed:null
  }
};

const browser=await chromium.launch({headless:true});
try{
  for(const viewport of viewports){
    const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},deviceScaleFactor:1});
    await context.addInitScript(token=>{
      localStorage.setItem('scd:r58:core-session',JSON.stringify({token,email:'ci@example.test',savedAt:new Date().toISOString()}));
    },'ci-core-session');
    const page=await context.newPage();
    await page.route('**/api/core-today',async route=>{
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(projection)});
    });
    await page.goto(base+'/r58/core-today/',{waitUntil:'networkidle'});
    await page.getByRole('heading',{name:/Verifica il documento federale/i}).waitFor();
    if(await page.locator('#authGate').isVisible())throw new Error('Authenticated auth gate still visible at '+viewport.name);
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1);
    if(overflow)throw new Error('Horizontal overflow at '+viewport.name);
    const oldCounters=await page.locator('text=URGENTI').count();
    if(oldCounters)throw new Error('Rejected KPI strip resurfaced at '+viewport.name);
    const targets=await page.locator('button:visible, a.action-button:visible').evaluateAll(nodes=>nodes.map(node=>{
      const r=node.getBoundingClientRect();return {w:r.width,h:r.height,text:(node.textContent||'').trim()};
    }));
    const tooSmall=targets.filter(x=>x.h<44||x.w<44);
    if(tooSmall.length)throw new Error('Touch targets below 44px at '+viewport.name+': '+JSON.stringify(tooSmall));
    await page.screenshot({path:path.join(out,'r58-core-today-'+viewport.name+'.png'),fullPage:true});
    await context.close();
    console.log('PASS viewport',viewport.name);
  }
  console.log('SCD CORE TODAY VISUAL QA PASS');
}finally{
  await browser.close();
}
