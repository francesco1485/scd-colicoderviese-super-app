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
 growthKits:['Kit Collaboratore','Valutazione del portafoglio, proposta di sviluppo, documentazione e strumenti per il cliente'],
 comparisons:['Confronti & Benchmark','Analisi verificabili tra soluzioni e realtà comparabili'],
 aiMail:['AI Mail & Chat','Bozze personalizzate, contesto relazionale e assistenza operativa'],
 cepa:['Centro CEPA','Materie, contenuti, programmi, iniziative e sviluppo del metodo'],
 territories:['SAP & Territori','Presidi territoriali, candidature, incontri e sviluppo della rete'],
 documents:['Archivio & Contratti','Documenti, accordi, dossier e modelli pronti'],
 development:['Sviluppo nuovo','Seconda strada: mappatura, qualificazione e nuove relazioni'],
 networkRadar:['Radar Rete','Ricerca continua IVASS, Registro Imprese e territorio per nuova rete e collaborazioni'],
 actions:['Attività & Scadenze','Motore operativo comune a tutto il sistema'],
 recovery:['Clienti · Recovery','Campagna operativa sul patrimonio esistente'],
 liaWorkbench:['Lia · Workbench','Assistente operativo con permessi, ricerca, cartelle di lavoro e artefatti tracciati']
}

let ecosystem=[],projects=[],actions=[],marketHubs=[],marketEntities=[],contacts=[],timeline=[],documents=[],partnerRequirements=[],blueprints=[],subjects=[],initiatives=[],cepaContent=[],cepaAcademy=[],cepaSpeakers=[],products=[],productKnowledge=[],comparisons=[],collaborators=[],collaboratorTerms=[],portfolioSnapshots=[],businessAssessments=[],growthKits=[],distributionWatchlists=[],distributionCandidates=[],distributionEvidence=[],mailTemplates=[],mailDrafts=[],cepaExpansion=[],cepaReadiness=[],assistantMessages=[],recoveryRows=[],members=[],liaCapabilities=[],liaFolders=[],liaOrders=[],liaFiles=[],researchSources=[],researchInsights=[],liaActionRules=[],liaApprovals=[],roleViewAccess=[],liaAutomationRuns=[]
let currentPartnerId=null

function msg(text,error=false){$('loginMsg').textContent=text;$('loginMsg').className='message'+(error?' error':'')}
function closeModal(){$('modal').classList.add('hidden')}
$('modalClose').onclick=closeModal
$('modal').addEventListener('click',e=>{if(e.target.id==='modal')closeModal()})
async function logout(){await supabase.auth.signOut();location.reload()}
$('logoutBtn').onclick=logout;$('blockedLogout').onclick=logout

function setMobileNav(open){
  const mobile=window.matchMedia('(max-width:900px)').matches
  if(!mobile)return
  $('workspace').classList.toggle('nav-open',!!open)
  $('sidebarBackdrop').classList.toggle('hidden',!open)
  document.documentElement.style.overflow=open?'hidden':''
}
function setDesktopSidebar(collapsed){
  if(window.matchMedia('(max-width:900px)').matches)return
  $('workspace').classList.toggle('sidebar-collapsed',!!collapsed)
  try{localStorage.setItem('maglia360_sidebar',collapsed?'collapsed':'expanded')}catch(_){}
}
$('mobileMenuBtn').onclick=()=>setMobileNav(true)
$('sidebarCloseBtn').onclick=()=>{
  if(window.matchMedia('(max-width:900px)').matches)setMobileNav(false)
  else setDesktopSidebar(!$('workspace').classList.contains('sidebar-collapsed'))
}
$('sidebarBackdrop').onclick=()=>setMobileNav(false)
document.addEventListener('keydown',e=>{if(e.key==='Escape')setMobileNav(false)})
window.addEventListener('resize',()=>{
  if(!window.matchMedia('(max-width:900px)').matches){
    $('workspace').classList.remove('nav-open')
    $('sidebarBackdrop').classList.add('hidden')
    document.documentElement.style.overflow=''
  }
})

function setFocusMode(on){
  $('workspace').classList.toggle('focus-mode',!!on)
  $('focusModeBtn').classList.toggle('active',!!on)
  $('focusModeBtn').textContent=on?'● Focus attivo':'◎ Focus'
  try{localStorage.setItem('maglia360_focus',on?'1':'0')}catch(_){}
}
$('focusModeBtn').onclick=()=>setFocusMode(!$('workspace').classList.contains('focus-mode'))

$('loginForm').onsubmit=async e=>{e.preventDefault();const{error}=await supabase.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(error)return msg(error.message,true);await boot()}
$('signupBtn').onclick=async()=>{const email=$('email').value.trim(),password=$('password').value;if(!email||password.length<8)return msg('Inserisci email e una password di almeno 8 caratteri.',true);const{data,error}=await supabase.auth.signUp({email,password});if(error)return msg(error.message,true);if(data.session)await boot();else msg('Account creato. Controlla la mail di conferma e poi accedi.')}

function setHeader(title,subtitle){$('pageTitle').textContent=title;$('pageSubtitle').textContent=subtitle}
function accessForView(view){
  if(isManager())return'manage'
  return roleViewAccess.find(x=>x.view_code===view&&x.active)?.access_level||'hidden'
}
function canOpenView(view){return accessForView(view)!=='hidden'}
function applyRoleViewAccess(){
  document.body.dataset.userRole=window.userRole||'viewer'
  document.querySelectorAll('[data-view]').forEach(b=>{
    const level=accessForView(b.dataset.view)
    b.classList.toggle('hidden',level==='hidden')
    b.dataset.accessLevel=level
  })
  const partnerAllowed=canOpenView('partners')
  const partnerGroup=$('partnerNav')?.closest('.nav-group')
  if(partnerGroup)partnerGroup.classList.toggle('hidden',!partnerAllowed)
  if(!canOpenView('liaWorkbench')){
    const workbench=$('liaWorkbenchView');if(workbench)workbench.classList.add('hidden')
  }
}
function navigate(view){
  if(!canOpenView(view)){
    if(view!=='home'&&canOpenView('home'))return navigate('home')
    return
  }
  currentPartnerId=null
  document.querySelectorAll('.view').forEach(v=>v.classList.add('hidden'))
  $(view+'View').classList.remove('hidden')
  document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view))
  document.querySelectorAll('[data-partner-id]').forEach(b=>b.classList.remove('active'))
  const m=viewMeta[view]||['Centro di Regia','']
  setHeader(m[0],m[1])
  setMobileNav(false)
  $('aiDock').classList.toggle('hidden',view==='home')
  if(view==='recovery')loadRecovery()
  window.scrollTo({top:0,behavior:'smooth'})
}
function openPartner(id){
  if(!canOpenView('partners'))return
  currentPartnerId=id
  document.querySelectorAll('.view').forEach(v=>v.classList.add('hidden'))
  $('partnerView').classList.remove('hidden')
  document.querySelectorAll('.nav-item').forEach(b=>b.classList.remove('active'))
  const btn=document.querySelector('[data-partner-id="'+id+'"]');if(btn)btn.classList.add('active')
  const n=ecosystem.find(x=>x.id===id);if(!n)return
  setHeader(n.name,n.capability+' · dossier relazione')
  showPartnerSection('overview')
  renderPartner()
  setMobileNav(false)
  $('aiDock').classList.remove('hidden')
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
$('addCepaContentBtn').onclick=openNewCepaContent
$('addCepaSpeakerBtn').onclick=openNewCepaSpeaker
$('addCollaboratorBtn').onclick=openNewCollaborator
$('newAssessmentBtn').onclick=()=>openAssessmentEditor(null)
$('newDistributionCandidateBtn').onclick=()=>openDistributionCandidateEditor(null)
$('distKindFilter').onchange=renderDistributionCandidates
$('distStageFilter').onchange=renderDistributionCandidates
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

function safeLiaFileName(name='file'){
  return String(name).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9._-]+/g,'_').replace(/^_+|_+$/g,'').slice(-120)||'file'
}
async function uploadLiaFiles(fileList){
  const files=[...(fileList||[])].slice(0,12)
  if(!files.length)return[]
  const uploaded=[]
  try{
    for(let i=0;i<files.length;i++){
      const file=files[i]
      if(file.size>26214400)throw new Error(file.name+': supera il limite di 25 MB')
      const path=window.orgId+'/'+window.userId+'/'+Date.now()+'-'+i+'-'+safeLiaFileName(file.name)
      const{error}=await supabase.storage.from('lia-workspace').upload(path,file,{contentType:file.type||undefined,upsert:false})
      if(error)throw error
      uploaded.push({path,name:file.name,mime_type:file.type||null,size_bytes:file.size})
    }
    return uploaded
  }catch(error){
    if(uploaded.length){
      try{await supabase.storage.from('lia-workspace').remove(uploaded.map(x=>x.path))}catch(_){}
    }
    throw error
  }
}
async function openLiaFile(fileId){
  const item=liaFiles.find(x=>x.id===fileId)
  if(!item)return
  const{data,error}=await supabase.storage.from(item.bucket_id||'lia-workspace').createSignedUrl(item.object_path,120)
  if(error)return alert(error.message)
  if(data?.signedUrl)window.open(data.signedUrl,'_blank','noopener')
}

$('liaWorkbenchForm').onsubmit=async e=>{
  e.preventDefault()
  const q=$('liaWorkbenchCommand').value.trim()
  const input=$('liaWorkbenchFiles')
  if(!q)return
  const box=$('liaWorkbenchResult')
  box.className='message'
  box.textContent='Lia sta preparando il lavoro…'
  try{
    const attachments=await uploadLiaFiles(input?.files)
    if(attachments.length)box.textContent='Allegati caricati in area privata. Lia sta creando l’ordine di lavoro…'
    const{data,error}=await supabase.functions.invoke('lia-workbench',{body:{organization_id:window.orgId,command:q,attachments}})
    if(error)throw error
    box.textContent=data?.message||'Operazione registrata.'
    box.className='message'+(data?.partial?' warning':'')
    if(input)input.value=''
    await loadAll()
  }catch(error){
    box.textContent='Operazione non completata: '+(error?.message||String(error))
    box.className='message error'
  }
}
document.querySelectorAll('[data-lia-example]').forEach(b=>b.onclick=()=>{
  $('liaWorkbenchCommand').value=b.dataset.liaExample
  $('liaWorkbenchCommand').focus()
})

