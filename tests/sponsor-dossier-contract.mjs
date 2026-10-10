/* R58 — Dossier commerciale Sponsor privato.
   Verifica che sponsor/proposte/fornitori/audience non siano nel sorgente pubblico
   e che /api/sponsor/dossier sia protetto dalla stessa sessione del CRM.
   Usa SOLO dati sintetici: nessun dato reale nel repository. */
import http from 'node:http';
import fs from 'node:fs';
import {spawn} from 'node:child_process';

const host='127.0.0.1';
function assert(cond,msg){if(!cond)throw new Error(msg)}
function listen(server){
  return new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,host,()=>resolve(server.address().port))});
}
function close(server){return new Promise(resolve=>server.close(()=>resolve()))}

/* ---------- Static contract ---------- */
const appJs=fs.readFileSync(new URL('../sponsor/app.js',import.meta.url),'utf8');
for(const name of ['sponsors','proposals','suppliers','audience']){
  assert(new RegExp('\\nlet '+name+'=\\[\\];').test(appJs),'sponsor/app.js must declare `let '+name+'=[]` (no hardcoded dossier)');
  assert(!new RegExp('\\nconst '+name+'=\\[').test(appJs),'sponsor/app.js must not hardcode `const '+name+'=[...]`');
}
assert(appJs.includes("fetch('/api/sponsor/dossier',{credentials:'same-origin'"),'sponsor/app.js must load the dossier from the protected endpoint with credentials');
assert(/loadConventions\(\);\s*loadSponsorDossier\(\);/.test(appJs),'dossier must be loaded only after a valid sponsor session');
assert(appJs.includes('DA SINCRONIZZARE'),'sponsor/app.js must show DA SINCRONIZZARE instead of invented values');
assert(!/residual:\s*["']/.test(appJs),'supplier residual amounts must not be hardcoded in sponsor/app.js');
assert(!/value:\s*['"]€\s*\d/.test(appJs),'sponsor contract values must not be hardcoded in sponsor/app.js');
assert(!/const cash=\d/.test(appJs),'verified cash must not be a hardcoded number');

const renderYaml=fs.readFileSync(new URL('../render.yaml',import.meta.url),'utf8');
assert(/- key: SCD_SPONSOR_DOSSIER_JSON\n\s+sync: false/.test(renderYaml),'render.yaml must declare SCD_SPONSOR_DOSSIER_JSON with sync: false');
assert(!/SCD_SPONSOR_DOSSIER_JSON\n\s+value:/.test(renderYaml),'render.yaml must never carry a dossier value');

/* ---------- Runtime contract (mock upstream session) ---------- */
const GOOD='qa-good-token';
const upstream=http.createServer((req,res)=>{
  let raw='';req.on('data',c=>raw+=c);
  req.on('end',()=>{
    const body=JSON.parse(raw||'{}');
    res.writeHead(200,{'content-type':'application/json'});
    if(body.action==='auth.validate'&&body.payload?.token===GOOD){
      return res.end(JSON.stringify({ok:true,data:{user:{email:'qa.direzione@example.test',name:'QA',role:'DIREZIONE'}}}));
    }
    res.end(JSON.stringify({ok:false,error:'INVALID_SESSION'}));
  });
});
const upstreamPort=await listen(upstream);

const MARKER='QA_SYNTHETIC_PARTNER_7f3a';
const synthetic={
  generatedAt:'2000-01-01',
  sponsors:[{name:MARKER,sector:'QA',status:'DOCUMENTATO',value:'€1 + IVA',period:'QA',asset:'QA',next:'QA',since:'2020',type:'Sponsor',contact:'qa@example.test'}],
  proposals:[{name:'QA proposal',area:'QA',status:'QA',next:'QA',value:'QA'}],
  suppliers:[{name:'QA supplier',position:'QA',paid:'QA',residual:'QA',email:'qa@example.test',potential:'QA',next:'QA'}],
  audience:[{segment:'QA',value:'QA',unit:'QA',source:'QA',note:'QA'}]
};

let portSeed=18800;
async function withServer(envExtra,fn){
  const port=portSeed++;
  const env={...process.env,PORT:String(port),SCD_APPS_SCRIPT_URL:'http://'+host+':'+upstreamPort+'/exec'};
  delete env.SCD_SPONSOR_DOSSIER_JSON;
  Object.assign(env,envExtra);
  const child=spawn(process.execPath,['server.js'],{env,stdio:['ignore','pipe','pipe']});
  let logs='';child.stdout.on('data',d=>logs+=d);child.stderr.on('data',d=>logs+=d);
  const base='http://'+host+':'+port;
  try{
    let healthy=false;
    for(let i=0;i<40&&!healthy;i++){try{healthy=(await fetch(base+'/health')).ok}catch{await new Promise(r=>setTimeout(r,250))}}
    assert(healthy,'server did not become healthy\n'+logs);
    await fn(base);
    return logs;
  }finally{child.kill('SIGTERM')}
}
const authed={headers:{cookie:'scd_sponsor_session='+GOOD}};

try{
  // 1) Nessun dossier configurato: fail-closed con DA_SINCRONIZZARE e array vuoti.
  await withServer({},async base=>{
    const anon=await fetch(base+'/api/sponsor/dossier');
    assert(anon.status===401,'dossier without session must be 401, got '+anon.status);
    const bad=await fetch(base+'/api/sponsor/dossier',{headers:{cookie:'scd_sponsor_session=qa-bad-token'}});
    assert(bad.status===403,'dossier with invalid session must be 403, got '+bad.status);
    const post=await fetch(base+'/api/sponsor/dossier',{method:'POST',...authed});
    assert(post.status===405,'dossier POST must be 405, got '+post.status);
    const r=await fetch(base+'/api/sponsor/dossier',authed);
    assert(r.status===200,'dossier with session must be 200, got '+r.status);
    const d=await r.json();
    assert(d.ok===true&&d.sourceMode==='DA_SINCRONIZZARE','missing env must return DA_SINCRONIZZARE');
    for(const k of ['sponsors','proposals','suppliers','audience'])assert(Array.isArray(d[k])&&d[k].length===0,k+' must be an empty array when env is missing');
  });

  // 2) Env non valido: stesso comportamento fail-closed.
  for(const invalid of ['{not json','[]','{"sponsors":[],"proposals":[],"suppliers":[]}','{"sponsors":[1],"proposals":[],"suppliers":[],"audience":[]}']){
    await withServer({SCD_SPONSOR_DOSSIER_JSON:invalid},async base=>{
      const d=await (await fetch(base+'/api/sponsor/dossier',authed)).json();
      assert(d.ok===true&&d.sourceMode==='DA_SINCRONIZZARE','invalid env must return DA_SINCRONIZZARE ('+invalid.slice(0,20)+')');
      assert(d.sponsors.length===0&&d.suppliers.length===0,'invalid env must not leak partial data');
    });
  }

  // 3) Env valido: dossier servito solo con sessione, mai loggato.
  const logs=await withServer({SCD_SPONSOR_DOSSIER_JSON:JSON.stringify(synthetic)},async base=>{
    const anon=await fetch(base+'/api/sponsor/dossier');
    assert(anon.status===401,'configured dossier must still require session');
    const anonText=await anon.text();
    assert(!anonText.includes(MARKER),'anonymous response must not include dossier data');
    const d=await (await fetch(base+'/api/sponsor/dossier',authed)).json();
    assert(d.ok===true&&d.sourceMode==='PRIVATE_DOSSIER','valid env must return PRIVATE_DOSSIER');
    assert(d.sponsors[0]?.name===MARKER,'valid env must return sponsors');
    assert(d.proposals.length===1&&d.suppliers.length===1&&d.audience.length===1,'valid env must return all four arrays');
    const pub=await fetch(base+'/sponsor/app.js',{headers:{accept:'application/javascript'}});
    assert(pub.status===401,'private sponsor app.js must stay session-protected, got '+pub.status);
  });
  assert(!logs.includes(MARKER),'dossier content must never be logged');

  console.log('Sponsor dossier contract PASS');
}finally{
  await close(upstream);
}
