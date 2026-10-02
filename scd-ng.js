(()=>{
'use strict';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const API_BASE='';
const R56_ANALYTICS_COOKIE='scd_analytics_consent';
function r56CookieGet(name){
 return document.cookie.split(';').map(x=>x.trim()).filter(Boolean).map(x=>x.split('=')).find(x=>x[0]===name)?.slice(1).join('=')||'';
}
function r56CookieSet(name,value,maxAge){
 document.cookie=name+'='+encodeURIComponent(value)+'; Path=/; Max-Age='+String(maxAge)+'; SameSite=Lax; Secure';
}
function r56AnalyticsConsent(){return decodeURIComponent(r56CookieGet(R56_ANALYTICS_COOKIE)||'')}
async function r56Telemetry(counts,sections={}){
 if(r56AnalyticsConsent()!=='yes')return;
 try{await postAction('public.telemetry',{version:'R56',metrics:{counts,sections}})}catch{}
}
function r56BindAnalyticsConsent(){
 const banner=$('#scdCookieBanner');if(!banner)return;
 const current=r56AnalyticsConsent();
 banner.hidden=Boolean(current);
 const accept=$('#scdAnalyticsAccept'),reject=$('#scdAnalyticsReject');
 if(accept)accept.onclick=async()=>{r56CookieSet(R56_ANALYTICS_COOKIE,'yes',15552000);banner.hidden=true;const seen=localStorage.getItem('scd:analytics:last_seen');await r56Telemetry({page_view:1,...(seen?{return_visit:1}:{})},{entry:'app'});localStorage.setItem('scd:analytics:last_seen',new Date().toISOString())};
 if(reject)reject.onclick=()=>{r56CookieSet(R56_ANALYTICS_COOKIE,'no',15552000);banner.hidden=true};
 if(current==='yes'){
   const seen=localStorage.getItem('scd:analytics:last_seen');
   r56Telemetry({page_view:1,...(seen?{return_visit:1}:{})},{entry:'app'});
   localStorage.setItem('scd:analytics:last_seen',new Date().toISOString());
 }
}

const PRIVATE_SESSION_KEY='scd:session:v1';
let deferredInstallPrompt=null;
if('serviceWorker' in navigator){
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(err=>console.warn('[pwa] service worker',err)));
}
window.addEventListener('beforeinstallprompt',event=>{
  event.preventDefault();
  deferredInstallPrompt=event;
  const button=document.querySelector('#installApp');
  if(button)button.hidden=false;
});
window.addEventListener('appinstalled',()=>{
  deferredInstallPrompt=null;
  const button=document.querySelector('#installApp');
  if(button)button.hidden=true;
});
const state={view:'pulse',filter:'ALL',events:[],upcoming:[],fullCalendar:[],calendarLoaded:false,calendarLoading:false,calendarSourceState:'UNVERIFIED',calendarPeriod:'WEEK',calendarTeam:'ALL',calendarCategory:'ALL',calendarType:'ALL',calendarSearch:'',teamsSearch:'',teamsCategory:'ALL',socialFilter:'ALL',socialSearch:'',news:null,clubContent:[],sportData:{results:[],standings:[],headToHead:[]},partners:[],publicProfiles:[],nextMatch:null,privateToken:'',privateEmail:'',privateData:null,workspace:null,privateLoading:false,privateError:''};
const officialChannels=[
 {id:'site',label:'Sito ufficiale',url:'https://www.colicoderviese.it/',terms:'sito web comunicazioni servizi'},
 {id:'facebook',label:'Facebook SCD',url:'https://www.facebook.com/ColicoDerviese',terms:'facebook social pagina'},
 {id:'instagram',label:'Instagram SCD',url:'https://www.instagram.com/s.c.d.colicoderviese/',terms:'instagram social foto reel'},
 {id:'tiktok',label:'TikTok SCD',url:'https://www.tiktok.com/@s.c.d..colicoderv',terms:'tiktok social video'},
 {id:'youtube',label:'YouTube SCD',url:'https://www.youtube.com/@S.C.D.ColicoDerviese',terms:'youtube video partite club'}
];
const FOLLOW_TEAM_KEY='scd:follow-team:v1';
function teamResultRows(team){
 const key=norm(team);
 return (state.sportData.results||[]).filter(x=>{
   const hay=norm([x.team,x.teamName,x.homeTeam,x.awayTeam].filter(Boolean).join(' '));
   return key&&hay&&(hay.includes(key)||key.includes(hay));
 }).slice(0,5);
}
function teamStanding(team){
 const key=norm(team);
 return (state.sportData.standings||[]).find(x=>{
   const n=norm(x.team||x.teamName);
   return key&&n&&(n.includes(key)||key.includes(n));
 })||null;
}
function matchHeadToHead(match){
 if(!match)return [];
 const a=norm(match.team),b=norm(match.opponent);
 if(!a||!b)return [];
 return (state.sportData.headToHead||[]).filter(x=>{
   const hay=norm([x.team,x.teamName,x.homeTeam,x.awayTeam,x.opponent,x.opponentName].filter(Boolean).join(' '));
   return hay.includes(a)&&hay.includes(b);
 }).slice(0,3);
}
function statStandingText(team){
 const x=teamStanding(team);if(!x)return 'Dato in aggiornamento';
 return [x.position?'#'+x.position:'',x.points!=null&&String(x.points)!==''?x.points+' pt':''].filter(Boolean).join(' · ')||'Dato verificato disponibile';
}
function statFormText(team){
 const rows=teamResultRows(team),out=rows.map(x=>x.result||x.score).filter(Boolean);
 return out.length?out.join(' · '):'Dato in aggiornamento';
}
function statH2HText(match){
 const out=matchHeadToHead(match).map(x=>x.result||x.score).filter(Boolean);
 return out.length?out.join(' · '):'Dato in aggiornamento';
}
function loadFollowedTeam(){try{return String(localStorage.getItem(FOLLOW_TEAM_KEY)||'')}catch{return ''}}
function saveFollowedTeam(name){try{name?localStorage.setItem(FOLLOW_TEAM_KEY,name):localStorage.removeItem(FOLLOW_TEAM_KEY)}catch{}}
function updateFollowTeamUi(){
 const name=loadFollowedTeam(),label=$('#sportFollowTeamLabel'),btn=$('#sportFollowTeam');
 if(label)label.textContent=name?name:'Scegli e segui una squadra';
 if(btn)btn.classList.toggle('is-following',Boolean(name));
 renderMyTeamDeck();
}

const toast=(t)=>{const el=$('#toast');if(!el)return;el.textContent=t;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),2200)};
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const norm=s=>String(s??'').toLocaleLowerCase('it-IT').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const todayKey=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome'}).format(new Date());
const fmtDate=v=>{if(!v)return 'Dato in aggiornamento';const d=new Date(String(v).slice(0,10)+'T12:00:00');return Number.isFinite(d.getTime())?new Intl.DateTimeFormat('it-IT',{weekday:'short',day:'2-digit',month:'short'}).format(d):String(v)};
const pick=(obj,...keys)=>{for(const k of keys){const v=obj?.[k];if(v!=null&&String(v).trim()!=='')return v}return ''};
const isoClientDate=v=>{const s=String(v||'').trim();if(!s)return '';let m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);if(m)return m[1]+'-'+m[2]+'-'+m[3];m=s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);if(m)return m[3]+'-'+String(m[2]).padStart(2,'0')+'-'+String(m[1]).padStart(2,'0');const d=new Date(s);return Number.isFinite(d.getTime())?d.toISOString().slice(0,10):''};
const clientEventKind=row=>{const t=norm([pick(row,'kind','type','eventType'),pick(row,'title','event','name','subject')].join(' '));if(/allenament|training/.test(t))return 'TRAINING';if(/gara|partita|campionato|coppa|amichevole|match/.test(t))return 'MATCH';if(/torneo|tournament/.test(t))return 'TOURNAMENT';return 'EVENT'};

