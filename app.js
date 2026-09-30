const APP_VERSION='40.0.0';
const DYNAMIC_ORIGIN=(/^(localhost|127\.0\.0\.1)$/.test(location.hostname)||location.hostname.endsWith('.onrender.com'))
  ? location.origin
  : 'https://scd-colicoderviese-official-r21.onrender.com';
const API=DYNAMIC_ORIGIN+'/api/scd';
const LIVE_API=DYNAMIC_ORIGIN+'/api/live';
const NEWSROOM_API=DYNAMIC_ORIGIN+'/api/newsroom';
const HEALTH_API=DYNAMIC_ORIGIN+'/health';
const TIME_API=DYNAMIC_ORIGIN+'/api/time';
const CAPABILITIES_API=DYNAMIC_ORIGIN+'/api/capabilities';
const CALENDAR_KEY='scd:calendar:v1';
const LOCATION_KEY='scd:location:consent:v1';
const REQUESTS_KEY='scd:requests:v1';
const SESSION_KEY='scd:session:v1';
const R20_APP='https://script.google.com/macros/s/AKfycbwYQ_3yLYsp-6jX3FIgufBjpmaZb9uO1AklF9hdG-CuLII9J4ITUX1EA-EKuWXBMEc/exec';
const FALLBACK={
  season:'2026/27',generatedAt:new Date().toLocaleString('it-IT'),
  public:{
    nextMatch:null,lastResult:null,
    highlights:[{title:'SCD ColicoDerviese · dati pubblici in sincronizzazione',message:'La Super App mostra solo informazioni provenienti da fonti SCD o fonti esterne verificabili.',feedType:'NEWS',source:'SCD'}],
    initiatives:[],
    sponsors:[
      {name:'HDI Maglia Assicurazioni'},{name:'Dell’Oca Petroli'},{name:'Carcano'},{name:'MDS Impianti'},
      {name:'Rigamonti Geom. Gino'},{name:'NBC Weighing'},{name:'Tarabini Paolo Termoidraulica'},{name:'Turbojet Spurghi'}
    ],counts:{games:0,events:0,initiatives:0,news:1}
  }
};
let state={summary:null,newsroom:null,installPrompt:null,session:null,sessionToken:'',privateData:null,apiStatus:'checking',clockOffsetMs:0,clubTimeZone:'Europe/Rome',clockSynced:false,calendar:[],location:null,capabilities:null,featureFlags:{dataFabricObservability:false},dataFabricStatus:null,dataFabricError:''};

