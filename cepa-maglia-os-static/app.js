import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0'
const supabase=createClient('https://dfnwzwutvnwiitiffwvr.supabase.co','sb_publishable_n0Fmw2PlLeaXsoFVsKb8MA_VbPqUbNn',{auth:{persistSession:true,autoRefreshToken:true}})
const $=id=>document.getElementById(id)
const esc=(v='')=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const fmtDate=v=>v?new Intl.DateTimeFormat('it-IT',{dateStyle:'medium'}).format(new Date(v)):'—'
const fmtDateTime=v=>v?new Intl.DateTimeFormat('it-IT',{dateStyle:'short',timeStyle:'short'}).format(new Date(v)):'—'
const localInput=v=>{if(!v)return'';const d=new Date(v);return new Date(d-d.getTimezoneOffset()*60000).toISOString().slice(0,16)}
const isManager=()=>['super_admin','supervisor','manager'].includes(window.userRole)
const viewMeta={
 home:['Quadro generale','Agenzia Generale HDI · Ecosistema di competenze, relazioni e sviluppo'],
 products:['Prodotti & Sintesi','Schede consulenziali, punti di forza, limiti e percorsi di confronto'],
 collaborators:['Collaboratori & Guadagni','Ruoli, competenze e remunerazioni differenziate per attività e prodotto'],
 comparisons:['Confronti & Benchmark','Analisi verificabili tra soluzioni e realtà comparabili'],
 aiMail:['AI Mail & Chat','Bozze personalizzate, contesto relazionale e assistenza operativa'],
 cepa:['Centro CEPA','Materie, contenuti, programmi, iniziative e sviluppo del metodo'],
 territories:['SAP & Territori','Presidi territoriali, candidature, incontri e sviluppo della rete'],
 documents:['Archivio & Contratti','Documenti, accordi, dossier e modelli pronti'],
 development:['Sviluppo nuovo','Seconda strada: mappatura, qualificazione e nuove relazioni'],
 actions:['Attività & Scadenze','Motore operativo comune a tutto il sistema'],
 recovery:['Clienti · Recovery','Campagna operativa sul patrimonio esistente']
}

let ecosystem=[],projects=[],actions=[],marketHubs=[],marketEntities=[],contacts=[],timeline=[],documents=[],blueprints=[],subjects=[],initiatives=[],products=[],comparisons=[],collaborators=[],collaboratorTerms=[],mailTemplates=[],mailDrafts=[],cepaExpansion=[],recoveryRows=[],members=[]
let currentPartnerId=null

function msg(text,error=false){$('loginMsg').textContent=text;$('loginMsg').className='message'+(error?' error':'')}
function closeModal(){$('modal').classList.add('hidden')}
$('modalClose').onclick=closeModal
$('modal').addEventListener('click',e=>{if(e.target.id==='modal')closeModal()})
async function logout(){await supabase.auth.signOut();location.reload()}
$('logoutBtn').onclick=logout;$('blockedLogout').onclick=logout

$('loginForm').onsubmit=async e=>{e.preventDefault();const{error}=await supabase.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(error)return msg(error.message,true);await boot()}
$('signupBtn').onclick=async()=>{const email=$('email').value.trim(),password=$('password').value;if(!email||password.length<8)return msg('Inserisci email e una password di almeno 8 caratteri.',true);const{data,error}=await supabase.auth.signUp({email,password});if(error)return msg(error.message,true);if(data.session)await boot();else msg('Account creato. Controlla la mail di conferma e poi accedi.')}

function setHeader(title,subtitle){$('pageTitle').textContent=title;$('pageSubtitle').textContent=subtitle}
function navigate(view){
  document.querySelectorAll('.view').forEach(v=>v.classList.add('hidden'))
  $(view+'View').classList.remove('hidden')
  document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view))
  document.querySelectorAll('[data-partner-id]').forEach(b=>b.classList.remove('active'))
  const m=viewMeta[view]||['Centro di Regia','']
  setHeader(m[0],m[1])
  if(view==='recovery')loadRecovery()
  window.scrollTo({top:0,behavior:'smooth'})
}
function openPartner(id){
  currentPartnerId=id
  document.querySelectorAll('.view').forEach(v=>v.classList.add('hidden'))
  $('partnerView').classList.remove('hidden')
  document.querySelectorAll('.nav-item').forEach(b=>b.classList.remove('active'))
  const btn=document.querySelector('[data-partner-id="'+id+'"]');if(btn)btn.classList.add('active')
  const n=ecosystem.find(x=>x.id===id);if(!n)return
  setHeader(n.name,n.capability+' · dossier relazione')
  showPartnerSection('overview')
  renderPartner()
  window.scrollTo({top:0,behavior:'smooth'})
}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>navigate(b.dataset.view))
document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>navigate(b.dataset.go))
document.querySelectorAll('.partner-tab').forEach(b=>b.onclick=()=>showPartnerSection(b.dataset.partnerSection))
function showPartnerSection(section){
  document.querySelectorAll('.partner-section').forEach(x=>x.classList.add('hidden'))
  $('partner'+section.charAt(0).toUpperCase()+section.slice(1)+'Section').classList.remove('hidden')
  document.querySelectorAll('.partner-tab').forEach(b=>b.classList.toggle('active',b.dataset.partnerSection===section))
}

$('refreshBtn').onclick=loadAll
$('newEntityBtn').onclick=openNewEntity
$('newActionBtn').onclick=()=>openNewAction()
$('addPartnerActionBtn').onclick=()=>openNewAction(currentPartnerId)
$('addTimelineBtn').onclick=openAddTimeline
$('addContactBtn').onclick=openAddContact
$('addPartnerDocumentBtn').onclick=()=>openAddDocument(currentPartnerId)
$('addDocumentBtn').onclick=()=>openAddDocument(null)
$('addCepaSubjectBtn').onclick=openNewSubject
$('addCepaInitiativeBtn').onclick=openNewInitiative
$('addCollaboratorBtn').onclick=openNewCollaborator
$('editPartnerBtn').onclick=openEditPartner
$('mailTemplateSelect').onchange=hydrateMailTemplate
$('generateMailBtn').onclick=generateMailDraft
$('mailComposerForm').onsubmit=saveMailDraft
$('aiDockToggle').onclick=()=>{$('aiDockPanel').classList.toggle('hidden')}
$('aiChatForm').onsubmit=e=>{e.preventDefault();const q=$('aiChatInput').value.trim();if(!q)return;askAssistant(q);$('aiChatInput').value=''}
document.querySelectorAll('[data-ai-prompt]').forEach(b=>b.onclick=()=>askAssistant(b.dataset.aiPrompt))
$('territoryHubFilter').onchange=renderMarketTable
$('territoryStageFilter').onchange=renderMarketTable
$('actionLaneFilter').onchange=renderActions
$('actionStatusFilter').onchange=renderActions
$('refreshRecoveryBtn').onclick=loadRecovery

async function boot(){
  const{data:{user}}=await supabase.auth.getUser()
  if(!user){$('loginView').classList.remove('hidden');$('workspace').classList.add('hidden');$('blockedView').classList.add('hidden');$('aiDock').classList.add('hidden');return}
  const{data:m,error}=await supabase.from('organization_memberships').select('organization_id,role').eq('user_id',user.id).eq('active',true).limit(1).maybeSingle()
  $('loginView').classList.add('hidden')
  if(error||!m){$('workspace').classList.add('hidden');$('blockedView').classList.remove('hidden');return}
  window.orgId=m.organization_id;window.userId=user.id;window.userRole=m.role
  $('workspace').classList.remove('hidden');$('blockedView').classList.add('hidden');$('aiDock').classList.remove('hidden')
  $('sideUser').textContent=user.email||'Utente';$('rolePill').textContent=m.role.replaceAll('_',' ')
  ;['newEntityBtn','addTimelineBtn','addContactBtn','addPartnerDocumentBtn','addDocumentBtn','addCepaSubjectBtn','addCepaInitiativeBtn','addCollaboratorBtn','editPartnerBtn'].forEach(id=>$(id).classList.toggle('hidden',!isManager()))
  await loadAll()
}

