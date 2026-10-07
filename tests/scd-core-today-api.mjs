import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';

const APP_PORT=18100;
const UPSTREAM_PORT=18101;
const BASE='http://127.0.0.1:'+APP_PORT;

function send(res,status,payload){
  res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});
  res.end(JSON.stringify(payload));
}

const upstream=http.createServer((req,res)=>{
  let raw='';
  req.on('data',chunk=>raw+=chunk);
  req.on('end',()=>{
    let body={};
    try{body=JSON.parse(raw||'{}')}catch{return send(res,400,{ok:false,error:'INVALID_JSON'})}
    const action=String(body.action||'');
    const token=String(body.sessionToken||body.token||body.payload?.token||'');
    if(action==='auth.validate'){
      if(!['ci-core-session','ci-core-degraded','ci-core-public'].includes(token))return send(res,200,{ok:false,error:'INVALID_SESSION'});
      const role=token==='ci-core-public'?'PUBLIC':'DIRECTION';
      return send(res,200,{ok:true,data:{user:{email:'ci@example.test',name:'CI',role,coreRole:role},permissions:{direction:role==='DIRECTION'}}});
    }
    if(token==='ci-core-degraded' && action==='private.agenda.summary')return send(res,200,{ok:false,error:'CI_AGENDA_UNAVAILABLE'});
    if(action==='private.dashboard')return send(res,200,{ok:true,data:{items:[{id:'DASH-1',title:'Verifica documento federale',priority:'ALTA',dueDate:'2026-10-08T12:00:00.000Z',owner:'Segreteria',source:'SCD_DRIVE',actionMode:'READ',nextAction:'Apri documento verificato'}]}});
    if(action==='private.agenda.summary')return send(res,200,{ok:true,data:{items:[]}});
    if(action==='direction.datafabric.actions')return send(res,200,{ok:true,data:{items:[{id:'MAIL-1',title:'Risposta istituzionale da verificare',priority:'MEDIA',dueDate:'2026-10-09T12:00:00.000Z',owner:'Direzione',source:'SCD_GMAIL',actionMode:'READ',nextAction:'Apri messaggio verificato'}]}});
    if(/^(private|direction|account)\./.test(action))return send(res,200,{ok:true,data:{items:[]}});
    return send(res,200,{ok:false,error:'DISABLED'});
  });
});

function waitFor(url,timeout=10000){
  const started=Date.now();
  return new Promise((resolve,reject)=>{
    const tick=async()=>{
      try{const r=await fetch(url);if(r.ok)return resolve()}catch{}
      if(Date.now()-started>timeout)return reject(new Error('timeout '+url));
      setTimeout(tick,100);
    };
    tick();
  });
}
async function post(payload){
  const r=await fetch(BASE+'/api/core-today',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
  let body={};try{body=await r.json()}catch{}
  return {status:r.status,body};
}
function run(name,fn){
  return Promise.resolve().then(fn).then(()=>console.log('PASS',name)).catch(error=>{console.error('FAIL',name,error);process.exitCode=1});
}

await new Promise((resolve,reject)=>upstream.once('error',reject).listen(UPSTREAM_PORT,'127.0.0.1',resolve));
const app=spawn(process.execPath,['server.js'],{
  cwd:process.cwd(),
  env:{...process.env,PORT:String(APP_PORT),SCD_APPS_SCRIPT_URL:'http://127.0.0.1:'+UPSTREAM_PORT,SCD_PREVIEW_SAFE_MODE:'true'},
  stdio:['ignore','pipe','pipe']
});
let appLog='';app.stdout.on('data',d=>appLog+=d);app.stderr.on('data',d=>appLog+=d);

try{
  await waitFor(BASE+'/health');

  await run('missing_session_returns_401',async()=>{
    const r=await post({command:'/today',input:{}});
    assert.equal(r.status,401);
    assert.equal(r.body.ok,false);
    assert.equal(Object.hasOwn(r.body,'projection'),false);
  });

  await run('invalid_session_returns_401_without_projection',async()=>{
    const r=await post({sessionToken:'invalid',command:'/today',input:{}});
    assert.equal(r.status,401);
    assert.equal(Object.hasOwn(r.body,'projection'),false);
  });

  await run('role_scope_is_enforced_before_projection',async()=>{
    const r=await post({sessionToken:'ci-core-public',command:'/today',input:{}});
    assert.equal(r.status,403);
    assert.equal(r.body.error,'ROLE_SCOPE_DENIED');
    assert.equal(Object.hasOwn(r.body,'projection'),false);
  });

  await run('authorized_session_returns_projection_not_raw_channels',async()=>{
    const r=await post({sessionToken:'ci-core-session',command:'/today',input:{}});
    assert.equal(r.status,200);
    assert.equal(r.body.ok,true);
    assert.equal(r.body.command.trigger,'/today');
    assert.equal(r.body.projection.primary_attention.id,'DASH-1');
    assert.equal(Object.hasOwn(r.body,'channels'),false);
    assert.equal(Object.hasOwn(r.body.projection,'channels'),false);
  });

  await run('unavailable_operational_sources_return_200_fail_closed_projection',async()=>{
    const r=await post({sessionToken:'ci-core-degraded',command:'/attention',input:{}});
    assert.equal(r.status,200);
    assert.equal(r.body.ok,true);
    assert.equal(r.body.projection.source_state,'PARTIAL');
    assert.ok(r.body.projection.coverage.missing.some(x=>x.id==='agenda'));
  });

  await run('preview_mode_blocks_write_actions_and_core_today_remains_read_only',async()=>{
    const r=await post({sessionToken:'ci-core-session',command:'/today',input:{action:'DELETE'}});
    assert.equal(r.status,200);
    assert.ok(['READ','HUMAN_GATE'].includes(r.body.projection.primary_attention.next_action.mode));
    assert.notEqual(r.body.projection.primary_attention.next_action.mode,'WRITE');
    assert.equal(r.body.runtime.previewSafeMode,true);
    assert.equal(r.body.runtime.writePolicy,'READ_ONLY');
  });

  await run('unknown_or_contract_only_command_is_rejected_without_fake_output',async()=>{
    const unknown=await post({sessionToken:'ci-core-session',command:'/magic',input:{}});
    assert.equal(unknown.status,404);
    assert.equal(unknown.body.error,'UNKNOWN_COMMAND');
    assert.equal(Object.hasOwn(unknown.body,'projection'),false);
    const blocked=await post({sessionToken:'ci-core-session',command:'/calendar',input:{}});
    assert.equal(blocked.status,409);
    assert.ok(['BLOCKED_SOURCE','CONTRACT_DEFINED'].includes(blocked.body.error));
    assert.equal(Object.hasOwn(blocked.body,'projection'),false);
  });
} finally {
  app.kill('SIGTERM');
  await new Promise(resolve=>upstream.close(resolve));
}

if(process.exitCode){
  console.error(appLog);
  process.exit(process.exitCode);
}
console.log('SCD CORE TODAY API CONTRACT PASS');
