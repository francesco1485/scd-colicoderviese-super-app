import fs from 'node:fs';

const manifest=JSON.parse(fs.readFileSync('SCD_SYSTEM_MANIFEST.json','utf8'));
const url=process.env.SCD_R20_URL||manifest.architecture?.current?.r20_apps_script;
if(!url)throw new Error('R20 Apps Script URL missing');

const outDir='test-output';
fs.mkdirSync(outDir,{recursive:true});
const evidence={checkedAt:new Date().toISOString(),url,checks:{}};

async function probe(action,payload={}){
  const ctrl=new AbortController();
  const timer=setTimeout(()=>ctrl.abort(),45000);
  try{
    const r=await fetch(url,{
      method:'POST',
      redirect:'follow',
      signal:ctrl.signal,
      headers:{'content-type':'application/json','user-agent':'SCD-R20-Direct-Evidence/31.0'},
      body:JSON.stringify({action,payload,sessionToken:''})
    });
    const text=await r.text();
    let body=null;try{body=JSON.parse(text)}catch{}
    return {httpStatus:r.status,ok:r.ok,body,finalHost:new URL(r.url).host,parseOk:Boolean(body)};
  }finally{clearTimeout(timer)}
}

const feed=await probe('public.feed',{limit:1});
evidence.checks.publicFeed={
  httpStatus:feed.httpStatus,
  parseOk:feed.parseOk,
  apiOk:feed.body?.ok??null,
  version:feed.body?.version??feed.body?.data?.version??null,
  finalHost:feed.finalHost
};

const contract=await probe('public.datafabric.contract',{});
const d=contract.body?.data||{};
evidence.checks.dataFabricContract={
  httpStatus:contract.httpStatus,
  parseOk:contract.parseOk,
  apiOk:contract.body?.ok??null,
  version:contract.body?.version??null,
  error:contract.body?.error??null,
  release:d.release||null,
  contractVersion:d.contractVersion||null,
  finalHost:contract.finalHost
};

const feedOk=feed.httpStatus===200&&feed.body?.ok===true;
const contractOk=contract.httpStatus===200&&contract.body?.ok===true&&d.release==='R29'&&d.contractVersion==='1.0.0';
evidence.feedOk=feedOk;
evidence.contractOk=contractOk;
evidence.safeToActivateR29DataFabric=feedOk&&contractOk;
fs.writeFileSync(outDir+'/r20-runtime-evidence.json',JSON.stringify(evidence,null,2)+'\n');

console.log('SCD R20 DIRECT EVIDENCE',evidence);
if(!feedOk||!contractOk)process.exit(1);
