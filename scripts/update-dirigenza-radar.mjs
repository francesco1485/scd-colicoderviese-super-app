import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {scanSourceHtml,mergeCandidates}=require('../lib/scd-dirigenza-radar.js');

const ROOT=path.resolve(new URL('..',import.meta.url).pathname);
const config=JSON.parse(fs.readFileSync(path.join(ROOT,'config','scd-dirigenza-radar-sources.v1.json'),'utf8'));
const snapshotPath=path.join(ROOT,'data','scd-dirigenza-radar.snapshot.json');
const previous=JSON.parse(fs.readFileSync(snapshotPath,'utf8'));
const dryRun=process.argv.includes('--dry-run');
const now=new Date().toISOString();
const sourceHealth=[];
let discovered=[];

for(const source of config.sources||[]){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),15000);
  try{
    const res=await fetch(source.url,{headers:{'user-agent':'SCD-ColicoDerviese-Dirigenza-Radar/1.0 (+https://www.colicoderviese.it/)'},signal:controller.signal});
    if(!res.ok)throw new Error('HTTP_'+res.status);
    const html=await res.text();
    const items=scanSourceHtml(source,html);
    discovered.push(...items);
    sourceHealth.push({sourceId:source.id,status:'OK',checkedAt:now,httpStatus:res.status,discovered:items.length});
  }catch(error){
    sourceHealth.push({sourceId:source.id,status:'ERROR',checkedAt:now,error:String(error?.message||error)});
  }finally{clearTimeout(timer)}
}
const verifiedUrls=new Set((previous.verifiedItems||[]).map(x=>x.sourceUrl));
discovered=discovered.filter(x=>!verifiedUrls.has(x.sourceUrl));
const next={
  ...previous,
  generatedAt:now,
  sourceHealth,
  candidates:mergeCandidates(previous.candidates||[],discovered,now)
};
if(dryRun){
  console.log(JSON.stringify({ok:true,dryRun:true,sources:sourceHealth,candidates:next.candidates.length,verifiedItems:(next.verifiedItems||[]).length},null,2));
}else{
  fs.writeFileSync(snapshotPath,JSON.stringify(next,null,2)+'\n');
  console.log(JSON.stringify({ok:true,written:snapshotPath,sources:sourceHealth.length,candidates:next.candidates.length,verifiedItems:(next.verifiedItems||[]).length},null,2));
}
