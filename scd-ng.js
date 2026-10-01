(()=>{
'use strict';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const API_BASE='';
const PRIVATE_SESSION_KEY='scd:session:v1';
const state={view:'pulse',filter:'ALL',events:[],upcoming:[],fullCalendar:[],calendarLoaded:false,calendarLoading:false,calendarSourceState:'UNVERIFIED',calendarPeriod:'WEEK',calendarTeam:'ALL',calendarCategory:'ALL',calendarType:'ALL',calendarSearch:'',teamsSearch:'',teamsCategory:'ALL',news:null,sportData:{results:[],standings:[],headToHead:[]},partners:[],publicProfiles:[],nextMatch:null,privateToken:'',privateEmail:'',privateData:null,workspace:null,privateLoading:false,privateError:''};
const officialChannels=[
 {id:'site',label:'Sito ufficiale',url:'https://www.colicoderviese.it/',terms:'sito web comunicazioni servizi'},
 {id:'facebook',label:'Facebook SCD',url:'https://www.facebook.com/ColicoDerviese',terms:'facebook social pagina'},
 {id:'instagram',label:'Instagram SCD',url:'https://www.instagram.com/s.c.d.colicoderviese/',terms:'instagram social foto reel'},
 {id:'tiktok',label:'TikTok SCD',url:'https://www.tiktok.com/@s.c.d..colicoderv',terms:'tiktok social video'},
 {id:'youtube',label:'YouTube SCD',url:'https://www.youtube.com/@S.C.D.ColicoDerviese',terms:'youtube video partite club'}
];
const FOLLOW_TEAM_KEY='scd:follow-team:v1';
function loadFollowedTeam(){try{return String(localStorage.getItem(FOLLOW_TEAM_KEY)||'')}catch{return ''}}
function saveFollowedTeam(name){try{name?localStorage.setItem(FOLLOW_TEAM_KEY,name):localStorage.removeItem(FOLLOW_TEAM_KEY)}catch{}}
function updateFollowTeamUi(){
 const name=loadFollowedTeam(),label=$('#sportFollowTeamLabel'),btn=$('#sportFollowTeam');
 if(label)label.textContent=name?name:'Scegli e segui una squadra';
 if(btn)btn.classList.toggle('is-following',Boolean(name));
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
  const ctx=view==='desk'?'PRIVATE DESK · ROLE/SCOPE':view==='twin'?'PROFILO · AVATAR FACOLTATIVO':view==='calendar'?'CALENDARIO · PUBBLICO':view==='teams'?'SQUADRE · PUBBLICO':'HOME · PUBBLICO';
  const ctxEl=$('#mirrorContext');if(ctxEl)ctxEl.textContent=ctx;
  history.replaceState(null,'','#'+view);
  window.scrollTo({top:0,behavior:'smooth'});
  if(view==='calendar')ensurePublicCalendar();
  if(view==='teams')ensurePublicCalendar();
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
 $$('[data-public-team]',mount).forEach(b=>b.onclick=()=>{state.calendarTeam=b.dataset.publicTeam;state.calendarPeriod='ALL';setView('calendar');renderPublicCalendar()});
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
 saveFollowedTeam(name);updateFollowTeamUi();toast('Ora segui '+name+' su questo dispositivo');
});
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
 const key=norm(match.team);
 const standing=(state.sportData.standings||[]).find(x=>norm(x.team).includes(key)||key.includes(norm(x.team)));
 $('#matchStanding').textContent=standing?[standing.position?'#'+standing.position:'',standing.points?standing.points+' pt':''].filter(Boolean).join(' · ')||'Dato verificato disponibile':'Dato in aggiornamento';
 const recent=(state.sportData.results||[]).filter(x=>norm(x.team).includes(key)||key.includes(norm(x.team))).slice(0,5);
 $('#matchForm').textContent=recent.length?recent.map(x=>x.result).filter(Boolean).join(' · ')||'Dato in aggiornamento':'Dato in aggiornamento';
 const h2h=state.sportData.headToHead||[];
 $('#matchH2H').textContent=h2h.length?h2h.slice(0,3).map(x=>x.result||x.score).filter(Boolean).join(' · '):'Dato in aggiornamento';
}
$('#matchAnalyze')?.addEventListener('click',()=>{
 const m=state.nextMatch;
 if(!m)return toast('Partita verificata non ancora disponibile');
 const key=norm(m.team),standing=(state.sportData.standings||[]).find(x=>norm(x.team).includes(key)||key.includes(norm(x.team))),recent=(state.sportData.results||[]).filter(x=>norm(x.team).includes(key)||key.includes(norm(x.team))).slice(0,5);
 openPanel('Analisi prossima partita','<div class="analysis-sheet"><span class="eyebrow">SOLO DATI VERIFICATI</span><h2>'+esc((m.team||'SCD')+' vs '+(m.opponent||'Avversario'))+'</h2><p>'+esc([fmtDate(m.date),m.time,m.venue].filter(Boolean).join(' · '))+'</p><div class="analysis-grid"><div><small>Classifica</small><b>'+esc(standing?[standing.position?'#'+standing.position:'',standing.points?standing.points+' pt':''].filter(Boolean).join(' · ')||'Dato in aggiornamento':'Dato in aggiornamento')+'</b></div><div><small>Ultimi risultati</small><b>'+esc(recent.length?recent.map(x=>x.result).filter(Boolean).join(' · ')||'Dato in aggiornamento':'Dato in aggiornamento')+'</b></div><div><small>Scontri diretti</small><b>Dato in aggiornamento</b><small>In attesa della fonte precisa indicata dalla Società.</small></div></div></div>');
});

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
 if(kind==='team'){state.teamsSearch=id;setView('teams');const input=$('#teamsSearch');if(input)input.value=id;renderPublicTeams();return}
 if(kind==='news'){document.querySelector('.newsroom')?.scrollIntoView({behavior:'smooth'});return}
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
 if(u.staff||p.direction)mods.push('COMUNICAZIONI');
 if(data.transport)mods.push('PULMINI');
 if(Array.isArray(data.personal)&&data.personal.length)mods.push('TESSERATI');
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
 TESSERATI:['●','Tesserati','Profili e documenti autorizzati'],
 TORNEI_EVENTI:['★','Tornei & Eventi','Organizzazione e calendario'],
 BIGLIETTERIA:['◧','Biglietteria','Accessi e attività evento'],
 DRIVE_TORNEI:['□','Drive Tornei','Documenti evento autorizzati'],
 PARTNER_EVENTO:['◇','Partner Evento','Relazioni collegate agli eventi']
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
     savePrivateSession(token,email);await ensurePrivateDesk(true);toast('Private Desk attivato');
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
 const modules=[...new Set((w.defaultModules||[]).map(x=>String(x||'').trim().toUpperCase()).filter(Boolean))];
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
function openPrivateModule(module){
 const w=state.workspace||{},d=state.privateData||{},m=deskMeta(module);
 if(['CALENDARIO','EVENTI','TORNEI_EVENTI','BIGLIETTERIA'].includes(module)){setView('calendar');return}
 if(['CRM','CONTRATTI','REPORT','APPROVAZIONI'].includes(module)){
   const layer=openPanel(m[1],'<div class="panel-detail private-module-panel"><span class="eyebrow">AREA COMMERCIALE RISERVATA</span><h2>'+esc(m[1])+'</h2><p>Questa funzione prosegue nella Sponsor Platform protetta.</p><button class="btn primary" id="deskOpenSponsorPortal">Apri Sponsor Platform</button></div>');
   $('#deskOpenSponsorPortal',layer).onclick=()=>{location.href='/sponsor/?login=1'};return;
 }
 if(module==='DOCUMENTI'){
   const admin=(w.areas||[]).some(x=>x.canAdmin===true)||String(w.privateDeskProfile||'').toUpperCase()==='EXECUTIVE_FULL'||state.privateData?.permissions?.direction===true;
   const layer=openPanel('Documenti','<div class="panel-detail private-module-panel"><span class="eyebrow">DOCUMENTI · ROLE/SCOPE</span><h2>'+esc(w.role||'Profilo SCD')+'</h2><p>'+esc(admin?'Accesso agli strumenti amministrativi documentali autorizzato.':'Sono mostrati soltanto i documenti del perimetro assegnato.')+'</p>'+(admin?'<button class="btn primary" id="deskOpenIntakeAdmin">Apri Intake Admin</button>':'')+'</div>');
   if(admin)$('#deskOpenIntakeAdmin',layer).onclick=()=>{location.href='./intake/admin.html'};return;
 }
 if(module==='COMUNICAZIONI'){openPanel('Comunicazioni','<div class="panel-detail private-module-panel"><span class="eyebrow">FIRMA E PERIMETRO</span><h2>'+esc(w.role||'Profilo SCD')+'</h2><p>'+esc((w.communicationScope||[]).join(' · ')||'Perimetro definito dal ruolo')+'</p><small>Invii esterni soggetti a firma, policy e autorizzazioni.</small></div>');return}
 if(module==='TESSERATI'){const people=Array.isArray(d.personal)?d.personal:[];openPanel('Tesserati','<div class="panel-detail private-module-panel"><span class="eyebrow">PROFILI AUTORIZZATI</span><h2>'+people.length+' profili disponibili</h2><p>'+esc(people.length?people.slice(0,8).map(x=>[x.firstName,x.lastName].filter(Boolean).join(' ')||x.fullName||'Profilo').join(' · '):'Nessun profilo restituito per questo account.')+'</p></div>');return}
 if(module==='PULMINI'){const k=d.transport?.kpis||{};openPanel('Pulmini & Trasporti','<div class="panel-detail private-module-panel"><span class="eyebrow">LOGISTICA</span><h2>'+esc(String(k.requests??0))+' richieste</h2><p>Dati letti dal dashboard privato corrente.</p></div>');return}
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
     const payload={firstName,lastName,name:[firstName,lastName].filter(Boolean).join(' '),email,phone,privacy:true,topic:'SCD Super App · '+label,category:kind,message:'Richiesta percorso '+label+' dalla home pubblica.'};
     const out=await postAction(action,payload);
     st.textContent='Richiesta registrata'+(out.requestId?' · '+out.requestId:'')+'.';
     btn.textContent='INVIATA';toast('Richiesta registrata');
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
    state.fullCalendar=mergeCalendarRows(state.fullCalendar,state.events,state.upcoming);renderWeek();renderWeekMeta(data);renderMatchCenter();renderUpcoming();renderPartners();renderMentions();if(state.view==='calendar')renderPublicCalendar();if(state.view==='teams')renderPublicTeams();
  }catch(e){
    if($('#weekCount'))$('#weekCount').textContent='—';if($('#todayCount'))$('#todayCount').textContent='—';
    state.fullCalendar=mergeCalendarRows(state.fullCalendar,state.events,state.upcoming);renderWeek();renderMatchCenter();renderUpcoming();renderPartners();renderMentions();if(state.view==='calendar')renderPublicCalendar();if(state.view==='teams')renderPublicTeams();
  }
}
hydrate();$('#refreshData')?.addEventListener('click',()=>{hydrate();toast('Aggiornamento richiesto')});

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

const hash=location.hash.replace('#','').split('?')[0];if(['pulse','calendar','teams','twin','desk'].includes(hash))setView(hash);
window.SCDNextGen={setView,hydrate,openMirror,openCalendar:openCalendarPanel,openTeams:openTeamsPanel,loadCalendar:ensurePublicCalendar,search:runSearch};
})();