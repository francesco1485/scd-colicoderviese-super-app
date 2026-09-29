import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0'

const supabase=createClient('https://dfnwzwutvnwiitiffwvr.supabase.co','sb_publishable_n0Fmw2PlLeaXsoFVsKb8MA_VbPqUbNn',{auth:{persistSession:true,autoRefreshToken:true}})
const $=id=>document.getElementById(id)
const esc=(v='')=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const fmtDate=v=>v?new Intl.DateTimeFormat('it-IT',{dateStyle:'short'}).format(new Date(v)):'—'
const fmtDateTime=v=>v?new Intl.DateTimeFormat('it-IT',{dateStyle:'short',timeStyle:'short'}).format(new Date(v)):'—'
const localInput=v=>{if(!v)return'';const d=new Date(v);return new Date(d-d.getTimezoneOffset()*60000).toISOString().slice(0,16)}
const isManager=()=>['super_admin','supervisor','manager'].includes(window.userRole)

let ecosystem=[],projects=[],actions=[],marketHubs=[],marketEntities=[],recoveryRows=[],members=[]

const pageTitles={
  regia:'Centro di Regia',
  ecosystem:'Ecosistema Maglia',
  development:'Sviluppo nuovo',
  cepa:'CEPA & SAP',
  operations:'Operatività',
  recovery:'Clienti · Recovery'
}

function showLoginMessage(text,error=false){
  $('loginMsg').textContent=text
  $('loginMsg').className='message'+(error?' error':'')
}
function closeModal(){$('modal').classList.add('hidden')}
$('modalClose').onclick=closeModal
$('modal').addEventListener('click',e=>{if(e.target.id==='modal')closeModal()})
async function logout(){await supabase.auth.signOut();location.reload()}
$('logoutBtn').onclick=logout
$('blockedLogout').onclick=logout

$('loginForm').onsubmit=async e=>{
  e.preventDefault()
  const{error}=await supabase.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value})
  if(error)return showLoginMessage(error.message,true)
  await boot()
}
$('signupBtn').onclick=async()=>{
  const email=$('email').value.trim(),password=$('password').value
  if(!email||password.length<8)return showLoginMessage('Inserisci email e una password di almeno 8 caratteri.',true)
  const{data,error}=await supabase.auth.signUp({email,password})
  if(error)return showLoginMessage(error.message,true)
  if(data.session)await boot()
  else showLoginMessage('Account creato. Controlla la mail di conferma, poi accedi.')
}

function navigate(view){
  document.querySelectorAll('.view').forEach(v=>v.classList.add('hidden'))
  $(view+'View').classList.remove('hidden')
  document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view))
  $('pageTitle').textContent=pageTitles[view]||'Centro di Regia'
  if(view==='recovery')loadRecovery()
  window.scrollTo({top:0,behavior:'smooth'})
}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>navigate(b.dataset.view))
document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>navigate(b.dataset.go))
$('refreshCoreBtn').onclick=loadCore
$('newEntityBtn').onclick=openNewEntity
$('newActionBtn').onclick=openNewAction
$('territoryHubFilter').onchange=renderTerritoryTable
$('territoryStageFilter').onchange=renderTerritoryTable
$('actionLaneFilter').onchange=renderActions
$('actionStatusFilter').onchange=renderActions
$('refreshRecoveryBtn').onclick=loadRecovery

async function boot(){
  const{data:{user}}=await supabase.auth.getUser()
  if(!user){
    $('loginView').classList.remove('hidden')
    $('workspace').classList.add('hidden')
    $('blockedView').classList.add('hidden')
    return
  }
  const{data:m,error}=await supabase.from('organization_memberships').select('organization_id,role,organizations(name)').eq('user_id',user.id).eq('active',true).limit(1).maybeSingle()
  $('loginView').classList.add('hidden')
  if(error||!m){
    $('workspace').classList.add('hidden')
    $('blockedView').classList.remove('hidden')
    return
  }
  window.orgId=m.organization_id
  window.userId=user.id
  window.userRole=m.role
  $('workspace').classList.remove('hidden')
  $('blockedView').classList.add('hidden')
  $('sideUser').textContent=user.email||'Utente'
  $('rolePill').textContent=m.role.replaceAll('_',' ')
  $('newEntityBtn').classList.toggle('hidden',!isManager())
  await loadCore()
}

