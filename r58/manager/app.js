const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const SESSION_KEY='scd:r58:core-session';
const titles={
  home:'Buongiorno. Ecco cosa richiede attenzione.',
  people:'Persone e fornitori',
  roles:'Rapporti e incarichi',
  month:'Piano mensile',
  cash:'Movimenti e tesoreria',
  accounting:'Contabilita',
  deadlines:'Scadenze e documenti'
};
function setView(view){
  $$('.view').forEach(x=>x.classList.toggle('active',x.id==='view-'+view));
  $$('.nav').forEach(x=>x.classList.toggle('active',x.dataset.view===view));
  $('#pageTitle').textContent=titles[view]||titles.home;
}
$$('.nav').forEach(b=>b.onclick=()=>setView(b.dataset.view));
$$('[data-open]').forEach(b=>b.onclick=()=>setView(b.dataset.open));
$('#refreshBtn').onclick=()=>loadHome(true);
const fmt=d=>new Intl.DateTimeFormat('it-IT',{weekday:'long',day:'2-digit',month:'long',timeZone:'Europe/Rome'}).format(d);
$('#todayLabel').textContent=fmt(new Date());

function safe(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[m]))}
function normalizeFeed(raw){const d=raw?.data||raw||{};return (Array.isArray(d.items)?d.items:Array.isArray(d.feed)?d.feed:[]).filter(Boolean)}
function iso(x){return String(x?.iso||x?.date||'').slice(0,10)}
function todayRome(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
function readSession(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'{}')}catch{return {}}}
function saveSession(token,email){localStorage.setItem(SESSION_KEY,JSON.stringify({token,email,savedAt:new Date().toISOString()}))}
function clearSession(){localStorage.removeItem(SESSION_KEY)}
async function fetchJson(url,options={}){const r=await fetch(url,{cache:'no-store',...options});const d=await r.json().catch(()=>({ok:false,error:'Risposta non valida'}));if(!r.ok||d.ok===false)throw new Error(d.error||String(r.status));return d}
async function scdAction(action,payload={},sessionToken=''){
  return fetchJson('/api/scd',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,payload,sessionToken})});
}
function setAuthState(text,ok=false){
  const el=$('#brainAuthState'); if(el){el.textContent=text;el.dataset.state=ok?'VERIFIED':'UNVERIFIED'}
}
async function requestCode(){
  const email=String($('#brainEmail')?.value||'').trim(),st=$('#brainLoginState');
  if(!email){st.textContent='Inserisci la email autorizzata.';return}
  st.textContent='Invio codice in corso...';
  try{await scdAction('auth.request',{email});st.textContent='Se l’account è abilitato, il codice temporaneo è stato inviato.'}
  catch(e){st.textContent=String(e.message||e)}
}
async function loginBrain(){
  const email=String($('#brainEmail')?.value||'').trim(),code=String($('#brainCode')?.value||'').trim(),st=$('#brainLoginState');
  if(!email||!code){st.textContent='Inserisci email e codice/PIN.';return}
  st.textContent='Verifico identità e permessi...';
  try{
    const out=await scdAction('auth.login',{email,pin:code,code});
    const data=out.data||out, token=String(data.token||data.sessionToken||data.accessToken||'');
    if(!token)throw new Error('Sessione non restituita da R20');
    saveSession(token,email);setAuthState('CENTRALINA ATTIVA',true);st.textContent='Accesso riuscito. Carico la Control Room.';
    await loadBrain();
  }catch(e){setAuthState('ACCESSO NEGATO');st.textContent=String(e.message||e)}
}
async function loadBrain(){
  const s=readSession(),st=$('#brainLoginState');
  if(!s.token){setAuthState('NON AUTENTICATO');return false}
  try{
    const brain=await fetchJson('/api/core-brain',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({sessionToken:s.token})});
    setAuthState(brain.health?.state==='VERIFIED'?'CENTRALINA VERIFICATA':'CENTRALINA PARZIALE',true);
    st.textContent='Fonti: '+String(brain.health?.verifiedChannels||0)+'/'+String(brain.health?.totalChannels||0)+' verificate';
    renderBrain(brain);
    return true;
  }catch(e){
    if(/SESSION_INVALID|SESSION_REQUIRED/i.test(String(e.message||e)))clearSession();
    setAuthState('CENTRALINA NON DISPONIBILE');
    st.textContent=String(e.message||e);
    return false;
  }
}
function renderBrain(brain){
  const q=Array.isArray(brain.actionQueue)?brain.actionQueue:[];
  const urgent=q.filter(x=>Number(x.explicitPriorityScore||0)>=3);
  const due=q.filter(x=>x.due);
  $('#urgentCount').textContent=String(urgent.length);
  $('#deadlineCount').textContent=String(due.length);
  $('#docCount').textContent=String((brain.health?.unavailable||[]).length);
  $('#priorityState').textContent=brain.health?.state||'UNKNOWN';
  $('#sourceState').textContent='R20 + CORE BRAIN';
  $('#sourceDetail').textContent='Canali verificati '+String(brain.health?.verifiedChannels||0)+'/'+String(brain.health?.totalChannels||0);
  $('#priorityList').innerHTML=q.length?q.slice(0,8).map(x=>'<article class="item '+(Number(x.explicitPriorityScore)>=3?'urgent':'')+'"><span class="dot"></span><div><b>'+safe(x.title)+'</b><p>'+safe(x.nextAction||x.status||'Nessuna prossima azione esplicita')+'</p><p>Fonte: '+safe(x.source||x.evidence?.channel||'')+(x.owner?' · Responsabile: '+safe(x.owner):'')+'</p></div><time>'+safe(x.due||'')+'</time></article>').join(''):'<div class="empty">La centralina non ha trovato azioni esplicite nelle fonti disponibili.</div>';
}
async function loadPublic(){
  const [feed,core]=await Promise.all([fetchJson('/api/public'),fetchJson('/api/core-status')]);
  const items=normalizeFeed(feed),today=todayRome();
  const todayRows=items.filter(x=>iso(x)===today&&/MATCH|GARA|EVENT|ATTIV/i.test(String(x.feedType||x.kind||x.title||'')));
  $('#todayCount').textContent=String(todayRows.length);
  const upcoming=items.filter(x=>iso(x)>=today&&/MATCH|GARA|EVENT|ATTIV/i.test(String(x.feedType||x.kind||x.title||''))).sort((a,b)=>(iso(a)+(a.time||'')).localeCompare(iso(b)+(b.time||''))).slice(0,7);
  $('#scheduleList').innerHTML=upcoming.length?upcoming.map(x=>'<article class="item"><span class="dot"></span><div><b>'+safe(x.title||x.kind||'Attività SCD')+'</b><p>'+safe(x.message||x.status||'')+'</p></div><time>'+safe((x.date||'')+(x.time?' · '+x.time:''))+'</time></article>').join(''):'<div class="empty">Nessun impegno verificato disponibile.</div>';
  if(!readSession().token){$('#sourceState').textContent=core.currentPrimary==='R20'?'R20 ATTIVO':'FONTE LIMITATA';$('#sourceDetail').textContent='Modalità '+(core.runtimeSafety?.writePolicy||'UNKNOWN')}
}
async function loadHome(force=false){
  try{
    await loadPublic();
    if(readSession().token)await loadBrain();
    else {
      $('#priorityList').innerHTML='<div class="empty strong">Accedi alla centralina per vedere priorità, richieste, scadenze, posta operativa e prossime azioni autorizzate.</div>';
      $('#priorityState').textContent='ACCESSO RICHIESTO';
    }
  }catch(e){
    $('#sourceState').textContent='FONTE NON DISPONIBILE';$('#sourceDetail').textContent='Nessun dato stimato';
    $('#priorityList').innerHTML='<div class="empty strong">Impossibile verificare le priorità. Il Gestionale non inventa dati.</div>';
    $('#scheduleList').innerHTML='<div class="empty strong">Calendario non disponibile dalla fonte verificata.</div>';
  }
}
$('#brainRequestCode')?.addEventListener('click',requestCode);
$('#brainLoginBtn')?.addEventListener('click',loginBrain);
const saved=readSession();if(saved.email&&$('#brainEmail'))$('#brainEmail').value=saved.email;
loadHome();