function setView(view){
  state.view=view;
  $$('[data-view]').forEach(x=>x.classList.toggle('active',x.dataset.view===view));
  $$('[data-nav]').forEach(x=>x.classList.toggle('active',x.dataset.nav===view));
  const ctx=view==='desk'?'PRIVATE DESK · ROLE/SCOPE':view==='twin'?'PROFILO · AVATAR FACOLTATIVO':view==='calendar'?'CALENDARIO · PUBBLICO':view==='teams'?'SQUADRE · PUBBLICO':view==='social'?'SOCIAL · PUBBLICO':'HOME · PUBBLICO';
  const ctxEl=$('#mirrorContext');if(ctxEl)ctxEl.textContent=ctx;
  history.replaceState(null,'','#'+view);
  window.scrollTo({top:0,behavior:'smooth'});
  if(view==='calendar')ensurePublicCalendar();
  if(view==='teams')ensurePublicCalendar();
  if(view==='social')renderSocialHub();
  if(view==='desk')ensurePrivateDesk();
}
$$('[data-nav]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.nav)));
$('#modeBtn')?.addEventListener('click',()=>{document.body.classList.toggle('compact');toast(document.body.classList.contains('compact')?'Densità compatta':'Densità comfort')});
$$('[data-scroll]').forEach(b=>b.addEventListener('click',()=>{const target=$(b.dataset.scroll);if(!target)return;const go=()=>target.scrollIntoView({behavior:'smooth',block:'start'});if(target.closest('#view-pulse')&&state.view!=='pulse'){setView('pulse');setTimeout(go,120)}else go()}));

function clubClock(){
  const d=new Date(), parts=new Intl.DateTimeFormat('it-IT',{timeZone:'Europe/Rome',weekday:'short',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(d);
  const el=$('#clubNow');if(el)el.textContent='EUROPE/ROME · '+parts.toUpperCase();
}
clubClock();setInterval(clubClock,30000);

function currentWeek(){
 const now=new Date(), day=(now.getDay()+6)%7, start=new Date(now);start.setHours(12,0,0,0);start.setDate(start.getDate()-day);
 return Array.from({length:7},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);return d});
}
function renderWeek(){
 const rail=$('#weekRail');if(!rail)return;
 const names=['LUN','MAR','MER','GIO','VEN','SAB','DOM'], today=todayKey();
 rail.innerHTML=currentWeek().map((d,i)=>{
   const iso=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome'}).format(d);
   const ev=state.events.filter(x=>x.date===iso&&(state.filter==='ALL'||x.group===state.filter));
   return '<article class="day '+(iso===today?'today':'')+'"><span class="day-name">'+names[i]+'</span><div class="date">'+String(d.getDate()).padStart(2,'0')+'</div>'+
   (ev.length?ev.map(x=>'<button type="button" class="event-pill" data-event-id="'+esc(x.id)+'"><b>'+esc(x.team||x.title||'SCD')+'</b><small>'+esc([x.time,x.title,x.opponent,x.venue].filter(Boolean).join(' · '))+'</small></button>').join(''):'<div class="empty">Nessun dato verificato<br><small>per questa giornata</small></div>')+'</article>';
 }).join('');
 $$('[data-event-id]').forEach(b=>b.addEventListener('click',()=>openEvent(b.dataset.eventId)));
}
renderWeek();
$('#radarFilters')?.addEventListener('click',e=>{const b=e.target.closest('[data-filter]');if(!b)return;state.filter=b.dataset.filter;$$('#radarFilters button').forEach(x=>x.classList.toggle('active',x===b));renderWeek()});

function openPanel(title,body){
  let layer=$('#publicPanelLayer');
  if(!layer){
    layer=document.createElement('div');layer.id='publicPanelLayer';layer.className='public-panel-layer';
    layer.innerHTML='<div class="public-panel"><header><b id="publicPanelTitle"></b><button type="button" id="publicPanelClose" aria-label="Chiudi">×</button></header><div id="publicPanelBody"></div></div>';
    document.body.appendChild(layer);
    $('#publicPanelClose',layer).onclick=()=>layer.classList.remove('open');
    layer.addEventListener('click',e=>{if(e.target===layer)layer.classList.remove('open')});
  }
  $('#publicPanelTitle',layer).textContent=title;
  $('#publicPanelBody',layer).innerHTML=body;
  $('.public-panel',layer)?.classList.toggle('wide',/matchday-sheet|team-hub-sheet/.test(String(body||'')));
  layer.classList.add('open');
  return layer;
}
function openEvent(id){
 const x=[...state.fullCalendar,...state.events,...state.upcoming].find(e=>String(e.id)===String(id));if(!x)return;
 openPanel(x.title||'Evento SCD','<div class="panel-detail"><span class="eyebrow">'+esc(x.kind||'EVENTO')+'</span><h2>'+esc(x.team||'SCD')+'</h2><p>'+esc([fmtDate(x.date),x.time,x.opponent,x.venue].filter(Boolean).join(' · '))+'</p><small>Fonte: '+esc(x.source||'SCD')+'</small></div>');
}
function openCalendarPanel(){setView('calendar')}
function openTeamsPanel(){setView('teams')}
$$('[data-public-action="calendar"]').forEach(b=>b.addEventListener('click',openCalendarPanel));
$$('[data-public-action="teams"]').forEach(b=>b.addEventListener('click',openTeamsPanel));

function normalizeCalendarRows(raw){
 const data=raw?.data||raw||{};
 const rows=Array.isArray(data)?data:(Array.isArray(data.rows)?data.rows:Array.isArray(data.items)?data.items:Array.isArray(data.events)?data.events:Array.isArray(data.calendar?.rows)?data.calendar.rows:[]);
 return rows.map((row,i)=>({
   id:String(pick(row,'id','eventId','uid')||'PUB-'+i+'-'+isoClientDate(pick(row,'date','data','startDate'))),
   title:String(pick(row,'title','event','name','subject')||'Attività SCD'),
   date:isoClientDate(pick(row,'date','data','startDate')),
   time:String(pick(row,'time','ora','startTime')||''),
   endTime:String(pick(row,'endTime','fine')||''),
   team:String(pick(row,'team','teamName','squadra')||'SCD'),
   category:String(pick(row,'category','categoria','ageGroup','annata')||''),
   opponent:String(pick(row,'opponent','opponentName','avversario')||''),
   competition:String(pick(row,'competition','campionato','league')||''),
   venue:String(pick(row,'venue','luogo','field','location')||''),
   kind:clientEventKind(row),
   source:String(pick(row,'source','fonte')||'R20_PUBLIC_CALENDAR')
 })).filter(x=>x.date);
}
function mergeCalendarRows(...groups){
 const map=new Map();
 groups.flat().forEach((x,i)=>{
   if(!x||!x.date)return;
   const key=String(x.id||'')||[x.date,x.time,x.team,x.title,x.opponent].join('|');
   const prior=map.get(key)||{};
   map.set(key,{...prior,...x,id:x.id||prior.id||'MERGED-'+i});
 });
 return [...map.values()].sort((a,b)=>(a.date+'T'+(a.time||'00:00')).localeCompare(b.date+'T'+(b.time||'00:00')));
}
function fallbackCalendarRows(){
 return mergeCalendarRows(state.events||[],state.upcoming||[]);
}
async function ensurePublicCalendar(force=false){
 if(state.calendarLoading)return;
 if(state.calendarLoaded&&!force){renderPublicCalendar();renderPublicTeams();return}
 state.calendarLoading=true;
 const cal=$('#calendarPublicList'),teams=$('#publicTeamsGrid');
 if(cal)cal.innerHTML='<div class="core-loading"><b>Sincronizzo il calendario pubblico</b><small>Sto interrogando la fonte SCD senza inventare gli eventi mancanti.</small></div>';
 if(teams)teams.innerHTML='<div class="core-loading"><b>Sincronizzo le squadre</b><small>La directory viene costruita dal calendario pubblico verificato.</small></div>';
 try{
   const out=await postAction('public.calendar',{rangeKey:'ALL',offset:0,limit:500});
   const rows=normalizeCalendarRows(out);
   const fallback=fallbackCalendarRows();
   state.fullCalendar=mergeCalendarRows(rows,fallback);
   state.calendarSourceState=rows.length?'VERIFIED_PUBLIC_CALENDAR':'PARTIAL_NEWSROOM_FALLBACK';
   state.calendarLoaded=true;
 }catch(err){
   state.fullCalendar=fallbackCalendarRows();
   state.calendarSourceState=state.fullCalendar.length?'PARTIAL_NEWSROOM_FALLBACK':'UNAVAILABLE';
   state.calendarLoaded=true;
 }
 state.calendarLoading=false;
 renderPublicCalendar();
 renderPublicTeams();
}
function calendarBounds(period){
 const today=todayKey();
 if(period==='ALL')return {start:'0000-01-01',end:'9999-12-31'};
 if(period==='30'){const d=new Date(today+'T12:00:00');d.setDate(d.getDate()+30);return {start:today,end:new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome'}).format(d)}}
 const week=currentWeek();return {start:new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome'}).format(week[0]),end:new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome'}).format(week[6])};
}
function calendarFilterRows(){
 const bounds=calendarBounds(state.calendarPeriod),term=norm(state.calendarSearch);
 return (state.fullCalendar||[]).filter(x=>{
   if(x.date<bounds.start||x.date>bounds.end)return false;
   if(state.calendarTeam!=='ALL'&&x.team!==state.calendarTeam)return false;
   if(state.calendarCategory!=='ALL'&&x.category!==state.calendarCategory)return false;
   if(state.calendarType!=='ALL'&&x.kind!==state.calendarType)return false;
   if(term&&!norm([x.team,x.category,x.title,x.opponent,x.competition,x.venue,x.kind].join(' ')).includes(term))return false;
   return true;
 });
}
function syncCalendarFilters(){
 const rows=state.fullCalendar||[];
 const team=$('#calendarTeamFilter'),cat=$('#calendarCategoryFilter');
 if(team){
   const vals=[...new Set(rows.map(x=>x.team).filter(x=>x&&x!=='SCD'))].sort((a,b)=>a.localeCompare(b,'it'));
   team.innerHTML='<option value="ALL">Tutte</option>'+vals.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join('');
   team.value=vals.includes(state.calendarTeam)?state.calendarTeam:'ALL';
   if(team.value==='ALL')state.calendarTeam='ALL';
 }
 if(cat){
   const vals=[...new Set(rows.map(x=>x.category).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'it'));
   cat.innerHTML='<option value="ALL">Tutte</option>'+vals.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join('');
   cat.value=vals.includes(state.calendarCategory)?state.calendarCategory:'ALL';
   if(cat.value==='ALL')state.calendarCategory='ALL';
 }
}
function renderPublicCalendar(){
 const mount=$('#calendarPublicList');if(!mount)return;
 syncCalendarFilters();
 const rows=calendarFilterRows();
 const kpis=$$('#calendarKpis b');
 const games=rows.filter(x=>x.kind==='MATCH').length,training=rows.filter(x=>x.kind==='TRAINING').length,other=rows.length-games-training;
 [rows.length,games,training,other].forEach((v,i)=>{if(kpis[i])kpis[i].textContent=String(v)});
 const periodButtons=$$('#calendarPeriod [data-period]');periodButtons.forEach(b=>b.classList.toggle('active',b.dataset.period===state.calendarPeriod));
 if(!rows.length){
   mount.innerHTML='<div class="core-empty"><b>Nessuna attività trovata</b><p>Non risultano eventi pubblici verificati con questi filtri. Puoi cambiare periodo o azzerare i filtri.</p><small>Stato fonte: '+esc(state.calendarSourceState)+'</small></div>';
   return;
 }
 const groups=new Map();
 rows.forEach(x=>{if(!groups.has(x.date))groups.set(x.date,[]);groups.get(x.date).push(x)});
 mount.innerHTML=[...groups.entries()].map(([date,items])=>'<section class="calendar-day-group"><header><time>'+esc(fmtDate(date))+'</time><span>'+items.length+' attività</span></header><div class="calendar-day-events">'+items.map(x=>'<button type="button" class="calendar-event-row" data-calendar-event="'+esc(x.id)+'"><span class="calendar-event-time">'+esc(x.time||'—')+'</span><span class="calendar-event-main"><small>'+esc(x.kind)+'</small><b>'+esc(x.team||x.title||'SCD')+'</b><em>'+esc([x.title,x.opponent?('vs '+x.opponent):'',x.competition].filter(Boolean).join(' · '))+'</em></span><span class="calendar-event-place">'+esc(x.venue||'Sede in aggiornamento')+'</span><span class="calendar-event-arrow">›</span></button>').join('')+'</div></section>').join('');
 $$('[data-calendar-event]',mount).forEach(b=>b.onclick=()=>openEvent(b.dataset.calendarEvent));
}
function publicTeamModels(){
 const today=todayKey(),map=new Map();
 (state.fullCalendar||[]).forEach(x=>{
   const name=x.team&&x.team!=='SCD'?x.team:(x.category||'');
   if(!name)return;
   if(!map.has(name))map.set(name,{name,categories:new Set(),rows:[]});
   const t=map.get(name);if(x.category)t.categories.add(x.category);t.rows.push(x);
 });
 return [...map.values()].map(t=>{
   t.rows.sort((a,b)=>(a.date+(a.time||'')).localeCompare(b.date+(b.time||'')));
   const future=t.rows.filter(x=>x.date>=today);
   return {name:t.name,categories:[...t.categories],rows:t.rows,next:future[0]||null,nextMatch:future.find(x=>x.kind==='MATCH')||null};
 }).sort((a,b)=>a.name.localeCompare(b.name,'it'));
}
function teamModelByName(name){
 const key=norm(name);
 return publicTeamModels().find(x=>norm(x.name)===key)||null;
}
function renderMyTeamDeck(){
 const deck=$('#myTeamDeck');if(!deck)return;
 const name=loadFollowedTeam();
 if(!name){deck.hidden=true;return}
 const model=teamModelByName(name);
 const title=$('#myTeamName'),meta=$('#myTeamMeta');
 if(title)title.textContent=name;
 if(meta){
   const next=model?.nextMatch||model?.next;
   meta.textContent=next?[next.kind==='MATCH'?'Prossima gara':'Prossima attività',fmtDate(next.date),next.time,next.opponent,next.venue].filter(Boolean).join(' · '):'Squadra seguita · dati pubblici in aggiornamento';
 }
 deck.hidden=false;
}
function socialMatchCaption(match){
 if(!match)return '';
 const iso=[match.date,match.time||'12:00'].filter(Boolean).join('T');
 const opponent=match.opponent||match.away_team||'Avversario in aggiornamento';
 const base={
   campionato_name:match.competition||match.category||'Competizione in aggiornamento',
   opponent,
   away_team:opponent,
   match_date:iso,
   match_time:String(match.time||''),
   venue_name:match.venue||'Campo in aggiornamento'
 };
 try{
   if(window.SCDOperativeEngine?.buildMatchDayCaption)return window.SCDOperativeEngine.buildMatchDayCaption(base);
 }catch{}
 return ['⚽️ MATCH DAY - LA NOSTRA TERRA, I NOSTRI COLORI! 🔴🔵','',
   '🏆 Campionato: '+base.campionato_name,
   '🆚 Avversario: '+opponent,
   '⏱️ Fischio d\'inizio: Ore '+String(match.time||'[Orario]'),
   '🏟️ Stadio: '+base.venue_name,
   '',
   '#SCDColicoDerviese #Colico #Dervio #MatchDay #CuoreRossoBlu'
 ].join('\n');
}
function clubContentItems(){
 return (Array.isArray(state.clubContent)?state.clubContent:[]).filter(x=>x&&x.public===true&&x.verified===true);
}
function openClubContent(item){
 if(!item)return;
 const details=Array.isArray(item.details)&&item.details.length?'<ul class="club-content-details">'+item.details.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':'';
 const actions=[];
 if(item.action==='development')actions.push('<a class="btn primary" href="./sponsor/#opportunita">Progetti & opportunità</a>');
 if(item.action==='profile')actions.push('<button type="button" class="btn primary" id="clubContentOpenDesk">Apri area riservata</button>');
 if(item.action==='home')actions.push('<button type="button" class="btn primary" id="clubContentOpenHome">Torna alla Home</button>');
 const layer=openPanel('SCD Club Now','<div class="panel-detail club-content-panel"><span class="eyebrow">'+esc(item.status||'SCD')+'</span><h2>'+esc(item.title||'Aggiornamento SCD')+'</h2><p>'+esc(item.summary||'')+'</p>'+details+'<div class="club-content-source"><small>FONTE</small><b>'+esc(item.sourceLabel||'Direzione SCD ColicoDerviese')+'</b><span>Aggiornato '+esc(item.updatedAt||'')+'</span></div>'+(actions.length?'<div class="club-content-actions">'+actions.join('')+'</div>':'')+'</div>');
 const desk=$('#clubContentOpenDesk',layer);if(desk)desk.onclick=()=>{layer.classList.remove('open');setView('desk')};
 const home=$('#clubContentOpenHome',layer);if(home)home.onclick=()=>{layer.classList.remove('open');setView('pulse')};
}
function renderClubContent(){
 const mount=$('#clubContentRail');if(!mount)return;
 const rows=clubContentItems().slice(0,4);
 const status=$('#clubContentStatus');if(status)status.textContent=rows.length?'CONTENUTI SCD VERIFICATI':'CONTENUTI IN AGGIORNAMENTO';
 mount.innerHTML=rows.length?rows.map((x,i)=>'<article class="club-now-card"><div class="club-now-index">'+String(i+1).padStart(2,'0')+'</div><div><small>'+esc(x.type||'CLUB')+' · '+esc(x.status||'')+'</small><h3>'+esc(x.title||'Aggiornamento SCD')+'</h3><p>'+esc(x.summary||'')+'</p></div><button type="button" data-club-content="'+esc(x.id)+'">Apri</button></article>').join(''):'<article class="club-now-empty"><b>Contenuti in aggiornamento</b><span>La sezione resta vuota finché non esistono contenuti pubblici verificati.</span></article>';
 $$('[data-club-content]',mount).forEach(b=>b.onclick=()=>openClubContent(rows.find(x=>x.id===b.dataset.clubContent)));
}
async function loadClubContent(){
 try{
   const r=await fetch('./content/public-club.v1.json',{cache:'no-store'});
   if(!r.ok)throw new Error('club content unavailable');
   const data=await r.json();
   const source=data?.source||{};
   const items=Array.isArray(data?.items)?data.items:[];
   state.clubContent=items.filter(x=>x?.public===true).map(x=>({...x,verified:source.verified===true,sourceLabel:source.label||source.id||'SCD',updatedAt:data.updated_at||''}));
 }catch(e){state.clubContent=[]}
 renderClubContent();
 renderSocialHub();
}
function socialFeedRows(){
 const out=[];
 if(state.nextMatch){
   const m=state.nextMatch;
   out.push({
     id:'match-next',type:'MATCHDAY',icon:'⚽',label:'MATCHDAY',
     title:[m.team||'SCD',m.opponent?'vs '+m.opponent:''].filter(Boolean).join(' '),
     copy:[m.competition||m.category,fmtDate(m.date),m.time,m.venue].filter(Boolean).join(' · '),
     meta:[m.source||'Fonte sportiva verificata'],team:m.team||'',
     action:'match',share:socialMatchCaption(m)
   });
 }
 (state.upcoming||[]).slice(0,12).forEach((x,i)=>{
   out.push({
     id:'event-'+String(x.id||i),type:'EVENT',icon:'▦',label:x.kind||'EVENTO',
     title:x.kind==='MATCH'?[x.team,x.opponent].filter(Boolean).join(' vs '):(x.title||x.team||'Evento SCD'),
     copy:[fmtDate(x.date),x.time,x.venue].filter(Boolean).join(' · '),
     meta:[x.source||'Calendario SCD'],team:x.team||'',
     action:'event',actionId:String(x.id||''),share:[x.title||x.team||'Evento SCD',fmtDate(x.date),x.time,x.venue].filter(Boolean).join(' · ')
   });
 });
 clubContentItems().forEach((x,i)=>{
   out.push({
     id:'club-'+String(x.id||i),type:'CLUB',icon:x.type==='PROJECT'?'◆':'SCD',label:x.type==='PROJECT'?'SCD PROGETTI':'SCD CLUB',
     title:x.title||'Aggiornamento SCD',copy:x.summary||'',meta:[x.status||'VERIFICATO',x.sourceLabel||'Direzione SCD'].filter(Boolean),team:'',
     action:'club',actionId:String(x.id||''),share:[x.title,x.summary].filter(Boolean).join(' — ')
   });
 });
 (state.news?.cards||[]).forEach((x,i)=>{
   if(!Array.isArray(x.evidence)||!x.evidence.length)return;
   const ev=x.evidence[0]||{};
   out.push({
     id:'news-'+i,type:'NEWS',icon:'✦',label:x.category||'SCD NEWSROOM',
     title:x.title||'Aggiornamento SCD',
     copy:x.dek||x.body||'Contenuto verificato.',
     meta:[ev.source||ev.label||'Fonte verificata'].filter(Boolean),team:x.team||'',
     action:'news',actionId:String(i),
     share:[x.title,x.dek||x.body].filter(Boolean).join(' — ')
   });
 });
 return out;
}
async function shareSocialText(text,title='SCD ColicoDerviese'){
 const value=String(text||'').trim();if(!value)return;
 try{
   if(navigator.share){await navigator.share({title,text:value});return}
   if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(value);toast('Contenuto copiato');return}
 }catch(e){if(e?.name==='AbortError')return}
 openPanel('Condividi','<div class="panel-detail"><h2>'+esc(title)+'</h2><p>'+esc(value)+'</p></div>');
}
function openSocialItem(row){
 if(!row)return;
 if(row.action==='match')return openMatchday(state.nextMatch);
 if(row.action==='event'&&row.actionId)return openEvent(row.actionId);
 if(row.action==='club'&&row.actionId)return openClubContent(clubContentItems().find(x=>String(x.id)===String(row.actionId)));
 if(row.action==='news'){
   const card=(state.news?.cards||[])[Number(row.actionId)];
   if(!card)return;
   const source=(card.evidence||[]).map(x=>x.source||x.label).filter(Boolean).join(' · ')||'Fonte verificata';
   return openPanel('SCD Newsroom','<div class="panel-detail"><span class="eyebrow">'+esc(card.category||'NEWS')+'</span><h2>'+esc(card.title||'Aggiornamento SCD')+'</h2><p>'+esc(card.dek||card.body||'Contenuto verificato')+'</p><small>Fonte: '+esc(source)+'</small></div>');
 }
}
function renderSocialHub(){
 const mount=$('#socialFeed');if(!mount)return;
 const followed=loadFollowedTeam();
 const ft=$('#socialFollowedTeam'),fm=$('#socialFollowedMeta');
 if(ft)ft.textContent=followed||'Nessuna squadra seguita';
 if(fm)fm.textContent=followed?'Il feed “Per te” privilegia gli aggiornamenti pubblici collegati a '+followed+'.':'Scegli una squadra dalla sezione Squadre per personalizzare il feed locale.';
 const term=norm(state.socialSearch).trim();
 const rows=socialFeedRows().filter(row=>{
   if(state.socialFilter==='FOLLOWING'){
     if(!followed)return false;
     const hay=norm([row.team,row.title,row.copy].join(' '));
     if(!hay.includes(norm(followed)))return false;
   }else if(state.socialFilter!=='ALL'&&row.type!==state.socialFilter)return false;
   if(term&&!norm([row.label,row.title,row.copy,row.team,...row.meta].join(' ')).includes(term))return false;
   return true;
 }).slice(0,30);
 mount.innerHTML=rows.length?rows.map(row=>
   '<article class="social-card" data-type="'+esc(row.type)+'">'+
   '<div class="social-card-type">'+esc(row.icon)+'</div>'+
   '<div class="social-card-body"><small>'+esc(row.label)+'</small><h3>'+esc(row.title||'SCD')+'</h3><p>'+esc(row.copy||'Dato verificato disponibile')+'</p>'+
   '<div class="social-card-meta">'+row.meta.map(x=>'<span>'+esc(x)+'</span>').join('')+'</div></div>'+
   '<div class="social-card-actions"><button type="button" data-social-open="'+esc(row.id)+'">Apri</button><button type="button" data-social-share="'+esc(row.id)+'">Condividi</button></div>'+
   '</article>'
 ).join(''):'<div class="social-empty"><b>Nessun contenuto verificato per questo filtro</b><span>Il feed resta vuoto invece di inventare post o risultati.</span></div>';
 const map=new Map(rows.map(x=>[x.id,x]));
 $$('[data-social-open]',mount).forEach(b=>b.onclick=()=>openSocialItem(map.get(b.dataset.socialOpen)));
 $$('[data-social-share]',mount).forEach(b=>b.onclick=()=>{const row=map.get(b.dataset.socialShare);if(row)shareSocialText(row.share,row.title)});
}
$('#socialPointsLogin')?.addEventListener('click',()=>{
  try{
    if(window.R24?.go)return window.R24.go('profile');
  }catch{}
  setView('twin');
 });
 $('#socialMvpOpen')?.addEventListener('click',()=>toast('Votazione MVP non disponibile finché il backend non restituisce candidati autorizzati.'));
 $('#socialRewardsOpen')?.addEventListener('click',()=>toast('Catalogo premi in aggiornamento.'));
 $('#socialDealsOpen')?.addEventListener('click',()=>toast('Convenzioni territoriali in aggiornamento.'));
 
 async function openTeamHub(name){
 if(!state.calendarLoaded)await ensurePublicCalendar();
 const model=teamModelByName(name);
 if(!model){toast('Dati pubblici della squadra in aggiornamento');return}
 const followed=norm(loadFollowedTeam())===norm(model.name);
 const nextMatch=model.nextMatch;
 const upcoming=model.rows.filter(x=>x.date>=todayKey()).slice(0,6);
 const schedule=upcoming.length?upcoming.map(x=>'<button type="button" class="team-hub-event" data-teamhub-event="'+esc(x.id)+'"><time>'+esc(fmtDate(x.date))+(x.time?' · '+esc(x.time):'')+'</time><b>'+esc(x.kind==='MATCH'?[x.team,x.opponent].filter(Boolean).join(' vs '):(x.title||x.team))+'</b><small>'+esc([x.competition,x.venue].filter(Boolean).join(' · '))+'</small><i>›</i></button>').join(''):'<div class="panel-empty"><b>Nessuna attività futura verificata</b><p>Il Team Hub non inventa appuntamenti mancanti.</p></div>';
 const body='<section class="team-hub-sheet"><div class="team-hub-hero"><div class="team-hub-mark">'+esc(model.name.slice(0,2).toUpperCase())+'</div><div><span class="eyebrow">SCD TEAM HUB</span><h2>'+esc(model.name)+'</h2><p>'+esc(model.categories.join(' · ')||'Categoria in aggiornamento')+'</p></div><button type="button" id="teamHubFollow" class="'+(followed?'is-following':'')+'">'+(followed?'★ SEGUITA':'☆ SEGUI')+'</button></div><div class="team-hub-kpis"><article><small>PROSSIMA GARA</small><b>'+esc(nextMatch?(nextMatch.opponent||nextMatch.title||'Dato verificato'):'Dato in aggiornamento')+'</b><span>'+esc(nextMatch?[fmtDate(nextMatch.date),nextMatch.time].filter(Boolean).join(' · '):'')+'</span></article><article><small>CLASSIFICA</small><b>'+esc(statStandingText(model.name))+'</b></article><article><small>FORMA</small><b>'+esc(statFormText(model.name))+'</b></article></div><div class="team-hub-actions">'+(nextMatch?'<button type="button" class="btn primary" id="teamHubMatchday">Apri Matchday</button>':'')+'<button type="button" class="btn glass" id="teamHubCalendar">Calendario squadra</button></div><div class="team-hub-schedule"><div class="panel-section-title"><span>PROSSIMI IMPEGNI</span><b>Fonte pubblica verificata</b></div>'+schedule+'</div></section>';
 const layer=openPanel('Team Hub · '+model.name,body);
 $('#teamHubFollow',layer).onclick=()=>{if(followed){saveFollowedTeam('');toast('Squadra rimossa dalle preferenze')}else{saveFollowedTeam(model.name);toast('Ora segui '+model.name)}updateFollowTeamUi();layer.classList.remove('open')};
 if(nextMatch)$('#teamHubMatchday',layer).onclick=()=>openMatchday(nextMatch);
 $('#teamHubCalendar',layer).onclick=()=>{state.calendarTeam=model.name;state.calendarPeriod='ALL';layer.classList.remove('open');setView('calendar');renderPublicCalendar()};
 $$('[data-teamhub-event]',layer).forEach(b=>b.onclick=()=>openEvent(b.dataset.teamhubEvent));
}
function openMatchday(match=state.nextMatch){
 if(!match){toast('Partita verificata non ancora disponibile');return}
 const standing=statStandingText(match.team),form=statFormText(match.team),h2h=statH2HText(match);
 const model=teamModelByName(match.team);
 const nextTeamEvents=(model?.rows||[]).filter(x=>x.date>=match.date).slice(0,4);
 const upcoming=nextTeamEvents.length?nextTeamEvents.map(x=>'<div class="matchday-next-row"><time>'+esc(fmtDate(x.date))+(x.time?' · '+esc(x.time):'')+'</time><b>'+esc(x.kind==='MATCH'?[x.team,x.opponent].filter(Boolean).join(' vs '):(x.title||x.team))+'</b><span>'+esc(x.venue||'Sede in aggiornamento')+'</span></div>').join(''):'<div class="panel-empty"><b>Calendario squadra in aggiornamento</b></div>';
 const body='<section class="matchday-sheet"><div class="matchday-kicker"><span>SCD MATCHDAY</span><b>'+esc(match.competition||match.category||'Competizione in aggiornamento')+'</b></div><div class="matchday-scoreboard"><div class="matchday-club"><img src="./assets/logo-scd.png" alt="SCD ColicoDerviese"><b>'+esc(match.team||'SCD')+'</b></div><div class="matchday-center"><time>'+esc(fmtDate(match.date))+'</time><strong>'+esc(match.time||'Orario in aggiornamento')+'</strong><span>'+esc(match.venue||'Campo in aggiornamento')+'</span></div><div class="matchday-club opponent"><div class="matchday-opponent-mark">'+esc((match.opponent||'?').slice(0,2).toUpperCase())+'</div><b>'+esc(match.opponent||'Avversario in aggiornamento')+'</b></div></div><div class="matchday-stats"><article><small>CLASSIFICA</small><b>'+esc(standing)+'</b></article><article><small>FORMA RECENTE</small><b>'+esc(form)+'</b></article><article><small>SCONTRI DIRETTI</small><b>'+esc(h2h)+'</b><span>'+esc(h2h==='Dato in aggiornamento'?'Nessuna fonte verificata collegata per questo confronto.':'Dati disponibili dalla fonte sportiva collegata.')+'</span></article></div><div class="matchday-trust"><span>FONTE</span><b>'+esc(match.source||'SCD')+'</b><small>Nessun dato mancante viene ricostruito o stimato.</small></div><div class="matchday-actions"><button type="button" class="btn primary" id="matchdayTeam">Team Hub</button><button type="button" class="btn glass" id="matchdayMedia">Video & Media</button><button type="button" class="btn glass" id="matchdayCalendar">Calendario</button></div><div class="matchday-next"><div class="panel-section-title"><span>DOPO QUESTA GARA</span><b>prossimi impegni pubblici</b></div>'+upcoming+'</div></section>';
 const layer=openPanel('Matchday · '+(match.team||'SCD'),body);
 $('#matchdayTeam',layer).onclick=()=>openTeamHub(match.team||'SCD');
 $('#matchdayMedia',layer).onclick=()=>{layer.classList.remove('open');setView('pulse');setTimeout(()=>$('#videoArena')?.scrollIntoView({behavior:'smooth',block:'start'}),100)};
 $('#matchdayCalendar',layer).onclick=()=>{layer.classList.remove('open');state.calendarTeam=match.team||'ALL';state.calendarPeriod='ALL';setView('calendar');renderPublicCalendar()};
}
function syncTeamsFilters(models){
 const cat=$('#teamsCategoryFilter');if(!cat)return;
 const vals=[...new Set(models.flatMap(x=>x.categories).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'it'));
 cat.innerHTML='<option value="ALL">Tutte</option>'+vals.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join('');
 cat.value=vals.includes(state.teamsCategory)?state.teamsCategory:'ALL';
 if(cat.value==='ALL')state.teamsCategory='ALL';
}
function syncFollowTeam(models){
 const sel=$('#followTeamSelect');if(!sel)return;
 const current=loadFollowedTeam(),names=models.map(x=>x.name).filter(Boolean);
 sel.innerHTML='<option value="">Scegli squadra</option>'+names.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join('');
 sel.value=names.includes(current)?current:'';
 updateFollowTeamUi();
}
function renderPublicTeams(){
 const mount=$('#publicTeamsGrid');if(!mount)return;
 const models=publicTeamModels();syncTeamsFilters(models);syncFollowTeam(models);
 const term=norm(state.teamsSearch);
 const rows=models.filter(t=>(state.teamsCategory==='ALL'||t.categories.includes(state.teamsCategory))&&(!term||norm([t.name,...t.categories].join(' ')).includes(term)));
 const count=$('#teamsCount');if(count)count.textContent=rows.length+' '+(rows.length===1?'squadra':'squadre');
 if(!rows.length){
   mount.innerHTML='<div class="core-empty"><b>Nessuna squadra trovata</b><p>La directory mostra solo squadre ricavabili dai dati sportivi pubblici verificati.</p><small>Stato fonte: '+esc(state.calendarSourceState)+'</small></div>';
   return;
 }
 mount.innerHTML=rows.map(t=>{
   const next=t.next,nextMatch=t.nextMatch;
   return '<button type="button" class="public-team-card" data-public-team="'+esc(t.name)+'"><span class="team-card-mark">'+esc((t.name||'?').slice(0,2).toUpperCase())+'</span><div class="team-card-copy"><small>'+esc(t.categories.join(' · ')||'SCD')+'</small><h3>'+esc(t.name)+'</h3><p>'+(next?esc('Prossima attività · '+fmtDate(next.date)+(next.time?' · '+next.time:'')):'Nessuna attività futura verificata')+'</p></div><div class="team-card-match"><small>PROSSIMA GARA</small><b>'+esc(nextMatch?(nextMatch.opponent||nextMatch.title||fmtDate(nextMatch.date)):'Dato in aggiornamento')+'</b><span>'+esc(nextMatch?[fmtDate(nextMatch.date),nextMatch.time].filter(Boolean).join(' · '):'')+'</span></div><span class="team-card-arrow">›</span></button>';
 }).join('');
 $$('[data-public-team]',mount).forEach(b=>b.onclick=()=>openTeamHub(b.dataset.publicTeam));
 renderMyTeamDeck();
}
$('#calendarSearch')?.addEventListener('input',e=>{state.calendarSearch=e.target.value;renderPublicCalendar()});
$('#calendarTeamFilter')?.addEventListener('change',e=>{state.calendarTeam=e.target.value;renderPublicCalendar()});
$('#calendarCategoryFilter')?.addEventListener('change',e=>{state.calendarCategory=e.target.value;renderPublicCalendar()});
$('#calendarTypeFilter')?.addEventListener('change',e=>{state.calendarType=e.target.value;renderPublicCalendar()});
$('#calendarPeriod')?.addEventListener('click',e=>{const b=e.target.closest('[data-period]');if(!b)return;state.calendarPeriod=b.dataset.period;renderPublicCalendar()});
$('#calendarReset')?.addEventListener('click',()=>{state.calendarSearch='';state.calendarTeam='ALL';state.calendarCategory='ALL';state.calendarType='ALL';state.calendarPeriod='WEEK';if($('#calendarSearch'))$('#calendarSearch').value='';if($('#calendarTypeFilter'))$('#calendarTypeFilter').value='ALL';renderPublicCalendar()});
$('#teamsSearch')?.addEventListener('input',e=>{state.teamsSearch=e.target.value;renderPublicTeams()});
$('#teamsCategoryFilter')?.addEventListener('change',e=>{state.teamsCategory=e.target.value;renderPublicTeams()});
$('#saveFollowTeam')?.addEventListener('click',()=>{
 const sel=$('#followTeamSelect'),name=String(sel?.value||'').trim();
 if(!name){saveFollowedTeam('');updateFollowTeamUi();toast('Preferenza squadra rimossa');return}
 saveFollowedTeam(name);updateFollowTeamUi();renderPublicTeams();toast('Ora segui '+name+' su questo dispositivo');
});
$('#openMyTeamHub')?.addEventListener('click',()=>{const name=loadFollowedTeam();if(name)openTeamHub(name);else{setView('teams');setTimeout(()=>$('#followTeamSelect')?.focus(),120)}});
$('#openMyTeamCalendar')?.addEventListener('click',()=>{const name=loadFollowedTeam();if(!name){setView('teams');return}state.calendarTeam=name;state.calendarPeriod='ALL';setView('calendar');renderPublicCalendar()});
$('#sportFollowTeam')?.addEventListener('click',()=>{
 const name=loadFollowedTeam();
 setView('teams');
 if(name){
   state.teamsSearch=name;
   const input=$('#teamsSearch');if(input)input.value=name;
   renderPublicTeams();
 }else setTimeout(()=>$('#followTeamSelect')?.focus(),120);
});

