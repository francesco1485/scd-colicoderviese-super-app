const APP_VERSION='21.6.0';
const DYNAMIC_ORIGIN=(/^(localhost|127\.0\.0\.1)$/.test(location.hostname)||location.hostname.endsWith('.onrender.com'))
  ? location.origin
  : 'https://scd-colicoderviese-official-r21.onrender.com';
const API=DYNAMIC_ORIGIN+'/api/scd';
const LIVE_API=DYNAMIC_ORIGIN+'/api/live';
const HEALTH_API=DYNAMIC_ORIGIN+'/health';
const REQUESTS_KEY='scd:requests:v1';
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
let state={summary:null,installPrompt:null,session:null,apiStatus:'checking'};

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
function openMyRequests(){
  const rows=localRequests();
  const body=rows.length?rows.map(x=>`<article class="request-history-card"><div><span class="request-kind">${esc(requestKindLabel(x.kind))}</span><b>${esc(x.topic||x.id)}</b><small>${esc(new Date(x.createdAt||x.updatedAt||Date.now()).toLocaleString('it-IT'))}</small></div><div class="request-state ${esc(String(x.status||'').toLowerCase())}">${esc(x.status||'SALVATA')}</div><code>${esc(x.serverId||x.id)}</code></article>`).join(''):'<div class="empty-state"><b>Nessuna richiesta ancora.</b><p>Quando invii una richiesta dall’app, la ritrovi qui con data e stato.</p></div>';
  modal(`<span class="eyebrow">AREA PERSONALE</span><h2>Le mie richieste</h2><p>Registro locale sul tuo dispositivo. Quando il bridge gestionale conferma l’invio, viene mostrato anche l’ID server.</p><div class="request-history">${body}</div>`);
}
function updateApiBadge(status,label){
  state.apiStatus=status;
  const el=$('#apiStatus'); if(!el)return;
  el.className='api-status '+status;
  el.innerHTML=`<i></i><span>${esc(label)}</span>`;
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
  let base=null,radar=null;
  try{base=normalizePublic(await api('public.feed',{limit:40}))}catch(e){const cached=localStorage.getItem('scd:r21:summary');base=cached?JSON.parse(cached):JSON.parse(JSON.stringify(FALLBACK))}
  try{const r=await fetch(LIVE_API,{cache:'no-store'});if(r.ok)radar=await r.json()}catch{}
  const data=base||JSON.parse(JSON.stringify(FALLBACK));data.public=data.public||{};
  if(radar&&Array.isArray(radar.items)&&radar.items.length){const internal=data.public.highlights||[];data.public.highlights=[...radar.items,...internal].slice(0,24);data.generatedAt=new Date(radar.generatedAt||Date.now()).toLocaleString('it-IT')}
  if(!Array.isArray(data.public.sponsors)||!data.public.sponsors.length)data.public.sponsors=FALLBACK.public.sponsors;
  state.summary=data;localStorage.setItem('scd:r21:summary',JSON.stringify(data));render(data);if(!silent)toast(radar&&radar.items?.length?'SCD Radar aggiornato':'Dati SCD aggiornati')
}
function publicData(data){return (data&&data.public)||FALLBACK.public}
function render(data){const p=publicData(data);$$('[data-season]').forEach(el=>el.textContent=data.season||'2026/27');$('#updatedAt').textContent=data.generatedAt||'ora';renderHero(p);renderTicker(p);renderMatches(p);renderEvents(p);renderNews(p);renderSponsors(p)}
function renderHero(p){const n=p.nextMatch||{};$('#nextDate').textContent=fmtDate(field(n,'date','data'));$('#nextTime').textContent=field(n,'time','ora')||'—';const opp=field(n,'opponentName','opponent','avversario','title')||'Avversario';$('#nextOpponent').textContent=opp;$('#opponentBadge').textContent=opp.slice(0,1).toUpperCase();$('#nextVenue').textContent=field(n,'venue','luogo','field')||'Sede da aggiornare'}
function renderTicker(p){const h=p.highlights||[];$('#liveTicker').innerHTML='<span>'+esc(h.slice(0,5).map(x=>field(x,'title','subject','event')||'Aggiornamento SCD').join('  •  ')||'SCD ColicoDerviese · aggiornamenti in corso')+'</span>'}
function renderMatches(p){const n=p.nextMatch||{};const l=p.lastResult||{};const cards=[];if(Object.keys(n).length)cards.push(matchCard(n,'PROSSIMA GARA',false));if(Object.keys(l).length)cards.push(matchCard(l,'ULTIMO RISULTATO',true));const extras=(p.highlights||[]).filter(x=>/gara|match|risultat/i.test([x.feedType,x.title,x.subject].join(' '))).slice(0,2);extras.forEach((x,i)=>cards.push(`<article class="match-card"><span class="tag">AGGIORNAMENTO GARA</span><h3>${esc(field(x,'title','subject')||'SCD ColicoDerviese')}</h3><p>${esc(field(x,'message','venue','status')||'Aggiornamento disponibile')}</p><div class="scoreline"><small>${esc(fmtDate(field(x,'date')))}</small><strong>→</strong></div></article>`));if(!cards.length)cards.push('<article class="match-card"><span class="tag">CALENDARIO SCD</span><h3>Dati gara in sincronizzazione</h3><p>La Super App non mostra partite inventate. Apri il calendario ufficiale o aggiorna tra poco.</p><div class="scoreline"><small>Fonte: SCD / federazione</small><strong>↻</strong></div></article>');$('#matchGrid').innerHTML=cards.join('')}
function matchCard(x,label,result){const opp=field(x,'opponentName','opponent','avversario','title')||'Avversario';const score=field(x,'result','score','risultato');return `<article class="match-card ${result?'result':''}"><span class="tag">${label}</span><h3>${esc(field(x,'team','teamName')||'SCD ColicoDerviese')} · ${esc(opp)}</h3><p>${esc(fmtDate(field(x,'date','data')))}${field(x,'time','ora')?' · '+esc(field(x,'time','ora')):''}</p><div class="scoreline"><small>${esc(field(x,'venue','luogo','field')||'Sede da aggiornare')}</small><strong>${esc(score||'VS')}</strong></div></article>`}
function eventImage(x,i){return field(x,'image','imageUrl','featuredImage')||(i===0?'/assets/event-insieme.webp':'')}
function renderEvents(p){const rows=(p.initiatives||[]).slice(0,5);const use=rows.length?rows:FALLBACK.public.initiatives;$('#eventGrid').innerHTML=use.slice(0,3).map((x,i)=>{const img=eventImage(x,i);const title=field(x,'title','event','name')||'Evento SCD';const url=field(x,'registrationUrl','url','link');return `<article class="event-card ${i===0?'feature':''}">${img?`<img src="${esc(img)}" alt="${esc(title)}" loading="lazy">`:''}<div class="event-shade"></div><div class="event-content"><span class="event-type">${esc(field(x,'type','kind','status')||'EVENTO SCD')}</span><h3>${esc(title)}</h3><p>${esc([fmtDate(field(x,'date')),field(x,'time'),field(x,'venue','luogo')].filter(Boolean).join(' · '))}</p><div class="event-actions">${url?`<a class="go" href="${esc(url)}" target="_blank" rel="noopener">ISCRIVITI</a>`:`<button class="go" data-event-register="${esc(title)}">SCOPRI</button>`}<button class="share" data-share="${esc(title)}">CONDIVIDI</button></div></div></article>`}).join('');bindDynamic()}
function renderNews(p){const rows=(p.highlights||[]).slice(0,6);const use=rows.length?rows:FALLBACK.public.highlights;const f=use[0]||{};$('#featureNews').innerHTML=`<span class="news-source">${esc(field(f,'source','feedType')||'SCD PULSE')}</span><h3>${esc(field(f,'title','subject','event')||'Aggiornamento SCD')}</h3><p>${esc(field(f,'message','excerpt','venue')||'Informazioni societarie e territoriali in aggiornamento.')}</p>`;$('#newsList').innerHTML=use.slice(1,6).map(x=>`<div class="news-row"><span class="news-icon">${/urgent|variaz|cambio/i.test([x.status,x.feedType,x.title].join(' '))?'!':'◉'}</span><span><b>${esc(field(x,'title','subject','event')||'Aggiornamento')}</b><small>${esc(field(x,'message','venue','status')||field(x,'feedType')||'SCD')}</small></span><time>${esc(field(x,'date','time')||'')}</time></div>`).join('')}
function renderSponsors(p){const rows=(p.sponsors||[]).slice(0,12);const use=rows.length?rows:FALLBACK.public.sponsors;$('#sponsorGrid').innerHTML=use.slice(0,8).map(x=>{const name=field(x,'name','sponsor','company','title')||'Partner SCD';const logo=field(x,'logo','logoUrl','image');const url=field(x,'url','website','link');const inner=logo?`<img src="${esc(logo)}" alt="${esc(name)}" loading="lazy">`:`<span>${esc(name)}</span>`;return url?`<a class="sponsor-card" href="${esc(url)}" target="_blank" rel="noopener">${inner}</a>`:`<div class="sponsor-card">${inner}</div>`}).join('');const names=use.map(x=>field(x,'name','sponsor','company','title')||'Partner SCD');const text=(names.length?names:['SCD Partner']).join('   ◆   ');$('#sponsorTrack').innerHTML=`<span>${esc(text)}   ◆   ${esc(text)}</span>`}
function openRegister(){modal(`<span class="eyebrow">SCD COMMUNITY</span><h2>Registrati</h2><p>Crei un solo account SCD. Entri sempre come Utente Base e continui a ricevere news, gare, eventi, community e servizi. Se fai parte della Società, la Direzione abiliterà in seguito le funzioni dedicate senza creare un secondo account.</p><form id="registerForm"><div class="form-grid"><div class="field"><label>Nome</label><input id="regName" required autocomplete="given-name"></div><div class="field"><label>Cognome</label><input id="regSurname" required autocomplete="family-name"></div><div class="field"><label>Email</label><input id="regEmail" type="email" required autocomplete="email"></div><div class="field"><label>Telefono</label><input id="regPhone" type="tel" required inputmode="tel" autocomplete="tel"></div><div class="field full"><label class="check"><input id="regPrivacy" type="checkbox" required> <span>Ho letto l’informativa privacy e autorizzo il trattamento dei dati necessari alla registrazione e alla gestione dell’accesso SCD.</span></label></div></div><div id="regStatus"></div><div class="modal-actions"><button type="button" class="outline" id="cancelReg">ANNULLA</button><button class="primary" type="submit">REGISTRATI</button></div></form>`);$('#cancelReg').onclick=closeModal;$('#registerForm').onsubmit=submitRegistration}
async function submitRegistration(e){e.preventDefault();const btn=e.currentTarget.querySelector('[type="submit"]');btn.disabled=true;btn.textContent='REGISTRAZIONE…';const payload={name:`${$('#regName').value.trim()} ${$('#regSurname').value.trim()}`.trim(),firstName:$('#regName').value.trim(),lastName:$('#regSurname').value.trim(),email:$('#regEmail').value.trim(),phone:$('#regPhone').value.trim(),type:'UTENTE REGISTRATO',privacy:true};const localId=requestId('REG');upsertLocalRequest({id:localId,kind:'registration',topic:'Registrazione Utente Base',status:'IN INVIO',channel:'APP',createdAt:new Date().toISOString()});try{const r=await api('public.register',payload);upsertLocalRequest({id:localId,status:'INVIATA',serverId:r.id||r.requestId||'',channel:'GESTIONALE'});$('#regStatus').innerHTML=`<div class="status-box"><b>Registrazione completata.</b><br>${esc(r.message||'Profilo base registrato. Il tuo profilo resta Utente Base. La Direzione potrà aggiungere in seguito eventuali funzioni dedicate sullo stesso account.')}</div>`;btn.hidden=true;setTimeout(closeModal,2600)}catch(err){upsertLocalRequest({id:localId,status:'DA COMPLETARE',channel:'EMAIL'});const subj=encodeURIComponent('REGISTRAZIONE SUPER APP SCD');const body=encodeURIComponent(`Nome: ${payload.firstName} ${payload.lastName}\nEmail: ${payload.email}\nTelefono: ${payload.phone}\nPrivacy: SI`);$('#regStatus').innerHTML=`<div class="status-box" style="background:#fff8dd;color:#6c5200"><b>Registrazione pronta.</b><br>Il bridge diretto al gestionale è in attivazione. Invia subito la richiesta alla Segreteria.<br><br><a class="primary compact" href="mailto:${PUBLIC_CONTACTS.general}?subject=${subj}&body=${body}">INVIA ALLA SEGRETERIA</a></div>`;btn.hidden=true} }
function openLogin(){window.open(R20_APP,'_blank','noopener,noreferrer');toast('Apro l’Area riservata SCD')}
function openProfile(){
  const count=localRequests().length;
  modal(`<span class="eyebrow">PROFILO SCD</span><h2>La tua area</h2><p>Un unico ingresso per richieste, identità digitale e funzioni societarie autorizzate.</p><div class="profile-hub-grid"><button class="choice-tile" id="profileRequests"><b>Le mie richieste</b><small>${count} registrate su questo dispositivo</small></button><button class="choice-tile" id="profileAvatar"><b>Avatar & foto</b><small>Identità digitale SCD</small></button><button class="choice-tile" id="profileR20"><b>Area riservata SCD</b><small>Famiglia · Atleta · Staff · Direzione</small></button><button class="choice-tile" id="profileRefresh"><b>Sincronizza</b><small>Controlla servizi e aggiornamenti</small></button></div><div class="notice"><b>Account unico:</b> entri sempre come Utente Base. Gli eventuali permessi societari vengono aggiunti dalla Direzione sullo stesso account.</div>`);
  $('#profileRequests').onclick=openMyRequests;
  $('#profileAvatar').onclick=openAvatarStudio;
  $('#profileR20').onclick=openLogin;
  $('#profileRefresh').onclick=async()=>{await checkServiceHealth();await loadSummary();};
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
function openSafeguarding(){modal(`<span class="eyebrow">SAFEGUARDING</span><h2>Segnalazione riservata</h2><p>Questo canale è separato dalle richieste ordinarie, dalla community e dal CRM commerciale.</p><div class="notice danger-notice"><b>Pericolo immediato o possibile reato:</b> contatta il 112 o le autorità competenti. L’App non sostituisce i servizi di emergenza.</div><form id="safeForm"><div class="form-grid"><div class="field"><label>Nome e cognome (facoltativo)</label><input id="safeName"></div><div class="field"><label>Recapito (facoltativo)</label><input id="safeContact"></div><div class="field"><label>Luogo / periodo</label><input id="safeWhen"></div><div class="field"><label>Persone coinvolte / testimoni</label><input id="safePeople"></div><div class="field full"><label>Descrizione dei fatti</label><textarea id="safeMessage" required></textarea></div><div class="field full"><label class="check"><input id="safeUrgent" type="checkbox"> <span>Ritengo ci sia un’esigenza urgente di protezione.</span></label></div></div><div id="safeStatus"></div><div class="modal-actions"><button type="button" class="outline" id="safeCancel">ANNULLA</button><button class="primary" type="submit">PREPARA SEGNALAZIONE</button></div></form><div class="mini-links"><a href="mailto:${PUBLIC_CONTACTS.pec}?subject=${encodeURIComponent('RISERVATO - SAFEGUARDING')}">PEC / EMAIL RISERVATA</a></div>`);$('#safeCancel').onclick=closeModal;$('#safeForm').onsubmit=async e=>{e.preventDefault();const payload={name:$('#safeName').value.trim(),contact:$('#safeContact').value.trim(),when:$('#safeWhen').value.trim(),people:$('#safePeople').value.trim(),message:$('#safeMessage').value.trim(),urgent:$('#safeUrgent').checked};try{await api('safeguarding.submit',payload);$('#safeStatus').innerHTML='<div class="status-box"><b>Segnalazione trasmessa al canale riservato.</b></div>'}catch(err){$('#safeStatus').innerHTML='<div class="status-box" style="background:#fff2f0;color:#8b2924"><b>Canale digitale in attivazione.</b><br>Usa il collegamento PEC/email riservata qui sotto: il contenuto non viene salvato nella community.</div>'}}}
function openFantasy(rulesOnly=false){const rules=`<div class="notice"><b>Principi:</b> gratuito, non monetario, niente scommesse, niente premi in denaro. Per eventuali atleti minorenni servono regole di tutela e non verranno usati dati personali o statistiche individuali senza base adeguata.</div>`;if(rulesOnly)return modal(`<span class="eyebrow">FANTASY SCD</span><h2>Regole di base</h2>${rules}<div class="fantasy-board"><div class="fantasy-row"><b>Fantasy SCD interno</b><span>Community Club</span></div><div class="fantasy-row"><b>Fantasy esterno</b><span>Link a provider terzi, senza betting</span></div><div class="fantasy-row"><b>Ranking</b><span>Punti, badge, quiz</span></div><div class="fantasy-row"><b>Premi</b><span>Solo simbolici / esperienze Club se approvate</span></div></div>`);modal(`<span class="eyebrow">FANTASY SCD</span><h2>Il gioco della nostra community</h2><p>Area predisposta per utenti registrati. Il primo step è raccogliere interesse e preferenze, poi abilitiamo leghe e regolamento definitivo.</p>${rules}<form id="fantasyForm"><div class="form-grid"><div class="field"><label>Email registrazione SCD</label><input id="fantasyEmail" type="email" required></div><div class="field"><label>Modalità</label><select id="fantasyMode"><option>Fantasy SCD interno</option><option>Fantasy esterno / link provider</option><option>Entrambi</option></select></div><div class="field full"><label>Nome lega desiderato (opzionale)</label><input id="fantasyLeague"></div></div><div class="modal-actions"><button type="button" class="outline" id="fantasyCancel">ANNULLA</button><button class="primary" type="submit">REGISTRA INTERESSE</button></div></form>`);$('#fantasyCancel').onclick=closeModal;$('#fantasyForm').onsubmit=e=>{e.preventDefault();openPublicAction('idea',{topic:'Fantasy SCD · '+$('#fantasyMode').value,message:$('#fantasyLeague').value,email:$('#fantasyEmail').value})}}
function openSky(){const p=$('#skyPanel');p.classList.add('open');p.setAttribute('aria-hidden','false');setTimeout(()=>$('#skyInput').focus(),150)}function closeSky(){const p=$('#skyPanel');p.classList.remove('open');p.setAttribute('aria-hidden','true')}
function skyAnswer(q){const p=publicData(state.summary||FALLBACK);const t=q.toLowerCase();if(/prossim|gara|partita/.test(t)){const n=p.nextMatch||{};return `Prossima gara: ${field(n,'team')||'SCD ColicoDerviese'} contro ${field(n,'opponentName','opponent')||'avversario'}, ${fmtDate(field(n,'date'))}${field(n,'time')?' alle '+field(n,'time'):''}.`}if(/event|torneo/.test(t)){const e=(p.initiatives||[])[0];return e?`In evidenza: ${field(e,'title','event')}. ${[fmtDate(field(e,'date')),field(e,'venue')].filter(Boolean).join(' · ')}.`:'Apri Eventi e Tornei: trovi iniziative, programmi e link di iscrizione.'}if(/iscriv|tesser|giocare|open day|prova/.test(t))return 'Per entrare nella SCD usa “Vuoi giocare con noi?”. La richiesta non assegna automaticamente un tesseramento: viene verificata dalla Segreteria.';if(/registr|profil/.test(t))return 'Puoi registrarti con nome, cognome, email e telefono. Il profilo nasce senza privilegi; la Direzione assegna in seguito l’accesso qualificato.';if(/access|pin|mister|staff|famiglia|atleta/.test(t))return 'Gli accessi qualificati vengono assegnati dalla Direzione SCD. Dopo l’abilitazione userai email e PIN personale.';if(/sponsor|partner|prodotto|fornitore/.test(t))return 'Apri il Commercial Hub: puoi diventare sponsor, proporre prodotti o servizi e richiedere una proposta personalizzata.';if(/campo|affitt|impianto/.test(t))return 'Puoi inviare una richiesta per affitto campo o spazi dal Club Services. La disponibilità viene confermata dalla Società.';if(/fantacalcio|fantasy/.test(t))return 'Fantasy SCD è pensato come gioco community gratuito e non monetario. Per tutela e privacy, eventuali atleti minorenni non vengono usati senza base e consenso adeguati.';if(/safeguard|segnal/.test(t))return 'Per Safeguarding usa esclusivamente il canale riservato dedicato, separato dalla community e dal CRM ordinario.';if(/bigliett|ticket/.test(t))return 'La sezione Biglietti gestisce prenotazioni e, quando sarà configurato un canale di pagamento sicuro, anche l’acquisto.';if(/card|tifoso/.test(t))return 'Le Card SCD sono predisposte per Tifoso, Famiglia, Tesserato e Partner con vantaggi e contenuti differenziati.';return 'Posso aiutarti con gare, iscrizioni, tornei, campi, sponsor, community, fantasy, card, biglietti, contatti e area riservata.'}
function addBubble(text,user=false){const el=document.createElement('div');el.className='bubble '+(user?'user':'bot');el.textContent=text;$('#skyMessages').appendChild(el);$('#skyMessages').scrollTop=$('#skyMessages').scrollHeight}
function bindDynamic(){$('[data-action]').forEach(b=>b.addEventListener('click',()=>track('cta_click',{section:b.dataset.action||'unknown'})));$('[data-scroll]').forEach(b=>b.onclick=()=>$(b.dataset.scroll)?.scrollIntoView({behavior:'smooth'}));$$('[data-share]').forEach(b=>b.onclick=async()=>{const text=b.dataset.share+' · SCD ColicoDerviese';if(navigator.share)try{await navigator.share({title:'SCD ColicoDerviese',text,url:location.href});track('share',{section:'content'})}catch{}else{await navigator.clipboard.writeText(text+' '+location.href);toast('Link copiato')}});$$('[data-event-register]').forEach(b=>b.onclick=()=>openPublicAction('tournament',{eventName:b.dataset.event}));$$('[data-action]').forEach(b=>b.onclick=()=>openPublicAction(b.dataset.action))}
function boot(){
  $('#modalClose').onclick=closeModal;$('#modalBackdrop').onclick=e=>{if(e.target===$('#modalBackdrop'))closeModal()};
  [$('#registerBtn'),$('#heroRegister'),$('#quickRegister'),$('#bottomRegister')].forEach(b=>b&&b.addEventListener('click',openRegister));$('#loginBtn').onclick=openProfile;$('#mobileProfile').onclick=openProfile;$('#heroGames').onclick=()=>$('#gare').scrollIntoView({behavior:'smooth'});$('#refreshBtn').onclick=()=>loadSummary();
  $('#skyFab').onclick=openSky;const mobileSky=$('#mobileSky');if(mobileSky)mobileSky.onclick=openSky;$('#closeSky').onclick=closeSky;$$('[data-sky]').forEach(b=>b.onclick=()=>{const map={next:'Qual è la prossima gara?',join:'Come posso iscrivermi o fare una prova?',sponsor:'Come posso diventare sponsor?',rent:'Come posso affittare un campo?',fan:'Come funziona la community tifosi?'};const q=map[b.dataset.sky]||'Come posso usare la Super App?';addBubble(q,true);setTimeout(()=>addBubble(skyAnswer(q)),180)});$('#skyForm').onsubmit=e=>{e.preventDefault();const q=$('#skyInput').value.trim();if(!q)return;addBubble(q,true);$('#skyInput').value='';setTimeout(()=>addBubble(skyAnswer(q)),180)};
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();state.installPrompt=e;$('#installBtn').hidden=false});$('#installBtn').onclick=async()=>{if(!state.installPrompt)return toast('Dal menu del browser scegli “Installa app” o “Aggiungi alla schermata Home”.');state.installPrompt.prompt();await state.installPrompt.userChoice;state.installPrompt=null;$('#installBtn').hidden=true;track('pwa_install',{section:'install'})};
  if('serviceWorker' in navigator){
  navigator.serviceWorker.register('./sw.js?v=21.6.0',{updateViaCache:'none'})
    .then(reg=>reg.update())
    .catch(()=>{});
}bindDynamic();checkServiceHealth();track('page_view',{section:(location.hash||'#home').replace('#','')});window.addEventListener('hashchange',()=>track('page_view',{section:(location.hash||'#home').replace('#','')}));loadSummary(true);setInterval(()=>{if(!document.hidden)loadSummary(true)},60000);setInterval(flushListening,120000);
}
document.addEventListener('DOMContentLoaded',boot);