async function boot(){
  const{data:{user}}=await supabase.auth.getUser()
  if(!user){$('loginView').classList.remove('hidden');$('workspace').classList.add('hidden');$('blockedView').classList.add('hidden');$('aiDock').classList.add('hidden');return}
  const{data:m,error}=await supabase.from('organization_memberships').select('organization_id,role').eq('user_id',user.id).eq('active',true).limit(1).maybeSingle()
  $('loginView').classList.add('hidden')
  if(error||!m){$('workspace').classList.add('hidden');$('blockedView').classList.remove('hidden');return}
  window.orgId=m.organization_id;window.userId=user.id;window.userRole=m.role;window.userEmail=user.email||''
  $('workspace').classList.remove('hidden');$('blockedView').classList.add('hidden');$('aiDock').classList.remove('hidden')
  setMobileNav(false)
  try{setFocusMode(localStorage.getItem('maglia360_focus')==='1')}catch(_){setFocusMode(false)}
  if(window.innerWidth>=1450)$('aiDockPanel').classList.remove('hidden')
  $('sideUser').textContent=user.email||'Utente';$('rolePill').textContent=m.role.replaceAll('_',' ')
  ;['newEntityBtn','addTimelineBtn','addContactBtn','addPartnerDocumentBtn','addDocumentBtn','addCepaSubjectBtn','addCepaInitiativeBtn','addCepaContentBtn','addCepaSpeakerBtn','addCollaboratorBtn','newAssessmentBtn','newDistributionCandidateBtn','editPartnerBtn'].forEach(id=>$(id).classList.toggle('hidden',!isManager()))
  await loadAll()
  $('aiDock').classList.add('hidden')
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
    supabase.from('partner_document_requirements').select('*,ecosystem_nodes(id,name,code),ecosystem_documents(id,title,document_status)').eq('organization_id',window.orgId).order('ecosystem_node_id').order('requirement_code'),
    supabase.from('document_blueprints').select('*').eq('organization_id',window.orgId).eq('status','ready').order('category').order('title'),
    supabase.from('cepa_subjects').select('*').eq('organization_id',window.orgId).order('maturity',{ascending:false}),
    supabase.from('cepa_initiatives').select('*,cepa_subjects(id,title),ecosystem_nodes(id,name,code)').eq('organization_id',window.orgId).order('created_at',{ascending:false}),
    supabase.from('cepa_content_assets').select('*,cepa_subjects(id,title)').eq('organization_id',window.orgId).order('created_at',{ascending:false}),
    supabase.from('cepa_academy_modules').select('*').eq('organization_id',window.orgId).order('sequence_no'),
    supabase.from('cepa_speakers').select('*').eq('organization_id',window.orgId).order('display_name'),
    supabase.from('agency_products').select('*,ecosystem_nodes(id,name,code)').eq('organization_id',window.orgId).eq('active',true).order('category').order('name'),
    supabase.from('product_knowledge_items').select('*').eq('organization_id',window.orgId).order('sort_order'),
    supabase.from('product_comparisons').select('*,agency_products(id,name,comparison_group)').eq('organization_id',window.orgId).order('created_at',{ascending:false}),
    supabase.from('agency_collaborators').select('*').eq('organization_id',window.orgId).eq('active',true).order('display_name'),
    supabase.from('collaborator_product_terms').select('*,agency_products(id,name),ecosystem_nodes(id,name,code)').eq('organization_id',window.orgId).order('created_at',{ascending:false}),
    supabase.from('collaborator_portfolio_snapshots').select('*,agency_collaborators(id,display_name,collaborator_type,area,territory,earning_model,status)').eq('organization_id',window.orgId).order('premium_total',{ascending:false}),
    supabase.from('collaborator_business_assessments').select('*,agency_collaborators(id,display_name)').eq('organization_id',window.orgId).order('assessment_date',{ascending:false}),
    supabase.from('collaborator_growth_kits').select('*').eq('organization_id',window.orgId).order('title'),
    supabase.from('distribution_research_watchlists').select('*,market_hubs(id,name,city)').eq('organization_id',window.orgId).order('name'),
    supabase.from('distribution_candidates').select('*,market_hubs(id,name,city)').eq('organization_id',window.orgId).order('updated_at',{ascending:false}),
    supabase.from('distribution_candidate_evidence').select('*').eq('organization_id',window.orgId).order('observed_at',{ascending:false}).limit(500),
    supabase.from('ai_mail_templates').select('*').eq('organization_id',window.orgId).eq('active',true).order('title'),
    supabase.from('ai_mail_drafts').select('*,ecosystem_nodes(id,name),ai_mail_templates(id,title)').eq('organization_id',window.orgId).order('created_at',{ascending:false}).limit(100),
    supabase.from('cepa_expansion_stages').select('*').eq('organization_id',window.orgId).order('stage_no'),
    supabase.from('cepa_readiness_items').select('*').eq('organization_id',window.orgId).order('dimension').order('title'),
    supabase.from('ai_assistant_messages').select('*').eq('organization_id',window.orgId).eq('user_id',window.userId).order('created_at').limit(30),
    supabase.from('organization_ai_capabilities').select('*').eq('organization_id',window.orgId).eq('role',window.userRole).eq('active',true).order('capability'),
    supabase.from('ai_workspace_folders').select('*').eq('organization_id',window.orgId).order('created_at',{ascending:false}).limit(100),
    supabase.from('ai_work_orders').select('*').eq('organization_id',window.orgId).order('created_at',{ascending:false}).limit(60),
    supabase.from('ai_work_order_files').select('*').eq('organization_id',window.orgId).order('created_at',{ascending:false}).limit(120),
    supabase.from('research_sources').select('*').eq('organization_id',window.orgId).eq('active',true).order('trust_level').order('name'),
    supabase.from('research_insights').select('*,research_sources(id,name,url)').eq('organization_id',window.orgId).order('updated_at',{ascending:false}).limit(100),
    supabase.from('ai_action_catalog').select('*').eq('organization_id',window.orgId).eq('active',true).order('risk_level').order('code'),
    supabase.from('ai_action_approvals').select('*').eq('organization_id',window.orgId).order('created_at',{ascending:false}).limit(100),
    supabase.from('organization_role_views').select('*').eq('organization_id',window.orgId).eq('role',window.userRole).eq('active',true).order('view_code'),
    supabase.from('ai_automation_runs').select('*,distribution_research_watchlists(id,name,cadence,market_hubs(id,name,city,province))').eq('organization_id',window.orgId).order('created_at',{ascending:false}).limit(100)
  ]
  const res=await Promise.all(q)
  const err=res.find(x=>x.error)?.error
  if(err){console.error(err);$('refreshBtn').textContent='!';return}
  ;[ecosystem,projects,actions,marketHubs,marketEntities,contacts,timeline,documents,partnerRequirements,blueprints,subjects,initiatives,cepaContent,cepaAcademy,cepaSpeakers,products,productKnowledge,comparisons,collaborators,collaboratorTerms,portfolioSnapshots,businessAssessments,growthKits,distributionWatchlists,distributionCandidates,distributionEvidence,mailTemplates,mailDrafts,cepaExpansion,cepaReadiness,assistantMessages,liaCapabilities,liaFolders,liaOrders,liaFiles,researchSources,researchInsights,liaActionRules,liaApprovals,roleViewAccess,liaAutomationRuns]=res.map(x=>x.data||[])
  renderEverything()
  $('refreshBtn').textContent='↻'
}

function renderEverything(){
  renderPartnerNav();renderHome();renderPartner();renderProducts();renderCollaborators();renderGrowthKits();renderComparisons();renderMail();renderCepa();renderTerritories();renderDocuments();renderDevelopment();renderNetworkRadar();renderActions();renderAssistantHistory();renderLiaWorkbench();applyRoleViewAccess()
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
  const dash=$('magliaDashboard')
  if(!dash)return

  const partnerShort=n=>{
    if(n.code==='HDI')return 'HDI'
    if(n.code==='PRIMA_ENEA')return 'PRIMA'
    if(n.code==='SLP')return 'SLP'
    if(n.code==='AGLEA')return 'AGLEA'
    if(n.code==='CIP')return 'CIP'
    return (n.code||n.name||'M').slice(0,6)
  }
  const partnerLabel=n=>{
    if(n.code==='HDI')return 'Compagnia madre'
    if(n.code==='PRIMA_ENEA')return 'Partner strategico'
    return 'Partner'
  }
  const displayName=p=>{
    const n=p.name||''
    if(/auto|motor/i.test(n))return 'Auto'
    if(/casa/i.test(n))return 'Casa'
    if(/salute/i.test(n))return 'Salute'
    if(/previd/i.test(n))return 'Previdenza'
    if(/tutela/i.test(n))return 'Tutela Legale'
    if(/energia/i.test(n))return 'Energia'
    if(/impresa/i.test(n))return 'Impresa'
    return n
  }

  const relationSolid=ecosystem.filter(n=>['core','active','project_active'].includes(n.relationship_status)).length
  const verifiedProducts=productKnowledge.filter(x=>x.verification_status==='verified').length
  const missingDocs=partnerRequirements.filter(x=>x.status==='missing').length
  const pendingTerms=collaboratorTerms.filter(x=>x.verification_status!=='verified').length
  const cepaReady=cepaReadiness.filter(x=>['ready','verified'].includes(x.status)).length
  const termsVerified=collaboratorTerms.filter(x=>x.verification_status==='verified').length
  const partnerCovered=partnerRequirements.filter(x=>['received','verified','not_applicable'].includes(x.status)).length
  const open=actions.filter(a=>!['completed','cancelled'].includes(a.status)).sort(actionSort)

  dash.data={
    partners:ecosystem.slice(0,5).map(n=>({
      id:n.id,code:n.code,name:n.name,short:partnerShort(n),label:partnerLabel(n),
      subtitle:n.capability||n.strategic_role||'Competenza da definire'
    })),
    products:products.slice(0,6).map(p=>({
      id:p.id,name:p.name,label:displayName(p),category:p.category,
      shortSummary:p.summary||p.category||'Scheda in sviluppo'
    })),
    collaborators:(isManager()?portfolioSnapshots
      .filter(s=>s.agency_collaborators?.collaborator_type!=='agency_central')
      .slice(0,5)
      .map(s=>{
        const c=s.agency_collaborators||{}
        return {
          id:c.id||s.collaborator_id,
          name:c.display_name||'Rete',
          territory:c.territory||c.area||'Territorio da definire',
          detail:(s.clients_count||0)+' clienti · '+(s.policies_count||0)+' polizze',
          terms:c.earning_model==='da_verificare'?'Da verificare':String(c.earning_model||'Da definire').replaceAll('_',' '),
          status:c.status==='active'?'Attivo':String(c.status||'').replaceAll('_',' '),
          value:'€ '+Number(s.premium_total||0).toLocaleString('it-IT',{maximumFractionDigits:0})
        }
      })
      :collaborators
        .filter(c=>c.collaborator_type!=='agency_central')
        .slice(0,5)
        .map(c=>({
          id:c.id,name:c.display_name||'Rete',
          territory:c.territory||c.area||'Territorio da definire',
          detail:c.role_description||String(c.collaborator_type||'Collaboratore').replaceAll('_',' '),
          terms:'Supporto ruolo',
          status:c.status==='active'?'Attivo':String(c.status||'').replaceAll('_',' '),
          value:'Dati riservati'
        }))),
    benchmark:{
      solid:[
        relationSolid+' relazioni ecosistema attive/core',
        cepaReady+' elementi CEPA pronti/verificati',
        portfolioSnapshots.length+' snapshot rete disponibili'
      ],
      improve:[
        missingDocs+' requisiti partner non ancora registrati',
        pendingTerms+' condizioni economiche da verificare',
        verifiedProducts+'/'+productKnowledge.length+' elementi prodotto verificati'
      ]
    },
    metrics:{
      docs:documents.length,
      market:marketEntities.length+distributionCandidates.length,
      knowledge:verifiedProducts+'/'+productKnowledge.length,
      terms:termsVerified+'/'+collaboratorTerms.length,
      partnerDocs:partnerCovered+'/'+partnerRequirements.length,
      cepa:cepaReady+'/'+cepaReadiness.length
    },
    cepa:{steps:['Centro CEPA','Sportelli SAP','Mandello','Lecco','Italia']},
    actions:open.slice(0,6).map(a=>({
      id:a.id,title:a.title,
      detail:(a.ecosystem_nodes?.name||a.market_entities?.name||a.strategic_projects?.title||laneLabel(a.lane))+(a.due_at?' · '+fmtDate(a.due_at):''),
      priority:a.priority
    })),
    radar:{
      official:distributionCandidates.filter(x=>x.source_provider==='IVASS RUI').length,
      pendingReview:distributionCandidates.filter(x=>x.source_provider==='IVASS RUI'&&x.review_status==='pending').length,
      contactApproved:distributionCandidates.filter(x=>x.contact_policy_status==='approved_for_contact').length,
      discovered:distributionCandidates.filter(x=>x.stage==='discovered').length
    },
    approvals:liaApprovals.filter(x=>x.status==='pending').slice(0,4).map(x=>({
      id:x.id,
      title:(liaActionRules.find(r=>r.code===x.action_code)?.title||x.action_code||'Approvazione'),
      detail:x.request_payload?.display_name||x.request_payload?.purpose||'Decisione amministrativa',
      status:x.status
    })),
    automations:liaAutomationRuns.slice(0,4).map(x=>({
      id:x.id,
      title:x.distribution_research_watchlists?.name||'Automazione Radar',
      detail:(x.distribution_research_watchlists?.market_hubs?.city||'Territorio')+(x.result_summary?' · '+x.result_summary:''),
      status:x.status
    })),
    workOrders:liaOrders.slice(0,4).map(x=>({
      id:x.id,
      title:String(x.action_type||'Lavoro Lia').replaceAll('_',' '),
      detail:x.result_summary||x.prompt||'Ordine operativo registrato',
      status:x.status
    })),
    insights:researchInsights.slice(0,4).map(x=>({
      id:x.id,title:x.title,
      detail:(x.research_sources?.name?x.research_sources.name+' · ':'')+(x.application_hypothesis||x.insight_summary||'')
    })),
    system:{
      sources:researchSources.length,
      insights:researchInsights.length,
      folders:liaFolders.length,
      orders:liaOrders.length,
      automations:liaAutomationRuns.length
    },
    user:{label:window.userEmail||'Area riservata',role:(window.userRole||'').replaceAll('_',' ')}
  }

  if(!dash.dataset.bound){
    dash.dataset.bound='1'
    dash.addEventListener('navigate',e=>navigate(e.detail.view))
    dash.addEventListener('open-partner',e=>openPartner(e.detail.id))
    dash.addEventListener('open-product',e=>openProduct(e.detail.id))
    dash.addEventListener('open-collaborator',e=>openCollaborator(e.detail.id))
    dash.addEventListener('open-action',e=>openAction(e.detail.id))
    dash.addEventListener('ask-assistant',e=>askAssistant(e.detail.prompt))
  }
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
  const rr=partnerRequirements.filter(x=>x.ecosystem_node_id===n.id)
  const covered=rr.filter(x=>['received','verified','not_applicable'].includes(x.status)).length
  $('partnerDocCoverage').textContent=rr.length?covered+'/'+rr.length+' coperti':'nessun requisito'
  $('partnerDocRequirements').innerHTML=rr.map(x=>'<div class="requirement-row"><div><strong>'+esc(x.title)+'</strong><small>'+esc(x.verification_note||'')+(x.ecosystem_documents?.title?' · Collegato: '+esc(x.ecosystem_documents.title):'')+(x.due_date?' · entro '+esc(fmtDate(x.due_date)):'')+'</small></div><div class="requirement-actions"><span class="req-status '+esc(x.status)+'">'+esc(x.status.replaceAll('_',' '))+'</span>'+(isManager()?'<button class="small-btn" type="button" data-requirement-edit="'+x.id+'">Aggiorna</button>':'')+'</div></div>').join('')||empty('Checklist documentale non ancora impostata')
  document.querySelectorAll('[data-requirement-edit]').forEach(b=>b.onclick=()=>openRequirementEditor(b.dataset.requirementEdit))

  const linkedProducts=products.filter(p=>p.ecosystem_node_id===n.id)
  $('partnerOperationalProducts').innerHTML=linkedProducts.map(p=>{
    const kk=productKnowledge.filter(k=>k.product_id===p.id)
    const verified=kk.filter(k=>k.verification_status==='verified').length
    const trigger=kk.find(k=>k.item_type==='specialist_trigger')
    return '<button class="partner-op-row" type="button" data-partner-product="'+p.id+'"><div><strong>'+esc(p.name)+'</strong><small>'+verified+'/'+kk.length+' elementi verificati · '+esc(p.maturity_status)+'</small>'+(trigger?'<small><b>Trigger:</b> '+esc(trigger.content)+'</small>':'<small>Trigger specialistico da definire.</small>')+'</div><span>Apri →</span></button>'
  }).join('')||empty('Nessuna scheda prodotto collegata')
  document.querySelectorAll('[data-partner-product]').forEach(b=>b.onclick=()=>openProduct(b.dataset.partnerProduct))

  $('partnerOpsCoverage').textContent=rr.length?Math.round((covered/rr.length)*100)+'%':'0%'
  const missing=rr.filter(x=>!['received','verified','not_applicable'].includes(x.status))
  $('partnerOpsDocuments').innerHTML=(missing.length?missing.slice(0,6).map(x=>'<div class="partner-op-row static"><div><strong>'+esc(x.title)+'</strong><small>'+esc(x.status.replaceAll('_',' '))+(x.due_date?' · '+esc(fmtDate(x.due_date)):'')+'</small></div><span class="req-status '+esc(x.status)+'">'+esc(x.status)+'</span></div>').join(''):'<div class="partner-op-ok">Dossier minimo coperto secondo gli stati registrati.</div>')

  const partnerProductIds=new Set(linkedProducts.map(p=>p.id))
  const tt=collaboratorTerms.filter(t=>t.ecosystem_node_id===n.id||partnerProductIds.has(t.product_id))
  const verifiedTerms=tt.filter(t=>t.verification_status==='verified')
  $('partnerOpsTerms').innerHTML=verifiedTerms.length?verifiedTerms.slice(0,6).map(t=>'<div class="partner-op-row static"><div><strong>'+esc(t.agency_products?.name||t.activity_scope||'Condizione')+'</strong><small>'+esc(t.earning_type)+(t.percentage!=null?' · '+esc(t.percentage)+'%':'')+(t.fixed_amount!=null?' · € '+Number(t.fixed_amount).toLocaleString('it-IT'):'')+'</small><small>Fonte: '+esc(t.source_reference||'documento collegato')+'</small></div><span class="verification-badge verified">verificato</span></div>').join(''):'<div class="partner-op-warning">Nessuna remunerazione prodotto-specifica verificata. Non vengono mostrati valori presunti.</div>'

  const aa=actions.filter(x=>x.ecosystem_node_id===n.id)
  const openAa=aa.filter(x=>!['completed','cancelled'].includes(x.status)).sort(actionSort)
  $('partnerOpsActions').innerHTML=openAa.slice(0,4).map(a=>'<button class="partner-op-row" type="button" data-op-action="'+a.id+'"><div><strong>'+esc(a.title)+'</strong><small>'+esc(actionStatus(a.status))+(a.due_at?' · '+esc(fmtDate(a.due_at)):'')+'</small></div><span>'+esc(a.priority)+'</span></button>').join('')||'<div class="partner-op-ok">Nessuna attività aperta collegata.</div>'
  document.querySelectorAll('[data-op-action]').forEach(b=>b.onclick=()=>openAction(b.dataset.opAction))
  if($('partnerAskLiaBtn'))$('partnerAskLiaBtn').onclick=()=>{ $('aiDock').classList.remove('hidden');$('aiDockPanel').classList.remove('hidden');askAssistant('Quadro operativo di '+n.name+': cosa sappiamo, cosa manca e qual è il prossimo passo?') }

  const pp=projects.filter(x=>x.ecosystem_node_id===n.id)
  $('partnerProjects').innerHTML=pp.map(p=>listRow(p.title,p.objective||'', [projectStatus(p.status),p.priority,p.next_action||'prossima azione da definire'])).join('')||empty('Nessun progetto collegato')
  $('partnerActions').innerHTML=aa.map(actionRow).join('')||empty('Nessuna attività collegata')
  bindActionButtons()
}