function renderMatchCenter(){
 const match=state.nextMatch;
 const verified=$('#matchVerifiedState');
 if(!match){
   if(verified){verified.textContent='DATO IN AGGIORNAMENTO';verified.classList.add('pending')}
   ['#matchTeam','#matchDate','#matchTimeVenue','#matchOpponent','#matchCompetition','#matchStanding','#matchForm','#matchH2H'].forEach((sel,i)=>{const el=$(sel);if(el)el.textContent=i===0?'SCD':'Dato in aggiornamento'});
   return;
 }
 if(verified){verified.textContent='FONTE · '+(match.source||'SCD');verified.classList.remove('pending')}
 $('#matchTeam').textContent=match.team||'SCD';
 $('#matchDate').textContent=fmtDate(match.date);
 $('#matchTimeVenue').textContent=[match.time,match.venue].filter(Boolean).join(' · ')||'Ora e campo in aggiornamento';
 $('#matchOpponent').textContent=match.opponent||'Avversario in aggiornamento';
 $('#matchCompetition').textContent=match.competition||match.category||'Competizione in aggiornamento';
 $('#matchStanding').textContent=statStandingText(match.team);
 $('#matchForm').textContent=statFormText(match.team);
 $('#matchH2H').textContent=statH2HText(match);
}
$('#matchAnalyze')?.addEventListener('click',()=>openMatchday(state.nextMatch));


