import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0'
const supabase=createClient('https://dfnwzwutvnwiitiffwvr.supabase.co','sb_publishable_n0Fmw2PlLeaXsoFVsKb8MA_VbPqUbNn',{auth:{persistSession:true,autoRefreshToken:true}})
const $=id=>document.getElementById(id)
const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const fmtDate=v=>v?new Intl.DateTimeFormat('it-IT',{dateStyle:'short'}).format(new Date(v)):'—'
const fmtDateTime=v=>v?new Intl.DateTimeFormat('it-IT',{dateStyle:'short',timeStyle:'short'}).format(new Date(v)):'—'
const isManager=()=>['super_admin','supervisor','manager'].includes(window.userRole)
const loginView=$('loginView'),appView=$('appView'),blockedView=$('blockedView'),msg=$('loginMsg'),logoutBtn=$('logoutBtn'),userPill=$('userPill'),rolePill=$('rolePill')
let recoveryRows=[],members=[]

function showMsg(t,e=false){msg.textContent=t;msg.className='msg'+(e?' error':'')}
async function logout(){await supabase.auth.signOut();location.reload()}
logoutBtn.onclick=logout;$('blockedLogout').onclick=logout
$('modalClose').onclick=()=>$('modal').classList.add('hidden')
$('modal').addEventListener('click',e=>{if(e.target.id==='modal')$('modal').classList.add('hidden')})

$('loginForm').onsubmit=async e=>{e.preventDefault();const{error}=await supabase.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(error)return showMsg(error.message,true);await boot()}
$('signupBtn').onclick=async()=>{const email=$('email').value.trim(),password=$('password').value;if(!email||password.length<8)return showMsg('Inserisci email e una password di almeno 8 caratteri.',true);const{data,error}=await supabase.auth.signUp({email,password});if(error)return showMsg(error.message,true);if(data.session)await boot();else showMsg('Account creato. Controlla la mail di conferma, poi torna qui e accedi.')}

document.querySelectorAll('[data-view]').forEach(btn=>btn.onclick=async()=>{document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b===btn));['recovery','today','control'].forEach(v=>$(v+'View').classList.toggle('hidden',v!==btn.dataset.view));if(btn.dataset.view==='today')await loadToday();if(btn.dataset.view==='control')await loadControl()})
$('refreshBtn').onclick=loadDashboard;$('refreshTodayBtn').onclick=loadToday

async function boot(){
  const{data:{user}}=await supabase.auth.getUser()
  if(!user){loginView.classList.remove('hidden');appView.classList.add('hidden');blockedView.classList.add('hidden');return}
  loginView.classList.add('hidden');logoutBtn.classList.remove('hidden');userPill.classList.remove('hidden');rolePill.classList.remove('hidden');userPill.textContent=user.email||'Utente'
  const{data:m,error}=await supabase.from('organization_memberships').select('organization_id,role,organizations(name)').eq('user_id',user.id).eq('active',true).limit(1).maybeSingle()
  if(error||!m){appView.classList.add('hidden');blockedView.classList.remove('hidden');return}
  blockedView.classList.add('hidden');appView.classList.remove('hidden');$('orgTitle').textContent=m.organizations?.name||'Maglia Assicurazioni';window.orgId=m.organization_id;window.userId=user.id;window.userRole=m.role;rolePill.textContent=m.role.replaceAll('_',' ')
  document.querySelector('[data-view="control"]').classList.toggle('hidden',!isManager())
  if(isManager())await loadMembers()
  await loadDashboard()
}

async function loadMembers(){
  const{data,error}=await supabase.rpc('list_assignable_members',{p_organization_id:window.orgId})
  members=error?[]:(data||[])
}

async function loadDashboard(){
  if(!window.orgId)return;$('loading').classList.remove('hidden');$('tableWrap').classList.add('hidden')
  const{data,error}=await supabase.from('pipeline_cases').select('id,score,reason,stage,assigned_to,metadata,clients(id,last_name,business_name,email,mobile,city,province,lost_at,metadata)').eq('organization_id',window.orgId).eq('pipeline','recovery').not('stage','in','(won,lost,closed)').order('score',{ascending:false}).limit(100)
  if(error){$('loading').textContent='Errore: '+error.message;return}
  recoveryRows=(data||[]).sort((a,b)=>Number(a.metadata?.pilot_rank??999)-Number(b.metadata?.pilot_rank??999))
  $('kRecovery').textContent=recoveryRows.length;$('kHigh').textContent=recoveryRows.filter(x=>Number(x.score)>=90).length;$('kUnassigned').textContent=recoveryRows.filter(x=>!x.assigned_to).length
  const{count}=await supabase.from('work_items').select('id',{count:'exact',head:true}).eq('organization_id',window.orgId).not('status','in','(completed,cancelled)');$('kWork').textContent=count??0
  $('recoveryBody').innerHTML=recoveryRows.map(rowHtml).join('');$('loading').classList.add('hidden');$('tableWrap').classList.remove('hidden')
  document.querySelectorAll('[data-assign]').forEach(b=>b.onclick=()=>openAssign(b.dataset.assign))
  document.querySelectorAll('[data-manage]').forEach(b=>b.onclick=()=>openOutcome(b.dataset.manage))
}