async function loadCore(){
  if(!window.orgId)return
  $('refreshCoreBtn').textContent='…'
  const [ecoRes,projRes,actRes,hubRes,entRes]=await Promise.all([
    supabase.from('ecosystem_nodes').select('*').eq('organization_id',window.orgId).eq('active',true).order('priority',{ascending:false}),
    supabase.from('strategic_projects').select('*,ecosystem_nodes(id,code,name,capability),market_entities(id,name,city)').eq('organization_id',window.orgId).order('created_at',{ascending:false}),
    supabase.from('strategic_actions').select('*,strategic_projects(id,title),ecosystem_nodes(id,code,name),market_entities(id,name,city)').eq('organization_id',window.orgId).order('created_at',{ascending:false}),
    supabase.from('market_hubs').select('*').eq('organization_id',window.orgId).eq('active',true).order('code'),
    supabase.from('market_entities').select('*,market_hubs(id,code,name)').eq('organization_id',window.orgId).order('city').order('name')
  ])
  const err=ecoRes.error||projRes.error||actRes.error||hubRes.error||entRes.error
  if(err){console.error(err);$('refreshCoreBtn').textContent='!';return}
  ecosystem=ecoRes.data||[]
  projects=projRes.data||[]
  actions=actRes.data||[]
  marketHubs=hubRes.data||[]
  marketEntities=entRes.data||[]
  renderAll()
  $('refreshCoreBtn').textContent='↻'
}

function renderAll(){
  renderRegia()
  renderEcosystem()
  renderDevelopment()
  renderProjects()
  renderActions()
}

function openActions(){
  return actions.filter(a=>!['completed','cancelled'].includes(a.status))
}
function renderRegia(){
  const open=openActions()
  $('regEcosystemCount').textContent=ecosystem.length
  $('regExistingProjects').textContent=projects.filter(p=>p.lane==='existing'&&!['completed','cancelled'].includes(p.status)).length
  $('regExistingActions').textContent=open.filter(a=>a.lane==='existing').length
  $('regMappedCount').textContent=marketEntities.length
  $('regQualifiedCount').textContent=marketEntities.filter(x=>!['observed','archived'].includes(x.stage)).length
  $('regDevelopmentActions').textContent=open.filter(a=>a.lane==='development').length
  $('regEcosystemStrip').innerHTML=ecosystem.map(n=>'<article class="eco-mini"><strong><span class="status-dot '+(n.relationship_status==='project_active'?'project':'')+'"></span>'+esc(n.name)+'</strong><small>'+esc(n.capability)+'</small><small>'+esc(statusLabel(n.relationship_status))+'</small></article>').join('')||empty('Nessun nodo ecosistema')
  const attention=[...open].sort(actionSort).slice(0,7)
  $('regActionList').innerHTML=attention.map(a=>'<div class="compact-action"><span class="bullet"></span><div><strong>'+esc(a.title)+'</strong><small>'+esc(actionContext(a))+(a.due_at?' · '+esc(fmtDate(a.due_at)):'')+'</small></div></div>').join('')||empty('Nessuna azione aperta')
}

function statusLabel(v){
  return ({core:'Perno',active:'Collaborazione attiva',project_active:'Progetto attivo',to_verify:'Da verificare',paused:'In pausa',closed:'Chiuso'})[v]||v
}
function projectStatusLabel(v){
  return ({discovery:'Ricostruzione',planned:'Pianificato',active:'Attivo',waiting:'In attesa',pilot:'Pilota',completed:'Completato',paused:'In pausa',cancelled:'Annullato'})[v]||v
}
function laneLabel(v){return ({existing:'Esistente',development:'Sviluppo',shared:'Comune'})[v]||v}
function actionStatusLabel(v){return ({open:'Aperta',in_progress:'In corso',waiting:'In attesa',completed:'Completata',cancelled:'Annullata'})[v]||v}
function entityTypeLabel(v){return ({insurance_intermediary:'Intermediario assicurativo',company:'Impresa',professional:'Professionista',public_entity:'Ente',school:'Scuola',association:'Associazione',partner:'Partner',sap_candidate:'Potenziale SAP',other:'Altro'})[v]||v}
function stageLabel(v){return ({observed:'Osservato',qualified:'Qualificato',prospect:'Prospect',opportunity:'Opportunità',relationship:'Relazione',archived:'Archiviato'})[v]||v}

