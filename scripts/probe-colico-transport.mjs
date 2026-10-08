// Diagnostic-only. Does not write snapshots or verify opportunities.
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const config=JSON.parse(fs.readFileSync(new URL('../config/scd-dirigenza-radar-sources.v1.json',import.meta.url),'utf8'));
const source=config.sources.find(x=>x.id==='COMUNE_COLICO_TRANSPARENCY_CONTRIBUTI');
if(!source)throw new Error('SOURCE_MISSING');
const urls=[source.url,...(source.fallbackUrls||[])];
const results=[];
for(const address of urls){
  const u=new URL(address);
  if(u.protocol!=='https:'||!/^(?:www\.)?halleyweb\.com$|^tecuting\.halleylombardia\.it$/.test(u.hostname)){
    throw new Error('UNEXPECTED_UNTRUSTED_PROBE_HOST');
  }
  const args=[
    '--head','--location','--max-redirs','2',
    '--connect-timeout','5','--max-time','11',
    '--silent','--show-error',
    '--proto','=https','--proto-redir','=https',
    '--user-agent','SCD-ColicoDerviese-Dirigenza-Radar/1.0',
    '--output','/dev/null',
    '--write-out','%{http_code}|%{time_total}|%{url_effective}',
    address
  ];
  const out=spawnSync('curl',args,{encoding:'utf8',timeout:13000,maxBuffer:65536});
  const [status,total,effective]=String(out.stdout||'').trim().split('|');
  let endHost=null;
  try{endHost=new URL(effective).hostname}catch{}
  results.push({
    host:u.hostname,
    exitCode:out.status??null,
    statusCode:/^\d{3}$/.test(status||'')?Number(status):null,
    effectiveHost:endHost,
    durationSeconds:Number.isFinite(Number(total))?Number(total):null,
    transportError:String(out.stderr||'').trim().slice(0,180)||null
  });
}
console.log(JSON.stringify({probe:'OFFICIAL_COLICO_TRANSPORT_DIAGNOSTIC_ONLY',method:'CURL_HEAD',results},null,2));
// Network failures are diagnostic; the source health is governed by the actual Radar GET.