function renderUpcoming(){
 const rail=$('#upcomingEventRail');if(!rail)return;
 const rows=(state.upcoming||[]).slice(0,10);
 rail.innerHTML=rows.length?rows.map(x=>'<button type="button" class="upcoming-card" data-event-id="'+esc(x.id)+'"><time>'+esc(fmtDate(x.date))+(x.time?' · '+esc(x.time):'')+'</time><b>'+esc(x.title||x.team||'Evento SCD')+'</b><small>'+esc([x.team,x.opponent,x.venue].filter(Boolean).join(' · '))+'</small><span>'+esc(x.kind||'EVENTO')+'</span></button>').join(''):'<article class="event-empty"><b>Dati in aggiornamento</b><small>Mostriamo solo appuntamenti pubblici verificati.</small></article>';
 $$('[data-event-id]',rail).forEach(b=>b.onclick=()=>openEvent(b.dataset.eventId));
}
function renderPartners(){
 const el=$('#verifiedPartners');if(!el)return;
 el.innerHTML=state.partners.length?state.partners.map(x=>'<b>'+esc(x.name)+'</b>').join(''):'<b>Partner verificati · sincronizzazione fonte</b>';
}
function renderWeekMeta(data){
 const label=$('#weekRangeLabel'),meta=$('#weekSummaryMeta');
 if(label&&data.week)label.textContent=fmtDate(data.week.start)+' → '+fmtDate(data.week.end)+' · Europe/Rome';
 if(meta)meta.textContent=state.events.length?state.events.length+' attività verificate · tutte le annate':'Nessuna attività verificata caricata';
}

function buildSearchIndex(){
 const items=[];
 const searchableCalendar=(state.fullCalendar&&state.fullCalendar.length)?state.fullCalendar:state.events;searchableCalendar.forEach(x=>items.push({kind:x.kind==='MATCH'?'PARTITA':'EVENTO',title:[x.team,x.opponent].filter(Boolean).join(' vs ')||x.title,meta:[fmtDate(x.date),x.time,x.venue].filter(Boolean).join(' · '),action:'event',id:x.id,terms:[x.team,x.category,x.title,x.opponent,x.competition,x.venue]}));
 (state.news?.cards||[]).forEach((x,i)=>items.push({kind:'NEWS',title:x.title,meta:x.category||'SCD Newsroom',action:'news',id:String(i),terms:[x.title,x.dek,x.body,x.category]}));
 [...new Set(searchableCalendar.flatMap(x=>[x.team,x.category]).filter(x=>x&&x!=='SCD'))].forEach(x=>items.push({kind:'SQUADRA',title:x,meta:'Calendario e contenuti pubblici',action:'team',id:x,terms:[x]}));
 clubContentItems().forEach(x=>items.push({kind:x.type==='PROJECT'?'PROGETTO SCD':'SCD',title:x.title,meta:x.status||'Contenuto verificato',action:'club',id:x.id,terms:[x.title,x.summary,...(x.details||[])]}));
  state.publicProfiles.forEach(x=>items.push({kind:'PROFILO PUBBLICO',title:x.displayName,meta:[x.role,x.team].filter(Boolean).join(' · '),action:'profile',id:x.id,terms:[x.displayName,x.role,x.team]}));
 officialChannels.forEach(x=>items.push({kind:'CANALE UFFICIALE',title:x.label,meta:'SCD ColicoDerviese',action:'channel',id:x.id,terms:[x.label,x.terms]}));
 return items;
}
function runSearch(q){
 const box=$('#publicSearchResults');if(!box)return;
 const term=norm(q).trim();
 if(term.length<2){box.hidden=true;box.innerHTML='';return}
 const rows=buildSearchIndex().filter(x=>norm([x.title,x.meta,...x.terms].join(' ')).includes(term)).slice(0,12);
 box.innerHTML=rows.length?rows.map(x=>'<button type="button" data-search-kind="'+esc(x.action)+'" data-search-id="'+esc(x.id)+'"><small>'+esc(x.kind)+'</small><b>'+esc(x.title||'SCD')+'</b><span>'+esc(x.meta||'')+'</span></button>').join(''):'<div class="search-empty">Nessun contenuto pubblico verificato trovato.</div>';
 box.hidden=false;
 $$('[data-search-kind]',box).forEach(b=>b.onclick=()=>handleSearchResult(b.dataset.searchKind,b.dataset.searchId));
}
function handleSearchResult(kind,id){
 const box=$('#publicSearchResults');if(box)box.hidden=true;
 if(kind==='event')return openEvent(id);
 if(kind==='team'){openTeamHub(id);return}
 if(kind==='news'){document.querySelector('.newsroom')?.scrollIntoView({behavior:'smooth'});return}
 if(kind==='club')return openClubContent(clubContentItems().find(x=>String(x.id)===String(id)));
 if(kind==='profile'){openPanel('Profilo pubblico','<div class="panel-detail"><b>Profilo autorizzato</b><p>Le informazioni mostrate rispettano la visibilità concessa dalla Società.</p></div>')}
 if(kind==='channel'){const ch=officialChannels.find(x=>x.id===id);if(ch)window.open(ch.url,'_blank','noopener,noreferrer')}
}
$('#publicSearchInput')?.addEventListener('input',e=>runSearch(e.target.value));
$('#clearPublicSearch')?.addEventListener('click',()=>{const input=$('#publicSearchInput'),box=$('#publicSearchResults');if(input){input.value='';input.focus()}if(box){box.hidden=true;box.innerHTML=''}});

const pollKey='scd:poll:weekly-ux:v1';
function loadPoll(){try{return JSON.parse(localStorage.getItem(pollKey)||'{}')}catch{return {}}}
function applyPoll(){
 const p=loadPoll();
 $$('[data-poll-option]').forEach(b=>b.classList.toggle('selected',b.dataset.pollOption===p.option));
 const st=$('#pollState');if(st&&p.option)st.textContent='Scelta salvata su questo dispositivo: '+p.option+'. Nessuna percentuale live viene mostrata senza backend verificato.';
}
$$('[data-poll-option]').forEach(b=>b.addEventListener('click',()=>{localStorage.setItem(pollKey,JSON.stringify({option:b.dataset.pollOption,at:new Date().toISOString()}));applyPoll();toast('Scelta locale salvata')}));
applyPoll();

function renderMentions(q=''){
 const box=$('#mentionResults');if(!box)return;
 const term=norm(q).trim();
 const rows=state.publicProfiles.filter(x=>!term||norm([x.displayName,x.role,x.team].join(' ')).includes(term)).slice(0,8);
 box.innerHTML=rows.length?rows.map(x=>'<button type="button" data-profile-id="'+esc(x.id)+'"><b>@'+esc(x.displayName)+'</b><small>'+esc([x.role,x.team].filter(Boolean).join(' · '))+'</small></button>').join(''):'<small>Nessun profilo pubblico autorizzato disponibile.</small>';
}
$('#mentionSearch')?.addEventListener('input',e=>renderMentions(e.target.value));
$('#pixellotLocked')?.addEventListener('click',()=>openPanel('Pixellot · accesso riservato','<div class="panel-detail"><span class="eyebrow">VIDEO PRIVATO</span><h2>Archivio protetto</h2><p>Pixellot resta privato per impostazione predefinita. L’accesso ai video completi richiede autenticazione e autorizzazione dello staff.</p><small>I clip possono diventare pubblici solo dopo verifica di diritti, privacy e autorizzazioni sui minori.</small><button type="button" class="btn primary" id="pixellotOpenDesk">Apri Private Desk</button></div>'));
document.addEventListener('click',e=>{if(e.target?.id==='pixellotOpenDesk'){document.querySelector('#publicPanelLayer')?.classList.remove('open');setView('desk')}});


