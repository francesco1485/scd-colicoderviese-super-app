import http from 'node:http';
import {spawn} from 'node:child_process';

const host='127.0.0.1';

function listen(server){
  return new Promise((resolve,reject)=>{
    server.once('error',reject);
    server.listen(0,host,()=>resolve(server.address().port));
  });
}
function close(server){return new Promise(resolve=>server.close(()=>resolve()))}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

let counts={read:0,write:0};
const upstream=http.createServer((req,res)=>{
  let raw='';
  req.on('data',c=>raw+=c);
  req.on('end',()=>{
    const body=JSON.parse(raw||'{}');
    if(body.action==='public.feed'){
      counts.read++;
      if(counts.read===1){
        res.writeHead(200,{'content-type':'text/html'});
        return res.end('<html>temporary upstream response</html>');
      }
      res.writeHead(200,{'content-type':'application/json'});
      return res.end(JSON.stringify({ok:true,data:{items:[{id:'SAFE'}]}}));
    }
    if(body.action==='public.registration'){
      counts.write++;
      res.writeHead(200,{'content-type':'text/html'});
      return res.end('<html>write action transient response</html>');
    }
    res.writeHead(400,{'content-type':'application/json'});
    res.end(JSON.stringify({ok:false,error:'unexpected action'}));
  });
});

const upstreamPort=await listen(upstream);
const appPort=upstreamPort+1;
const child=spawn(process.execPath,['server.js'],{
  cwd:process.cwd(),
  env:{...process.env,PORT:String(appPort),SCD_APPS_SCRIPT_URL:`http://${host}:${upstreamPort}/`},
  stdio:['ignore','pipe','pipe']
});
let logs='';
child.stdout.on('data',d=>logs+=d);
child.stderr.on('data',d=>logs+=d);

try{
  let ready=false;
  for(let i=0;i<40;i++){
    try{
      const r=await fetch(`http://${host}:${appPort}/health`);
      if(r.ok){ready=true;break}
    }catch{}
    await sleep(100);
  }
  if(!ready)throw new Error('SCD server did not start: '+logs);

  const readResponse=await fetch(`http://${host}:${appPort}/api/scd`,{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({action:'public.feed',payload:{limit:1},sessionToken:''})
  });
  const readJson=await readResponse.json();
  if(readResponse.status!==200||readJson.ok!==true)throw new Error('read-only retry did not recover');
  if(counts.read!==2)throw new Error('read-only action expected 2 attempts, got '+counts.read);

  const writeResponse=await fetch(`http://${host}:${appPort}/api/scd`,{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({action:'public.registration',payload:{test:true},sessionToken:''})
  });
  const writeJson=await writeResponse.json();
  if(writeResponse.status!==502||writeJson.ok!==false)throw new Error('write invalid upstream response should fail closed');
  if(counts.write!==1)throw new Error('write action must never retry, got '+counts.write);

  console.log('SCD UPSTREAM RESILIENCE PASS',{readAttempts:counts.read,writeAttempts:counts.write});
}finally{
  child.kill('SIGTERM');
  await close(upstream);
}