async function loadAll(){
  if(!window.orgId)return
  $('refreshBtn').textContent='…'
  const q=[
    supabase.from('ecosystem_nodes').select('*').eq('organization_id',window.orgId).eq('active',true).order('priority',{ascending:false}),
    supabase.from('strategic_projects').select('*,ecosystem_nodes(id,name,code),market_entities(id,name,city)').eq('organization_id',window.orgId).order('created_at',{ascending:false}),
    supabase.from('strategic_actions').select('*,strategic_projects(id,title),ecosystem_nodes(id,name,code),market_entities(id,name,city)').eq('organization_id',window.orgId).order('created_at',{ascending:false}),
    supabase.from('market_hubs').select('*').eq('organization_id',window.orgId).eq('active',true).order('code'),
    supabase.from('market_entities').select('*,market_hubs(id,code,name)').eq('organization_id',window.orgId).order('city').order('name'),
    supabase.from('ecosystem_contacts').select('*').eq('organization_id',window.orgId).order('is_primary',{ascending:false}).order('full_name'),
    supabase.from('ecosystem_timeline').select('*').eq('organization_id',window.orgId).order('event_date',{ascending:false}),
    supabase.from('ecosystem_documents').select('*,ecosystem_nodes(id,name,code)').eq('organization_id',window.orgId).order('created_at',{ascending:false}),
    supabase.from('document_blueprints').select('*').eq('organization_id',window.orgId).eq('status','ready').order('category').order('title'),
    supabase.from('cepa_subjects').select('*').eq('organization_id',window.orgId).order('maturity',{ascending:false}),
    supabase.from('cepa_initiatives').select('*,cepa_subjects(id,title),ecosystem_nodes(id,name,code)').eq('organization_id',window.orgId).order('created_at',{ascending:false}),
    supabase.from('agency_products').select('*,ecosystem_nodes(id,name,code)').eq('organization_id',window.orgId).eq('active',true).order('category').order('name'),
    supabase.from('product_comparisons').select('*,agency_products(id,name,comparison_group)').eq('organization_id',window.orgId).order('created_at',{ascending:false}),
    supabase.from('agency_collaborators').select('*').eq('organization_id',window.orgId).eq('active',true).order('display_name'),
    supabase.from('collaborator_product_terms').select('*,agency_products(id,name),ecosystem_nodes(id,name,code)').eq('organization_id',window.orgId).order('created_at',{ascending:false}),
    supabase.from('ai_mail_templates').select('*').eq('organization_id',window.orgId).eq('active',true).order('title'),
    supabase.from('ai_mail_drafts').select('*,ecosystem_nodes(id,name),ai_mail_templates(id,title)').eq('organization_id',window.orgId).order('created_at',{ascending:false}).limit(100),
    supabase.from('cepa_expansion_stages').select('*').eq('organization_id',window.orgId).order('stage_no')
  ]
  const res=await Promise.all(q)
  const err=res.find(x=>x.error)?.error
  if(err){console.error(err);$('refreshBtn').textContent='!';return}
  ;[ecosystem,projects,actions,marketHubs,marketEntities,contacts,timeline,documents,blueprints,subjects,initiatives,products,comparisons,collaborators,collaboratorTerms,mailTemplates,mailDrafts,cepaExpansion]=res.map(x=>x.data||[])
  renderEverything()
  $('refreshBtn').textContent='↻'
}

function renderEverything(){
  renderPartnerNav();renderHome();renderPartner();renderProducts();renderCollaborators();renderComparisons();renderMail();renderCepa();renderTerritories();renderDocuments();renderDevelopment();renderActions()
}

function renderPartnerNav(){
  $('partnerNav').innerHTML=ecosystem.map(n=>'<button class="nav-item" data-partner-id="'+n.id+'">'+esc(n.name)+'<span class="nav-sub">'+esc(n.capability)+'</span></button>').join('')
  document.querySelectorAll('[data-partner-id]').forEach(b=>b.onclick=()=>openPartner(b.dataset.partnerId))
}
function relationshipLabel(v){return ({core:'Perno / mandato principale',active:'Collaborazione attiva',project_active:'Progetto attivo',to_verify:'Da verificare',paused:'In pausa',closed:'Chiuso'})[v]||v}
function laneLabel(v){return ({existing:'Esistente',development:'Sviluppo',shared:'Comune'})[v]||v}
function actionStatus(v){return ({open:'Aperta',in_progress:'In corso',waiting:'In attesa',completed:'Completata',cancelled:'Annullata'})[v]||v}
function projectStatus(v){return ({discovery:'Ricostruzione',planned:'Pianificato',active:'Attivo',waiting:'In attesa',pilot:'Pilota',completed:'Completato',paused:'In pausa',cancelled:'Annullato'})[v]||v}
function subjectStatus(v){return ({research:'Ricerca',design:'Progettazione',ready:'Pronta',active:'Attiva',review:'Revisione',archived:'Archiviata'})[v]||v}
function entityType(v){return ({insurance_intermediary:'Intermediario assicurativo',company:'Impresa',professional:'Professionista',public_entity:'Ente',school:'Scuola',association:'Associazione',partner:'Partner',sap_candidate:'Potenziale SAP',other:'Altro'})[v]||v}
function stageLabel(v){return ({observed:'Osservato',qualified:'Qualificato',prospect:'Prospect',opportunity:'Opportunità',relationship:'Relazione',archived:'Archiviato'})[v]||v}

function renderHome(){
  $('homePartners').innerHTML=ecosystem.map(n=>'<span>'+esc(n.code)+'</span>').join('')
  $('homeCepaSubjects').textContent=subjects.length
  $('homeDocs').textContent=documents.length
  $('homeMarket').textContent=marketEntities.length
  const open=actions.filter(a=>!['completed','cancelled'].includes(a.status)).sort(actionSort).slice(0,8)
  $('homeActions').innerHTML=open.map(a=>listRow(a.title,(a.ecosystem_nodes?.name||a.market_entities?.name||a.strategic_projects?.title||laneLabel(a.lane)),[actionStatus(a.status),a.priority,a.due_at?fmtDate(a.due_at):'senza scadenza'])).join('')||empty('Nessuna attività aperta')
}

function renderPartner(){
  if(!currentPartnerId)return
  const n=ecosystem.find(x=>x.id===currentPartnerId);if(!n)return
  $('partnerName').textContent=n.name;$('partnerCapability').textContent=n.capability;$('partnerStatus').textContent=relationshipLabel(n.relationship_status)
  $('partnerType').textContent=n.regulatory_domain==='insurance'?'COMPAGNIA / COLLABORAZIONE ASSICURATIVA':'PARTNER SPECIALISTICO'
  $('partnerRole').textContent=n.strategic_role||'Da definire';$('partnerCurrent').textContent=n.current_use||'Da verificare';$('partnerFuture').textContent=n.future_role||'Da analizzare'
  $('partnerOverview').innerHTML='<p><strong>Fonte del dato</strong><br>'+esc(n.source_note||n.source_basis||'Da documentare')+'</p><p><strong>Perimetro</strong><br>'+esc(n.regulatory_domain||'Da definire')+'</p><p><strong>Priorità strategica</strong><br>'+esc(n.priority)+'/100</p>'
  const tl=timeline.filter(x=>x.ecosystem_node_id===n.id)
  $('partnerTimeline').innerHTML=tl.map(x=>'<article class="timeline-item"><time>'+esc(fmtDate(x.event_date))+'</time><h4>'+esc(x.title)+'</h4><p>'+esc(x.description||'')+'</p><div class="tags"><span class="tag">'+esc(x.event_type)+'</span><span class="tag">'+(x.verified?'verificato':'da verificare')+'</span></div></article>').join('')||empty('Cronologia storica da ricostruire')
  const cc=contacts.filter(x=>x.ecosystem_node_id===n.id)
  $('partnerContacts').innerHTML=cc.map(x=>'<article class="contact-card"><div class="eyebrow">'+(x.is_primary?'REFERENTE PRINCIPALE':'REFERENTE')+'</div><h4>'+esc(x.full_name)+'</h4><p>'+esc(x.role_title||'Ruolo da indicare')+'</p><p>'+esc(x.email||'')+(x.phone?'<br>'+esc(x.phone):'')+'</p><p>'+esc(x.notes||'')+'</p></article>').join('')||empty('Nessun referente ancora registrato')
  const dd=documents.filter(x=>x.ecosystem_node_id===n.id)
  $('partnerDocuments').innerHTML=dd.map(docCard).join('')||empty('Nessun contratto o documento ancora collegato')
  const pp=projects.filter(x=>x.ecosystem_node_id===n.id)
  $('partnerProjects').innerHTML=pp.map(p=>listRow(p.title,p.objective||'', [projectStatus(p.status),p.priority,p.next_action||'prossima azione da definire'])).join('')||empty('Nessun progetto collegato')
  const aa=actions.filter(x=>x.ecosystem_node_id===n.id)
  $('partnerActions').innerHTML=aa.map(actionRow).join('')||empty('Nessuna attività collegata')
  bindActionButtons()
}
function docCard(d){return '<article class="doc-card"><div class="doc-type">'+esc(d.document_type)+'</div><h4>'+esc(d.title)+'</h4><p>'+esc(d.notes||'')+'</p><div class="tags"><span class="tag">'+esc(d.document_status)+'</span>'+(d.version?'<span class="tag">v '+esc(d.version)+'</span>':'')+'</div></article>'}