function readPrivateSession(){
 try{return JSON.parse(localStorage.getItem(PRIVATE_SESSION_KEY)||'{}')}catch{return {}}
}
function savePrivateSession(token,email){
 state.privateToken=String(token||'');state.privateEmail=String(email||'');
 localStorage.setItem(PRIVATE_SESSION_KEY,JSON.stringify({token:state.privateToken,email:state.privateEmail,savedAt:new Date().toISOString()}));
}
function clearPrivateSession(){
 state.privateToken='';state.privateEmail='';state.privateData=null;state.workspace=null;state.privateError='';
 localStorage.removeItem(PRIVATE_SESSION_KEY);
}
async function privatePost(action,payload={},token=state.privateToken){
 const r=await fetch(API_BASE+'/api/scd',{method:'POST',headers:{'content-type':'application/json','x-scd-client':'private-desk'},body:JSON.stringify({action,payload,sessionToken:String(token||'')})});
 const j=await r.json().catch(()=>({ok:false,error:'Risposta privata non valida'}));
 if(!r.ok||j.ok===false)throw new Error(j.error||'Funzione riservata non disponibile');
 return j.data||j;
}
function legacyWorkspace(data={}){
 const u=data.user||{},p=data.permissions||{},mods=['CALENDARIO'];
 if(u.staff||p.direction)mods.push('COMUNICAZIONI','PRESENZE','CONVOCAZIONI');
 if(data.transport||Array.isArray(data.personal)&&data.personal.length)mods.push('PULMINI');
 if(Array.isArray(data.personal)&&data.personal.length)mods.push('TESSERATI');
 mods.push('RICHIESTE');
 if(p.direction)mods.push('APPROVAZIONI','DOCUMENTI','CRM');
 return {email:String(u.email||state.privateEmail||''),name:String(u.name||u.fullName||u.email||'Profilo SCD'),role:String(u.role||u.coreRole||u.type||(p.direction?'DIREZIONE':'STAFF')),privateDeskProfile:'R20_FALLBACK',defaultModules:[...new Set(mods)],communicationScope:[],dataScope:['R20 DASHBOARD'],areas:[]};
}
async function loadWorkspaceProfile(){
 try{return await privatePost('private.user.workspace',{})}
 catch(err){
   const msg=String(err?.message||err||'');
   if(/Azione API non consentita|workspace|non installato|non disponibile/i.test(msg))return null;
   throw err;
 }
}
const deskModuleMeta={
 DASHBOARD:['⌂','Dashboard','Priorità e stato operativo'],
 CALENDARIO:['▦','Calendario','Gare, attività ed eventi'],
 CRM:['◆','CRM Sponsor','Relazioni, follow-up e opportunità'],
 CONTRATTI:['▤','Contratti','Accordi e stato delivery'],
 REPORT:['▥','Report','Evidenze e rendicontazione'],
 APPROVAZIONI:['✓','Approvazioni','Decisioni riservate'],
 COMUNICAZIONI:['✉','Comunicazioni','Perimetro e firma di ruolo'],
 EVENTI:['◫','Eventi','Attività e manifestazioni'],
 DOCUMENTI:['▣','Documenti','Pratiche e raccolta documentale'],
 SEGRETERIA:['⌘','Segreteria','Operatività societaria'],
 SCADENZE:['◷','Scadenze','Promemoria e adempimenti'],
 KIT:['◈','Kit','Materiali e dotazioni'],
 PULMINI:['▰','Pulmini','Trasporti e richieste'],
 TESSERATI:['●','Atleti & Famiglia','Profili e servizi autorizzati'],
 RICHIESTE:['☑','Richieste','Invii e stato pratiche'],
 PRESENZE:['✓','Presenze','Registro squadra autorizzato'],
 CONVOCAZIONI:['⚽','Convocazioni','Crea e gestisci le convocazioni'],
 ACCESSI:['♙','Utenti & Accessi','Inviti, ruoli e attivazione account'],
 METRICHE:['▥','Metriche Accessi','Adozione e utilizzo aggregato'],
 SICUREZZA:['⌁','Sicurezza account','PIN personale e sessione'],
 TORNEI_EVENTI:['★','Tornei & Eventi','Organizzazione e calendario'],
 BIGLIETTERIA:['◧','Biglietteria','Accessi e attività evento'],
 DRIVE_TORNEI:['□','Drive Tornei','Documenti evento autorizzati'],
 PARTNER_EVENTO:['◇','Partner Evento','Relazioni collegate agli eventi'],
 RICHIESTE:['☑','Richieste','Invii e stato pratiche'],
 PRESENZE:['✓','Presenze','Registro squadra autorizzato'],
 CONVOCAZIONI:['⚽','Convocazioni','Crea e gestisci convocazioni']
};
function deskMeta(module){return deskModuleMeta[module]||['•',String(module||'Modulo').replaceAll('_',' '),'Funzione autorizzata dal profilo']}
function bindPrivateDesk(){
 const form=$('#privateDeskLoginForm');
 if(form)form.onsubmit=async e=>{
   e.preventDefault();
   const email=String($('#privateDeskEmail')?.value||'').trim(),code=String($('#privateDeskCode')?.value||'').trim(),st=$('#privateDeskLoginState'),btn=$('button[type="submit"]',form);
   btn.disabled=true;if(st)st.textContent='Verifico account e permessi…';
   try{
     const out=await privatePost('auth.login',{email,pin:code,code},'');
     const token=String(out.token||out.sessionToken||out.accessToken||'');
     if(!token)throw new Error('Sessione non restituita dal gestionale');
     savePrivateSession(token,email);
     try{await privatePost('auth.access.log',{eventType:'LOGIN_SUCCESS',clientKind:window.matchMedia?.('(display-mode: standalone)')?.matches?'PWA':'WEB'},token)}catch{}
     try{state.identity=await privatePost('auth.identity.resolve',{},token)}catch{state.identity=null}
     await ensurePrivateDesk(true);
     if(out.mustChangePin===true||out.firstAccessRequired===true)toast('Primo accesso: imposta il tuo PIN personale in Sicurezza account');
     else toast('Private Desk attivato');
   }catch(err){if(st)st.textContent=String(err.message||err)}
   finally{btn.disabled=false}
 };
 $('#privateDeskRequestCode')?.addEventListener('click',async()=>{
   const email=String($('#privateDeskEmail')?.value||'').trim(),st=$('#privateDeskLoginState'),btn=$('#privateDeskRequestCode');
   if(!email){if(st)st.textContent='Inserisci prima la email.';return}
   btn.disabled=true;
   try{await privatePost('auth.request',{email},'');if(st)st.textContent='Se l’account è abilitato, il codice temporaneo è stato inviato.'}
   catch(err){if(st)st.textContent=String(err.message||err)}
   finally{btn.disabled=false}
 });
 $('#privateDeskLogout')?.addEventListener('click',()=>{clearPrivateSession();renderPrivateDesk();toast('Sessione privata chiusa')});
 $$('[data-private-module]').forEach(b=>b.onclick=()=>openPrivateModule(b.dataset.privateModule));
}
function renderPrivateDesk(){
 const queue=$('#actionQueue'),dock=$('#deskServiceDock'),status=$('#deskScopeStatus'),title=$('#deskHeroTitle'),copy=$('#deskHeroCopy');
 if(!queue||!dock)return;
 const saved=readPrivateSession(),w=state.workspace;
 if(!saved.token||!state.privateToken||!w){
   if(status)status.textContent='ACCESSO RICHIESTO';
   if(title)title.innerHTML='Il tuo lavoro.<br>Solo quello autorizzato.';
   if(copy)copy.textContent='Accedi con l’account SCD. Ruolo, moduli e dati vengono assegnati dalla Società.';
   queue.innerHTML='<form class="desk-auth-card" id="privateDeskLoginForm"><span class="eyebrow">ACCOUNT SCD</span><h3>Accedi al Private Desk</h3><p>Email societaria e PIN/codice temporaneo. Nessun ruolo viene scelto manualmente.</p><label>Email<input id="privateDeskEmail" type="email" autocomplete="email" required value="'+esc(saved.email||'')+'"></label><label>PIN / codice<input id="privateDeskCode" type="password" inputmode="numeric" autocomplete="current-password" required></label><div class="desk-auth-actions"><button class="btn primary" type="submit">Accedi</button><button class="btn glass" type="button" id="privateDeskRequestCode">Richiedi codice</button></div><small id="privateDeskLoginState">'+esc(state.privateError||'')+'</small></form>';
   dock.innerHTML='<div class="desk-service-empty"><b>Moduli protetti</b><span>Compaiono dopo autenticazione e verifica dello scope.</span></div>';
   bindPrivateDesk();return;
 }
 const moduleSet=new Set((w.defaultModules||[]).map(x=>String(x||'').trim().toUpperCase()).filter(Boolean)),u=state.privateData?.user||{},perm=state.privateData?.permissions||{},personal=Array.isArray(state.privateData?.personal)?state.privateData.personal:[];
 if(personal.length){moduleSet.add('TESSERATI');moduleSet.add('PULMINI')}
 moduleSet.add('RICHIESTE');moduleSet.add('SICUREZZA');
 if(u.staff||perm.direction||['STAFF','MISTER','MANAGER','SECRETARIAT','REGISTRATION','TOURNAMENTS','DIREZIONE','ADMIN'].includes(String(u.role||'').toUpperCase())){moduleSet.add('PRESENZE');moduleSet.add('CONVOCAZIONI');moduleSet.add('COMUNICAZIONI')}
 if(perm.direction||['DIREZIONE','ADMIN'].includes(String(u.role||'').toUpperCase())){moduleSet.add('ACCESSI');moduleSet.add('METRICHE')}
 const modules=[...moduleSet];
 if(status)status.textContent=(w.privateDeskProfile||'ROLE / SCOPE').replaceAll('_',' ');
 if(title)title.innerHTML=esc(w.name||'Private Desk')+'<br><em>'+esc(w.role||'Profilo SCD')+'</em>';
 if(copy)copy.textContent='Mostro soltanto moduli e dati assegnati al tuo account.';
 queue.innerHTML='<article class="desk-profile-live"><div><span class="eyebrow">PROFILO OPERATIVO</span><h3>'+esc(w.name||w.email||'Utente SCD')+'</h3><p>'+esc(w.role||'')+' · '+esc(w.privateDeskProfile||'ROLE/SCOPE')+'</p></div><button type="button" id="privateDeskLogout">Esci</button></article><article class="desk-scope-card"><b>Scope dati</b><span>'+esc((w.dataScope||[]).join(' · ')||'Scope dal gestionale')+'</span><b>Comunicazioni</b><span>'+esc((w.communicationScope||[]).join(' · ')||'Secondo ruolo')+'</span></article>';
 dock.innerHTML=modules.length?modules.map(module=>{const m=deskMeta(module);return '<button type="button" data-private-module="'+esc(module)+'"><span>'+m[0]+'</span><b>'+esc(m[1])+'</b><small>'+esc(m[2])+'</small></button>'}).join(''):'<div class="desk-service-empty"><b>Nessun modulo assegnato</b><span>Il profilo è autenticato ma non ha moduli attivi.</span></div>';
 bindPrivateDesk();
}
async function ensurePrivateDesk(force=false){
 const saved=readPrivateSession();
 if(!saved.token){renderPrivateDesk();return}
 if(state.privateLoading)return;
 if(!force&&state.privateToken===saved.token&&state.workspace){renderPrivateDesk();return}
 state.privateLoading=true;state.privateToken=String(saved.token||'');state.privateEmail=String(saved.email||'');state.privateError='';
 const queue=$('#actionQueue');if(queue)queue.innerHTML='<div class="desk-private-loading"><b>Carico il tuo spazio di lavoro…</b><span>Ruolo, scope e moduli arrivano dal gestionale.</span></div>';
 try{
   await privatePost('auth.validate',{token:state.privateToken},state.privateToken);
   state.privateData=await privatePost('dashboard.summary',{},state.privateToken);
   let workspace=null;try{workspace=await loadWorkspaceProfile()}catch(err){console.warn('[private-desk] workspace',err)}
   state.workspace=workspace||legacyWorkspace(state.privateData);renderPrivateDesk();
 }catch(err){
   const msg=String(err.message||err);clearPrivateSession();state.privateError=msg;renderPrivateDesk();
 }finally{state.privateLoading=false}
}
function privateProfileName(p={}){return [p.firstName,p.lastName].filter(Boolean).join(' ')||p.fullName||'Profilo SCD'}
function privateProfileKey(p={}){return String(p.code||p.playerCode||p.personId||p.id||'')}
function privateProfileConvocations(p={}){
 const key=privateProfileKey(p);
 if(!key)return [];
 return (state.privateData?.convocations||[]).filter(x=>String(x.playerCode||x.personId||x.playerId||'')===key).slice(0,6);
}
function privateTeams(){
 const d=state.privateData||{},raw=[...(d.attendance?.teams||[]),...(d.teams||[])],seen=new Set(),out=[];
 raw.forEach(x=>{const key=String(x.key||x.code||x.id||x.name||'').trim(),name=String(x.name||x.teamName||x.label||key).trim();if(key&&!seen.has(key)){seen.add(key);out.push({key,name})}});
 (d.personal||[]).forEach(p=>{const name=String(p.teamName||p.group||'').trim();if(name&&!seen.has(name)){seen.add(name);out.push({key:name,name})}});
 return out;
}
function privateStatusValue(p,...keys){for(const k of keys){const v=p?.[k];if(v!==undefined&&v!==null&&String(v).trim())return String(v)}return 'Dato in aggiornamento'}
function openPrivateProfileStatus(p={},mode='status'){
 const name=privateProfileName(p),figc=privateStatusValue(p,'figcStatus','recordStatus'),cert=privateStatusValue(p,'certificateStatus','certificateExpiry'),pay=privateStatusValue(p,'paymentStatus','payment','feeStatus'),identity=privateStatusValue(p,'identityStatus','idDocumentStatus');
 const rows=mode==='documents'
  ?[['CERTIFICATO MEDICO',cert],['DOCUMENTO IDENTITÀ',identity]]
  :mode==='payments'
    ?[['STATO AMMINISTRATIVO',pay]]
    :[['FIGC / TESSERAMENTO',figc],['CERTIFICATO MEDICO',cert],['QUOTA / PAGAMENTI',pay]];
 const note=mode==='documents'?'Nessun documento viene dichiarato presente se il gestionale non lo conferma.':mode==='payments'?'Importi, rate e scadenze compaiono solo quando restituiti dal gestionale. Non vengono ricostruiti lato app.':'Sono mostrati esclusivamente i valori restituiti dal profilo autorizzato.';
 const layer=openPanel(mode==='documents'?'Documenti':mode==='payments'?'Quote & pagamenti':'Stato profilo','<div class="panel-detail r54-private-panel"><span class="eyebrow">AREA RISERVATA · ROLE/SCOPE</span><h2>'+esc(name)+'</h2><div class="r54-live-status-list">'+rows.map(r=>'<article><span>'+esc(r[0])+'</span><b>'+esc(r[1])+'</b></article>').join('')+'</div><p>'+esc(note)+'</p>'+(mode==='documents'?'<button type="button" class="btn primary" id="r54PrivateHelp">Richiedi assistenza</button>':'')+'</div>');
 if(mode==='documents'){
   const b=$('#r54PrivateHelp',layer);if(b)b.onclick=()=>openPrivateRequestForm(p,'DOCUMENTO');
 }
}
function openPrivateRequestForm(profile=null,type='INFORMAZIONE'){
 const teams=privateTeams(),name=profile?privateProfileName(profile):'',team=String(profile?.teamName||profile?.group||'');
 const layer=openPanel('Nuova richiesta','<form class="join-form r54-private-form" id="r54PrivateRequestForm"><span class="eyebrow">AREA PERSONALE</span><h2>Richiesta al Club</h2><div class="form-grid"><label>Tipo<select name="type"><option '+(type==='DOCUMENTO'?'selected':'')+'>DOCUMENTO</option><option '+(type==='TESSERAMENTO'?'selected':'')+'>TESSERAMENTO</option><option>AMMINISTRAZIONE</option><option>SPORTIVO</option><option>INFORMAZIONE</option><option>ALTRO</option></select></label><label>Squadra / area<select name="team"><option value="">Generale</option>'+teams.map(t=>'<option value="'+esc(t.key)+'" '+(team===t.key||team===t.name?'selected':'')+'>'+esc(t.name)+'</option>').join('')+'</select></label><label class="full">Oggetto<input name="subject" required maxlength="140" value="'+esc(name?('Richiesta · '+name):'')+'"></label><label class="full">Messaggio<textarea name="message" required maxlength="1200"></textarea></label></div><button class="btn primary" type="submit">Invia richiesta</button><p id="r54PrivateRequestState"></p></form>');
 const form=$('#r54PrivateRequestForm',layer);
 form.onsubmit=async e=>{
   e.preventDefault();const fd=new FormData(form),st=$('#r54PrivateRequestState',form),btn=$('button[type="submit"]',form);btn.disabled=true;st.textContent='Invio…';
   try{
     const out=await privatePost('private.request.submit',{type:String(fd.get('type')||''),subject:String(fd.get('subject')||''),message:String(fd.get('message')||''),team:String(fd.get('team')||''),personId:privateProfileKey(profile)});
     st.textContent='Richiesta registrata'+(out?.id||out?.requestId?' · '+String(out.id||out.requestId):'')+'.';toast('Richiesta registrata');
   }catch(err){st.textContent=String(err.message||err);btn.disabled=false}
 };
}
async function openPrivateRequests(){
 const layer=openPanel('Le mie richieste','<div class="panel-detail r54-private-panel"><span class="eyebrow">AREA PERSONALE</span><h2>Richieste e pratiche</h2><div id="r54PrivateRequests" class="desk-private-loading"><b>Carico lo stato…</b></div><button type="button" class="btn primary" id="r54NewPrivateRequest">Nuova richiesta</button></div>');
 const mount=$('#r54PrivateRequests',layer);
 try{
   const data=await privatePost('account.requests',{}),rows=Array.isArray(data)?data:(data.rows||data.items||[]);
   mount.innerHTML=rows.length?'<div class="r54-request-list">'+rows.slice(0,30).map(x=>'<article><div><b>'+esc(x.subject||x.topic||x.type||'Richiesta SCD')+'</b><small>'+esc(x.createdAt||x.created_at||x.date||'')+'</small></div><span>'+esc(x.status||x.state||'IN AGGIORNAMENTO')+'</span></article>').join('')+'</div>':'<div class="desk-service-empty"><b>Nessuna richiesta restituita</b><span>Il gestionale non ha pratiche visibili per questo account.</span></div>';
 }catch(err){mount.innerHTML='<div class="desk-service-empty"><b>Dato in aggiornamento</b><span>'+esc(String(err.message||err))+'</span></div>'}
 const add=$('#r54NewPrivateRequest',layer);if(add)add.onclick=()=>openPrivateRequestForm();
}
function openPrivateTransport(profile=null){
 const teams=privateTeams(),team=String(profile?.teamName||profile?.group||''),today=todayKey();
 const layer=openPanel('Pulmino & Trasporti','<form class="join-form r54-private-form" id="r54TransportForm"><span class="eyebrow">LOGISTICA SCD · ROLE/SCOPE</span><h2>Nuova richiesta trasporto</h2><div class="form-grid"><label>Data<input name="date" type="date" value="'+today+'" required></label><label>Ora<input name="time" type="time" required></label><label>Partenza<input name="origin" required maxlength="120"></label><label>Destinazione<input name="destination" required maxlength="120"></label><label>Squadra<select name="team"><option value="">Generale</option>'+teams.map(t=>'<option value="'+esc(t.key)+'" '+(team===t.key||team===t.name?'selected':'')+'>'+esc(t.name)+'</option>').join('')+'</select></label><label>Persone<input name="passengers" type="number" min="1" max="60" value="1"></label><label class="full">Note<textarea name="notes" maxlength="800"></textarea></label></div><button class="btn primary" type="submit">Invia richiesta</button><p id="r54TransportState"></p></form>');
 const form=$('#r54TransportForm',layer);
 form.onsubmit=async e=>{
   e.preventDefault();const fd=new FormData(form),st=$('#r54TransportState',form),btn=$('button[type="submit"]',form);btn.disabled=true;st.textContent='Invio…';
   try{
     await privatePost('private.transport.request',{date:String(fd.get('date')||''),time:String(fd.get('time')||''),origin:String(fd.get('origin')||''),destination:String(fd.get('destination')||''),team:String(fd.get('team')||''),type:'TRASFERTA',passengers:Number(fd.get('passengers')||1),notes:String(fd.get('notes')||''),personId:privateProfileKey(profile)});
     st.textContent='Richiesta trasporto registrata.';toast('Richiesta trasporto registrata');
   }catch(err){st.textContent=String(err.message||err);btn.disabled=false}
 };
}
function openPrivatePeopleHub(initial=0){
 const people=Array.isArray(state.privateData?.personal)?state.privateData.personal:[];
 if(!people.length){openPanel('Atleti & Famiglia','<div class="panel-detail"><h2>Dato in aggiornamento</h2><p>Nessun profilo autorizzato è stato restituito per questo account.</p></div>');return}
 const layer=openPanel(people.length>1?'Area Famiglia':'Area Atleta','<div id="r54PeopleHub"></div>');
 const mount=$('#r54PeopleHub',layer);
 const render=index=>{
   const p=people[Math.max(0,Math.min(Number(index)||0,people.length-1))],name=privateProfileName(p),conv=privateProfileConvocations(p),active=conv[0]||null,figc=privateStatusValue(p,'figcStatus','recordStatus'),cert=privateStatusValue(p,'certificateStatus','certificateExpiry'),pay=privateStatusValue(p,'paymentStatus','payment','feeStatus');
   mount.innerHTML='<section class="r54-people-hub"><div class="r54-profile-tabs">'+people.map((x,i)=>'<button type="button" data-r54-person="'+i+'" class="'+(i===index?'active':'')+'"><span>'+esc((x.firstName||privateProfileName(x)).slice(0,1).toUpperCase())+'</span><b>'+esc(privateProfileName(x).split(' ')[0])+'</b><small>'+esc(x.teamName||x.group||'')+'</small></button>').join('')+'</div><div class="r54-profile-hero"><div><small>PROFILO AUTORIZZATO</small><h2>'+esc(name)+'</h2><p>'+esc(p.teamName||p.group||'Squadra in aggiornamento')+'</p></div><span>'+esc(figc)+'</span></div>'+(active?'<div class="r54-live-callup"><div><small>CONVOCAZIONE</small><b>'+esc(active.team||active.teamName||'Gara SCD')+'</b><p>'+esc([fmtDate(active.date||''),active.meetingTime,active.meetingPlace].filter(Boolean).join(' · '))+'</p><em>'+esc(active.response||'DA CONFERMARE')+'</em></div><div><button type="button" class="btn primary" data-r54-callup="PRESENTE" data-conv="'+esc(active.id||active.convocationId||'')+'" data-player="'+esc(active.playerCode||privateProfileKey(p))+'">Conferma presenza</button><button type="button" class="btn glass" data-r54-callup="ASSENTE" data-conv="'+esc(active.id||active.convocationId||'')+'" data-player="'+esc(active.playerCode||privateProfileKey(p))+'">Segnala assenza</button></div></div>':'<div class="r54-live-callup empty"><div><small>CONVOCAZIONI</small><b>Dato in aggiornamento</b><p>Nessuna convocazione autorizzata disponibile.</p></div></div>')+'<div class="r54-profile-kpis"><article><small>FIGC</small><b>'+esc(figc)+'</b></article><article><small>CERTIFICATO</small><b>'+esc(cert)+'</b></article><article><small>PAGAMENTI</small><b>'+esc(pay)+'</b></article></div><div class="r54-profile-actions"><button type="button" data-r54-action="documents">▣<b>Documenti</b></button><button type="button" data-r54-action="payments">▰<b>Quote</b></button><button type="button" data-r54-action="calendar">▦<b>Calendario</b></button><button type="button" data-r54-action="transport">⌁<b>Pulmino</b></button><button type="button" data-r54-action="requests">☑<b>Richieste</b></button><button type="button" data-r54-action="status">✓<b>Stato</b></button></div></section>';
   $$('[data-r54-person]',mount).forEach(b=>b.onclick=()=>render(Number(b.dataset.r54Person)));
   $$('[data-r54-action]',mount).forEach(b=>b.onclick=()=>{const a=b.dataset.r54Action;if(a==='documents')return openPrivateProfileStatus(p,'documents');if(a==='payments')return openPrivateProfileStatus(p,'payments');if(a==='calendar'){layer.classList.remove('open');setView('calendar');return}if(a==='transport')return openPrivateTransport(p);if(a==='requests')return openPrivateRequests();if(a==='status')return openPrivateProfileStatus(p,'status')});
   $$('[data-r54-callup]',mount).forEach(b=>b.onclick=async()=>{if(!b.dataset.conv||!b.dataset.player)return toast('Convocazione incompleta: sincronizza i dati');b.disabled=true;try{await privatePost('private.convocation.reply',{id:b.dataset.conv,player:b.dataset.player,response:b.dataset.r54Callup});state.privateData=await privatePost('dashboard.summary',{});toast('Risposta registrata');render(index)}catch(err){toast(String(err.message||err));b.disabled=false}});
 };
 render(initial);
}
function openPrivateAttendance(){
 const teams=privateTeams(),today=todayKey();
 if(!teams.length){openPanel('Presenze','<div class="panel-detail"><h2>Dato in aggiornamento</h2><p>Nessuna squadra autorizzata restituita dal gestionale.</p></div>');return}
 const layer=openPanel('Registro presenze','<div class="panel-detail r54-private-panel"><span class="eyebrow">STAFF · ROLE/SCOPE</span><h2>Registro squadra</h2><div class="form-grid"><label>Squadra<select id="r54AttTeam">'+teams.map(t=>'<option value="'+esc(t.key)+'">'+esc(t.name)+'</option>').join('')+'</select></label><label>Data<input id="r54AttDate" type="date" value="'+today+'"></label></div><button class="btn primary" id="r54AttLoad">Carica rosa</button><div id="r54AttRows"></div></div>');
 $('#r54AttLoad',layer).onclick=async()=>{
   const mount=$('#r54AttRows',layer);mount.innerHTML='<div class="desk-private-loading"><b>Carico registro…</b></div>';
   try{
     const data=await privatePost('private.attendance.get',{teamKey:$('#r54AttTeam',layer).value,date:$('#r54AttDate',layer).value}),statuses=data.statuses||['PRESENTE','ASSENTE','GIUSTIFICATO','INFORTUNATO','RITARDO'],players=data.players||[];
     mount.innerHTML=players.length?'<div class="r54-attendance-list">'+players.map(p=>'<label><span><b>'+esc(p.name||p.fullName||p.code||'Atleta')+'</b><small>'+esc(p.code||'')+'</small></span><select data-r54-att="'+esc(p.code||p.personId||'')+'">'+[''].concat(statuses).map(s=>'<option value="'+esc(s)+'" '+(s===p.status?'selected':'')+'>'+esc(s||'SELEZIONA')+'</option>').join('')+'</select></label>').join('')+'</div><button class="btn primary" id="r54AttSave">Salva presenze</button>':'<div class="desk-service-empty"><b>Rosa non disponibile</b><span>Il gestionale non ha restituito atleti per questa squadra.</span></div>';
     const save=$('#r54AttSave',layer);if(save)save.onclick=async()=>{const rows=$$('[data-r54-att]',layer).filter(x=>x.value).map(x=>({personId:x.dataset.r54Att,status:x.value}));if(!rows.length)return toast('Seleziona almeno una presenza');try{await privatePost('private.attendance.save',{teamKey:$('#r54AttTeam',layer).value,date:$('#r54AttDate',layer).value,eventType:'ALLENAMENTO',rows});toast('Presenze salvate: '+rows.length)}catch(err){toast(String(err.message||err))}};
   }catch(err){mount.innerHTML='<div class="desk-service-empty"><b>Registro non disponibile</b><span>'+esc(String(err.message||err))+'</span></div>'}
 };
}
function openPrivateConvocations(){
 const d=state.privateData||{},teams=privateTeams(),today=todayKey();
 if(!teams.length){openPanel('Convocazioni','<div class="panel-detail"><h2>Dato in aggiornamento</h2><p>Nessuna squadra autorizzata restituita.</p></div>');return}
 const layer=openPanel('Convocazioni','<form class="join-form r54-private-form" id="r54ConvForm"><span class="eyebrow">STAFF · ROLE/SCOPE</span><h2>Nuova convocazione</h2><div class="form-grid"><label>Squadra<select id="r54ConvTeam">'+teams.map(t=>'<option value="'+esc(t.key)+'">'+esc(t.name)+'</option>').join('')+'</select></label><label>Data gara<input id="r54ConvDate" type="date" value="'+today+'" required></label><label>Ritrovo<input id="r54ConvTime" type="time" required></label><label>Luogo<input id="r54ConvPlace" required maxlength="160"></label><label class="full">Note<textarea id="r54ConvNotes" maxlength="800"></textarea></label></div><div id="r54ConvPlayers"></div><button class="btn primary" type="submit">Crea convocazione</button><p id="r54ConvState"></p></form>');
 const renderPlayers=()=>{const key=$('#r54ConvTeam',layer).value,roster=(d.roster&&d.roster[key])||[];$('#r54ConvPlayers',layer).innerHTML=roster.length?'<div class="r54-player-checks">'+roster.map(p=>'<label><input type="checkbox" data-r54-conv-player value="'+esc(p.code||p.personId||'')+'"> '+esc(p.name||privateProfileName(p))+'</label>').join('')+'</div>':'<div class="desk-service-empty"><b>Rosa in aggiornamento</b><span>La convocazione non inventa atleti mancanti.</span></div>'};
 $('#r54ConvTeam',layer).onchange=renderPlayers;renderPlayers();
 $('#r54ConvForm',layer).onsubmit=async e=>{e.preventDefault();const players=$$('[data-r54-conv-player]:checked',layer).map(x=>x.value).filter(Boolean),st=$('#r54ConvState',layer);try{await privatePost('private.convocation.create',{teamKey:$('#r54ConvTeam',layer).value,gameDate:$('#r54ConvDate',layer).value,meetingTime:$('#r54ConvTime',layer).value,meetingPlace:$('#r54ConvPlace',layer).value,players,notes:$('#r54ConvNotes',layer).value,notify:true});st.textContent='Convocazione registrata.';toast('Convocazione creata')}catch(err){st.textContent=String(err.message||err)}};
}
function openPrivateTeamMessage(){
 const teams=privateTeams();
 if(!teams.length){openPanel('Comunicazioni','<div class="panel-detail"><h2>Dato in aggiornamento</h2><p>Nessuna squadra autorizzata restituita.</p></div>');return}
 const layer=openPanel('Comunicazione squadra','<form class="join-form r54-private-form" id="r54MessageForm"><span class="eyebrow">STAFF · COMUNICAZIONE</span><h2>Nuovo messaggio</h2><label>Squadra<select id="r54MsgTeam">'+teams.map(t=>'<option value="'+esc(t.key)+'">'+esc(t.name)+'</option>').join('')+'</select></label><label>Oggetto<input id="r54MsgSubject" required maxlength="140"></label><label>Messaggio<textarea id="r54MsgBody" required maxlength="2000"></textarea></label><button class="btn primary" type="submit">Invia</button><p id="r54MsgState"></p></form>');
 $('#r54MessageForm',layer).onsubmit=async e=>{e.preventDefault();const st=$('#r54MsgState',layer);try{await privatePost('private.message.send',{teamKey:$('#r54MsgTeam',layer).value,subject:$('#r54MsgSubject',layer).value,message:$('#r54MsgBody',layer).value});st.textContent='Messaggio registrato.';toast('Messaggio registrato')}catch(err){st.textContent=String(err.message||err)}};
}