function openRequirementEditor(id){
  if(!isManager())return
  const r=partnerRequirements.find(x=>x.id===id);if(!r)return
  const partner=ecosystem.find(x=>x.id===r.ecosystem_node_id)
  const partnerDocs=documents.filter(d=>d.ecosystem_node_id===r.ecosystem_node_id)
  $('modalContent').innerHTML='<div class="eyebrow">DOSSIER COLLABORAZIONE</div><h2>'+esc(partner?.name||'Partner')+'</h2><p class="muted">'+esc(r.title)+'</p><form id="requirementForm" class="form"><div class="inline"><label>Stato<select id="reqStatus"><option value="missing">Mancante in piattaforma</option><option value="requested">Richiesto</option><option value="received">Ricevuto</option><option value="verified">Verificato</option><option value="not_applicable">Non applicabile</option></select></label><label>Scadenza / follow-up<input id="reqDue" type="date" value="'+esc(r.due_date||'')+'"></label></div><label>Documento collegato<select id="reqDocument"><option value="">Nessun documento collegato</option>'+partnerDocs.map(d=>'<option value="'+d.id+'">'+esc(d.title)+' · '+esc(d.document_status)+'</option>').join('')+'</select></label><label>Nota di verifica<textarea id="reqNote">'+esc(r.verification_note||'')+'</textarea></label><p class="form-note">Per marcare “Verificato” occorre collegare un documento registrato nel dossier.</p><div class="composer-actions"><button class="secondary" type="button" id="reqCancel">Annulla</button><button class="primary" type="submit">Salva</button></div></form>'
  $('reqStatus').value=r.status
  $('reqDocument').value=r.fulfilled_document_id||''
  $('reqCancel').onclick=()=>{closeModal();renderPartner()}
  $('requirementForm').onsubmit=async e=>{
    e.preventDefault()
    const row={status:$('reqStatus').value,due_date:$('reqDue').value||null,fulfilled_document_id:$('reqDocument').value||null,verification_note:$('reqNote').value.trim()||null,updated_at:new Date().toISOString()}
    const{error}=await supabase.from('partner_document_requirements').update(row).eq('id',id).eq('organization_id',window.orgId)
    if(error)return alert(error.message)
    closeModal();await loadAll();renderPartner()
  }
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

  $('cepaAcademyCount').textContent=cepaAcademy.length+' moduli'
  $('cepaAcademyList').innerHTML=cepaAcademy.map(m=>'<div class="academy-item '+(isManager()?'clickable':'')+'" '+(isManager()?'data-academy="'+m.id+'"':'')+'><div><span class="academy-seq">'+esc(m.sequence_no)+'</span><strong>'+esc(m.title)+'</strong><small>'+esc(m.description||'')+'</small><small>'+esc((m.audience||[]).join(', '))+(m.estimated_minutes?' · '+esc(m.estimated_minutes)+' min':'')+'</small></div><span class="readiness-status '+(m.status==='ready'||m.status==='published'?'ready':'in_progress')+'">'+esc(m.status)+'</span></div>').join('')||empty('Nessun modulo Academy')
  document.querySelectorAll('[data-academy]').forEach(b=>b.onclick=()=>openAcademyEditor(b.dataset.academy))

  $('cepaContentList').innerHTML=cepaContent.map(a=>'<div class="content-asset-row"><div><strong>'+esc(a.title)+'</strong><small>'+esc(a.asset_type)+' · '+esc(a.lifecycle_status)+(a.cepa_subjects?.title?' · '+esc(a.cepa_subjects.title):'')+'</small></div><span class="tag">'+esc((a.channels||[]).join(', ')||'canale da definire')+'</span></div>').join('')||empty('Nessun contenuto ancora registrato')

  $('cepaSpeakerList').innerHTML=cepaSpeakers.map(s=>'<div class="speaker-row"><div><strong>'+esc(s.display_name)+'</strong><small>'+esc(s.role_title||'Ruolo da definire')+(s.organization_name?' · '+esc(s.organization_name):'')+'</small><small>'+esc((s.expertise||[]).join(', ')||'Competenze da indicare')+'</small></div><span class="readiness-status '+(s.status==='active'||s.status==='approved'?'ready':'in_progress')+'">'+esc(s.status)+'</span></div>').join('')||empty('Nessun relatore ancora registrato')

  $('cepaRoadmap').innerHTML=cepaExpansion.map(s=>'<article class="roadmap-step '+(s.status==='current'?'current':'')+'"><span class="step-no">'+esc(s.stage_no)+'</span><h4>'+esc(s.title)+'</h4><p><strong>'+esc(s.territory)+'</strong></p><p>'+esc(s.objective||'')+'</p><div class="tags"><span class="tag">'+esc(s.status)+'</span></div></article>').join('')||empty('Roadmap nazionale da costruire')
  const ready=cepaReadiness.filter(x=>['ready','verified'].includes(x.status)).length
  $('cepaReadinessSummary').textContent=ready+'/'+cepaReadiness.length+' elementi pronti/verificati'
  $('cepaReadinessGrid').innerHTML=cepaReadiness.map(x=>'<article class="readiness-card '+(isManager()?'clickable':'')+'" '+(isManager()?'data-readiness="'+x.id+'"':'')+'><div class="readiness-top"><div class="eyebrow">'+esc(x.dimension)+'</div><span class="readiness-status '+esc(x.status)+'">'+esc(x.status.replaceAll('_',' '))+'</span></div><h4>'+esc(x.title)+'</h4><p>'+esc(x.description||'')+'</p><p><strong>Livello:</strong> '+esc(x.requirement_level.replaceAll('_',' '))+'</p>'+(x.evidence?'<p><strong>Evidenza:</strong> '+esc(x.evidence)+'</p>':'')+(x.source_reference?'<p><strong>Fonte:</strong> '+esc(x.source_reference)+'</p>':'')+'</article>').join('')||empty('Readiness nazionale da definire')
  document.querySelectorAll('[data-readiness]').forEach(b=>b.onclick=()=>openReadinessEditor(b.dataset.readiness))
}

function openNewCepaContent(){
  if(!isManager())return
  $('modalContent').innerHTML='<div class="eyebrow">CEPA CONTENT FACTORY</div><h2>Nuovo contenuto</h2><form id="cepaContentForm" class="form"><label>Titolo<input id="ccTitle" required></label><div class="inline"><label>Materia<select id="ccSubject"><option value="">Generale CEPA</option>'+subjects.map(s=>'<option value="'+s.id+'">'+esc(s.title)+'</option>').join('')+'</select></label><label>Tipo<select id="ccType"><option value="presentation">Presentazione</option><option value="guide">Guida</option><option value="article">Articolo</option><option value="video">Video</option><option value="faq">FAQ</option><option value="newsletter">Newsletter</option><option value="social">Social</option><option value="webinar">Webinar</option><option value="event_kit">Kit evento</option><option value="course_material">Materiale Academy</option><option value="other">Altro</option></select></label></div><div class="inline"><label>Stato<select id="ccStatus"><option value="idea">Idea</option><option value="draft">Bozza</option><option value="review">Revisione</option><option value="ready">Pronto</option><option value="published">Pubblicato</option></select></label><label>Versione<input id="ccVersion" placeholder="es. 1.0"></label></div><label>Obiettivo<textarea id="ccObjective"></textarea></label><label>Target, separati da virgola<input id="ccAudience"></label><label>Canali, separati da virgola<input id="ccChannels" placeholder="evento, web, social, newsletter"></label><label>Fonte / base scientifica<input id="ccSource"></label><label>URL pubblico<input id="ccUrl"></label><div class="composer-actions"><button class="secondary" type="button" id="ccCancel">Annulla</button><button class="primary" type="submit">Salva contenuto</button></div></form>'
  $('modal').classList.remove('hidden')
  $('ccCancel').onclick=closeModal
  $('cepaContentForm').onsubmit=async e=>{
    e.preventDefault()
    const split=v=>v.split(',').map(x=>x.trim()).filter(Boolean)
    const row={organization_id:window.orgId,subject_id:$('ccSubject').value||null,title:$('ccTitle').value.trim(),asset_type:$('ccType').value,lifecycle_status:$('ccStatus').value,audience:split($('ccAudience').value),channels:split($('ccChannels').value),objective:$('ccObjective').value.trim()||null,version:$('ccVersion').value.trim()||null,source_reference:$('ccSource').value.trim()||null,public_url:$('ccUrl').value.trim()||null,owner_user_id:window.userId}
    const{error}=await supabase.from('cepa_content_assets').insert(row)
    if(error)return alert(error.message)
    closeModal();await loadAll();navigate('cepa')
  }
}

