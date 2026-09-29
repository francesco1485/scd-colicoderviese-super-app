import fs from 'node:fs';

const EXPECTED_VERSION=process.env.SCD_EXPECTED_VERSION||'30.0.0';
const EXPECTED_MANIFEST=process.env.SCD_EXPECTED_MANIFEST||'1.7.0';
const PAGES_URL=process.env.SCD_PAGES_URL||'https://francesco1485.github.io/scd-colicoderviese-super-app/';
const RENDER_BASE=(process.env.SCD_RENDER_BASE_URL||'https://scd-colicoderviese-official-r21.onrender.com').replace(/\/$/,'');
const ATTEMPTS=Math.max(1,Number(process.env.SCD_PROD_VERIFY_ATTEMPTS||20));
const DELAY_MS=Math.max(1000,Number(process.env.SCD_PROD_VERIFY_DELAY_MS||15000));
const outDir='test-output';
fs.mkdirSync(outDir,{recursive:true});

const evidence={
  release:'R31',
  expectedVersion:EXPECTED_VERSION,
  expectedManifest:EXPECTED_MANIFEST,
  startedAt:new Date().toISOString(),
  pagesUrl:PAGES_URL,
  renderBaseUrl:RENDER_BASE,
  attempts:[],
  finalStatus:'UNVERIFIED'
};

const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function getText(url,options={}){
  const ctrl=new AbortController();
  const timer=setTimeout(()=>ctrl.abort(),15000);
  try{
    const r=await fetch(url,{redirect:'follow',cache:'no-store',signal:ctrl.signal,...options});
    const text=await r.text();
    return {ok:r.ok,status:r.status,text,headers:Object.fromEntries(r.headers.entries())};
  }finally{clearTimeout(timer)}
}
function parseJson(label,text){
  try{return JSON.parse(text)}
  catch{throw new Error(label+' returned invalid JSON')}
}
async function runChecks(attempt){
  const result={attempt,at:new Date().toISOString(),checks:{},failures:[]};

  try{
    const r=await getText(PAGES_URL+(PAGES_URL.includes('?')?'&':'?')+'scd_verify='+Date.now());
    const hasBuild=new RegExp('name=["\\\']scd-build["\\\'][^>]*content=["\\\']'+EXPECTED_VERSION.replace(/\./g,'\\.')+'["\\\']','i').test(r.text)
      || new RegExp('content=["\\\']'+EXPECTED_VERSION.replace(/\./g,'\\.')+'["\\\'][^>]*name=["\\\']scd-build["\\\']','i').test(r.text);
    result.checks.pages={httpStatus:r.status,ok:r.ok&&hasBuild,buildVersion:hasBuild?EXPECTED_VERSION:'MISMATCH'};
    if(!result.checks.pages.ok)result.failures.push('PAGES_BUILD_VERSION');
  }catch(e){
    result.checks.pages={ok:false,error:String(e.message||e)};
    result.failures.push('PAGES_BUILD_VERSION');
  }

  try{
    const r=await getText(RENDER_BASE+'/health?scd_verify='+Date.now());
    const j=parseJson('Render health',r.text);
    const ok=r.ok&&j.ok===true&&j.version===EXPECTED_VERSION;
    result.checks.renderHealth={httpStatus:r.status,ok,version:j.version||null,service:j.service||null};
    if(!ok)result.failures.push('RENDER_HEALTH_VERSION');
  }catch(e){
    result.checks.renderHealth={ok:false,error:String(e.message||e)};
    result.failures.push('RENDER_HEALTH_VERSION');
  }

  try{
    const r=await getText(RENDER_BASE+'/api/capabilities?scd_verify='+Date.now());
    const j=parseJson('Render capabilities',r.text);
    const actionOk=Array.isArray(j.actions)&&j.actions.includes('public.datafabric.contract');
    const flagOk=j.featureFlags?.dataFabricObservability===true;
    const ok=r.ok&&j.ok===true&&j.version===EXPECTED_VERSION&&actionOk&&flagOk;
    result.checks.renderCapabilities={httpStatus:r.status,ok,version:j.version||null,actionOk,flagOk};
    if(!ok)result.failures.push('RENDER_FEATURE_FLAGS');
  }catch(e){
    result.checks.renderCapabilities={ok:false,error:String(e.message||e)};
    result.failures.push('RENDER_FEATURE_FLAGS');
  }

  try{
    const r=await getText(RENDER_BASE+'/api/scd',{
      method:'POST',
      headers:{'content-type':'application/json','x-scd-client':'production-evidence'},
      body:JSON.stringify({action:'public.datafabric.contract',payload:{},sessionToken:''})
    });
    const j=parseJson('R20 contract probe',r.text);
    const d=j.data||{};
    const obs=Array.isArray(d.observabilityFields)&&['status','lastSync','lastSuccess','lastError'].every(x=>d.observabilityFields.includes(x));
    const prov=Array.isArray(d.provenanceFields)&&['SOURCE','TABLE','FIELD','API','FALLBACK','REFRESH'].every(x=>d.provenanceFields.includes(x));
    const ok=r.ok&&j.ok===true&&d.release==='R29'&&d.contractVersion==='1.0.0'&&obs&&prov&&d.safeguarding==='ISOLATED'&&d.destructiveAutoWrite===false;
    const deterministicMissing=r.ok&&j.ok===false&&/non supportata|non installato|not supported/i.test(String(j.error||''));
    result.checks.r20Contract={httpStatus:r.status,ok,release:d.release||null,contractVersion:d.contractVersion||null,observabilityFieldsOk:obs,provenanceFieldsOk:prov,error:j.error||null,deterministicMissing};
    if(!ok)result.failures.push('R20_DATA_FABRIC_CONTRACT_END_TO_END');
    if(deterministicMissing)result.hardFailure='R20_RUNTIME_CONTRACT_MISSING';
  }catch(e){
    result.checks.r20Contract={ok:false,error:String(e.message||e)};
    result.failures.push('R20_DATA_FABRIC_CONTRACT_END_TO_END');
  }

  return result;
}

let passed=false;
for(let i=1;i<=ATTEMPTS;i++){
  const attempt=await runChecks(i);
  evidence.attempts.push(attempt);
  evidence.lastAttempt=attempt;
  fs.writeFileSync(outDir+'/production-evidence.json',JSON.stringify(evidence,null,2)+'\n');
  if(!attempt.failures.length){passed=true;break}
  if(attempt.hardFailure){evidence.hardFailure=attempt.hardFailure;console.error('SCD production evidence hard failure',attempt.hardFailure);break}
  console.warn('SCD production evidence pending',{attempt:i,failures:attempt.failures});
  if(i<ATTEMPTS)await sleep(DELAY_MS);
}
evidence.finishedAt=new Date().toISOString();
evidence.finalStatus=passed?'VERIFIED':'UNVERIFIED';
evidence.safeToDeclareLive=passed;
fs.writeFileSync(outDir+'/production-evidence.json',JSON.stringify(evidence,null,2)+'\n');

if(!passed){
  console.error('SCD PRODUCTION EVIDENCE FAIL',evidence.lastAttempt);
  process.exit(1);
}
console.log('SCD PRODUCTION EVIDENCE PASS',{
  version:EXPECTED_VERSION,
  manifest:EXPECTED_MANIFEST,
  attempts:evidence.attempts.length,
  pages:PAGES_URL,
  render:RENDER_BASE
});