function renderCepa(){
  $('cepaSubjectCount').textContent=subjects.length
  $('cepaDesignCount').textContent=subjects.filter(s=>['research','design','review'].includes(s.lifecycle_status)).length
  $('cepaInitiativeCount').textContent=initiatives.length
  $('cepaDocCount').textContent=documents.filter(d=>d.tags?.includes('CEPA')).length
  $('cepaSubjectGrid').innerHTML=subjects.map(s=>'<article class="subject-card" data-subject="'+s.id+'"><div class="subject-domain">'+esc(s.domain)+' · '+esc(subjectStatus(s.lifecycle_status))+'</div><h4>'+esc(s.title)+'</h4><p>'+esc(s.description||'')+'</p><div class="tags">'+(s.target_audiences||[]).slice(0,4).map(a=>'<span class="tag">'+esc(a)+'</span>').join('')+'</div><div class="subject-progress"><span style="width:'+Number(s.maturity||0)+'%"></span></div><p>'+esc(s.maturity)+'% maturità · partner: '+esc((s.partner_codes||[]).join(', ')||'da definire')+'</p></article>').join('')||empty('Nessuna materia')
  document.querySelectorAll('[data-subject]').forEach(b=>b.onclick=()=>openSubject(b.dataset.subject))
  $('cepaInitiativeList').innerHTML=initiatives.map(i=>listRow(i.title,(i.cepa_subjects?.title||'Materia da definire')+(i.territory?' · '+i.territory:''),[i.status,i.initiative_type])).join('')||empty('Nessuna iniziativa ancora registrata')
  $('cepaRoadmap').innerHTML=cepaExpansion.map(s=>'<article class="roadmap-step '+(s.status==='current'?'current':'')+'"><span class="step-no">'+esc(s.stage_no)+'</span><h4>'+esc(s.title)+'</h4><p><strong>'+esc(s.territory)+'</strong></p><p>'+esc(s.objective||'')+'</p><div class="tags"><span class="tag">'+esc(s.status)+'</span></div></article>').join('')||empty('Roadmap nazionale da costruire')
}

function renderTerritories(){
  $('territoryHubCards').innerHTML=marketHubs.map(h=>{
    const rows=marketEntities.filter(e=>e.hub_id===h.id)
    return '<article class="hub-card"><div class="eyebrow">HUB PILOTA</div><h3>'+esc(h.city)+'</h3><p>'+esc(h.address||'Indirizzo da completare')+'</p><div class="hub-meta"><span>'+rows.length+' mappati</span><span>'+rows.filter(x=>x.stage==='relationship').length+' relazioni</span><span>'+rows.filter(x=>x.entity_type==='sap_candidate').length+' candidati SAP</span></div></article>'
  }).join('')
}

function renderDocuments(){
  $('documentArchive').innerHTML=documents.map(d=>'<div class="document-row"><h4>'+esc(d.title)+'</h4><p>'+esc(d.document_type)+' · '+esc(d.document_status)+(d.ecosystem_nodes?.name?' · '+esc(d.ecosystem_nodes.name):'')+'</p><p>'+esc(d.notes||'')+'</p></div>').join('')||empty('Nessun documento registrato')
  $('blueprintList').innerHTML=blueprints.map(b=>'<div class="blueprint-row" data-blueprint="'+b.id+'"><h4>'+esc(b.title)+'</h4><p>'+esc(b.category)+' · struttura pronta</p><p>'+esc(b.intended_use||'')+'</p></div>').join('')||empty('Nessun modello disponibile')
  document.querySelectorAll('[data-blueprint]').forEach(b=>b.onclick=()=>openBlueprint(b.dataset.blueprint))
}


function renderProducts(){
  $('productCount').textContent=products.length
  $('productToVerify').textContent=products.filter(p=>p.maturity_status==='to_verify').length
  $('comparisonCount').textContent=comparisons.filter(c=>c.status==='verified').length
  $('productProviderCount').textContent=new Set(products.map(p=>p.ecosystem_node_id).filter(Boolean)).size
  $('productGrid').innerHTML=products.map(p=>{
    const provider=p.ecosystem_nodes?.name||'Maglia'
    const verified=p.maturity_status==='verified'||p.maturity_status==='active'
    return '<article class="product-card" data-product="'+p.id+'"><div class="product-provider">'+esc(provider)+'</div><h3>'+esc(p.name)+'</h3><p>'+esc(p.summary||'Sintesi da completare')+'</p><div class="product-meta"><span class="tag">'+esc(p.category)+'</span><span class="verification-badge '+(verified?'verified':'')+'">'+esc(verified?'verificato':'da verificare')+'</span></div></article>'
  }).join('')||empty('Nessun prodotto o area censita')
  document.querySelectorAll('[data-product]').forEach(b=>b.onclick=()=>openProduct(b.dataset.product))
}

function openProduct(id){
  const p=products.find(x=>x.id===id);if(!p)return
  const provider=p.ecosystem_nodes?.name||'Maglia'
  const pc=comparisons.filter(c=>c.product_id===id)
  const strengths=(p.strengths||[])
  const weaknesses=(p.weaknesses||[])
  $('modalContent').innerHTML='<div class="eyebrow">SCHEDA PRODOTTO</div><h2>'+esc(p.name)+'</h2><p class="muted">'+esc(provider)+' · '+esc(p.category)+' · '+esc(p.maturity_status)+'</p><div class="product-route"><div>Target</div><div>Bisogno</div><div>Analisi</div><div>'+esc(provider)+'</div><div>Follow-up</div></div><div class="prose-box"><p><strong>Sintesi</strong><br>'+esc(p.summary||'Da completare')+'</p><p><strong>Target</strong><br>'+esc((p.audience||[]).join(', ')||'Da definire')+'</p><p><strong>Processo</strong><br>'+esc(p.process_notes||'Da ricostruire sul processo reale di agenzia.')+'</p><p><strong>Note / esclusioni</strong><br>'+esc(p.exclusions_notes||'Da verificare sui documenti ufficiali.')+'</p></div><div class="strength-weak-grid"><div class="sw-box strength"><h4>Punti di forza</h4>'+(strengths.length?'<ul>'+strengths.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':'<p class="muted">Da compilare dopo verifica documentale.</p>')+'</div><div class="sw-box weak"><h4>Punti deboli / limiti</h4>'+(weaknesses.length?'<ul>'+weaknesses.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':'<p class="muted">Da compilare dopo verifica documentale.</p>')+'</div></div><div class="modal-section"><h4>Confronti</h4>'+(pc.length?pc.map(c=>'<p class="muted"><strong>'+esc(c.benchmark_name)+'</strong><br>'+esc(c.comparison_scope||'')+' · '+esc(c.status)+(c.source_date?' · '+esc(fmtDate(c.source_date)):'')+'</p>').join(''):'<p class="muted">Nessun confronto verificato ancora. La struttura è pronta per fonti, data, metriche e note.</p>')+'</div>'
  $('modal').classList.remove('hidden')
}