function renderEcosystem(){
  $('ecosystemGrid').innerHTML=ecosystem.map(n=>{
    const badge=n.relationship_status==='project_active'?'project':''
    return '<article class="eco-card"><div class="eco-code">'+esc(n.code)+'</div><h3>'+esc(n.name)+'</h3><div class="eco-capability">'+esc(n.capability)+'</div><div class="eco-status"><span class="'+badge+'">'+esc(statusLabel(n.relationship_status))+'</span></div><p><strong>Ruolo</strong><br>'+esc(n.strategic_role||'Da definire')+'</p><p><strong>Oggi</strong><br>'+esc(n.current_use||'Da verificare')+'</p><p><strong>Futuro</strong><br>'+esc(n.future_role||'Da analizzare')+'</p><footer><button class="small-btn" data-node="'+n.id+'">Apri dossier</button></footer></article>'
  }).join('')||empty('Ecosistema non ancora caricato')
  document.querySelectorAll('[data-node]').forEach(b=>b.onclick=()=>openNodeDossier(b.dataset.node))
}

function renderProjects(){
  const existing=projects.filter(p=>p.lane==='existing')
  const shared=projects.filter(p=>p.lane==='shared')
  $('existingProjects').innerHTML=existing.map(projectRow).join('')||empty('Nessun dossier aperto')
  $('sharedProjects').innerHTML=shared.map(projectRow).join('')||empty('Nessun progetto comune')
  document.querySelectorAll('[data-project]').forEach(b=>b.onclick=()=>openProject(b.dataset.project))
}
function projectRow(p){
  const context=p.ecosystem_nodes?.name||p.market_entities?.name||laneLabel(p.lane)
  return '<div class="project-row"><div><h4>'+esc(p.title)+'</h4><p>'+esc(p.objective||'')+'</p><div class="project-meta"><span class="tag">'+esc(projectStatusLabel(p.status))+'</span><span class="tag">'+esc(context)+'</span><span class="tag">'+esc(p.priority)+'</span></div></div><button class="small-btn" data-project="'+p.id+'">Apri</button></div>'
}

function renderDevelopment(){
  $('hubGrid').innerHTML=marketHubs.map(h=>{
    const rows=marketEntities.filter(x=>x.hub_id===h.id)
    const qualified=rows.filter(x=>!['observed','archived'].includes(x.stage)).length
    const fresh=rows.filter(x=>x.source_kind!=='legacy_registry').length
    return '<article class="hub-card"><div class="kicker">HUB PILOTA</div><h3>'+esc(h.city)+'</h3><p>'+esc(h.address||'Indirizzo da completare')+'</p><div class="hub-meta"><span>'+rows.length+' mappati</span><span>'+qualified+' qualificati</span><span>'+fresh+' nuovi</span></div></article>'
  }).join('')
  $('devObserved').textContent=marketEntities.filter(x=>x.stage==='observed').length
  $('devQualified').textContent=marketEntities.filter(x=>['qualified','prospect'].includes(x.stage)).length
  $('devOpportunity').textContent=marketEntities.filter(x=>x.stage==='opportunity').length
  $('devRelationship').textContent=marketEntities.filter(x=>x.stage==='relationship').length
  const sel=$('territoryHubFilter'),current=sel.value
  sel.innerHTML='<option value="">Tutti gli hub</option>'+marketHubs.map(h=>'<option value="'+h.id+'">'+esc(h.city)+'</option>').join('')
  if(marketHubs.some(h=>h.id===current))sel.value=current
  renderTerritoryTable()
}
function scoreHtml(v){return v==null?'<span class="score pending">Da valutare</span>':'<span class="score '+(v>=70?'good':'')+'">'+v+'</span>'}
function renderTerritoryTable(){
  const hub=$('territoryHubFilter').value,stage=$('territoryStageFilter').value
  const rows=marketEntities.filter(x=>(!hub||x.hub_id===hub)&&(!stage||x.stage===stage))
  $('territoryBody').innerHTML=rows.map(x=>{
    const source=x.source_kind==='legacy_registry'?'Base esistente':x.source_name
    const action=isManager()?'<button class="small-btn" data-qualify="'+x.id+'">Apri</button>':''
    return '<tr><td><span class="name">'+esc(x.name)+'</span><span class="tiny">'+esc(x.city||'')+(x.address?' · '+esc(x.address):'')+'</span></td><td>'+esc(x.market_hubs?.name?.replace('CEPA / HDI ','')||'—')+'</td><td>'+esc(entityTypeLabel(x.entity_type))+'</td><td>'+esc(source)+'</td><td>'+scoreHtml(x.relevance_score)+'</td><td>'+scoreHtml(x.advisory_score)+'</td><td><span class="stage '+esc(x.stage)+'">'+esc(stageLabel(x.stage))+'</span></td><td>'+action+'</td></tr>'
  }).join('')||'<tr><td colspan="8">'+empty('Nessun risultato')+'</td></tr>'
  document.querySelectorAll('[data-qualify]').forEach(b=>b.onclick=()=>openQualify(b.dataset.qualify))
}

