import {spawn} from 'node:child_process';

const port=18765;
const base='http://127.0.0.1:'+port;
const child=spawn(process.execPath,['server.js'],{
  env:{
    ...process.env,
    PORT:String(port),
    SCD_DONATION_PAYMENT_URL_TEMPLATE:'https://payments.example.test/donate?amount={amount}&currency={currency}',
    SCD_DONATION_PAYMENT_PROVIDER:'TEST_PROVIDER',
    SCD_DONATION_BANK_TRANSFER_PUBLIC:'true',
    SCD_DONATION_IBAN:'IT00X0000000000000000000000',
    SCD_DONATION_ACCOUNT_HOLDER:'SCD TEST',
    SCD_DONATION_CAUSAL:'Test Fondo Solidale'
  },
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
  assert(pubText.includes('IL CENTRO SPORTIVO CHE CRESCE'),'public Center development surface missing');
  assert(pubText.includes('FONDO')&&pubText.includes('SOLIDALE'),'public Solidarity Fund surface missing');
  assert(pubText.includes('id="donationConsole"'),'public spontaneous donation console missing');
  assert(pubText.includes('id="solidarityIntentForm"'),'Solidarity Fund intent form missing');
  assert(pubText.includes('sponsor.js'),'public sponsor page missing JS');

  const js=await fetch(base+'/sponsor/sponsor.js');
  const jsText=await js.text();
  assert(js.status===200,'sponsor.js status '+js.status);
  assert(jsText.includes('scd-colicoderviese-official-r21.onrender.com'),'public login target is not official service');
  assert(jsText.includes("$('.modal').forEach"),'correct modal collection selector missing');

  const donationConfigResponse=await fetch(base+'/api/public/donation-config');
  assert(donationConfigResponse.status===200,'donation config status '+donationConfigResponse.status);
  const donationConfig=await donationConfigResponse.json();
  assert(donationConfig.ok===true,'donation config not ok');
  assert(donationConfig.channels?.online?.enabled===true,'test online donation channel should be enabled');
  assert(donationConfig.channels?.online?.amountAware===true,'test payment link should be amount-aware');
  assert(donationConfig.channels?.bankTransfer?.enabled===true,'test bank transfer should be enabled');
  assert(donationConfig.publicDonorWall===false,'public donor wall must stay disabled');
  assert(donationConfig.taxBenefitClaim===false,'automatic tax benefit claim must stay disabled');

  const invalidDonation=await fetch(base+'/api/public/donation-intent',{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({amount:0,name:'QA',email:'qa@example.test',phone:'000',privacy:true})
  });
  assert(invalidDonation.status===400,'invalid donation amount must fail closed');

  const probe=await fetch(base+'/api/sponsor/session?probe=1');
  assert(probe.status===200,'session probe status '+probe.status);
  const probeJson=await probe.json();
  assert(probeJson.authenticated===false,'anonymous session probe must be false');

  const developmentGuard=await fetch(base+'/api/sponsor/development');
  assert(developmentGuard.status===401,'Development API must require Sponsor session, got '+developmentGuard.status);

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
