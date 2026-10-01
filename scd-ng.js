(()=>{
'use strict';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const API_BASE='';
const state={view:'pulse',filter:'ALL',events:[],upcoming:[],news:null,sportData:{results:[],standings:[],headToHead:[]},partners:[],publicProfiles:[],nextMatch:null};
const toast=(t)=>{const el=$('#toast');if(!el)return;el.textContent=t;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),2200)};
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const norm=s=>String(s??'').toLocaleLowerCase('it-IT').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const todayKey=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome'}).format(new Date());
const fmtDate=v=>{if(!v)return 'Dato in aggiornamento';const d=new Date(String(v).slice(0,10)+'T12:00:00');return Number.isFinite(d.getTime())?new Intl.DateTimeFormat('it-IT',{weekday:'short',day:'2-digit',month:'short'}).format(d):String(v)};

function setView(view){
  state.view=view;
  $$('[data-view]').forEach(x=>x.classList.toggle('active',x.dataset.view===view));
  $$('[data-nav]').forEach(x=>x.classList.toggle('active',x.dataset.nav===view));
  const ctx=view==='desk'?'PRIVATE DESK · ROLE/SCOPE':view==='twin'?'PROFILO · AVATAR FACOLTATIVO':'HOME · PUBBLICO';
  const ctxEl=$('#mirrorContext');if(ctxEl)ctxEl.textContent=ctx;
  history.replaceState(null,'','#'+view);
  window.scrollTo({top:0,behavior:'smooth'});
}
$$('[data-nav]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.nav)));
$('#modeBtn')?.addEventListener('click',()=>{document.body.classList.toggle('compact');toast(document.body.classList.contains('compact')?'Densità compatta':'Densità comfort')});
$$('[data-scroll]').forEach(b=>b.addEventListener('click',()=>$(b.dataset.scroll)?.scrollIntoView({behavior:'smooth',block:'start'})));

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
 const x=[...state.events,...state.upcoming].find(e=>String(e.id)===String(id));if(!x)return;
 openPanel(x.title||'Evento SCD','<div class="panel-detail"><span class="eyebrow">'+esc(x.kind||'EVENTO')+'</span><h2>'+esc(x.team||'SCD')+'</h2><p>'+esc([fmtDate(x.date),x.time,x.opponent,x.venue].filter(Boolean).join(' · '))+'</p><small>Fonte: '+esc(x.source||'SCD')+'</small></div>');
}
function openCalendarPanel(){
 const rows=[...state.events,...state.upcoming].filter((x,i,a)=>a.findIndex(y=>String(y.id)===String(x.id))===i).sort((a,b)=>(a.date+(a.time||'')).localeCompare(b.date+(b.time||'')));
 const body=rows.length?'<div class="panel-list">'+rows.slice(0,30).map(x=>'<button type="button" data-panel-event="'+esc(x.id)+'"><time>'+esc(fmtDate(x.date))+(x.time?' · '+esc(x.time):'')+'</time><b>'+esc(x.title||x.team||'Evento SCD')+'</b><small>'+esc([x.team,x.opponent,x.venue].filter(Boolean).join(' · '))+'</small></button>').join('')+'</div>':'<div class="panel-empty"><b>Calendario in aggiornamento</b><p>Nessun evento pubblico verificato disponibile.</p></div>';
 const layer=openPanel('Calendario SCD',body);
 $$('[data-panel-event]',layer).forEach(b=>b.onclick=()=>openEvent(b.dataset.panelEvent));
}
function openTeamsPanel(){
 const names=[...new Set([...state.events,...state.upcoming].flatMap(x=>[x.team,x.category]).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'it'));
 openPanel('Squadre e categorie',names.length?'<div class="team-cloud">'+names.map(x=>'<button type="button" data-team-search="'+esc(x)+'">'+esc(x)+'</button>').join('')+'</div>':'<div class="panel-empty"><b>Dati in aggiornamento</b><p>Le squadre compariranno dalla fonte sportiva verificata.</p></div>');
 $$('[data-team-search]').forEach(b=>b.onclick=()=>{setView('pulse');const q=$('#publicSearchInput');if(q){q.value=b.dataset.teamSearch;runSearch(q.value)}});
}
$$('[data-public-action="calendar"]').forEach(b=>b.addEventListener('click',openCalendarPanel));
$$('[data-public-action="teams"]').forEach(b=>b.addEventListener('click',openTeamsPanel));

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
 state.events.forEach(x=>items.push({kind:x.kind==='MATCH'?'PARTITA':'EVENTO',title:[x.team,x.opponent].filter(Boolean).join(' vs ')||x.title,meta:[fmtDate(x.date),x.time,x.venue].filter(Boolean).join(' · '),action:'event',id:x.id,terms:[x.team,x.category,x.title,x.opponent,x.competition,x.venue]}));
 (state.news?.cards||[]).forEach((x,i)=>items.push({kind:'NEWS',title:x.title,meta:x.category||'SCD Newsroom',action:'news',id:String(i),terms:[x.title,x.dek,x.body,x.category]}));
 [...new Set(state.events.flatMap(x=>[x.team,x.category]).filter(Boolean))].forEach(x=>items.push({kind:'SQUADRA',title:x,meta:'Calendario e contenuti pubblici',action:'team',id:x,terms:[x]}));
 state.publicProfiles.forEach(x=>items.push({kind:'PROFILO PUBBLICO',title:x.displayName,meta:[x.role,x.team].filter(Boolean).join(' · '),action:'profile',id:x.id,terms:[x.displayName,x.role,x.team]}));
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
 if(kind==='team'){const input=$('#publicSearchInput');if(input){input.value=id;runSearch(id)}return}
 if(kind==='news'){document.querySelector('.newsroom')?.scrollIntoView({behavior:'smooth'});return}
 if(kind==='profile'){openPanel('Profilo pubblico','<div class="panel-detail"><b>Profilo autorizzato</b><p>Le informazioni mostrate rispettano la visibilità concessa dalla Società.</p></div>')}
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
    renderWeek();renderWeekMeta(data);renderMatchCenter();renderUpcoming();renderPartners();renderMentions();
  }catch(e){
    if($('#weekCount'))$('#weekCount').textContent='—';if($('#todayCount'))$('#todayCount').textContent='—';
    renderWeek();renderMatchCenter();renderUpcoming();renderPartners();renderMentions();
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
applyTwin();renderAvatarCatalog();

$('#saveTwin')?.addEventListener('click',()=>{
  const t=loadTwin();t.name=$('#twinNameInput').value.trim().slice(0,24)||'Il mio Twin';t.number=Math.max(1,Math.min(99,Number($('#numberInput').value||10)));t.role=$('#roleInput').value;t.tone=$('#toneInput')?.value||'t2';t.hair=$('#hairInput')?.value||'h1';
  localStorage.setItem(twinKey,JSON.stringify(t));applyTwin(t);toast('Avatar sintetico salvato sul dispositivo');
});
$('#missionBtn')?.addEventListener('click',()=>{
  const t=loadTwin();t.xp=Number(t.xp||0)+10;localStorage.setItem(twinKey,JSON.stringify(t));applyTwin(t);
  $('#avatarFigure')?.animate([{transform:'translateY(0)'},{transform:'translateY(-14px)'},{transform:'translateY(0)'}],{duration:500});toast('+10 XP · missione sicura');
});

const mirror=$('#mirror');
function openMirror(){mirror.classList.add('open');mirror.setAttribute('aria-hidden','false');setTimeout(()=>$('#mirrorInput')?.focus(),200)}
function closeMirror(){mirror.classList.remove('open');mirror.setAttribute('aria-hidden','true')}
['#mirrorFab','#openMirrorFromCard','#openMirrorDesk','#ngMirrorQuick'].forEach(s=>$(s)?.addEventListener('click',openMirror));$('#closeMirror')?.addEventListener('click',closeMirror);
function mirrorReply(q){
 const x=norm(q);
 if(/prossima partita|gara|match/.test(x)){const m=state.nextMatch;return m?'Prossima gara verificata: '+[m.team,m.opponent,fmtDate(m.date),m.time,m.venue].filter(Boolean).join(' · ')+'.':'La prossima partita non è ancora disponibile da una fonte verificata.'}
 if(/event/.test(x))return state.upcoming.length?'Ci sono '+state.upcoming.length+' appuntamenti verificati nei prossimi 30 giorni. Apri Calendario per i dettagli.':'Gli eventi pubblici sono in aggiornamento.';
 if(/tesser/.test(x))return 'Per il tesseramento apri “Entra nel Club” e scegli Tesserato / Atleta. La richiesta non attribuisce automaticamente la qualità di socio.';
 if(/tifos/.test(x))return 'Apri “Entra nel Club” e scegli Diventa tifoso: nasce un profilo base, senza ruoli riservati automatici.';
 if(/sponsor|partner/.test(x))return 'La barra Partner mostra solo soggetti verificati dalla fonte collegata. Per una proposta usa Sponsor / Partner in “Entra nel Club”.';
 if(/segreter|contatt/.test(x))return 'Puoi inviare una richiesta dal percorso “Altro profilo” oppure usare i recapiti ufficiali della Segreteria presenti nei canali societari.';
 if(/calend|allen/.test(x))return 'Apri Calendario: la settimana corrente resta il punto di partenza e non vengono inventati eventi mancanti.';
 if(/document|certificat/.test(x))return 'I documenti riservati restano nel Private Desk e richiedono ruolo e autorizzazione.';
 if(/pulmin|trasport/.test(x))return 'I trasporti sono un servizio riservato: richieste e dati personali richiedono autenticazione e scope.';
 return 'Posso orientarti tra prossima partita, eventi, tesseramento, tifosi, sponsor e contatti. Le azioni riservate restano soggette a ruolo e permessi.';
}
function appendMsg(text,kind){const d=document.createElement('div');d.className='msg '+kind;d.textContent=text;$('#mirrorMessages').appendChild(d);$('#mirrorMessages').scrollTop=$('#mirrorMessages').scrollHeight}
$('#mirrorForm')?.addEventListener('submit',e=>{e.preventDefault();const q=$('#mirrorInput').value.trim();if(!q)return;appendMsg(q,'user');$('#mirrorInput').value='';setTimeout(()=>appendMsg(mirrorReply(q),'ai'),180)});
$$('.quick-prompts button').forEach(b=>b.addEventListener('click',()=>{appendMsg(b.textContent,'user');setTimeout(()=>appendMsg(mirrorReply(b.textContent),'ai'),140)}));

const hash=location.hash.replace('#','');if(['pulse','twin','desk'].includes(hash))setView(hash);
window.SCDNextGen={setView,hydrate,openMirror,openCalendar:openCalendarPanel,search:runSearch};
})();