function actionSort(a,b){
  const ad=a.due_at?new Date(a.due_at).getTime():Infinity
  const bd=b.due_at?new Date(b.due_at).getTime():Infinity
  if(ad!==bd)return ad-bd
  const p={urgent:0,high:1,normal:2,low:3}
  return (p[a.priority]??9)-(p[b.priority]??9)
}
function actionContext(a){return a.ecosystem_nodes?.name||a.market_entities?.name||a.strategic_projects?.title||laneLabel(a.lane)}
function renderActions(){
  const lane=$('actionLaneFilter').value,status=$('actionStatusFilter').value
  const rows=[...actions].filter(a=>(!lane||a.lane===lane)&&(!status||a.status===status)).sort(actionSort)
  $('opsOpen').textContent=actions.filter(a=>a.status==='open').length
  $('opsProgress').textContent=actions.filter(a=>a.status==='in_progress').length
  $('opsWaiting').textContent=actions.filter(a=>a.status==='waiting').length
  $('opsDone').textContent=actions.filter(a=>a.status==='completed').length
  $('actionBoard').innerHTML=rows.map(a=>{
    const overdue=a.due_at&&new Date(a.due_at)<new Date()&&!['completed','cancelled'].includes(a.status)
    return '<article class="action-card"><span class="lane-chip '+esc(a.lane)+'">'+esc(laneLabel(a.lane))+'</span><div><h4>'+esc(a.title)+'</h4><p>'+esc(a.description||'')+'</p><div class="action-meta"><span class="tag">'+esc(actionStatusLabel(a.status))+'</span><span class="tag">'+esc(a.priority)+'</span><span class="tag">'+esc(actionContext(a))+'</span></div></div><aside><div class="tiny '+(overdue?'overdue':'')+'">'+esc(a.due_at?fmtDateTime(a.due_at):'Senza scadenza')+'</div><button class="small-btn" data-action="'+a.id+'">Gestisci</button></aside></article>'
  }).join('')||empty('Nessuna azione con questi filtri')
  document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>openAction(b.dataset.action))
}