function openPrivateSecurity(){
 const layer=openPanel('Sicurezza account','<form class="join-form r54-private-form" id="r56PinForm"><span class="eyebrow">ACCOUNT SCD</span><h2>Imposta il tuo PIN personale</h2><p>Se sei entrato con un codice temporaneo, sostituiscilo con un PIN personale. Non viene mai mostrato o inviato dalla Societa dopo la modifica.</p><label>Codice / PIN attuale<input id="r56OldPin" type="password" inputmode="numeric" autocomplete="current-password" required></label><label>Nuovo PIN<input id="r56NewPin" type="password" inputmode="numeric" autocomplete="new-password" minlength="6" required></label><label>Ripeti nuovo PIN<input id="r56NewPin2" type="password" inputmode="numeric" autocomplete="new-password" minlength="6" required></label><button class="btn primary" type="submit">Aggiorna PIN</button><p id="r56PinState"></p></form>');
 const form=$('#r56PinForm',layer);
 form.onsubmit=async e=>{
   e.preventDefault();const oldPin=$('#r56OldPin',form).value,newPin=$('#r56NewPin',form).value,newPin2=$('#r56NewPin2',form).value,st=$('#r56PinState',form),btn=$('button[type="submit"]',form);
   if(newPin!==newPin2){st.textContent='I nuovi PIN non coincidono.';return}
   if(newPin.length<6){st.textContent='Usa almeno 6 cifre.';return}
   btn.disabled=true;st.textContent='Aggiornamento…';
   try{await privatePost('auth.pin.change',{oldPin,newPin});st.textContent='PIN personale aggiornato.';toast('PIN aggiornato')}
   catch(err){st.textContent=String(err.message||err);btn.disabled=false}
 };
}
async function openPrivateAccessMetrics(){
 const d=state.privateData||{},u=d.user||{},perm=d.permissions||{},isDirection=perm.direction===true||['DIREZIONE','ADMIN'].includes(String(u.role||'').toUpperCase());
 if(!isDirection){openPanel('Metriche Accessi','<div class="panel-detail"><h2>Accesso non autorizzato</h2><p>Le metriche aggregate sono riservate alla Direzione.</p></div>');return}
 const layer=openPanel('Metriche Accessi','<div class="panel-detail r54-private-panel"><span class="eyebrow">DIREZIONE · ANALYTICS PRIVACY-FIRST</span><h2>Utilizzo della Super App</h2><p>Conteggi aggregati. Nessun PIN, documento, messaggio, dato sanitario o posizione grezza entra in questa vista.</p><div id="r56AccessMetrics" class="desk-private-loading"><b>Carico gli ultimi 30 giorni…</b></div></div>');
 const mount=$('#r56AccessMetrics',layer);
 try{
   const out=await privatePost('direction.access.metrics',{days:30});
   const rows=Array.isArray(out.daily)?out.daily:[];
   const max=Math.max(1,...rows.map(x=>Number(x.activeUsers||0)));
   mount.innerHTML='<div class="r56-metric-kpis"><article><small>UTENTI ATTIVI</small><b>'+esc(String(out.activeUsers||0))+'</b><span>ultimi '+esc(String(out.days||30))+' giorni</span></article><article><small>LOGIN</small><b>'+esc(String(out.loginEvents||0))+'</b><span>accessi autenticati</span></article><article><small>PRIVATE DESK</small><b>'+esc(String(out.privateDeskOpens||0))+'</b><span>aperture operative</span></article></div>'+(rows.length?'<div class="r56-access-trend">'+rows.slice(-30).map(x=>'<article><small>'+esc(x.date||'')+'</small><div><span style="width:'+Math.max(3,Math.round(Number(x.activeUsers||0)/max*100))+'%"></span></div><b>'+esc(String(x.activeUsers||0))+'</b></article>').join('')+'</div>':'<div class="desk-service-empty"><b>Nessun accesso registrato</b><span>Le metriche compariranno dopo i primi accessi autenticati.</span></div>');
 }catch(err){mount.innerHTML='<div class="desk-service-empty"><b>Metriche in aggiornamento</b><span>'+esc(String(err.message||err))+'</span></div>'}
}