function openNewCepaSpeaker(){
  if(!isManager())return
  $('modalContent').innerHTML='<div class="eyebrow">RELATORI CEPA</div><h2>Nuovo relatore / candidato</h2><form id="cepaSpeakerForm" class="form"><label>Nome<input id="spName" required></label><div class="inline"><label>Organizzazione<input id="spOrg"></label><label>Ruolo<input id="spRole"></label></div><label>Competenze, separate da virgola<input id="spExpertise"></label><label>Territori, separati da virgola<input id="spTerritories"></label><label>Stato<select id="spStatus"><option value="candidate">Candidato</option><option value="approved">Approvato</option><option value="active">Attivo</option><option value="paused">In pausa</option></select></label><label>Bio<textarea id="spBio"></textarea></label><div class="inline"><label>Email<input id="spEmail" type="email"></label><label>Telefono<input id="spPhone"></label></div><label>Fonte / riferimento<input id="spSource"></label><label>Note<textarea id="spNotes"></textarea></label><div class="composer-actions"><button class="secondary" type="button" id="spCancel">Annulla</button><button class="primary" type="submit">Salva relatore</button></div></form>'
  $('modal').classList.remove('hidden')
  $('spCancel').onclick=closeModal
  $('cepaSpeakerForm').onsubmit=async e=>{
    e.preventDefault()
    const split=v=>v.split(',').map(x=>x.trim()).filter(Boolean)
    const row={organization_id:window.orgId,display_name:$('spName').value.trim(),organization_name:$('spOrg').value.trim()||null,role_title:$('spRole').value.trim()||null,expertise:split($('spExpertise').value),territories:split($('spTerritories').value),status:$('spStatus').value,bio:$('spBio').value.trim()||null,email:$('spEmail').value.trim()||null,phone:$('spPhone').value.trim()||null,source_reference:$('spSource').value.trim()||null,notes:$('spNotes').value.trim()||null}
    const{error}=await supabase.from('cepa_speakers').insert(row)
    if(error)return alert(error.message)
    closeModal();await loadAll();navigate('cepa')
  }
}

function openAcademyEditor(id){
  if(!isManager())return
  const m=cepaAcademy.find(x=>x.id===id);if(!m)return
  $('modalContent').innerHTML='<div class="eyebrow">ACADEMY CEPA</div><h2>'+esc(m.title)+'</h2><p class="muted">'+esc(m.description||'')+'</p><form id="academyForm" class="form"><div class="inline"><label>Stato<select id="academyStatus"><option value="draft">Bozza</option><option value="review">Revisione</option><option value="ready">Pronto</option><option value="published">Pubblicato</option><option value="retired">Ritirato</option></select></label><label>Durata minuti<input id="academyMinutes" type="number" min="1" value="'+esc(m.estimated_minutes||'')+'"></label></div><label>Descrizione<textarea id="academyDescription">'+esc(m.description||'')+'</textarea></label><label>Fonte / riferimento<input id="academySource" value="'+esc(m.source_reference||'')+'"></label><div class="composer-actions"><button class="secondary" type="button" id="academyCancel">Annulla</button><button class="primary" type="submit">Salva modulo</button></div></form>'
  $('academyStatus').value=m.status
  $('academyCancel').onclick=closeModal
  $('academyForm').onsubmit=async e=>{
    e.preventDefault()
    const row={status:$('academyStatus').value,estimated_minutes:$('academyMinutes').value?Number($('academyMinutes').value):null,description:$('academyDescription').value.trim()||null,source_reference:$('academySource').value.trim()||null,updated_at:new Date().toISOString()}
    const{error}=await supabase.from('cepa_academy_modules').update(row).eq('id',id).eq('organization_id',window.orgId)
    if(error)return alert(error.message)
    closeModal();await loadAll();navigate('cepa')
  }
}

function openReadinessEditor(id){
  if(!isManager())return
  const x=cepaReadiness.find(r=>r.id===id);if(!x)return
  $('modalContent').innerHTML='<div class="eyebrow">CEPA NATIONAL READINESS</div><h2>'+esc(x.title)+'</h2><p class="muted">'+esc(x.dimension)+' · '+esc(x.requirement_level.replaceAll('_',' '))+'</p><form id="readinessForm" class="form"><div class="inline"><label>Stato<select id="readyStatus"><option value="to_do">Da fare</option><option value="in_progress">In corso</option><option value="ready">Pronto</option><option value="verified">Verificato</option><option value="blocked">Bloccato</option></select></label><label>Priorità<select id="readyPriority"><option value="low">Bassa</option><option value="normal">Normale</option><option value="high">Alta</option><option value="urgent">Urgente</option></select></label></div><label>Evidenza<textarea id="readyEvidence">'+esc(x.evidence||'')+'</textarea></label><label>Fonte / riferimento<input id="readySource" value="'+esc(x.source_reference||'')+'"></label><p class="form-note">“Verificato” richiede un’evidenza concreta. Una slide ottimista non è un’evidenza, purtroppo per metà dei consigli di amministrazione.</p><div class="composer-actions"><button class="secondary" type="button" id="readyCancel">Annulla</button><button class="primary" type="submit">Salva</button></div></form>'
  $('readyStatus').value=x.status
  $('readyPriority').value=x.priority
  $('readyCancel').onclick=closeModal
  $('readinessForm').onsubmit=async e=>{
    e.preventDefault()
    const row={status:$('readyStatus').value,priority:$('readyPriority').value,evidence:$('readyEvidence').value.trim()||null,source_reference:$('readySource').value.trim()||null,updated_at:new Date().toISOString()}
    const{error}=await supabase.from('cepa_readiness_items').update(row).eq('id',id).eq('organization_id',window.orgId)
    if(error)return alert(error.message)
    closeModal();await loadAll();navigate('cepa')
  }
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
  const knowledge=productKnowledge.filter(k=>k.product_id===id)
  const sources=knowledge.filter(k=>k.verification_status==='verified'&&(k.source_reference||k.source_url))
  const triggers=knowledge.filter(k=>k.item_type==='specialist_trigger')
  const limits=knowledge.filter(k=>['limit','exclusion'].includes(k.item_type))
  const strengths=(p.strengths||[])
  const weaknesses=(p.weaknesses||[])
  const block=(title,items,emptyText)=>'<div class="product-focus-block"><h4>'+title+'</h4>'+(items.length?items.map(k=>'<div class="knowledge-item '+(k.verification_status==='verified'?'verified-item':'')+'"><strong>'+esc(k.title)+'</strong><small>'+esc(k.content||'')+'</small>'+(k.source_reference||k.source_url?'<small><b>Fonte:</b> '+esc(k.source_reference||k.source_url)+'</small>':'')+'<span class="verification-badge '+(k.verification_status==='verified'?'verified':'')+'">'+esc(k.verification_status.replaceAll('_',' '))+'</span></div>').join(''):'<p class="muted">'+emptyText+'</p>')+'</div>'
  $('modalContent').innerHTML='<div class="eyebrow">SCHEDA PRODOTTO 360</div><h2>'+esc(p.name)+'</h2><p class="muted">'+esc(provider)+' · '+esc(p.category)+' · '+esc(p.maturity_status)+'</p>'+
    '<div class="product-route"><div>Bisogno</div><div>Fonte</div><div>Limiti</div><div>Trigger specialista</div><div>Confronto</div></div>'+
    '<div class="prose-box"><p><strong>Sintesi</strong><br>'+esc(p.summary||'Da completare')+'</p><p><strong>Target</strong><br>'+esc((p.audience||[]).join(', ')||'Da definire')+'</p><p><strong>Processo</strong><br>'+esc(p.process_notes||'Da ricostruire sul processo reale di agenzia.')+'</p></div>'+
    '<div class="product-focus-grid">'+block('Fonti verificate',sources,'Nessuna fonte verificata registrata.')+block('Specialist trigger',triggers,'Trigger da definire e validare sul processo reale.')+block('Limiti / esclusioni',limits,'Da estrarre esclusivamente dalla documentazione vigente.')+'</div>'+
    '<div class="strength-weak-grid"><div class="sw-box strength"><h4>Punti di forza documentati</h4>'+(strengths.length?'<ul>'+strengths.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':'<p class="muted">Non ancora consolidati da documentazione.</p>')+'</div><div class="sw-box weak"><h4>Punti deboli / limiti documentati</h4>'+(weaknesses.length?'<ul>'+weaknesses.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':'<p class="muted">Non ancora consolidati da documentazione.</p>')+'</div></div>'+
    '<div class="modal-section"><h4>Confronti</h4>'+(pc.length?pc.map(c=>'<div class="comparison-inline"><strong>'+esc(c.benchmark_name)+'</strong><span>'+esc(c.status)+(c.confidence!=null?' · confidenza '+esc(c.confidence)+'%':'')+(c.source_date?' · '+esc(fmtDate(c.source_date)):'')+'</span><small>'+esc(c.comparison_scope||'')+'</small>'+(c.notes?'<small>'+esc(c.notes)+'</small>':'')+'</div>').join(''):'<p class="muted">Nessun confronto registrato. Nessun ranking viene generato senza fonti omogenee.</p>')+'</div>'+
    '<details class="modal-section"><summary>Checklist completa ('+knowledge.length+')</summary><div class="knowledge-list">'+(knowledge.length?knowledge.map(k=>'<div class="knowledge-item"><strong>'+esc(k.title)+'</strong><small>'+esc(k.content||'')+'</small><div class="inline-actions"><span class="tag">'+esc(k.verification_status)+'</span>'+(isManager()?'<button class="small-btn" type="button" data-knowledge-edit="'+k.id+'">Modifica</button>':'')+'</div></div>').join(''):'<p class="muted">Checklist non ancora impostata.</p>')+'</div></details>'
  $('modal').classList.remove('hidden')
  document.querySelectorAll('[data-knowledge-edit]').forEach(b=>b.onclick=()=>openKnowledgeEditor(b.dataset.knowledgeEdit,id))
}

function openKnowledgeEditor(itemId,productId){
  if(!isManager())return
  const k=productKnowledge.find(x=>x.id===itemId);if(!k)return
  const p=products.find(x=>x.id===productId)
  $('modalContent').innerHTML='<div class="eyebrow">CONOSCENZA PRODOTTO</div><h2>'+esc(p?.name||'Prodotto')+'</h2><p class="muted">'+esc(k.item_type)+' · '+esc(k.title)+'</p><form id="knowledgeForm" class="form"><label>Titolo<input id="knTitle" value="'+esc(k.title)+'"></label><label>Contenuto<textarea id="knContent">'+esc(k.content||'')+'</textarea></label><div class="inline"><label>Stato<select id="knStatus"><option value="to_verify">Da verificare</option><option value="verified">Verificato</option><option value="superseded">Superato</option></select></label><label>Data fonte<input id="knSourceDate" type="date" value="'+esc(k.source_date||'')+'"></label></div><label>Riferimento fonte<input id="knSourceReference" value="'+esc(k.source_reference||'')+'" placeholder="es. Set informativo HDI, versione/data"></label><label>URL fonte pubblica<input id="knSourceUrl" value="'+esc(k.source_url||'')+'" placeholder="https://..."></label><p class="form-note">Per impostare “Verificato” è obbligatorio indicare almeno una fonte. Il database lo impedisce anche se qualcuno prova a fare il furbo con il pulsante.</p><div class="composer-actions"><button class="secondary" type="button" id="knCancel">Annulla</button><button class="primary" type="submit">Salva</button></div></form>'
  $('knStatus').value=k.verification_status
  $('knCancel').onclick=()=>openProduct(productId)
  $('knowledgeForm').onsubmit=async e=>{
    e.preventDefault()
    const row={title:$('knTitle').value.trim(),content:$('knContent').value.trim()||null,verification_status:$('knStatus').value,source_reference:$('knSourceReference').value.trim()||null,source_url:$('knSourceUrl').value.trim()||null,source_date:$('knSourceDate').value||null,updated_at:new Date().toISOString()}
    const{error}=await supabase.from('product_knowledge_items').update(row).eq('id',itemId).eq('organization_id',window.orgId)
    if(error)return alert(error.message)
    await loadAll();openProduct(productId)
  }
}

