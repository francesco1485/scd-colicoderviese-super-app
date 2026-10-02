import fs from 'node:fs';

const EXPECTED_VERSION=process.env.SCD_EXPECTED_VERSION||'40.0.0';
const EXPECTED_RELEASE=process.env.SCD_EXPECTED_RELEASE||'NG-0.7.0';
const EXPECTED_MANIFEST=process.env.SCD_EXPECTED_MANIFEST||'3.26.0';
const EXPECTED_COMMIT=process.env.SCD_EXPECTED_COMMIT||process.env.GITHUB_SHA||'';
const PAGES_URL=process.env.SCD_PAGES_URL||'https://francesco1485.github.io/scd-colicoderviese-super-app/';
const RENDER_BASE=(process.env.SCD_RENDER_BASE_URL||'https://scd-colicoderviese-official-r21.onrender.com').replace(/\/$/,'');
const ATTEMPTS=Math.max(1,Number(process.env.SCD_PROD_VERIFY_ATTEMPTS||20));
const DELAY_MS=Math.max(1000,Number(process.env.SCD_PROD_VERIFY_DELAY_MS||15000));
const outDir='test-output';
fs.mkdirSync(outDir,{recursive:true});

const evidence={
  release:'R54',
  expectedVersion:EXPECTED_VERSION,
  expectedRelease:EXPECTED_RELEASE,
  expectedManifest:EXPECTED_MANIFEST,
  expectedCommit:EXPECTED_COMMIT||null,
  startedAt:new Date().toISOString(),
  pagesUrl:PAGES_URL,
  renderBaseUrl:RENDER_BASE,
  attempts:[],
  finalStatus:'UNVERIFIED'
};

