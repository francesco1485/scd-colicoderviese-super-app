import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import net from 'node:net';

const port=()=>new Promise((resolve,reject)=>{
 const s=net.createServer();s.on('error',reject);
 s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p))});
});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const auth='Basic '+Buffer.from('scd-preview:qa-preview-password-only-2026').toString('base64');
const jsonBody=body=>JSON.stringify(body);
const post=(url,path,body,extraHeaders={})=>fetch(url+path,{method:'POST',headers:{authorization:auth,'content-type':'application/json',...extraHeaders},body:jsonBody(body)});
test('isolated preview is password-protected and all ONE/GROW/CORE/Sky paths remain disconnected from R20',async t=>{
 const p=await port();
 const base='http://127.0.0.1:'+p;
 const app=spawn(process.execPath,['server.js'],{
   cwd:process.cwd(),
   env:{...process.env,PORT:String(p),SCD_ISOLATED_PREVIEW:'true',
    SCD_PREVIEW_PASSWORD:'qa-preview-password-only-2026',
    SCD_PREVIEW_TEST_PIN:'qa-demo-pin-2026',
    SCD_APPS_SCRIPT_URL:'http://127.0.0.1:1/NO_OUTBOUND_ALLOWED'},
   stdio:['ignore','pipe','pipe']
 });
 let logs='';app.stdout.on('data',b=>logs+=b);app.stderr.on('data',b=>logs+=b);
 t.after(()=>app.kill('SIGTERM'));
 let ready=false;
 for(let i=0;i<55;i++){
   if(app.exitCode!==null)break;
   try{const r=await fetch(base+'/health');if(r.status===200){ready=true;break}}catch{}
   await wait(100);
 }
 assert.ok(ready,'isolated server startup failed: '+logs);
 const anon=await fetch(base+'/api/newsroom');
 assert.equal(anon.status,401,'anonymous internet cannot access preview data');
 const bad=await fetch(base+'/api/core-status',{headers:{authorization:'Basic '+Buffer.from('fake:fake').toString('base64')}});
 assert.equal(bad.status,401);
 const preview=await fetch(base+'/api/preview/status',{headers:{authorization:auth}});
 assert.equal(preview.status,200);
 const status=await preview.json();
 assert.equal(status.isolated,true);
 assert.equal(status.productionWritesAllowed,false);
 assert.equal(status.externalR20Connected,false);
 assert.equal(status.dataClass,'SYNTHETIC_ONLY');
 const page=await fetch(base+'/',{headers:{authorization:auth}});
 assert.equal(page.status,200);
 const html=await page.text();
 assert.match(html,/DATI SINTETICI/,'preview must show explicit non-production indicator');
 const newsroomResponse=await fetch(base+'/api/newsroom',{headers:{authorization:auth}});
 assert.equal(newsroomResponse.status,200);
 const newsroom=await newsroomResponse.json();
 assert.equal(newsroom.sources.calendar,'OK');
 assert.equal(newsroom.calendar.rows.length,2,'two public synthetic events only');
 assert.ok(newsroom.calendar.rows.every(x=>x.source==='STAGING_SYNTHETIC'));
 assert.ok(newsroom.calendar.rows.every(x=>x.id.startsWith('QA-')));
 const sky=await post(base,'/api/sky/ask',{question:'Qual è la prossima gara?',app:'ONE'});
 assert.equal(sky.status,200);
 const skyData=await sky.json();
 assert.equal(skyData.data.aiConnected,false);
 assert.equal(skyData.data.evidence[0].source,'STAGING_SYNTHETIC');

 const unauthorized=await fetch(base+'/api/sponsor/lead-inbox',{headers:{authorization:auth}});
 assert.equal(unauthorized.status,403);
 const blockedLead=await post(base,'/api/sponsor/lead',{name:'Persona reale',email:'real@gmail.com',phone:'123',company:'Azienda Reale',privacy:true});
 assert.notEqual(blockedLead.status,200,'preview must refuse non-synthetic input');

 const login=await post(base,'/api/sponsor/login',{email:'operatore@example.invalid',code:'qa-demo-pin-2026'});
 assert.equal(login.status,200,'staging test identity only');
 const cookie=(login.headers.get('set-cookie')||'').split(';')[0];
 assert.match(cookie,/scd_sponsor_session=/);
 const asSponsor={authorization:auth,cookie};
 const inbox=await fetch(base+'/api/sponsor/lead-inbox',{headers:asSponsor});
 assert.equal(inbox.status,200);
 const lead=(await inbox.json()).rows[0];
 assert.equal(lead.linkState,'REVIEW_REQUIRED');
 const stakeholderId=lead.candidateStakeholderIds[0];
 const previewDraft=await post(base,'/api/sponsor/proposal-draft',{requestId:lead.requestId,stakeholderId,associationReviewed:true,asset:'LED test'},asSponsor);
 assert.equal(previewDraft.status,200);
 const draft=(await previewDraft.json()).data;
 assert.equal(draft.persisted,false);
 const save=await post(base,'/api/sponsor/proposal-draft/save',{requestId:lead.requestId,stakeholderId,associationReviewed:true,confirm:true,asset:'LED test'},asSponsor);
 assert.equal(save.status,200);
 const first=(await save.json()).data;
 assert.equal(first.created,true);
 assert.equal(first.persistence,'EPHEMERAL_MEMORY');
 assert.equal(first.deliveryState,'NOT_SENT');
 const again=await post(base,'/api/sponsor/proposal-draft/save',{requestId:lead.requestId,stakeholderId,associationReviewed:true,confirm:true,asset:'LED test'},asSponsor);
 assert.equal(again.status,200);
 assert.equal((await again.json()).data.created,false,'idempotent staging request');

 const coreLogin=await post(base,'/api/scd',{action:'auth.login',payload:{email:'operatore@example.invalid',pin:'qa-demo-pin-2026'},sessionToken:''});
 assert.equal(coreLogin.status,200);
 const coreToken=(await coreLogin.json()).data.token;
 assert.ok(coreToken);
 const audit=await post(base,'/api/scd',{action:'auth.access.log',payload:{eventType:'PRIVATE_DESK_OPEN',clientKind:'WEB'},sessionToken:coreToken});
 assert.equal(audit.status,200);
 assert.equal((await audit.json()).data.stored,true);
 const forbidden=await post(base,'/api/scd',{action:'private.message.send',payload:{message:'Should never reach production'},sessionToken:coreToken});
 assert.equal(forbidden.status,403,'non-whitelisted staging actions must fail closed');
 const stateRes=await fetch(base+'/api/preview/status',{headers:{authorization:auth}});
 const state=await stateRes.json();
 assert.equal(state.opportunities,1);
 assert.ok(state.auditEvents>=2);
 assert.equal(state.externalR20Connected,false);
});
