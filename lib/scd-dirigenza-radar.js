const crypto=require('crypto');

function decodeEntities(s=''){
  return String(s)
    .replace(/&nbsp;/gi,' ')
    .replace(/&amp;/gi,'&')
    .replace(/&quot;/gi,'"')
    .replace(/&#39;|&apos;/gi,"'")
    .replace(/&lt;/gi,'<')
    .replace(/&gt;/gi,'>');
}
function stripTags(s=''){return decodeEntities(String(s).replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim()}
function absoluteUrl(href,base){
  try{return new URL(href,base).toString()}catch{return null}
}
function stableId(sourceId,url,title){
  return crypto.createHash('sha256').update([sourceId,url,title].join('|')).digest('hex').slice(0,20);
}
function extractAnchors(html,baseUrl){
  const out=[];
  const re=/<a\b[^>]*href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while((m=re.exec(String(html||'')))){
    const href=m[1]||m[2]||m[3]||'';
    const url=absoluteUrl(href,baseUrl);
    const title=stripTags(m[4]);
    if(!url||!title||title.length<4)continue;
    out.push({url,title});
  }
  return out;
}
function scanSourceHtml(source,html){
  const keywords=(source.scanKeywords||[]).map(x=>String(x).toLowerCase());
  const seen=new Set(),out=[];
  for(const a of extractAnchors(html,source.url)){
    const hay=(a.title+' '+a.url).toLowerCase();
    if(keywords.length&&!keywords.some(k=>hay.includes(k)))continue;
    const key=a.url.replace(/#.*$/,'');
    if(seen.has(key))continue;
    seen.add(key);
    out.push({
      id:'DISC-'+stableId(source.id,key,a.title),
      category:source.category,
      territory:source.territory||null,
      title:a.title,
      sourceId:source.id,
      sourceUrl:key,
      authority:source.authority,
      trust:source.trust,
      verification:'DISCOVERED_NEEDS_REVIEW'
    });
  }
  return out;
}
function mergeCandidates(previous=[],next=[],detectedAt=new Date().toISOString()){
  const map=new Map((previous||[]).map(x=>[x.id,x]));
  for(const item of next||[]){
    const old=map.get(item.id);
    map.set(item.id,{...old,...item,firstDetectedAt:old?.firstDetectedAt||detectedAt,lastDetectedAt:detectedAt});
  }
  return [...map.values()].sort((a,b)=>String(b.lastDetectedAt||'').localeCompare(String(a.lastDetectedAt||'')));
}
module.exports={decodeEntities,stripTags,absoluteUrl,stableId,extractAnchors,scanSourceHtml,mergeCandidates};