function localRequests(){
  try{return JSON.parse(localStorage.getItem(REQUESTS_KEY)||'[]')}catch{return []}
}
function requestId(kind='REQ'){
  return 'SCD-'+String(kind).toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,5)+'-'+Date.now().toString(36).toUpperCase();
}
function upsertLocalRequest(item){
  const rows=localRequests(),i=rows.findIndex(x=>x.id===item.id);
  const next={...(i>=0?rows[i]:{}),...item,updatedAt:new Date().toISOString()};
  if(i>=0)rows[i]=next;else rows.unshift(next);
  localStorage.setItem(REQUESTS_KEY,JSON.stringify(rows.slice(0,50)));
  return next;
}
function requestKindLabel(k){
  const m={registration:'Registrazione',sponsor:'Sponsor',product:'Prodotti / servizi',rent:'Affitto campo',tournament:'Torneo',tickets:'Biglietti',idea:'Idea / progetto',story:'Contenuto community',fan:'Community',cards:'Card SCD',fantasy:'Fantasy SCD'};
  return m[k]||String(k||'Richiesta').toUpperCase();
}
function renderRequestHistory(rows,serverSynced=false){
  const mount=$('#requestHistoryMount');if(!mount)return;
  mount.innerHTML=rows.length?rows.map(x=>`<article class="request-history-card"><div><span class="request-kind">${esc(requestKindLabel(x.kind||x.type))}</span><b>${esc(x.topic||x.id)}</b><small>${esc(new Date(x.createdAt||x.updatedAt||Date.now()).toLocaleString('it-IT'))}</small></div><div class="request-state ${esc(String(x.status||'').toLowerCase())}">${esc(x.status||'SALVATA')}</div><code>${esc(x.serverId||x.id)}</code></article>`).join(''):'<div class="empty-state"><b>Nessuna richiesta ancora.</b><p>Quando invii una richiesta dall’app, la ritrovi qui con data e stato.</p></div>';
  const sync=$('#requestSyncState');if(sync)sync.textContent=serverSynced?'Sincronizzato con il gestionale SCD':'Registro locale · accesso richiesto per lo stato server';
}
async function openMyRequests(){
  const local=localRequests();
  modal(`<span class="eyebrow">AREA PERSONALE</span><h2>Le mie richieste</h2><p id="requestSyncState">Registro locale · controllo sincronizzazione…</p><div class="request-history" id="requestHistoryMount"></div>`);
  renderRequestHistory(local,false);
  if(!state.sessionToken)return;
  try{
    const remote=await mgmtApi('account.requests');
    const serverRows=Array.isArray(remote)?remote:(remote.rows||remote.items||[]);
    const map=new Map();
    local.forEach(x=>map.set(x.serverId||x.id,{...x}));
    serverRows.forEach(x=>{
      const id=x.id||x.requestId||'';
      const old=map.get(id)||{};
      map.set(id,{...old,...x,id:id||old.id,serverId:id||old.serverId,kind:old.kind||String(x.type||'').toLowerCase()});
    });
    const merged=[...map.values()].sort((a,b)=>new Date(b.createdAt||b.updatedAt||0)-new Date(a.createdAt||a.updatedAt||0));
    renderRequestHistory(merged,true);
  }catch(e){
    const sync=$('#requestSyncState');if(sync)sync.textContent='Registro locale · sincronizzazione server non disponibile';
  }
}
function updateApiBadge(status,label){
  state.apiStatus=status;
  const el=$('#apiStatus'); if(!el)return;
  el.className='api-status '+status;
  el.innerHTML=`<i></i><span>${esc(label)}</span>`;
}
function featureEnabled(name){return state.featureFlags&&state.featureFlags[name]===true}
async function loadCapabilities(){
  try{
    const r=await fetch(CAPABILITIES_API,{cache:'no-store'});
    if(!r.ok)throw new Error('capabilities '+r.status);
    const j=await r.json();
    state.capabilities=j;
    state.featureFlags={...state.featureFlags,...(j.featureFlags||{})};
    window.dispatchEvent(new CustomEvent('scd:capabilities',{detail:j}));
    return j;
  }catch(e){
    state.capabilities=null;
    state.featureFlags={...state.featureFlags,dataFabricObservability:false};
    return null;
  }
}
function clubNow(){return new Date(Date.now()+(state.clockOffsetMs||0))}
function clubDateKey(d=clubNow()){
  return new Intl.DateTimeFormat('en-CA',{timeZone:state.clubTimeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
}
function formatClubDateTime(d=clubNow()){
  return new Intl.DateTimeFormat('it-IT',{timeZone:state.clubTimeZone,weekday:'long',day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(d);
}
function updateClubClock(){
  const el=$('#clubClock');if(!el)return;
  el.textContent=formatClubDateTime();
  el.dataset.synced=state.clockSynced?'true':'false';
}
async function syncClubClock(){
  try{
    const r=await fetch(TIME_API,{cache:'no-store'});
    if(!r.ok)throw new Error('time '+r.status);
    const j=await r.json();
    if(!j.epochMs)throw new Error('time payload');
    state.clockOffsetMs=Number(j.epochMs)-Date.now();
    state.clubTimeZone=j.timeZone||'Europe/Rome';
    state.clockSynced=true;
    updateClubClock();
    return j;
  }catch(e){
    state.clockOffsetMs=0;
    state.clubTimeZone='Europe/Rome';
    state.clockSynced=false;
    updateClubClock();
    return null;
  }
}
function normalizeCalendarDate(v){
  const s=String(v||'').trim();if(!s)return '';
  let m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);if(m)return m[1]+'-'+m[2]+'-'+m[3];
  m=s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);if(m)return m[3]+'-'+String(m[2]).padStart(2,'0')+'-'+String(m[1]).padStart(2,'0');
  const d=new Date(s);if(Number.isFinite(d.getTime()))return d.toISOString().slice(0,10);
  return s;
}
function normalizeCalendarRows(raw){
  const rows=Array.isArray(raw)?raw:(raw?.rows||raw?.items||raw?.events||raw?.calendar||[]);
  return rows.map((x,i)=>({
    id:x.id||x.eventId||x.uid||('CAL-'+i),
    title:field(x,'title','event','name','subject')||'Evento SCD',
    date:normalizeCalendarDate(field(x,'date','data','startDate')),
    time:field(x,'time','ora','startTime')||'',
    endTime:field(x,'endTime','fine')||'',
    type:field(x,'type','kind','eventType')||field(x,'category','categoria')||'EVENTO',
    category:displayValue(field(x,'category','categoria','ageGroup','annata'),''),
    birthYear:displayValue(field(x,'birthYear','year','anno'),''),
    venue:field(x,'venue','luogo','field','location')||'',
    team:displayValue(field(x,'team','teamName','squadra'),''),
    opponent:displayValue(field(x,'opponent','opponentName','avversario'),''),
    competition:displayValue(field(x,'competition','campionato','league'),''),
    result:displayValue(field(x,'result','score','risultato','finalScore'),''),
    source:field(x,'source','fonte')||'SCD',
    url:field(x,'url','link','sourceUrl')||''
  })).filter(x=>x.date||x.title);
}
function calendarSortKey(x){
  const raw=(x.date||'')+'T'+(x.time||'00:00');
  const d=new Date(raw);return Number.isFinite(d.getTime())?d.getTime():Number.MAX_SAFE_INTEGER;
}
async function loadPublicCalendar(silent=true){
  try{
    const raw=await api('public.calendar',{rangeKey:'ALL',offset:0});
    const rows=normalizeCalendarRows(raw).sort((a,b)=>calendarSortKey(a)-calendarSortKey(b));
    state.calendar=rows;
    localStorage.setItem(CALENDAR_KEY,JSON.stringify({at:new Date().toISOString(),rows}));
    renderTodayAgenda();renderHomeKpis(publicData(state.summary||FALLBACK));
    if(!silent)toast('Calendario SCD aggiornato');
    return rows;
  }catch(e){
    try{state.calendar=JSON.parse(localStorage.getItem(CALENDAR_KEY)||'{}').rows||[]}catch{state.calendar=[]}
    renderTodayAgenda();renderHomeKpis(publicData(state.summary||FALLBACK));
    return state.calendar;
  }
}
function renderTodayAgenda(){
  const mount=$('#todayAgenda');if(!mount)return;
  const today=clubDateKey();
  const rows=(state.calendar||[]).filter(x=>String(x.date).slice(0,10)===today).slice(0,4);
  mount.innerHTML=rows.length?rows.map(x=>`<button class="today-event" data-calendar-event="${esc(x.id)}"><time>${esc(x.time||'--:--')}</time><span><b>${esc(x.title)}</b><small>${esc([x.team,x.venue].filter(Boolean).join(' · ')||x.type)}</small></span><i>›</i></button>`).join(''):'<div class="today-empty"><b>Nessun evento pubblico registrato per oggi.</b><small>Il calendario si aggiorna dalle fonti SCD.</small></div>';
  bindCalendarEvents();
}
function bindCalendarEvents(){
  $$('[data-calendar-event]').forEach(b=>b.onclick=()=>openCalendarEvent(b.dataset.calendarEvent));
}
function openCalendarEvent(id){
  const x=(state.calendar||[]).find(e=>String(e.id)===String(id));if(!x)return;
  const mapQ=encodeURIComponent(x.venue||'Centro Sportivo Comunale Colico Via Lido');
  modal(`<span class="eyebrow">CALENDARIO SCD</span><h2>${esc(x.title)}</h2><p>${esc([fmtDate(x.date),x.time,x.endTime?'- '+x.endTime:'',x.team].filter(Boolean).join(' · '))}</p><div class="notice"><b>Luogo:</b> ${esc(x.venue||'Da confermare')}<br><b>Fonte:</b> ${esc(x.source||'SCD')}</div><div class="choice-grid"><a class="choice-tile" href="https://www.google.com/maps/search/?api=1&query=${mapQ}" target="_blank" rel="noopener"><b>Apri in Google Maps</b><small>Navigazione esterna</small></a><button class="choice-tile" id="eventReminder"><b>Attiva promemoria</b><small>Notifica sul dispositivo</small></button></div>`);
  $('#eventReminder').onclick=()=>requestEventReminder(x);
}
async function openCalendar(){
  setActiveNav('calendar');
  modal('<section class="calendar-app-screen"><header class="calendar-app-head"><div class="calendar-app-brand"><img src="./assets/logo-scd.png" alt="SCD"><div><b>Calendario</b><p>Gare, allenamenti, riunioni ed eventi del club.</p></div></div></header><div class="calendar-tabs" role="tablist"><button class="active" data-cal-filter="ALL">Tutti</button><button data-cal-filter="MATCH">Gare</button><button data-cal-filter="TRAINING">Allenamenti</button><button data-cal-filter="EVENT">Eventi</button></div><div class="calendar-weekbar"><button class="outline" id="calPrev" aria-label="Settimana precedente">‹</button><strong id="calendarRange">Settimana corrente</strong><button class="outline" id="calNext" aria-label="Settimana successiva">›</button></div><div id="calendarDays" class="calendar-days"></div><div id="calendarNext"></div><div id="calendarRows" class="calendar-list"><div class="loading-line">Sincronizzazione calendario…</div></div><div class="calendar-toolbar"><button class="outline" id="calendarRefresh">AGGIORNA</button><button class="primary" id="calendarNotify">NOTIFICHE</button></div></section>');
  let offset=0,filter='ALL';
  const isoDate=d=>new Intl.DateTimeFormat('en-CA',{timeZone:state.clubTimeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
  const weekStart=()=>{
    const now=clubNow(),shift=(now.getDay()+6)%7;
    const d=new Date(now.getTime()-shift*86400000+offset*7*86400000);
    return new Date(d.getFullYear(),d.getMonth(),d.getDate());
  };
  const matchFilter=x=>{
    const t=[x.type,x.title].join(' ');
    if(filter==='MATCH')return /gara|partita|campionato|coppa|amichevole|match/i.test(t);
    if(filter==='TRAINING')return /allenament/i.test(t);
    if(filter==='EVENT')return !/gara|partita|campionato|coppa|amichevole|match|allenament/i.test(t);
    return true;
  };
  const eventClass=x=>{
    const t=[x.type,x.title].join(' ');
    if(/allenament/i.test(t))return 'event-training';
    if(/gara|partita|campionato|coppa|amichevole|match/i.test(t))return 'event-match';
    return 'event-club';
  };
  const icon=x=>{
    const t=[x.type,x.title].join(' ');
    if(/allenament/i.test(t))return '◭';
    if(/gara|partita|campionato|coppa|amichevole|match/i.test(t))return '⚽';
    if(/torneo/i.test(t))return '🏆';
    return '●';
  };
  const renderRows=()=>{
    const mount=$('#calendarRows'),range=$('#calendarRange'),days=$('#calendarDays'),next=$('#calendarNext');
    if(!mount||!range||!days||!next)return false;
    const start=weekStart(),endDate=new Date(start.getTime()+6*86400000),startKey=isoDate(start),endKey=isoDate(endDate);
    range.textContent=new Intl.DateTimeFormat('it-IT',{timeZone:state.clubTimeZone,day:'numeric',month:'long'}).format(start)+' – '+new Intl.DateTimeFormat('it-IT',{timeZone:state.clubTimeZone,day:'numeric',month:'long',year:'numeric'}).format(endDate);
    const today=clubDateKey();
    days.innerHTML=Array.from({length:7},(_,i)=>{const d=new Date(start.getTime()+i*86400000),key=isoDate(d);return '<button class="calendar-day '+(key===today?'today':'')+'" data-cal-day="'+key+'"><small>'+new Intl.DateTimeFormat('it-IT',{weekday:'short',timeZone:state.clubTimeZone}).format(d).replace('.','')+'</small><b>'+new Intl.DateTimeFormat('it-IT',{day:'numeric',timeZone:state.clubTimeZone}).format(d)+'</b></button>'}).join('');
    let rows=(state.calendar||[]).filter(x=>x.date&&String(x.date).slice(0,10)>=startKey&&String(x.date).slice(0,10)<=endKey&&matchFilter(x));
    rows=rows.sort((a,b)=>calendarSortKey(a)-calendarSortKey(b));
    const upcoming=(state.calendar||[]).filter(x=>x.date&&String(x.date).slice(0,10)>=today&&matchFilter(x)).sort((a,b)=>calendarSortKey(a)-calendarSortKey(b))[0];
    next.innerHTML=upcoming?'<button class="calendar-next" data-calendar-event="'+esc(upcoming.id)+'"><span class="next-ico">'+icon(upcoming)+'</span><span><small>PROSSIMO EVENTO</small><b>'+esc(upcoming.title)+'</b><small>'+esc([fmtDate(upcoming.date),upcoming.time,upcoming.venue].filter(Boolean).join(' · '))+'</small></span><i>›</i></button>':'';
    const groups=new Map();
    rows.forEach(x=>{const k=String(x.date).slice(0,10);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(x)});
    mount.innerHTML=groups.size?[...groups.entries()].map(([date,items])=>'<section class="calendar-group"><div class="calendar-group-title"><b>'+esc(fmtDate(date))+'</b><small>'+items.length+' '+(items.length===1?'evento':'eventi')+'</small></div>'+items.map(x=>'<button class="calendar-row '+eventClass(x)+'" data-calendar-event="'+esc(x.id)+'"><span class="event-marker"></span><time><b>'+esc(x.time||'--:--')+'</b><small>'+esc(x.endTime||'')+'</small></time><span><b>'+esc(x.title)+'</b><small>'+esc([x.team,x.venue].filter(Boolean).join(' · ')||x.type)+'</small></span><i>›</i></button>').join('')+'</section>').join(''):'<div class="empty-state">Nessun evento registrato in questa settimana per il filtro scelto.</div>';
    bindCalendarEvents();
    document.querySelectorAll('[data-cal-day]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-cal-day]').forEach(x=>x.classList.remove('today'));b.classList.add('today')});
    return true;
  };
  document.querySelectorAll('[data-cal-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.calFilter;document.querySelectorAll('[data-cal-filter]').forEach(x=>x.classList.toggle('active',x===b));renderRows()});
  const prev=$('#calPrev'),nextBtn=$('#calNext'),refresh=$('#calendarRefresh'),notify=$('#calendarNotify');
  if(prev)prev.onclick=()=>{offset--;renderRows()};
  if(nextBtn)nextBtn.onclick=()=>{offset++;renderRows()};
  if(refresh)refresh.onclick=async()=>{await syncClubClock();await loadPublicCalendar(false);renderRows()};
  if(notify)notify.onclick=requestNotificationPermission;
  await loadPublicCalendar(true);
  renderRows();
}
async function requestNotificationPermission(){
  if(!('Notification' in window))return toast('Notifiche non supportate da questo dispositivo');
  if(Notification.permission==='granted')return toast('Notifiche già abilitate');
  const result=await Notification.requestPermission();
  track('notification_interaction',{section:'permission_'+result});
  toast(result==='granted'?'Notifiche abilitate':'Notifiche non abilitate');
}
async function requestEventReminder(x){
  if(!('Notification' in window))return toast('Notifiche non supportate');
  if(Notification.permission!=='granted'){
    const r=await Notification.requestPermission();if(r!=='granted')return toast('Permesso notifiche non concesso');
  }
  localStorage.setItem('scd:reminder:'+x.id,JSON.stringify({id:x.id,title:x.title,date:x.date,time:x.time,createdAt:new Date().toISOString()}));
  toast('Promemoria salvato sul dispositivo');
}
function openLocationHub(){
  const saved=localStorage.getItem(LOCATION_KEY)==='granted';
  modal(`<span class="eyebrow">SCD TERRITORIO</span><h2>Posizione e mappe</h2><p>La posizione viene richiesta solo quando la scegli tu. Non viene inviata a social, CRM o telemetria e non viene conservata dal Club.</p><div class="notice"><b>Uso previsto:</b> trovare il Centro Sportivo, calcolare un percorso e preparare una condivisione geolocalizzata sotto il tuo controllo.</div><div class="choice-grid"><button class="choice-tile" id="locateMe"><b>Usa la mia posizione</b><small>${saved?'Permesso già utilizzato su questo dispositivo':'Richiederà il consenso del browser'}</small></button><a class="choice-tile" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('Centro Sportivo Comunale Colico Via Lido')}" target="_blank" rel="noopener"><b>Centro Sportivo su Maps</b><small>Apri Google Maps</small></a></div><div id="locationResult"></div>`);
  $('#locateMe').onclick=locateUser;
}
function locateUser(){
  const mount=$('#locationResult');
  if(!navigator.geolocation){mount.innerHTML='<div class="notice error-note">Geolocalizzazione non disponibile.</div>';return}
  mount.innerHTML='<div class="loading-line">Richiesta posizione al dispositivo…</div>';
  navigator.geolocation.getCurrentPosition(pos=>{
    const coords={lat:pos.coords.latitude,lng:pos.coords.longitude,accuracy:pos.coords.accuracy};
    state.location=coords;localStorage.setItem(LOCATION_KEY,'granted');
    const q=encodeURIComponent(coords.lat+','+coords.lng);
    const shareText=encodeURIComponent('SCD ColicoDerviese · '+coords.lat.toFixed(5)+','+coords.lng.toFixed(5));
    mount.innerHTML=`<div class="status-box"><b>Posizione disponibile sul dispositivo.</b><br>Precisione stimata: ${Math.round(coords.accuracy)} m. Le coordinate non sono state inviate alla SCD.</div><div class="mini-links"><a href="https://www.google.com/maps/search/?api=1&query=${q}" target="_blank" rel="noopener">APRI LA MIA POSIZIONE</a><a href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent('Centro Sportivo Comunale Colico Via Lido')}" target="_blank" rel="noopener">PERCORSO PER IL CENTRO SPORTIVO</a></div>`;
    track('feature_use',{section:'location_local_only'});
  },err=>{mount.innerHTML='<div class="notice error-note">Posizione non disponibile: '+esc(err.message||'permesso negato')+'</div>'},{enableHighAccuracy:false,timeout:10000,maximumAge:300000});
}
async function checkServiceHealth(){
  updateApiBadge('checking','Connessione…');
  const ctrl=new AbortController(),t=setTimeout(()=>ctrl.abort(),7000);
  try{
    const r=await fetch(HEALTH_API,{cache:'no-store',signal:ctrl.signal});
    if(!r.ok)throw new Error('health '+r.status);
    const j=await r.json();
    updateApiBadge('online','Servizi live');
    return j;
  }catch(e){
    updateApiBadge('partial','Modalità resiliente');
    return null;
  }finally{clearTimeout(t)}
}
const LISTENING_EVENTS=new Set(['page_view','cta_click','form_start','form_complete','form_abandon','api_error','client_error','slow_load','search_use','pwa_install','share','return_visit','notification_interaction','feature_use','feedback_submit']);
function track(type,detail={}){
  if(!LISTENING_EVENTS.has(type))return;
  try{
    const key='scd:listening:v1';
    const s=JSON.parse(localStorage.getItem(key)||'{"counts":{},"sections":{},"last":null}');
    s.counts[type]=(s.counts[type]||0)+1;
    if(detail.section){const sec=String(detail.section).slice(0,40);s.sections[sec]=(s.sections[sec]||0)+1}
    s.last=new Date().toISOString();
    localStorage.setItem(key,JSON.stringify(s));
  }catch{}
}
async function flushListening(){
  try{
    const key='scd:listening:v1',metrics=JSON.parse(localStorage.getItem(key)||'{}');
    if(!metrics.counts||!Object.keys(metrics.counts).length)return;
    await api('public.telemetry',{version:APP_VERSION,metrics});
    localStorage.removeItem(key);
  }catch{}
}

const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),2700)}
function modal(html){$('#modalBody').innerHTML=html;$('#modalBackdrop').hidden=false;document.body.style.overflow='hidden'}
function closeModal(){$('#modalBackdrop').hidden=true;document.body.style.overflow=''}
function fmtDate(v){if(!v)return 'Data in aggiornamento';const m=String(v).match(/^(\d{4})-(\d{2})-(\d{2})$/);if(m)return new Date(+m[1],+m[2]-1,+m[3]).toLocaleDateString('it-IT',{weekday:'long',day:'2-digit',month:'long'});const d=String(v).split(/[\/-]/);if(d.length===3&&d[0].length<=2)return `${d[0]}/${d[1]}/${d[2]}`;return String(v)}
function field(obj,...keys){for(const k of keys){if(obj&&obj[k]!=null&&String(obj[k]).trim())return obj[k]}return ''}
function displayValue(v,fallback=''){
  if(v==null||v==='')return fallback;
  if(['string','number','boolean'].includes(typeof v))return String(v);
  if(Array.isArray(v))return v.map(x=>displayValue(x,'')).filter(Boolean).join(' · ')||fallback;
  if(typeof v==='object'){
    for(const k of ['name','title','label','opponentName','teamName','clubName','company','value']){
      if(v[k]!=null&&String(v[k]).trim())return String(v[k]);
    }
  }
  return fallback;
}
async function api(action,payload={},sessionToken=''){
  const ctrl=new AbortController();const t=setTimeout(()=>ctrl.abort(),12000);
  const started=performance.now();
  try{
    const r=await fetch(API,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,payload,sessionToken}),signal:ctrl.signal});
    const j=await r.json().catch(()=>({ok:false,error:'Risposta server non valida'}));
    if(!r.ok||j.ok===false)throw new Error(j.error||'Servizio non disponibile');
    track('feature_use',{section:'api_'+action});
    return j.data??j;
  }catch(e){
    console.warn('[SCD API]',action,'failed',e?.message||e,'ms',Math.round(performance.now()-started));
    track('api_error',{section:action});
    throw e;
  }finally{clearTimeout(t)}
}
function normalizePublic(raw){
  if(!raw)return JSON.parse(JSON.stringify(FALLBACK));
  if(raw.public)return raw;
  const rows=Array.isArray(raw)?raw:(raw.items||raw.feed||raw.highlights||[]);
  const obj={season:raw.season||'2026/27',generatedAt:new Date().toLocaleString('it-IT'),public:{nextMatch:raw.nextMatch||null,lastResult:raw.lastResult||null,highlights:Array.isArray(rows)?rows:[],initiatives:raw.initiatives||raw.events||[],sponsors:raw.sponsors||[],counts:raw.counts||{}}};
  if(!obj.public.nextMatch&&Array.isArray(rows)){
    const sport=rows.filter(x=>/gara|campionato|coppa|amichevole|torneo/i.test([x.feedType,x.kind,x.type,x.category,x.title,x.subject,x.event].join(' ')));
    obj.public.nextMatch=sport.find(x=>!x.result&&!x.score&&(/prossim|convocat|in programma|campionato/i.test([x.status,x.title,x.message].join(' '))))||null;
    obj.public.lastResult=sport.find(x=>x.result||x.score||/risultat|finale/i.test([x.status,x.title,x.message].join(' ')))||null;
  }
  return obj;
}
async function loadSummary(silent=false){
  let base=null;
  try{base=normalizePublic(await api('public.feed',{limit:80}))}catch(e){const cached=localStorage.getItem('scd:r21:summary');base=cached?JSON.parse(cached):JSON.parse(JSON.stringify(FALLBACK))}
  const data=base||JSON.parse(JSON.stringify(FALLBACK));data.public=data.public||{};
  if(!Array.isArray(data.public.sponsors)||!data.public.sponsors.length)data.public.sponsors=FALLBACK.public.sponsors;
  state.summary=data;localStorage.setItem('scd:r21:summary',JSON.stringify(data));render(data);if(!silent)toast('Dati SCD aggiornati')
}
async function loadWeeklyNewsroom(silent=true){
  try{
    const r=await fetch(NEWSROOM_API,{cache:'no-store'});
    if(!r.ok)throw new Error('newsroom '+r.status);
    const j=await r.json();
    if(j.ok!==true)throw new Error(j.error||'Newsroom non disponibile');
    state.newsroom=j;
    localStorage.setItem('scd:newsroom:v1',JSON.stringify(j));
    if(!silent)toast('SCD Newsroom aggiornata');
    window.dispatchEvent(new CustomEvent('scd:newsroom',{detail:j}));
    return j;
  }catch(e){
    try{state.newsroom=JSON.parse(localStorage.getItem('scd:newsroom:v1')||'null')}catch{state.newsroom=null}
    return state.newsroom;
  }
}
function publicData(data){return (data&&data.public)||FALLBACK.public}
function renderHomeKpis(p){
  const counts=p.counts||{};
  const calendar=state.calendar||[];
  const today=clubDateKey(),weekEnd=new Date(clubNow().getTime()+7*86400000);
  const weekEndKey=new Intl.DateTimeFormat('en-CA',{timeZone:state.clubTimeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(weekEnd);
  const week=calendar.filter(x=>x.date&&String(x.date).slice(0,10)>=today&&String(x.date).slice(0,10)<=weekEndKey);
  const games=Number(counts.games||week.filter(x=>/gara|partita|campionato|coppa|amichevole|match/i.test([x.type,x.title].join(' '))).length||0);
  const training=Number(counts.trainings||counts.training||week.filter(x=>/allenament/i.test([x.type,x.title].join(' '))).length||0);
  const events=Number(counts.events||week.filter(x=>/evento|open day|riunione|torneo/i.test([x.type,x.title].join(' '))).length||0);
  const initiatives=Number(counts.initiatives||(p.initiatives||[]).length||0);
  const set=(id,v)=>{const el=$(id);if(el)el.textContent=String(v)};
  set('#kpiGames',games);set('#kpiTraining',training);set('#kpiEvents',events);set('#kpiInitiatives',initiatives);
}
function setActiveNav(name){
  document.querySelectorAll('.mobile-nav [data-nav]').forEach(el=>el.classList.toggle('active',el.dataset.nav===name));
}
function render(data){const p=publicData(data);document.querySelectorAll('[data-season]').forEach(el=>el.textContent=data.season||'2026/27');const updated=$('#updatedAt');if(updated)updated.textContent=data.generatedAt||'ora';renderHero(p);renderTicker(p);renderMatches(p);renderEvents(p);renderNews(p);renderSponsors(p);renderTodayAgenda();renderHomeKpis(p)}
function renderHero(p){const n=p.nextMatch||{};$('#nextDate').textContent=fmtDate(field(n,'date','data'));$('#nextTime').textContent=field(n,'time','ora')||'—';const opp=displayValue(field(n,'opponentName','opponent','avversario','title'),'Avversario');$('#nextOpponent').textContent=opp;$('#opponentBadge').textContent=opp.slice(0,1).toUpperCase();$('#nextVenue').textContent=field(n,'venue','luogo','field')||'Sede da aggiornare'}
function renderTicker(p){const h=p.highlights||[];$('#liveTicker').innerHTML='<span>'+esc(h.slice(0,5).map(x=>field(x,'title','subject','event')||'Aggiornamento SCD').join('  •  ')||'SCD ColicoDerviese · aggiornamenti in corso')+'</span>'}
function renderMatches(p){const n=p.nextMatch||{};const l=p.lastResult||{};const cards=[];if(Object.keys(n).length)cards.push(matchCard(n,'PROSSIMA GARA',false));if(Object.keys(l).length)cards.push(matchCard(l,'ULTIMO RISULTATO',true));const extras=(p.highlights||[]).filter(x=>/gara|match|risultat/i.test([x.feedType,x.title,x.subject].join(' '))).slice(0,2);extras.forEach((x,i)=>cards.push(`<article class="match-card"><span class="tag">AGGIORNAMENTO GARA</span><h3>${esc(field(x,'title','subject')||'SCD ColicoDerviese')}</h3><p>${esc(field(x,'message','venue','status')||'Aggiornamento disponibile')}</p><div class="scoreline"><small>${esc(fmtDate(field(x,'date')))}</small><strong>→</strong></div></article>`));if(!cards.length)cards.push('<article class="match-card"><span class="tag">CALENDARIO SCD</span><h3>Dati gara in sincronizzazione</h3><p>La Super App non mostra partite inventate. Apri il calendario ufficiale o aggiorna tra poco.</p><div class="scoreline"><small>Fonte: SCD / federazione</small><strong>↻</strong></div></article>');$('#matchGrid').innerHTML=cards.join('')}
function matchCard(x,label,result){const opp=displayValue(field(x,'opponentName','opponent','avversario','title'),'Avversario');const team=displayValue(field(x,'team','teamName'),'SCD ColicoDerviese');const score=displayValue(field(x,'result','score','risultato'),'');return `<article class="match-card ${result?'result':''}"><span class="tag">${label}</span><h3>${esc(team)} · ${esc(opp)}</h3><p>${esc(fmtDate(field(x,'date','data')))}${field(x,'time','ora')?' · '+esc(field(x,'time','ora')):''}</p><div class="scoreline"><small>${esc(field(x,'venue','luogo','field')||'Sede da aggiornare')}</small><strong>${esc(score||'VS')}</strong></div></article>`}
function eventImage(x,i){return field(x,'image','imageUrl','featuredImage')||(i===0?'/assets/event-insieme.webp':'')}
function renderEvents(p){const rows=(p.initiatives||[]).slice(0,5);const use=rows.length?rows:FALLBACK.public.initiatives;$('#eventGrid').innerHTML=use.slice(0,3).map((x,i)=>{const img=eventImage(x,i);const title=field(x,'title','event','name')||'Evento SCD';const url=field(x,'registrationUrl','url','link');return `<article class="event-card ${i===0?'feature':''}">${img?`<img src="${esc(img)}" alt="${esc(title)}" loading="lazy">`:''}<div class="event-shade"></div><div class="event-content"><span class="event-type">${esc(field(x,'type','kind','status')||'EVENTO SCD')}</span><h3>${esc(title)}</h3><p>${esc([fmtDate(field(x,'date')),field(x,'time'),field(x,'venue','luogo')].filter(Boolean).join(' · '))}</p><div class="event-actions">${url?`<a class="go" href="${esc(url)}" target="_blank" rel="noopener">ISCRIVITI</a>`:`<button class="go" data-event-register="${esc(title)}">SCOPRI</button>`}<button class="share" data-share="${esc(title)}">CONDIVIDI</button></div></div></article>`}).join('');bindDynamic()}
function renderNews(p){const rows=(p.highlights||[]).slice(0,6);const use=rows.length?rows:FALLBACK.public.highlights;const f=use[0]||{};$('#featureNews').innerHTML=`<span class="news-source">${esc(field(f,'source','feedType')||'SCD PULSE')}</span><h3>${esc(field(f,'title','subject','event')||'Aggiornamento SCD')}</h3><p>${esc(field(f,'message','excerpt','venue')||'Informazioni societarie e territoriali in aggiornamento.')}</p>`;$('#newsList').innerHTML=use.slice(1,6).map(x=>`<div class="news-row"><span class="news-icon">${/urgent|variaz|cambio/i.test([x.status,x.feedType,x.title].join(' '))?'!':'◉'}</span><span><b>${esc(field(x,'title','subject','event')||'Aggiornamento')}</b><small>${esc(field(x,'message','venue','status')||field(x,'feedType')||'SCD')}</small></span><time>${esc(field(x,'date','time')||'')}</time></div>`).join('')}
function renderSponsors(p){const rows=(p.sponsors||[]).slice(0,12);const use=rows.length?rows:FALLBACK.public.sponsors;$('#sponsorGrid').innerHTML=use.slice(0,8).map(x=>{const name=field(x,'name','sponsor','company','title')||'Partner SCD';const logo=field(x,'logo','logoUrl','image');const url=field(x,'url','website','link');const inner=logo?`<img src="${esc(logo)}" alt="${esc(name)}" loading="lazy">`:`<span>${esc(name)}</span>`;return url?`<a class="sponsor-card" href="${esc(url)}" target="_blank" rel="noopener">${inner}</a>`:`<div class="sponsor-card">${inner}</div>`}).join('');const names=use.map(x=>field(x,'name','sponsor','company','title')||'Partner SCD');const text=(names.length?names:['SCD Partner']).join('   ◆   ');$('#sponsorTrack').innerHTML=`<span>${esc(text)}   ◆   ${esc(text)}</span>`}
function openRegister(){modal(`<span class="eyebrow">SCD COMMUNITY</span><h2>Registrati</h2><p>Crei un solo account SCD. Entri sempre come Utente Base e continui a ricevere news, gare, eventi, community e servizi. Se fai parte della Società, la Direzione abiliterà in seguito le funzioni dedicate senza creare un secondo account.</p><form id="registerForm"><div class="form-grid"><div class="field"><label>Nome</label><input id="regName" required autocomplete="given-name"></div><div class="field"><label>Cognome</label><input id="regSurname" required autocomplete="family-name"></div><div class="field"><label>Email</label><input id="regEmail" type="email" required autocomplete="email"></div><div class="field"><label>Telefono</label><input id="regPhone" type="tel" required inputmode="tel" autocomplete="tel"></div><div class="field full"><label class="check"><input id="regPrivacy" type="checkbox" required> <span>Ho letto l’informativa privacy e autorizzo il trattamento dei dati necessari alla registrazione e alla gestione dell’accesso SCD.</span></label></div></div><div id="regStatus"></div><div class="modal-actions"><button type="button" class="outline" id="cancelReg">ANNULLA</button><button class="primary" type="submit">REGISTRATI</button></div></form>`);$('#cancelReg').onclick=closeModal;$('#registerForm').onsubmit=submitRegistration}
function registrationProfile(){try{return JSON.parse(localStorage.getItem('scd:last-registration')||'{}')}catch{return {}}}
function saveRegistrationProfile(p){localStorage.setItem('scd:last-registration',JSON.stringify({firstName:p.firstName||'',lastName:p.lastName||'',email:p.email||'',phone:p.phone||'',savedAt:new Date().toISOString()}))}
async function submitRegistration(e){
  e.preventDefault();const btn=e.currentTarget.querySelector('[type="submit"]');btn.disabled=true;btn.textContent='REGISTRAZIONE…';
  const payload={name:`${$('#regName').value.trim()} ${$('#regSurname').value.trim()}`.trim(),firstName:$('#regName').value.trim(),lastName:$('#regSurname').value.trim(),email:$('#regEmail').value.trim(),phone:$('#regPhone').value.trim(),type:'UTENTE REGISTRATO',privacy:true};
  saveRegistrationProfile(payload);
  const localId=requestId('REG');upsertLocalRequest({id:localId,kind:'registration',topic:'Registrazione Utente Base',status:'IN INVIO',channel:'APP',createdAt:new Date().toISOString()});
  try{
    const r=await api('public.register',payload);
    upsertLocalRequest({id:localId,status:'INVIATA',serverId:r.id||r.requestId||'',channel:'GESTIONALE'});
    $('#regStatus').innerHTML=`<div class="status-box"><b>Registrazione completata.</b><br>${esc(r.message||'Profilo base registrato. Il tuo profilo resta Utente Base. La Direzione potrà aggiungere in seguito eventuali funzioni dedicate sullo stesso account.')}</div><div class="choice-grid onboarding-next"><button class="choice-tile" id="linkAthleteAfterReg"><b>Collega un tesserato</b><small>Richiedi l’associazione al profilo atleta/famiglia</small></button><button class="choice-tile" id="openProfileAfterReg"><b>Apri il profilo</b><small>Richieste, servizi e area riservata</small></button></div>`;
    btn.hidden=true;$('#cancelReg').textContent='CHIUDI';
    const link=$('#linkAthleteAfterReg'),profile=$('#openProfileAfterReg');if(link)link.onclick=openTesseratoLink;if(profile)profile.onclick=openProfile;
  }catch(err){
    upsertLocalRequest({id:localId,status:'DA COMPLETARE',channel:'EMAIL'});
    const subj=encodeURIComponent('REGISTRAZIONE SUPER APP SCD');const body=encodeURIComponent(`Nome: ${payload.firstName} ${payload.lastName}\nEmail: ${payload.email}\nTelefono: ${payload.phone}\nPrivacy: SI`);
    $('#regStatus').innerHTML=`<div class="status-box" style="background:#fff8dd;color:#6c5200"><b>Registrazione pronta.</b><br>Il bridge diretto al gestionale non ha confermato il salvataggio. Per non perdere la richiesta puoi inviarla alla Segreteria.<br><br><a class="primary compact" href="mailto:${PUBLIC_CONTACTS.general}?subject=${subj}&body=${body}">INVIA ALLA SEGRETERIA</a></div>`;btn.hidden=true;$('#cancelReg').textContent='CHIUDI';
  }
}
function openTesseratoLink(){
  const p=registrationProfile(),s=storedSession(),email=p.email||s.email||'',phone=p.phone||'';
  modal(`<span class="eyebrow">ACCOUNT UNICO SCD</span><h2>Collega un tesserato</h2><p>Questa richiesta non crea un secondo account e non assegna automaticamente permessi. La Segreteria/Direzione verifica il collegamento e poi abilita Atleta o Famiglia sullo stesso profilo.</p><form id="tesseratoLinkForm"><div class="form-grid"><div class="field"><label>Nome atleta</label><input id="tlFirst" required></div><div class="field"><label>Cognome atleta</label><input id="tlLast" required></div><div class="field"><label>Anno di nascita</label><input id="tlYear" inputmode="numeric" maxlength="4" placeholder="es. 2012" required></div><div class="field"><label>Relazione</label><select id="tlRelation"><option>Genitore / Tutore</option><option>Atleta</option><option>Altro soggetto autorizzato</option></select></div><div class="field"><label>Email account SCD</label><input id="tlEmail" type="email" value="${esc(email)}" required></div><div class="field"><label>Telefono</label><input id="tlPhone" type="tel" value="${esc(phone)}" required></div><div class="field full"><label>Squadra / categoria (se nota)</label><input id="tlTeam" placeholder="Facoltativo"></div><div class="field full"><label class="check"><input id="tlConfirm" type="checkbox" required> <span>Confermo di essere autorizzato a richiedere il collegamento di questo profilo atleta.</span></label></div></div><div id="tlStatus"></div><div class="modal-actions"><button type="button" class="outline" id="tlCancel">ANNULLA</button><button class="primary" type="submit">INVIA RICHIESTA</button></div></form>`);
  $('#tlCancel').onclick=openProfile;
  $('#tesseratoLinkForm').onsubmit=async e=>{
    e.preventDefault();const btn=e.currentTarget.querySelector('[type="submit"]'),first=$('#tlFirst').value.trim(),last=$('#tlLast').value.trim(),year=$('#tlYear').value.trim(),relation=$('#tlRelation').value,mail=$('#tlEmail').value.trim(),tel=$('#tlPhone').value.trim(),team=$('#tlTeam').value.trim();
    btn.disabled=true;btn.textContent='INVIO…';
    const localId=requestId('TESS');upsertLocalRequest({id:localId,kind:'tesseramento',topic:'Collegamento tesserato '+first+' '+last,status:'IN INVIO',channel:'APP',createdAt:new Date().toISOString()});
    try{
      const rr=await api('public.registration',{kind:'registration',name:(first+' '+last).trim(),email:mail,phone:tel,topic:'Richiesta collegamento tesserato',message:'Atleta: '+first+' '+last+' · Anno: '+year+' · Relazione: '+relation+(team?' · Squadra/Categoria: '+team:''),team,privacy:true});
      upsertLocalRequest({id:localId,status:'INVIATA',serverId:rr.id||rr.requestId||'',channel:'GESTIONALE'});
      $('#tlStatus').innerHTML='<div class="status-box"><b>Richiesta registrata.</b><br>Resta Utente Base finché la Direzione non verifica il collegamento. Potrai controllare lo stato in “Le mie richieste”.</div>';btn.hidden=true;
    }catch(err){upsertLocalRequest({id:localId,status:'DA COMPLETARE',channel:'APP'});$('#tlStatus').innerHTML='<div class="notice error-note"><b>Richiesta non confermata dal gestionale.</b><br>'+esc(err.message||'Riprova tra poco.')+'</div>';btn.disabled=false;btn.textContent='RIPROVA'}
  };
}
function storedSession(){
  try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'{}')}catch{return {}}
}
function saveSession(token,email){
  state.sessionToken=token||'';
  localStorage.setItem(SESSION_KEY,JSON.stringify({token:token||'',email:email||'',savedAt:new Date().toISOString()}));
}
function clearSession(){
  state.sessionToken='';state.privateData=null;localStorage.removeItem(SESSION_KEY);
}
async function mgmtApi(action,payload={}){
  if(!state.sessionToken)throw new Error('Sessione non disponibile');
  return api(action,payload,state.sessionToken);
}
async function loadDataFabricStatus(force=false){
  if(!featureEnabled('dataFabricObservability'))throw new Error('Osservabilità Data Fabric disattivata');
  if(!state.sessionToken)throw new Error('Sessione Direzione non disponibile');
  const cached=state.dataFabricStatus;
  if(!force&&cached&&Date.now()-Number(cached.loadedAt||0)<30000)return cached.data;
  try{
    const data=await mgmtApi('direction.datafabric.status');
    state.dataFabricStatus={data,loadedAt:Date.now()};
    state.dataFabricError='';
    return data;
  }catch(e){
    state.dataFabricError=String(e&&e.message?e.message:e);
    throw e;
  }
}
function privateTeams(d=state.privateData||{}){
  const src=(d.attendance&&d.attendance.teams)||d.teams||d.visibleTeams||[];
  const seen=new Set();
  return src.map(t=>({key:t.key||t.teamKey||t.id||t.value||'',name:t.name||t.teamName||t.label||t.key||''}))
    .filter(t=>t.key&&!seen.has(t.key)&&(seen.add(t.key),true));
}
function mgmtKpi(label,value){return '<div class="mgmt-kpi"><strong>'+esc(value??0)+'</strong><span>'+esc(label)+'</span></div>'}
function managementRole(d){
  const u=d.user||{};
  return u.role||u.coreRole||u.type||((d.permissions&&d.permissions.direction)?'DIREZIONE':u.staff?'STAFF':'UTENTE BASE');
}
function managementName(d){
  const u=d.user||{};
  return u.name||u.fullName||u.email||'Profilo SCD';
}
async function openLogin(){
  const saved=storedSession();
  modal('<span class="eyebrow">AREA RISERVATA SCD</span><h2>Accedi con il tuo account</h2><p>Usa la stessa email del profilo SCD e il PIN personale assegnato o impostato dalla Direzione.</p><form id="mgmtLoginForm"><div class="form-grid"><div class="field full"><label>Email</label><input id="mgmtEmail" type="email" required autocomplete="email" value="'+esc(saved.email||'')+'"></div><div class="field full"><label>PIN personale</label><input id="mgmtPin" type="password" inputmode="numeric" minlength="6" maxlength="10" required autocomplete="current-password"></div></div><div id="mgmtLoginStatus" class="form-status"></div><div class="modal-actions"><button type="button" class="outline" id="mgmtLegacy">AREA R20 TEMPORANEA</button><button class="primary" type="submit">ACCEDI</button></div></form>');
  $('#mgmtLegacy').onclick=()=>window.open(R20_APP,'_blank','noopener,noreferrer');
  $('#mgmtLoginForm').onsubmit=async e=>{
    e.preventDefault();
    const email=$('#mgmtEmail').value.trim(),pin=$('#mgmtPin').value.trim(),status=$('#mgmtLoginStatus'),btn=e.currentTarget.querySelector('[type="submit"]');
    btn.disabled=true;status.textContent='Verifico credenziali e permessi…';
    try{
      const pre=await api('auth.request',{email});
      if(pre&&pre.pinReady===false)throw new Error(pre.message||'PIN personale non ancora disponibile.');
      const r=await api('auth.login',{email,pin});
      const token=r.token||r.sessionToken||'';
      if(!token)throw new Error('Il server non ha restituito una sessione valida.');
      saveSession(token,email);
      state.privateData=r.data||await mgmtApi('dashboard.summary');
      track('feature_use',{section:'private_login'});
      openManagementHome(state.privateData);
    }catch(err){
      status.innerHTML='<b>Accesso non completato.</b> '+esc(err.message||'Servizio temporaneamente non disponibile.')+'<br><small>Finché il bridge R21 non è attivo puoi usare “Area R20 temporanea”.</small>';
    }finally{btn.disabled=false}
  };
}
function managementDetailHtml(d){
  const personal=d.personal||[],conv=d.convocations||[],pending=d.pendingPlayerAuthorizations||[],dir=d.direction||{};
  let html='';
  if(personal.length){
    html+='<section class="mgmt-detail"><div class="mgmt-section-title"><h3>Profili collegati</h3><span>'+personal.length+'</span></div><div class="mgmt-profile-mini">'+personal.slice(0,4).map(p=>'<article><b>'+esc([p.firstName,p.lastName].filter(Boolean).join(' ')||p.fullName||'Atleta')+'</b><small>'+esc(p.teamName||p.group||'')+'</small><div><em>'+esc(p.figcStatus||'FIGC da verificare')+'</em><em>'+esc(p.certificateStatus||p.certificateExpiry||'Certificato da verificare')+'</em></div></article>').join('')+'</div></section>';
  }
  if(conv.length){
    html+='<section class="mgmt-detail"><div class="mgmt-section-title"><h3>Convocazioni</h3><span>'+conv.length+'</span></div><div class="mgmt-conv-list">'+conv.slice(0,5).map(x=>'<article><div><b>'+esc(x.team||x.teamName||x.player||'Convocazione')+'</b><small>'+esc([x.date,x.meetingTime,x.meetingPlace].filter(Boolean).join(' · '))+'</small><em>'+esc(x.response||'DA CONFERMARE')+'</em></div><div class="mgmt-reply-actions"><button data-mgmt-reply="PRESENTE" data-conv="'+esc(x.id||x.convocationId||'')+'" data-player="'+esc(x.playerCode||'')+'">PRESENTE</button><button class="no" data-mgmt-reply="ASSENTE" data-conv="'+esc(x.id||x.convocationId||'')+'" data-player="'+esc(x.playerCode||'')+'">ASSENTE</button></div></article>').join('')+'</div></section>';
  }
  if(pending.length){
    html+='<section class="mgmt-detail direction-detail"><div class="mgmt-section-title"><h3>Autorizzazioni da decidere</h3><span>'+pending.length+'</span></div><div class="mgmt-auth-list">'+pending.slice(0,6).map(x=>'<article><div><b>'+esc(x.player||x.playerId||'Atleta')+'</b><small>'+esc(x.action||'Autorizzazione')+' · '+esc(x.requester||x.email||'')+'</small><p>'+esc(x.motivation||'')+'</p></div><div class="mgmt-reply-actions"><button data-auth-decision="approve" data-auth-id="'+esc(x.id||x.authId||'')+'">APPROVA</button><button class="no" data-auth-decision="reject" data-auth-id="'+esc(x.id||x.authId||'')+'">RESPINGI</button></div></article>').join('')+'</div></section>';
  }
  if((dir.requests||[]).length){
    html+='<section class="mgmt-detail"><div class="mgmt-section-title"><h3>Richieste operative</h3><span>'+dir.requests.length+'</span></div><div class="mgmt-request-list">'+dir.requests.slice(0,6).map(x=>'<article><b>'+esc(x.subject||x.type||x.id||'Richiesta')+'</b><small>'+esc(x.status||'APERTA')+' · '+esc(x.team||x.area||'')+'</small></article>').join('')+'</div></section>';
  }
  return html;
}
function openManagementHome(data){
  const d=data||state.privateData||{},u=d.user||{},p=d.permissions||{},personal=d.personal||[];
  state.privateData=d;
  const staff=!!u.staff,dir=!!p.direction,transport=(d.transport&&d.transport.kpis)||{};
  const cards=[
    '<button class="mgmt-tile" id="mgmtRequests"><span>☑</span><b>Le mie richieste</b><small>Invii e stato</small></button>',
    '<button class="mgmt-tile" id="mgmtNewRequest"><span>＋</span><b>Richiesta interna</b><small>Pratica al Club</small></button>',
    '<button class="mgmt-tile" id="mgmtPin"><span>⌘</span><b>PIN personale</b><small>Cambia credenziale</small></button>',
    personal.length?'<button class="mgmt-tile" id="mgmtProfiles"><span>●</span><b>Atleta / Famiglia</b><small>'+personal.length+' profili collegati</small></button>':'',
    staff?'<button class="mgmt-tile" id="mgmtAttendance"><span>✓</span><b>Presenze</b><small>Registro squadra</small></button>':'',
    staff?'<button class="mgmt-tile" id="mgmtConvocations"><span>⚽</span><b>Convocazioni</b><small>Crea e gestisci</small></button>':'',
    staff?'<button class="mgmt-tile" id="mgmtMessages"><span>✉</span><b>Comunicazioni</b><small>Messaggi squadra</small></button>':'',
    staff||d.transport?'<button class="mgmt-tile" id="mgmtTransport"><span>▰</span><b>Pulmini</b><small>Richieste trasporto</small></button>':'',
    dir?'<button class="mgmt-tile direction" id="mgmtAccess"><span>♙</span><b>Utenti & PIN</b><small>Permessi Direzione</small></button>':'',
    dir?'<button class="mgmt-tile direction" id="mgmtEvolution"><span>↗</span><b>Evolution Queue</b><small>Miglioramenti e priorità</small></button>':'',
    dir?'<button class="mgmt-tile direction" id="mgmtDiagnostics"><span>⌁</span><b>Diagnostica</b><small>Stato tecnico</small></button>':''
  ].filter(Boolean).join('');
  const dashLabel=dir?'AREA STAFF / DIREZIONE':staff?'AREA STAFF':'AREA RISERVATA';const dashTitle=dir?'Direzione ColicoDerviese':staff?'Staff ColicoDerviese':managementName(d);modal('<div class="mgmt-head"><div><span class="eyebrow">'+dashLabel+'</span><h2>'+esc(dashTitle)+'</h2><p>'+esc(managementName(d))+' · '+esc(managementRole(d))+(u.area?' · '+esc(u.area):'')+'</p></div><img src="./assets/logo-scd.png" alt="SCD"></div><div class="mgmt-kpis">'+mgmtKpi('Profili',personal.length)+mgmtKpi('Convocazioni',(d.convocations||[]).length)+mgmtKpi('Richieste',(d.direction&&d.direction.requests||[]).length)+mgmtKpi('Pulmini',transport.requests||0)+'</div><div class="mgmt-grid">'+cards+'</div>'+managementDetailHtml(d)+'<div class="modal-actions"><button class="outline" id="mgmtSync">SINCRONIZZA</button><button class="outline danger-soft" id="mgmtLogout">ESCI</button></div>');
  $('#mgmtRequests').onclick=openMyRequests;
  $('#mgmtNewRequest').onclick=openInternalRequestManager;
  $('#mgmtPin').onclick=openPinManager;
  $('#mgmtProfiles')&&($('#mgmtProfiles').onclick=()=>openAthleteFamilyView(d,0));
  $('#mgmtAttendance')&&($('#mgmtAttendance').onclick=openAttendanceManager);
  $('#mgmtConvocations')&&($('#mgmtConvocations').onclick=openConvocationManager);
  $('#mgmtMessages')&&($('#mgmtMessages').onclick=openMessageManager);
  $('#mgmtTransport')&&($('#mgmtTransport').onclick=openTransportManager);
  $('#mgmtAccess')&&($('#mgmtAccess').onclick=openAccessManager);
  $('#mgmtEvolution')&&($('#mgmtEvolution').onclick=openEvolutionManager);
  $('#mgmtDiagnostics')&&($('#mgmtDiagnostics').onclick=openDiagnosticsManager);
  $$('[data-mgmt-reply]').forEach(b=>b.onclick=async()=>{try{await mgmtApi('private.convocation.reply',{id:b.dataset.conv,player:b.dataset.player,response:b.dataset.mgmtReply});toast('Risposta registrata: '+b.dataset.mgmtReply);state.privateData=await mgmtApi('dashboard.summary');openManagementHome(state.privateData)}catch(e){toast(e.message||'Risposta non registrata')}});
  $$('[data-auth-decision]').forEach(b=>b.onclick=async()=>{try{const action=b.dataset.authDecision==='approve'?'direction.player.approve':'direction.player.reject';await mgmtApi(action,{authId:b.dataset.authId});toast(b.dataset.authDecision==='approve'?'Autorizzazione approvata':'Autorizzazione respinta');state.privateData=await mgmtApi('dashboard.summary');openManagementHome(state.privateData)}catch(e){toast(e.message||'Operazione non riuscita')}});
  $('#mgmtSync').onclick=async()=>{try{state.privateData=await mgmtApi('dashboard.summary');toast('Area aggiornata');openManagementHome(state.privateData)}catch(e){toast(e.message||'Sincronizzazione non riuscita')}};
  $('#mgmtLogout').onclick=()=>{clearSession();closeModal();toast('Sessione chiusa')};
}
function openAthleteFamilyView(d=state.privateData||{},index=0){
  const rows=d.personal||[];if(!rows.length)return toast('Nessun profilo atleta collegato');
  const p=rows[Math.max(0,Math.min(index,rows.length-1))]||rows[0],u=d.user||{};
  const fullName=[p.firstName,p.lastName].filter(Boolean).join(' ')||p.fullName||'Atleta SCD';
  const key=String(p.code||p.playerCode||p.personId||p.id||'');
  const conv=(d.convocations||[]).filter(x=>!key||String(x.playerCode||x.personId||x.playerId||'')===key||String(x.player||'').toLowerCase().includes(fullName.toLowerCase())).slice(0,4);
  const next=conv[0]||null;
  const payment=displayValue(p.paymentStatus||p.payment||p.feeStatus||'','Dato in aggiornamento');
  const cert=displayValue(p.certificateStatus||p.certificateExpiry||'','Dato in aggiornamento');
  const figc=displayValue(p.figcStatus||p.recordStatus||'','Dato in aggiornamento');
  const identity=displayValue(p.identityStatus||p.idDocumentStatus||'','Dato in aggiornamento');
  const initials=esc(((p.firstName||fullName||'?')[0]+(p.lastName||'')[0]).toUpperCase());
  const avatar=p.photoUrl?'<img src="'+esc(p.photoUrl)+'" alt="">':'<span>'+initials+'</span>';
  const selector=rows.map((x,i)=>{const name=[x.firstName,x.lastName].filter(Boolean).join(' ')||x.fullName||('Atleta '+(i+1));const ini=esc(((x.firstName||name||'?')[0]+(x.lastName||'')[0]).toUpperCase());return '<button class="family-profile '+(i===index?'active':'')+'" data-family-index="'+i+'"><span class="family-avatar">'+(x.photoUrl?'<img src="'+esc(x.photoUrl)+'" alt="">':ini)+'</span><b>'+esc(name.split(' ')[0])+'</b><small>'+esc(x.teamName||x.group||'')+'</small></button>'}).join('');
  modal('<section class="reserved-app-screen"><header class="reserved-app-head"><div class="reserved-app-brand"><img src="./assets/logo-scd.png" alt="SCD"><div><b>Area Riservata</b><p>'+esc(fullName)+(p.teamName?' · '+esc(p.teamName):'')+'</p></div></div></header><div class="reserved-tabs role-tabs"><button class="'+(rows.length===1?'active':'')+'" data-role-view="athlete">Atleta</button><button class="'+(rows.length>1?'active':'')+'" data-role-view="family">Famiglia</button>'+(u.staff?'<button data-role-view="staff">Staff</button>':'<button disabled>Staff</button>')+'</div>'+(rows.length>1?'<section class="family-profiles"><div class="family-title"><h3>I profili collegati</h3><small>'+rows.length+' profili</small></div><div class="family-profile-strip">'+selector+'</div></section>':'')+'<article class="athlete-hero"><div class="athlete-avatar">'+avatar+'</div><div class="athlete-copy"><small>PROFILO ATLETA</small><h3>'+esc(fullName)+'</h3><p>'+esc(p.teamName||p.group||'Squadra in aggiornamento')+'</p><span class="status-pill '+(/tesserat|attiv|valido/i.test(figc)?'ok':'')+'">'+esc(figc)+'</span></div><div class="athlete-number">'+esc(p.number||p.shirtNumber||'')+'</div></article><div class="reserved-action-grid"><button id="reservedConv"><span>▣</span><b>Convocazioni</b><small>'+conv.length+' disponibili</small></button><button id="reservedPayments"><span>▰</span><b>Pagamenti</b><small>'+esc(payment)+'</small></button><button id="reservedDocs"><span>▤</span><b>Documenti</b><small>Stato personale</small></button><button id="reservedMessages"><span>✉</span><b>Messaggi</b><small>Comunicazioni</small></button><button id="reservedTransport"><span>▰</span><b>Pulmino</b><small>Trasporti</small></button><button id="reservedProfile"><span>●</span><b>Il mio profilo</b><small>Dati collegati</small></button></div>'+(next?'<section class="reserved-block"><div class="reserved-block-head"><h3>Prossima convocazione</h3><small>'+esc(next.response||'DA CONFERMARE')+'</small></div><article class="reserved-next"><time><b>'+esc(fmtDate(next.date||''))+'</b><small>'+esc(next.meetingTime||'')+'</small></time><div><b>'+esc(next.team||next.teamName||'Convocazione SCD')+'</b><small>'+esc(next.meetingPlace||'Luogo in aggiornamento')+'</small></div><span>›</span></article></section>':'')+'<section class="reserved-block"><div class="reserved-block-head"><h3>I miei documenti</h3><small>Stato R20</small></div><div class="reserved-docs"><article><span>▤</span><div><b>Certificato medico</b><small>'+esc(cert)+'</small></div></article><article><span>▣</span><div><b>Tesseramento FIGC</b><small>'+esc(figc)+'</small></div></article><article><span>▰</span><div><b>Documento identità</b><small>'+esc(identity)+'</small></div></article></div></section><a class="reserved-shop" href="https://colicoderviese.webnova.it/shop" target="_blank" rel="noopener"><div><small>CLUB SHOP</small><b>Kit ufficiale e abbigliamento</b></div><span>VAI ALLO SHOP →</span></a><div class="modal-actions"><button class="outline" id="reservedBack">DASHBOARD</button></div></section>');
  document.querySelectorAll('[data-family-index]').forEach(b=>b.onclick=()=>openAthleteFamilyView(d,Number(b.dataset.familyIndex||0)));
  document.querySelectorAll('[data-role-view]').forEach(b=>b.onclick=()=>{if(b.dataset.roleView==='staff'&&u.staff)openManagementHome(d);else if(b.dataset.roleView==='athlete'&&rows.length)openAthleteFamilyView(d,0);else if(b.dataset.roleView==='family')openAthleteFamilyView(d,index)});
  const back=$('#reservedBack'),convBtn=$('#reservedConv'),payBtn=$('#reservedPayments'),docsBtn=$('#reservedDocs'),msgBtn=$('#reservedMessages'),transportBtn=$('#reservedTransport'),profileBtn=$('#reservedProfile');
  if(back)back.onclick=()=>openManagementHome(d);
  if(convBtn)convBtn.onclick=()=>{if(!next)return toast('Convocazioni in aggiornamento');modal('<span class="eyebrow">CONVOCAZIONE</span><h2>'+esc(next.team||next.teamName||'Convocazione SCD')+'</h2><p>'+esc([fmtDate(next.date||''),next.meetingTime,next.meetingPlace].filter(Boolean).join(' · '))+'</p><div class="status-box"><b>Stato:</b> '+esc(next.response||'DA CONFERMARE')+'</div><div class="modal-actions"><button class="primary" id="convBackReserved">TORNA AL PROFILO</button></div>');const back=$('#convBackReserved');if(back)back.onclick=()=>openAthleteFamilyView(d,index)};
  if(payBtn)payBtn.onclick=()=>toast('Stato pagamenti: '+payment);
  if(docsBtn)docsBtn.onclick=()=>toast('Documenti sincronizzati dal gestionale SCD');
  if(msgBtn)msgBtn.onclick=u.staff?openMessageManager:openCommunicationsHub;
  if(transportBtn)transportBtn.onclick=openTransportManager;
  if(profileBtn)profileBtn.onclick=()=>openPersonalProfiles(d);
}
function openPersonalProfiles(d=state.privateData||{}){
  const rows=d.personal||[];
  modal('<span class="eyebrow">PROFILI COLLEGATI</span><h2>Atleti e famiglia</h2><div class="personal-profile-list">'+(rows.length?rows.map(p=>'<article class="personal-profile-card"><div class="profile-cutout">'+(p.photoUrl?'<img src="'+esc(p.photoUrl)+'" alt="">':'<span>'+esc(((p.firstName||'?')[0]+(p.lastName||'')[0]).toUpperCase())+'</span>')+'</div><div><b>'+esc([p.firstName,p.lastName].filter(Boolean).join(' ')||p.fullName||'Atleta')+'</b><small>'+esc(p.teamName||p.group||'')+'</small><em>'+esc(p.figcStatus||p.recordStatus||'Dato in aggiornamento')+'</em></div></article>').join(''):'<div class="empty-state">Nessun profilo collegato.</div>')+'</div><div class="modal-actions"><button class="primary" id="personalBack">TORNA ALLA DASHBOARD</button></div>');
  $('#personalBack').onclick=()=>openManagementHome(d);
}
async function openAttendanceManager(){
  const d=state.privateData||{},teams=privateTeams(d);
  if(!teams.length)return toast('Nessuna squadra disponibile per il tuo profilo');
  const today=new Date().toISOString().slice(0,10);
  modal('<span class="eyebrow">STAFF</span><h2>Registro presenze</h2><div class="form-grid"><div class="field"><label>Squadra</label><select id="attTeam">'+teams.map(t=>'<option value="'+esc(t.key)+'">'+esc(t.name)+'</option>').join('')+'</select></div><div class="field"><label>Data</label><input id="attDate" type="date" value="'+today+'"></div></div><div class="modal-actions"><button class="primary" id="attLoad">CARICA ROSA</button></div><div id="attRows"></div>');
  $('#attLoad').onclick=async()=>{
    const mount=$('#attRows');mount.innerHTML='<div class="loading-line">Carico registro…</div>';
    try{
      const r=await mgmtApi('private.attendance.get',{teamKey:$('#attTeam').value,date:$('#attDate').value});
      const statuses=r.statuses||['PRESENTE','ASSENTE','GIUSTIFICATO','INFORTUNATO','RITARDO'];
      mount.innerHTML='<div class="attendance-list">'+(r.players||[]).map(p=>'<label class="attendance-row"><span><b>'+esc(p.name||p.fullName||p.code)+'</b><small>'+esc(p.code||'')+'</small></span><select data-att-person="'+esc(p.code||p.personId)+'">'+[''].concat(statuses).map(s=>'<option value="'+esc(s)+'" '+(s===p.status?'selected':'')+'>'+(s||'SELEZIONA')+'</option>').join('')+'</select></label>').join('')+'</div><div class="modal-actions"><button class="primary" id="attSave">SALVA PRESENZE</button></div>';
      $('#attSave').onclick=async()=>{
        const rows=$$('[data-att-person]').filter(x=>x.value).map(x=>({personId:x.dataset.attPerson,status:x.value}));
        if(!rows.length)return toast('Seleziona almeno una presenza');
        try{await mgmtApi('private.attendance.save',{teamKey:$('#attTeam').value,date:$('#attDate').value,eventType:'ALLENAMENTO',rows});toast('Presenze salvate: '+rows.length)}catch(e){toast(e.message||'Salvataggio non riuscito')}
      };
    }catch(e){mount.innerHTML='<div class="notice error-note">'+esc(e.message||'Registro non disponibile')+'</div>'}
  };
}
function openInternalRequestManager(){
  const teams=privateTeams();
  modal('<span class="eyebrow">AREA PERSONALE</span><h2>Nuova richiesta interna</h2><form id="internalRequestForm"><div class="form-grid"><div class="field"><label>Tipo</label><select id="irType"><option>INFORMAZIONE</option><option>DOCUMENTO</option><option>TESSERAMENTO</option><option>AMMINISTRAZIONE</option><option>SPORTIVO</option><option>ALTRO</option></select></div><div class="field"><label>Squadra / area</label><select id="irTeam"><option value="">Generale</option>'+teams.map(t=>'<option value="'+esc(t.key)+'">'+esc(t.name)+'</option>').join('')+'</select></div><div class="field full"><label>Oggetto</label><input id="irSubject" required></div><div class="field full"><label>Messaggio</label><textarea id="irMessage" required></textarea></div><div class="field full"><label>Note</label><textarea id="irNotes"></textarea></div></div><div class="modal-actions"><button class="primary">INVIA AL CLUB</button></div></form>');
  $('#internalRequestForm').onsubmit=async e=>{e.preventDefault();try{const r=await mgmtApi('private.request.submit',{type:$('#irType').value,subject:$('#irSubject').value,message:$('#irMessage').value,team:$('#irTeam').value,notes:$('#irNotes').value});toast('Richiesta interna registrata');upsertLocalRequest({id:r.id||r.requestId||requestId('INT'),serverId:r.id||r.requestId||'',kind:'internal',topic:$('#irSubject').value,status:'INVIATA',channel:'GESTIONALE',createdAt:new Date().toISOString()});state.privateData=await mgmtApi('dashboard.summary');openManagementHome(state.privateData)}catch(err){toast(err.message||'Richiesta non salvata')}};
}
function openPinManager(){
  modal('<span class="eyebrow">SICUREZZA ACCOUNT</span><h2>Cambia PIN personale</h2><form id="pinForm"><div class="form-grid"><div class="field full"><label>PIN attuale</label><input id="pinOld" type="password" inputmode="numeric" maxlength="10" required></div><div class="field full"><label>Nuovo PIN</label><input id="pinNew" type="password" inputmode="numeric" minlength="6" maxlength="10" required></div></div><div class="modal-actions"><button class="primary">AGGIORNA PIN</button></div></form>');
  $('#pinForm').onsubmit=async e=>{e.preventDefault();try{await mgmtApi('auth.pin.change',{oldPin:$('#pinOld').value,newPin:$('#pinNew').value});toast('PIN aggiornato');openManagementHome(state.privateData)}catch(err){toast(err.message||'Cambio PIN non riuscito')}};
}
function openMessageManager(){
  const teams=privateTeams();
  modal('<span class="eyebrow">STAFF</span><h2>Messaggio alla squadra</h2><form id="msgForm"><div class="form-grid"><div class="field full"><label>Squadra</label><select id="msgTeam">'+teams.map(t=>'<option value="'+esc(t.key)+'">'+esc(t.name)+'</option>').join('')+'</select></div><div class="field full"><label>Oggetto</label><input id="msgSubject" required></div><div class="field full"><label>Messaggio</label><textarea id="msgBody" required></textarea></div></div><div class="modal-actions"><button class="primary">INVIA</button></div></form>');
  $('#msgForm').onsubmit=async e=>{e.preventDefault();try{await mgmtApi('private.message.send',{teamKey:$('#msgTeam').value,subject:$('#msgSubject').value,message:$('#msgBody').value});toast('Messaggio registrato');openManagementHome(state.privateData)}catch(err){toast(err.message||'Invio non riuscito')}};
}
function openTransportManager(){
  const teams=privateTeams(),today=new Date().toISOString().slice(0,10);
  modal('<span class="eyebrow">TRASPORTI SCD</span><h2>Richiesta pulmino</h2><form id="transportForm"><div class="form-grid"><div class="field"><label>Data</label><input id="trDate" type="date" value="'+today+'" required></div><div class="field"><label>Ora</label><input id="trTime" type="time" required></div><div class="field"><label>Partenza</label><input id="trOrigin" required></div><div class="field"><label>Destinazione</label><input id="trDestination" required></div><div class="field"><label>Squadra</label><select id="trTeam">'+teams.map(t=>'<option value="'+esc(t.key)+'">'+esc(t.name)+'</option>').join('')+'</select></div><div class="field"><label>Persone</label><input id="trPassengers" type="number" min="1" value="1"></div><div class="field full"><label>Note</label><textarea id="trNotes"></textarea></div></div><div class="modal-actions"><button class="primary">INVIA RICHIESTA</button></div></form>');
  $('#transportForm').onsubmit=async e=>{e.preventDefault();try{await mgmtApi('private.transport.request',{date:$('#trDate').value,time:$('#trTime').value,origin:$('#trOrigin').value,destination:$('#trDestination').value,team:$('#trTeam').value,type:'TRASFERTA',passengers:Number($('#trPassengers').value||1),notes:$('#trNotes').value});toast('Richiesta trasporto registrata');openManagementHome(state.privateData)}catch(err){toast(err.message||'Richiesta non salvata')}};
}
function openConvocationManager(){
  const d=state.privateData||{},teams=privateTeams(d),today=new Date().toISOString().slice(0,10);
  modal('<span class="eyebrow">STAFF</span><h2>Nuova convocazione</h2><form id="convForm"><div class="form-grid"><div class="field"><label>Squadra</label><select id="cvTeam">'+teams.map(t=>'<option value="'+esc(t.key)+'">'+esc(t.name)+'</option>').join('')+'</select></div><div class="field"><label>Data gara</label><input id="cvDate" type="date" value="'+today+'" required></div><div class="field"><label>Ritrovo</label><input id="cvTime" type="time" required></div><div class="field"><label>Luogo</label><input id="cvPlace" required></div><div class="field full"><label>Note</label><textarea id="cvNotes"></textarea></div></div><div id="cvPlayers"></div><div class="modal-actions"><button class="primary">CREA CONVOCAZIONE</button></div></form>');
  const renderPlayers=()=>{
    const key=$('#cvTeam').value,roster=(d.roster&&d.roster[key])||[];
    $('#cvPlayers').innerHTML=roster.length?'<div class="player-check-grid">'+roster.map(p=>'<label><input type="checkbox" data-cv-player value="'+esc(p.code||p.personId||'')+'"> '+esc(p.name||[p.firstName,p.lastName].filter(Boolean).join(' '))+'</label>').join('')+'</div>':'<div class="notice">Rosa non presente nel riepilogo. La convocazione potrà essere completata dal gestionale R20.</div>';
  };
  $('#cvTeam').onchange=renderPlayers;renderPlayers();
  $('#convForm').onsubmit=async e=>{e.preventDefault();const players=$$('[data-cv-player]:checked').map(x=>x.value).filter(Boolean);try{await mgmtApi('private.convocation.create',{teamKey:$('#cvTeam').value,gameDate:$('#cvDate').value,meetingTime:$('#cvTime').value,meetingPlace:$('#cvPlace').value,players,notes:$('#cvNotes').value,notify:true});toast('Convocazione creata');openManagementHome(state.privateData)}catch(err){toast(err.message||'Convocazione non creata')}};
}
function openAccessManager(){
  const d=state.privateData||{},roles=(d.roles||[]).map(String);
  modal('<span class="eyebrow">DIREZIONE</span><h2>Utenti e autorizzazioni</h2><form id="accessForm"><div class="form-grid"><div class="field"><label>Nome</label><input id="acName" required></div><div class="field"><label>Email</label><input id="acEmail" type="email" required></div><div class="field"><label>Ruolo</label><select id="acRole">'+roles.map(x=>'<option>'+esc(x)+'</option>').join('')+'</select></div><div class="field"><label>Squadra / settore</label><input id="acArea"></div><div class="field"><label>PIN personale</label><input id="acPin" type="password" inputmode="numeric" maxlength="10"></div><div class="field"><label class="check"><input id="acActive" type="checkbox" checked> Accesso attivo</label></div></div><div class="modal-actions"><button class="primary">SALVA ACCESSO</button></div></form>');
  $('#accessForm').onsubmit=async e=>{e.preventDefault();try{const email=$('#acEmail').value.trim();await mgmtApi('direction.access.set',{name:$('#acName').value,email,role:$('#acRole').value,area:$('#acArea').value,active:$('#acActive').checked});if($('#acPin').value)await mgmtApi('direction.pin.set',{email,pin:$('#acPin').value});toast('Accesso aggiornato');state.privateData=await mgmtApi('dashboard.summary');openManagementHome(state.privateData)}catch(err){toast(err.message||'Aggiornamento non riuscito')}};
}
async function openEvolutionManager(){
  modal('<span class="eyebrow">DIREZIONE · EVOLUTION ENGINE</span><h2>Evolution Queue</h2><div id="evolutionRows" class="loading-line">Carico proposte…</div>');
  try{
    const data=await mgmtApi('direction.evolution',{limit:30}),rows=Array.isArray(data)?data:(data.rows||data.items||[]);
    $('#evolutionRows').innerHTML=rows.length?'<div class="evolution-list">'+rows.map(x=>'<article><span>'+esc(x.status||x.STATUS||'')+'</span><b>'+esc(x.module||x.MODULE||x.problem||x.PROBLEM||'Proposta')+'</b><p>'+esc(x.problem||x.PROBLEM||x.proposedAction||x.PROPOSED_ACTION||'')+'</p></article>').join('')+'</div>':'<div class="empty-state">Nessuna proposta visibile.</div>';
  }catch(e){$('#evolutionRows').innerHTML='<div class="notice error-note">'+esc(e.message||'Evolution Queue non disponibile')+'</div>'}
}
function dataFabricProvenanceRow(label,x={}){
  return '<article class="request-history-card" data-r28-provenance><div><span class="request-kind">'+esc(label)+'</span><b>'+esc(x.source||'UNVERIFIED')+'</b><small>'+esc([x.table,x.field].filter(Boolean).join(' · ')||'Provenienza non disponibile')+'</small></div><div class="request-state">'+esc(x.refresh||'UNVERIFIED')+'</div><code>'+esc(x.api||'NO API')+'</code></article>';
}
function dataFabricObservation(label,x={}){
  const status=x.status||'UNVERIFIED';
  const success=x.lastSuccess||'mai verificato';
  const err=x.lastError||'nessun errore registrato';
  return '<article class="notice"><b>'+esc(label)+' · '+esc(status)+'</b><br>Last sync: '+esc(x.lastSync||'UNVERIFIED')+'<br>Last success: '+esc(success)+'<br>Last error: '+esc(err)+'</article>';
}
async function openDataFabricManager(){
  if(!featureEnabled('dataFabricObservability'))return modal('<span class="eyebrow">DIREZIONE · DATA FABRIC</span><h2>Osservabilità disattivata</h2><div class="notice">Feature flag FF-DATAFABRIC-OBSERVABILITY non attivo.</div>');
  modal('<span class="eyebrow">DIREZIONE · DATA FABRIC</span><h2>Fonti, sincronizzazioni e provenienza</h2><div id="r28FabricRows" class="loading-line">Verifica stato reale…</div>');
  const mount=$('#r28FabricRows');
  const renderFabric=x=>{
    const counts=x.counts||{},obs=x.observability||{},prov=x.provenance||{};
    mount.innerHTML=
      '<div class="mgmt-kpis">'+mgmtKpi('Email archiviate',counts.emailArchive||0)+mgmtKpi('Coda azioni',counts.actionQueue||0)+mgmtKpi('Drive catalogo',counts.driveCatalog||0)+mgmtKpi('Eventi kernel',counts.eventKernel||0)+'</div>'+
      '<div class="notice"><b>Release '+esc(x.release||'R25')+'</b><br>Ultima verifica stato: '+esc(x.checkedAt||'UNVERIFIED')+'<br>Scritture distruttive automatiche: '+esc(x.policy&&x.policy.destructiveAutoWrite===false?'NO':'UNVERIFIED')+' · Safeguarding: '+esc(x.policy?.safeguarding||'UNVERIFIED')+'</div>'+
      '<div class="choice-grid">'+dataFabricObservation('Gmail',obs.gmail||{})+dataFabricObservation('Drive',obs.drive||{})+'</div>'+
      '<h3>Provenienza</h3><div class="request-history">'+dataFabricProvenanceRow('GMAIL',prov.gmail||{})+dataFabricProvenanceRow('DRIVE',prov.drive||{})+'</div>'+
      '<div class="modal-actions"><button class="outline" id="r28FabricRefresh">AGGIORNA STATO</button><button class="outline" id="r28ScanGmail">SCANSIONA GMAIL</button><button class="primary" id="r28ScanDrive">SCANSIONA DRIVE</button></div>';
    const refresh=$('#r28FabricRefresh'),gmail=$('#r28ScanGmail'),drive=$('#r28ScanDrive');
    if(refresh)refresh.onclick=()=>runStatus();
    if(gmail)gmail.onclick=()=>runScan('direction.datafabric.scan.gmail','Gmail');
    if(drive)drive.onclick=()=>runScan('direction.datafabric.scan.drive','Drive');
  };
  const runStatus=async()=>{mount.innerHTML='<div class="loading-line">Verifica stato reale…</div>';try{renderFabric(await loadDataFabricStatus(true))}catch(e){mount.innerHTML='<div class="notice error-note"><b>Data Fabric non verificabile.</b><br>'+esc(e.message||e)+'</div>'}};
  const runScan=async(action,label)=>{
    mount.insertAdjacentHTML('afterbegin','<div class="loading-line" id="r28ScanProgress">Scansione '+esc(label)+' in corso…</div>');
    try{
      const result=await mgmtApi(action,{});
      toast(label+' verificato');
      state.dataFabricStatus=null;
      await runStatus();
      console.info('[SCD DATA FABRIC]',action,result);
    }catch(e){
      const p=$('#r28ScanProgress');if(p)p.outerHTML='<div class="notice error-note">'+esc(e.message||'Scansione non riuscita')+'</div>';
    }
  };
  await runStatus();
}
async function openDiagnosticsManager(){
  modal('<span class="eyebrow">DIREZIONE · QA</span><h2>Diagnostica sistema</h2><div id="diagRows" class="loading-line">Analisi in corso…</div>');
  try{
    const x=await mgmtApi('direction.diagnostics'),m=x.metrics||{};
    $('#diagRows').innerHTML='<div class="mgmt-kpis">'+mgmtKpi('Eventi',m.totalEvents||0)+mgmtKpi('Errori',m.errorEvents||0)+mgmtKpi('P95',String(m.p95LatencyMs||0)+' ms')+mgmtKpi('Stato',x.severity||'OK')+'</div><div class="notice"><b>'+esc(x.kernelVersion||'SCD CORE')+'</b><br>Telemetria tecnica minimizzata e controllata.</div>';
  }catch(e){$('#diagRows').innerHTML='<div class="notice error-note">'+esc(e.message||'Diagnostica non disponibile')+'</div>'}
}
async function restoreManagementSession(){
  const saved=storedSession();if(!saved.token)return;
  state.sessionToken=saved.token;
  try{await api('auth.validate',{token:saved.token},saved.token);state.privateData=await api('dashboard.summary',{},saved.token)}catch{clearSession()}
}
function openTeams(){
  setActiveNav('teams');
  const cal=state.calendar||[];
  const names=new Map();
  cal.forEach(x=>{const name=displayValue(x.team,'');if(name)names.set(name,(names.get(name)||0)+1)});
  const rows=[...names.entries()].sort((a,b)=>b[1]-a[1]);
  modal('<section class="teams-app-screen"><header class="teams-app-head"><div class="teams-app-brand"><img src="./assets/logo-scd.png" alt="SCD"><div><b>Squadre</b><p>Il mondo sportivo ColicoDerviese, categoria per categoria.</p></div></div></header><div class="mgmt-grid">'+(rows.length?rows.map(([name,count])=>'<button class="mgmt-tile" data-team-name="'+esc(name)+'"><span>⚽</span><b>'+esc(name)+'</b><small>'+count+' attività nel calendario</small></button>').join(''):'<div class="empty-state">Elenco squadre in sincronizzazione con il gestionale SCD.</div>')+'</div><div class="account-rule" style="margin-top:12px"><b>Accesso qualificato:</b> allenamenti, presenze e convocazioni dettagliate restano nelle aree autorizzate di atleta, famiglia e staff.</div></section>');
  document.querySelectorAll('[data-team-name]').forEach(b=>b.onclick=()=>{const name=b.dataset.teamName;const events=(state.calendar||[]).filter(x=>displayValue(x.team,'')===name).slice(0,8);modal('<section class="teams-app-screen"><header class="teams-app-head"><div class="teams-app-brand"><img src="./assets/logo-scd.png" alt="SCD"><div><b>'+esc(name)+'</b><p>Prossime attività pubbliche disponibili.</p></div></div></header><div class="calendar-list">'+(events.length?events.map(x=>'<button class="calendar-row" data-calendar-event="'+esc(x.id)+'"><time><b>'+esc(fmtDate(x.date))+'</b><small>'+esc(x.time||'')+'</small></time><span><b>'+esc(x.title)+'</b><small>'+esc(x.venue||x.type)+'</small></span><i>›</i></button>').join(''):'<div class="empty-state">Nessuna attività pubblica disponibile.</div>')+'</div></section>');bindCalendarEvents()});
}
function openEventsHub(){
  setActiveNav('events');
  const p=publicData(state.summary||FALLBACK);
  const rows=(p.initiatives||[]).slice(0,12);
  modal('<section class="communications-app-screen"><header class="communications-app-head"><div class="communications-app-brand"><img src="./assets/logo-scd.png" alt="SCD"><div><b>Eventi</b><p>Tornei, Open Day, iniziative e appuntamenti del Club.</p></div></div></header><div class="calendar-list" id="eventsHubRows">'+(rows.length?rows.map((x,i)=>{const title=field(x,'title','event','name')||'Evento SCD';const date=fmtDate(field(x,'date'));const time=field(x,'time');const venue=field(x,'venue','luogo');return '<button class="calendar-row event-club" data-event-hub="'+i+'"><span class="event-marker"></span><time><b>'+esc(date||'Data')+'</b><small>'+esc(time||'')+'</small></time><span><b>'+esc(title)+'</b><small>'+esc(venue||'Dettagli in aggiornamento')+'</small></span><i>›</i></button>'}).join(''):'<div class="empty-state"><b>Eventi in aggiornamento.</b><p>La Super App mostra soltanto appuntamenti pubblicati dalle fonti SCD.</p></div>')+'</div><div class="modal-actions"><button class="outline" id="eventsRefresh">AGGIORNA</button><button class="primary" id="eventsIdea">PROPONI INIZIATIVA</button></div></section>');
  document.querySelectorAll('[data-event-hub]').forEach(b=>b.onclick=()=>{const x=rows[Number(b.dataset.eventHub||0)];if(!x)return;const title=field(x,'title','event','name')||'Evento SCD',url=field(x,'registrationUrl','url','link');modal('<span class="eyebrow">EVENTO SCD</span><h2>'+esc(title)+'</h2><p>'+esc([fmtDate(field(x,'date')),field(x,'time'),field(x,'venue','luogo')].filter(Boolean).join(' · '))+'</p><div class="modal-actions">'+(url?'<a class="primary" target="_blank" rel="noopener" href="'+esc(url)+'">APRI DETTAGLI</a>':'')+'<button class="outline" id="eventsBack">TORNA A EVENTI</button></div>');const back=$('#eventsBack');if(back)back.onclick=openEventsHub});
  const refresh=$('#eventsRefresh'),idea=$('#eventsIdea');if(refresh)refresh.onclick=async()=>{await loadSummary(false);openEventsHub()};if(idea)idea.onclick=()=>openPublicAction('initiatives');
}
function openCommunicationsHub(){
  setActiveNav('');
  const p=publicData(state.summary||FALLBACK),rows=(p.highlights||[]).slice(0,8);
  const important=rows.find(x=>/urgent|sospension|variaz|annull|rinvi|cambio/i.test([x.status,x.feedType,x.title,x.message].join(' ')))||rows[0]||{};
  const rest=rows.filter(x=>x!==important).slice(0,5);
  modal('<section class="communications-app-screen"><header class="communications-app-head"><div class="communications-app-brand"><img src="./assets/logo-scd.png" alt="SCD"><div><b>Comunicazioni</b><p>Notizie, aggiornamenti e contenuti ufficiali del club.</p></div></div></header><div class="communications-tabs"><button class="active">Club</button><button data-comm-tab="teams">Squadre</button><button data-comm-tab="social">Social</button></div><article class="communication-important"><span class="comm-ico">!</span><div><small>COMUNICAZIONE IN EVIDENZA</small><b>'+esc(field(important,'title','subject','event')||'Aggiornamenti SCD')+'</b><p>'+esc(field(important,'message','excerpt','venue')||'Le informazioni ufficiali del Club vengono pubblicate qui.')+'</p><time>'+esc(field(important,'date','time')||'')+'</time></div></article><div class="communication-list">'+(rest.length?rest.map(x=>'<article><span class="comm-row-ico">▣</span><div><small>'+esc(field(x,'feedType','source')||'CLUB')+'</small><b>'+esc(field(x,'title','subject','event')||'Aggiornamento')+'</b><p>'+esc(field(x,'message','venue','status')||'')+'</p></div><time>'+esc(field(x,'date','time')||'')+'</time></article>').join(''):'<div class="empty-state">Nuove comunicazioni in aggiornamento.</div>')+'</div><section class="social-hub-card"><div><h3>Social Hub</h3><p>I canali ufficiali SCD in un unico spazio, senza numeri inventati.</p></div><div class="social-links"><a href="https://www.instagram.com/s.c.d.colicoderviese/" target="_blank" rel="noopener">Instagram</a><a href="https://www.facebook.com/ColicoDerviese?locale=it_IT" target="_blank" rel="noopener">Facebook</a><a href="https://www.colicoderviese.it/" target="_blank" rel="noopener">Sito ufficiale</a></div><div class="modal-actions"><button class="outline" id="commRefresh">AGGIORNA</button><button class="primary" id="commShare">CONDIVIDI APP</button></div></section></section>');
  const refresh=$('#commRefresh'),share=$('#commShare');
  if(refresh)refresh.onclick=async()=>{await loadSummary(false);openCommunicationsHub()};
  if(share)share.onclick=async()=>{try{if(navigator.share)await navigator.share({title:'SCD ColicoDerviese',text:'Segui gli aggiornamenti ufficiali SCD ColicoDerviese',url:location.href});else await navigator.clipboard.writeText(location.href);toast('Link app pronto per la condivisione')}catch{}};
  document.querySelectorAll('[data-comm-tab]').forEach(b=>b.onclick=()=>{if(b.dataset.commTab==='teams')openTeams();else toast('Apri i canali ufficiali dal Social Hub')});
}
function openProfile(){
  setActiveNav('profile');
  const count=localRequests().length;
  const session=storedSession();
  modal('<section class="profile-app-screen"><header class="profile-app-head"><div class="profile-app-brand"><img src="./assets/logo-scd.png" alt="SCD"><div><b>Area Riservata</b><p>Un account. Atleta, famiglia, staff e direzione secondo i permessi assegnati.</p></div></div></header><div class="reserved-tabs"><button class="active">Profilo</button><button id="profileReserved">Area riservata</button><button id="profileCalendar">Calendario</button><button id="profileSettings">Impostazioni</button></div><div class="profile-hub-grid visual-profile-grid"><button class="choice-tile" id="profileRequests"><b>Le mie richieste</b><small>'+count+' registrate su questo dispositivo</small></button><button class="choice-tile" id="profileAvatar"><b>Avatar & foto</b><small>Identità digitale SCD</small></button><button class="choice-tile" id="profileR20"><b>Area riservata SCD</b><small>Famiglia · Atleta · Staff · Direzione</small></button><button class="choice-tile" id="profileRefresh"><b>Sincronizza</b><small>Controlla servizi e aggiornamenti</small></button><button class="choice-tile" id="profileCommunications"><b>Comunicazioni</b><small>News e aggiornamenti ufficiali</small></button><button class="choice-tile" id="profileTeams"><b>Squadre</b><small>Calendario e attività pubbliche</small></button><button class="choice-tile" id="profileLocation"><b>Territorio & Maps</b><small>Centro Sportivo, percorso e posizione</small></button><button class="choice-tile" id="profileLinkAthlete"><b>Collega tesserato</b><small>Richiedi accesso Atleta / Famiglia sullo stesso account</small></button><button class="choice-tile" id="profileSafeguarding"><b>Safeguarding</b><small>Canale riservato separato dalla messaggistica ordinaria</small></button><a class="choice-tile danger-tile" id="profileDeleteAccount" href="./delete-account.html"><b>Elimina account e dati</b><small>Richiesta privacy e cancellazione profilo</small></a></div><div class="account-rule"><b>Account unico:</b> ogni persona entra come Utente Base. I permessi societari vengono aggiunti dalla Direzione sullo stesso account.'+(session.email?'<br><br><b>Email salvata:</b> '+esc(session.email):'')+'</div></section>');
  const req=$('#profileRequests'),avatar=$('#profileAvatar'),r20=$('#profileR20'),refresh=$('#profileRefresh'),reserved=$('#profileReserved'),cal=$('#profileCalendar'),settings=$('#profileSettings'),communications=$('#profileCommunications'),teams=$('#profileTeams'),locationBtn=$('#profileLocation'),linkAthlete=$('#profileLinkAthlete'),safeguarding=$('#profileSafeguarding');
  if(req)req.onclick=openMyRequests;
  if(avatar)avatar.onclick=openAvatarStudio;
  if(r20)r20.onclick=openLogin;
  if(reserved)reserved.onclick=openLogin;
  if(cal)cal.onclick=openCalendar;
  if(settings)settings.onclick=()=>toast('Impostazioni profilo in evoluzione controllata');
  if(communications)communications.onclick=openCommunicationsHub;
  if(teams)teams.onclick=openTeams;
  if(locationBtn)locationBtn.onclick=openLocationHub;
  if(linkAthlete)linkAthlete.onclick=openTesseratoLink;
  if(safeguarding)safeguarding.onclick=openSafeguarding;
  if(refresh)refresh.onclick=async()=>{await checkServiceHealth();await loadSummary();await loadPublicCalendar(true);};
}
function openDirection(){openLogin()}