function openPrivateAccessManager(){
 const d=state.privateData||{},u=d.user||{},perm=d.permissions||{},isDirection=perm.direction===true||['DIREZIONE','ADMIN'].includes(String(u.role||'').toUpperCase());
 if(!isDirection){openPanel('Utenti & Accessi','<div class="panel-detail"><h2>Accesso non autorizzato</h2><p>La gestione account e ruoli e riservata alla Direzione.</p></div>');return}
 const roles=['USER_BASE','FAMILY','ATHLETE','MISTER','STAFF','MANAGER','SECRETARIAT','REGISTRATION','TOURNAMENTS'];
 const layer=openPanel('Utenti & Accessi','<form class="join-form r54-private-form" id="r56InviteForm"><span class="eyebrow">DIREZIONE · ACCESSI</span><h2>Invita una persona</h2><p>Il sistema invia un codice temporaneo monouso. Nessuna password permanente viene spedita via email.</p><div class="form-grid"><label>Email<input id="r56InviteEmail" type="email" required autocomplete="email"></label><label>Ruolo<select id="r56InviteRole">'+roles.map(r=>'<option>'+r+'</option>').join('')+'</select></label><label>Telefono facoltativo<input id="r56InvitePhone" inputmode="tel"></label><label>Data di nascita facoltativa<input id="r56InviteBirth" type="date"></label><label class="full">Scope / note operative<textarea id="r56InviteScope" maxlength="500" placeholder="Es. squadra U16, solo calendario, famiglia atleta..."></textarea></label></div><button class="btn primary" type="submit">Invia accesso</button><p id="r56InviteState"></p></form>');
 const form=$('#r56InviteForm',layer);
 form.onsubmit=async e=>{
   e.preventDefault();const st=$('#r56InviteState',form),btn=$('button[type="submit"]',form);btn.disabled=true;st.textContent='Verifico anagrafica e preparo invito…';
   try{
     const out=await privatePost('direction.access.invite',{email:$('#r56InviteEmail',form).value,role:$('#r56InviteRole',form).value,phone:$('#r56InvitePhone',form).value,birthDate:$('#r56InviteBirth',form).value,scope:{note:$('#r56InviteScope',form).value}});
     const label=out?.identity?.matched?'Profilo esistente riconosciuto. ':'';
     st.textContent=label+'Codice temporaneo inviato a '+String(out.email||'')+'. Al primo accesso deve impostare il PIN personale.';
     btn.textContent='INVITO INVIATO';toast('Accesso inviato');
   }catch(err){st.textContent=String(err.message||err);btn.disabled=false}
 };
}
function openPrivateModule(module){
 const w=state.workspace||{},d=state.privateData||{},m=deskMeta(module);
 if(['CALENDARIO','EVENTI','TORNEI_EVENTI','BIGLIETTERIA'].includes(module)){setView('calendar');return}
 if(['CRM','CONTRATTI','REPORT','APPROVAZIONI'].includes(module)){
   const layer=openPanel(m[1],'<div class="panel-detail private-module-panel"><span class="eyebrow">AREA COMMERCIALE RISERVATA</span><h2>'+esc(m[1])+'</h2><p>Questa funzione prosegue nella Sponsor Platform protetta.</p><button class="btn primary" id="deskOpenSponsorPortal">Apri Sponsor Platform</button></div>');
   $('#deskOpenSponsorPortal',layer).onclick=()=>{location.href='/sponsor/?login=1'};return;
 }
 if(module==='DOCUMENTI'){
   const admin=(w.areas||[]).some(x=>x.canAdmin===true)||String(w.privateDeskProfile||'').toUpperCase()==='EXECUTIVE_FULL'||state.privateData?.permissions?.direction===true;
   const layer=openPanel('Documenti','<div class="panel-detail private-module-panel"><span class="eyebrow">DOCUMENTI · ROLE/SCOPE</span><h2>'+esc(w.role||'Profilo SCD')+'</h2><p>'+esc(admin?'Accesso agli strumenti amministrativi documentali autorizzato.':'Sono mostrati soltanto gli stati documentali del perimetro assegnato.')+'</p>'+(admin?'<button class="btn primary" id="deskOpenIntakeAdmin">Apri Intake Admin</button>':'<button class="btn primary" id="deskOpenMyProfiles">Apri profili autorizzati</button>')+'</div>');
   if(admin)$('#deskOpenIntakeAdmin',layer).onclick=()=>{location.href='./intake/admin.html'};
   else $('#deskOpenMyProfiles',layer).onclick=()=>openPrivatePeopleHub();
   return;
 }
 if(module==='COMUNICAZIONI'){
   const canSend=Boolean(d.user?.staff||d.permissions?.direction);
   if(canSend){openPrivateTeamMessage();return}
   openPanel('Comunicazioni','<div class="panel-detail private-module-panel"><span class="eyebrow">FIRMA E PERIMETRO</span><h2>'+esc(w.role||'Profilo SCD')+'</h2><p>'+esc((w.communicationScope||[]).join(' · ')||'Perimetro definito dal ruolo')+'</p><small>Invii esterni soggetti a firma, policy e autorizzazioni.</small></div>');return
 }
 if(module==='TESSERATI'){openPrivatePeopleHub();return}
 if(module==='PULMINI'){openPrivateTransport((Array.isArray(d.personal)&&d.personal[0])||null);return}
 if(module==='RICHIESTE'){openPrivateRequests();return}
 if(module==='PRESENZE'){openPrivateAttendance();return}
 if(module==='CONVOCAZIONI'){openPrivateConvocations();return}
 if(module==='ACCESSI'){openPrivateAccessManager();return}
 if(module==='METRICHE'){openPrivateAccessMetrics();return}
 if(module==='SICUREZZA'){openPrivateSecurity();return}
 openPanel(m[1],'<div class="panel-detail private-module-panel"><span class="eyebrow">PRIVATE DESK</span><h2>'+esc(m[1])+'</h2><p>'+esc(m[2])+'. Modulo assegnato dal profilo '+esc(w.privateDeskProfile||'ROLE/SCOPE')+'.</p></div>');
}

async function postAction(action,payload){
 const r=await fetch(API_BASE+'/api/scd',{method:'POST',headers:{'content-type':'application/json','x-scd-client':'public-home'},body:JSON.stringify({action,payload,sessionToken:''})});
 const j=await r.json().catch(()=>({ok:false,error:'Risposta non valida'}));
 if(!r.ok||j.ok===false)throw new Error(j.error||'Richiesta non disponibile');
 return j.data||j;
}
function joinLabel(kind){return ({FAN:'Diventa tifoso',ATHLETE_REQUEST:'Tesserato / Atleta',FAMILY:'Famiglia',STAFF_REQUEST:'Staff / Collaboratore',PARTNER:'Sponsor / Partner',OTHER_AUTHORIZED:'Altro profilo'})[kind]||'Entra nel Club'}
function joinAction(kind){if(kind==='FAN')return 'public.register';if(kind==='PARTNER')return 'public.partnerLead';if(kind==='ATHLETE_REQUEST'||kind==='FAMILY')return 'public.registration';return 'public.communitySubmit'}
function openJoin(kind){
 const label=joinLabel(kind),action=joinAction(kind);
 const extra=(kind==='ATHLETE_REQUEST'||kind==='FAMILY')?'<p class="join-legal-note">Il tesseramento e l’eventuale qualifica di socio restano distinti. L’accesso alle aree riservate viene autorizzato dalla Società.</p>':'<p class="join-legal-note">La registrazione base non assegna automaticamente ruoli riservati. Le autorizzazioni sono gestite dalla Direzione.</p>';
 const layer=openPanel(label,'<form class="join-form" id="joinRequestForm"><div class="form-grid"><label>Nome<input name="firstName" required maxlength="80"></label><label>Cognome<input name="lastName" required maxlength="80"></label><label>Email<input name="email" type="email" required></label><label>Telefono<input name="phone" required></label></div>'+extra+'<label class="privacy-check"><input name="privacy" type="checkbox" required> Ho letto l’informativa privacy e autorizzo il trattamento necessario alla richiesta.</label><button class="btn primary" type="submit">Continua</button><p id="joinFormState"></p></form>');
 const form=$('#joinRequestForm',layer);
 form.onsubmit=async e=>{
   e.preventDefault();const fd=new FormData(form),firstName=String(fd.get('firstName')||'').trim(),lastName=String(fd.get('lastName')||'').trim(),email=String(fd.get('email')||'').trim(),phone=String(fd.get('phone')||'').trim();
   const btn=$('button[type="submit"]',form),st=$('#joinFormState',form);btn.disabled=true;st.textContent='Invio in corso…';
   try{
     try{await postAction('public.identity.resolve',{email,phone})}catch{}
     const payload={firstName,lastName,name:[firstName,lastName].filter(Boolean).join(' '),email,phone,privacy:true,topic:'SCD Super App · '+label,category:kind,message:'Richiesta percorso '+label+' dalla home pubblica.'};
     const out=await postAction(action,payload);
     st.textContent='Percorso avviato'+(out.requestId?' · '+out.requestId:'')+'. Se l’email è già collegata a un account SCD riceverai il codice di accesso; altrimenti la richiesta passa alla verifica della Società.';
     btn.textContent='CONTROLLA EMAIL';toast('Percorso SCD avviato');
   }catch(err){st.textContent=String(err.message||err);btn.disabled=false}
 };
}
$$('[data-join]').forEach(b=>b.addEventListener('click',()=>openJoin(b.dataset.join)));