function renderCollaborators(){
  $('collabCount').textContent=collaborators.length
  $('collabVerified').textContent=collaborators.filter(c=>c.status==='active').length
  $('collabTermsCount').textContent=collaboratorTerms.length
  $('collabTermsPending').textContent=collaboratorTerms.filter(t=>t.verification_status!=='verified').length
  $('collaboratorList').innerHTML=collaborators.map(c=>{
    const terms=collaboratorTerms.filter(t=>t.collaborator_id===c.id)
    return '<div class="collab-row"><div><strong>'+esc(c.display_name)+'</strong><small>'+esc(c.role_description||c.collaborator_type)+'</small></div><div><strong>'+esc(c.area||'Da definire')+'</strong><small>'+esc(c.territory||'Territorio da verificare')+'</small></div><div><span class="money-status">'+esc(c.earning_model||'da verificare')+'</span><small>'+esc(c.earning_notes||'')+'</small></div><div><strong>'+terms.length+' condizioni collegate</strong><small>'+terms.filter(t=>t.verification_status!=='verified').length+' da verificare</small></div><button class="small-btn" data-collaborator="'+c.id+'">Apri</button></div>'
  }).join('')||empty('Nessun collaboratore censito')
  document.querySelectorAll('[data-collaborator]').forEach(b=>b.onclick=()=>openCollaborator(b.dataset.collaborator))
}

function openCollaborator(id){
  const c=collaborators.find(x=>x.id===id);if(!c)return
  const terms=collaboratorTerms.filter(t=>t.collaborator_id===id)
  $('modalContent').innerHTML='<div class="eyebrow">COLLABORATORE</div><h2>'+esc(c.display_name)+'</h2><p class="muted">'+esc(c.area||'Area da definire')+' · '+esc(c.territory||'Territorio da verificare')+'</p><div class="prose-box"><p><strong>Ruolo</strong><br>'+esc(c.role_description||'Da completare')+'</p><p><strong>Modello guadagno generale</strong><br>'+esc(c.earning_model||'Da verificare')+'</p><p><strong>Note economiche</strong><br>'+esc(c.earning_notes||'Nessuna condizione economica verificata inserita.')+'</p></div><div class="modal-section"><h4>Condizioni per prodotto / collaborazione</h4>'+(terms.length?terms.map(t=>'<p class="muted"><strong>'+esc(t.agency_products?.name||t.ecosystem_nodes?.name||t.activity_scope||'Ambito')+'</strong><br>'+esc(t.earning_type)+' · '+esc(t.verification_status)+(t.percentage!=null?' · '+esc(t.percentage)+'%':'')+(t.fixed_amount!=null?' · € '+esc(t.fixed_amount):'')+(t.bonus_rule?' · '+esc(t.bonus_rule):'')+'</p>').join(''):'<p class="muted">Nessuna condizione caricata. Va ricostruita dalle regole reali di agenzia.</p>')+'</div>'
  $('modal').classList.remove('hidden')
}

function openNewCollaborator(){
  if(!isManager())return
  $('modalContent').innerHTML='<div class="eyebrow">RETE AGENZIA</div><h2>Nuovo collaboratore</h2><form id="collabForm" class="form"><label>Nome<input id="colName" required></label><div class="inline"><label>Area<input id="colArea"></label><label>Territorio<input id="colTerritory"></label></div><label>Ruolo<textarea id="colRole"></textarea></label><label>Modello guadagno generale<input id="colEarning" placeholder="es. provvigione, fisso, bonus, misto, da verificare"></label><label>Note economiche<textarea id="colEarningNotes"></textarea></label><button class="primary" type="submit">Salva collaboratore</button></form>'
  $('modal').classList.remove('hidden')
  $('collabForm').onsubmit=async e=>{
    e.preventDefault()
    const row={organization_id:window.orgId,display_name:$('colName').value.trim(),collaborator_type:'collaborator',area:$('colArea').value.trim()||null,territory:$('colTerritory').value.trim()||null,role_description:$('colRole').value.trim()||null,earning_model:$('colEarning').value.trim()||'da_verificare',earning_notes:$('colEarningNotes').value.trim()||null,status:'to_verify'}
    const{error}=await supabase.from('agency_collaborators').insert(row)
    if(error)return alert(error.message)
    closeModal();await loadAll()
  }
}

function renderComparisons(){
  const groups=[...new Set(products.map(p=>p.comparison_group||p.category).filter(Boolean))]
  $('comparisonGroups').innerHTML=groups.map(g=>{
    const gp=products.filter(p=>(p.comparison_group||p.category)===g)
    const gc=comparisons.filter(c=>c.agency_products?.comparison_group===g)
    const verified=gc.filter(c=>c.status==='verified')
    const names=gp.map(p=>p.name).join(' · ')
    return '<article class="comparison-card"><div class="comparison-head"><div><div class="eyebrow">'+esc(g)+'</div><h3>'+esc(names)+'</h3></div><span class="verification-badge '+(verified.length?'verified':'')+'">'+(verified.length?verified.length+' confronti verificati':'benchmark da costruire')+'</span></div><div class="comparison-body"><div class="strength-weak-grid"><div class="sw-box strength"><h4>Punti di forza censiti</h4><ul>'+((gp.flatMap(p=>p.strengths||[])).length?gp.flatMap(p=>p.strengths||[]).map(x=>'<li>'+esc(x)+'</li>').join(''):'<li>Da verificare su documentazione e processo reale.</li>')+'</ul></div><div class="sw-box weak"><h4>Punti deboli / limiti</h4><ul>'+((gp.flatMap(p=>p.weaknesses||[])).length?gp.flatMap(p=>p.weaknesses||[]).map(x=>'<li>'+esc(x)+'</li>').join(''):'<li>Da verificare senza attribuire giudizi non documentati.</li>')+'</ul></div></div><div class="compare-note">'+(verified.length?verified.map(c=>'<strong>'+esc(c.benchmark_name)+'</strong><br>'+esc(c.comparison_scope||'')+(c.source_url?'<br>Fonte registrata':'')).join('<br><br>'):'Il confronto non viene riempito con punteggi inventati. Verranno registrati solo dati comparabili con fonte, data e livello di confidenza.')+'</div></div></article>'
  }).join('')||empty('Nessun gruppo di confronto')
}

function renderMail(){
  $('mailTemplateList').innerHTML=mailTemplates.map(t=>'<div class="template-card" data-mail-template="'+t.id+'"><h4>'+esc(t.title)+'</h4><p>'+esc(t.purpose)+' · '+esc(t.audience||'')+'</p></div>').join('')||empty('Nessun modello email')
  document.querySelectorAll('[data-mail-template]').forEach(b=>b.onclick=()=>{ $('mailTemplateSelect').value=b.dataset.mailTemplate; hydrateMailTemplate(); $('mailContext').focus() })
  const cur=$('mailTemplateSelect').value
  $('mailTemplateSelect').innerHTML='<option value="">Scegli un modello</option>'+mailTemplates.map(t=>'<option value="'+t.id+'">'+esc(t.title)+'</option>').join('')
  if(mailTemplates.some(t=>t.id===cur))$('mailTemplateSelect').value=cur
  $('mailPartnerSelect').innerHTML='<option value="">Generale</option>'+ecosystem.map(n=>'<option value="'+n.id+'">'+esc(n.name)+'</option>').join('')
  $('mailDraftList').innerHTML=mailDrafts.map(d=>listRow(d.subject||d.purpose||'Bozza email',(d.recipient_name||d.recipient_email||'destinatario da definire')+(d.ecosystem_nodes?.name?' · '+d.ecosystem_nodes.name:''),[d.status,fmtDate(d.created_at)])).join('')||empty('Nessuna bozza salvata')
}