function openNodeDossier(id){
  const n=ecosystem.find(x=>x.id===id);if(!n)return
  const relProjects=projects.filter(p=>p.ecosystem_node_id===id)
  const relActions=actions.filter(a=>a.ecosystem_node_id===id&&!['completed','cancelled'].includes(a.status))
  $('modalContent').innerHTML='<div class="kicker">DOSSIER ECOSISTEMA</div><h2>'+esc(n.name)+'</h2><p class="muted">'+esc(n.capability)+' · '+esc(statusLabel(n.relationship_status))+'</p><form id="nodeForm" class="form"><label>Stato relazione<select id="nodeStatus"><option value="core">Perno</option><option value="active">Collaborazione attiva</option><option value="project_active">Progetto attivo</option><option value="to_verify">Da verificare</option><option value="paused">In pausa</option><option value="closed">Chiuso</option></select></label><label>Ruolo strategico<textarea id="nodeRole">'+esc(n.strategic_role||'')+'</textarea></label><label>Utilizzo attuale<textarea id="nodeCurrent">'+esc(n.current_use||'')+'</textarea></label><label>Ruolo futuro / ipotesi<textarea id="nodeFuture">'+esc(n.future_role||'')+'</textarea></label><label>Nota / fonte<textarea id="nodeSource">'+esc(n.source_note||'')+'</textarea></label>'+(isManager()?'<button class="primary" type="submit">Salva dossier</button>':'')+'</form><div class="modal-section"><h4>Progetti collegati</h4>'+relProjects.map(p=>'<p class="muted"><strong>'+esc(p.title)+'</strong><br>'+esc(projectStatusLabel(p.status))+' · '+esc(p.next_action||'')+'</p>').join('')+'</div><div class="modal-section"><h4>Azioni aperte</h4>'+relActions.map(a=>'<p class="muted"><strong>'+esc(a.title)+'</strong><br>'+esc(actionStatusLabel(a.status))+'</p>').join('')+'</div>'
  $('nodeStatus').value=n.relationship_status
  $('modal').classList.remove('hidden')
  if(isManager())$('nodeForm').onsubmit=async e=>{
    e.preventDefault()
    const patch={relationship_status:$('nodeStatus').value,strategic_role:$('nodeRole').value.trim()||null,current_use:$('nodeCurrent').value.trim()||null,future_role:$('nodeFuture').value.trim()||null,source_note:$('nodeSource').value.trim()||null,updated_at:new Date().toISOString()}
    const{error}=await supabase.from('ecosystem_nodes').update(patch).eq('id',id).eq('organization_id',window.orgId)
    if(error)return alert(error.message)
    closeModal();await loadCore()
  }
}

function openProject(id){
  const p=projects.find(x=>x.id===id);if(!p)return
  $('modalContent').innerHTML='<div class="kicker">PROGETTO</div><h2>'+esc(p.title)+'</h2><form id="projectForm" class="form"><label>Stato<select id="projStatus"><option value="discovery">Ricostruzione</option><option value="planned">Pianificato</option><option value="active">Attivo</option><option value="waiting">In attesa</option><option value="pilot">Pilota</option><option value="completed">Completato</option><option value="paused">In pausa</option><option value="cancelled">Annullato</option></select></label><label>Obiettivo<textarea id="projObjective">'+esc(p.objective||'')+'</textarea></label><label>Prossima azione<textarea id="projNext">'+esc(p.next_action||'')+'</textarea></label><label>Data obiettivo<input id="projDate" type="date" value="'+esc(p.target_date||'')+'"></label>'+(isManager()?'<button class="primary" type="submit">Salva progetto</button>':'')+'</form>'
  $('projStatus').value=p.status
  $('modal').classList.remove('hidden')
  if(isManager())$('projectForm').onsubmit=async e=>{
    e.preventDefault()
    const patch={status:$('projStatus').value,objective:$('projObjective').value.trim()||null,next_action:$('projNext').value.trim()||null,target_date:$('projDate').value||null,updated_at:new Date().toISOString()}
    const{error}=await supabase.from('strategic_projects').update(patch).eq('id',id).eq('organization_id',window.orgId)
    if(error)return alert(error.message)
    closeModal();await loadCore()
  }
}

function openNewAction(){
  const nodeOpts='<option value="">Nessun nodo specifico</option>'+ecosystem.map(n=>'<option value="'+n.id+'">'+esc(n.name)+'</option>').join('')
  const projOpts='<option value="">Nessun progetto specifico</option>'+projects.filter(p=>!['completed','cancelled'].includes(p.status)).map(p=>'<option value="'+p.id+'">'+esc(p.title)+'</option>').join('')
  $('modalContent').innerHTML='<div class="kicker">NUOVA AZIONE</div><h2>Crea lavoro concreto</h2><form id="newActionForm" class="form"><div class="inline"><label>Corsia<select id="newActionLane"><option value="existing">Esistente</option><option value="development">Sviluppo</option><option value="shared">Comune</option></select></label><label>Priorità<select id="newActionPriority"><option value="normal">Normale</option><option value="high">Alta</option><option value="urgent">Urgente</option><option value="low">Bassa</option></select></label></div><label>Progetto<select id="newActionProject">'+projOpts+'</select></label><label>Nodo ecosistema<select id="newActionNode">'+nodeOpts+'</select></label><label>Titolo<input id="newActionTitle" required></label><label>Descrizione<textarea id="newActionDescription"></textarea></label><label>Scadenza<input id="newActionDue" type="datetime-local"></label><label><input id="newActionMine" type="checkbox" checked style="width:auto;display:inline;margin-right:8px">Assegna a me</label><button class="primary" type="submit">Crea azione</button></form>'
  $('modal').classList.remove('hidden')
  $('newActionForm').onsubmit=async e=>{
    e.preventDefault()
    const row={organization_id:window.orgId,lane:$('newActionLane').value,project_id:$('newActionProject').value||null,ecosystem_node_id:$('newActionNode').value||null,title:$('newActionTitle').value.trim(),description:$('newActionDescription').value.trim()||null,priority:$('newActionPriority').value,status:'open',assigned_to:$('newActionMine').checked?window.userId:null,created_by:window.userId,due_at:$('newActionDue').value?new Date($('newActionDue').value).toISOString():null,updated_at:new Date().toISOString()}
    const{error}=await supabase.from('strategic_actions').insert(row)
    if(error)return alert(error.message)
    closeModal();await loadCore()
  }
}