function renderCollaborators(){
  const financial=isManager()
  $('collabCount').textContent=collaborators.length
  $('collabVerified').textContent=collaborators.filter(c=>c.status==='active').length
  $('collabTermsCount').textContent=financial?collaboratorTerms.length:'—'
  $('collabTermsPending').textContent=financial?collaboratorTerms.filter(t=>t.verification_status!=='verified').length:'—'
  $('collaboratorList').innerHTML=collaborators.map(c=>{
    const terms=financial?collaboratorTerms.filter(t=>t.collaborator_id===c.id):[]
    const economic=financial
      ?'<div><span class="money-status">'+esc(c.earning_model||'da verificare')+'</span><small>'+esc(c.earning_notes||'')+'</small></div><div><strong>'+terms.length+' condizioni collegate</strong><small>'+terms.filter(t=>t.verification_status!=='verified').length+' da verificare</small></div>'
      :'<div><span class="money-status restricted">Economico riservato</span><small>Visibile alla direzione</small></div><div><strong>Supporto per ruolo</strong><small>Territorio, competenze e strumenti</small></div>'
    return '<div class="collab-row"><div><strong>'+esc(c.display_name)+'</strong><small>'+esc(c.role_description||c.collaborator_type)+'</small></div><div><strong>'+esc(c.area||'Da definire')+'</strong><small>'+esc(c.territory||'Territorio da verificare')+'</small></div>'+economic+'<button class="small-btn" data-collaborator="'+c.id+'">Apri</button></div>'
  }).join('')||empty('Nessun collaboratore censito')
  document.querySelectorAll('[data-collaborator]').forEach(b=>b.onclick=()=>openCollaborator(b.dataset.collaborator))
  $('portfolioSnapshotGrid').innerHTML=financial
    ?(portfolioSnapshots.map(s=>{
      const c=s.agency_collaborators||{}
      const ratio=s.clients_count?Number(s.policies_count/s.clients_count).toFixed(2):'—'
      const avg=s.clients_count&&s.premium_total!=null?Math.round(Number(s.premium_total)/s.clients_count):null
      const mix=Object.entries(s.portfolio_mix||{}).slice(0,7)
      return '<article class="portfolio-card '+(c.collaborator_type==='agency_central'?'central':'')+'"><div class="eyebrow">'+esc(c.collaborator_type==='agency_central'?'AGENZIA CENTRALE':'PRODUTTORE')+'</div><h4>'+esc(c.display_name||'Rete')+'</h4><div class="portfolio-metrics"><div><strong>'+esc(s.clients_count)+'</strong><span>clienti</span></div><div><strong>'+esc(s.policies_count)+'</strong><span>polizze</span></div><div><strong>'+esc(ratio)+'</strong><span>polizze/cliente</span></div></div><p>Premi analizzati: <strong>€ '+Number(s.premium_total||0).toLocaleString('it-IT',{maximumFractionDigits:0})+'</strong>'+(avg!=null?' · medio cliente € '+avg.toLocaleString('it-IT'):'')+'</p><p>Modello: '+esc(s.commercial_model||'da definire')+'</p><div class="portfolio-mix">'+mix.map(([k,v])=>'<span>'+esc(k)+': '+esc(typeof v==='object'?JSON.stringify(v):v)+'</span>').join('')+'</div></article>'
    }).join('')||empty('Snapshot rete non disponibile'))
    :'<div class="restricted-panel"><strong>Dati economici riservati</strong><p>Portafoglio, premi, remunerazioni e valutazioni sono disponibili ai ruoli di direzione. Questa vista mantiene rete, territorio e strumenti utili al lavoro del profilo corrente.</p></div>'
}

function openCollaborator(id){
  const c=collaborators.find(x=>x.id===id);if(!c)return
  const financial=isManager()
  const terms=financial?collaboratorTerms.filter(t=>t.collaborator_id===id):[]
  const assessment=businessAssessments.filter(a=>a.collaborator_id===id).sort((a,b)=>String(b.assessment_date).localeCompare(String(a.assessment_date)))[0]
  const score=assessment?avgAssessment(assessment):null
  $('modalContent').innerHTML='<div class="eyebrow">COLLABORATORE 360</div><h2>'+esc(c.display_name)+'</h2><p class="muted">'+esc(c.area||'Area da definire')+' · '+esc(c.territory||'Territorio da verificare')+'</p>'+
    '<div class="collab-360-grid"><div class="prose-box"><p><strong>Ruolo</strong><br>'+esc(c.role_description||'Da completare')+'</p>'+(financial?'<p><strong>Modello guadagno generale</strong><br>'+esc(c.earning_model||'Da verificare')+'</p><p><strong>Note economiche</strong><br>'+esc(c.earning_notes||'Nessuna condizione economica verificata inserita.')+'</p>':'<p><strong>Dati economici</strong><br>Riservati ai ruoli di direzione.</p>')+'</div>'+
    '<div class="assessment-summary"><span>Valutazione 360</span><strong>'+(score!=null?esc(score)+'/100':'—')+'</strong><small>'+(assessment?esc(assessment.status)+' · '+esc(fmtDate(assessment.assessment_date)):'Nessuna valutazione registrata')+'</small>'+(assessment?.proposal_direction?'<p>'+esc(assessment.proposal_direction)+'</p>':'')+'</div></div>'+
    '<div class="modal-section"><div class="modal-section-head"><h4>Condizioni per prodotto / collaborazione</h4>'+(isManager()?'<button class="primary" type="button" id="addTermBtn">+ Condizione</button>':'')+'</div>'+
    (terms.length?terms.map(t=>'<div class="term-row"><div><strong>'+esc(t.agency_products?.name||t.ecosystem_nodes?.name||t.activity_scope||'Ambito')+'</strong><small>'+esc(t.earning_type)+' · '+esc(t.verification_status)+(t.percentage!=null?' · '+esc(t.percentage)+'%':'')+(t.fixed_amount!=null?' · € '+Number(t.fixed_amount).toLocaleString('it-IT'):'')+(t.bonus_rule?' · '+esc(t.bonus_rule):'')+'</small>'+(t.source_reference?'<small><b>Fonte:</b> '+esc(t.source_reference)+'</small>':'<small>Fonte economica non registrata.</small>')+'</div><span class="verification-badge '+(t.verification_status==='verified'?'verified':'')+'">'+esc(t.verification_status.replaceAll('_',' '))+'</span>'+(isManager()?'<button class="small-btn" type="button" data-term-edit="'+t.id+'">Modifica</button>':'')+'</div>').join(''):'<p class="muted">Nessuna condizione caricata. Le percentuali non vengono stimate: servono accordi, estratti o regole interne verificabili.</p>')+'</div>'
  $('modal').classList.remove('hidden')
  if(isManager()){
    if($('addTermBtn'))$('addTermBtn').onclick=()=>openTermEditor(id,null)
    document.querySelectorAll('[data-term-edit]').forEach(b=>b.onclick=()=>openTermEditor(id,b.dataset.termEdit))
  }
}