function hydrateMailTemplate(){
  const t=mailTemplates.find(x=>x.id===$('mailTemplateSelect').value)
  if(!t)return
  $('mailSubject').value=t.subject_pattern||''
  $('mailBody').value=t.body_pattern||''
}
function fillPattern(text,vars){
  return String(text||'').replace(/{{\s*([^}]+)\s*}}/g,(_,k)=>vars[k.trim()]??'['+k.trim()+']')
}
function generateMailDraft(){
  const t=mailTemplates.find(x=>x.id===$('mailTemplateSelect').value)
  if(!t)return alert('Scegli prima un modello.')
  const partner=ecosystem.find(x=>x.id===$('mailPartnerSelect').value)
  const context=$('mailContext').value.trim()
  const vars={
    partner:partner?.name||'Maglia / partner',
    nome:$('mailRecipientName').value.trim()||'',
    tema:context||'[tema da definire]',
    punti:context||'[punti da definire]',
    dettagli:context||'[dettagli da definire]',
    documenti:context||'[documenti da definire]'
  }
  $('mailSubject').value=fillPattern(t.subject_pattern,vars)
  $('mailBody').value=fillPattern(t.body_pattern,vars)
}
async function saveMailDraft(e){
  e.preventDefault()
  const row={organization_id:window.orgId,created_by:window.userId,ecosystem_node_id:$('mailPartnerSelect').value||null,template_id:$('mailTemplateSelect').value||null,recipient_name:$('mailRecipientName').value.trim()||null,recipient_email:$('mailRecipientEmail').value.trim()||null,purpose:mailTemplates.find(x=>x.id===$('mailTemplateSelect').value)?.purpose||'custom',context:$('mailContext').value.trim()||null,subject:$('mailSubject').value.trim()||null,body:$('mailBody').value.trim()||null,status:'draft'}
  const{error}=await supabase.from('ai_mail_drafts').insert(row)
  if(error)return alert(error.message)
  $('mailContext').value='';$('mailSubject').value='';$('mailBody').value=''
  await loadAll()
}

function addAssistantMessage(text,type='bot'){
  const d=document.createElement('div');d.className='ai-message '+type;d.textContent=text;$('aiMessages').appendChild(d);$('aiMessages').scrollTop=$('aiMessages').scrollHeight
}
function askAssistant(q){
  addAssistantMessage(q,'user')
  const s=q.toLowerCase()
  let reply=''
  if(s.includes('attivit')||s.includes('scadenz')){
    const open=actions.filter(a=>!['completed','cancelled'].includes(a.status))
    const due=open.filter(a=>a.due_at).sort(actionSort).slice(0,3)
    reply='Ci sono '+open.length+' attività aperte. '+(due.length?'Le prime con scadenza: '+due.map(a=>a.title+' ('+fmtDate(a.due_at)+')').join('; ')+'.':'Non risultano scadenze registrate sulle prime attività.')
  }else if(s.includes('prodot')||s.includes('confront')){
    const pending=products.filter(p=>p.maturity_status==='to_verify').length
    reply='Ho '+products.length+' schede prodotto/area censite; '+pending+' sono ancora da verificare. I confronti verificati sono '+comparisons.filter(c=>c.status==='verified').length+'. Posso portarti nella sezione Prodotti o Confronti.'
  }else if(s.includes('collabor')||s.includes('guadagn')||s.includes('provvig')){
    reply='Sono censiti '+collaborators.length+' collaboratori e '+collaboratorTerms.length+' condizioni economiche per prodotto/rapporto. '+collaboratorTerms.filter(t=>t.verification_status!=='verified').length+' condizioni sono ancora da verificare: non inserisco percentuali senza evidenza.'
  }else if(s.includes('cepa')||s.includes('nazional')){
    const current=cepaExpansion.find(x=>x.status==='current')
    reply='CEPA ha '+subjects.length+' materie censite. La fase corrente della roadmap è '+(current?current.title+' su '+current.territory:'da definire')+'. La roadmap contiene '+cepaExpansion.length+' fasi fino allo scenario nazionale, mantenute come piano evolutivo e non come risultati già acquisiti.'
  }else if(s.includes('email')||s.includes('mail')){
    reply='Posso preparare e salvare una bozza personalizzata usando i modelli Maglia/CEPA. Ti porto in AI Mail & Chat. L’invio diretto resta separato finché non colleghiamo un canale email autorizzato.'
    navigate('aiMail')
  }else{
    const names=ecosystem.map(n=>n.code).join(', ')
    reply='Posso lavorare sui dati presenti in piattaforma: compagnie e partner ('+names+'), prodotti, collaboratori, CEPA, territorio, documenti e attività. Dimmi quale area vuoi leggere o quale azione vuoi preparare.'
  }
  setTimeout(()=>addAssistantMessage(reply,'bot'),120)
}

function renderDevelopment(){
  $('hubGrid').innerHTML=marketHubs.map(h=>{
    const rows=marketEntities.filter(e=>e.hub_id===h.id)
    return '<article class="hub-card"><div class="eyebrow">LABORATORIO TERRITORIALE</div><h3>'+esc(h.city)+'</h3><p>'+esc(h.address||'')+'</p><div class="hub-meta"><span>'+rows.length+' mappati</span><span>'+rows.filter(x=>x.source_kind!=='legacy_registry').length+' nuovi</span><span>'+rows.filter(x=>!['observed','archived'].includes(x.stage)).length+' qualificati</span></div></article>'
  }).join('')
  $('devObserved').textContent=marketEntities.filter(x=>x.stage==='observed').length
  $('devQualified').textContent=marketEntities.filter(x=>['qualified','prospect'].includes(x.stage)).length
  $('devOpportunity').textContent=marketEntities.filter(x=>x.stage==='opportunity').length
  $('devRelationship').textContent=marketEntities.filter(x=>x.stage==='relationship').length
  const sel=$('territoryHubFilter'),cur=sel.value
  sel.innerHTML='<option value="">Tutti gli hub</option>'+marketHubs.map(h=>'<option value="'+h.id+'">'+esc(h.city)+'</option>').join('')
  if(marketHubs.some(h=>h.id===cur))sel.value=cur
  renderMarketTable()
}
function scoreHtml(v){return v==null?'<span class="score pending">Da valutare</span>':'<span class="score '+(v>=70?'good':'')+'">'+v+'</span>'}
function renderMarketTable(){
  const hub=$('territoryHubFilter').value,stage=$('territoryStageFilter').value
  const rows=marketEntities.filter(x=>(!hub||x.hub_id===hub)&&(!stage||x.stage===stage))
  $('territoryBody').innerHTML=rows.map(x=>'<tr><td><span class="name">'+esc(x.name)+'</span><span class="tiny">'+esc(x.city||'')+(x.address?' · '+esc(x.address):'')+'</span></td><td>'+esc(x.market_hubs?.name?.replace('CEPA / HDI ','')||'—')+'</td><td>'+esc(entityType(x.entity_type))+'</td><td>'+esc(x.source_kind==='legacy_registry'?'Base esistente':x.source_name)+'</td><td>'+scoreHtml(x.relevance_score)+'</td><td>'+scoreHtml(x.advisory_score)+'</td><td><span class="stage '+esc(x.stage)+'">'+esc(stageLabel(x.stage))+'</span></td><td>'+(isManager()?'<button class="small-btn" data-qualify="'+x.id+'">Apri</button>':'')+'</td></tr>').join('')||'<tr><td colspan="8">'+empty('Nessun risultato')+'</td></tr>'
  document.querySelectorAll('[data-qualify]').forEach(b=>b.onclick=()=>openQualify(b.dataset.qualify))
}

function actionSort(a,b){const ad=a.due_at?new Date(a.due_at).getTime():Infinity,bd=b.due_at?new Date(b.due_at).getTime():Infinity;if(ad!==bd)return ad-bd;const p={urgent:0,high:1,normal:2,low:3};return(p[a.priority]??9)-(p[b.priority]??9)}
function renderActions(){
  const lane=$('actionLaneFilter').value,status=$('actionStatusFilter').value
  const rows=[...actions].filter(a=>(!lane||a.lane===lane)&&(!status||a.status===status)).sort(actionSort)
  $('actionList').innerHTML=rows.map(actionRow).join('')||empty('Nessuna attività')
  bindActionButtons()
}
function actionRow(a){const context=a.ecosystem_nodes?.name||a.market_entities?.name||a.strategic_projects?.title||laneLabel(a.lane);return '<div class="list-row"><div><h4>'+esc(a.title)+'</h4><p>'+esc(a.description||'')+'</p><div class="tags"><span class="tag">'+esc(laneLabel(a.lane))+'</span><span class="tag">'+esc(actionStatus(a.status))+'</span><span class="tag">'+esc(a.priority)+'</span><span class="tag">'+esc(context)+'</span></div></div><div><div class="tiny">'+esc(a.due_at?fmtDateTime(a.due_at):'senza scadenza')+'</div><button class="small-btn" data-action="'+a.id+'">Gestisci</button></div></div>'}
function bindActionButtons(){document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>openAction(b.dataset.action))}
function listRow(title,desc,tags=[]){return '<div class="list-row"><div><h4>'+esc(title)+'</h4><p>'+esc(desc||'')+'</p><div class="tags">'+tags.map(t=>'<span class="tag">'+esc(t)+'</span>').join('')+'</div></div></div>'}
function empty(text){return '<div class="loader">'+esc(text)+'</div>'}

