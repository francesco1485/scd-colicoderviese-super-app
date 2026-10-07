const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
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
$('#refreshBtn').onclick=()=>loadHome();
const fmt=d=>new Intl.DateTimeFormat('it-IT',{weekday:'long',day:'2-digit',month:'long',timeZone:'Europe/Rome'}).format(d);
$('#todayLabel').textContent=fmt(new Date());

function normalizeFeed(raw){
  const d=raw?.data||raw||{};
  const items=Array.isArray(d.items)?d.items:Array.isArray(d.feed)?d.feed:[];
  return items.filter(Boolean);
}
function iso(x){return String(x?.iso||x?.date||'').slice(0,10)}
function todayRome(){
  return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
}
function safe(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
async function fetchJson(url){
  const r=await fetch(url,{cache:'no-store'}); const d=await r.json(); if(!r.ok)throw new Error(d?.error||r.status); return d;
}
async function loadHome(){
  const source=$('#sourceState'),detail=$('#sourceDetail');
  source.textContent='Verifica...'; detail.textContent='R20 · controllo in corso';
  try{
    const [feed,core]=await Promise.all([fetchJson('/api/public'),fetchJson('/api/core-status')]);
    const items=normalizeFeed(feed), today=todayRome();
    const todayRows=items.filter(x=>iso(x)===today && /MATCH|GARA|EVENT|ATTIV/i.test(String(x.feedType||x.kind||x.title||'')));
    const urgent=items.filter(x=>/ALTA|URGENT|SCADEN|MANCANT|BLOCC/i.test(String(x.priority||'')+' '+String(x.status||'')+' '+String(x.title||''))).slice(0,6);
    $('#urgentCount').textContent=String(urgent.length);
    $('#todayCount').textContent=String(todayRows.length);
    $('#deadlineCount').textContent='—';
    $('#docCount').textContent='—';
    source.textContent=core.currentPrimary==='R20'?'R20 ATTIVO':'FONTE LIMITATA';
    detail.textContent='Modalita '+(core.runtimeSafety?.writePolicy||'UNKNOWN');
    $('#priorityState').textContent=urgent.length?'ATTENZIONE':'NESSUN ALERT';
    $('#priorityList').innerHTML=urgent.length?urgent.map(x=>'<article class="item urgent"><span class="dot"></span><div><b>'+safe(x.title||x.kind||'Priorita')+'</b><p>'+safe(x.message||x.status||'Richiede verifica')+'</p></div><time>'+safe(x.date||'')+'</time></article>').join(''):'<div class="empty">Nessuna priorita urgente rilevata nella fonte pubblica. Le priorita private compariranno solo dopo autenticazione e scope reale.</div>';
    const upcoming=items.filter(x=>iso(x)>=today && /MATCH|GARA|EVENT|ATTIV/i.test(String(x.feedType||x.kind||x.title||''))).sort((a,b)=>(iso(a)+(a.time||'')).localeCompare(iso(b)+(b.time||''))).slice(0,7);
    $('#scheduleList').innerHTML=upcoming.length?upcoming.map(x=>'<article class="item"><span class="dot"></span><div><b>'+safe(x.title||x.kind||'Attivita SCD')+'</b><p>'+safe(x.message||x.status||'')+'</p></div><time>'+safe((x.date||'')+(x.time?' · '+x.time:''))+'</time></article>').join(''):'<div class="empty">Nessun impegno verificato disponibile.</div>';
  }catch(e){
    source.textContent='FONTE NON DISPONIBILE';detail.textContent='Nessun dato stimato';
    $('#priorityList').innerHTML='<div class="empty strong">Impossibile verificare le priorita. Il Gestionale non inventa dati.</div>';
    $('#scheduleList').innerHTML='<div class="empty strong">Calendario non disponibile dalla fonte verificata.</div>';
  }
}
loadHome();