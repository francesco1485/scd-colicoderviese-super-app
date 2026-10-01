const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT || 10000;
const ROOT = process.env.SCD_STATIC_DIR ? path.resolve(__dirname,process.env.SCD_STATIC_DIR) : __dirname;
const UPSTREAM = process.env.SCD_APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbwYQ_3yLYsp-6jX3FIgufBjpmaZb9uO1AklF9hdG-CuLII9J4ITUX1EA-EKuWXBMEc/exec';
const CACHE_TTL = 10 * 60 * 1000;
const CLUB_TIME_ZONE = 'Europe/Rome';
const FEATURE_FLAGS = Object.freeze({
  dataFabricObservability: process.env.SCD_FEATURE_DATA_FABRIC_OBSERVABILITY === 'true',
  supabaseCore: process.env.SCD_FEATURE_SUPABASE_CORE === 'true'
});
const SUPABASE_RUNTIME = Object.freeze({
  engine:'SUPABASE_POSTGRESQL',
  configured:Boolean(process.env.SCD_SUPABASE_URL),
  projectId:process.env.SCD_SUPABASE_PROJECT_ID || null,
  mode:FEATURE_FLAGS.supabaseCore?'DUAL_RUN_ACTIVE':'DARK_DUAL_RUN'
});
let liveCache = { at: 0, data: null };