async function hydrate(){
  try{
    const r=await fetch(API_BASE+'/api/newsroom',{cache:'no-store'});
    if(!r.ok)throw new Error('newsroom unavailable');
    const data=await r.json();state.news=data;
    const rows=Array.isArray(data.calendar?.rows)?data.calendar.rows:[];
    state.events=rows.map(x=>({...x,group:/torneo|event/i.test(x.kind||'')?'EVENTI':/201[5-9]|2020|pulcin|primi calci|base/i.test((x.team||'')+' '+(x.category||''))?'BASE':'AGONISTICA'}));
    state.upcoming=Array.isArray(data.upcomingEvents)?data.upcomingEvents:[];
    state.sportData=data.sportData||{results:[],standings:[],headToHead:[]};
    state.partners=Array.isArray(data.partners)?data.partners:[];
    state.publicProfiles=Array.isArray(data.publicProfiles)?data.publicProfiles:[];
    const today=todayKey();
    state.nextMatch=[...state.upcoming,...state.events].filter(x=>x.kind==='MATCH'&&x.date>=today).sort((a,b)=>(a.date+(a.time||'')).localeCompare(b.date+(b.time||'')))[0]||null;
    const weekCount=$('#weekCount'),todayCount=$('#todayCount'),nextMatch=$('#nextMatch');
    if(weekCount)weekCount.textContent=String(rows.length);
    if(todayCount)todayCount.textContent=String(rows.filter(x=>x.date===today).length);
    if(nextMatch)nextMatch.textContent=state.nextMatch?[state.nextMatch.team,state.nextMatch.opponent,state.nextMatch.date,state.nextMatch.time].filter(Boolean).join(' · '):'Dato in aggiornamento';
    const todayEv=rows.filter(x=>x.date===today);
    if($('#todayHeadline'))$('#todayHeadline').textContent=todayEv.length?todayEv.length+' attività verificate':'Dato in aggiornamento';
    if($('#todayDetail'))$('#todayDetail').textContent=todayEv.length?todayEv.slice(0,3).map(x=>[x.team,x.time,x.title].filter(Boolean).join(' · ')).join('  |  '):'Nessuna attività verificata disponibile nella fonte collegata.';
    const card=Array.isArray(data.cards)?data.cards.find(c=>c.evidence?.length):null;
    if(card){if($('#storyTitle'))$('#storyTitle').textContent=card.title||'SCD Newsroom';if($('#storyText'))$('#storyText').textContent=card.dek||card.body||'Contenuto verificato'}
    state.fullCalendar=mergeCalendarRows(state.fullCalendar,state.events,state.upcoming);renderWeek();renderWeekMeta(data);renderMatchCenter();renderUpcoming();renderPartners();renderMentions();renderMyTeamDeck();renderSocialHub();if(state.view==='calendar')renderPublicCalendar();if(state.view==='teams')renderPublicTeams();
  }catch(e){
    if($('#weekCount'))$('#weekCount').textContent='—';if($('#todayCount'))$('#todayCount').textContent='—';
    state.fullCalendar=mergeCalendarRows(state.fullCalendar,state.events,state.upcoming);renderWeek();renderMatchCenter();renderUpcoming();renderPartners();renderMentions();renderSocialHub();if(state.view==='calendar')renderPublicCalendar();if(state.view==='teams')renderPublicTeams();
  }
}
r56BindAnalyticsConsent();loadClubContent();hydrate();$('#refreshData')?.addEventListener('click',()=>{loadClubContent();hydrate();toast('Aggiornamento richiesto')});
$('#socialRefresh')?.addEventListener('click',async()=>{await Promise.all([loadClubContent(),hydrate()]);renderSocialHub();toast('Feed social aggiornato')});
$('#installApp')?.addEventListener('click',async()=>{
 if(!deferredInstallPrompt){toast('Installazione disponibile dal menu del browser quando supportata');return}
 deferredInstallPrompt.prompt();
 await deferredInstallPrompt.userChoice.catch(()=>null);
 deferredInstallPrompt=null;
 const button=$('#installApp');if(button)button.hidden=true;
});

$('#socialSearch')?.addEventListener('input',e=>{state.socialSearch=String(e.target.value||'');renderSocialHub()});
$('#socialFilters')?.addEventListener('click',e=>{
 const b=e.target.closest('[data-social-filter]');if(!b)return;
 state.socialFilter=b.dataset.socialFilter||'ALL';
 $$('#socialFilters [data-social-filter]').forEach(x=>x.classList.toggle('active',x===b));
 renderSocialHub();
});


const avatarCatalog=[
 {id:'field',label:'Campo',terms:'calciatore campo blu',role:'Calciatore',kit:'blue',tone:'t2',hair:'h1'},
 {id:'keeper',label:'Portiere',terms:'portiere goalkeeper giallo',role:'Portiere',kit:'gold',tone:'t2',hair:'h2'},
 {id:'lake',label:'Lago',terms:'lago territorio alto lario',role:'Tifoso',kit:'lake',tone:'t3',hair:'h3'},
 {id:'night',label:'Night Match',terms:'sera night match',role:'Calciatore',kit:'night',tone:'t4',hair:'h4'},
 {id:'coach',label:'Mister',terms:'mister tecnico allenatore',role:'Mister',kit:'blue',tone:'t1',hair:'h1'}
];
function renderAvatarCatalog(q=''){
 const mount=$('#avatarCatalog');if(!mount)return;
 const term=norm(q);
 const rows=avatarCatalog.filter(x=>!term||norm(x.label+' '+x.terms).includes(term));
 mount.innerHTML=rows.map(x=>'<button type="button" data-avatar-preset="'+x.id+'"><span>◉</span><b>'+esc(x.label)+'</b></button>').join('')||'<small>Nessuno stile trovato.</small>';
 $$('[data-avatar-preset]',mount).forEach(b=>b.onclick=()=>applyAvatarPreset(b.dataset.avatarPreset));
}
function applyAvatarPreset(id){
 const p=avatarCatalog.find(x=>x.id===id);if(!p)return;
 const t=loadTwin();Object.assign(t,{role:p.role,kit:p.kit,tone:p.tone,hair:p.hair});localStorage.setItem(twinKey,JSON.stringify(t));applyTwin(t);toast('Stile avatar applicato');
}
$('#avatarSearch')?.addEventListener('input',e=>renderAvatarCatalog(e.target.value));
$('#skipAvatar')?.addEventListener('click',()=>{setView('pulse');toast('Avatar saltato. Puoi tornare quando vuoi.')});

const twinKey='scd:twin:v1';
function loadTwin(){try{return JSON.parse(localStorage.getItem(twinKey)||'{}')}catch{return {}}}
function applyTwin(t=loadTwin()){
  const name=t.name||'Il mio Twin',num=t.number||10,xp=Number(t.xp||0);
  if($('#twinName'))$('#twinName').textContent=name;
  if($('#twinXp'))$('#twinXp').textContent=xp+' XP';
  if($('#avatarNumber'))$('#avatarNumber').textContent=num;
  if($('#miniInitials'))$('#miniInitials').textContent=(name==='Il mio Twin'?'SCD':name.slice(0,2)).toUpperCase();
  if($('#twinNameInput'))$('#twinNameInput').value=t.name||'';
  if($('#numberInput'))$('#numberInput').value=num;
  if($('#roleInput')&&t.role)$('#roleInput').value=t.role;
  if($('#toneInput')&&t.tone)$('#toneInput').value=t.tone;
  if($('#hairInput')&&t.hair)$('#hairInput').value=t.hair;
  const figure=$('#avatarFigure');if(figure){figure.dataset.tone=t.tone||'t2';figure.dataset.hair=t.hair||'h1';if(t.kit)figure.dataset.kit=t.kit}
}
applyTwin();updateFollowTeamUi();renderAvatarCatalog();

$('#saveTwin')?.addEventListener('click',()=>{
  const t=loadTwin();t.name=$('#twinNameInput').value.trim().slice(0,24)||'Il mio Twin';t.number=Math.max(1,Math.min(99,Number($('#numberInput').value||10)));t.role=$('#roleInput').value;t.tone=$('#toneInput')?.value||'t2';t.hair=$('#hairInput')?.value||'h1';
  localStorage.setItem(twinKey,JSON.stringify(t));applyTwin(t);toast('Avatar sintetico salvato sul dispositivo');
});
$('#missionBtn')?.addEventListener('click',()=>{
  const t=loadTwin();t.xp=Number(t.xp||0)+10;localStorage.setItem(twinKey,JSON.stringify(t));applyTwin(t);
  $('#avatarFigure')?.animate([{transform:'translateY(0)'},{transform:'translateY(-14px)'},{transform:'translateY(0)'}],{duration:500});toast('+10 XP · missione sicura');
});

const mirror=$('#mirror');
function openMirror(){mirror.classList.add('open');mirror.setAttribute('aria-hidden','false');const fab=$('#mirrorFab');if(fab)fab.hidden=true;setTimeout(()=>$('#mirrorInput')?.focus(),200)}
function closeMirror(){mirror.classList.remove('open');mirror.setAttribute('aria-hidden','true');const fab=$('#mirrorFab');if(fab)fab.hidden=false}
['#mirrorFab','#openMirrorFromCard','#openMirrorDesk','#ngMirrorQuick'].forEach(s=>$(s)?.addEventListener('click',openMirror));$('#closeMirror')?.addEventListener('click',closeMirror);
function mirrorReply(q){
 const x=norm(q);
 if(/prossima partita|gara|match/.test(x)){const m=state.nextMatch;return m?'Prossima gara verificata: '+[m.team,m.opponent,fmtDate(m.date),m.time,m.venue].filter(Boolean).join(' · ')+'.':'La prossima partita non è ancora disponibile da una fonte verificata.'}
 if(/event/.test(x))return state.upcoming.length?'Ci sono '+state.upcoming.length+' appuntamenti verificati nei prossimi 30 giorni. Apri Calendario per i dettagli.':'Gli eventi pubblici sono in aggiornamento.';
 if(/tesser/.test(x))return 'Per il tesseramento apri “Entra nel Club” e scegli Tesserato / Atleta. La richiesta non attribuisce automaticamente la qualità di socio.';
 if(/tifos/.test(x))return 'Apri “Entra nel Club” e scegli Diventa tifoso: nasce un profilo base, senza ruoli riservati automatici.';
 if(/sponsor|partner/.test(x))return 'La barra Partner mostra solo soggetti verificati dalla fonte collegata. Per una proposta usa Sponsor / Partner in “Entra nel Club”.';
 if(/youtube|video|instagram|facebook|tiktok|social|media/.test(x)){document.querySelector('#mediaHub')?.scrollIntoView({behavior:'smooth'});return 'Ti porto al Media Hub: lì trovi i canali ufficiali SCD separati dalle fonti esterne da verificare.';}
 if(/segreter|contatt/.test(x))return 'Puoi inviare una richiesta dal percorso “Altro profilo” oppure usare i recapiti ufficiali della Segreteria presenti nei canali societari.';
 if(/calend|allen/.test(x)){setView('calendar');return 'Ho aperto il Calendario SCD: parte dalla settimana corrente e puoi estenderlo a 30 giorni o a tutti i dati pubblici disponibili.';}
 if(/document|certificat/.test(x))return 'I documenti riservati restano nel Private Desk e richiedono ruolo e autorizzazione.';
 if(/pulmin|trasport/.test(x))return 'I trasporti sono un servizio riservato: richieste e dati personali richiedono autenticazione e scope.';
 return 'Posso orientarti tra prossima partita, eventi, tesseramento, tifosi, sponsor e contatti. Le azioni riservate restano soggette a ruolo e permessi.';
}
function appendMsg(text,kind){const d=document.createElement('div');d.className='msg '+kind;d.textContent=text;$('#mirrorMessages').appendChild(d);$('#mirrorMessages').scrollTop=$('#mirrorMessages').scrollHeight}
$('#mirrorForm')?.addEventListener('submit',e=>{e.preventDefault();const q=$('#mirrorInput').value.trim();if(!q)return;appendMsg(q,'user');$('#mirrorInput').value='';setTimeout(()=>appendMsg(mirrorReply(q),'ai'),180)});
$$('.quick-prompts button').forEach(b=>b.addEventListener('click',()=>{appendMsg(b.textContent,'user');setTimeout(()=>appendMsg(mirrorReply(b.textContent),'ai'),140)}));

const hash=location.hash.replace('#','').split('?')[0];if(['pulse','calendar','teams','social','twin','desk'].includes(hash))setView(hash);
window.SCDNextGen={setView,hydrate,openMirror,openCalendar:openCalendarPanel,openTeams:openTeamsPanel,openSocial:()=>setView('social'),openTeamHub,openMatchday,loadCalendar:ensurePublicCalendar,search:runSearch,renderSocialHub};
})();