const AVATAR_COLORS={
  skin:{chiara:'#f4c69c',media:'#c98b62',scura:'#7b4d35'},
  hair:{castani:'#4b2d22',neri:'#171b24',biondi:'#c88d2c',rossi:'#963c27'},
  kit:{bianca:'#f7f9fc',blu:'#0758b8'}
};
function avatarSvgMarkup(opts={}){
  const skin=AVATAR_COLORS.skin[opts.skin||'media'],hair=AVATAR_COLORS.hair[opts.hair||'castani'],kit=AVATAR_COLORS.kit[opts.kit||'bianca'];
  const secondary=opts.kit==='blu'?'#ffd400':'#0758b8',number=String(opts.number||10).replace(/\D/g,'').slice(0,2)||'10';
  const smile=(opts.mood||'sorriso')==='sorriso';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 460" width="360" height="460">
  <ellipse cx="180" cy="420" rx="92" ry="16" fill="#09295f" opacity=".14"/>
  <circle cx="180" cy="115" r="70" fill="${skin}"/>
  <path d="M116 92 Q126 30 180 36 Q232 31 246 93 Q223 69 202 70 Q184 54 161 70 Q138 66 116 92Z" fill="${hair}"/>
  <path d="M117 90 Q132 45 160 51 Q147 75 150 91Z" fill="${hair}"/>
  <path d="M243 91 Q226 44 201 51 Q215 72 211 92Z" fill="${hair}"/>
  <ellipse cx="153" cy="113" rx="10" ry="13" fill="#fff"/><ellipse cx="207" cy="113" rx="10" ry="13" fill="#fff"/>
  <circle cx="154" cy="114" r="5" fill="#15345f"/><circle cx="206" cy="114" r="5" fill="#15345f"/>
  <path d="M171 132 Q180 139 189 132" fill="none" stroke="#8e583f" stroke-width="4" stroke-linecap="round"/>
  ${smile?'<path d="M151 147 Q180 171 209 147 Q180 184 151 147Z" fill="#8c3540"/>':'<path d="M155 157 Q180 145 205 157" fill="none" stroke="#6f3d35" stroke-width="5" stroke-linecap="round"/>'}
  <path d="M113 200 Q180 166 247 200 L268 302 Q180 332 92 302Z" fill="${kit}" stroke="${secondary}" stroke-width="8"/>
  <path d="M112 205 L75 244 L98 269 L126 229Z" fill="${kit}" stroke="${secondary}" stroke-width="7"/>
  <path d="M248 205 L285 244 L262 269 L234 229Z" fill="${kit}" stroke="${secondary}" stroke-width="7"/>
  <path d="M125 302 L175 302 L165 367 L112 367Z" fill="${kit}" stroke="${secondary}" stroke-width="7"/>
  <path d="M185 302 L235 302 L248 367 L195 367Z" fill="${kit}" stroke="${secondary}" stroke-width="7"/>
  <path d="M118 365 L162 365 L161 418 L118 418Z" fill="#f7f9fc" stroke="${secondary}" stroke-width="6"/>
  <path d="M199 365 L242 365 L244 418 L201 418Z" fill="#f7f9fc" stroke="${secondary}" stroke-width="6"/>
  <path d="M104 410 Q142 400 169 420 L158 438 L101 438Z" fill="#0758b8"/>
  <path d="M192 420 Q223 400 258 412 L260 438 L202 438Z" fill="#0758b8"/>
  <path d="M163 207 L197 207 L192 242 L180 251 L168 242Z" fill="#ffd400" stroke="#0758b8" stroke-width="4"/>
  <text x="180" y="286" text-anchor="middle" font-family="Arial,sans-serif" font-size="46" font-weight="900" fill="${secondary}">${number}</text>
  <text x="180" y="323" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" font-weight="800" fill="${secondary}">${String(opts.role||'CALCIATORE').toUpperCase()}</text>
  <g transform="translate(272 359)"><circle cx="0" cy="0" r="39" fill="#fff" stroke="#16243a" stroke-width="4"/><path d="M0-14 14-4 9 13-9 13-14-4Z" fill="#16243a"/><path d="M0-39 0-14M37-12 14-4M23 32 9 13M-23 32-9 13M-37-12-14-4" stroke="#16243a" stroke-width="5"/></g>
  </svg>`;
}
function renderAvatarPreview(){
  const box=$('#avatarPreview');if(!box)return null;
  const opts={role:$('#avatarRole')?.value||'Calciatore',number:$('#avatarNumber')?.value||10,skin:$('#avatarSkin')?.value||'media',hair:$('#avatarHair')?.value||'castani',mood:$('#avatarMood')?.value||'sorriso',kit:$('#avatarKit')?.value||'bianca'};
  box.innerHTML=avatarSvgMarkup(opts);return opts;
}
function downloadBlob(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1200)}
async function exportAvatarPng(){
  const opts=renderAvatarPreview()||{},svg=avatarSvgMarkup(opts),blob=new Blob([svg],{type:'image/svg+xml'}),url=URL.createObjectURL(blob),img=new Image();
  await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url});
  const canvas=document.createElement('canvas');canvas.width=900;canvas.height=1150;const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);URL.revokeObjectURL(url);
  canvas.toBlob(b=>{if(b){downloadBlob(b,'avatar-scd.png');track('feature_use',{section:'avatar_export'})}},'image/png');
}
function applyAvatarDescription(){
  const text=($('#avatarDescription')?.value||'').toLowerCase();
  if(!text)return;
  const set=(id,val)=>{const el=$(id);if(el){el.value=val;el.dispatchEvent(new Event('input',{bubbles:true}))}};
  if(/portier/.test(text))set('#avatarRole','Portiere');
  else if(/difensor/.test(text))set('#avatarRole','Difensore');
  else if(/centrocamp/.test(text))set('#avatarRole','Centrocampista');
  else if(/attacc/.test(text))set('#avatarRole','Attaccante');
  else if(/tifos/.test(text))set('#avatarRole','Tifoso');
  const n=text.match(/(?:numero|maglia|n\.?)[^0-9]{0,5}(\d{1,2})/);if(n)set('#avatarNumber',Math.max(1,Math.min(99,+n[1])));
  if(/pelle chiara|carnagione chiara/.test(text))set('#avatarSkin','chiara');
  if(/pelle scura|carnagione scura/.test(text))set('#avatarSkin','scura');
  if(/pelle media|carnagione media/.test(text))set('#avatarSkin','media');
  if(/capelli neri/.test(text))set('#avatarHair','neri');
  if(/capelli biond/.test(text))set('#avatarHair','biondi');
  if(/capelli ross/.test(text))set('#avatarHair','rossi');
  if(/capelli castan/.test(text))set('#avatarHair','castani');
  if(/serio|determinato|concentrato/.test(text))set('#avatarMood','determinato');
  if(/sorrid|sorriso|felice/.test(text))set('#avatarMood','sorriso');
  if(/divisa blu|maglia blu|kit blu/.test(text))set('#avatarKit','blu');
  if(/divisa bianca|maglia bianca|kit bianco/.test(text))set('#avatarKit','bianca');
  renderAvatarPreview();track('feature_use',{section:'avatar_description'});
}
function openAvatarStudio(){
  track('page_view',{section:'avatar_studio'});
  modal(`<span class="eyebrow">SCD AVATAR STUDIO</span><h2>Crea il tuo calciatore</h2><p>Avatar locale, gratuito e personalizzabile. Nessuna foto viene inviata a servizi esterni. L'esportazione è sempre PNG con trasparenza.</p>
  <div class="field full avatar-description"><label>Descrivi il tuo avatar</label><div class="avatar-description-row"><input id="avatarDescription" placeholder="Es. Portiere, numero 1, capelli neri, divisa blu, sorriso"><button type="button" id="applyAvatarDescription">CREA DALLE INDICAZIONI</button></div></div>
  <div class="avatar-studio-grid"><div class="avatar-preview checker" id="avatarPreview"></div><div class="avatar-controls">
  <label>Ruolo<select id="avatarRole"><option>Calciatore</option><option>Portiere</option><option>Difensore</option><option>Centrocampista</option><option>Attaccante</option><option>Tifoso</option></select></label>
  <label>Numero<input id="avatarNumber" type="number" min="1" max="99" value="10"></label>
  <label>Pelle<select id="avatarSkin"><option value="chiara">Chiara</option><option value="media" selected>Media</option><option value="scura">Scura</option></select></label>
  <label>Capelli<select id="avatarHair"><option value="castani">Castani</option><option value="neri">Neri</option><option value="biondi">Biondi</option><option value="rossi">Rossi</option></select></label>
  <label>Espressione<select id="avatarMood"><option value="sorriso">Sorriso</option><option value="determinato">Determinato</option></select></label>
  <label>Divisa<select id="avatarKit"><option value="bianca">Bianca SCD</option><option value="blu">Blu SCD</option></select></label>
  </div></div>
  <div class="notice"><b>Regola SCD Media:</b> l'avatar non ha fondo colorato né riquadro. Il file finale è PNG trasparente.</div>
  <div class="modal-actions"><button class="outline" type="button" id="avatarPhotoBtn">USA UNA TUA FOTO</button><button class="outline" type="button" id="saveAvatarLocal">SALVA SUL DISPOSITIVO</button><button class="primary" type="button" id="exportAvatar">ESPORTA PNG</button></div>`);
  ['avatarRole','avatarNumber','avatarSkin','avatarHair','avatarMood','avatarKit'].forEach(id=>$('#'+id)?.addEventListener('input',renderAvatarPreview));
  renderAvatarPreview();$('#applyAvatarDescription').onclick=applyAvatarDescription;$('#avatarDescription').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();applyAvatarDescription()}});$('#avatarPhotoBtn').onclick=openMediaStudio;$('#exportAvatar').onclick=exportAvatarPng;$('#saveAvatarLocal').onclick=()=>{const opts=renderAvatarPreview();localStorage.setItem('scd:avatar:v1',JSON.stringify(opts));track('feature_use',{section:'avatar_save'});toast('Avatar salvato sul dispositivo')};
}
function median(v){const a=[...v].sort((x,y)=>x-y);return a[Math.floor(a.length/2)]||255}
function processTransparentMedia(img,mode='logo',tolerance=54){
  const max=900,scale=Math.min(1,max/Math.max(img.naturalWidth||img.width,img.naturalHeight||img.height)),w=Math.max(1,Math.round((img.naturalWidth||img.width)*scale)),h=Math.max(1,Math.round((img.naturalHeight||img.height)*scale));
  const canvas=$('#mediaCanvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.clearRect(0,0,w,h);ctx.drawImage(img,0,0,w,h);
  if(mode==='foto'){const tmp=document.createElement('canvas');tmp.width=w;tmp.height=h;tmp.getContext('2d').drawImage(canvas,0,0);ctx.clearRect(0,0,w,h);ctx.save();ctx.beginPath();ctx.ellipse(w/2,h/2,w*.48,h*.48,0,0,Math.PI*2);ctx.clip();ctx.drawImage(tmp,0,0);ctx.restore();return}
  const d=ctx.getImageData(0,0,w,h),px=d.data,rs=[],gs=[],bs=[],step=Math.max(1,Math.floor(Math.min(w,h)/60));
  for(let x=0;x<w;x+=step){let i=x*4;rs.push(px[i]);gs.push(px[i+1]);bs.push(px[i+2]);i=((h-1)*w+x)*4;rs.push(px[i]);gs.push(px[i+1]);bs.push(px[i+2])}
  for(let y=0;y<h;y+=step){let i=(y*w)*4;rs.push(px[i]);gs.push(px[i+1]);bs.push(px[i+2]);i=(y*w+w-1)*4;rs.push(px[i]);gs.push(px[i+1]);bs.push(px[i+2])}
  const bg=[median(rs),median(gs),median(bs)],soft=28;
  for(let i=0;i<px.length;i+=4){const dist=Math.hypot(px[i]-bg[0],px[i+1]-bg[1],px[i+2]-bg[2]);if(dist<tolerance)px[i+3]=0;else if(dist<tolerance+soft)px[i+3]=Math.round(255*(dist-tolerance)/soft)}
  ctx.putImageData(d,0,0);
}
function openMediaStudio(){
  track('page_view',{section:'media_studio'});
  modal(`<span class="eyebrow">SCD MEDIA INTELLIGENTE</span><h2>Foto, loghi e immagini senza riquadri</h2><p>Carica un file: viene elaborato nel browser. Foto profilo = ritaglio trasparente. Logo/immagine = rimozione automatica dello sfondo uniforme e conversione PNG.</p>
  <div class="media-upload"><label class="upload-drop">SCEGLI FILE<input id="mediaFile" type="file" accept="image/*"></label><select id="mediaMode"><option value="foto">Foto profilo</option><option value="logo">Logo / stemma</option><option value="immagine">Immagine grafica</option></select><label class="range-label">Pulizia sfondo<input id="mediaTolerance" type="range" min="20" max="120" value="54"></label></div>
  <div class="media-preview checker"><canvas id="mediaCanvas" width="480" height="480"></canvas><div id="mediaEmpty">Anteprima PNG trasparente</div></div>
  <div class="notice"><b>Privacy:</b> elaborazione locale. Il file non lascia il dispositivo durante questa operazione.</div>
  <div class="modal-actions"><button class="outline" type="button" id="openAvatarFromMedia">CREA AVATAR</button><button class="primary" type="button" id="downloadMedia" disabled>ESPORTA PNG TRASPARENTE</button></div>`);
  let current=null;const rerender=()=>current&&processTransparentMedia(current,$('#mediaMode').value,+$('#mediaTolerance').value);
  $('#mediaFile').onchange=e=>{const file=e.target.files?.[0];if(!file)return;track('form_start',{section:'media_upload'});const url=URL.createObjectURL(file),img=new Image();img.onload=()=>{current=img;$('#mediaEmpty').hidden=true;rerender();URL.revokeObjectURL(url);$('#downloadMedia').disabled=false};img.src=url};
  $('#mediaMode').onchange=rerender;$('#mediaTolerance').oninput=rerender;$('#downloadMedia').onclick=()=>{$('#mediaCanvas').toBlob(b=>{if(b){downloadBlob(b,'scd-media-trasparente.png');track('form_complete',{section:'media_export'})}},'image/png')};$('#openAvatarFromMedia').onclick=openAvatarStudio;
}

const PUBLIC_CONTACTS={
  general:'sportclubcolico@gmail.com',
  secretary:'segreteria.scdcolicoderviese@gmail.com',
  registrations:'tesseramenti.scdcolicoderviese@gmail.com',
  pec:'calciocolicoderviese@pec.it',
  phone:'334 196 1321',
  signupUrl:'https://tally.so/r/VLAJNy'
};
const ACTION_META={
  join:{title:'Vuoi giocare con noi?',subtitle:'Preiscrizione, prova e Open Day',action:'public.registration',email:PUBLIC_CONTACTS.registrations},
  sponsor:{title:'Diventa Sponsor / Partner',subtitle:'Costruiamo una proposta su misura',action:'public.partnerLead',email:PUBLIC_CONTACTS.general},
  product:{title:'Proponi prodotti o servizi',subtitle:'Fornitori, aziende e collaborazioni',action:'public.partnerLead',email:PUBLIC_CONTACTS.general},
  rent:{title:'Affitto campi e spazi',subtitle:'Richiedi disponibilità e informazioni',action:'public.ticketSubmit',email:PUBLIC_CONTACTS.secretary},
  tournament:{title:'Tornei SCD',subtitle:'Iscrizione squadra / richiesta informazioni',action:'public.ticketSubmit',email:PUBLIC_CONTACTS.secretary},
  tickets:{title:'Biglietti & prenotazioni',subtitle:'Gare ed eventi abilitati',action:'public.ticketSubmit',email:PUBLIC_CONTACTS.general},
  cards:{title:'Card SCD',subtitle:'Tifoso · Famiglia · Tesserato · Partner',action:'public.ticketSubmit',email:PUBLIC_CONTACTS.general},
  initiatives:{title:'Proponi un’iniziativa',subtitle:'Sport, territorio, cultura e community',action:'public.ticketSubmit',email:PUBLIC_CONTACTS.general},
  idea:{title:'Hai un’idea o un progetto?',subtitle:'Raccontaci la proposta',action:'public.ticketSubmit',email:PUBLIC_CONTACTS.general},
  story:{title:'Invia una notizia, foto o storia',subtitle:'I contenuti vengono moderati prima della pubblicazione',action:'public.communitySubmit',email:PUBLIC_CONTACTS.general},
  fan:{title:'Area Tifosi / Community',subtitle:'Sondaggi, quiz, reazioni e contenuti moderati',action:'public.communitySubmit',email:PUBLIC_CONTACTS.general},
  contacts:{title:'Contatta SCD ColicoDerviese',subtitle:'Scegli il canale giusto',action:'public.ticketSubmit',email:PUBLIC_CONTACTS.general},
  safeguarding:{title:'Safeguarding · segnalazione riservata',subtitle:'Canale separato e protetto',action:'safeguarding.submit',email:PUBLIC_CONTACTS.pec},
  fantasy:{title:'Fantasy SCD',subtitle:'Community game gratuito e non monetario',action:'public.communitySubmit',email:PUBLIC_CONTACTS.general},
  'fantasy-rules':{title:'Regole Fantasy SCD',subtitle:'Divertimento, tutela e fair play',action:null,email:PUBLIC_CONTACTS.general}
};
function formField(label,id,type='text',required=true,extra=''){return `<div class="field"><label>${label}</label><input id="${id}" type="${type}" ${required?'required':''} ${extra}></div>`}
function openPublicAction(kind,seed={}){
  const m=ACTION_META[kind]||ACTION_META.contacts;
  if(kind==='requests')return openMyRequests();
  if(kind==='avatar')return openAvatarStudio();
  if(kind==='media')return openMediaStudio();
  if(kind==='join')return openJoin();
  if(kind==='safeguarding')return openSafeguarding();
  if(kind==='fantasy'||kind==='fantasy-rules')return openFantasy(kind==='fantasy-rules');
  if(kind==='cards')return openCards();
  if(kind==='contacts')return openContacts();
  if(kind==='calendar')return openCalendar();
  if(kind==='teams')return openTeams();
  if(kind==='communications')return openCommunicationsHub();
  if(kind==='events')return openEventsHub();
  if(kind==='location')return openLocationHub();
  if(kind==='notifications')return requestNotificationPermission();
  const label=kind==='sponsor'?'Azienda / organizzazione':kind==='product'?'Azienda / attività':'Nome e cognome';
  const topic=kind==='rent'?'Data / fascia oraria richiesta':kind==='tournament'?'Torneo / categoria / annata':kind==='tickets'?'Gara / evento':kind==='initiatives'?'Titolo iniziativa':'Oggetto';
  modal(`<span class="eyebrow">SCD CONNECT</span><h2>${esc(m.title)}</h2><p>${esc(m.subtitle)}</p><form id="publicActionForm"><div class="form-grid">${formField(label,'paName')}${formField('Email','paEmail','email')}${formField('Telefono','paPhone','tel',true,'inputmode="tel"')}${formField(topic,'paTopic')}<div class="field full"><label>Messaggio</label><textarea id="paMessage" required placeholder="Scrivi qui le informazioni utili…"></textarea></div><div class="field full"><label class="check"><input id="paPrivacy" type="checkbox" required> <span>Autorizzo il trattamento dei dati per gestire questa richiesta.</span></label></div></div><div id="paStatus"></div><div class="modal-actions"><button type="button" class="outline" id="paCancel">ANNULLA</button><button class="primary" type="submit">INVIA RICHIESTA</button></div></form>`);
  $('#paCancel').onclick=closeModal;
  $('#publicActionForm').onsubmit=e=>submitPublicAction(e,kind,m,seed);
}
async function submitPublicAction(e,kind,m,seed={}){
  e.preventDefault();const btn=e.currentTarget.querySelector('[type="submit"]');btn.disabled=true;btn.textContent='INVIO…';
  const payload={kind,name:$('#paName')?.value.trim(),email:$('#paEmail')?.value.trim(),phone:$('#paPhone')?.value.trim(),topic:$('#paTopic')?.value.trim(),message:$('#paMessage')?.value.trim(),privacy:true,...seed};
  const localId=requestId(kind);upsertLocalRequest({id:localId,kind,topic:payload.topic||m.title,status:'IN INVIO',channel:'APP',createdAt:new Date().toISOString()});
  try{const r=await api(m.action,payload);upsertLocalRequest({id:localId,status:'INVIATA',serverId:r.id||r.requestId||'',channel:'GESTIONALE'});$('#paStatus').innerHTML=`<div class="status-box"><b>Richiesta ricevuta.</b><br>${esc(r.message||'La Società la prenderà in carico.')}</div>`;btn.hidden=true;}
  catch(err){upsertLocalRequest({id:localId,status:'DA COMPLETARE',channel:'EMAIL'});const subject=encodeURIComponent(`[SCD APP] ${m.title}`);const body=encodeURIComponent(`Nome: ${payload.name||''}\nEmail: ${payload.email||''}\nTelefono: ${payload.phone||''}\nOggetto: ${payload.topic||''}\n\n${payload.message||''}`);$('#paStatus').innerHTML=`<div class="status-box" style="background:#fff7e1;color:#7a5700"><b>Canale gestionale in sincronizzazione.</b><br>Per non perdere la richiesta, usa il canale email ufficiale qui sotto.</div><div class="mini-links"><a href="mailto:${esc(m.email)}?subject=${subject}&body=${body}">INVIA EMAIL UFFICIALE</a></div>`;btn.disabled=false;btn.textContent='RIPROVA';}
}
function openJoin(){modal(`<span class="eyebrow">ENTRA NELLA SCD</span><h2>Vuoi giocare con noi?</h2><p>Preiscrizione, prova e Open Day. La compilazione non assegna automaticamente il tesseramento federale: la Segreteria verifica categoria, disponibilità e documentazione.</p><div class="notice"><b>Iscrizioni 2026/27:</b> è disponibile anche il modulo societario online già pubblicato dalla SCD.</div><div class="choice-grid"><a class="choice-tile" href="${PUBLIC_CONTACTS.signupUrl}" target="_blank" rel="noopener"><b>Compila preiscrizione ufficiale</b><small>Modulo online SCD</small></a><button class="choice-tile" id="joinInfo"><b>Richiedi una prova / informazioni</b><small>Lascia i tuoi contatti</small></button></div><div class="mini-links"><a href="mailto:${PUBLIC_CONTACTS.registrations}">Email tesseramenti</a><a href="tel:+393341961321">Chiama ${PUBLIC_CONTACTS.phone}</a></div>`);$('#joinInfo').onclick=()=>openPublicAction('idea',{topic:'Richiesta prova / ingresso SCD'});}
function openCards(){modal(`<span class="eyebrow">SCD CARD</span><h2>Una card per ogni relazione con il Club</h2><p>Architettura predisposta per vantaggi, convenzioni e contenuti dedicati. Finché non attiviamo un pagamento sicuro e sostenibile, la richiesta è una prenotazione/interesse e non un acquisto.</p><div class="choice-grid"><button class="choice-tile" data-card="TIFOSO"><b>Card Tifoso</b><small>Community, eventi, promo partner</small></button><button class="choice-tile" data-card="FAMIGLIA"><b>Card Famiglia</b><small>Servizi e convenzioni famiglie</small></button><button class="choice-tile" data-card="TESSERATO"><b>Card Tesserato</b><small>Identità digitale e servizi Club</small></button><button class="choice-tile" data-card="PARTNER"><b>Card Partner</b><small>Network e opportunità commerciali</small></button></div>`);$$('[data-card]').forEach(b=>b.onclick=()=>openPublicAction('idea',{topic:'Interesse Card '+b.dataset.card}));}
function openContacts(){modal(`<span class="eyebrow">CONTATTI SCD</span><h2>Parla con il canale giusto</h2><div class="choice-grid"><a class="choice-tile" href="mailto:${PUBLIC_CONTACTS.general}"><b>Società / Direzione</b><small>${PUBLIC_CONTACTS.general}</small></a><a class="choice-tile" href="mailto:${PUBLIC_CONTACTS.secretary}"><b>Segreteria</b><small>${PUBLIC_CONTACTS.secretary}</small></a><a class="choice-tile" href="mailto:${PUBLIC_CONTACTS.registrations}"><b>Tesseramenti</b><small>${PUBLIC_CONTACTS.registrations}</small></a><a class="choice-tile" href="tel:+393341961321"><b>Telefono</b><small>${PUBLIC_CONTACTS.phone}</small></a></div>`);}
function openSafeguarding(){
  modal(`<span class="eyebrow">SAFEGUARDING</span><h2>Segnalazione riservata</h2><p>Questo canale resta separato dalle richieste ordinarie, dalla community, dal CRM e dalla telemetria. Il contenuto viene preparato solo sul dispositivo e non viene inviato ai servizi ordinari della Super App.</p><div class="notice danger-notice"><b>Pericolo immediato o possibile reato:</b> contatta il 112 o le autorità competenti. L’App non sostituisce i servizi di emergenza.</div><form id="safeForm"><div class="form-grid"><div class="field"><label>Nome e cognome (facoltativo)</label><input id="safeName"></div><div class="field"><label>Recapito (facoltativo)</label><input id="safeContact"></div><div class="field"><label>Luogo / periodo</label><input id="safeWhen"></div><div class="field"><label>Persone coinvolte / testimoni</label><input id="safePeople"></div><div class="field full"><label>Descrizione dei fatti</label><textarea id="safeMessage" required></textarea></div><div class="field full"><label class="check"><input id="safeUrgent" type="checkbox"> <span>Ritengo ci sia un’esigenza urgente di protezione.</span></label></div></div><div id="safeStatus"></div><div class="modal-actions"><button type="button" class="outline" id="safeCancel">ANNULLA</button><button class="primary" type="submit">PREPARA EMAIL RISERVATA</button></div></form><div class="mini-links"><a href="mailto:${PUBLIC_CONTACTS.pec}?subject=${encodeURIComponent('RISERVATO - SAFEGUARDING')}">APRI PEC / EMAIL RISERVATA</a></div>`);
  $('#safeCancel').onclick=closeModal;
  $('#safeForm').onsubmit=e=>{
    e.preventDefault();
    const urgent=$('#safeUrgent').checked?'SI':'NO';
    const subject=encodeURIComponent('RISERVATO - SAFEGUARDING');
    const body=encodeURIComponent(
      'SEGNALAZIONE RISERVATA - SAFEGUARDING\n\n'+
      'Nome e cognome: '+$('#safeName').value.trim()+'\n'+
      'Recapito: '+$('#safeContact').value.trim()+'\n'+
      'Luogo / periodo: '+$('#safeWhen').value.trim()+'\n'+
      'Persone coinvolte / testimoni: '+$('#safePeople').value.trim()+'\n'+
      'Urgenza di protezione: '+urgent+'\n\n'+
      'Descrizione dei fatti:\n'+$('#safeMessage').value.trim()
    );
    const href='mailto:'+PUBLIC_CONTACTS.pec+'?subject='+subject+'&body='+body;
    $('#safeStatus').innerHTML='<div class="status-box"><b>Segnalazione preparata sul dispositivo.</b><br>Per trasmetterla devi aprire il tuo client di posta/PEC e confermare l’invio. Nessun contenuto è stato salvato nella Super App.</div><div class="mini-links"><a class="primary compact" href="'+href+'">APRI E INVIA CON IL TUO CLIENT</a></div>';
  };
}
function openFantasy(rulesOnly=false){const rules=`<div class="notice"><b>Principi:</b> gratuito, non monetario, niente scommesse, niente premi in denaro. Per eventuali atleti minorenni servono regole di tutela e non verranno usati dati personali o statistiche individuali senza base adeguata.</div>`;if(rulesOnly)return modal(`<span class="eyebrow">FANTASY SCD</span><h2>Regole di base</h2>${rules}<div class="fantasy-board"><div class="fantasy-row"><b>Fantasy SCD interno</b><span>Community Club</span></div><div class="fantasy-row"><b>Fantasy esterno</b><span>Link a provider terzi, senza betting</span></div><div class="fantasy-row"><b>Ranking</b><span>Punti, badge, quiz</span></div><div class="fantasy-row"><b>Premi</b><span>Solo simbolici / esperienze Club se approvate</span></div></div>`);modal(`<span class="eyebrow">FANTASY SCD</span><h2>Il gioco della nostra community</h2><p>Area predisposta per utenti registrati. Il primo step è raccogliere interesse e preferenze, poi abilitiamo leghe e regolamento definitivo.</p>${rules}<form id="fantasyForm"><div class="form-grid"><div class="field"><label>Email registrazione SCD</label><input id="fantasyEmail" type="email" required></div><div class="field"><label>Modalità</label><select id="fantasyMode"><option>Fantasy SCD interno</option><option>Fantasy esterno / link provider</option><option>Entrambi</option></select></div><div class="field full"><label>Nome lega desiderato (opzionale)</label><input id="fantasyLeague"></div></div><div class="modal-actions"><button type="button" class="outline" id="fantasyCancel">ANNULLA</button><button class="primary" type="submit">REGISTRA INTERESSE</button></div></form>`);$('#fantasyCancel').onclick=closeModal;$('#fantasyForm').onsubmit=e=>{e.preventDefault();openPublicAction('idea',{topic:'Fantasy SCD · '+$('#fantasyMode').value,message:$('#fantasyLeague').value,email:$('#fantasyEmail').value})}}
function openSky(){const p=$('#skyPanel');p.classList.add('open');p.setAttribute('aria-hidden','false');setTimeout(()=>$('#skyInput').focus(),150)}function closeSky(){const p=$('#skyPanel');p.classList.remove('open');p.setAttribute('aria-hidden','true')}
function skyAnswer(q){const p=publicData(state.summary||FALLBACK);const t=q.toLowerCase();if(/prossim|gara|partita/.test(t)){const n=p.nextMatch||{};return `Prossima gara: ${field(n,'team')||'SCD ColicoDerviese'} contro ${field(n,'opponentName','opponent')||'avversario'}, ${fmtDate(field(n,'date'))}${field(n,'time')?' alle '+field(n,'time'):''}.`}if(/event|torneo/.test(t)){const e=(p.initiatives||[])[0];return e?`In evidenza: ${field(e,'title','event')}. ${[fmtDate(field(e,'date')),field(e,'venue')].filter(Boolean).join(' · ')}.`:'Apri Eventi e Tornei: trovi iniziative, programmi e link di iscrizione.'}if(/iscriv|tesser|giocare|open day|prova/.test(t))return 'Per entrare nella SCD usa “Vuoi giocare con noi?”. La richiesta non assegna automaticamente un tesseramento: viene verificata dalla Segreteria.';if(/registr|profil/.test(t))return 'Puoi registrarti con nome, cognome, email e telefono. Il profilo nasce senza privilegi; la Direzione assegna in seguito l’accesso qualificato.';if(/access|pin|mister|staff|famiglia|atleta/.test(t))return 'Gli accessi qualificati vengono assegnati dalla Direzione SCD. Dopo l’abilitazione userai email e PIN personale.';if(/sponsor|partner|prodotto|fornitore/.test(t))return 'Apri il Commercial Hub: puoi diventare sponsor, proporre prodotti o servizi e richiedere una proposta personalizzata.';if(/campo|affitt|impianto/.test(t))return 'Puoi inviare una richiesta per affitto campo o spazi dal Club Services. La disponibilità viene confermata dalla Società.';if(/fantacalcio|fantasy/.test(t))return 'Fantasy SCD è pensato come gioco community gratuito e non monetario. Per tutela e privacy, eventuali atleti minorenni non vengono usati senza base e consenso adeguati.';if(/safeguard|segnal/.test(t))return 'Per Safeguarding usa esclusivamente il canale riservato dedicato, separato dalla community e dal CRM ordinario.';if(/bigliett|ticket/.test(t))return 'La sezione Biglietti gestisce prenotazioni e, quando sarà configurato un canale di pagamento sicuro, anche l’acquisto.';if(/card|tifoso/.test(t))return 'Le Card SCD sono predisposte per Tifoso, Famiglia, Tesserato e Partner con vantaggi e contenuti differenziati.';return 'Posso aiutarti con gare, iscrizioni, tornei, campi, sponsor, community, fantasy, card, biglietti, contatti e area riservata.'}
function addBubble(text,user=false){const el=document.createElement('div');el.className='bubble '+(user?'user':'bot');el.textContent=text;$('#skyMessages').appendChild(el);$('#skyMessages').scrollTop=$('#skyMessages').scrollHeight}
function zonedEpoch(date,time,tz='Europe/Rome'){
  const dm=String(date||'').match(/^(\d{4})-(\d{2})-(\d{2})$/),tm=String(time||'00:00').match(/^(\d{1,2}):(\d{2})/);
  if(!dm||!tm)return NaN;
  const guess=Date.UTC(+dm[1],+dm[2]-1,+dm[3],+tm[1],+tm[2],0);
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(guess)).reduce((o,p)=>(o[p.type]=p.value,o),{});
  const represented=Date.UTC(+parts.year,+parts.month-1,+parts.day,+parts.hour,+parts.minute,0);
  return guess-(represented-guess);
}
function eventMoment(x){
  const date=String(x.date||'').slice(0,10),time=String(x.time||'00:00').slice(0,5);
  const epoch=zonedEpoch(date,time,state.clubTimeZone);
  return Number.isFinite(epoch)?new Date(epoch):null;
}
async function showLocalNotification(title,body,tag){
  if(!('Notification' in window)||Notification.permission!=='granted')return false;
  try{
    if('serviceWorker' in navigator){
      const reg=await navigator.serviceWorker.ready;
      await reg.showNotification(title,{body,tag,icon:'./assets/icon-192.png',badge:'./assets/icon-192.png',data:{url:location.href+'#oggi'}});
      return true;
    }
    new Notification(title,{body,tag});
    return true;
  }catch{return false}
}
async function checkDueReminders(){
  const now=clubNow().getTime();
  for(let i=0;i<localStorage.length;i++){
    const key=localStorage.key(i);if(!key||!key.startsWith('scd:reminder:'))continue;
    try{
      const x=JSON.parse(localStorage.getItem(key)||'{}');
      if(x.notifiedAt)continue;
      const when=eventMoment(x);if(!when)continue;
      const diff=when.getTime()-now;
      if(diff<=30*60*1000&&diff>=-5*60*1000){
        const ok=await showLocalNotification('SCD ColicoDerviese · '+x.title,'In programma alle '+(x.time||'orario da verificare'),key);
        if(ok){x.notifiedAt=new Date().toISOString();localStorage.setItem(key,JSON.stringify(x));track('notification_interaction',{section:'calendar_reminder'})}
      }
    }catch{}
  }
}
function bindDynamic(){
  $$('[data-scroll]').forEach(b=>b.onclick=()=>$(b.dataset.scroll)?.scrollIntoView({behavior:'smooth'}));
  $$('[data-share]').forEach(b=>b.onclick=async()=>{
    const text=b.dataset.share+' · SCD ColicoDerviese';
    if(navigator.share){
      try{await navigator.share({title:'SCD ColicoDerviese',text,url:location.href});track('share',{section:'content'})}catch{}
    }else{
      try{await navigator.clipboard.writeText(text+' '+location.href);toast('Link copiato')}catch{}
    }
  });
  $$('[data-event-register]').forEach(b=>b.onclick=()=>openPublicAction('tournament',{eventName:b.dataset.event}));
  $$('[data-action]').forEach(b=>b.onclick=()=>{track('cta_click',{section:b.dataset.action||'unknown'});openPublicAction(b.dataset.action)});
}
function boot(){
  updateClubClock();setInterval(updateClubClock,1000);
  const modalClose=$('#modalClose'),modalBackdrop=$('#modalBackdrop'),loginBtn=$('#loginBtn'),mobileProfile=$('#mobileProfile'),heroGames=$('#heroGames'),refreshBtn=$('#refreshBtn'),skyFab=$('#skyFab'),closeSkyBtn=$('#closeSky'),skyForm=$('#skyForm'),installBtn=$('#installBtn'),mobileNotify=$('#mobileNotify'),mobileSettings=$('#mobileSettings');
  if(modalClose)modalClose.onclick=closeModal;
  if(modalBackdrop)modalBackdrop.onclick=e=>{if(e.target===modalBackdrop)closeModal()};
  [$('#registerBtn'),$('#heroRegister'),$('#quickRegister'),$('#bottomRegister')].forEach(b=>b&&b.addEventListener('click',openRegister));
  if(loginBtn)loginBtn.onclick=openProfile;
  if(mobileProfile)mobileProfile.onclick=openProfile;
  if(mobileNotify)mobileNotify.onclick=requestNotificationPermission;
  if(mobileSettings)mobileSettings.onclick=openProfile;
  if(heroGames)heroGames.onclick=()=>$('#gare')?.scrollIntoView({behavior:'smooth'});
  if(refreshBtn)refreshBtn.onclick=()=>loadSummary();
  if(skyFab)skyFab.onclick=openSky;
  const mobileSky=$('#mobileSky');if(mobileSky)mobileSky.onclick=openSky;
  if(closeSkyBtn)closeSkyBtn.onclick=closeSky;
  document.querySelectorAll('[data-sky]').forEach(b=>b.onclick=()=>{const map={next:'Qual è la prossima gara?',join:'Come posso iscrivermi o fare una prova?',sponsor:'Come posso diventare sponsor?',rent:'Come posso affittare un campo?',fan:'Come funziona la community tifosi?'};const q=map[b.dataset.sky]||'Come posso usare la Super App?';addBubble(q,true);setTimeout(()=>addBubble(skyAnswer(q)),180)});
  if(skyForm)skyForm.onsubmit=e=>{e.preventDefault();const input=$('#skyInput'),q=input?.value.trim();if(!q)return;addBubble(q,true);if(input)input.value='';setTimeout(()=>addBubble(skyAnswer(q)),180)};
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();state.installPrompt=e;if(installBtn)installBtn.hidden=false});
  if(installBtn)installBtn.onclick=async()=>{if(!state.installPrompt)return toast('Dal menu del browser scegli “Installa app” o “Aggiungi alla schermata Home”.');state.installPrompt.prompt();await state.installPrompt.userChoice;state.installPrompt=null;installBtn.hidden=true;track('pwa_install',{section:'install'})};
  if('serviceWorker' in navigator){
  navigator.serviceWorker.register('./sw.js?v=28.0.0',{updateViaCache:'none'})
    .then(reg=>reg.update())
    .catch(()=>{});
}bindDynamic();syncClubClock();checkServiceHealth();loadCapabilities();loadPublicCalendar(true);loadWeeklyNewsroom(true);restoreManagementSession();track('page_view',{section:(location.hash||'#home').replace('#','')});window.addEventListener('hashchange',()=>{const section=(location.hash||'#home').replace('#','');track('page_view',{section});setActiveNav(section==='eventi'?'events':section==='home'?'home':'')});loadSummary(true);setInterval(()=>{if(!document.hidden)loadSummary(true)},60000);setInterval(()=>{if(!document.hidden)loadWeeklyNewsroom(true)},300000);setInterval(flushListening,120000);setInterval(checkDueReminders,60000);setTimeout(checkDueReminders,4000);setInterval(()=>{if(!document.hidden)syncClubClock()},300000);setInterval(()=>{if(!document.hidden)loadPublicCalendar(true)},300000);
}
document.addEventListener('DOMContentLoaded',boot);