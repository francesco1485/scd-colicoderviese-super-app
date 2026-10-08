import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import {spawn} from 'node:child_process';

const owner={email:'sportclubcolico@gmail.com',role:'DIREZIONE',name:'QA Direction'};
const request={REQUEST_ID:'REQ-QA-1',TYPE:'SPONSOR',STATUS:'NUOVA',CREATED_AT:'2026-10-08',NOME:'Referente QA',EMAIL:'lead@qa.test',TELEFONO:'010101',OGGETTO:'PARTNERSHIP · Azienda QA · LED',DETTAGLI:'NOT_PUBLIC'};
const stakeholder={STAKEHOLDER_ID:'ST-QA-1',EMAIL:'lead@qa.test',NOME:'Azienda QA',CONTACT_POLICY:'MANUALE'};
const getPort=()=>new Promise((resolve,reject)=>{
 const s=net.createServer();s.once('error',reject);s.listen(0,'127.0.0.1',()=>{const port=s.address().port;s.close(()=>resolve(port))});
});
const start=server=>new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const close=server=>new Promise(resolve=>server.close(resolve));

test('GROW public lead -> canonical CRM candidate -> unpersisted review draft via live HTTP server',async()=>{
 const upstreamActions=[];
 const upstream=http.createServer(async(req,res)=>{
   const chunks=[];for await(const chunk of req)chunks.push(chunk);
   const input=JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');
   upstreamActions.push(input.action);
   let data;
   if(input.action==='auth.login')data={token:'qa-token',user:owner};
   else if(input.action==='auth.validate')data={user:owner};
   else if(input.action==='private.crm.leadInbox')data={requests:[request],stakeholders:[stakeholder]};
   else if(input.action==='private.crm.detail')data={stakeholder};
   else {res.writeHead(400,{'content-type':'application/json'});return res.end(JSON.stringify({ok:false,error:'ACTION_NOT_MOCKED'}));}
   res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({ok:true,data}));
 });
 await start(upstream);
 const upstreamPort=upstream.address().port;
 const port=await getPort(),base='http://127.0.0.1:'+port;
 const child=spawn(process.execPath,['server.js'],{
   cwd:process.cwd(),env:{...process.env,PORT:String(port),SCD_APPS_SCRIPT_URL:'http://127.0.0.1:'+upstreamPort+'/'},
   stdio:['ignore','pipe','pipe']
 });
 let logs='';child.stderr.on('data',d=>logs+=String(d));
 try{
   let ready=false;
   for(let attempt=0;attempt<50;attempt++){
     try{const response=await fetch(base+'/health');if(response.ok){ready=true;break}}catch{}
     await new Promise(resolve=>setTimeout(resolve,100));
   }
   assert.ok(ready,'SCD server did not start '+logs);
   const anonymous=await fetch(base+'/api/sponsor/lead-inbox');
   assert.equal(anonymous.status,403);
   const login=await fetch(base+'/api/sponsor/login',{
     method:'POST',headers:{'content-type':'application/json'},
     body:JSON.stringify({email:owner.email,code:'qa-code'})
   });
   assert.equal(login.status,200);
   const cookie=login.headers.get('set-cookie').split(';')[0];
   assert.match(cookie,/scd_sponsor_session=/);
   const headers={cookie};
   const inbox=await fetch(base+'/api/sponsor/lead-inbox',{headers});
   assert.equal(inbox.status,200);
   const inboxData=await inbox.json();
   assert.equal(inboxData.rows.length,1);
   assert.equal(inboxData.rows[0].linkState,'REVIEW_REQUIRED');
   assert.deepEqual(inboxData.rows[0].candidateStakeholderIds,['ST-QA-1']);
   assert.equal(JSON.stringify(inboxData).includes('NOT_PUBLIC'),false);
   const invalid=await fetch(base+'/api/sponsor/proposal-draft',{
     method:'POST',headers:{...headers,'content-type':'application/json'},
     body:JSON.stringify({requestId:'REQ-QA-1',stakeholderId:'ST-QA-1'})
   });
   assert.equal(invalid.status,400);
   const draft=await fetch(base+'/api/sponsor/proposal-draft',{
     method:'POST',headers:{...headers,'content-type':'application/json'},
     body:JSON.stringify({requestId:'REQ-QA-1',stakeholderId:'ST-QA-1',associationReviewed:true,asset:'LED campo'})
   });
   assert.equal(draft.status,200);
   const output=await draft.json();
   assert.equal(output.data.persisted,false);
   assert.equal(output.data.deliveryState,'NOT_SENT');
   assert.equal(output.data.stakeholderId,'ST-QA-1');
   assert.equal(output.data.amount,null);
   assert.ok(upstreamActions.every(x=>['auth.login','auth.validate','private.crm.leadInbox','private.crm.detail'].includes(x)),'unexpected mutating action');
 }finally{
   child.kill('SIGTERM');
   await close(upstream);
 }
});
