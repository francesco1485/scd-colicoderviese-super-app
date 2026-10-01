import {spawn} from 'node:child_process';

const port=18765;
const base='http://127.0.0.1:'+port;
const child=spawn(process.execPath,['server.js'],{
  env:{...process.env,PORT:String(port)},
  stdio:['ignore','pipe','pipe']
});

let stdout='',stderr='';
child.stdout.on('data',d=>stdout+=d);
child.stderr.on('data',d=>stderr+=d);

function stop(){
  if(!child.killed) child.kill('SIGTERM');
}
process.on('exit',stop);
process.on('SIGINT',()=>{stop();process.exit(130)});

function assert(cond,msg){
  if(!cond) throw new Error(msg);
}
async function waitHealth(){
  for(let i=0;i<40;i++){
    try{
      const r=await fetch(base+'/health');
      if(r.ok)return;
    }catch{}
    await new Promise(r=>setTimeout(r,250));
  }
  throw new Error('server did not become healthy\n'+stdout+'\n'+stderr);
}

try{
  await waitHealth();

  const pub=await fetch(base+'/sponsor/');
  const pubText=await pub.text();
  assert(pub.status===200,'public sponsor route status '+pub.status);
  assert(pubText.includes('LEDWall SCD'),'public sponsor page missing LEDWall');
  assert(pubText.includes('Catalogo')||pubText.includes('opportunità'),'public sponsor page missing commercial content');
  assert(pubText.includes('sponsor.js'),'public sponsor page missing JS');

  const js=await fetch(base+'/sponsor/sponsor.js');
  const jsText=await js.text();
  assert(js.status===200,'sponsor.js status '+js.status);
  assert(jsText.includes('scd-colicoderviese-official-r21.onrender.com'),'public login target is not official service');
  assert(!jsText.includes("$('.modal').forEach"),'broken modal selector returned');

  const guarded=await fetch(base+'/sponsor/app',{
    redirect:'manual',
    headers:{accept:'text/html'}
  });
  assert(guarded.status===302,'private sponsor route should redirect without session, got '+guarded.status);
  assert(guarded.headers.get('location')==='/sponsor/?access=1','unexpected private redirect '+guarded.headers.get('location'));

  const css=await fetch(base+'/sponsor/sponsor.css');
  assert(css.status===200,'sponsor.css status '+css.status);

  console.log('Sponsor runtime smoke PASS',{
    publicStatus:pub.status,
    privateStatus:guarded.status,
    redirect:guarded.headers.get('location')
  });
} finally {
  stop();
}
