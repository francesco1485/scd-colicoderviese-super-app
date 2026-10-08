import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {scanSourceHtml,mergeCandidates,normalizeSourceUrl,diagnoseFetchFailure}=require('../lib/scd-dirigenza-radar.js');

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const config=JSON.parse(fs.readFileSync(path.join(ROOT,'config','scd-dirigenza-radar-sources.v1.json'),'utf8'));
const snapshotPath=path.join(ROOT,'data','scd-dirigenza-radar.snapshot.json');
const previous=JSON.parse(fs.readFileSync(snapshotPath,'utf8'));
const dryRun=process.argv.includes('--dry-run');
const requireHealthy=process.argv.includes('--require-healthy');
const now=new Date().toISOString();

const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const maxAttempts=3;
async function scanOne(source){
  let lastError=null;
  let attempts=0;
  const endpointFailures=[];
  const endpoints=[source.url,...(source.fallbackUrls||[])];
  for(const endpoint of [...new Set(endpoints)]){
    for(let attempt=1;attempt<=maxAttempts;attempt++){
      attempts++;
      const controller=new AbortController();
      const timer=setTimeout(()=>controller.abort(),20000);
      try{
        const res=await fetch(endpoint,{
          headers:{'user-agent':'SCD-ColicoDerviese-Dirigenza-Radar/1.0 (+https://www.colicoderviese.it/)'},
          signal:controller.signal
        });
        if(!res.ok){
          const failure=new Error('HTTP_'+res.status);
          failure.permanent=res.status>=400&&res.status<500&&res.status!==429;
          throw failure;
        }
        const html=await res.text();
        const items=scanSourceHtml({...source,url:endpoint},html);
        return {
          items,
          health:{
            sourceId:source.id,status:'OK',checkedAt:now,httpStatus:res.status,
            discovered:items.length,attempts,effectiveUrl:endpoint,
            fallbackUsed:endpoint!==source.url
          }
        };
      }catch(error){
        lastError=error;
        const diagnostic=diagnoseFetchFailure(error);
        endpointFailures.push({host:new URL(endpoint).hostname,attempt,...diagnostic});
        if(error?.permanent||diagnostic.category==='DNS_FAILURE'||diagnostic.category==='TLS_FAILURE'||attempt===maxAttempts)break;
      }finally{clearTimeout(timer)}
      await wait(700*attempt);
    }
  }
  return {
    items:[],
    health:{
      sourceId:source.id,status:'ERROR',checkedAt:now,
      error:String(lastError?.message||lastError),attempts,
      attemptedEndpoints:endpoints.length,
      failureKind:diagnoseFetchFailure(lastError).category,
      failureCode:diagnoseFetchFailure(lastError).code,
      endpointFailures
    }
  };
}
async function scanAll(sources,limit=4){
  const results=new Array(sources.length);
  let index=0;
  async function worker(){
    while(index<sources.length){
      const slot=index++;
      results[slot]=await scanOne(sources[slot]);
    }
  }
  await Promise.all(Array.from({length:Math.min(limit,sources.length)},worker));
  return results;
}

const results=await scanAll(config.sources||[]);
const sourceHealth=results.map(x=>x.health);
const verifiedUrls=new Set((previous.verifiedItems||[]).map(x=>
  normalizeSourceUrl(x.sourceUrl,{url:x.sourceUrl})||x.sourceUrl
));
const discovered=results.flatMap(x=>x.items).filter(x=>!verifiedUrls.has(x.sourceUrl));
const failed=sourceHealth.filter(x=>x.status==='ERROR');
const next={
  ...previous,
  generatedAt:now,
  sourceHealth,
  candidates:mergeCandidates(previous.candidates||[],discovered,now)
};
const report={
  ok:failed.length===0,
  health:failed.length?'DEGRADED':'HEALTHY',
  dryRun,
  generatedAt:now,
  totalSources:sourceHealth.length,
  healthySources:sourceHealth.length-failed.length,
  sourceErrors:failed.length,
  sources:sourceHealth,
  reviewCandidates:next.candidates.length,
  verifiedItems:(next.verifiedItems||[]).length
};
if(!dryRun){
  fs.writeFileSync(snapshotPath,JSON.stringify(next,null,2)+'\n');
  report.written=snapshotPath;
}
if(failed.length)console.error('::warning::Direction Radar source health DEGRADED; candidates have NOT been promoted.');
console.log(JSON.stringify(report,null,2));
if(requireHealthy&&failed.length)process.exitCode=1;