function openEditPartner(){
  const n=ecosystem.find(x=>x.id===currentPartnerId);if(!n||!isManager())return
  $('modalContent').innerHTML='<div class="eyebrow">DOSSIER RELAZIONE</div><h2>'+esc(n.name)+'</h2><form id="partnerForm" class="form"><label>Stato<select id="pStatus"><option value="core">Perno / mandato principale</option><option value="active">Collaborazione attiva</option><option value="project_active">Progetto attivo</option><option value="to_verify">Da verificare</option><option value="paused">In pausa</option><option value="closed">Chiuso</option></select></label><label>Ruolo nel sistema<textarea id="pRole">'+esc(n.strategic_role||'')+'</textarea></label><label>Utilizzo oggi<textarea id="pCurrent">'+esc(n.current_use||'')+'</textarea></label><label>Direzione futura<textarea id="pFuture">'+esc(n.future_role||'')+'</textarea></label><label>Nota / fonte<textarea id="pSource">'+esc(n.source_note||'')+'</textarea></label><button class="primary" type="submit">Salva</button></form>'
  $('pStatus').value=n.relationship_status;$('modal').classList.remove('hidden')
  $('partnerForm').onsubmit=async e=>{e.preventDefault();const patch={relationship_status:$('pStatus').value,strategic_role:$('pRole').value.trim()||null,current_use:$('pCurrent').value.trim()||null,future_role:$('pFuture').value.trim()||null,source_note:$('pSource').value.trim()||null,updated_at:new Date().toISOString()};const{error}=await supabase.from('ecosystem_nodes').update(patch).eq('id',n.id).eq('organization_id',window.orgId);if(error)return alert(error.message);closeModal();await loadAll()}
}
function openAddTimeline(){
  if(!currentPartnerId||!isManager())return
  $('modalContent').innerHTML='<div class="eyebrow">CRONOLOGIA</div><h2>Aggiungi un evento</h2><form id="timelineForm" class="form"><label>Data<input id="tlDate" type="date" required></label><label>Tipo<input id="tlType" value="meeting"></label><label>Titolo<input id="tlTitle" required></label><label>Descrizione<textarea id="tlDesc"></textarea></label><label><input id="tlVerified" type="checkbox" style="width:auto;display:inline;margin-right:7px">Evento verificato</label><button class="primary" type="submit">Salva evento</button></form>'
  $('tlDate').value=new Date().toISOString().slice(0,10);$('modal').classList.remove('hidden')
  $('timelineForm').onsubmit=async e=>{e.preventDefault();const row={organization_id:window.orgId,ecosystem_node_id:currentPartnerId,event_date:$('tlDate').value,event_type:$('tlType').value.trim()||'note',title:$('tlTitle').value.trim(),description:$('tlDesc').value.trim()||null,source_basis:'internal',verified:$('tlVerified').checked,created_by:window.userId};const{error}=await supabase.from('ecosystem_timeline').insert(row);if(error)return alert(error.message);closeModal();await loadAll()}
}
function openAddContact(){
  if(!currentPartnerId||!isManager())return
  $('modalContent').innerHTML='<div class="eyebrow">REFERENTE</div><h2>Aggiungi una persona</h2><form id="contactForm" class="form"><label>Nome e cognome<input id="cName" required></label><label>Ruolo<input id="cRole"></label><div class="inline"><label>Email<input id="cEmail" type="email"></label><label>Telefono<input id="cPhone"></label></div><label>Note<textarea id="cNotes"></textarea></label><label><input id="cPrimary" type="checkbox" style="width:auto;display:inline;margin-right:7px">Referente principale</label><button class="primary" type="submit">Salva referente</button></form>';$('modal').classList.remove('hidden')
  $('contactForm').onsubmit=async e=>{e.preventDefault();const row={organization_id:window.orgId,ecosystem_node_id:currentPartnerId,full_name:$('cName').value.trim(),role_title:$('cRole').value.trim()||null,email:$('cEmail').value.trim()||null,phone:$('cPhone').value.trim()||null,notes:$('cNotes').value.trim()||null,is_primary:$('cPrimary').checked,last_verified_at:new Date().toISOString()};const{error}=await supabase.from('ecosystem_contacts').insert(row);if(error)return alert(error.message);closeModal();await loadAll()}
}
function openAddDocument(nodeId=null){
  if(!isManager())return
  $('modalContent').innerHTML='<div class="eyebrow">DOCUMENTO</div><h2>Registra documento o contratto</h2><form id="docForm" class="form"><label>Collegato a<select id="dNode"><option value="">Generale Maglia / CEPA</option>'+ecosystem.map(n=>'<option value="'+n.id+'">'+esc(n.name)+'</option>').join('')+'</select></label><label>Titolo<input id="dTitle" required></label><div class="inline"><label>Tipo<input id="dType" placeholder="contratto, accordo, presentazione..."></label><label>Stato<select id="dStatus"><option value="draft">Bozza</option><option value="review">Revisione</option><option value="active">Attivo</option><option value="reference">Riferimento</option><option value="expired">Scaduto</option><option value="archived">Archiviato</option></select></label></div><div class="inline"><label>Versione<input id="dVersion"></label><label>Scadenza<input id="dExpiry" type="date"></label></div><label>Link file, se disponibile<input id="dUrl" type="url"></label><label>Note<textarea id="dNotes"></textarea></label><button class="primary" type="submit">Registra</button></form>'
  if(nodeId)$('dNode').value=nodeId;$('modal').classList.remove('hidden')
  $('docForm').onsubmit=async e=>{e.preventDefault();const row={organization_id:window.orgId,ecosystem_node_id:$('dNode').value||null,title:$('dTitle').value.trim(),document_type:$('dType').value.trim()||'document',document_status:$('dStatus').value,version:$('dVersion').value.trim()||null,expiry_date:$('dExpiry').value||null,file_url:$('dUrl').value.trim()||null,notes:$('dNotes').value.trim()||null,created_by:window.userId};const{error}=await supabase.from('ecosystem_documents').insert(row);if(error)return alert(error.message);closeModal();await loadAll()}
}
function openBlueprint(id){
  const b=blueprints.find(x=>x.id===id);if(!b)return
  const outline=Array.isArray(b.outline)?b.outline:[]
  $('modalContent').innerHTML='<div class="eyebrow">MODELLO DOCUMENTALE</div><h2>'+esc(b.title)+'</h2><p class="muted">'+esc(b.intended_use||'')+'</p><div class="a4-preview"><div class="a4-sheet"><div class="eyebrow">MAGLIA 360</div><h3>'+esc(b.title)+'</h3>'+outline.map((s,i)=>'<div class="a4-section"><strong>'+(i+1)+'. '+esc(s)+'</strong><br><span class="muted">Sezione pronta da compilare.</span></div>').join('')+'</div></div>';$('modal').classList.remove('hidden')
}
function openNewSubject(){
  if(!isManager())return
  $('modalContent').innerHTML='<div class="eyebrow">CEPA LAB</div><h2>Nuova materia</h2><form id="subjectForm" class="form"><label>Titolo<input id="sTitle" required></label><label>Dominio<input id="sDomain" required placeholder="previdenza, salute, impresa..."></label><label>Descrizione<textarea id="sDesc"></textarea></label><div class="inline"><label>Stato<select id="sStatus"><option value="research">Ricerca</option><option value="design">Progettazione</option><option value="ready">Pronta</option><option value="active">Attiva</option><option value="review">Revisione</option></select></label><label>Maturità 0-100<input id="sMaturity" type="number" min="0" max="100" value="10"></label></div><label>Target, separati da virgola<input id="sAudience"></label><label>Partner, codici separati da virgola<input id="sPartners"></label><button class="primary" type="submit">Crea materia</button></form>';$('modal').classList.remove('hidden')
  $('subjectForm').onsubmit=async e=>{e.preventDefault();const code=$('sTitle').value.trim().toUpperCase().replace(/[^A-Z0-9]+/g,'_').replace(/^_|_$/g,'')+'_'+Date.now().toString().slice(-5);const row={organization_id:window.orgId,code,title:$('sTitle').value.trim(),domain:$('sDomain').value.trim(),description:$('sDesc').value.trim()||null,lifecycle_status:$('sStatus').value,maturity:Number($('sMaturity').value||0),target_audiences:$('sAudience').value.split(',').map(x=>x.trim()).filter(Boolean),partner_codes:$('sPartners').value.split(',').map(x=>x.trim()).filter(Boolean)};const{error}=await supabase.from('cepa_subjects').insert(row);if(error)return alert(error.message);closeModal();await loadAll()}
}
function openSubject(id){
  const s=subjects.find(x=>x.id===id);if(!s)return
  $('modalContent').innerHTML='<div class="eyebrow">MATERIA CEPA</div><h2>'+esc(s.title)+'</h2><form id="editSubjectForm" class="form"><label>Descrizione<textarea id="esDesc">'+esc(s.description||'')+'</textarea></label><div class="inline"><label>Stato<select id="esStatus"><option value="research">Ricerca</option><option value="design">Progettazione</option><option value="ready">Pronta</option><option value="active">Attiva</option><option value="review">Revisione</option><option value="archived">Archiviata</option></select></label><label>Maturità<input id="esMaturity" type="number" min="0" max="100" value="'+esc(s.maturity)+'"></label></div><label>Target<input id="esAudience" value="'+esc((s.target_audiences||[]).join(', '))+'"></label><label>Partner<input id="esPartners" value="'+esc((s.partner_codes||[]).join(', '))+'"></label><label>Domande chiave<textarea id="esQuestions">'+esc((s.key_questions||[]).join('\n'))+'</textarea></label><label>Note<textarea id="esNotes">'+esc(s.notes||'')+'</textarea></label>'+(isManager()?'<button class="primary" type="submit">Aggiorna materia</button>':'')+'</form>';$('esStatus').value=s.lifecycle_status;$('modal').classList.remove('hidden')
  if(isManager())$('editSubjectForm').onsubmit=async e=>{e.preventDefault();const patch={description:$('esDesc').value.trim()||null,lifecycle_status:$('esStatus').value,maturity:Number($('esMaturity').value||0),target_audiences:$('esAudience').value.split(',').map(x=>x.trim()).filter(Boolean),partner_codes:$('esPartners').value.split(',').map(x=>x.trim()).filter(Boolean),key_questions:$('esQuestions').value.split('\n').map(x=>x.trim()).filter(Boolean),notes:$('esNotes').value.trim()||null,updated_at:new Date().toISOString()};const{error}=await supabase.from('cepa_subjects').update(patch).eq('id',id).eq('organization_id',window.orgId);if(error)return alert(error.message);closeModal();await loadAll()}
}
function openNewInitiative(){
  if(!isManager())return
  $('modalContent').innerHTML='<div class="eyebrow">CEPA</div><h2>Nuova iniziativa</h2><form id="initiativeForm" class="form"><label>Materia<select id="iSubject"><option value="">Da definire</option>'+subjects.map(s=>'<option value="'+s.id+'">'+esc(s.title)+'</option>').join('')+'</select></label><label>Titolo<input id="iTitle" required></label><div class="inline"><label>Tipo<input id="iType" placeholder="evento, webinar, guida..." required></label><label>Territorio<input id="iTerritory"></label></div><label>Target<input id="iAudience"></label><label>Obiettivo<textarea id="iObjective"></textarea></label><label>Stato<select id="iStatus"><option value="idea">Idea</option><option value="design">Progettazione</option><option value="planned">Pianificata</option><option value="active">Attiva</option></select></label><button class="primary" type="submit">Crea iniziativa</button></form>';$('modal').classList.remove('hidden')
  $('initiativeForm').onsubmit=async e=>{e.preventDefault();const row={organization_id:window.orgId,subject_id:$('iSubject').value||null,title:$('iTitle').value.trim(),initiative_type:$('iType').value.trim(),territory:$('iTerritory').value.trim()||null,audience:$('iAudience').value.trim()||null,objective:$('iObjective').value.trim()||null,status:$('iStatus').value,created_by:window.userId};const{error}=await supabase.from('cepa_initiatives').insert(row);if(error)return alert(error.message);closeModal();await loadAll()}
}
function openNewEntity(){
  if(!isManager())return
  $('modalContent').innerHTML='<div class="eyebrow">SVILUPPO NUOVO</div><h2>Inserisci una realtà da osservare</h2><form id="entityForm" class="form"><label>Hub<select id="eHub" required>'+marketHubs.map(h=>'<option value="'+h.id+'">'+esc(h.city)+'</option>').join('')+'</select></label><label>Tipologia<select id="eType"><option value="company">Impresa</option><option value="professional">Professionista</option><option value="public_entity">Ente</option><option value="school">Scuola</option><option value="association">Associazione</option><option value="partner">Partner</option><option value="sap_candidate">Potenziale SAP</option><option value="insurance_intermediary">Intermediario assicurativo</option><option value="other">Altro</option></select></label><label>Nome<input id="eName" required></label><label>Indirizzo<input id="eAddress"></label><label>Perché la stiamo osservando?<textarea id="eNote"></textarea></label><button class="primary" type="submit">Inserisci</button></form>';$('modal').classList.remove('hidden')
  $('entityForm').onsubmit=async e=>{e.preventDefault();const h=marketHubs.find(x=>x.id===$('eHub').value);const row={organization_id:window.orgId,hub_id:h.id,entity_type:$('eType').value,name:$('eName').value.trim(),address:$('eAddress').value.trim()||null,city:h.city,province:h.province,source_kind:'manual_radar',source_name:'Mappatura manuale Maglia',external_key:'manual:'+crypto.randomUUID(),stage:'observed',tags:['mappa-zero','nuovo'],metadata:{note:$('eNote').value.trim()||null}};const{error}=await supabase.from('market_entities').insert(row);if(error)return alert(error.message);closeModal();await loadAll()}
}
function openQualify(id){
  const x=marketEntities.find(e=>e.id===id);if(!x||!isManager())return
  $('modalContent').innerHTML='<div class="eyebrow">SVILUPPO</div><h2>'+esc(x.name)+'</h2><form id="qualifyForm" class="form"><label>Stato<select id="qStage"><option value="observed">Osservato</option><option value="qualified">Qualificato</option><option value="prospect">Prospect</option><option value="opportunity">Opportunità</option><option value="relationship">Relazione</option><option value="archived">Archiviato</option></select></label><div class="inline"><label>Rilevanza CEPA<input id="qRel" type="number" min="0" max="100" value="'+(x.relevance_score??'')+'"></label><label>Potenziale Advisory<input id="qAdv" type="number" min="0" max="100" value="'+(x.advisory_score??'')+'"></label></div><label>Nota<textarea id="qNote">'+esc(x.metadata?.qualification_note||x.metadata?.note||'')+'</textarea></label><button class="primary" type="submit">Salva</button></form>';$('qStage').value=x.stage;$('modal').classList.remove('hidden')
  $('qualifyForm').onsubmit=async e=>{e.preventDefault();const patch={stage:$('qStage').value,relevance_score:$('qRel').value===''?null:Number($('qRel').value),advisory_score:$('qAdv').value===''?null:Number($('qAdv').value),metadata:{...(x.metadata||{}),qualification_note:$('qNote').value.trim()||null},updated_at:new Date().toISOString()};const{error}=await supabase.from('market_entities').update(patch).eq('id',id).eq('organization_id',window.orgId);if(error)return alert(error.message);closeModal();await loadAll()}
}
function openNewAction(nodeId=null){
  $('modalContent').innerHTML='<div class="eyebrow">ATTIVITÀ</div><h2>Nuova attività</h2><form id="actionNewForm" class="form"><div class="inline"><label>Corsia<select id="aLane"><option value="existing">Esistente</option><option value="development">Sviluppo</option><option value="shared">Comune</option></select></label><label>Priorità<select id="aPriority"><option value="normal">Normale</option><option value="high">Alta</option><option value="urgent">Urgente</option><option value="low">Bassa</option></select></label></div><label>Compagnia / partner<select id="aNode"><option value="">Nessuno</option>'+ecosystem.map(n=>'<option value="'+n.id+'">'+esc(n.name)+'</option>').join('')+'</select></label><label>Titolo<input id="aTitle" required></label><label>Descrizione<textarea id="aDesc"></textarea></label><label>Scadenza<input id="aDue" type="datetime-local"></label><button class="primary" type="submit">Crea attività</button></form>';if(nodeId)$('aNode').value=nodeId;$('modal').classList.remove('hidden')
  $('actionNewForm').onsubmit=async e=>{e.preventDefault();const row={organization_id:window.orgId,lane:$('aLane').value,ecosystem_node_id:$('aNode').value||null,title:$('aTitle').value.trim(),description:$('aDesc').value.trim()||null,priority:$('aPriority').value,status:'open',assigned_to:window.userId,created_by:window.userId,due_at:$('aDue').value?new Date($('aDue').value).toISOString():null};const{error}=await supabase.from('strategic_actions').insert(row);if(error)return alert(error.message);closeModal();await loadAll()}
}
function openAction(id){
  const a=actions.find(x=>x.id===id);if(!a)return
  $('modalContent').innerHTML='<div class="eyebrow">ATTIVITÀ</div><h2>'+esc(a.title)+'</h2><form id="actionEditForm" class="form"><div class="inline"><label>Stato<select id="aeStatus"><option value="open">Aperta</option><option value="in_progress">In corso</option><option value="waiting">In attesa</option><option value="completed">Completata</option><option value="cancelled">Annullata</option></select></label><label>Priorità<select id="aePriority"><option value="low">Bassa</option><option value="normal">Normale</option><option value="high">Alta</option><option value="urgent">Urgente</option></select></label></div><label>Scadenza<input id="aeDue" type="datetime-local" value="'+esc(localInput(a.due_at))+'"></label><label>Descrizione<textarea id="aeDesc">'+esc(a.description||'')+'</textarea></label><label>Esito<textarea id="aeOutcome">'+esc(a.outcome||'')+'</textarea></label><label>Prossima azione<textarea id="aeNext">'+esc(a.next_action||'')+'</textarea></label><button class="primary" type="submit">Aggiorna</button></form>';$('aeStatus').value=a.status;$('aePriority').value=a.priority;$('modal').classList.remove('hidden')
  $('actionEditForm').onsubmit=async e=>{e.preventDefault();const status=$('aeStatus').value;const patch={status,priority:$('aePriority').value,due_at:$('aeDue').value?new Date($('aeDue').value).toISOString():null,description:$('aeDesc').value.trim()||null,outcome:$('aeOutcome').value.trim()||null,next_action:$('aeNext').value.trim()||null,completed_at:status==='completed'?(a.completed_at||new Date().toISOString()):null,updated_at:new Date().toISOString()};const{error}=await supabase.from('strategic_actions').update(patch).eq('id',id).eq('organization_id',window.orgId);if(error)return alert(error.message);closeModal();await loadAll()}
}