function openAction(id){
  const a=actions.find(x=>x.id===id);if(!a)return
  $('modalContent').innerHTML='<div class="kicker">'+esc(laneLabel(a.lane))+'</div><h2>'+esc(a.title)+'</h2><p class="muted">'+esc(actionContext(a))+'</p><form id="actionForm" class="form"><div class="inline"><label>Stato<select id="actStatus"><option value="open">Aperta</option><option value="in_progress">In corso</option><option value="waiting">In attesa</option><option value="completed">Completata</option><option value="cancelled">Annullata</option></select></label><label>Priorità<select id="actPriority"><option value="low">Bassa</option><option value="normal">Normale</option><option value="high">Alta</option><option value="urgent">Urgente</option></select></label></div><label>Scadenza<input id="actDue" type="datetime-local" value="'+esc(localInput(a.due_at))+'"></label><label>Descrizione<textarea id="actDescription">'+esc(a.description||'')+'</textarea></label><label>Esito / nota<textarea id="actOutcome">'+esc(a.outcome||'')+'</textarea></label><label>Prossima azione<textarea id="actNext">'+esc(a.next_action||'')+'</textarea></label><button class="primary" type="submit">Aggiorna azione</button></form>'
  $('actStatus').value=a.status
  $('actPriority').value=a.priority
  $('modal').classList.remove('hidden')
  $('actionForm').onsubmit=async e=>{
    e.preventDefault()
    const status=$('actStatus').value
    const patch={status,priority:$('actPriority').value,due_at:$('actDue').value?new Date($('actDue').value).toISOString():null,description:$('actDescription').value.trim()||null,outcome:$('actOutcome').value.trim()||null,next_action:$('actNext').value.trim()||null,completed_at:status==='completed'?(a.completed_at||new Date().toISOString()):null,updated_at:new Date().toISOString()}
    const{error}=await supabase.from('strategic_actions').update(patch).eq('id',id).eq('organization_id',window.orgId)
    if(error)return alert(error.message)
    closeModal();await loadCore()
  }
}

function openNewEntity(){
  if(!isManager())return
  $('modalContent').innerHTML='<div class="kicker">SVILUPPO NUOVO</div><h2>Inserisci una realtà da osservare</h2><p class="muted">Non diventa automaticamente un lead. Conserviamo origine e motivo dell’inserimento.</p><form id="newEntityForm" class="form"><label>Hub<select id="newHub" required>'+marketHubs.map(h=>'<option value="'+h.id+'">'+esc(h.city)+'</option>').join('')+'</select></label><label>Tipologia<select id="newType"><option value="company">Impresa</option><option value="professional">Professionista</option><option value="public_entity">Ente</option><option value="school">Scuola</option><option value="association">Associazione</option><option value="partner">Partner</option><option value="sap_candidate">Potenziale SAP</option><option value="insurance_intermediary">Intermediario assicurativo</option><option value="other">Altro</option></select></label><label>Nome<input id="newName" required></label><label>Indirizzo<input id="newAddress"></label><label>Perché la stiamo osservando?<textarea id="newNote"></textarea></label><button class="primary" type="submit">Inserisci</button></form>'
  $('modal').classList.remove('hidden')
  $('newEntityForm').onsubmit=async e=>{
    e.preventDefault()
    const h=marketHubs.find(x=>x.id===$('newHub').value)
    const row={organization_id:window.orgId,hub_id:h.id,entity_type:$('newType').value,name:$('newName').value.trim(),address:$('newAddress').value.trim()||null,city:h.city,province:h.province,source_kind:'manual_radar',source_name:'Mappatura manuale Maglia',external_key:'manual:'+crypto.randomUUID(),stage:'observed',tags:['mappa-zero','nuovo'],metadata:{territory_layer:'new',note:$('newNote').value.trim()||null,created_from:'web_app'}}
    const{error}=await supabase.from('market_entities').insert(row)
    if(error)return alert(error.message)
    closeModal();await loadCore()
  }
}