function rowHtml(x){
  const c=x.clients||{},name=c.business_name||c.last_name||'Cliente',rank=x.metadata?.pilot_rank??c.metadata?.recovery_pilot_rank??'—',score=Number(x.score||0)
  const contact=[c.mobile?'<a href="tel:'+esc(c.mobile)+'">'+esc(c.mobile)+'</a>':'',c.email?'<a href="mailto:'+esc(c.email)+'">'+esc(c.email)+'</a>':''].filter(Boolean).join('')
  const action=!x.assigned_to&&isManager()?'<button class="smallbtn" data-assign="'+x.id+'">Assegna</button>':x.assigned_to?'<button class="smallbtn" data-manage="'+x.id+'">Gestisci</button>':'—'
  return '<tr><td><span class="rank">'+esc(rank)+'</span></td><td><span class="name">'+esc(name)+'</span></td><td>'+esc(c.city||'—')+'</td><td>'+esc(fmtDate(c.lost_at))+'</td><td>'+esc(x.reason||'Da verificare')+'</td><td><span class="score '+(score>=90?'hi':'')+'">'+score.toFixed(0)+'</span></td><td><div class="contact">'+(contact||'—')+'</div></td><td><span class="stage '+(x.assigned_to?'assigned':'')+'">'+esc(x.assigned_to?x.stage:'Da assegnare')+'</span></td><td>'+action+'</td></tr>'
}

function caseById(id){return recoveryRows.find(x=>x.id===id)}
function clientName(x){const c=x?.clients||{};return c.business_name||c.last_name||'Cliente'}

function openAssign(caseId){
  const x=caseById(caseId);if(!x)return
  $('modalContent').innerHTML='<div class="eyebrow">Assegnazione</div><h2>'+esc(clientName(x))+'</h2><p class="sub">Scegli chi deve lavorare questo cliente e quando iniziare.</p><form id="assignForm" class="form"><label>Operatore<select id="assignee" required>'+members.map(m=>'<option value="'+m.user_id+'">'+esc(m.full_name)+' · '+esc(m.role)+'</option>').join('')+'</select></label><label>Data e ora attività<input id="assignDue" type="datetime-local" required></label><button class="primary" type="submit">Assegna e crea lavoro</button><div id="assignMsg" class="msg hidden"></div></form>'
  $('modal').classList.remove('hidden')
  const dt=new Date(Date.now()+5*60*1000);dt.setMinutes(Math.ceil(dt.getMinutes()/5)*5);$('assignDue').value=new Date(dt-dt.getTimezoneOffset()*60000).toISOString().slice(0,16)
  $('assignForm').onsubmit=async e=>{e.preventDefault();const due=new Date($('assignDue').value).toISOString();const{error}=await supabase.rpc('assign_recovery_case',{p_case_id:caseId,p_assigned_to:$('assignee').value,p_due_at:due});if(error){$('assignMsg').textContent=error.message;$('assignMsg').className='msg error';return}$('modal').classList.add('hidden');await loadDashboard()}
}