const ALLOWED_ORIGINS = new Set([
  'https://francesco1485.github.io',
  'https://scd-colicoderviese-official-r21.onrender.com',
  'https://scd-colicoderviese-super-app.onrender.com',
  'https://scd-universe-synthetic.onrender.com',
  'https://scd-universe-nextgen.onrender.com',
  'https://scd-universe-nova.onrender.com',
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

const READ_ONLY_RETRY_ACTIONS = new Set([
  'public.feed','public.club','public.calendar','public.datafabric.contract',
  'dashboard.summary','private.dashboard','private.week','account.requests',
  'private.attendance.get','auth.validate','direction.diagnostics',
  'direction.evolution','direction.datafabric.status'
]);
const UPSTREAM_READ_ATTEMPTS = 2;
const UPSTREAM_RETRY_DELAY_MS = 450;
const wait = ms => new Promise(resolve=>setTimeout(resolve,ms));

const allowedActions = new Set([
  'dashboard.summary','private.dashboard','private.week','account.requests',
  'private.request.submit','private.transport.request','private.message.send',
  'private.convocation.create','private.convocation.reply',
  'private.attendance.get','private.attendance.save',
  'public.feed','public.club','public.register','public.calendar','public.datafabric.contract',
  'public.registration','public.partnerLead','public.communitySubmit','public.ticketSubmit','public.telemetry',
  'auth.request','auth.login','auth.validate','auth.pin.change',
  'direction.access.set','direction.pin.set','direction.player.approve','direction.player.reject',
  'direction.diagnostics','direction.evolution',
  'direction.datafabric.status','direction.datafabric.scan.gmail','direction.datafabric.scan.drive',
]);

function clubTimePayload(){
  const now=new Date();
  const parts=new Intl.DateTimeFormat('it-IT',{
    timeZone:CLUB_TIME_ZONE,weekday:'long',year:'numeric',month:'2-digit',day:'2-digit',
    hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false
  }).formatToParts(now).reduce((o,p)=>(o[p.type]=p.value,o),{});
  return {
    ok:true,
    epochMs:now.getTime(),
    iso:now.toISOString(),
    timeZone:CLUB_TIME_ZONE,
    clubDate:`${parts.year}-${parts.month}-${parts.day}`,
    clubTime:`${parts.hour}:${parts.minute}:${parts.second}`,
    weekday:parts.weekday
  };
}

function json(res, status, data, headers={}) {
  res.writeHead(status, {'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers});
  res.end(JSON.stringify(data));
}
function readBody(req){return new Promise((resolve,reject)=>{let s='';req.on('data',c=>{s+=c;if(s.length>1_000_000){req.destroy();reject(new Error('Payload troppo grande'))}});req.on('end',()=>resolve(s));req.on('error',reject)})}
function stripHtml(s=''){return String(s).replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&#8217;/g,"'").replace(/\s+/g,' ').trim()}
function decodeXml(s=''){return String(s).replace(/<!\[CDATA\[|\]\]>/g,'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>')}

async function callAppsScript(action,payload={},sessionToken=''){
  const maxAttempts=READ_ONLY_RETRY_ACTIONS.has(action)?UPSTREAM_READ_ATTEMPTS:1;
  let lastError;
  for(let attempt=1;attempt<=maxAttempts;attempt++){
    try{
      const upstream=await fetch(UPSTREAM,{
        method:'POST',
        redirect:'follow',
        headers:{'content-type':'application/json','user-agent':'SCD-ColicoDerviese-Bridge/30.0'},
        body:JSON.stringify({action,payload,sessionToken})
      });
      const text=await upstream.text();
      let parsed;
      try{parsed=JSON.parse(text)}
      catch{
        const err=new Error('Risposta backend non valida');
        err.code='UPSTREAM_INVALID_JSON';
        err.httpStatus=upstream.status;
        throw err;
      }
      return {upstream,parsed,attempt};
    }catch(error){
      lastError=error;
      if(attempt>=maxAttempts) break;
      console.warn('[api/scd] retry read-only',action,'attempt',attempt,'reason',error.code||error.message||error);
      await wait(UPSTREAM_RETRY_DELAY_MS);
    }
  }
  throw lastError||new Error('Backend SCD non disponibile');
}

async function proxyAppsScript(req,res){
  if(req.method!=='POST') return json(res,405,{ok:false,error:'Metodo non consentito'});
  try{
    const raw = await readBody(req); const body = JSON.parse(raw||'{}'); const action=String(body.action||''); const started=Date.now(); console.log('[api/scd] incoming',action,req.headers.origin||'server');
    if(!allowedActions.has(action)) return json(res,400,{ok:false,error:'Azione non consentita'});
    const {upstream,parsed,attempt}=await callAppsScript(action,body.payload||{},body.sessionToken||'');
    console.log('[api/scd] upstream',action,upstream.status,(Date.now()-started)+'ms','attempt',attempt); return json(res,upstream.ok?200:400,parsed);
  }catch(e){console.error('[api/scd] failed',e.message||e);return json(res,502,{ok:false,error:e.message||'Backend SCD non disponibile'})}
}


async function fetchPublicFeed(){
  try{
    const {parsed}=await callAppsScript('public.feed',{limit:40},'');
    return parsed;
  }catch(e){return {ok:false,error:String(e.message||e)}}
}
function pick(obj,...keys){
  for(const key of keys){
    const value=obj?.[key];
    if(value!=null&&String(value).trim()!=='')return value;
  }
  return '';
}
function unwrapPayload(raw){
  if(raw&&raw.ok===true&&raw.data!=null)return raw.data;
  if(raw&&raw.data!=null&&Object.keys(raw).length<=4)return raw.data;
  return raw;
}
function rowsFrom(raw){
  const data=unwrapPayload(raw);
  if(Array.isArray(data))return data;
  return data?.rows||data?.items||data?.events||data?.calendar||data?.feed||data?.highlights||[];
}
function isoDateOnly(value){
  const text=String(value||'').trim();
  if(!text)return '';
  let m=text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(m)return m[1]+'-'+m[2]+'-'+m[3];
  m=text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
  if(m)return m[3]+'-'+String(m[2]).padStart(2,'0')+'-'+String(m[1]).padStart(2,'0');
  const d=new Date(text);
  return Number.isFinite(d.getTime())?d.toISOString().slice(0,10):'';
}
function romeDateParts(date=new Date()){
  return new Intl.DateTimeFormat('en-CA',{timeZone:CLUB_TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit',weekday:'short'}).formatToParts(date).reduce((o,p)=>(o[p.type]=p.value,o),{});
}
function currentClubWeek(){
  const now=new Date();
  const p=romeDateParts(now);
  const localNoon=new Date(p.year+'-'+p.month+'-'+p.day+'T12:00:00Z');
  const weekday=new Intl.DateTimeFormat('en-US',{timeZone:CLUB_TIME_ZONE,weekday:'short'}).format(now);
  const dayIndex={Mon:0,Tue:1,Wed:2,Thu:3,Fri:4,Sat:5,Sun:6}[weekday]??0;
  const start=new Date(localNoon.getTime()-dayIndex*86400000);
  const end=new Date(start.getTime()+6*86400000);
  const fmt=d=>new Intl.DateTimeFormat('en-CA',{timeZone:'UTC',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
  return {start:fmt(start),end:fmt(end)};
}
function eventKind(row){
  const text=[pick(row,'type','kind','eventType'),pick(row,'title','event','name','subject')].join(' ');
  if(/allenament|training/i.test(text))return 'TRAINING';
  if(/gara|partita|campionato|coppa|amichevole|match/i.test(text))return 'MATCH';
  if(/torneo|tournament/i.test(text))return 'TOURNAMENT';
  return 'EVENT';
}
function teamLabel(row){
  return String(pick(row,'team','teamName','squadra','category','categoria','ageGroup','annata')||'SCD').trim();
}
function resultText(row){
  return String(pick(row,'result','score','risultato','finalScore')||'').trim();
}
function feedRows(raw){
  const data=unwrapPayload(raw);
  if(Array.isArray(data))return data;
  return data?.items||data?.feed||data?.highlights||data?.rows||[];
}
function safeInternalFeed(rows){
  return rows.filter(row=>{
    const source=String(pick(row,'source','fonte','feedType','kind')||'').toLowerCase();
    const url=String(pick(row,'sourceUrl','url','link')||'').toLowerCase();
    return !/official_site|sito ufficiale|google news|web_news|instagram|facebook/.test(source+' '+url);
  });
}
function extractStructuredResults(rows){
  return safeInternalFeed(rows).filter(row=>{
    const text=[pick(row,'status'),pick(row,'title','subject','event'),pick(row,'message')].join(' ');
    return Boolean(resultText(row))||/risultat|finale|terminat|full time/i.test(text);
  });
}
function extractStandings(rows){
  return safeInternalFeed(rows).filter(row=>{
    return pick(row,'position','rank','posizione')!==''||pick(row,'points','punti')!=='';
  });
}
function initiativeRows(raw){
  const data=unwrapPayload(raw);
  const direct=data?.initiatives||data?.events||[];
  return Array.isArray(direct)?direct:[];
}
function evidenceFor(row,kind){
  return {
    kind,
    source:String(pick(row,'source','fonte')||'R20_STRUCTURED'),
    recordId:String(pick(row,'id','eventId','uid','code')||''),
    date:isoDateOnly(pick(row,'date','data','eventDate','startDate')),
    fields:Object.fromEntries(
      ['team','teamName','squadra','title','event','name','result','score','risultato','position','rank','points','punti','venue','luogo']
        .filter(k=>row?.[k]!=null&&String(row[k]).trim()!=='')
        .map(k=>[k,row[k]])
    )
  };
}
function readWeeklyEditorial(weekStart){
  try{
    const file=path.join(ROOT,'content','weekly-news.json');
    const raw=JSON.parse(fs.readFileSync(file,'utf8'));
    if(raw?.status!=='PUBLISHED')return null;
    if(String(raw.weekStart||'')!==String(weekStart||''))return null;
    if(!Array.isArray(raw.cards)||!raw.cards.length)return null;
    return raw;
  }catch{return null}
}
async function buildWeeklyNewsroom(){
  const week=currentClubWeek();
  let calendarRaw=null,feedRaw=null;
  const sourceStatus={calendar:'ERROR',feed:'ERROR',officialSite:'DISABLED_FOR_NEWS',webNews:'DISABLED_FOR_NEWS'};
  try{
    const c=await callAppsScript('public.calendar',{rangeKey:'ALL',offset:0},'');
    calendarRaw=c.parsed;sourceStatus.calendar='OK';
  }catch(e){sourceStatus.calendar='ERROR:'+String(e.code||e.message||e)}
  try{
    const f=await callAppsScript('public.feed',{limit:80},'');
    feedRaw=f.parsed;sourceStatus.feed='OK';
  }catch(e){sourceStatus.feed='ERROR:'+String(e.code||e.message||e)}

  const calendar=rowsFrom(calendarRaw).map((row,i)=>({
    id:pick(row,'id','eventId','uid')||'CAL-'+i,
    title:String(pick(row,'title','event','name','subject')||'Attività SCD'),
    date:isoDateOnly(pick(row,'date','data','startDate')),
    time:String(pick(row,'time','ora','startTime')||''),
    endTime:String(pick(row,'endTime','fine')||''),
    team:teamLabel(row),
    category:String(pick(row,'category','categoria','ageGroup','annata')||''),
    venue:String(pick(row,'venue','luogo','field','location')||''),
    kind:eventKind(row),
    source:String(pick(row,'source','fonte')||'R20_CALENDAR')
  })).filter(x=>x.date&&x.date>=week.start&&x.date<=week.end);

  const teams=[...new Set(calendar.map(x=>x.category||x.team).filter(x=>x&&x!=='SCD'))];
  const matches=calendar.filter(x=>x.kind==='MATCH');
  const trainings=calendar.filter(x=>x.kind==='TRAINING');
  const tournaments=calendar.filter(x=>x.kind==='TOURNAMENT');
  const feed=feedRows(feedRaw);
  const results=extractStructuredResults(feed).slice(0,8);
  const standings=extractStandings(feed).slice(0,6);
  const initiatives=initiativeRows(feedRaw).filter(x=>{
    const d=isoDateOnly(pick(x,'date','eventDate','data'));
    return !d||d>=week.start;
  }).slice(0,6);

  const cards=[];
  if(calendar.length){
    cards.push({
      id:'week-overview',
      category:'SETTIMANA SCD',
      title:calendar.length+' attività, tutte le annate insieme',
      dek:matches.length+' gare · '+trainings.length+' allenamenti'+(tournaments.length?' · '+tournaments.length+' tornei':'')+' · '+teams.length+' gruppi/annate rilevati.',
      body:'Il calendario settimanale viene costruito dai dati sportivi strutturati SCD. Nessun contenuto del vecchio sito viene usato per riempire questa sintesi.',
      evidence:calendar.slice(0,12).map(x=>({kind:'CALENDAR',source:x.source,recordId:x.id,date:x.date,fields:{team:x.team,category:x.category,title:x.title,kind:x.kind,venue:x.venue}}))
    });
  }
  if(results.length){
    const first=results[0],team=teamLabel(first),score=resultText(first)||String(pick(first,'message')||'Risultato inserito');
    cards.push({
      id:'results',
      category:'RISULTATI',
      title:'I risultati inseriti diventano racconto',
      dek:team+' · '+score,
      body:results.length===1?'Un risultato verificato alimenta la sintesi settimanale.':'Sono presenti '+results.length+' risultati strutturati: la Newsroom li usa per creare il riepilogo senza commenti presi da siti datati.',
      evidence:results.map(x=>evidenceFor(x,'RESULT'))
    });
  }
  if(standings.length){
    const first=standings[0],team=teamLabel(first),position=pick(first,'position','rank','posizione'),points=pick(first,'points','punti');
    cards.push({
      id:'standings',
      category:'CLASSIFICHE',
      title:'Classifica: dati, non opinioni',
      dek:[team,position!==''?'posizione '+position:'',points!==''?points+' punti':''].filter(Boolean).join(' · '),
      body:'La classifica viene raccontata soltanto quando posizione o punti arrivano da un dato strutturato verificabile.',
      evidence:standings.map(x=>evidenceFor(x,'STANDING'))
    });
  }
  if(initiatives.length){
    const first=initiatives[0];
    cards.push({
      id:'territory',
      category:'TERRITORIO & CLUB',
      title:String(pick(first,'title','event','name')||'Iniziative SCD e territorio'),
      dek:[isoDateOnly(pick(first,'date','eventDate','data')),pick(first,'venue','luogo','place')].filter(Boolean).join(' · '),
      body:'Le iniziative vengono collegate al racconto sportivo quando esistono dati interni verificati. Il sistema non completa i vuoti con articoli vecchi.',
      evidence:initiatives.map(x=>evidenceFor(x,'INITIATIVE'))
    });
  }
  if(!cards.length){
    cards.push({
      id:'waiting-for-facts',
      category:'SCD NEWSROOM AI',
      title:'Nessuna notizia automatica senza dati verificati',
      dek:'La Newsroom resta vuota invece di recuperare commenti o articoli datati.',
      body:'Quando vengono inseriti calendario, risultati, classifiche o iniziative, la sintesi settimanale si rigenera automaticamente.',
      evidence:[]
    });
  }

  const editorial=readWeeklyEditorial(week.start);
  const mergedCards=editorial
    ?[...cards.filter(x=>x.id==='week-overview'),...editorial.cards,...cards.filter(x=>x.id!=='week-overview'&&!editorial.cards.some(y=>y.id===x.id))]
    :cards;
  return {
    ok:true,
    release:'R40',
    generator:editorial?'CHATGPT_WEEKLY_EDITORIAL_PLUS_GROUNDED_RUNTIME':'SCD_NEWSROOM_GROUNDED_V1',
    editorialPolicy:'VERIFIED_STRUCTURED_FACTS_ONLY',
    staleSiteContent:false,
    generatedAt:new Date().toISOString(),
    week,
    sources:{...sourceStatus,weeklyEditorial:editorial?'PUBLISHED':'NO_CURRENT_PUBLISHED_EDITORIAL'},
    editorial:editorial?{generatedAt:editorial.generatedAt,generatedBy:editorial.generatedBy,sourceCount:(editorial.sources||[]).length}:null,
    calendar:{rows:calendar,counts:{activities:calendar.length,matches:matches.length,trainings:trainings.length,tournaments:tournaments.length,groups:teams.length},groups:teams},
    cards:mergedCards
  };
}

async function getLiveRadar(){
  return {
    ok:true,
    generatedAt:new Date().toISOString(),
    policy:'DISABLED_FOR_NEWS_UNTIL_FRESHNESS_GUARANTEED',
    sources:[
      {name:'Sito ufficiale SCD',status:'DISABLED_FOR_NEWS'},
      {name:'Web/Google News',status:'DISABLED_FOR_NEWS'}
    ],
    items:[]
  };
}

const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon','.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8'};
function serveStatic(req,res){
  const u=new URL(req.url,'http://localhost'); let pathname=decodeURIComponent(u.pathname);
  if(pathname==='/'||pathname==='') pathname='/index.html';
  const file=path.normalize(path.join(ROOT,pathname)); if(!file.startsWith(ROOT)) {res.writeHead(403);return res.end('Forbidden')}
  fs.stat(file,(err,st)=>{if(err||!st.isFile()){res.writeHead(404);return res.end('Not found')}const ext=path.extname(file).toLowerCase();const cache=/\.(png|jpg|jpeg|webp|svg)$/.test(ext)?'public, max-age=86400':'no-store';res.writeHead(200,{'content-type':mime[ext]||'application/octet-stream','cache-control':cache});fs.createReadStream(file).pipe(res)})
}

http.createServer(async(req,res)=>{
  applyCors(req,res); if(req.method==='OPTIONS'){res.writeHead(204);return res.end()}
  const u=new URL(req.url,'http://localhost');
  if(u.pathname==='/health') return json(res,200,{...clubTimePayload(),service:'SCD Super App',version:'40.0.0'});
  if(u.pathname==='/api/time') return json(res,200,clubTimePayload());
  if(u.pathname==='/api/capabilities') return json(res,200,{ok:true,version:'40.0.0',mode:'GITHUB_PAGES_RENDER_R20_SUPABASE_DUAL_RUN',actions:[...allowedActions].sort(),featureFlags:FEATURE_FLAGS,domainCore:SUPABASE_RUNTIME,isolated:['safeguarding']});
  if(u.pathname==='/api/core-status') return json(res,200,{ok:true,version:'40.0.0',featureFlags:FEATURE_FLAGS,domainCore:SUPABASE_RUNTIME,currentPrimary:'R20',targetPrimary:'SCD_SUPABASE'});
  if(u.pathname==='/api/scd') return proxyAppsScript(req,res);
  if(u.pathname==='/api/public') return json(res,200,await fetchPublicFeed(),{'cache-control':'no-store'});
  if(u.pathname==='/api/newsroom') {try{return json(res,200,await buildWeeklyNewsroom(),{'cache-control':'public, max-age=180'})}catch(e){return json(res,500,{ok:false,error:e.message})}}
  if(u.pathname==='/api/live') {try{return json(res,200,await getLiveRadar(),{'cache-control':'public, max-age=300'})}catch(e){return json(res,500,{ok:false,error:e.message})}}
  return serveStatic(req,res);
}).listen(PORT,()=>console.log(`SCD Super App listening on ${PORT}`));