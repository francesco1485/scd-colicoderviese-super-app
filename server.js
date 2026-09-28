const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT || 10000;
const ROOT = __dirname;
const UPSTREAM = process.env.SCD_APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbwYQ_3yLYsp-6jX3FIgufBjpmaZb9uO1AklF9hdG-CuLII9J4ITUX1EA-EKuWXBMEc/exec';
const CACHE_TTL = 10 * 60 * 1000;
let liveCache = { at: 0, data: null };

const ALLOWED_ORIGINS = new Set([
  'https://francesco1485.github.io',
  'https://scd-colicoderviese-official-r21.onrender.com',
  'https://scd-colicoderviese-super-app.onrender.com',
  'http://localhost:10000',
  'http://127.0.0.1:10000'
]);
function applyCors(req,res){
  const origin=String(req.headers.origin||'');
  if(ALLOWED_ORIGINS.has(origin)) res.setHeader('access-control-allow-origin',origin);
  res.setHeader('vary','Origin');
  res.setHeader('access-control-allow-methods','GET,POST,OPTIONS');
  res.setHeader('access-control-allow-headers','content-type,x-scd-client');
  res.setHeader('access-control-max-age','86400');
}

const allowedActions = new Set([
  'dashboard.summary','public.feed','public.club','public.match','public.register',
  'auth.request','auth.login','auth.validate','auth.pin.change','auth.pin.set','direction.access.set',
  'public.calendar','public.initiatives','public.registration','public.partnerLead','public.communitySubmit',
  'public.ticketSubmit','public.telemetry','safeguarding.submit','direction.leads','direction.moderation'
]);