function openQualify(id){
  const x=marketEntities.find(e=>e.id===id);if(!x||!isManager())return
  $('modalContent').innerHTML='<div class="kicker">SVILUPPO</div><h2>'+esc(x.name)+'</h2><p class="muted">'+esc(x.city||'')+' · '+esc(entityTypeLabel(x.entity_type))+'</p><form id="qualifyForm" class="form"><label>Stato<select id="qStage"><option value="observed">Osservato</option><option value="qualified">Qualificato</option><option value="prospect">Prospect</option><option value="opportunity">Opportunità</option><option value="relationship">Relazione</option><option value="archived">Archiviato</option></select></label><div class="inline"><label>Rilevanza CEPA 0-100<input id="qRelevance" type="number" min="0" max="100" value="'+(x.relevance_score??'')+'"></label><label>Potenziale Advisory 0-100<input id="qAdvisory" type="number" min="0" max="100" value="'+(x.advisory_score??'')+'"></label></div><label>Motivazione / nota<textarea id="qNote">'+esc(x.metadata?.qualification_note||x.metadata?.note||'')+'</textarea></label><button class="primary" type="submit">Salva</button></form>'
  $('qStage').value=x.stage
  $('modal').classList.remove('hidden')
  $('qualifyForm').onsubmit=async e=>{
    e.preventDefault()
    const rel=$('qRelevance').value,adv=$('qAdvisory').value
    const patch={stage:$('qStage').value,relevance_score:rel===''?null:Number(rel),advisory_score:adv===''?null:Number(adv),metadata:{...(x.metadata||{}),qualification_note:$('qNote').value.trim()||null,reviewed_at:new Date().toISOString(),reviewed_by:window.userId},updated_at:new Date().toISOString()}
    const{error}=await supabase.from('market_entities').update(patch).eq('id',id).eq('organization_id',window.orgId)
    if(error)return alert(error.message)
    closeModal();await loadCore()
  }
}

async function loadMembers(){
  if(members.length)return
  const{data,error}=await supabase.rpc('list_assignable_members',{p_organization_id:window.orgId})
  members=error?[]:(data||[])
}

