(()=>{
'use strict';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const state={view:'pulse',filter:'ALL',events:[],news:null};
const toast=(t)=>{const el=$('#toast');el.textContent=t;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),2200)};
function setView(view){
  state.view=view;
  $$('[data-view]').forEach(x=>x.classList.toggle('active',x.dataset.view===view));
  $$('[data-nav]').forEach(x=>x.classList.toggle('active',x.dataset.nav===view));
  const ctx=view==='desk'?'PRIVATE DESK · ROLE/SCOPE':view==='twin'?'SCD TWIN · PERSONALE':'PULSE · PUBBLICO';
  $('#mirrorContext').textContent=ctx;
  history.replaceState(null,'','#'+view);
  window.scrollTo({top:0,behavior:'smooth'});
}
$$('[data-nav]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.nav)));
$('#modeBtn').addEventListener('click',()=>{document.body.classList.toggle('compact');toast(document.body.classList.contains('compact')?'Densità compatta':'Densità comfort')});
$$('[data-scroll]').forEach(b=>b.addEventListener('click',()=>$(b.dataset.scroll)?.scrollIntoView({behavior:'smooth'})));
function clubClock(){
  const d=new Date(), parts=new Intl.DateTimeFormat('it-IT',{timeZone:'Europe/Rome',weekday:'short',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(d);
  $('#clubNow').textContent='EUROPE/ROME · '+parts.toUpperCase();
}
clubClock();setInterval(clubClock,30000);

function currentWeek(){
 const now=new Date(), day=(now.getDay()+6)%7, start=new Date(now);start.setHours(12,0,0,0);start.setDate(start.getDate()-day);
 return Array.from({length:7},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);return d});
}
function renderWeek(){
 const names=['LUN','MAR','MER','GIO','VEN','SAB','DOM'], today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome'}).format(new Date());
 $('#weekRail').innerHTML=currentWeek().map((d,i)=>{
   const iso=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome'}).format(d);
   const ev=state.events.filter(x=>x.date===iso&&(state.filter==='ALL'||x.group===state.filter));
   return '<article class="day '+(iso===today?'today':'')+'"><span class="day-name">'+names[i]+'</span><div class="date">'+String(d.getDate()).padStart(2,'0')+'</div>'+
   (ev.length?ev.map(x=>'<div class="event-pill"><b>'+esc(x.team||x.title||'SCD')+'</b><small>'+esc([x.time,x.title,x.venue].filter(Boolean).join(' · '))+'</small></div>').join(''):'<div class="empty">Dato in aggiornamento<br><small>nessun evento verificato collegato</small></div>')+'</article>';
 }).join('');
}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
renderWeek();
$('#radarFilters').addEventListener('click',e=>{const b=e.target.closest('[data-filter]');if(!b)return;state.filter=b.dataset.filter;$$('#radarFilters button').forEach(x=>x.classList.toggle('active',x===b));renderWeek()});

async function hydrate(){
  try{
    const r=await fetch('/api/newsroom',{cache:'no-store'});
    if(!r.ok)throw new Error('newsroom unavailable');
    const data=await r.json(); state.news=data;
    const rows=Array.isArray(data.calendar?.rows)?data.calendar.rows:[];
    state.events=rows.map(x=>({...x,group:/torneo|event/i.test(x.kind||'')?'EVENTI':/201[5-9]|2020|pulcin|primi calci|base/i.test((x.team||'')+' '+(x.category||''))?'BASE':'AGONISTICA'}));
    $('#weekCount').textContent=String(rows.length);
    const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome'}).format(new Date());
    $('#todayCount').textContent=String(rows.filter(x=>x.date===today).length);
    const match=rows.find(x=>x.kind==='MATCH'&&x.date>=today);
    $('#nextMatch').textContent=match?[match.team,match.date,match.time].filter(Boolean).join(' · '):'Dato in aggiornamento';
    const todayEv=rows.filter(x=>x.date===today);
    $('#todayHeadline').textContent=todayEv.length?todayEv.length+' attività verificate':'Dato in aggiornamento';
    $('#todayDetail').textContent=todayEv.length?todayEv.slice(0,3).map(x=>[x.team,x.time,x.title].filter(Boolean).join(' · ')).join('  |  '):'Nessuna attività verificata disponibile nella fonte collegata.';
    const card=Array.isArray(data.cards)?data.cards.find(c=>c.evidence?.length):null;
    if(card){$('#storyTitle').textContent=card.title||'SCD Newsroom';$('#storyText').textContent=card.dek||card.body||'Contenuto verificato';}
    renderWeek();
  }catch(e){
    $('#weekCount').textContent='—';$('#todayCount').textContent='—';renderWeek();
  }
}
hydrate();$('#refreshData').addEventListener('click',()=>{hydrate();toast('Aggiornamento richiesto')});

const twinKey='scd:nextgen:twin:v1';
function loadTwin(){
  try{return JSON.parse(localStorage.getItem(twinKey)||'{}')}catch{return {}}
}
function applyTwin(t=loadTwin()){
  const name=t.name||'Il mio Twin',num=t.number||10,xp=Number(t.xp||0);
  $('#twinName').textContent=name;$('#twinXp').textContent=xp+' XP';$('#avatarNumber').textContent=num;$('#miniInitials').textContent=(name==='Il mio Twin'?'SCD':name.slice(0,2)).toUpperCase();
  $('#twinNameInput').value=t.name||'';$('#numberInput').value=num;
  if(t.photo){$('#avatarHead').classList.add('photo');$('#avatarHead').style.backgroundImage='url('+JSON.stringify(t.photo).slice(1,-1)+')'}else{$('#avatarHead').classList.remove('photo');$('#avatarHead').style.backgroundImage=''}
}
applyTwin();
$('#photoInput').addEventListener('change',e=>{
 const f=e.target.files?.[0];if(!f)return;
 if(f.size>3_000_000)return toast('Foto troppo grande: massimo 3 MB per questa demo locale');
 const rd=new FileReader();rd.onload=()=>{const t=loadTwin();t.photo=rd.result;localStorage.setItem(twinKey,JSON.stringify(t));applyTwin(t);toast('Foto applicata localmente')};rd.readAsDataURL(f);
});
$('#saveTwin').addEventListener('click',()=>{
 const t=loadTwin();t.name=$('#twinNameInput').value.trim().slice(0,24)||'Il mio Twin';t.number=Math.max(1,Math.min(99,Number($('#numberInput').value||10)));t.role=$('#roleInput').value;localStorage.setItem(twinKey,JSON.stringify(t));applyTwin(t);toast('Twin salvato sul dispositivo');
});
$('#missionBtn').addEventListener('click',()=>{const t=loadTwin();t.xp=Number(t.xp||0)+10;localStorage.setItem(twinKey,JSON.stringify(t));applyTwin(t);$('#avatarFigure').animate([{transform:'translateY(0)'},{transform:'translateY(-14px)'},{transform:'translateY(0)'}],{duration:500});toast('+10 XP · missione sicura')});

const mirror=$('#mirror');
function openMirror(){mirror.classList.add('open');mirror.setAttribute('aria-hidden','false');setTimeout(()=>$('#mirrorInput').focus(),200)}
function closeMirror(){mirror.classList.remove('open');mirror.setAttribute('aria-hidden','true')}
['#mirrorFab','#mirrorNav','#openMirrorFromCard','#openMirrorDesk'].forEach(s=>$(s)?.addEventListener('click',openMirror));$('#closeMirror').addEventListener('click',closeMirror);
function mirrorReply(q){
 const x=q.toLowerCase();
 if(/calend|gara|allen/.test(x))return 'Posso portarti al Weekly Radar e, quando il tuo ruolo è autenticato, filtrare le attività pertinenti. Non invento eventi mancanti.';
 if(/document|certificat|tesser/.test(x))return 'Nel Private Desk i documenti dovranno diventare scadenze e azioni, con provenienza e permessi. In questa shell la fonte privata non è ancora collegata.';
 if(/pulmin|trasport/.test(x))return 'Il modulo trasporti verrà letto come servizio: richieste, punti di raccolta, mezzi, conducenti e stato. Le operazioni reali richiederanno autenticazione e scope.';
 if(/sponsor|partner/.test(x))return 'Posso aiutare su CRM sponsor, attivazioni e inventory. Regola ferrea: un prospect non viene mai mostrato come sponsor confermato.';
 if(/oggi|fare|priorit/.test(x))return state.view==='desk'?'La coda operativa è pronta a ricevere azioni reali da Gmail, Drive, R20 e Supabase dopo il collegamento autenticato.':'Per il pubblico, il primo passo utile è controllare Weekly Radar e Newsroom.';
 return 'Posso aiutarti a orientare lavoro, procedure e contenuti SCD. Per ora questa è una shell locale e non esegue azioni riservate né sostituisce i controlli di ruolo.';
}
function appendMsg(text,kind){const d=document.createElement('div');d.className='msg '+kind;d.textContent=text;$('#mirrorMessages').appendChild(d);$('#mirrorMessages').scrollTop=$('#mirrorMessages').scrollHeight}
$('#mirrorForm').addEventListener('submit',e=>{e.preventDefault();const q=$('#mirrorInput').value.trim();if(!q)return;appendMsg(q,'user');$('#mirrorInput').value='';setTimeout(()=>appendMsg(mirrorReply(q),'ai'),240)});
$$('.quick-prompts button').forEach(b=>b.addEventListener('click',()=>{appendMsg(b.textContent,'user');setTimeout(()=>appendMsg(mirrorReply(b.textContent),'ai'),180)}));

const hash=location.hash.replace('#','');if(['pulse','twin','desk'].includes(hash))setView(hash);
window.SCDNextGen={setView,hydrate,openMirror};
})();