function openTermEditor(collaboratorId,termId=null){
  if(!isManager())return
  const c=collaborators.find(x=>x.id===collaboratorId);if(!c)return
  const t=termId?collaboratorTerms.find(x=>x.id===termId):null
  const docOptions=documents.map(d=>'<option value="'+d.id+'">'+esc((d.ecosystem_nodes?.name?d.ecosystem_nodes.name+' · ':'')+d.title)+'</option>').join('')
  $('modalContent').innerHTML='<div class="eyebrow">CONDIZIONE ECONOMICA</div><h2>'+esc(c.display_name)+'</h2><form id="termForm" class="form"><div class="inline"><label>Prodotto<select id="termProduct"><option value="">Nessun prodotto specifico</option>'+products.map(p=>'<option value="'+p.id+'">'+esc(p.name)+'</option>').join('')+'</select></label><label>Compagnia / partner<select id="termPartner"><option value="">Nessuna</option>'+ecosystem.map(n=>'<option value="'+n.id+'">'+esc(n.name)+'</option>').join('')+'</select></label></div><label>Ambito attività<input id="termScope" placeholder="es. acquisizione, gestione, rinnovi, sviluppo"></label><div class="inline"><label>Tipo guadagno<select id="termType"><option value="to_verify">Da verificare</option><option value="percentage">Percentuale</option><option value="fixed">Fisso</option><option value="bonus">Bonus</option><option value="mixed">Misto</option><option value="none">Nessun compenso diretto</option></select></label><label>Stato verifica<select id="termVerification"><option value="to_verify">Da verificare</option><option value="verified">Verificato</option><option value="expired">Scaduto</option></select></label></div><div class="inline"><label>Percentuale %<input id="termPercentage" type="number" step="0.0001" min="0"></label><label>Importo fisso €<input id="termFixed" type="number" step="0.01" min="0"></label></div><label>Regola bonus<textarea id="termBonus"></textarea></label><div class="inline"><label>Valida dal<input id="termFrom" type="date"></label><label>Valida fino al<input id="termTo" type="date"></label></div><label>Documento fonte<select id="termSourceDoc"><option value="">Nessun documento collegato</option>'+docOptions+'</select></label><label>Riferimento fonte<input id="termSourceRef" placeholder="es. lettera incarico / prospetto provvigionale 2026"></label><label>Note<textarea id="termNotes"></textarea></label><p class="form-note">Una condizione può diventare “Verificata” solo se è collegata a un documento o a un riferimento fonte.</p><div class="composer-actions"><button class="secondary" type="button" id="termCancel">Annulla</button><button class="primary" type="submit">Salva</button></div></form>'
  if(t){
    $('termProduct').value=t.product_id||''
    $('termPartner').value=t.ecosystem_node_id||''
    $('termScope').value=t.activity_scope||''
    $('termType').value=t.earning_type||'to_verify'
    $('termVerification').value=t.verification_status||'to_verify'
    $('termPercentage').value=t.percentage??''
    $('termFixed').value=t.fixed_amount??''
    $('termBonus').value=t.bonus_rule||''
    $('termFrom').value=t.valid_from||''
    $('termTo').value=t.valid_to||''
    $('termSourceDoc').value=t.source_document_id||''
    $('termSourceRef').value=t.source_reference||''
    $('termNotes').value=t.notes||''
  }
  $('termCancel').onclick=()=>openCollaborator(collaboratorId)
  $('termForm').onsubmit=async e=>{
    e.preventDefault()
    const row={organization_id:window.orgId,collaborator_id:collaboratorId,product_id:$('termProduct').value||null,ecosystem_node_id:$('termPartner').value||null,activity_scope:$('termScope').value.trim()||null,earning_type:$('termType').value,percentage:$('termPercentage').value?Number($('termPercentage').value):null,fixed_amount:$('termFixed').value?Number($('termFixed').value):null,bonus_rule:$('termBonus').value.trim()||null,valid_from:$('termFrom').value||null,valid_to:$('termTo').value||null,verification_status:$('termVerification').value,source_document_id:$('termSourceDoc').value||null,source_reference:$('termSourceRef').value.trim()||null,notes:$('termNotes').value.trim()||null,updated_at:new Date().toISOString()}
    const q=termId?supabase.from('collaborator_product_terms').update(row).eq('id',termId).eq('organization_id',window.orgId):supabase.from('collaborator_product_terms').insert(row)
    const{error}=await q
    if(error)return alert(error.message)
    await loadAll();openCollaborator(collaboratorId)
  }
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


function avgAssessment(a){
  const vals=['relationship_quality','portfolio_depth','development_potential','advisory_readiness','local_network_strength','digital_readiness','compliance_readiness'].map(k=>a[k]).filter(v=>v!=null)
  return vals.length?Math.round(vals.reduce((x,y)=>x+Number(y),0)/vals.length):null
}
function renderGrowthKits(){
  $('growthKitCount').textContent=growthKits.length
  $('assessmentCount').textContent=businessAssessments.length
  $('assessmentCollabCount').textContent=new Set(businessAssessments.map(a=>a.collaborator_id)).size
  $('growthKitReady').textContent=growthKits.filter(k=>k.status==='ready').length
  $('assessmentList').innerHTML=businessAssessments.map(a=>listRow(a.agency_collaborators?.display_name||'Collaboratore',a.proposal_direction||a.client_base_profile||'Valutazione da completare',[a.status,a.assessment_date,'indice '+(avgAssessment(a)??'—')+'/100'])).join('')||empty('Nessuna valutazione ancora registrata')
  $('growthKitGrid').innerHTML=growthKits.map(k=>'<article class="growth-kit-card" data-growth-kit="'+k.id+'"><div class="eyebrow">'+esc(k.use_case.replaceAll('_',' '))+'</div><h3>'+esc(k.title)+'</h3><p>'+esc(k.objective||'')+'</p><div class="tags">'+(k.recommended_areas||[]).slice(0,6).map(x=>'<span class="tag">'+esc(x)+'</span>').join('')+'</div><div class="kit-footer"><span>'+esc(k.status)+'</span><b>Apri →</b></div></article>').join('')||empty('Nessun kit operativo')
  document.querySelectorAll('[data-growth-kit]').forEach(b=>b.onclick=()=>openGrowthKit(b.dataset.growthKit))

  const clientTools=blueprints.filter(b=>b.category==='client_tools')
  const toolIcon=code=>code==='TABLE_BUSINESS_RISK'?'▦':code==='TABLE_FAMILY_360'?'◎':code==='TABLE_90_DAY_PLAN'?'90':code==='TABLE_RISK_PROTECTION'?'→':'▣'
  $('clientToolBlueprints').innerHTML=clientTools.map(b=>{
    const outline=Array.isArray(b.outline)?b.outline:(b.outline?.sections||[])
    return '<article class="client-tool-card" data-client-tool="'+b.id+'"><div class="client-tool-visual"><span>'+esc(toolIcon(b.code))+'</span><div class="client-tool-lines">'+outline.slice(0,5).map(()=>'<i></i>').join('')+'</div></div><div><div class="eyebrow">A4 / A3</div><h4>'+esc(b.title)+'</h4><p>'+esc(b.intended_use||'')+'</p><small>'+esc(outline.slice(0,4).join(' · '))+'</small></div><b>Apri anteprima →</b></article>'
  }).join('')||empty('Nessuna grafica cliente pronta')
  document.querySelectorAll('[data-client-tool]').forEach(b=>b.onclick=()=>openBlueprint(b.dataset.clientTool))
}
function openGrowthKit(id){
  const k=growthKits.find(x=>x.id===id);if(!k)return
  const block=(title,arr)=>'<div class="kit-block"><h4>'+title+'</h4><ul>'+((arr||[]).length?(arr||[]).map(x=>'<li>'+esc(x)+'</li>').join(''):'<li>Da completare</li>')+'</ul></div>'
  $('modalContent').innerHTML='<div class="eyebrow">KIT OPERATIVO</div><h2>'+esc(k.title)+'</h2><p class="muted">'+esc(k.objective||'')+'</p><div class="prose-box"><p><strong>Come aprire la conversazione</strong><br>'+esc(k.opening_script||'Da definire')+'</p><p><strong>Follow-up</strong><br>'+esc(k.follow_up_process||'Da definire')+'</p></div><div class="kit-block-grid">'+block('Domande utili',k.need_questions)+block('Documentazione',k.required_documents)+block('Da consegnare al cliente',k.client_deliverables)+block('Grafiche / supporti',k.visual_aids)+'</div><div class="prose-box"><p><strong>Nota compliance</strong><br>'+esc(k.compliance_notes||'')+'</p><p><strong>Fonte metodo</strong><br>'+esc(k.source_reference||'')+'</p></div>'
  $('modal').classList.remove('hidden')
}
function openAssessmentEditor(id=null){
  if(!isManager())return
  const a=id?businessAssessments.find(x=>x.id===id):null
  $('modalContent').innerHTML='<div class="eyebrow">VALUTAZIONE COLLABORATORE</div><h2>Fotografia Business 360</h2><form id="assessmentForm" class="form"><label>Collaboratore<select id="assCollaborator" required><option value="">Seleziona</option>'+collaborators.map(c=>'<option value="'+c.id+'">'+esc(c.display_name)+'</option>').join('')+'</select></label><div class="inline"><label>Periodo<input id="assPeriod" placeholder="es. 2026 YTD"></label><label>Stato<select id="assStatus"><option value="draft">Bozza</option><option value="review">Revisione</option><option value="validated">Validata</option></select></label></div><div class="score-form-grid">'+['relationship_quality|Qualità relazione','portfolio_depth|Profondità portafoglio','development_potential|Potenziale sviluppo','advisory_readiness|Prontezza consulenziale','local_network_strength|Forza rete locale','digital_readiness|Prontezza digitale','compliance_readiness|Prontezza compliance'].map(x=>{const [k,l]=x.split('|');return '<label>'+l+'<input id="ass_'+k+'" type="number" min="0" max="100"></label>'}).join('')+'</div><label>Modello di business<textarea id="assBusiness"></textarea></label><label>Profilo clientela<textarea id="assClients"></textarea></label><label>Punti di forza, separati da ;<textarea id="assStrengths"></textarea></label><label>Gap, separati da ;<textarea id="assGaps"></textarea></label><label>Direzione proposta<textarea id="assDirection"></textarea></label><label>Evidenza / fonte<input id="assEvidence"></label><p class="form-note">L’indice è una sintesi descrittiva interna delle dimensioni valutate, non una previsione di vendita.</p><button class="primary" type="submit">Salva valutazione</button></form>'
  $('modal').classList.remove('hidden')
  if(a){
    $('assCollaborator').value=a.collaborator_id;$('assPeriod').value=a.period_label||'';$('assStatus').value=a.status
    for(const k of ['relationship_quality','portfolio_depth','development_potential','advisory_readiness','local_network_strength','digital_readiness','compliance_readiness'])$('ass_'+k).value=a[k]??''
    $('assBusiness').value=a.business_model||'';$('assClients').value=a.client_base_profile||'';$('assStrengths').value=(a.strengths||[]).join('; ');$('assGaps').value=(a.gaps||[]).join('; ');$('assDirection').value=a.proposal_direction||'';$('assEvidence').value=a.evidence_reference||''
  }
  $('assessmentForm').onsubmit=async e=>{
    e.preventDefault()
    const arr=v=>v.split(';').map(x=>x.trim()).filter(Boolean)
    const row={organization_id:window.orgId,collaborator_id:$('assCollaborator').value,period_label:$('assPeriod').value.trim()||null,status:$('assStatus').value,business_model:$('assBusiness').value.trim()||null,client_base_profile:$('assClients').value.trim()||null,strengths:arr($('assStrengths').value),gaps:arr($('assGaps').value),proposal_direction:$('assDirection').value.trim()||null,evidence_reference:$('assEvidence').value.trim()||null,created_by:window.userId,updated_at:new Date().toISOString()}
    for(const k of ['relationship_quality','portfolio_depth','development_potential','advisory_readiness','local_network_strength','digital_readiness','compliance_readiness'])row[k]=$('ass_'+k).value?Number($('ass_'+k).value):null
    const q=id?supabase.from('collaborator_business_assessments').update(row).eq('id',id).eq('organization_id',window.orgId):supabase.from('collaborator_business_assessments').insert(row)
    const{error}=await q;if(error)return alert(error.message);closeModal();await loadAll();navigate('growthKits')
  }
}

function renderNetworkRadar(){
  $('distCandidateCount').textContent=distributionCandidates.length
  $('distBCount').textContent=distributionCandidates.filter(x=>x.rui_section==='B'||x.candidate_kind==='rui_b').length
  $('distECount').textContent=distributionCandidates.filter(x=>x.rui_section==='E'||x.candidate_kind==='rui_e').length
  $('distActiveCount').textContent=distributionCandidates.filter(x=>['qualified','contact_planned','contacted','meeting','proposal','relationship','sap_candidate'].includes(x.stage)).length
  $('distributionWatchlists').innerHTML=distributionWatchlists.map(w=>'<article class="watch-card"><div class="eyebrow">'+esc(w.market_hubs?.city||'TERRITORIO')+'</div><h3>'+esc(w.name)+'</h3><p>Fonti: '+esc((w.source_types||[]).join(' · '))+'</p><p>RUI: '+esc((w.rui_sections||[]).join(', ')||'—')+' · Province: '+esc((w.provinces||[]).join(', ')||'—')+'</p><div class="ring-row">'+(w.rings_km||[]).map(r=>'<span>'+esc(r)+' km</span>').join('')+'</div><small>'+esc(w.notes||'')+'</small></article>').join('')||empty('Nessuna watchlist')
  renderDistributionCandidates()
}
function candidateFit(c){
  const vals=['territory_fit','network_fit','service_fit','reachability_score'].map(k=>c[k]).filter(v=>v!=null)
  return vals.length?Math.round(vals.reduce((a,b)=>a+Number(b),0)/vals.length):null
}
function renderDistributionCandidates(){
  const kind=$('distKindFilter').value,stage=$('distStageFilter').value
  const rows=distributionCandidates.filter(c=>(!kind||c.candidate_kind===kind)&&(!stage||c.stage===stage))
  $('distributionCandidateBody').innerHTML=rows.map(c=>{
    const official=c.source_provider==='IVASS RUI'
    const source='<span class="source-cell">'+esc(c.source_provider)+(official?'<b class="official-source-badge">ufficiale</b>':'')+'</span>'
    const lock=c.contact_restricted?'<span class="contact-lock">contatto bloccato</span>':'<span class="contact-open">contatto autorizzato</span>'
    const review='<span class="review-state '+esc(c.review_status||'pending')+'">'+esc(c.review_status||'pending')+'</span>'
    return '<tr><td><span class="name">'+esc(c.display_name)+'</span><span class="tiny">'+esc(c.candidate_kind.replaceAll('_',' '))+'</span></td><td>'+source+'<span class="tiny">'+review+' · '+lock+'</span></td><td>'+esc(c.rui_number||c.vat_number||'—')+'</td><td>'+esc([c.city,c.province].filter(Boolean).join(' · ')||'—')+'</td><td>'+scoreHtml(candidateFit(c))+'</td><td>'+scoreHtml(c.evidence_confidence)+'</td><td><span class="stage '+esc(c.stage)+'">'+esc(c.stage.replaceAll('_',' '))+'</span></td><td>'+(isManager()?'<button class="small-btn" data-dist-candidate="'+c.id+'">Apri</button>':'')+'</td></tr>'
  }).join('')||'<tr><td colspan="8">'+empty('Nessun candidato ancora importato. La struttura è pronta per il primo ingest IVASS/Registro Imprese.')+'</td></tr>'
  document.querySelectorAll('[data-dist-candidate]').forEach(b=>b.onclick=()=>openDistributionCandidateEditor(b.dataset.distCandidate))
}
function openDistributionCandidateEditor(id=null){
  if(!isManager())return
  const c=id?distributionCandidates.find(x=>x.id===id):null
  $('modalContent').innerHTML='<div class="eyebrow">RADAR RETE</div><h2>'+(c?'Qualifica candidato':'Nuovo candidato')+'</h2><form id="distCandidateForm" class="form"><div class="inline"><label>Tipo<select id="dcKind"><option value="rui_b">RUI B</option><option value="rui_e">RUI E</option><option value="rui_a">RUI A</option><option value="rui_f">RUI F</option><option value="company">Impresa</option><option value="professional">Professionista</option><option value="sap_candidate">Candidato SAP</option><option value="other">Altro</option></select></label><label>Persona / società<select id="dcEntity"><option value="person">Persona</option><option value="company">Società</option><option value="organization">Organizzazione</option></select></label></div><label>Nome / ragione sociale<input id="dcName" required></label><div class="inline"><label>Sezione RUI<input id="dcSection" maxlength="2"></label><label>Numero RUI<input id="dcRui"></label></div><div class="inline"><label>P.IVA<input id="dcVat"></label><label>REA<input id="dcRea"></label></div><div class="inline"><label>Comune<input id="dcCity"></label><label>Provincia<input id="dcProvince"></label></div><label>Intermediario di riferimento<input id="dcParent"></label><label>Sito<input id="dcWebsite"></label><div class="inline"><label>Email professionale pubblica<input id="dcEmail" type="email"></label><label>Telefono professionale pubblico<input id="dcPhone"></label></div><div class="inline"><label>Fonte<select id="dcSource"><option value="IVASS RUI">IVASS RUI</option><option value="Registro Imprese">Registro Imprese</option><option value="Sito pubblico">Sito pubblico</option><option value="Altro">Altro</option></select></label><label>Stato<select id="dcStage"><option value="discovered">Scoperto</option><option value="reviewed">Rivisto</option><option value="qualified">Qualificato</option><option value="contact_planned">Contatto pianificato</option><option value="contacted">Contattato</option><option value="meeting">Incontro</option><option value="proposal">Proposta</option><option value="relationship">Relazione</option><option value="sap_candidate">SAP</option><option value="archived">Archiviato</option></select></label></div><div class="score-form-grid"><label>Fit territorio<input id="dcTerritoryFit" type="number" min="0" max="100"></label><label>Fit rete<input id="dcNetworkFit" type="number" min="0" max="100"></label><label>Fit servizi<input id="dcServiceFit" type="number" min="0" max="100"></label><label>Raggiungibilità<input id="dcReach" type="number" min="0" max="100"></label><label>Confidenza evidenze<input id="dcConfidence" type="number" min="0" max="100"></label></div><label>Fonte URL<input id="dcSourceUrl"></label><label>Nota qualificazione<textarea id="dcNote"></textarea></label><label>Prossima azione<input id="dcNext"></label><div id="dcGovernance" class="candidate-governance"></div><p class="form-note">Usare solo dati professionali/pubblici pertinenti. Nessun contatto automatico: prima revisione umana, poi autorizzazione esplicita al contatto.</p><button class="primary" type="submit">Salva candidato</button></form>'
  $('modal').classList.remove('hidden')
  if(c){
    const set=(id,v)=>{$(id).value=v??''};set('dcKind',c.candidate_kind);set('dcEntity',c.entity_type);set('dcName',c.display_name);set('dcSection',c.rui_section);set('dcRui',c.rui_number);set('dcVat',c.vat_number);set('dcRea',c.rea_number);set('dcCity',c.city);set('dcProvince',c.province);set('dcParent',c.parent_intermediary_name);set('dcWebsite',c.website);set('dcEmail',c.public_email);set('dcPhone',c.public_phone);set('dcSource',c.source_provider);set('dcStage',c.stage);set('dcTerritoryFit',c.territory_fit);set('dcNetworkFit',c.network_fit);set('dcServiceFit',c.service_fit);set('dcReach',c.reachability_score);set('dcConfidence',c.evidence_confidence);set('dcSourceUrl',c.source_url);set('dcNote',c.qualification_note);set('dcNext',c.next_action)
    const reviewDone=c.review_status==='reviewed'
    const contactApproved=!c.contact_restricted&&c.contact_policy_status==='approved_for_contact'
    $('dcGovernance').innerHTML='<div><strong>Revisione</strong><span>'+esc(c.review_status||'pending')+'</span></div><div><strong>Contatto</strong><span>'+esc(c.contact_policy_status||'blocked_pending_review')+'</span></div>'+
      (!reviewDone?'<button type="button" class="secondary" id="dcReviewBtn">Conferma revisione commerciale</button>':'')+
      (reviewDone&&!contactApproved?'<button type="button" class="secondary" id="dcContactApprovalBtn">Richiedi autorizzazione contatto</button>':'')+
      (contactApproved?'<span class="contact-open">Contatto autorizzato</span>':'')
    const reviewBtn=$('dcReviewBtn');if(reviewBtn)reviewBtn.onclick=()=>reviewDistributionCandidate(c.id)
    const contactBtn=$('dcContactApprovalBtn');if(contactBtn)contactBtn.onclick=()=>requestDistributionContactApproval(c.id)
  }else{
    $('dcGovernance').innerHTML='<div><strong>Nuovo candidato</strong><span>Il contatto resterà bloccato fino a revisione e approvazione.</span></div>'
  }
  $('distCandidateForm').onsubmit=async e=>{
    e.preventDefault()
    const val=id=>$(id).value.trim()||null,num=id=>$(id).value?Number($(id).value):null
    const desiredStage=$('dcStage').value
    const contactStages=['contact_planned','contacted','meeting','proposal','relationship']
    if(c&&contactStages.includes(desiredStage)&&c.contact_restricted){
      return alert('Il contatto è ancora bloccato. Completa la revisione e ottieni prima l’autorizzazione al contatto.')
    }
    const row={organization_id:window.orgId,candidate_kind:$('dcKind').value,entity_type:$('dcEntity').value,display_name:$('dcName').value.trim(),rui_section:val('dcSection'),rui_number:val('dcRui'),vat_number:val('dcVat'),rea_number:val('dcRea'),city:val('dcCity'),province:val('dcProvince'),parent_intermediary_name:val('dcParent'),website:val('dcWebsite'),public_email:val('dcEmail'),public_phone:val('dcPhone'),source_provider:$('dcSource').value,source_url:val('dcSourceUrl'),stage:desiredStage,territory_fit:num('dcTerritoryFit'),network_fit:num('dcNetworkFit'),service_fit:num('dcServiceFit'),reachability_score:num('dcReach'),evidence_confidence:num('dcConfidence'),qualification_note:val('dcNote'),next_action:val('dcNext'),last_verified_at:new Date().toISOString(),updated_at:new Date().toISOString(),source_record_key:val('dcRui')||val('dcVat')||$('dcName').value.trim().toLowerCase().replace(/\s+/g,'-')}
    const q=id?supabase.from('distribution_candidates').update(row).eq('id',id).eq('organization_id',window.orgId):supabase.from('distribution_candidates').insert(row)
    const{error}=await q;if(error)return alert(error.message);closeModal();await loadAll();navigate('networkRadar')
  }
}

async function reviewDistributionCandidate(id){
  if(!isManager())return
  const c=distributionCandidates.find(x=>x.id===id);if(!c)return
  const{error}=await supabase.from('distribution_candidates').update({
    review_status:'reviewed',
    reviewed_at:new Date().toISOString(),
    stage:c.stage==='discovered'?'reviewed':c.stage,
    contact_restricted:true,
    contact_policy_status:'approval_required_before_contact',
    updated_at:new Date().toISOString()
  }).eq('id',id).eq('organization_id',window.orgId)
  if(error)return alert(error.message)
  closeModal();await loadAll();openDistributionCandidateEditor(id)
}

async function requestDistributionContactApproval(id){
  if(!isManager())return
  const c=distributionCandidates.find(x=>x.id===id);if(!c)return
  if(c.review_status!=='reviewed')return alert('Completa prima la revisione commerciale.')
  const existing=liaApprovals.find(a=>a.action_code==='external.business_contact'&&a.status==='pending'&&a.request_payload?.candidate_id===id)
  if(existing)return alert('Esiste già una richiesta di approvazione in attesa.')
  const{error}=await supabase.from('ai_action_approvals').insert({
    organization_id:window.orgId,
    action_code:'external.business_contact',
    requested_by:window.userId,
    status:'pending',
    request_payload:{
      candidate_id:id,
      display_name:c.display_name,
      rui_number:c.rui_number||null,
      source_provider:c.source_provider,
      purpose:'abilitazione pianificazione contatto commerciale'
    },
    expires_at:new Date(Date.now()+7*24*60*60*1000).toISOString()
  })
  if(error)return alert(error.message)
  closeModal();await loadAll();openDistributionCandidateEditor(id)
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

async function runLiaAutomation(id){
  const run=liaAutomationRuns.find(x=>x.id===id)
  if(!run)return
  const box=$('liaWorkbenchResult')
  if(box){box.className='message';box.textContent='Lia sta eseguendo la ricerca programmata…'}
  try{
    const{data,error}=await supabase.functions.invoke('lia-workbench',{body:{organization_id:window.orgId,automation_run_id:id}})
    if(error)throw error
    if(box){box.textContent=data?.message||'Automazione aggiornata.';box.className='message'+(data?.action==='automation_queued'?' warning':'')}
    await loadAll()
  }catch(error){
    if(box){box.textContent='Automazione non completata: '+(error?.message||String(error));box.className='message error'}
  }
}

async function decideLiaApproval(id,status){
  if(!isManager())return alert('Decisione non autorizzata per questo ruolo.')
  const row=liaApprovals.find(x=>x.id===id)
  if(!row||row.status!=='pending')return
  const note=status==='approved'
    ? 'Approvazione amministrativa registrata. L’esecuzione esterna resta separata finché il relativo connettore non è attivo.'
    : 'Richiesta rifiutata dall’amministratore.'
  const{error}=await supabase.from('ai_action_approvals').update({
    status,approved_by:window.userId,decision_note:note,
    decided_at:new Date().toISOString(),updated_at:new Date().toISOString()
  }).eq('id',id).eq('organization_id',window.orgId).eq('status','pending')
  if(error)return alert(error.message)
  if(status==='approved'&&row.action_code==='external.business_contact'&&row.request_payload?.candidate_id){
    const{error:candidateError}=await supabase.from('distribution_candidates').update({
      contact_restricted:false,
      contact_policy_status:'approved_for_contact',
      updated_at:new Date().toISOString()
    }).eq('id',row.request_payload.candidate_id).eq('organization_id',window.orgId)
    if(candidateError)return alert(candidateError.message)
  }
  await loadAll()
}

function renderLiaWorkbench(){
  if(!$('liaCapabilityList'))return
  const levelLabel={admin:'Amministrazione ed esecuzione',execute:'Esecuzione autorizzata',prepare:'Preparazione e proposta',support:'Supporto al ruolo'}
  $('liaRoleMode').textContent=(window.userRole||'viewer').replaceAll('_',' ')+' · '+(isManager()?'esecuzione operativa':'supporto per ruolo')
  $('liaCapabilityList').innerHTML=liaCapabilities.map(c=>
    '<div class="lia-capability-row"><div><strong>'+esc(c.capability.replaceAll('.',' · '))+'</strong><small>'+esc(levelLabel[c.permission_level]||c.permission_level)+'</small></div><span class="lia-level '+esc(c.permission_level)+'">'+esc(c.permission_level)+'</span></div>'
  ).join('')||empty('Nessuna capacità assegnata')

  $('liaFolderList').innerHTML=liaFolders.map(f=>{
    const city=f.scope?.city?' · '+esc(f.scope.city):''
    return '<div class="lia-work-row"><div><strong>'+esc(f.name)+'</strong><small>'+esc(f.folder_type)+city+'</small></div><span>'+esc(fmtDateTime(f.created_at))+'</span></div>'
  }).join('')||empty('Nessuna cartella di lavoro')

  $('liaOrderList').innerHTML=liaOrders.map(o=>{
    const files=liaFiles.filter(f=>f.work_order_id===o.id)
    const fileHtml=files.length?'<div class="lia-file-links">'+files.map(f=>'<button type="button" data-lia-file="'+f.id+'">'+esc(f.original_name)+'</button>').join('')+'</div>':''
    return '<div class="lia-work-row"><div><strong>'+esc(o.action_type.replaceAll('_',' '))+'</strong><small>'+esc(o.result_summary||o.prompt)+'</small>'+fileHtml+'</div><span class="lia-order-status '+esc(o.status)+'">'+esc(o.status)+'</span></div>'
  }).join('')||empty('Nessun ordine operativo')
  document.querySelectorAll('[data-lia-file]').forEach(b=>b.onclick=()=>openLiaFile(b.dataset.liaFile))

  const queuedRuns=liaAutomationRuns.filter(r=>r.status==='queued').length
  $('liaAutomationCount').textContent=queuedRuns+' in coda'
  $('liaAutomationList').innerHTML=liaAutomationRuns.map(r=>{
    const w=r.distribution_research_watchlists||{}
    const city=w.market_hubs?.city||'Territorio'
    const canRun=isManager()&&['failed','partial'].includes(r.status)
    const button=canRun?'<button type="button" class="small-btn" data-lia-automation="'+r.id+'">Rimetti in coda</button>':(r.status==='queued'?'<span class="automation-waiting">in attesa worker</span>':'')
    return '<div class="lia-automation-row"><div><strong>'+esc(w.name||'Automazione Radar')+'</strong><small>'+esc(city)+' · '+esc(w.cadence||'')+' · '+esc(fmtDateTime(r.scheduled_for))+'</small><p>'+esc(r.result_summary||'In attesa del motore di ricerca.')+'</p></div><div><span class="lia-order-status '+esc(r.status)+'">'+esc(r.status)+'</span>'+button+'</div></div>'
  }).join('')||empty('Nessuna automazione Radar')
  document.querySelectorAll('[data-lia-automation]').forEach(b=>b.onclick=()=>runLiaAutomation(b.dataset.liaAutomation))

  const trustLabel={primary:'Primaria',official:'Ufficiale',secondary:'Secondaria',discovery_only:'Discovery'}
  $('liaSourceList').innerHTML=researchSources.map(src=>
    '<article class="lia-source-card"><div><strong>'+esc(src.name)+'</strong><small>'+esc(src.source_type.replaceAll('_',' '))+' · '+esc(src.access_mode.replaceAll('_',' '))+'</small></div><span class="source-trust '+esc(src.trust_level)+'">'+esc(trustLabel[src.trust_level]||src.trust_level)+'</span><p>'+esc(src.use_case||'Fonte di lavoro')+'</p></article>'
  ).join('')||empty('Nessuna fonte registrata')

  $('liaInsightCount').textContent=researchInsights.length+' insight'
  $('liaInsightList').innerHTML=researchInsights.map(i=>
    '<article class="lia-insight-card"><div class="lia-insight-top"><div><strong>'+esc(i.title)+'</strong><small>'+esc(i.category.replaceAll('_',' '))+(i.research_sources?.name?' · '+esc(i.research_sources.name):'')+'</small></div><span class="insight-confidence '+esc(i.confidence)+'">'+esc(i.confidence)+'</span></div><p>'+esc(i.insight_summary)+'</p><div class="lia-application"><b>Applicazione Maglia 360</b><span>'+esc(i.application_hypothesis||'Da definire')+'</span></div></article>'
  ).join('')||empty('Nessun insight metodologico registrato')

  const policyLabel={auto:'Esegue',prepare:'Prepara',approval_required:'Approva prima',blocked:'Bloccato'}
  $('liaActionRuleCount').textContent=liaActionRules.length+' regole'
  $('liaActionCatalog').innerHTML=liaActionRules.map(r=>
    '<div class="lia-policy-row"><div><strong>'+esc(r.title)+'</strong><small>'+esc(r.capability)+' · rischio '+esc(r.risk_level)+'</small></div><span class="lia-policy '+esc(r.execution_policy)+'">'+esc(policyLabel[r.execution_policy]||r.execution_policy)+'</span></div>'
  ).join('')||empty('Nessuna regola di autonomia')

  const pending=liaApprovals.filter(a=>a.status==='pending').length
  $('liaApprovalCount').textContent=pending+' in attesa'
  $('liaApprovalList').innerHTML=liaApprovals.map(a=>{
    const rule=liaActionRules.find(r=>r.code===a.action_code)
    const canDecide=isManager()&&a.status==='pending'
    const actions=canDecide?'<div class="lia-approval-actions"><button type="button" data-lia-approve="'+a.id+'">Approva</button><button type="button" data-lia-reject="'+a.id+'">Rifiuta</button></div>':''
    return '<div class="lia-work-row approval"><div><strong>'+esc(rule?.title||a.action_code)+'</strong><small>'+esc(a.status)+' · '+esc(fmtDateTime(a.created_at))+'</small>'+actions+'</div><span class="lia-approval-status '+esc(a.status)+'">'+esc(a.status)+'</span></div>'
  }).join('')||empty('Nessuna richiesta di approvazione')
  document.querySelectorAll('[data-lia-approve]').forEach(b=>b.onclick=()=>decideLiaApproval(b.dataset.liaApprove,'approved'))
  document.querySelectorAll('[data-lia-reject]').forEach(b=>b.onclick=()=>decideLiaApproval(b.dataset.liaReject,'rejected'))
}

function renderMail(){
  $('mailTemplateList').innerHTML=mailTemplates.map(t=>'<div class="template-card" data-mail-template="'+t.id+'"><h4>'+esc(t.title)+'</h4><p>'+esc(t.purpose)+' · '+esc(t.audience||'')+'</p></div>').join('')||empty('Nessun modello email')
  document.querySelectorAll('[data-mail-template]').forEach(b=>b.onclick=()=>{ $('mailTemplateSelect').value=b.dataset.mailTemplate; hydrateMailTemplate(); $('mailContext').focus() })
  const cur=$('mailTemplateSelect').value
  $('mailTemplateSelect').innerHTML='<option value="">Scegli un modello</option>'+mailTemplates.map(t=>'<option value="'+t.id+'">'+esc(t.title)+'</option>').join('')
  if(mailTemplates.some(t=>t.id===cur))$('mailTemplateSelect').value=cur
  $('mailPartnerSelect').innerHTML='<option value="">Generale</option>'+ecosystem.map(n=>'<option value="'+n.id+'">'+esc(n.name)+'</option>').join('')
  $('mailDraftList').innerHTML=mailDrafts.map(d=>{
    let action=''
    if(d.status==='draft')action='<button class="small-btn" data-mail-status="'+d.id+'" data-next-status="review">Invia in revisione</button>'
    else if(d.status==='review'&&isManager())action='<button class="small-btn" data-mail-status="'+d.id+'" data-next-status="approved">Approva</button>'
    else if(d.status==='approved')action='<span class="mail-safe-note">Approvata · nessun invio automatico</span>'
    return '<div class="mail-draft-row"><div><strong>'+esc(d.subject||d.purpose||'Bozza email')+'</strong><small>'+esc(d.recipient_name||d.recipient_email||'destinatario da definire')+(d.ecosystem_nodes?.name?' · '+esc(d.ecosystem_nodes.name):'')+'</small><small>'+esc(fmtDateTime(d.updated_at||d.created_at))+'</small></div><span class="mail-status '+esc(d.status)+'">'+esc(d.status)+'</span>'+action+'</div>'
  }).join('')||empty('Nessuna bozza salvata')
  document.querySelectorAll('[data-mail-status]').forEach(b=>b.onclick=()=>updateMailStatus(b.dataset.mailStatus,b.dataset.nextStatus))
}
async function updateMailStatus(id,nextStatus){
  const d=mailDrafts.find(x=>x.id===id);if(!d)return
  const allowed=(d.status==='draft'&&nextStatus==='review')||(d.status==='review'&&nextStatus==='approved'&&isManager())
  if(!allowed)return alert('Passaggio di stato non consentito.')
  const{error}=await supabase.from('ai_mail_drafts').update({status:nextStatus,updated_at:new Date().toISOString()}).eq('id',id).eq('organization_id',window.orgId)
  if(error)return alert(error.message)
  await loadAll()
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

function renderAssistantHistory(){
  if(!$('aiMessages'))return
  if(!assistantMessages.length){
    $('aiMessages').innerHTML='<div class="ai-message bot">Sono collegata ai dati Maglia 360. Posso indicarti cosa è aperto, cosa manca e dove entrare. Le informazioni non verificate restano tali.</div>'
    return
  }
  $('aiMessages').innerHTML=assistantMessages.map(m=>'<div class="ai-message '+(m.sender==='user'?'user':'bot')+'">'+esc(m.content)+'</div>').join('')
  $('aiMessages').scrollTop=$('aiMessages').scrollHeight
}
function addAssistantMessage(text,type='bot'){
  const d=document.createElement('div');d.className='ai-message '+type;d.textContent=text;$('aiMessages').appendChild(d);$('aiMessages').scrollTop=$('aiMessages').scrollHeight
}
async function persistAssistantMessage(content,sender,intent=null,context={}){
  if(!window.orgId||!window.userId)return
  const row={organization_id:window.orgId,user_id:window.userId,sender,content,intent,context}
  const{error}=await supabase.from('ai_assistant_messages').insert(row)
  if(!error)assistantMessages.push({...row,created_at:new Date().toISOString()})
}
async function runLiaWorkbench(q){
  const actionable=/\b(crea|creare|cartella|sottocartella|mapping|mappa|ricerca|ricercare|azienda|aziende|attivita|attività|scadenza|promemoria|progetto|locandina|brochure|contratto|documento|allega|allegato|invia|manda|spedisci|pubblica|posta|condividi|cancella|elimina|rimuovi|contatta|accedi|entra|usa)\b/i.test(q)
  if(!actionable||!window.orgId)return null
  try{
    const{data,error}=await supabase.functions.invoke('lia-workbench',{body:{organization_id:window.orgId,command:q}})
    if(error)throw error
    if(data?.action&&data.action!=='support_only')return data
    return null
  }catch(error){
    console.warn('Lia workbench non disponibile',error)
    return null
  }
}

async function askAssistant(q){
  addAssistantMessage(q,'user')
  const activePartner=currentPartnerId?ecosystem.find(x=>x.id===currentPartnerId):null
  const context=activePartner?{partner_id:activePartner.id,partner_code:activePartner.code,partner_name:activePartner.name}:{}
  persistAssistantMessage(q,'user','query',context)

  const executed=await runLiaWorkbench(q)
  if(executed){
    const reply=executed.message||'Operazione registrata.'
    addAssistantMessage(reply,'bot')
    persistAssistantMessage(reply,'assistant','execution',{...context,action:executed.action,work_order_id:executed.work_order_id||null})
    if(executed.action==='territory_mapping_completed'||executed.action==='territory_mapping_partial'){
      await loadAll()
      navigate('development')
    }else if(executed.action==='workspace_created'){
      await loadAll()
      navigate('development')
    }else if(executed.action==='artifact_queued'){
      navigate(executed.artifact?.artifact_type==='contract'||executed.artifact?.artifact_type==='document'?'documents':'aiMail')
    }else if(executed.action==='strategic_action_created'){
      await loadAll()
      navigate('actions')
    }else if(executed.action==='strategic_project_created'){
      await loadAll()
      navigate('development')
    }
    return
  }

  const s=q.toLowerCase()
  let reply=''
  if(activePartner&&(s.includes('quadro')||s.includes('partner')||s.includes('manca')||s.includes('dossier')||s.includes('prossimo'))){
    const pp=products.filter(p=>p.ecosystem_node_id===activePartner.id)
    const rr=partnerRequirements.filter(x=>x.ecosystem_node_id===activePartner.id)
    const covered=rr.filter(x=>['received','verified','not_applicable'].includes(x.status)).length
    const missing=rr.filter(x=>!['received','verified','not_applicable'].includes(x.status))
    const aa=actions.filter(x=>x.ecosystem_node_id===activePartner.id&&!['completed','cancelled'].includes(x.status)).sort(actionSort)
    const productIds=new Set(pp.map(p=>p.id))
    const verifiedTerms=collaboratorTerms.filter(t=>(t.ecosystem_node_id===activePartner.id||productIds.has(t.product_id))&&t.verification_status==='verified')
    reply=activePartner.name+': '+pp.length+' schede prodotto collegate; dossier '+covered+'/'+rr.length+' coperto; '+verifiedTerms.length+' condizioni economiche verificate; '+aa.length+' attività aperte. '+(missing.length?'Priorità documentale: '+missing.slice(0,3).map(x=>x.title).join('; ')+'. ':'Nessun requisito minimo risulta scoperto. ')+(aa.length?'Primo prossimo passo: '+aa[0].title+'.':'Non c’è un’attività aperta: conviene registrare il prossimo passo prima di considerare il dossier completo.')
  }else if(s.includes('oggi')||s.includes('attivit')||s.includes('scadenz')){
    const open=actions.filter(a=>!['completed','cancelled'].includes(a.status))
    const due=open.filter(a=>a.due_at).sort(actionSort).slice(0,3)
    const urgent=open.filter(a=>a.priority==='urgent').length
    reply='Per oggi vedo '+open.length+' attività aperte'+(urgent?' e '+urgent+' urgenti':'')+'. '+(due.length?'Le prime con scadenza: '+due.map(a=>a.title+' ('+fmtDate(a.due_at)+')').join('; ')+'.':'Non risultano scadenze registrate sulle prime attività.')+' Se vuoi lavorare con meno distrazioni, attiva Focus nella barra superiore.'
  }else if(s.includes('incontro')||s.includes('appuntamento')){
    reply='Per preparare bene un incontro partirei da tre cose: chi incontriamo, perché ora e quale bisogno vogliamo capire. Poi preparo contesto, domande, documenti, eventuale grafica da tavolo e prossimo passo. Nel Kit Collaboratore sono già presenti Mappa Famiglia 360, Business Risk Map, Rischio → Conseguenza → Protezione e Piano 90 Giorni.'
    navigate('growthKits')
  }else if(s.includes('opportun')||s.includes('radar')||s.includes('rete')){
    const active=distributionCandidates.filter(x=>['qualified','contact_planned','contacted','meeting','proposal'].includes(x.stage)).length
    reply='Il Radar Rete contiene '+distributionCandidates.length+' candidati censiti e '+active+' già oltre la semplice scoperta. Posso portarti nella mappa IVASS / Registro Imprese per qualificare chi vale davvero un contatto.'
    navigate('networkRadar')
  }else if(s.includes('prodot')||s.includes('confront')){
    const pending=products.filter(p=>p.maturity_status==='to_verify').length
    reply='Ho '+products.length+' schede prodotto/area censite; '+pending+' sono ancora da verificare. I confronti verificati sono '+comparisons.filter(c=>c.status==='verified').length+'. Posso portarti nella sezione Prodotti o Confronti.'
  }else if(s.includes('collabor')||s.includes('guadagn')||s.includes('provvig')||s.includes('rete produtt')){
    const totalClients=portfolioSnapshots.reduce((n,x)=>n+Number(x.clients_count||0),0)
    const totalPolicies=portfolioSnapshots.reduce((n,x)=>n+Number(x.policies_count||0),0)
    reply='Sono censiti '+collaborators.length+' nodi della rete e '+portfolioSnapshots.length+' snapshot di portafoglio, per '+totalClients+' clienti e '+totalPolicies+' polizze analizzate. Le condizioni economiche prodotto-specifiche verificate sono '+collaboratorTerms.filter(t=>t.verification_status==='verified').length+': le provvigioni mancanti restano da ricostruire dall’estratto conto produttore.'
  }else if(s.includes('cepa')||s.includes('nazional')){
    const current=cepaExpansion.find(x=>x.status==='current')
    const ready=cepaReadiness.filter(x=>['ready','verified'].includes(x.status)).length
    reply='CEPA ha '+subjects.length+' materie censite. La fase corrente è '+(current?current.title+' su '+current.territory:'da definire')+'. Per la readiness di scala risultano '+ready+' elementi pronti/verificati su '+cepaReadiness.length+'. La roadmap futura resta un piano, non un risultato già acquisito.'
  }else if(s.includes('document')||s.includes('contratt')||s.includes('accord')){
    const missing=partnerRequirements.filter(x=>x.status==='missing').length
    const verified=partnerRequirements.filter(x=>x.status==='verified').length
    reply='Nel dossier collaborazioni risultano '+partnerRequirements.length+' requisiti documentali censiti: '+verified+' verificati e '+missing+' non ancora registrati in piattaforma. “Mancante” qui non significa che il documento non esista: significa che dobbiamo ancora acquisirlo o collegarlo al dossier.'
  }else if(s.includes('email')||s.includes('mail')){
    reply='Posso preparare e salvare una bozza personalizzata usando i modelli Maglia/CEPA. Ti porto in AI Mail & Chat. L’invio diretto resta separato finché non colleghiamo un canale email autorizzato.'
    navigate('aiMail')
  }else{
    const names=ecosystem.map(n=>n.code).join(', ')
    reply='Posso lavorare sui dati presenti in piattaforma: compagnie e partner ('+names+'), prodotti, collaboratori, CEPA, territorio, documenti e attività. Dimmi quale area vuoi leggere o quale azione vuoi preparare.'
  }
  setTimeout(()=>{addAssistantMessage(reply,'bot');persistAssistantMessage(reply,'assistant','response',{matched:true,...context})},120)
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