function openOutcome(caseId){
  const x=caseById(caseId);if(!x)return
  $('modalContent').innerHTML='<div class="eyebrow">Esito contatto</div><h2>'+esc(clientName(x))+'</h2><p class="sub">Ogni contatto deve produrre un esito e, se necessario, una prossima azione.</p><form id="outcomeForm" class="form"><label>Esito<select id="outcome" required><option value="no_answer">Non risponde</option><option value="call_back">Da richiamare</option><option value="appointment">Appuntamento fissato</option><option value="checkup">Check-up Maglia 360</option><option value="recovered">Recuperato</option><option value="not_interested">Non interessato</option><option value="do_not_contact">Non contattare</option></select></label><label>Canale<select id="channel"><option value="phone">Telefono</option><option value="email">Email</option><option value="whatsapp">WhatsApp</option><option value="in_person">Di persona</option><option value="video">Video</option><option value="other">Altro</option></select></label><label id="followLabel">Prossima data / appuntamento<input id="followAt" type="datetime-local"></label><label>Nota<textarea id="note" placeholder="Informazioni utili per il prossimo passo"></textarea></label><button class="primary" type="submit">Registra esito</button><div id="outMsg" class="msg hidden"></div></form>'
  $('modal').classList.remove('hidden')
  const setReq=()=>{const o=$('outcome').value,need=['call_back','appointment','checkup'].includes(o);$('followAt').required=need;$('followLabel').style.opacity=['not_interested','recovered','do_not_contact'].includes(o)?'.45':'1'}
  $('outcome').onchange=setReq;setReq()
  $('outcomeForm').onsubmit=async e=>{e.preventDefault();const f=$('followAt').value;const args={p_case_id:caseId,p_outcome:$('outcome').value,p_note:$('note').value||null,p_followup_at:f?new Date(f).toISOString():null,p_channel:$('channel').value};const{error}=await supabase.rpc('record_recovery_outcome',args);if(error){$('outMsg').textContent=error.message;$('outMsg').className='msg error';return}$('modal').classList.add('hidden');await loadDashboard();await loadToday()}
}

async function loadToday(){
  $('todayLoading').classList.remove('hidden');$('todayList').classList.add('hidden')
  const{data,error}=await supabase.from('work_items').select('id,title,description,priority,status,due_at,work_type,pipeline_case_id,clients(id,last_name,business_name,city)').eq('organization_id',window.orgId).eq('assigned_to',window.userId).not('status','in','(completed,cancelled)').order('due_at',{ascending:true})
  if(error){$('todayLoading').textContent='Errore: '+error.message;return}
  const now=new Date(),end=new Date();end.setHours(23,59,59,999)
  const rows=data||[]
  $('todayList').innerHTML=rows.length?rows.map(w=>{const c=w.clients||{},name=c.business_name||c.last_name||'Cliente',due=w.due_at?new Date(w.due_at):null,cls=due&&due<now?'overdue':due&&due<=end?'today':'',manage=w.pipeline_case_id?'<button class="smallbtn" data-task-manage="'+w.pipeline_case_id+'">Registra esito</button>':'';return '<article class="task '+cls+'"><div><h3>'+esc(name)+' · '+esc(w.title)+'</h3><p>'+esc(c.city||'')+' · '+esc(fmtDateTime(w.due_at))+'</p><p>'+esc(w.description||'')+'</p></div><div class="task-actions"><span class="badge '+(w.priority==='high'?'high':'')+'">'+esc(w.priority)+'</span>'+manage+'</div></article>'}).join(''):'<div class="loader">Nessuna attività aperta assegnata a te.</div>'
  $('todayLoading').classList.add('hidden');$('todayList').classList.remove('hidden')
  document.querySelectorAll('[data-task-manage]').forEach(b=>b.onclick=async()=>{if(!recoveryRows.length)await loadDashboard();openOutcome(b.dataset.taskManage)})
}

async function loadControl(){
  if(!isManager()){return}
  const{data:cases}=await supabase.from('pipeline_cases').select('id,stage,assigned_to').eq('organization_id',window.orgId).eq('pipeline','recovery')
  const rows=cases||[];$('cAssigned').textContent=rows.filter(x=>x.assigned_to).length;$('cContacted').textContent=rows.filter(x=>['contacted','appointment','checkup','proposal','won'].includes(x.stage)).length;$('cAppointments').textContent=rows.filter(x=>['appointment','checkup','proposal','won'].includes(x.stage)).length;$('cRecovered').textContent=rows.filter(x=>x.stage==='won').length
  const map=new Map(members.map(m=>[m.user_id,{...m,total:0}]))
  rows.filter(x=>x.assigned_to).forEach(x=>{if(map.has(x.assigned_to))map.get(x.assigned_to).total++})
  $('controlList').innerHTML=[...map.values()].map(m=>'<div class="control-row"><div><strong>'+esc(m.full_name)+'</strong><small>'+esc(m.role)+'</small></div><span class="badge">'+m.total+' casi Recovery</span></div>').join('')||'<div class="loader">Nessun utente operativo registrato.</div>'
}

supabase.auth.onAuthStateChange(()=>setTimeout(boot,0));await boot()