async function loadRecovery(){
  if(!window.orgId)return
  $('recoveryLoading').classList.remove('hidden');$('recoveryTableWrap').classList.add('hidden')
  const{data,error}=await supabase.from('pipeline_cases').select('id,score,reason,stage,assigned_to,metadata,clients(id,last_name,business_name,email,mobile,city,province,lost_at,metadata)').eq('organization_id',window.orgId).eq('pipeline','recovery').not('stage','in','(won,lost,closed)').order('score',{ascending:false}).limit(100)
  if(error){$('recoveryLoading').textContent='Errore: '+error.message;return}
  recoveryRows=(data||[]).sort((a,b)=>Number(a.metadata?.pilot_rank??999)-Number(b.metadata?.pilot_rank??999))
  $('kRecovery').textContent=recoveryRows.length
  $('kHigh').textContent=recoveryRows.filter(x=>Number(x.score)>=90).length
  $('kUnassigned').textContent=recoveryRows.filter(x=>!x.assigned_to).length
  const{count}=await supabase.from('work_items').select('id',{count:'exact',head:true}).eq('organization_id',window.orgId).not('status','in','(completed,cancelled)')
  $('kWork').textContent=count??0
  $('recoveryBody').innerHTML=recoveryRows.map(recoveryRow).join('')
  $('recoveryLoading').classList.add('hidden');$('recoveryTableWrap').classList.remove('hidden')
  document.querySelectorAll('[data-recovery-assign]').forEach(b=>b.onclick=()=>openAssign(b.dataset.recoveryAssign))
  document.querySelectorAll('[data-recovery-manage]').forEach(b=>b.onclick=()=>openOutcome(b.dataset.recoveryManage))
}
function recoveryRow(x){
  const c=x.clients||{},name=c.business_name||c.last_name||'Cliente',rank=x.metadata?.pilot_rank??c.metadata?.recovery_pilot_rank??'—',score=Number(x.score||0)
  const action=!x.assigned_to&&isManager()?'<button class="small-btn" data-recovery-assign="'+x.id+'">Assegna</button>':x.assigned_to?'<button class="small-btn" data-recovery-manage="'+x.id+'">Gestisci</button>':''
  return '<tr><td>'+esc(rank)+'</td><td><span class="name">'+esc(name)+'</span><span class="tiny">'+esc(c.email||c.mobile||'')+'</span></td><td>'+esc(c.city||'—')+'</td><td>'+esc(fmtDate(c.lost_at))+'</td><td>'+esc(x.reason||'Da verificare')+'</td><td>'+scoreHtml(score)+'</td><td>'+esc(x.assigned_to?x.stage:'Da assegnare')+'</td><td>'+action+'</td></tr>'
}
function caseById(id){return recoveryRows.find(x=>x.id===id)}
function clientName(x){const c=x?.clients||{};return c.business_name||c.last_name||'Cliente'}

async function openAssign(caseId){
  await loadMembers()
  const x=caseById(caseId);if(!x)return
  $('modalContent').innerHTML='<div class="kicker">RECOVERY</div><h2>'+esc(clientName(x))+'</h2><form id="assignForm" class="form"><label>Operatore<select id="assignee" required>'+members.map(m=>'<option value="'+m.user_id+'">'+esc(m.full_name)+' · '+esc(m.role)+'</option>').join('')+'</select></label><label>Data attività<input id="assignDue" type="datetime-local" required></label><button class="primary" type="submit">Assegna</button></form>'
  const dt=new Date(Date.now()+5*60000);$('assignDue').value=localInput(dt)
  $('modal').classList.remove('hidden')
  $('assignForm').onsubmit=async e=>{
    e.preventDefault()
    const{error}=await supabase.rpc('assign_recovery_case',{p_case_id:caseId,p_assigned_to:$('assignee').value,p_due_at:new Date($('assignDue').value).toISOString()})
    if(error)return alert(error.message)
    closeModal();await loadRecovery()
  }
}
function openOutcome(caseId){
  const x=caseById(caseId);if(!x)return
  $('modalContent').innerHTML='<div class="kicker">RECOVERY</div><h2>'+esc(clientName(x))+'</h2><form id="outcomeForm" class="form"><label>Esito<select id="outcome"><option value="no_answer">Non risponde</option><option value="call_back">Da richiamare</option><option value="appointment">Appuntamento</option><option value="checkup">Check-up Maglia 360</option><option value="recovered">Recuperato</option><option value="not_interested">Non interessato</option><option value="do_not_contact">Non contattare</option></select></label><label>Canale<select id="channel"><option value="phone">Telefono</option><option value="email">Email</option><option value="whatsapp">WhatsApp</option><option value="in_person">Di persona</option><option value="video">Video</option><option value="other">Altro</option></select></label><label>Prossima data<input id="followAt" type="datetime-local"></label><label>Nota<textarea id="recoveryNote"></textarea></label><button class="primary" type="submit">Registra esito</button></form>'
  $('modal').classList.remove('hidden')
  $('outcomeForm').onsubmit=async e=>{
    e.preventDefault()
    const f=$('followAt').value
    const{error}=await supabase.rpc('record_recovery_outcome',{p_case_id:caseId,p_outcome:$('outcome').value,p_note:$('recoveryNote').value.trim()||null,p_followup_at:f?new Date(f).toISOString():null,p_channel:$('channel').value})
    if(error)return alert(error.message)
    closeModal();await loadRecovery()
  }
}

function empty(text){return '<div class="loader">'+esc(text)+'</div>'}

supabase.auth.onAuthStateChange(()=>setTimeout(boot,0))
await boot()