async function loadMembers(){if(members.length)return;const{data,error}=await supabase.rpc('list_assignable_members',{p_organization_id:window.orgId});members=error?[]:(data||[])}
async function loadRecovery(){
  $('recoveryLoading').classList.remove('hidden');$('recoveryTableWrap').classList.add('hidden')
  const{data,error}=await supabase.from('pipeline_cases').select('id,score,reason,stage,assigned_to,metadata,clients(id,last_name,business_name,email,mobile,city,lost_at,metadata)').eq('organization_id',window.orgId).eq('pipeline','recovery').not('stage','in','(won,lost,closed)').order('score',{ascending:false}).limit(100)
  if(error){$('recoveryLoading').textContent='Errore: '+error.message;return}
  recoveryRows=(data||[]).sort((a,b)=>Number(a.metadata?.pilot_rank??999)-Number(b.metadata?.pilot_rank??999))
  $('kRecovery').textContent=recoveryRows.length;$('kHigh').textContent=recoveryRows.filter(x=>Number(x.score)>=90).length;$('kUnassigned').textContent=recoveryRows.filter(x=>!x.assigned_to).length
  const{count}=await supabase.from('work_items').select('id',{count:'exact',head:true}).eq('organization_id',window.orgId).not('status','in','(completed,cancelled)');$('kWork').textContent=count??0
  $('recoveryBody').innerHTML=recoveryRows.map(x=>{const c=x.clients||{},name=c.business_name||c.last_name||'Cliente',rank=x.metadata?.pilot_rank??c.metadata?.recovery_pilot_rank??'—';return '<tr><td>'+esc(rank)+'</td><td><span class="name">'+esc(name)+'</span><span class="tiny">'+esc(c.email||c.mobile||'')+'</span></td><td>'+esc(c.city||'—')+'</td><td>'+esc(fmtDate(c.lost_at))+'</td><td>'+esc(x.reason||'Da verificare')+'</td><td>'+scoreHtml(Number(x.score||0))+'</td><td>'+esc(x.assigned_to?x.stage:'Da assegnare')+'</td><td>'+(!x.assigned_to&&isManager()?'<button class="small-btn" data-rassign="'+x.id+'">Assegna</button>':x.assigned_to?'<button class="small-btn" data-rmanage="'+x.id+'">Gestisci</button>':'')+'</td></tr>'}).join('')
  $('recoveryLoading').classList.add('hidden');$('recoveryTableWrap').classList.remove('hidden')
  document.querySelectorAll('[data-rassign]').forEach(b=>b.onclick=()=>openAssign(b.dataset.rassign));document.querySelectorAll('[data-rmanage]').forEach(b=>b.onclick=()=>openOutcome(b.dataset.rmanage))
}
function caseById(id){return recoveryRows.find(x=>x.id===id)}
async function openAssign(id){await loadMembers();const x=caseById(id);if(!x)return;$('modalContent').innerHTML='<div class="eyebrow">RECOVERY</div><h2>Assegna cliente</h2><form id="assignForm" class="form"><label>Operatore<select id="assignee">'+members.map(m=>'<option value="'+m.user_id+'">'+esc(m.full_name)+' · '+esc(m.role)+'</option>').join('')+'</select></label><label>Data attività<input id="assignDue" type="datetime-local" required></label><button class="primary" type="submit">Assegna</button></form>';$('assignDue').value=localInput(new Date(Date.now()+300000));$('modal').classList.remove('hidden');$('assignForm').onsubmit=async e=>{e.preventDefault();const{error}=await supabase.rpc('assign_recovery_case',{p_case_id:id,p_assigned_to:$('assignee').value,p_due_at:new Date($('assignDue').value).toISOString()});if(error)return alert(error.message);closeModal();await loadRecovery()}}
function openOutcome(id){$('modalContent').innerHTML='<div class="eyebrow">RECOVERY</div><h2>Registra esito</h2><form id="outcomeForm" class="form"><label>Esito<select id="outcome"><option value="no_answer">Non risponde</option><option value="call_back">Da richiamare</option><option value="appointment">Appuntamento</option><option value="checkup">Check-up Maglia 360</option><option value="recovered">Recuperato</option><option value="not_interested">Non interessato</option><option value="do_not_contact">Non contattare</option></select></label><label>Canale<select id="channel"><option value="phone">Telefono</option><option value="email">Email</option><option value="whatsapp">WhatsApp</option><option value="in_person">Di persona</option><option value="video">Video</option><option value="other">Altro</option></select></label><label>Prossima data<input id="followAt" type="datetime-local"></label><label>Nota<textarea id="rNote"></textarea></label><button class="primary" type="submit">Registra</button></form>';$('modal').classList.remove('hidden');$('outcomeForm').onsubmit=async e=>{e.preventDefault();const f=$('followAt').value;const{error}=await supabase.rpc('record_recovery_outcome',{p_case_id:id,p_outcome:$('outcome').value,p_note:$('rNote').value.trim()||null,p_followup_at:f?new Date(f).toISOString():null,p_channel:$('channel').value});if(error)return alert(error.message);closeModal();await loadRecovery()}}

supabase.auth.onAuthStateChange(()=>setTimeout(boot,0))
await boot()