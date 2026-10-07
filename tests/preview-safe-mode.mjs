import http from 'node:http';
import { spawn } from 'node:child_process';

const host='127.0.0.1';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const listen=server=>new Promise((resolve,reject)=>{
  server.once('error',reject);
  server.listen(0,host,()=>resolve(server.address().port));
});
const close=server=>new Promise(resolve=>server.close(()=>resolve()));

const seen=[];
const upstream=http.createServer((req,res)=>{
  let raw='';
  req.on('data',chunk=>raw+=chunk);
  req.on('end',()=>{
    const body=JSON.parse(raw||'{}');
    seen.push(String(body.action||''));
    res.writeHead(200,{'content-type':'application/json'});
    if(body.action==='public.feed')return res.end(JSON.stringify({ok:true,data:{items:[]}}));
    return res.end(JSON.stringify({ok:true,data:{accepted:true}}));
  });
});

const upstreamPort=await listen(upstream);
const appPort=upstreamPort+1;
const child=spawn(process.execPath,['server.js'],{
  cwd:process.cwd(),
  env:{
    ...process.env,
    PORT:String(appPort),
    SCD_APPS_SCRIPT_URL:`http://${host}:${upstreamPort}/`,
    SCD_PREVIEW_SAFE_MODE:'true'
  },
  stdio:['ignore','pipe','pipe']
});
let logs='';
child.stdout.on('data',d=>logs+=d);
child.stderr.on('data',d=>logs+=d);

try{
  let ready=false;
  for(let i=0;i<50;i++){
    try{
      const r=await fetch(`http://${host}:${appPort}/health`);
      if(r.ok){ready=true;break}
    }catch{}
    await sleep(100);
  }
  if(!ready)throw new Error('Preview-safe server did not start: '+logs);

  const health=await (await fetch(`http://${host}:${appPort}/health`)).json();
  if(health.previewSafeMode!==true)throw new Error('health does not expose previewSafeMode');

  const capabilities=await (await fetch(`http://${host}:${appPort}/api/capabilities`)).json();
  if(capabilities.runtimeSafety?.writePolicy!=='READ_ONLY')throw new Error('preview write policy is not READ_ONLY');

  const readResponse=await fetch(`http://${host}:${appPort}/api/scd`,{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({action:'public.feed',payload:{limit:1},sessionToken:''})
  });
  const readJson=await readResponse.json();
  if(readResponse.status!==200||readJson.ok!==true)throw new Error('read action failed in preview mode');

  const writeResponse=await fetch(`http://${host}:${appPort}/api/scd`,{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({action:'public.registration',payload:{test:true},sessionToken:''})
  });
  const writeJson=await writeResponse.json();
  if(writeResponse.status!==403||writeJson.code!=='PREVIEW_READ_ONLY')throw new Error('write action was not blocked');
  if(seen.includes('public.registration'))throw new Error('blocked write reached upstream');

  console.log('SCD PREVIEW SAFE MODE PASS',{seen,writeStatus:writeResponse.status});
}finally{
  child.kill('SIGTERM');
  await close(upstream);
}