const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function getText(url,options={}){
  const ctrl=new AbortController();
  const timer=setTimeout(()=>ctrl.abort(),25000);
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
function cacheBust(url){return url+(url.includes('?')?'&':'?')+'scd_verify='+Date.now()}
function systemManifestVersion(j){return j?.manifest?.version||null}
async function runChecks(attempt){
  const result={attempt,at:new Date().toISOString(),checks:{},failures:[]};

  try{
    const r=await getText(cacheBust(PAGES_URL));
    const escVersion=EXPECTED_VERSION.replace(/\./g,'\\.');
    const escRelease=EXPECTED_RELEASE.replace(/\./g,'\\.');
    const hasBuild=new RegExp('name=["\\\']scd-build["\\\'][^>]*content=["\\\']'+escVersion+'["\\\']','i').test(r.text)
      || new RegExp('content=["\\\']'+escVersion+'["\\\'][^>]*name=["\\\']scd-build["\\\']','i').test(r.text);
    const hasRelease=new RegExp('name=["\\\']scd-release["\\\'][^>]*content=["\\\']'+escRelease+'["\\\']','i').test(r.text)
      || new RegExp('content=["\\\']'+escRelease+'["\\\'][^>]*name=["\\\']scd-release["\\\']','i').test(r.text);
    result.checks.pages={httpStatus:r.status,ok:r.ok&&hasBuild&&hasRelease,buildVersion:hasBuild?EXPECTED_VERSION:'MISMATCH',release:hasRelease?EXPECTED_RELEASE:'MISMATCH'};
    if(!result.checks.pages.ok)result.failures.push('PAGES_APP_SHELL_VERSION');
  }catch(e){
    result.checks.pages={ok:false,error:String(e.message||e)};
    result.failures.push('PAGES_APP_SHELL_VERSION');
  }

  try{
    const manifestUrl=new URL('SCD_SYSTEM_MANIFEST.json',PAGES_URL).toString();
    const r=await getText(cacheBust(manifestUrl));
    const j=parseJson('Pages system manifest',r.text);
    const version=systemManifestVersion(j);
    const ok=r.ok&&version===EXPECTED_MANIFEST&&j?.manifest?.status==='BINDING';
    result.checks.pagesManifest={httpStatus:r.status,ok,version,status:j?.manifest?.status||null};
    if(!ok)result.failures.push('PAGES_MANIFEST_VERSION');
  }catch(e){
    result.checks.pagesManifest={ok:false,error:String(e.message||e)};
    result.failures.push('PAGES_MANIFEST_VERSION');
  }

  try{
    const r=await getText(RENDER_BASE+'/health?scd_verify='+Date.now());
    const j=parseJson('Render health',r.text);
    const commitOk=Boolean(EXPECTED_COMMIT)&&j.commit===EXPECTED_COMMIT;
    const ok=r.ok&&j.ok===true&&j.version===EXPECTED_VERSION&&commitOk;
    result.checks.renderHealth={httpStatus:r.status,ok,version:j.version||null,service:j.service||null,commit:j.commit||null,expectedCommit:EXPECTED_COMMIT||null,commitOk};
    if(!r.ok||j.ok!==true||j.version!==EXPECTED_VERSION)result.failures.push('RENDER_HEALTH_VERSION');
    if(!commitOk)result.failures.push('RENDER_HEALTH_COMMIT');
  }catch(e){
    result.checks.renderHealth={ok:false,error:String(e.message||e)};
    result.failures.push('RENDER_HEALTH_VERSION');
  }

  try{
    const r=await getText(cacheBust(RENDER_BASE+'/SCD_SYSTEM_MANIFEST.json'));
    const j=parseJson('Render system manifest',r.text);
    const version=systemManifestVersion(j);
    const ok=r.ok&&version===EXPECTED_MANIFEST&&j?.manifest?.status==='BINDING';
    result.checks.renderManifest={httpStatus:r.status,ok,version,status:j?.manifest?.status||null};
    if(!ok)result.failures.push('RENDER_MANIFEST_VERSION');
  }catch(e){
    result.checks.renderManifest={ok:false,error:String(e.message||e)};
    result.failures.push('RENDER_MANIFEST_VERSION');
  }

  try{
    const r=await getText(RENDER_BASE+'/api/capabilities?scd_verify='+Date.now());
    const j=parseJson('Render capabilities',r.text);
    const actionOk=Array.isArray(j.actions)&&j.actions.includes('public.datafabric.contract');
    const dataFabricEnabled=j.featureFlags?.dataFabricObservability;
    const dataFabricFlagDeclared=typeof dataFabricEnabled==='boolean';
    const supabaseCoreEnabled=j.featureFlags?.supabaseCore;
    const supabaseFlagDeclared=typeof supabaseCoreEnabled==='boolean';
    const supabaseConfigured=j.domainCore?.configured===true;
    const supabaseProjectOk=j.domainCore?.projectId==='ndevtxxijbcnskgysdit';
    const supabaseSafelyDark=supabaseCoreEnabled===false;
    const ok=r.ok&&j.ok===true&&j.version===EXPECTED_VERSION&&actionOk&&dataFabricFlagDeclared&&supabaseFlagDeclared&&supabaseConfigured&&supabaseProjectOk&&supabaseSafelyDark;
    result.checks.renderCapabilities={httpStatus:r.status,ok,version:j.version||null,actionOk,dataFabricFlagDeclared,dataFabricEnabled,supabaseFlagDeclared,supabaseCoreEnabled,supabaseConfigured,supabaseProjectOk,supabaseSafelyDark};
    if(!ok)result.failures.push('RENDER_FEATURE_FLAGS_OR_DOMAIN_CORE_CONFIG');
  }catch(e){
    result.checks.renderCapabilities={ok:false,error:String(e.message||e),dataFabricEnabled:null};
    result.failures.push('RENDER_FEATURE_FLAGS');
  }

  try{
    const r=await getText(RENDER_BASE+'/api/newsroom?scd_verify='+Date.now());
    const j=parseJson('Render newsroom',r.text);
    const policyOk=j.editorialPolicy==='VERIFIED_STRUCTURED_FACTS_ONLY'&&j.staleSiteContent===false;
    const calendarOk=Array.isArray(j.calendar?.rows)&&typeof j.calendar?.counts?.activities==='number';
    const cardsOk=Array.isArray(j.cards)&&j.cards.length>0;
    const ok=r.ok&&j.ok===true&&j.release==='R40'&&policyOk&&calendarOk&&cardsOk;
    result.checks.newsroom={httpStatus:r.status,ok,release:j.release||null,policyOk,calendarOk,cardsOk,staleSiteContent:j.staleSiteContent};
    if(!ok)result.failures.push('R40_NEWSROOM_CONTRACT');
  }catch(e){
    result.checks.newsroom={ok:false,error:String(e.message||e)};
    result.failures.push('R40_NEWSROOM_CONTRACT');
  }

  try{
    const r=await getText(RENDER_BASE+'/api/public/donation-config?scd_verify='+Date.now());
    const j=parseJson('Render donation config',r.text);
    const fundOk=j.fund?.id==='SCD_SOLIDARITY_FUND'&&j.fund?.currency==='EUR';
    const privacyOk=j.publicDonorWall===false&&j.taxBenefitClaim===false;
    const channelShape=typeof j.channels?.online?.enabled==='boolean'&&typeof j.channels?.bankTransfer?.enabled==='boolean';
    const ok=r.ok&&j.ok===true&&fundOk&&privacyOk&&channelShape;
    result.checks.solidarityFund={httpStatus:r.status,ok,fundOk,privacyOk,channelShape,onlineEnabled:j.channels?.online?.enabled===true,bankTransferEnabled:j.channels?.bankTransfer?.enabled===true};
    if(!ok)result.failures.push('SOLIDARITY_FUND_PUBLIC_CONTRACT');
  }catch(e){
    result.checks.solidarityFund={ok:false,error:String(e.message||e)};
    result.failures.push('SOLIDARITY_FUND_PUBLIC_CONTRACT');
  }

  if(result.checks.renderCapabilities?.dataFabricEnabled===true){
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
      result.checks.r20Contract={httpStatus:r.status,ok,required:true,release:d.release||null,contractVersion:d.contractVersion||null,observabilityFieldsOk:obs,provenanceFieldsOk:prov,error:j.error||null,deterministicMissing};
      if(!ok)result.failures.push('R20_DATA_FABRIC_CONTRACT_END_TO_END');
      if(deterministicMissing)result.hardFailure='R20_RUNTIME_CONTRACT_MISSING';
    }catch(e){
      result.checks.r20Contract={ok:false,required:true,error:String(e.message||e)};
      result.failures.push('R20_DATA_FABRIC_CONTRACT_END_TO_END');
    }
  }else if(result.checks.renderCapabilities?.dataFabricEnabled===false){
    result.checks.r20Contract={
      ok:true,
      required:false,
      skipped:true,
      state:'GATED_OFF_NOT_LIVE',
      reason:'FF-DATAFABRIC-OBSERVABILITY disabled until R20 deployment is upgraded'
    };
  }else{
    result.checks.r20Contract={ok:false,required:false,skipped:true,state:'UNVERIFIED',reason:'feature flag state unavailable'};
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
evidence.safeToDeclareDataFabricLive=passed&&evidence.lastAttempt?.checks?.renderCapabilities?.dataFabricEnabled===true&&evidence.lastAttempt?.checks?.r20Contract?.ok===true;
evidence.dataFabricRuntimeState=evidence.lastAttempt?.checks?.renderCapabilities?.dataFabricEnabled===false?'GATED_OFF_NOT_LIVE':(evidence.safeToDeclareDataFabricLive?'VERIFIED_LIVE':'UNVERIFIED');
evidence.supabaseRuntimeState=evidence.lastAttempt?.checks?.renderCapabilities?.supabaseCoreEnabled===false&&evidence.lastAttempt?.checks?.renderCapabilities?.supabaseConfigured===true?'DARK_DUAL_RUN_READY':'UNVERIFIED';
fs.writeFileSync(outDir+'/production-evidence.json',JSON.stringify(evidence,null,2)+'\n');

if(!passed){
  console.error('SCD PRODUCTION EVIDENCE FAIL',evidence.lastAttempt);
  process.exit(1);
}
console.log('SCD PRODUCTION EVIDENCE PASS',{
  version:EXPECTED_VERSION,
  release:EXPECTED_RELEASE,
  manifest:EXPECTED_MANIFEST,
  commit:EXPECTED_COMMIT||null,
  attempts:evidence.attempts.length,
  pages:PAGES_URL,
  render:RENDER_BASE,
  dataFabricRuntimeState:evidence.dataFabricRuntimeState,
  supabaseRuntimeState:evidence.supabaseRuntimeState
});
