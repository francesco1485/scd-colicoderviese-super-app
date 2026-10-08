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
function stripTags(s=''){
  return decodeEntities(String(s)
    .replace(/<script[\s\S]*?<\/script>/gi,' ')
    .replace(/<style[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim();
}
function normalizedHostname(hostname){
  return String(hostname||'').toLowerCase().replace(/^www\./,'');
}
function normalizeSourceUrl(href,source){
  try{
    const base=new URL(source.url);
    const url=new URL(href,base);
    if(url.protocol!=='https:')return null;
    const allowed=new Set([normalizedHostname(base.hostname),...(source.allowedHosts||[]).map(normalizedHostname)]);
    if(!allowed.has(normalizedHostname(url.hostname)))return null;
    if(/\.(?:jpg|jpeg|png|gif|svg|webp|css|js|ico)(?:$|\?)/i.test(url.pathname))return null;
    url.hash='';
    for(const key of [...url.searchParams.keys()]){
      if(/^utm_/i.test(key)||/^(?:fbclid|gclid|msclkid|igshid|ref_src)$/i.test(key))url.searchParams.delete(key);
    }
    if(url.pathname!=='/')url.pathname=url.pathname.replace(/\/+$/,'');
    return url.toString();
  }catch{return null}
}
function absoluteUrl(href,base){
  try{return new URL(href,base).toString()}catch{return null}
}
function stableId(sourceId,url){
  return crypto.createHash('sha256').update([sourceId,url].join('|')).digest('hex').slice(0,20);
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
const NAV_LABEL=/^(?:home|homepage|eventi|eventi e manifestazioni|bandi|bandi e contributi|notizie|news|sport|contatti|privacy|cookie policy|leggi di più|scopri di più|dettagli|continua|menu|amministrazione trasparente)$/i;
function scanSourceHtml(source,html){
  const keywords=(source.scanKeywords||[]).map(x=>String(x).toLowerCase());
  const seen=new Set(),out=[];
  const sourcePage=normalizeSourceUrl(source.url,source);
  for(const a of extractAnchors(html,source.url)){
    if(NAV_LABEL.test(a.title.trim()))continue;
    const key=normalizeSourceUrl(a.url,source);
    if(!key||key===sourcePage||seen.has(key))continue;
    const page=new URL(key);
    let path=page.pathname;
    try{path=decodeURIComponent(path)}catch{}
    // Deliberately exclude hostname: "visitcolico.it" must not make every link an event.
    const hay=(a.title+' '+path+' '+page.search).toLowerCase();
    if(keywords.length&&!keywords.some(k=>hay.includes(k)))continue;
    seen.add(key);
    out.push({
      id:'DISC-'+stableId(source.id,key),
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
    map.set(item.id,{
      ...old,...item,
      verification:'DISCOVERED_NEEDS_REVIEW',
      firstDetectedAt:old?.firstDetectedAt||detectedAt,
      lastDetectedAt:detectedAt
    });
  }
  return [...map.values()].sort((a,b)=>String(b.lastDetectedAt||'').localeCompare(String(a.lastDetectedAt||'')));
}
module.exports={decodeEntities,stripTags,absoluteUrl,normalizeSourceUrl,stableId,extractAnchors,scanSourceHtml,mergeCandidates};