function json(res, status, data, headers={}) {
  res.writeHead(status, {'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers});
  res.end(JSON.stringify(data));
}
function readBody(req){return new Promise((resolve,reject)=>{let s='';req.on('data',c=>{s+=c;if(s.length>1_000_000){req.destroy();reject(new Error('Payload troppo grande'))}});req.on('end',()=>resolve(s));req.on('error',reject)})}
function stripHtml(s=''){return String(s).replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&#8217;/g,"'").replace(/\s+/g,' ').trim()}
function decodeXml(s=''){return String(s).replace(/<!\[CDATA\[|\]\]>/g,'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>')}

async function proxyAppsScript(req,res){
  if(req.method!=='POST') return json(res,405,{ok:false,error:'Metodo non consentito'});
  try{
    const raw = await readBody(req); const body = JSON.parse(raw||'{}'); const action=String(body.action||''); const started=Date.now(); console.log('[api/scd] incoming',action,req.headers.origin||'server');
    if(!allowedActions.has(action)) return json(res,400,{ok:false,error:'Azione non consentita'});
    const upstream = await fetch(UPSTREAM,{method:'POST',redirect:'follow',headers:{'content-type':'application/json'},body:JSON.stringify({action,payload:body.payload||{},sessionToken:body.sessionToken||''})});
    const text = await upstream.text(); let parsed;
    try{parsed=JSON.parse(text)}catch{throw new Error('Risposta backend non valida')}
    console.log('[api/scd] upstream',action,upstream.status,(Date.now()-started)+'ms'); return json(res,upstream.ok?200:400,parsed);
  }catch(e){console.error('[api/scd] failed',e.message||e);return json(res,502,{ok:false,error:e.message||'Backend SCD non disponibile'})}
}


async function fetchPublicFeed(){
  try{
    const upstream=await fetch(UPSTREAM,{method:'POST',redirect:'follow',headers:{'content-type':'application/json'},body:JSON.stringify({action:'public.feed',payload:{limit:40},sessionToken:''})});
    const text=await upstream.text(); const parsed=JSON.parse(text);
    return parsed;
  }catch(e){return {ok:false,error:String(e.message||e)}}
}
async function fetchOfficialPosts(){
  const endpoints=[
    'https://www.colicoderviese.it/wp-json/wp/v2/posts?per_page=10&_fields=date,link,title,excerpt',
    'https://www.colicoderviese.it/wp-json/wp/v2/pages?per_page=5&_fields=date,link,title,excerpt'
  ];
  for(const url of endpoints){
    try{
      const r=await fetch(url,{headers:{'user-agent':'SCD-ColicoDerviese-SuperApp/1.0'}}); if(!r.ok) continue;
      const rows=await r.json(); if(!Array.isArray(rows)) continue;
      return rows.map(x=>({title:stripHtml(x.title?.rendered||''),message:stripHtml(x.excerpt?.rendered||'').slice(0,240),date:(x.date||'').slice(0,10),source:'Sito ufficiale SCD',sourceUrl:x.link,feedType:'OFFICIAL_SITE',priority:90})).filter(x=>x.title);
    }catch{}
  }
  return [];
}

async function fetchGoogleNews(){
  const q=encodeURIComponent('"ColicoDerviese" OR "SCD ColicoDerviese"');
  const url=`https://news.google.com/rss/search?q=${q}&hl=it&gl=IT&ceid=IT:it`;
  try{
    const r=await fetch(url,{headers:{'user-agent':'SCD-ColicoDerviese-SuperApp/1.0'}}); if(!r.ok) return [];
    const xml=await r.text(); const items=[...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0,8);
    return items.map(m=>{const x=m[1]; const title=decodeXml((x.match(/<title>([\s\S]*?)<\/title>/)||[])[1]||''); const link=decodeXml((x.match(/<link>([\s\S]*?)<\/link>/)||[])[1]||''); const pub=decodeXml((x.match(/<pubDate>([\s\S]*?)<\/pubDate>/)||[])[1]||''); const source=decodeXml((x.match(/<source[^>]*>([\s\S]*?)<\/source>/)||[])[1]||'Google News');return {title,message:'Contenuto pubblico indicizzato sul web. Apri la fonte originale per i dettagli.',date:pub?new Date(pub).toISOString().slice(0,10):'',source,sourceUrl:link,feedType:'WEB_NEWS',priority:45}}).filter(x=>x.title&&x.link!=='' );
  }catch{return []}
}

async function getLiveRadar(){
  if(liveCache.data && Date.now()-liveCache.at<CACHE_TTL) return liveCache.data;
  const [official,news]=await Promise.all([fetchOfficialPosts(),fetchGoogleNews()]);
  const seen=new Set(); const items=[...official,...news].filter(x=>{const k=(x.title||'').toLowerCase().replace(/\W/g,'').slice(0,90);if(!k||seen.has(k))return false;seen.add(k);return true}).sort((a,b)=>(b.priority||0)-(a.priority||0)||String(b.date).localeCompare(String(a.date))).slice(0,16);
  const data={ok:true,generatedAt:new Date().toISOString(),sources:[{name:'Sito ufficiale SCD',status:official.length?'OK':'NO_DATA'},{name:'Web/Google News',status:news.length?'OK':'NO_DATA'},{name:'Tuttocampo',status:'LINK_ONLY',url:'https://www.tuttocampo.it/'},{name:'CR Lombardia',status:'LINK_ONLY',url:'https://www.crlombardia.it/'},{name:'Facebook SCD',status:'LINK_ONLY',url:'https://www.facebook.com/ColicoDerviese?locale=it_IT'},{name:'Instagram SCD',status:'LINK_ONLY',url:'https://www.instagram.com/s.c.d.colicoderviese/'},{name:'FIGC/LND',status:'LINK_ONLY',url:'https://www.lnd.it/'}],items};
  liveCache={at:Date.now(),data};return data;
}

const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon'};
function serveStatic(req,res){
  const u=new URL(req.url,'http://localhost'); let pathname=decodeURIComponent(u.pathname);
  if(pathname==='/'||pathname==='') pathname='/index.html';
  const file=path.normalize(path.join(ROOT,pathname)); if(!file.startsWith(ROOT)) {res.writeHead(403);return res.end('Forbidden')}
  fs.stat(file,(err,st)=>{if(err||!st.isFile()){res.writeHead(404);return res.end('Not found')}const ext=path.extname(file).toLowerCase();const cache=/\.(png|jpg|jpeg|webp|svg)$/.test(ext)?'public, max-age=86400':'no-store';res.writeHead(200,{'content-type':mime[ext]||'application/octet-stream','cache-control':cache});fs.createReadStream(file).pipe(res)})
}

http.createServer(async(req,res)=>{
  applyCors(req,res); if(req.method==='OPTIONS'){res.writeHead(204);return res.end()}
  const u=new URL(req.url,'http://localhost');
  if(u.pathname==='/health') return json(res,200,{ok:true,service:'SCD Super App',time:new Date().toISOString()});
  if(u.pathname==='/api/scd') return proxyAppsScript(req,res);
  if(u.pathname==='/api/public') return json(res,200,await fetchPublicFeed(),{'cache-control':'no-store'});
  if(u.pathname==='/api/live') {try{return json(res,200,await getLiveRadar(),{'cache-control':'public, max-age=120'})}catch(e){return json(res,500,{ok:false,error:e.message})}}
  return serveStatic(req,res);
}).listen(PORT,()=>console.log(`SCD Super App listening on ${PORT}`));