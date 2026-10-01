import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0'
const PUBLIC_ORG_ID='bddc5caf-2859-4f8e-bd51-a792fca40eca'
const ACCESS_APPROVER_ID='6a04c8de-1470-49fb-ab66-13dff9a62802'
const ACCESS_APPROVER_EMAIL='francescocoppola1485@gmail.com'
const initialAuthUrl=location.href
let passwordRecoveryMode=/type=recovery/i.test(initialAuthUrl)
const supabase=createClient('https://dfnwzwutvnwiitiffwvr.supabase.co','sb_publishable_n0Fmw2PlLeaXsoFVsKb8MA_VbPqUbNn',{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}})
const $=id=>document.getElementById(id)
const esc=(v='')=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const fmtDate=v=>v?new Intl.DateTimeFormat('it-IT',{dateStyle:'medium'}).format(new Date(v)):'—'
const fmtDateTime=v=>v?new Intl.DateTimeFormat('it-IT',{dateStyle:'short',timeStyle:'short'}).format(new Date(v)):'—'
const localInput=v=>{if(!v)return'';const d=new Date(v);return new Date(d-d.getTimezoneOffset()*60000).toISOString().slice(0,16)}
const isManager=()=>['super_admin','supervisor','manager'].includes(window.userRole)
const isAccessApprover=()=>window.userId===ACCESS_APPROVER_ID&&String(window.userEmail||'').toLowerCase()===ACCESS_APPROVER_EMAIL
const viewMeta={
 home:['Quadro generale','Agenzia Generale HDI · Ecosistema di competenze, relazioni e sviluppo'],
 operatingPlan:['Piano Operativo','Architettura, dati, metodo, roadmap e sviluppo continuo di MAGLIA 360'],
 products:['Clienti & Portafoglio','Cliente 360, motore portafoglio, pipeline commerciale e catalogo prodotti'],
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
 accessAdmin:['Accessi & Richieste','Autorizzazioni utenze, sponsor, partner e contatti dalla vetrina pubblica'],
 liaWorkbench:['Lia · Workbench','Assistente operativo con permessi, ricerca, cartelle di lavoro e artefatti tracciati']
}

let ecosystem=[],projects=[],actions=[],marketHubs=[],marketEntities=[],contacts=[],timeline=[],documents=[],partnerRequirements=[],blueprints=[],subjects=[],initiatives=[],cepaContent=[],cepaAcademy=[],cepaSpeakers=[],products=[],productKnowledge=[],comparisons=[],collaborators=[],collaboratorTerms=[],portfolioSnapshots=[],businessAssessments=[],growthKits=[],distributionWatchlists=[],distributionCandidates=[],distributionEvidence=[],mailTemplates=[],mailDrafts=[],cepaExpansion=[],cepaReadiness=[],assistantMessages=[],recoveryRows=[],members=[],liaCapabilities=[],liaFolders=[],liaOrders=[],liaFiles=[],researchSources=[],researchInsights=[],liaActionRules=[],liaApprovals=[],roleViewAccess=[],liaAutomationRuns=[],assetRegistry=[],expertProtocols=[],uxUsageEvents=[],accessRequests=[],commercialLeads=[],publicShowcase=[]
let officeAssignments=[],officeMessages=[],officeSnapshots=[],officeCases=[],officeWorkflow=[],officeCepaActivities=[],officeImports=[]
let commercialClients=[],pipelineCases=[],clientCheckups=[],clientInteractions=[],clientWorkItems=[],clientPolicies=[]
let currentPartnerId=null,currentOfficeId=null,currentOfficeProductId=null,currentCepaHubId=null,currentCommerceTab='clients'

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
  const btn=$('focusModeBtn')
  if(btn){
    btn.classList.toggle('active',!!on)
    btn.textContent=on?'● Focus attivo':'◎ Focus'
  }
  try{localStorage.setItem('maglia360_focus',on?'1':'0')}catch(_){}
}
if($('focusModeBtn'))$('focusModeBtn').onclick=()=>setFocusMode(!$('workspace').classList.contains('focus-mode'))

$('loginForm').onsubmit=async e=>{e.preventDefault();const{error}=await supabase.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(error)return msg(error.message,true);await boot()}
$('signupBtn').onclick=()=>openPublicAccessForm($('email').value.trim())
$('backToPublicBtn').onclick=showPublicPortal



function showPublicPortal(){
  $('publicPortal')?.classList.remove('hidden')
  $('loginView')?.classList.add('hidden')
  $('resetPasswordView')?.classList.add('hidden')
  $('workspace')?.classList.add('hidden')
  $('blockedView')?.classList.add('hidden')
  $('aiDock')?.classList.add('hidden')
  loadPublicPortal()
}
function showLoginView(){
  $('publicPortal')?.classList.add('hidden')
  $('loginView')?.classList.remove('hidden')
  $('resetPasswordView')?.classList.add('hidden')
  $('workspace')?.classList.add('hidden')
  $('blockedView')?.classList.add('hidden')
  setTimeout(()=>$('email')?.focus(),50)
}
function showResetPasswordView(){
  $('publicPortal')?.classList.add('hidden')
  $('loginView')?.classList.add('hidden')
  $('resetPasswordView')?.classList.remove('hidden')
  $('workspace')?.classList.add('hidden')
  $('blockedView')?.classList.add('hidden')
  $('aiDock')?.classList.add('hidden')
}
async function loadPublicPortal(){
  if(!$('publicShowcaseGrid'))return
  const{data,error}=await supabase.from('public_showcase_items').select('*').eq('organization_id',PUBLIC_ORG_ID).eq('published',true).order('sort_order')
  if(error){
    $('publicShowcaseGrid').innerHTML='<div class="empty">Le iniziative non sono disponibili in questo momento.</div>'
    return
  }
  publicShowcase=data||[]
  $('publicShowcaseGrid').innerHTML=publicShowcase.map(x=>
    '<article class="public-showcase-card '+(x.featured?'featured':'')+'">'+
      (x.visual_url?'<div class="public-showcase-visual"><img src="'+esc(x.visual_url)+'" alt="" loading="lazy"></div>':'')+
      '<div><span>'+esc(x.eyebrow||x.category)+'</span><h3>'+esc(x.title)+'</h3><p>'+esc(x.summary)+'</p></div>'+
      '<div class="public-showcase-footer"><small>'+esc(x.audience||'Proposta su misura')+'</small><button type="button" data-public-item="'+x.id+'">'+esc(x.cta_label||'Richiedi informazioni')+' →</button></div></article>'
  ).join('')||'<div class="empty">Nuove iniziative in preparazione.</div>'
  document.querySelectorAll('[data-public-item]').forEach(b=>b.onclick=()=>{
    const item=publicShowcase.find(x=>x.id===b.dataset.publicItem)
    openPublicLeadForm(item?.id||null,item?.category==='sponsor'?'sponsor':item?.category==='network'?'collaborator':item?.category==='partnership'?'partner':'information')
  })
}
function openPublicAccessForm(prefillEmail=''){
  $('modalContent').innerHTML='<div class="eyebrow">RICHIESTA ACCESSO</div><h2>Richiedi l’abilitazione a MAGLIA 360</h2><p class="muted">L’account non viene creato automaticamente. La richiesta viene verificata e può essere autorizzata solo dall’amministratore.</p><form id="publicAccessForm" class="form"><label>Nome e cognome<input id="paName" autocomplete="name" required></label><label>Email<input id="paEmail" type="email" autocomplete="email" value="'+esc(prefillEmail)+'" required></label><label>Telefono<input id="paPhone" autocomplete="tel" required></label><label>Azienda / organizzazione, se presente<input id="paCompany"></label><label>Motivo della richiesta<textarea id="paReason" placeholder="Collaboratore, partner, supporto operativo, altro..."></textarea></label><label class="public-consent"><input id="paConsent" type="checkbox" required> Autorizzo il contatto per la gestione di questa richiesta.</label><input id="paWebsite" class="public-honeypot" tabindex="-1" autocomplete="off"><button class="primary" type="submit">Invia richiesta</button></form><div id="publicFormMsg" class="message hidden"></div>'
  $('modal').classList.remove('hidden')
  $('publicAccessForm').onsubmit=async e=>{
    e.preventDefault()
    const btn=e.submitter; if(btn)btn.disabled=true
    const{data,error}=await supabase.functions.invoke('public-portal-request',{body:{
      type:'access',full_name:$('paName').value.trim(),email:$('paEmail').value.trim(),phone:$('paPhone').value.trim(),
      company_name:$('paCompany').value.trim(),message:$('paReason').value.trim(),requested_profile:'generic',
      consent_contact:$('paConsent').checked,website:$('paWebsite').value
    }})
    if(btn)btn.disabled=false
    const box=$('publicFormMsg')
    box.textContent=error?(error.message||'Invio non riuscito.'):(data?.message||'Richiesta ricevuta.')
    box.className='message'+(error||data?.ok===false?' error':'')
    if(!error&&data?.ok!==false)e.target.reset()
  }
}
function openPublicLeadForm(itemId=null,leadType='information'){
  const item=publicShowcase.find(x=>x.id===itemId)
  $('modalContent').innerHTML='<div class="eyebrow">CONTATTO COMMERCIALE</div><h2>'+(item?esc(item.title):'Parliamo del tuo progetto')+'</h2><p class="muted">Nessun costo viene mostrato o accettato da questo modulo. La richiesta serve ad aprire un contatto e costruire una proposta dedicata.</p><form id="publicLeadForm" class="form"><label>Nome e cognome<input id="plName" autocomplete="name" required></label><label>Azienda / realtà<input id="plCompany"></label><div class="inline"><label>Email<input id="plEmail" type="email" autocomplete="email" required></label><label>Telefono<input id="plPhone" autocomplete="tel" required></label></div><label>Interesse<input id="plInterest" value="'+esc(item?.title||'')+'"></label><label>Raccontaci cosa stai cercando<textarea id="plMessage"></textarea></label><label class="public-consent"><input id="plConsent" type="checkbox" required> Autorizzo il contatto per approfondire questa richiesta.</label><input id="plWebsite" class="public-honeypot" tabindex="-1" autocomplete="off"><button class="primary" type="submit">Invia richiesta di contatto</button></form><div id="publicFormMsg" class="message hidden"></div>'
  $('modal').classList.remove('hidden')
  $('publicLeadForm').onsubmit=async e=>{
    e.preventDefault()
    const btn=e.submitter;if(btn)btn.disabled=true
    const{data,error}=await supabase.functions.invoke('public-portal-request',{body:{
      type:'commercial',lead_type:leadType,showcase_item_id:itemId,full_name:$('plName').value.trim(),company_name:$('plCompany').value.trim(),
      email:$('plEmail').value.trim(),phone:$('plPhone').value.trim(),interest_area:$('plInterest').value.trim(),message:$('plMessage').value.trim(),
      consent_contact:$('plConsent').checked,website:$('plWebsite').value
    }})
    if(btn)btn.disabled=false
    const box=$('publicFormMsg')
    box.textContent=error?(error.message||'Invio non riuscito.'):(data?.message||'Richiesta ricevuta.')
    box.className='message'+(error||data?.ok===false?' error':'')
    if(!error&&data?.ok!==false)e.target.reset()
  }
}
function bindPublicPortal(){
  $('publicLoginBtn')?.addEventListener('click',showLoginView)
  $('publicLoginCta')?.addEventListener('click',showLoginView)
  $('publicAccessBtn')?.addEventListener('click',()=>openPublicAccessForm())
  $('publicAccessCta')?.addEventListener('click',()=>openPublicAccessForm())
  $('publicPartnerBtn')?.addEventListener('click',()=>openPublicLeadForm(null,'partner'))
  $('publicHeroContactBtn')?.addEventListener('click',()=>openPublicLeadForm(null,'partner'))
  $('publicGeneralContactBtn')?.addEventListener('click',()=>openPublicLeadForm(null,'information'))
  $('publicSponsorCta')?.addEventListener('click',()=>openPublicLeadForm(null,'sponsor'))
  document.querySelectorAll('[data-public-scroll]').forEach(b=>b.onclick=()=>document.getElementById(b.dataset.publicScroll)?.scrollIntoView({behavior:'smooth'}))
}
bindPublicPortal()

if($('resetPasswordForm'))$('resetPasswordForm').onsubmit=async e=>{
  e.preventDefault()
  const pass=$('resetPassword').value,confirm=$('resetPasswordConfirm').value
  const box=$('resetPasswordMsg')
  if(pass.length<10||pass!==confirm){box.textContent='Le password devono coincidere e contenere almeno 10 caratteri.';box.className='message error';return}
  const{error}=await supabase.auth.updateUser({password:pass})
  if(error){box.textContent=error.message;box.className='message error';return}
  const{data,error:activateError}=await supabase.functions.invoke('manage-access-request',{body:{action:'activate_self'}})
  if(activateError||data?.ok===false){box.textContent=data?.message||activateError?.message||'Password aggiornata, ma attivazione non completata.';box.className='message error';return}
  passwordRecoveryMode=false
  history.replaceState({},document.title,location.pathname)
  box.textContent='Accesso attivato.';box.className='message'
  setTimeout(()=>boot(),350)
}

function setHeader(title,subtitle){$('pageTitle').textContent=title;$('pageSubtitle').textContent=subtitle}

let appRouteStack=[]
let appRouteIndex=-1
let suppressRouteRecord=false
function routeKey(route){try{return JSON.stringify(route||{})}catch(_){return''}}
function updateRouteButtons(){
  const back=$('navBackBtn'),forward=$('navForwardBtn')
  if(back)back.disabled=appRouteIndex<=0
  if(forward)forward.disabled=appRouteIndex<0||appRouteIndex>=appRouteStack.length-1
}
function recordRoute(route){
  if(suppressRouteRecord||!route)return
  const key=routeKey(route)
  if(appRouteIndex>=0&&routeKey(appRouteStack[appRouteIndex])===key)return
  appRouteStack=appRouteStack.slice(0,appRouteIndex+1)
  appRouteStack.push(route)
  appRouteIndex=appRouteStack.length-1
  updateRouteButtons()
}
function applyRoute(route){
  if(!route)return
  suppressRouteRecord=true
  try{
    if(route.kind==='office')openOffice(route.id)
    else if(route.kind==='product'){currentOfficeId=route.officeId;openOfficeProduct(route.id)}
    else if(route.kind==='partner')openPartner(route.id)
    else if(route.kind==='cepaHub')openCepaHub()
    else if(route.kind==='cepaTerritory')openCepaTerritory(route.id)
    else if(route.kind==='cepaCentral')openCepaCentral()
    else navigate(route.view||'home')
  }finally{
    suppressRouteRecord=false
    updateRouteButtons()
  }
}
function goRouteBack(){if(appRouteIndex>0){appRouteIndex--;applyRoute(appRouteStack[appRouteIndex])}}
function goRouteForward(){if(appRouteIndex<appRouteStack.length-1){appRouteIndex++;applyRoute(appRouteStack[appRouteIndex])}}
if($('navBackBtn'))$('navBackBtn').onclick=goRouteBack
if($('navForwardBtn'))$('navForwardBtn').onclick=goRouteForward

function globalSearchItems(query){
  const q=String(query||'').trim().toLowerCase()
  if(!q)return[
    {kind:'home',id:'home',label:'Home Maglia 360',meta:'Ambienti di lavoro'},
    {kind:'plan',id:'operatingPlan',label:'Piano Operativo',meta:'Metodo, roadmap e sviluppo continuo'},
    {kind:'cepa',id:'cepa',label:'Progetto C.E.P.A.',meta:'Centro e territori'},
    ...accessibleOffices().slice(0,3).map(x=>({kind:'office',id:x.id,label:'Ufficio '+x.city,meta:'Sede operativa'}))
  ]
  const has=(...parts)=>parts.filter(Boolean).join(' ').toLowerCase().includes(q)
  const out=[]
  if(has('piano operativo metodo roadmap sviluppo continuo architettura maglia 360'))out.push({kind:'plan',id:'operatingPlan',label:'Piano Operativo',meta:'Metodo, roadmap e sviluppo continuo'})
  accessibleOffices().forEach(x=>{if(has(x.city,x.name,x.address))out.push({kind:'office',id:x.id,label:'Ufficio '+x.city,meta:x.address||'Sede operativa'})})
  ecosystem.forEach(x=>{if(has(x.name,x.code,x.capability))out.push({kind:'partner',id:x.id,label:x.name,meta:x.capability||'Partner'})})
  products.forEach(x=>{if(has(x.name,x.code,x.category))out.push({kind:'product',id:x.id,label:x.name,meta:'Prodotto · '+String(x.category||'').replaceAll('_',' ')})})
  documents.forEach(x=>{if(has(x.title,x.category,x.document_status))out.push({kind:'document',id:x.id,label:x.title,meta:'Documento'})})
  collaborators.forEach(x=>{if(has(x.display_name,x.area,x.territory))out.push({kind:'collaborator',id:x.id,label:x.display_name,meta:'Collaboratore · '+(x.area||'')})})
  marketEntities.forEach(x=>{if(has(x.name,x.city,x.entity_type))out.push({kind:'entity',id:x.id,label:x.name,meta:(x.city||'')+' · '+entityType(x.entity_type)})})
  cepaContent.forEach(x=>{if(has(x.title,x.asset_type))out.push({kind:'cepa',id:x.id,label:x.title,meta:'C.E.P.A. · contenuto'})})
  commercialClients.forEach(x=>{const name=clientDisplayName(x);if(has(name,x.city,x.province,x.email,x.mobile,x.metadata?.producer,x.metadata?.producer_code))out.push({kind:'client',id:x.id,label:name,meta:'Cliente 360 · '+(x.city||x.status||'')})})
  clientPolicies.forEach(p=>{if(has(p.policy_number,p.branch_name,p.product_name,p.company_name,p.producer_name,p.producer_code))out.push({kind:'policy',id:p.client_id,label:p.policy_number||p.product_name||'Polizza',meta:'Polizza · '+[p.company_name,p.branch_name].filter(Boolean).join(' · ')})})
  if(has('cliente 360 clienti portafoglio motore portafoglio pipeline commerciale'))out.unshift({kind:'commerce',id:'clients',label:'Cliente 360',meta:'Clienti, portafoglio e pipeline commerciale'})
  if(has('cepa centro educazione previdenziale assicurativa'))out.unshift({kind:'cepa',id:'cepa',label:'C.E.P.A.',meta:'Centro Educazione Previdenziale e Assicurativa'})
  return out.slice(0,12)
}
function renderGlobalSearch(query){
  const box=$('globalSearchResults')
  if(!box)return
  const items=globalSearchItems(query)
  box.innerHTML=items.map((x,i)=>'<button type="button" data-search-index="'+i+'"><strong>'+esc(x.label)+'</strong><small>'+esc(x.meta||'')+'</small></button>').join('')||'<div class="search-empty">Nessun risultato trovato.</div>'
  box.classList.remove('hidden')
  box._items=items
  box.querySelectorAll('[data-search-index]').forEach(b=>b.onclick=()=>{
    const item=items[Number(b.dataset.searchIndex)]
    openGlobalSearchItem(item)
  })
}
function openGlobalSearchItem(item){
  if(!item)return
  $('globalSearchResults')?.classList.add('hidden')
  if($('globalSearchInput'))$('globalSearchInput').value=''
  if(item.kind==='home')navigate('home')
  else if(item.kind==='plan')navigate('operatingPlan')
  else if(item.kind==='office')openOffice(item.id)
  else if(item.kind==='partner')openPartner(item.id)
  else if(item.kind==='product'){
    if(currentOfficeId&&accessibleOffices().some(x=>x.id===currentOfficeId))openOfficeProduct(item.id)
    else navigate('products')
  }
  else if(item.kind==='document')navigate('documents')
  else if(item.kind==='collaborator')navigate('collaborators')
  else if(item.kind==='client'){openCommerceTab('clients');openClient360(item.id)}
  else if(item.kind==='policy'){openCommerceTab('clients');openClient360(item.id)}
  else if(item.kind==='commerce')openCommerceTab(item.id||'clients')
  else if(item.kind==='entity')navigate('development')
  else if(item.kind==='cepa')openCepaHub()
}
if($('globalSearchInput')){
  $('globalSearchInput').onfocus=e=>renderGlobalSearch(e.target.value)
  $('globalSearchInput').oninput=e=>renderGlobalSearch(e.target.value)
  $('globalSearchInput').onkeydown=e=>{
    if(e.key==='Escape')$('globalSearchResults').classList.add('hidden')
    if(e.key==='Enter'){
      e.preventDefault()
      const items=globalSearchItems(e.currentTarget.value)
      if(items[0])openGlobalSearchItem(items[0])
    }
  }
}
document.addEventListener('keydown',e=>{
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){
    e.preventDefault()
    $('globalSearchInput')?.focus()
  }
})
document.addEventListener('click',e=>{
  if(!e.target.closest('.global-search-shell'))$('globalSearchResults')?.classList.add('hidden')
})
function renderHeaderControls(){
  const select=$('officeQuickSelector')
  if(select){
    const current=select.value
    select.innerHTML='<option value="">Tutte le sedi</option>'+accessibleOffices().map(x=>'<option value="'+x.id+'">'+esc(x.city)+'</option>').join('')
    if(current&&accessibleOffices().some(x=>x.id===current))select.value=current
    if(currentOfficeId&&accessibleOffices().some(x=>x.id===currentOfficeId))select.value=currentOfficeId
  }
  const urgent=officeCases.filter(x=>!['completed','cancelled'].includes(x.status)&&['urgent','high'].includes(x.priority)).length
  const publicPending=isAccessApprover()?accessRequests.filter(x=>x.status==='pending').length+commercialLeads.filter(x=>x.status==='new').length:0
  const badge=$('headerNotificationBadge')
  if(badge){badge.textContent=String(urgent+publicPending);badge.classList.toggle('hidden',urgent+publicPending===0)}
}
if($('officeQuickSelector'))$('officeQuickSelector').onchange=e=>e.target.value?openOffice(e.target.value):navigate('home')
if($('headerNotificationsBtn'))$('headerNotificationsBtn').onclick=()=>navigate('actions')

function setOfficeShell(active){
  const ws=$('workspace')
  if(!ws)return
  ws.classList.toggle('office-shell',!!active)
  if(!active)ws.classList.remove('cepa-shell')
  if(active){
    ws.classList.remove('sidebar-collapsed','nav-open')
    $('sidebarBackdrop')?.classList.add('hidden')
  }
}
function setCepaShell(active){
  const ws=$('workspace')
  if(!ws)return
  if(active)setOfficeShell(true)
  ws.classList.toggle('cepa-shell',!!active)
}
function accessForView(view){
  if(view==='accessAdmin')return isAccessApprover()?'manage':'hidden'
  if(view==='operatingPlan')return isManager()?'manage':'read'
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
  currentCepaHubId=null
  setCepaShell(false)
  setOfficeShell(view==='home')
  applyBrandContext(null)
  document.querySelectorAll('.view').forEach(v=>v.classList.add('hidden'))
  $(view+'View').classList.remove('hidden')
  document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view))
  document.querySelectorAll('[data-partner-id]').forEach(b=>b.classList.remove('active'))
  const m=viewMeta[view]||['Centro di Regia','']
  setHeader(m[0],m[1])
  setMobileNav(false)
  $('aiDock').classList.remove('hidden')
  setLiaOpen(false)
  if(view==='recovery')loadRecovery()
  recordRoute({kind:'view',view})
  recordUxEvent('view',view,null,true)
  renderHeaderControls()
  window.scrollTo({top:0,behavior:'smooth'})
}
const brandIdentity={
  HDI:{label:'HDI Assicurazioni',accent:'#007A53',accent2:'#D71920',surface:'#F1F8F5'},
  PRIMA_ENEA:{label:'Prima Assicurazioni',accent:'#6F2DBD',accent2:'#9B51E0',surface:'#F7F1FC'},
  SLP:{label:'SLP Assicurazioni',accent:'#075EA8',accent2:'#2E83C7',surface:'#F1F7FC'},
  AGLEA:{label:'Aglea Salus',accent:'#2C7A62',accent2:'#69A95A',surface:'#F2F8F5'},
  CIP:{label:'CIP Energia',accent:'#E88A21',accent2:'#F3B35A',surface:'#FFF7EC'}
}
const MAGLIA_MEDIA={
  officeTeam:'https://images.pexels.com/photos/3182778/pexels-photo-3182778.jpeg?auto=compress&cs=tinysrgb&w=1200',
  cepaTraining:'https://images.pexels.com/photos/7993954/pexels-photo-7993954.jpeg?auto=compress&cs=tinysrgb&w=1200',
  colico:'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Colico_Panorama.jpg/1280px-Colico_Panorama.jpg',
  mandello:'https://commons.wikimedia.org/wiki/Special:Redirect/file/Mandello_del_Lario_panorama.jpg?width=1600'
}
function mediaForOffice(office){
  const code=String(office?.code||'').toUpperCase()
  const city=String(office?.city||'').toLowerCase()
  return code.includes('MANDELLO')||city.includes('mandello')?MAGLIA_MEDIA.mandello:MAGLIA_MEDIA.colico
}
function mediaCreditForOffice(office){
  const code=String(office?.code||'').toUpperCase()
  const city=String(office?.city||'').toLowerCase()
  return code.includes('MANDELLO')||city.includes('mandello')
    ?'Foto: Andrzej Otrębski · CC BY-SA 3.0'
    :'Foto: BKLuis · CC BY-SA 4.0'
}
function officeSmartFocus({period,renewals,quotes,proposals,cases,lost}){
  if(!period)return{tone:'info',title:'Completa il quadro dati',text:'Carica lo snapshot mensile AssiEasy: la piattaforma potrà costruire confronti, trend e priorità attendibili.',action:'Dati mensili'}
  if(renewals>0&&renewals>=Math.max(quotes,proposals))return{tone:'warning',title:'Presidia i rinnovi',text:renewals+' rinnovi richiedono attenzione. Conviene lavorarli prima di ampliare il nuovo flusso commerciale.',action:'Rinnovi'}
  if(quotes>0&&proposals===0)return{tone:'opportunity',title:'Trasforma preventivi in proposte',text:'Ci sono '+quotes+' preventivi da lavorare e nessuna proposta registrata nello snapshot corrente.',action:'Preventivi'}
  if(lost>0)return{tone:'review',title:'Analizza le pratiche perse',text:lost+' pratiche risultano perse nel mese. Verifica motivo, recuperabilità e possibili azioni di retention.',action:'Analisi'}
  if(cases>0)return{tone:'info',title:'Riduci il lavoro aperto',text:'Ci sono '+cases+' pratiche aperte nella sede. Concentrati sulle scadenze e sulle attività ad alto impatto.',action:'Pratiche'}
  return{tone:'positive',title:'Quadro operativo sotto controllo',text:'Non emergono criticità forti dai dati disponibili. Usa il tempo liberato per sviluppo commerciale e cross selling.',action:'Sviluppo'}
}
function getBrand(node){
  if(!node)return null
  const fallback=brandIdentity[node.code]||{}
  const meta=node.metadata?.brand||{}
  return {
    label:node.name||fallback.label||node.code,
    accent:meta.ui_accent||fallback.accent||'#0B6F5C',
    accent2:meta.ui_accent_secondary||fallback.accent2||'#1E6F9F',
    surface:fallback.surface||'#F4F7F9',
    officialSite:meta.official_site||null,
    logoStatus:meta.logo_asset_status||null
  }
}
function applyBrandContext(node=null){
  const root=document.documentElement
  const brand=getBrand(node)
  root.style.setProperty('--context-accent',brand?.accent||'#0B6F5C')
  root.style.setProperty('--context-accent-2',brand?.accent2||'#1E6F9F')
  root.style.setProperty('--context-surface',brand?.surface||'#F4F7F9')
  document.body.dataset.contextBrand=node?.code||'MAGLIA'
  const label=$('liaContextLabel')
  if(label)label.textContent='Contesto: '+(node?.name||window.activeOfficeName||'MAGLIA 360')
}

function openPartner(id){
  if(!canOpenView('partners'))return
  currentPartnerId=id
  setOfficeShell(false)
  document.querySelectorAll('.view').forEach(v=>v.classList.add('hidden'))
  $('partnerView').classList.remove('hidden')
  document.querySelectorAll('.nav-item').forEach(b=>b.classList.remove('active'))
  const btn=document.querySelector('[data-partner-id="'+id+'"]');if(btn)btn.classList.add('active')
  const n=ecosystem.find(x=>x.id===id);if(!n)return
  applyBrandContext(n)
  setHeader(n.name,n.capability+' · dossier relazione')
  showPartnerSection('overview')
  renderPartner()
  setMobileNav(false)
  $('aiDock').classList.remove('hidden')
  recordRoute({kind:'partner',id})
  renderHeaderControls()
  window.scrollTo({top:0,behavior:'smooth'})
}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>b.dataset.view==='cepa'?openCepaHub():navigate(b.dataset.view))
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
function setLiaOpen(open){
  $('aiDockPanel').classList.toggle('hidden',!open)
  $('aiDockToggle').classList.toggle('hidden',!!open)
}
$('aiDockToggle').onclick=()=>setLiaOpen(true)
$('aiDockClose').onclick=()=>setLiaOpen(false)
document.addEventListener('keydown',e=>{if(e.key==='Escape')setLiaOpen(false)})
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
  if(passwordRecoveryMode&&user){showResetPasswordView();return}
  if(!user){showPublicPortal();return}
  const{data:m,error}=await supabase.from('organization_memberships').select('organization_id,role').eq('user_id',user.id).eq('active',true).limit(1).maybeSingle()
  $('publicPortal')?.classList.add('hidden');$('loginView').classList.add('hidden');$('resetPasswordView')?.classList.add('hidden')
  if(error||!m){$('workspace').classList.add('hidden');$('blockedView').classList.remove('hidden');$('aiDock').classList.add('hidden');return}
  window.orgId=m.organization_id;window.userId=user.id;window.userRole=m.role;window.userEmail=user.email||''
  $('workspace').classList.remove('hidden');$('blockedView').classList.add('hidden');$('aiDock').classList.remove('hidden')
  setMobileNav(false)
  try{setFocusMode(localStorage.getItem('maglia360_focus')==='1')}catch(_){setFocusMode(false)}

  $('sideUser').textContent=user.email||'Utente';$('rolePill').textContent=m.role.replaceAll('_',' ')
  if($('headerUserName'))$('headerUserName').textContent=(user.email||'Utente').split('@')[0]
  if($('headerUserInitials'))$('headerUserInitials').textContent=((user.email||'U').split('@')[0].split(/[._-]/).map(x=>x[0]).join('').slice(0,2)||'U').toUpperCase()
  $('manageOfficeUsersBtn')?.classList.toggle('hidden',!isDirectionRole())
  ;['newEntityBtn','addTimelineBtn','addContactBtn','addPartnerDocumentBtn','addDocumentBtn','addCepaSubjectBtn','addCepaInitiativeBtn','addCepaContentBtn','addCepaSpeakerBtn','addCollaboratorBtn','newAssessmentBtn','newDistributionCandidateBtn','editPartnerBtn'].forEach(id=>$(id).classList.toggle('hidden',!isManager()))
  await loadAll()
  setCepaShell(false)
  setOfficeShell(true)
  setHeader('Home','Sistema operativo commerciale e territoriale')
  $('aiDock').classList.remove('hidden')
  setLiaOpen(false)
  if(appRouteIndex<0)recordRoute({kind:'view',view:'home'})
  recordUxEvent('layout','home','boot',true)
  renderHeaderControls()
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
    supabase.from('ai_automation_runs').select('*,distribution_research_watchlists(id,name,cadence,market_hubs(id,name,city,province))').eq('organization_id',window.orgId).order('created_at',{ascending:false}).limit(100),
    supabase.from('office_user_assignments').select('*').eq('organization_id',window.orgId).eq('active',true).order('is_primary',{ascending:false}),
    supabase.from('office_direction_messages').select('*').eq('organization_id',window.orgId).eq('active',true).order('priority',{ascending:false}).order('starts_at',{ascending:false}).limit(50),
    supabase.from('office_product_monthly_snapshots').select('*,agency_products(id,code,name,category,ecosystem_node_id)').eq('organization_id',window.orgId).order('period_month',{ascending:false}).limit(500),
    supabase.from('office_product_cases').select('*,agency_products(id,code,name,category,ecosystem_node_id)').eq('organization_id',window.orgId).order('priority',{ascending:false}).order('due_at').limit(500),
    supabase.from('office_product_workflow_stages').select('*').eq('organization_id',window.orgId).eq('active',true).order('case_type').order('sort_order'),
    supabase.from('office_cepa_activities').select('*').eq('organization_id',window.orgId).order('scheduled_at',{ascending:true}).limit(200),
    supabase.from('office_data_imports').select('*').eq('organization_id',window.orgId).order('created_at',{ascending:false}).limit(100),
    supabase.from('clients').select('*').eq('organization_id',window.orgId).order('updated_at',{ascending:false}).limit(5000),
    supabase.from('pipeline_cases').select('*,clients(id,kind,status,first_name,last_name,business_name,email,mobile,city,province,next_action,next_action_at,metadata)').eq('organization_id',window.orgId).order('updated_at',{ascending:false}).limit(2000),
    supabase.from('checkups').select('*').eq('organization_id',window.orgId).order('updated_at',{ascending:false}).limit(1000),
    supabase.from('client_interactions').select('*').eq('organization_id',window.orgId).order('occurred_at',{ascending:false}).limit(2000),
    supabase.from('work_items').select('*').eq('organization_id',window.orgId).order('updated_at',{ascending:false}).limit(2000),
    supabase.from('client_policies').select('*,clients(id,kind,status,first_name,last_name,business_name,city,province),agency_products(id,code,name,category)').eq('organization_id',window.orgId).order('expiry_date',{ascending:true}).limit(10000),
    supabase.from('asset_registry').select('*').eq('organization_id',window.orgId).eq('is_active',true).order('governance_status').order('asset_name').limit(1000),
    supabase.from('expert_protocols').select('*').eq('organization_id',window.orgId).eq('status','active').order('version',{ascending:false}).limit(20),
    supabase.from('ux_usage_events').select('*').eq('organization_id',window.orgId).order('created_at',{ascending:false}).limit(500),
    isAccessApprover()?supabase.from('public_access_requests').select('*').eq('organization_id',window.orgId).order('created_at',{ascending:false}).limit(250):Promise.resolve({data:[],error:null}),
    isAccessApprover()?supabase.from('public_commercial_leads').select('*').eq('organization_id',window.orgId).order('created_at',{ascending:false}).limit(250):Promise.resolve({data:[],error:null}),
    isAccessApprover()?supabase.from('public_showcase_items').select('*').eq('organization_id',window.orgId).order('sort_order').order('title'):Promise.resolve({data:[],error:null})
  ]
  const res=await Promise.all(q)
  const err=res.find(x=>x.error)?.error
  if(err){console.error(err);$('refreshBtn').textContent='!';return}
  ;[ecosystem,projects,actions,marketHubs,marketEntities,contacts,timeline,documents,partnerRequirements,blueprints,subjects,initiatives,cepaContent,cepaAcademy,cepaSpeakers,products,productKnowledge,comparisons,collaborators,collaboratorTerms,portfolioSnapshots,businessAssessments,growthKits,distributionWatchlists,distributionCandidates,distributionEvidence,mailTemplates,mailDrafts,cepaExpansion,cepaReadiness,assistantMessages,liaCapabilities,liaFolders,liaOrders,liaFiles,researchSources,researchInsights,liaActionRules,liaApprovals,roleViewAccess,liaAutomationRuns,officeAssignments,officeMessages,officeSnapshots,officeCases,officeWorkflow,officeCepaActivities,officeImports,commercialClients,pipelineCases,clientCheckups,clientInteractions,clientWorkItems,clientPolicies,assetRegistry,expertProtocols,uxUsageEvents,accessRequests,commercialLeads,publicShowcase]=res.map(x=>x.data||[])
  renderEverything()
  $('refreshBtn').textContent='↻'
}

function renderEverything(){
  renderPartnerNav();renderHome();renderOperatingPlan();renderCepaHub();renderCepaTerritory();renderOffice();renderOfficeProduct();renderPartner();renderProducts();renderCommerceWorkspace();renderCollaborators();renderGrowthKits();renderComparisons();renderMail();renderCepa();renderTerritories();renderDocuments();renderDevelopment();renderNetworkRadar();renderActions();renderAssistantHistory();renderLiaWorkbench();renderAccessAdmin();applyRoleViewAccess();renderHeaderControls()
}

function renderOperatingPlan(){
  if(!$('planEngineGrid'))return

  const activeActions=actions.filter(x=>!['completed','cancelled'].includes(x.status))
  const activeCepa=officeCepaActivities.filter(x=>!['completed','cancelled'].includes(x.status))
  const qualifiedEntities=marketEntities.filter(x=>!['observed','archived'].includes(x.stage))
  const checks=[
    officeSnapshots.length>0,
    products.length>0,
    ecosystem.length>0,
    documents.length>0,
    marketEntities.length>0,
    (cepaContent.length+activeCepa.length)>0,
    activeActions.length>0,
    commercialClients.length>0,
    pipelineCases.length>0,
    portfolioSnapshots.length>0,
    clientPolicies.length>0,
    researchSources.length>0
  ]
  const health=Math.round(checks.filter(Boolean).length/checks.length*100)
  $('planHealthScore').textContent=health+'%'
  $('planHealthLabel').textContent=health>=88?'struttura operativa':health>=63?'base solida, da completare':'fondamenta in costruzione'
  $('planOfficeCount').textContent=accessibleOffices().length
  $('planProductCount').textContent=products.length
  $('planPartnerCount').textContent=ecosystem.length
  $('planEntityCount').textContent=marketEntities.length
  $('planActionCount').textContent=activeActions.length
  $('planResearchCount').textContent=researchSources.length+' / '+researchInsights.length

  const engines=[
    {code:'01',title:'Sedi & Control Room',desc:'Colico, Mandello e future sedi. Dati mensili, priorità, pratiche e messaggi della Direzione.',metric:accessibleOffices().length+' sedi accessibili',target:'home',tone:'blue'},
    {code:'02',title:'Cliente 360 & Portafoglio',desc:'Anagrafica cliente, profondità di relazione, mix di portafoglio, produttori e opportunità di sviluppo basate sui dati disponibili.',metric:commercialClients.length+' clienti accessibili · '+portfolioSnapshots.length+' snapshot rete',target:'products',tone:'green'},
    {code:'03',title:'Pipeline Commerciale',desc:'Acquisizione, sviluppo, retention e recovery in un flusso unico: selezione, contatto, appuntamento, check-up, proposta ed esito.',metric:pipelineCases.filter(x=>!['won','lost','closed'].includes(x.stage)).length+' casi aperti',target:'products',tone:'amber'},
    {code:'04',title:'Partner & Compagnie',desc:'Dossier, referenti, documenti, prodotti, condizioni, progetti e opportunità dell’ecosistema.',metric:ecosystem.length+' nodi ecosistema',target:'products',tone:'violet'},
    {code:'05',title:'C.E.P.A.',desc:'Centro, programmi, contenuti, relatori, attività territoriali, SAP e sviluppo del metodo educativo.',metric:activeCepa.length+' attività territoriali aperte',target:'cepa',tone:'sage'},
    {code:'06',title:'Lia · Ricerca & Sviluppo',desc:'Ricerca, analisi, documenti, idee, mapping, artefatti e ordini operativi con regole di autonomia.',metric:liaOrders.length+' ordini · '+researchInsights.length+' insight',target:'liaWorkbench',tone:'teal'}
  ]
  $('planEngineGrid').innerHTML=engines.map(x=>
    '<button type="button" class="plan-engine '+x.tone+'" data-plan-go="'+x.target+'"><div class="plan-engine-code">'+x.code+'</div><div><h4>'+esc(x.title)+'</h4><p>'+esc(x.desc)+'</p><span>'+esc(x.metric)+'</span></div><b>→</b></button>'
  ).join('')
  document.querySelectorAll('[data-plan-go]').forEach(b=>b.onclick=()=>b.dataset.planGo==='cepa'?openCepaHub():navigate(b.dataset.planGo))

  const cycle=[
    ['01','Dati','Import, documenti, fonti e anagrafiche'],
    ['02','Analisi','Trend, bisogni, rischi e opportunità'],
    ['03','Priorità','Che cosa merita attenzione oggi'],
    ['04','Azione','Pratica, contatto, proposta o incontro'],
    ['05','Esito','Risultato, motivazione e follow-up'],
    ['06','Apprendimento','Regole e focus migliorano nel tempo']
  ]
  $('planCycle').innerHTML=cycle.map((x,i)=>
    '<div><b>'+x[0]+'</b><strong>'+x[1]+'</strong><small>'+x[2]+'</small></div>'+(i<cycle.length-1?'<i>→</i>':'')
  ).join('')

  const dataRows=[
    ['Cliente 360',commercialClients.length,commercialClients.length?'Perimetro cliente caricato':'Da importare'],
    ['Portafoglio produttori',portfolioSnapshots.length,portfolioSnapshots.length?'Snapshot rete disponibili':'Da importare'],
    ['Pipeline commerciale',pipelineCases.length,pipelineCases.length?'Casi commerciali presenti':'Da attivare'],
    ['Polizze individuali',clientPolicies.length,clientPolicies.length?'Policy Ledger attivo':'Da importare da AssiEasy'],
    ['Snapshot AssiEasy sede/prodotto',officeSnapshots.length,officeSnapshots.length?'Disponibili':'Da importare'],
    ['Workflow pratiche',officeWorkflow.length,officeWorkflow.length?'Configurato':'Da completare'],
    ['Documenti',documents.length,documents.length?'Archivio attivo':'Da popolare'],
    ['Dossier partner',partnerRequirements.length,partnerRequirements.length?'Requisiti presenti':'Da strutturare'],
    ['Mapping territoriale',marketEntities.length,marketEntities.length?'Mappa attiva':'Da avviare'],
    ['Fonti R&S',researchSources.length,researchSources.length?'Fonti registrate':'Da registrare']
  ]
  $('planDataReadiness').innerHTML=dataRows.map(x=>
    '<div><span>'+esc(x[0])+'</span><strong>'+x[1]+'</strong><small>'+esc(x[2])+'</small><i class="'+(x[1]?'ready':'missing')+'"></i></div>'
  ).join('')

  const roadmap=[
    {phase:'ORA',title:'Rendere operativo il motore commerciale',items:['Cliente 360 sul perimetro realmente importato','Motore Portafoglio su rete e produttori','Pipeline Commerciale unica','Snapshot mensili per sede e prodotto','Pratiche, priorità e scadenze coerenti']},
    {phase:'PROSSIMO',title:'Aumentare profondità e qualità dati',items:['Import portafoglio cliente attivo e polizze','Nuclei familiari e relazioni aziendali','Cross selling e mono ramo a livello cliente','Mapping comunale strutturato','Campagne e kit per ruolo']},
    {phase:'FUTURO',title:'Scalare senza perdere controllo',items:['Nuove sedi e profili','Connettori e import più automatici','Automazioni di ricerca','Benchmark e previsioni operative','Replica controllata del modello territoriale']}
  ]
  $('planRoadmap').innerHTML=roadmap.map((x,i)=>
    '<article class="roadmap-column phase-'+i+'"><span>'+x.phase+'</span><h4>'+esc(x.title)+'</h4>'+x.items.map(y=>'<div>• '+esc(y)+'</div>').join('')+'</article>'
  ).join('')

  $('planResearchSummary').innerHTML=
    '<div><strong>'+expertProtocols.filter(x=>x.status==='active').length+'</strong><span>protocolli attivi</span></div>'+ 
    '<div><strong>'+assetRegistry.filter(x=>x.governance_status==='locked').length+'</strong><span>asset LOCKED</span></div>'+ 
    '<div><strong>'+researchSources.length+'</strong><span>fonti registrate</span></div>'+
    '<div><strong>'+researchInsights.length+'</strong><span>insight raccolti</span></div>'+
    '<div><strong>'+liaAutomationRuns.filter(x=>x.status==='queued').length+'</strong><span>ricerche in coda</span></div>'+
    '<div><strong>'+liaOrders.filter(x=>!['completed','cancelled'].includes(x.status)).length+'</strong><span>ordini aperti</span></div>'

  if($('planDeliveryGrid')){
    const openPipeline=pipelineCases.filter(x=>!['won','lost','closed'].includes(x.stage)).length
    const portfolioClients=portfolioSnapshots.reduce((n,x)=>n+Number(x.clients_count||0),0)
    $('planDeliveryGrid').innerHTML=[
      ['clients','Cliente 360',commercialClients.length+' accessibili · '+clientPolicies.length+' polizze','Identità, contatti, produttore, polizze, pipeline, check-up e prossime azioni nello stesso profilo.'],
      ['portfolio','Motore Portafoglio',portfolioClients+' clienti negli snapshot · '+clientPolicies.length+' polizze individuali','Profondità, polizze/cliente, premi, mix, rinnovi e gap dati senza inventare coperture mancanti.'],
      ['pipeline','Pipeline Commerciale',openPipeline+' casi aperti','Acquisizione, sviluppo, retention e recovery con stadi ed esiti nello stesso motore.']
    ].map(x=>'<button type="button" class="plan-delivery-card" data-commerce-open="'+x[0]+'"><span>'+x[1]+'</span><strong>'+esc(x[2])+'</strong><p>'+esc(x[3])+'</p><b>Apri →</b></button>').join('')
    document.querySelectorAll('[data-commerce-open]').forEach(b=>b.onclick=()=>openCommerceTab(b.dataset.commerceOpen))
  }

  const coverageDomains=[
    {key:'clienti',title:'Clienti & Portafoglio',target:'products',checks:[
      ['Clienti',commercialClients.length],['Polizze',clientPolicies.length],['Check-up',clientCheckups.length],['Interazioni',clientInteractions.length],['Task cliente',clientWorkItems.length]
    ]},
    {key:'sedi',title:'Sedi operative',target:'home',checks:[
      ['Sedi',accessibleOffices().length],['Snapshot mensili',officeSnapshots.length],['Pratiche',officeCases.length],['Import',officeImports.length],['Attività CEPA sede',officeCepaActivities.length]
    ]},
    {key:'rete',title:'Collaboratori & Rete',target:'collaborators',checks:[
      ['Collaboratori',collaborators.length],['Snapshot rete',portfolioSnapshots.length],['Assessment',businessAssessments.length],['Growth kit',growthKits.length],['Candidati futuri',distributionCandidates.length]
    ]},
    {key:'partner',title:'Partner & Prodotti',target:'products',checks:[
      ['Partner',ecosystem.length],['Contatti',contacts.length],['Documenti',documents.length],['Prodotti',products.length],['Knowledge',productKnowledge.length]
    ]},
    {key:'cepa',title:'C.E.P.A.',target:'cepa',checks:[
      ['Materie',subjects.length],['Iniziative',initiatives.length],['Contenuti',cepaContent.length],['Academy',cepaAcademy.length],['Relatori',cepaSpeakers.length]
    ]},
    {key:'ricerca',title:'Ricerca & Sviluppo',target:'liaWorkbench',checks:[
      ['Fonti',researchSources.length],['Insight',researchInsights.length],['Watchlist',distributionWatchlists.length],['Evidenze rete',distributionEvidence.length],['Automazioni',liaAutomationRuns.length]
    ]},
    {key:'governance',title:'Governance & Asset',target:'liaWorkbench',checks:[
      ['Protocolli',expertProtocols.length],['Asset registrati',assetRegistry.length],['Regole Lia',liaActionRules.length],['Progetti',projects.length],['Azioni',actions.length]
    ]}
  ]
  const coverageRows=coverageDomains.map(d=>{
    const done=d.checks.filter(x=>Number(x[1]||0)>0).length
    const pct=Math.round(done/d.checks.length*100)
    return {...d,done,pct}
  })
  const coverageOverall=Math.round(coverageRows.reduce((n,x)=>n+x.pct,0)/coverageRows.length)
  if($('planCoverageOverall'))$('planCoverageOverall').textContent=coverageOverall+'% copertura'
  if($('planCoverageGrid'))$('planCoverageGrid').innerHTML=coverageRows.map(d=>
    '<button type="button" class="plan-coverage-card '+(d.pct===100?'complete':d.pct>=60?'partial':'critical')+'" data-coverage-go="'+d.target+'">'+
      '<div class="plan-coverage-top"><div><span>'+esc(d.key.toUpperCase())+'</span><strong>'+esc(d.title)+'</strong></div><b>'+d.pct+'%</b></div>'+
      '<div class="plan-coverage-bar"><i style="width:'+d.pct+'%"></i></div>'+
      '<div class="plan-coverage-checks">'+d.checks.map(x=>'<span class="'+(x[1]?'ready':'missing')+'">'+esc(x[0])+' <b>'+Number(x[1]||0)+'</b></span>').join('')+'</div>'+
    '</button>'
  ).join('')
  document.querySelectorAll('[data-coverage-go]').forEach(b=>b.onclick=()=>b.dataset.coverageGo==='cepa'?openCepaHub():navigate(b.dataset.coverageGo))

  const recoveryProject=projects.find(x=>x.theme==='system-recovery')
  const recoveryActions=recoveryProject?actions.filter(x=>x.project_id===recoveryProject.id&&!['completed','cancelled'].includes(x.status)):[]
  const priorityRank={urgent:0,high:1,normal:2,low:3}
  recoveryActions.sort((a,b)=>(priorityRank[a.priority]??9)-(priorityRank[b.priority]??9)||new Date(a.created_at)-new Date(b.created_at))
  if($('planRecoveryCount'))$('planRecoveryCount').textContent=recoveryActions.length+' aperte'
  if($('planRecoveryActions'))$('planRecoveryActions').innerHTML=recoveryActions.slice(0,10).map((a,i)=>
    '<button type="button" class="plan-recovery-row" data-view="actions"><b>'+String(i+1).padStart(2,'0')+'</b><div><strong>'+esc(a.title)+'</strong><small>'+esc((a.metadata?.domain||a.lane||'sistema').replaceAll('_',' '))+' · '+esc(a.priority||'normal')+'</small><p>'+esc(a.next_action||a.description||'')+'</p></div><span>→</span></button>'
  ).join('')||empty('Nessuna azione Recovery aperta')

  const pendingCandidates=distributionCandidates.filter(x=>!['archived','rejected'].includes(x.stage))
  const observedInsights=researchInsights.filter(x=>['observed','reviewed'].includes(x.status))
  const activeWatchlists=distributionWatchlists.filter(x=>x.status==='active')
  if($('planFutureCount'))$('planFutureCount').textContent=(pendingCandidates.length+activeWatchlists.length)+' segnali rete'
  if($('planFutureRadar'))$('planFutureRadar').innerHTML=
    '<div class="future-radar-kpis">'+
      '<div><strong>'+collaborators.length+'</strong><span>collaboratori attuali</span></div>'+
      '<div><strong>'+pendingCandidates.length+'</strong><span>candidati futuri</span></div>'+
      '<div><strong>'+activeWatchlists.length+'</strong><span>watchlist attive</span></div>'+
      '<div><strong>'+observedInsights.length+'</strong><span>insight utilizzabili</span></div>'+
    '</div>'+
    '<div class="future-radar-list">'+
      pendingCandidates.slice(0,4).map(x=>'<div><span>RETE</span><strong>'+esc(x.display_name||x.name||'Candidato')+'</strong><small>'+esc([x.city,x.province,x.stage].filter(Boolean).join(' · '))+'</small></div>').join('')+
      observedInsights.slice(0,4).map(x=>'<div><span>R&S</span><strong>'+esc(x.title)+'</strong><small>'+esc(x.category.replaceAll('_',' '))+' · '+esc(x.confidence)+'</small></div>').join('')+
    '</div>'

  $('planGovernance').innerHTML=[
    ['Direzione','Priorità, sedi, autorizzazioni, strategie e decisioni finali'],
    ['Operatori','Lavoro e aggiornamenti della propria sede'],
    ['Specialisti','Prodotti, partner, contenuti e competenze verticali'],
    ['Lia','Ricerca, preparazione, analisi ed esecuzione entro le regole assegnate'],
    ['Asset Governance','LOCKED, REUSE, ADAPT, REBUILD, VERIFY e REJECT proteggono identità e fonti'],
    ['Adaptive Expert','Attiva la competenza necessaria in base a contesto, dati, dispositivo e obiettivo']
  ].map(x=>'<div><strong>'+x[0]+'</strong><span>'+x[1]+'</span></div>').join('')

  let focus={title:'Consolidare il lavoro per prodotto',text:'Porta rinnovi, preventivi, proposte, pratiche ed esiti in un flusso unico e leggibile.',target:'actions'}
  if(!commercialClients.length)focus={title:'Attivare Cliente 360',text:'Importa e collega i clienti reali prima di costruire automazioni commerciali sul portafoglio.',target:'products'}
  else if(!portfolioSnapshots.length)focus={title:'Consolidare il Motore Portafoglio',text:'Servono snapshot verificabili per produttore prima di calcolare profondità e sviluppo rete.',target:'products'}
  else if(!pipelineCases.length)focus={title:'Attivare la Pipeline Commerciale',text:'Collega clienti e opportunità a stadi operativi con responsabilità ed esito.',target:'products'}
  else if(!clientPolicies.length)focus={title:'Importare le polizze individuali',text:'Cliente 360 è pronto: ora serve il dettaglio reale delle polizze AssiEasy per rinnovi, mono-ramo e cross-selling.',target:'products'}
  else if(!officeSnapshots.length)focus={title:'Standardizzare i dati mensili',text:'Il prossimo salto arriva dagli snapshot AssiEasy coerenti per Colico e Mandello.',target:'products'}
  else if(!marketEntities.length)focus={title:'Avviare il mapping territoriale',text:'Costruisci una base qualificata di aziende, professionisti, enti e opportunità per comune.',target:'development'}
  else if(!researchSources.length)focus={title:'Attivare la base R&S',text:'Registra fonti ufficiali e di mercato così Lia può alimentare il progetto con ricerca tracciata.',target:'liaWorkbench'}
  else if(!activeCepa.length)focus={title:'Programmare C.E.P.A. per sede',text:'Porta il metodo CEPA dalla governance centrale a un calendario reale per Colico e Mandello.',target:'cepa'}
  $('planNextFocus').textContent=focus.title
  $('planNextFocusText').textContent=focus.text
  $('planNextFocusBtn').onclick=()=>focus.target==='cepa'?openCepaHub():navigate(focus.target)
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

function isDirectionRole(){
  return ['super_admin','supervisor','manager'].includes(window.userRole)
}
function accessibleOffices(){
  if(isDirectionRole())return marketHubs.filter(x=>x.active!==false)
  const allowed=new Set(officeAssignments.filter(x=>x.user_id===window.userId&&x.active).map(x=>x.hub_id))
  return marketHubs.filter(x=>allowed.has(x.id)&&x.active!==false)
}
function latestSnapshotFor(hubId,productId){
  return officeSnapshots
    .filter(x=>x.hub_id===hubId&&x.product_id===productId)
    .sort((a,b)=>String(b.period_month).localeCompare(String(a.period_month)))[0]||null
}
function latestOfficePeriod(hubId){
  return officeSnapshots.filter(x=>x.hub_id===hubId).map(x=>x.period_month).sort().reverse()[0]||null
}
function officeOpenCases(hubId,productId=null){
  return officeCases.filter(x=>x.hub_id===hubId&&(!productId||x.product_id===productId)&&!['completed','cancelled'].includes(x.status))
}
function officeMessagesFor(hubId=null){
  return officeMessages.filter(x=>(x.hub_id===null||x.hub_id===hubId)&&x.active!==false)
}
function brandForProduct(product){
  const node=ecosystem.find(x=>x.id===product?.ecosystem_node_id)
  return {node,brand:getBrand(node)}
}
function productWorkTypes(product){
  const common={
    mobilita:[['renewal','Rinnovi'],['quote','Preventivi'],['proposal','Proposte'],['practice','Pratiche'],['mono_branch','Mono ramo'],['cross_sell','Cross selling']],
    casa:[['renewal','Rinnovi'],['quote','Preventivi'],['proposal','Proposte'],['practice','Pratiche'],['mono_branch','Mono ramo'],['cross_sell','Cross selling']],
    impresa:[['feasibility','Studi fattibilità'],['quote','Preventivi'],['proposal','Proposte'],['practice','Pratiche'],['renewal','Rinnovi'],['cross_sell','Cross selling']],
    salute:[['feasibility','Analisi bisogno'],['quote','Preventivi'],['proposal','Proposte'],['practice','Pratiche'],['cross_sell','Sviluppo relazione']],
    tutela_legale:[['quote','Preventivi'],['proposal','Proposte'],['practice','Pratiche'],['renewal','Rinnovi'],['cross_sell','Sviluppo relazione']],
    energia:[['feasibility','Analisi fornitura'],['quote','Offerte'],['proposal','Proposte'],['practice','Pratiche'],['cross_sell','Sviluppo relazione']]
  }
  return common[product?.category]||[['proposal','Proposte'],['quote','Preventivi'],['practice','Pratiche'],['cross_sell','Sviluppo relazione']]
}
let currentProductCaseFilter='all'
function fmtMoney(v){
  if(v==null||Number.isNaN(Number(v)))return '—'
  return new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number(v))
}
function fmtMonth(v){
  if(!v)return 'Nessun dato mensile'
  return new Intl.DateTimeFormat('it-IT',{month:'long',year:'numeric'}).format(new Date(v+'T12:00:00'))
}
function monthlySeries(hubId,productId=null){
  const rows=officeSnapshots.filter(x=>x.hub_id===hubId&&(!productId||x.product_id===productId))
  const byMonth={}
  rows.forEach(x=>{
    if(!x.period_month)return
    const item=byMonth[x.period_month]||(byMonth[x.period_month]={premium:0,proposals:0,renewals:0,quotes:0,lost:0})
    item.premium+=Number(x.premium_total||0)
    item.proposals+=Number(x.proposals_count||0)
    item.renewals+=Number(x.renewals_due||0)
    item.quotes+=Number(x.quotes_to_do||0)
    item.lost+=Number(x.lost_count||0)
  })
  return Object.entries(byMonth).sort((a,b)=>a[0].localeCompare(b[0])).slice(-6).map(([month,data])=>({month,...data}))
}
function trendSvg(series,key='premium'){
  if(!series.length)return '<div class="trend-empty"><strong>Dati storici da importare</strong><span>Il grafico apparirà quando saranno disponibili almeno gli snapshot mensili della sede.</span></div>'
  const width=640,height=220,padX=36,padTop=24,padBottom=38
  const values=series.map(x=>Number(x[key]||0))
  const max=Math.max(...values,1)
  const step=series.length>1?(width-padX*2)/(series.length-1):0
  const points=series.map((x,i)=>{
    const px=padX+i*step
    const py=padTop+(1-(Number(x[key]||0)/max))*(height-padTop-padBottom)
    return {x:px,y:py,value:Number(x[key]||0),month:x.month}
  })
  const poly=points.map(p=>p.x.toFixed(1)+','+p.y.toFixed(1)).join(' ')
  const area=poly+' '+(points.at(-1)?.x||padX)+','+(height-padBottom)+' '+(points[0]?.x||padX)+','+(height-padBottom)
  const labels=points.map(p=>'<g><circle cx="'+p.x+'" cy="'+p.y+'" r="5"></circle><text x="'+p.x+'" y="'+(height-13)+'" text-anchor="middle">'+esc(new Intl.DateTimeFormat('it-IT',{month:'short'}).format(new Date(p.month+'T12:00:00')))+'</text></g>').join('')
  return '<div class="trend-svg-wrap"><svg viewBox="0 0 '+width+' '+height+'" role="img" aria-label="Andamento ultimi mesi"><defs><linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--context-accent)" stop-opacity=".22"></stop><stop offset="100%" stop-color="var(--context-accent)" stop-opacity="0"></stop></linearGradient></defs><line class="trend-axis" x1="'+padX+'" y1="'+(height-padBottom)+'" x2="'+(width-padX)+'" y2="'+(height-padBottom)+'"></line><polygon class="trend-area" points="'+area+'"></polygon><polyline class="trend-line" points="'+poly+'"></polyline>'+labels+'</svg><div class="trend-summary"><span>Periodo</span><strong>'+esc(fmtMonth(series[0].month))+' → '+esc(fmtMonth(series.at(-1).month))+'</strong><span>Ultimo valore</span><strong>'+esc(key==='premium'?fmtMoney(values.at(-1)):String(values.at(-1)))+'</strong></div></div>'
}
function workloadVisual(items){
  const max=Math.max(...items.map(x=>Number(x.value||0)),1)
  return items.map(x=>'<div class="workload-row"><div><span>'+esc(x.label)+'</span><strong>'+Number(x.value||0)+'</strong></div><div class="workload-track"><i style="width:'+Math.max(x.value?8:0,Math.round(Number(x.value||0)/max*100))+'%"></i></div></div>').join('')
}
function renderMiniProductionChart(hubId){
  const rows=officeSnapshots.filter(x=>x.hub_id===hubId&&x.premium_total!=null)
  const byMonth={}
  rows.forEach(x=>{byMonth[x.period_month]=(byMonth[x.period_month]||0)+Number(x.premium_total||0)})
  const months=Object.entries(byMonth).sort((a,b)=>a[0].localeCompare(b[0])).slice(-6)
  if(!months.length)return '<div class="production-empty"><strong>Dati mensili non ancora importati</strong><span>Il primo caricamento AssiEasy creerà lo storico della sede.</span></div>'
  const max=Math.max(...months.map(x=>x[1]),1)
  return '<div class="production-chart">'+months.map(([m,v])=>'<div class="production-bar"><span style="height:'+Math.max(8,Math.round(v/max*74))+'px"></span><small>'+esc(new Intl.DateTimeFormat('it-IT',{month:'short'}).format(new Date(m+'T12:00:00')))+'</small><b>'+esc(fmtMoney(v))+'</b></div>').join('')+'</div>'
}

function renderHome(){
  const offices=accessibleOffices()
  $('officeEntryRole').textContent='Accesso: '+String(window.userRole||'utente').replaceAll('_',' ')
  $('officeAccessNote').textContent=isDirectionRole()?'Vista Direzione · tutte le sedi attive':'Solo sedi assegnate al profilo'

  const allOpen=offices.flatMap(h=>officeOpenCases(h.id))
  const urgent=allOpen.filter(x=>['urgent','high'].includes(x.priority))
  const now=Date.now(),next7=now+7*24*60*60*1000
  const deadlines=allOpen.filter(x=>x.due_at&&new Date(x.due_at).getTime()>=now&&new Date(x.due_at).getTime()<=next7)
  const activeMessages=officeMessages.filter(x=>x.active!==false)
  const globalMessage=officeMessagesFor(null)[0]

  $('homePriorityCount').textContent=urgent.length
  $('homeNotificationCount').textContent=activeMessages.length
  $('homeDeadlineCount').textContent=deadlines.length
  $('homeDirectionTitle').textContent=globalMessage?.title||'Nessun messaggio urgente'
  $('homeDirectionText').textContent=globalMessage?.body||'Consulta le comunicazioni interne.'

  const totalPeriod=offices.map(h=>latestOfficePeriod(h.id)).filter(Boolean).sort().reverse()[0]||null
  const totalSnaps=totalPeriod?officeSnapshots.filter(x=>offices.some(h=>h.id===x.hub_id)&&x.period_month===totalPeriod):[]
  const totalPremium=totalSnaps.reduce((n,x)=>n+Number(x.premium_total||0),0)
  const totalPolicies=totalSnaps.reduce((n,x)=>n+Number(x.active_policies||0),0)
  const totalQuotes=totalSnaps.reduce((n,x)=>n+Number(x.quotes_to_do||0),0)

  const cards=[]
  cards.push(
    '<button type="button" class="environment-card agency-card" data-home-action="agency">'+
      '<div class="environment-card-head"><span class="environment-icon">▦</span><div><small>AGENZIA</small><h3>Uffici Maglia 360</h3><p>Il mondo operativo dell’agenzia.</p></div></div>'+
      '<img class="environment-visual" src="'+MAGLIA_MEDIA.officeTeam+'" alt="Ambiente di lavoro Maglia 360">'+
      '<div class="environment-stats">'+
        '<div><strong>'+offices.length+'</strong><span>Sedi attive</span></div>'+
        '<div><strong>'+allOpen.length+'</strong><span>Pratiche aperte</span></div>'+
        '<div><strong>'+totalQuotes+'</strong><span>Preventivi</span></div>'+
        '<div><strong>'+(totalPeriod?esc(fmtMoney(totalPremium)):'—')+'</strong><span>Produzione</span></div>'+
      '</div><span class="environment-cta">Vai agli Uffici Maglia 360 →</span>'+
    '</button>'
  )

  offices.forEach(h=>{
    const period=latestOfficePeriod(h.id)
    const snaps=period?officeSnapshots.filter(x=>x.hub_id===h.id&&x.period_month===period):[]
    const premium=snaps.reduce((n,x)=>n+Number(x.premium_total||0),0)
    const policies=snaps.reduce((n,x)=>n+Number(x.active_policies||0),0)
    const quotes=snaps.reduce((n,x)=>n+Number(x.quotes_to_do||0),0)
    const cases=officeOpenCases(h.id)
    const img=mediaForOffice(h)
    cards.push(
      '<button type="button" class="environment-card office-env-card" data-office-id="'+h.id+'">'+
        '<div class="environment-card-head"><span class="environment-icon pin">⌖</span><div><small>UFFICIO OPERATIVO</small><h3>Ufficio '+esc(h.city)+'</h3><p>'+esc(h.address||'Operatività territoriale')+'</p></div><b class="status-chip">Operativo</b></div>'+
        '<img class="environment-visual" src="'+img+'" alt="Paesaggio del territorio di '+esc(h.city)+'">'+
        '<div class="environment-stats">'+
          '<div><strong>'+policies+'</strong><span>Polizze attive</span></div>'+
          '<div><strong>'+quotes+'</strong><span>Preventivi</span></div>'+
          '<div><strong>'+cases.length+'</strong><span>Pratiche aperte</span></div>'+
          '<div><strong>'+(period?esc(fmtMoney(premium)):'—')+'</strong><span>Produzione</span></div>'+
        '</div><span class="environment-cta">Vai a Ufficio '+esc(h.city)+' →</span>'+
      '</button>'
    )
  })

  if(canOpenView('cepa')){
    const cepaOpen=officeCepaActivities.filter(x=>!['completed','cancelled'].includes(x.status)).length
    const mapped=marketEntities.length
    const nextEvents=officeCepaActivities.filter(x=>x.scheduled_at&&new Date(x.scheduled_at)>=new Date()&&!['completed','cancelled'].includes(x.status)).length
    cards.push(
      '<button type="button" id="cepaWorldCard" class="environment-card cepa-env-card" data-home-action="cepa">'+
        '<div class="environment-card-head"><span class="environment-icon cepa">⌂</span><div><small>PROGETTO TERRITORIALE</small><h3>Progetto C.E.P.A.</h3><p>Centro Educazione Previdenziale e Assicurativa.</p></div><b class="status-chip cepa">In sviluppo</b></div>'+
        '<img class="environment-visual" src="'+MAGLIA_MEDIA.cepaTraining+'" alt="Formazione e confronto C.E.P.A.">'+
        '<div class="environment-stats">'+
          '<div><strong>'+cepaOpen+'</strong><span>Attività aperte</span></div>'+
          '<div><strong>'+mapped+'</strong><span>Soggetti mappati</span></div>'+
          '<div><strong>'+cepaContent.length+'</strong><span>Contenuti</span></div>'+
          '<div><strong>'+nextEvents+'</strong><span>Prossimi eventi</span></div>'+
        '</div><span class="environment-cta">Vai al Progetto C.E.P.A. →</span>'+
      '</button>'
    )
  }
  $('homeEnvironmentCards').innerHTML=cards.join('')

  document.querySelectorAll('#homeEnvironmentCards [data-office-id]').forEach(b=>b.onclick=()=>openOffice(b.dataset.officeId))
  document.querySelectorAll('#homeEnvironmentCards [data-home-action]').forEach(b=>b.onclick=()=>{
    if(b.dataset.homeAction==='cepa')openCepaHub()
    else if(b.dataset.homeAction==='agency')$('directionOverview').scrollIntoView({behavior:'smooth',block:'start'})
  })

  const future=[
    {title:'Nuovo presidio',area:'Territorio lecchese',copy:'Spazio predisposto per una futura sede operativa.'},
    {title:'Nuovo presidio',area:'Alto Lario',copy:'Architettura pronta per estendere servizi e rete.'},
    {title:'Nuovo presidio',area:'Valtellina',copy:'Sviluppo futuro senza confonderlo con sedi già attive.'}
  ]
  $('futureOfficeCards').innerHTML=future.map((x,i)=>
    '<article class="future-office-card"><div class="future-visual '+(i%2?'alt':'')+'"></div><div><span>PROSSIMAMENTE</span><h4>'+esc(x.title)+'</h4><strong>'+esc(x.area)+'</strong><p>'+esc(x.copy)+'</p></div></article>'
  ).join('')

  $('homePriorityList').innerHTML=(urgent.slice(0,5).map(x=>
    '<button type="button" data-priority-office="'+x.hub_id+'"><span class="priority-dot '+esc(x.priority)+'"></span><div><strong>'+esc(x.title)+'</strong><small>'+esc(marketHubs.find(h=>h.id===x.hub_id)?.city||'Sede')+(x.due_at?' · '+esc(fmtDate(x.due_at)):'')+'</small></div><b>›</b></button>'
  ).join('')||'<div class="rail-empty">Nessuna priorità urgente.</div>')
  document.querySelectorAll('[data-priority-office]').forEach(b=>b.onclick=()=>openOffice(b.dataset.priorityOffice))

  $('homeNewsList').innerHTML=(activeMessages.slice(0,4).map(x=>
    '<article><span class="news-marker '+esc(x.message_type||'information')+'"></span><div><strong>'+esc(x.title)+'</strong><p>'+esc(x.body)+'</p><small>'+esc(x.hub_id?(marketHubs.find(h=>h.id===x.hub_id)?.city||'Sede'):'Direzione')+'</small></div></article>'
  ).join('')||'<div class="rail-empty">Nessuna nuova comunicazione interna.</div>')

  if(isDirectionRole()){
    const officeRows=offices.map(h=>{
      const period=latestOfficePeriod(h.id)
      const snaps=period?officeSnapshots.filter(x=>x.hub_id===h.id&&x.period_month===period):[]
      return {
        id:h.id,city:h.city,period,
        premium:snaps.reduce((n,x)=>n+Number(x.premium_total||0),0),
        proposals:snaps.reduce((n,x)=>n+Number(x.proposals_count||0),0),
        renewals:snaps.reduce((n,x)=>n+Number(x.renewals_due||0),0),
        open:officeOpenCases(h.id).length
      }
    })
    const total=officeRows.reduce((a,x)=>({premium:a.premium+x.premium,proposals:a.proposals+x.proposals,renewals:a.renewals+x.renewals,open:a.open+x.open}),{premium:0,proposals:0,renewals:0,open:0})
    $('directionCompareSummary').innerHTML=
      '<div><span>Produzione totale</span><strong>'+esc(total.premium?fmtMoney(total.premium):'Da importare')+'</strong><small>somma sedi attive</small></div>'+
      '<div><span>Proposte</span><strong>'+total.proposals+'</strong><small>mese corrente</small></div>'+
      '<div><span>Rinnovi</span><strong>'+total.renewals+'</strong><small>da lavorare</small></div>'+
      '<div><span>Pratiche aperte</span><strong>'+total.open+'</strong><small>tutte le sedi</small></div>'
    $('directionProduction').innerHTML=officeRows.map(h=>
      '<article><div class="direction-office-title"><div><strong>'+esc(h.city)+'</strong><small>'+esc(fmtMonth(h.period))+'</small></div><button type="button" data-office-id="'+h.id+'">Entra →</button></div>'+
      '<div class="direction-office-kpis"><div><span>Produzione</span><b>'+esc(h.period?fmtMoney(h.premium):'—')+'</b></div><div><span>Proposte</span><b>'+h.proposals+'</b></div><div><span>Rinnovi</span><b>'+h.renewals+'</b></div><div><span>Pratiche</span><b>'+h.open+'</b></div></div>'+renderMiniProductionChart(h.id)+'</article>'
    ).join('')
    $('directionPriorities').innerHTML='<div class="direction-priority-head"><strong>Priorità della rete</strong><span>'+allOpen.length+' aperte</span></div>'+
      (allOpen.slice(0,6).map(x=>'<button type="button" data-office-id="'+x.hub_id+'"><strong>'+esc(x.title)+'</strong><small>'+esc(marketHubs.find(h=>h.id===x.hub_id)?.city||'Sede')+' · '+esc(String(x.case_type).replaceAll('_',' '))+'</small><span>'+esc(x.priority)+'</span></button>').join('')||'<p class="office-muted">Nessuna priorità di sede registrata.</p>')
    $('directionOverview').classList.remove('hidden')
    document.querySelectorAll('#directionOverview [data-office-id]').forEach(b=>b.onclick=()=>openOffice(b.dataset.officeId))
  }else{
    $('directionOverview').classList.add('hidden')
  }

  renderHeaderControls()
}

function renderCepaHub(){
  const holder=$('cepaTerritoryCards')
  if(!holder)return
  const offices=accessibleOffices()
  holder.innerHTML=offices.map(h=>{
    const acts=officeCepaActivities.filter(x=>x.hub_id===h.id)
    const open=acts.filter(x=>!['completed','cancelled'].includes(x.status))
    const next=open.filter(x=>x.scheduled_at).sort((a,b)=>new Date(a.scheduled_at)-new Date(b.scheduled_at))[0]
    const entities=marketEntities.filter(x=>x.hub_id===h.id)
    return '<button class="cepa-territory-card" type="button" data-cepa-hub="'+h.id+'">'+
      '<div class="cepa-territory-photo" style="background-image:linear-gradient(180deg,rgba(10,45,66,.04),rgba(10,45,66,.46)),url(&quot;'+esc(mediaForOffice(h))+'&quot;)"></div>'+
      '<div class="cepa-territory-top"><span>C.E.P.A. · TERRITORIO</span><b>'+esc(h.city)+'</b></div>'+
      '<div class="cepa-territory-kpis"><div><strong>'+open.length+'</strong><small>attività aperte</small></div><div><strong>'+entities.length+'</strong><small>soggetti mappati</small></div></div>'+
      '<p>'+(next?'Prossimo: '+esc(next.title)+(next.scheduled_at?' · '+esc(fmtDateTime(next.scheduled_at)):''):'Programmazione territoriale da sviluppare')+'</p>'+
      '<em>Entra nel territorio →</em>'+
    '</button>'
  }).join('')||'<div class="office-empty"><strong>Nessun territorio accessibile</strong><p>La Direzione deve assegnare almeno una sede al profilo.</p></div>'
  document.querySelectorAll('[data-cepa-hub]').forEach(b=>b.onclick=()=>openCepaTerritory(b.dataset.cepaHub))
}

function openCepaHub(){
  if(!canOpenView('cepa'))return
  currentCepaHubId=null
  currentOfficeId=null
  currentOfficeProductId=null
  setCepaShell(true)
  applyBrandContext(null)
  document.querySelectorAll('.view').forEach(v=>v.classList.add('hidden'))
  $('cepaHubView').classList.remove('hidden')
  setHeader('C.E.P.A.','Centro centrale e attività territoriali')
  window.activeOfficeName='C.E.P.A.'
  if($('liaContextLabel'))$('liaContextLabel').textContent='Contesto: C.E.P.A.'
  renderCepaHub()
  showOfficeQuickActions(false)
  setLiaOpen(false)
  recordRoute({kind:'cepaHub'})
  renderHeaderControls()
  window.scrollTo({top:0,behavior:'smooth'})
}

function openCepaCentral(){
  if(!canOpenView('cepa'))return
  currentCepaHubId=null
  currentOfficeId=null
  currentOfficeProductId=null
  setCepaShell(true)
  document.querySelectorAll('.view').forEach(v=>v.classList.add('hidden'))
  $('cepaView').classList.remove('hidden')
  setHeader('Centro C.E.P.A.','Governance, materie, Academy, contenuti e standard')
  window.activeOfficeName='Centro C.E.P.A.'
  if($('liaContextLabel'))$('liaContextLabel').textContent='Contesto: Centro C.E.P.A.'
  renderCepa()
  showOfficeQuickActions(false)
  setLiaOpen(false)
  recordRoute({kind:'cepaCentral'})
  renderHeaderControls()
  window.scrollTo({top:0,behavior:'smooth'})
}

function openCepaTerritory(hubId){
  if(!canOpenView('cepa'))return
  const hub=accessibleOffices().find(x=>x.id===hubId)
  if(!hub)return
  currentCepaHubId=hubId
  currentOfficeId=hubId
  currentOfficeProductId=null
  setCepaShell(true)
  document.querySelectorAll('.view').forEach(v=>v.classList.add('hidden'))
  $('cepaTerritoryView').classList.remove('hidden')
  $('cepaTerritoryBreadcrumb').textContent='C.E.P.A. '+hub.city
  setHeader('C.E.P.A. '+hub.city,'Attività educative e sviluppo territoriale')
  window.activeOfficeName='C.E.P.A. '+hub.city
  if($('liaContextLabel'))$('liaContextLabel').textContent='Contesto: C.E.P.A. '+hub.city
  renderCepaTerritory()
  showOfficeQuickActions(false)
  setLiaOpen(false)
  recordRoute({kind:'cepaTerritory',id:hubId})
  renderHeaderControls()
  window.scrollTo({top:0,behavior:'smooth'})
}

function renderCepaTerritory(){
  if(!currentCepaHubId)return
  const hub=marketHubs.find(x=>x.id===currentCepaHubId)
  if(!hub)return
  const activities=officeCepaActivities.filter(x=>x.hub_id===hub.id)
  const open=activities.filter(x=>!['completed','cancelled'].includes(x.status))
  const completed=activities.filter(x=>x.status==='completed')
  const entities=marketEntities.filter(x=>x.hub_id===hub.id)
  const classify=x=>String(x.entity_type||'')+' '+(x.tags||[]).join(' ')
  const schools=entities.filter(x=>/school|scuol/i.test(classify(x)))
  const companies=entities.filter(x=>/company|business|impres|azienda/i.test(classify(x)))
  const publicBodies=entities.filter(x=>/public|ente|comune|municip/i.test(classify(x)))

  $('cepaTerritoryIdentity').innerHTML=
    '<div class="cepa-territory-hero-photo" style="background-image:linear-gradient(90deg,rgba(7,40,58,.82),rgba(7,40,58,.24)),url(&quot;'+esc(mediaForOffice(hub))+'&quot;)">'+
      '<div><span>C.E.P.A. · PRESIDIO TERRITORIALE</span><h2>'+esc(hub.city)+'</h2><p>'+esc(hub.address||'')+'</p></div>'+
      '<div class="cepa-territory-badge"><strong>Maglia 360</strong><span>Centro CEPA → territorio</span></div>'+
      '<small class="office-media-credit">'+esc(mediaCreditForOffice(hub))+'</small>'+
    '</div>'

  $('cepaTerritorySummary').innerHTML=
    '<div><span>Attività aperte</span><strong>'+open.length+'</strong><small>programma locale</small></div>'+
    '<div><span>Completate</span><strong>'+completed.length+'</strong><small>storico attività</small></div>'+
    '<div><span>Soggetti mappati</span><strong>'+entities.length+'</strong><small>rete territoriale</small></div>'+
    '<div><span>Scuole / enti</span><strong>'+(schools.length+publicBodies.length)+'</strong><small>potenziali interlocutori</small></div>'

  $('cepaTerritoryActivities').innerHTML=open
    .sort((a,b)=>(a.scheduled_at?new Date(a.scheduled_at):Infinity)-(b.scheduled_at?new Date(b.scheduled_at):Infinity))
    .map(x=>'<div class="cepa-territory-activity"><div><span>'+esc(String(x.activity_type).replaceAll('_',' '))+'</span><strong>'+esc(x.title)+'</strong><small>'+(x.scheduled_at?esc(fmtDateTime(x.scheduled_at)):'Data da definire')+(x.location_name?' · '+esc(x.location_name):'')+'</small></div><b>'+esc(x.status)+'</b></div>').join('')||
    '<div class="office-empty compact"><strong>Nessuna attività ancora programmata</strong><p>Il territorio è pronto per costruire il proprio calendario C.E.P.A.</p></div>'

  $('cepaTerritoryNetwork').innerHTML=
    '<div class="cepa-network-kpis">'+
      '<div><strong>'+companies.length+'</strong><span>Aziende</span></div>'+
      '<div><strong>'+schools.length+'</strong><span>Scuole</span></div>'+
      '<div><strong>'+publicBodies.length+'</strong><span>Enti</span></div>'+
      '<div><strong>'+Math.max(0,entities.length-companies.length-schools.length-publicBodies.length)+'</strong><span>Altri soggetti</span></div>'+
    '</div>'+
    '<div class="cepa-network-list">'+entities.slice(0,6).map(x=>'<div><strong>'+esc(x.name)+'</strong><small>'+esc(x.entity_type||'soggetto')+(x.stage?' · '+esc(x.stage):'')+'</small></div>').join('')+'</div>'
}

function openOffice(id){
  const office=accessibleOffices().find(x=>x.id===id)
  if(!office)return
  currentOfficeId=id
  currentOfficeProductId=null
  currentCepaHubId=null
  setCepaShell(false)
  setOfficeShell(true)
  window.activeOfficeName='Ufficio '+office.city
  applyBrandContext(null)
  document.querySelectorAll('.view').forEach(v=>v.classList.add('hidden'))
  $('officeView').classList.remove('hidden')
  $('officeBreadcrumbName').textContent='Ufficio '+office.city
  setHeader('Ufficio '+office.city,'Sede operativa · '+(office.address||''))
  renderOffice()
  showOfficeQuickActions(true)
  $('newDirectionMessageBtn').classList.toggle('hidden',!isDirectionRole())
  setLiaOpen(false)
  recordRoute({kind:'office',id})
  renderHeaderControls()
  window.scrollTo({top:0,behavior:'smooth'})
}

function renderOffice(){
  if(!currentOfficeId)return
  const office=marketHubs.find(x=>x.id===currentOfficeId)
  if(!office)return
  const period=latestOfficePeriod(office.id)
  const monthSnaps=period?officeSnapshots.filter(x=>x.hub_id===office.id&&x.period_month===period):[]
  const premium=monthSnaps.reduce((n,x)=>n+Number(x.premium_total||0),0)
  const activePolicies=monthSnaps.reduce((n,x)=>n+Number(x.active_policies||0),0)
  const proposals=monthSnaps.reduce((n,x)=>n+Number(x.proposals_count||0),0)
  const renewals=monthSnaps.reduce((n,x)=>n+Number(x.renewals_due||0),0)
  const cases=officeOpenCases(office.id)

  const officePhoto=mediaForOffice(office)
  $('officeIdentity').innerHTML=
    '<div class="office-identity-photo" style="background-image:linear-gradient(90deg,rgba(7,38,58,.88) 0%,rgba(7,38,58,.56) 52%,rgba(7,38,58,.16) 100%),url(&quot;'+esc(officePhoto)+'&quot;)">'+
      '<div class="office-identity-copy"><span>SEDE OPERATIVA · LAGO DI COMO</span><h2>Ufficio '+esc(office.city)+'</h2><p>'+esc(office.address||'Presidio territoriale Maglia 360')+'</p>'+
      '<div class="office-hero-chips"><b>'+activePolicies+' polizze attive</b><b>'+renewals+' rinnovi</b><b>'+cases.length+' pratiche aperte</b></div></div>'+
      '<div class="office-period"><span>Ultimo aggiornamento dati</span><strong>'+esc(fmtMonth(period))+'</strong></div>'+
      '<small class="office-media-credit">'+esc(mediaCreditForOffice(office))+'</small>'+
    '</div>'
  const localMessage=officeMessagesFor(office.id)[0]
  const box=$('officeDirectionMessage')
  if(localMessage){
    box.classList.remove('hidden')
    box.innerHTML='<div><span>DALLA DIREZIONE</span><strong>'+esc(localMessage.title)+'</strong><p>'+esc(localMessage.body)+'</p></div>'
  }else box.classList.add('hidden')

  $('officeSummary').innerHTML=
    '<div><span>Produzione mese</span><strong>'+esc(period?fmtMoney(premium):'Da importare')+'</strong><small>'+esc(fmtMonth(period))+'</small></div>'+
    '<div><span>Polizze attive</span><strong>'+activePolicies+'</strong><small>dati snapshot</small></div>'+
    '<div><span>Proposte mese</span><strong>'+proposals+'</strong><small>tutti i prodotti</small></div>'+
    '<div><span>Rinnovi</span><strong>'+renewals+'</strong><small>in scadenza</small></div>'+
    '<div><span>Pratiche aperte</span><strong>'+cases.length+'</strong><small>lavoro corrente</small></div>'

  const monthQuotes=monthSnaps.reduce((n,x)=>n+Number(x.quotes_to_do||0),0)
  const monthLost=monthSnaps.reduce((n,x)=>n+Number(x.lost_count||0),0)
  const partnerNodes=ecosystem.filter(x=>['HDI','PRIMA_ENEA','SLP','AGLEA','CIP'].includes(x.code)).slice(0,5)
  $('officePartnerStrip').innerHTML='<div class="office-partner-title"><span>ECOSISTEMA</span><strong>Compagnie e partner</strong></div>'+
    partnerNodes.map(n=>{const b=getBrand(n);return '<button type="button" data-office-partner="'+n.id+'" style="--partner-accent:'+esc(b?.accent||'#2b7a6b')+'"><span>'+esc(n.code.replace('_ENEA',''))+'</span><strong>'+esc(n.name)+'</strong><small>'+esc(n.capability||'Partner')+'</small></button>'}).join('')
  document.querySelectorAll('[data-office-partner]').forEach(b=>b.onclick=()=>openPartner(b.dataset.officePartner))

  const focus=officeSmartFocus({period,renewals,quotes:monthQuotes,proposals,cases:cases.length,lost:monthLost})
  $('officeSmartHint').className='office-smart-hint '+focus.tone
  $('officeSmartHint').innerHTML='<div class="smart-orb">L</div><div><span>LIA · FOCUS OPERATIVO</span><strong>'+esc(focus.title)+'</strong><p>'+esc(focus.text)+'</p></div><button type="button" id="officeSmartAction">'+esc(focus.action)+' →</button>'
  $('officeTodayCards').innerHTML=[
    ['Preventivi da fare',monthQuotes,'quote'],
    ['Rinnovi in scadenza',renewals,'renewal'],
    ['Polizze attive',activePolicies,'active'],
    ['Pratiche in lavorazione',cases.length,'practice'],
    ['Pratiche perse',monthLost,'lost'],
    ['Proposte del mese',proposals,'proposal']
  ].map(([label,value,tone])=>'<div class="today-card '+tone+'"><span>'+esc(label)+'</span><strong>'+Number(value||0)+'</strong><i></i></div>').join('')
  $('officeSmartAction').onclick=()=>{ if(focus.action==='Dati mensili')$('newMonthlyDataBtn')?.click(); else document.querySelector('.office-products-section')?.scrollIntoView({behavior:'smooth',block:'start'}) }

  const officeSeries=monthlySeries(office.id)
  $('officeTrendChart').innerHTML=trendSvg(officeSeries,'premium')
  $('officeTrendLabel').textContent=officeSeries.length?officeSeries.length+' mesi disponibili':'Nessuno storico disponibile'
  $('officeWorkloadVisual').innerHTML=workloadVisual([
    {label:'Rinnovi da lavorare',value:renewals},
    {label:'Proposte mese',value:proposals},
    {label:'Preventivi da fare',value:monthQuotes},
    {label:'Pratiche aperte',value:cases.length},
    {label:'Perse nel mese',value:monthLost}
  ])

  $('officeProductBars').innerHTML=products.map(p=>{
    const snap=latestSnapshotFor(office.id,p.id)
    const open=officeOpenCases(office.id,p.id)
    const {node,brand}=brandForProduct(p)
    const accent=brand?.accent||'#0b6f5c'
    return '<button class="office-product-bar" type="button" data-office-product="'+p.id+'" style="--product-accent:'+esc(accent)+'">'+
      '<div class="product-brand-context"><span class="brand-wordmark">'+esc(node?.code||'MAGLIA')+'</span><small>'+esc(node?.name||'Maglia 360')+'</small></div>'+
      '<div class="office-product-name"><strong>'+esc(p.name)+'</strong><span>'+esc(String(p.category||'').replaceAll('_',' '))+'</span></div>'+
      '<div class="product-bar-metrics">'+
        '<div><span>Premi</span><b>'+esc(snap?.premium_total!=null?fmtMoney(snap.premium_total):'—')+'</b></div>'+
        '<div><span>Rinnovi</span><b>'+Number(snap?.renewals_due||0)+'</b></div>'+
        '<div><span>Proposte</span><b>'+Number(snap?.proposals_count||0)+'</b></div>'+
        '<div><span>Preventivi</span><b>'+Number(snap?.quotes_to_do||0)+'</b></div>'+
        '<div><span>Perse</span><b>'+Number(snap?.lost_count||0)+'</b></div>'+
        '<div><span>Mono ramo</span><b>'+Number(snap?.mono_branch_count||0)+'</b></div>'+
        '<div><span>Pratiche</span><b>'+open.length+'</b></div>'+
      '</div><span class="product-enter">Apri →</span></button>'
  }).join('')
  document.querySelectorAll('[data-office-product]').forEach(b=>b.onclick=()=>openOfficeProduct(b.dataset.officeProduct))

  $('officePriorities').innerHTML=cases.slice(0,8).map(x=>'<div class="office-priority-row"><div><strong>'+esc(x.title)+'</strong><small>'+esc(String(x.case_type).replaceAll('_',' '))+(x.due_at?' · '+esc(fmtDate(x.due_at)):'')+'</small></div><span class="priority-tag '+esc(x.priority)+'">'+esc(x.priority)+'</span></div>').join('')||'<p class="office-muted">Nessuna pratica prioritaria registrata.</p>'
  const cepa=officeCepaActivities.filter(x=>x.hub_id===office.id&&!['completed','cancelled'].includes(x.status))
  $('officeCepa').innerHTML=cepa.slice(0,6).map(x=>'<div class="office-cepa-row"><div><strong>'+esc(x.title)+'</strong><small>'+esc(String(x.activity_type).replaceAll('_',' '))+(x.scheduled_at?' · '+esc(fmtDateTime(x.scheduled_at)):'')+'</small></div><span>'+esc(x.status)+'</span></div>').join('')||'<p class="office-muted">Nessuna attività C.E.P.A. ancora registrata per questa sede.</p>'
}

function openOfficeProduct(productId){
  const office=marketHubs.find(x=>x.id===currentOfficeId)
  const product=products.find(x=>x.id===productId)
  if(!office||!product)return
  currentOfficeProductId=productId
  currentProductCaseFilter='all'
  currentCepaHubId=null
  setCepaShell(false)
  setOfficeShell(true)
  const {node}=brandForProduct(product)
  applyBrandContext(node||null)
  document.querySelectorAll('.view').forEach(v=>v.classList.add('hidden'))
  $('officeProductView').classList.remove('hidden')
  $('productOfficeBack').textContent='Ufficio '+office.city
  $('productBreadcrumbName').textContent=product.name
  setHeader(product.name,'Ufficio '+office.city+' · '+(node?.name||'MAGLIA 360'))
  renderOfficeProduct()
  showOfficeQuickActions(true)
  $('newDirectionMessageBtn').classList.toggle('hidden',!isDirectionRole())
  setLiaOpen(false)
  recordRoute({kind:'product',officeId:office.id,id:productId})
  renderHeaderControls()
  window.scrollTo({top:0,behavior:'smooth'})
}

function renderOfficeProduct(){
  if(!currentOfficeId||!currentOfficeProductId)return
  const office=marketHubs.find(x=>x.id===currentOfficeId)
  const product=products.find(x=>x.id===currentOfficeProductId)
  if(!office||!product)return
  const snap=latestSnapshotFor(office.id,product.id)
  const cases=officeOpenCases(office.id,product.id)
  const {node,brand}=brandForProduct(product)
  const accent=brand?.accent||'#0b6f5c'

  const productOfficePhoto=mediaForOffice(office)
  $('productOfficeIdentity').innerHTML='<div class="product-company-band" style="--product-accent:'+esc(accent)+';--office-photo:url(&quot;'+esc(productOfficePhoto)+'&quot;)"><div class="brand-wordmark large">'+esc(node?.code||'MAGLIA')+'</div><div><span>'+esc(node?.name||'MAGLIA 360')+'</span><h2>'+esc(product.name)+'</h2><p>Ufficio '+esc(office.city)+' · '+esc(String(product.category||'').replaceAll('_',' '))+'</p>'+(brand?.officialSite?'<a class="official-brand-link" href="'+esc(brand.officialSite)+'" target="_blank" rel="noopener">Sito ufficiale ↗</a>':'')+'</div></div><div class="office-period"><span>Snapshot</span><strong>'+esc(fmtMonth(snap?.period_month||null))+'</strong></div>'
  $('productOfficeMetrics').innerHTML=
    '<div><span>Premi</span><strong>'+esc(snap?.premium_total!=null?fmtMoney(snap.premium_total):'—')+'</strong></div>'+
    '<div><span>Attive</span><strong>'+Number(snap?.active_policies||0)+'</strong></div>'+
    '<div><span>Rinnovi</span><strong>'+Number(snap?.renewals_due||0)+'</strong></div>'+
    '<div><span>Proposte</span><strong>'+Number(snap?.proposals_count||0)+'</strong></div>'+
    '<div><span>Preventivi da fare</span><strong>'+Number(snap?.quotes_to_do||0)+'</strong></div>'+
    '<div><span>Perse</span><strong>'+Number(snap?.lost_count||0)+'</strong></div>'+
    '<div><span>Mono ramo</span><strong>'+Number(snap?.mono_branch_count||0)+'</strong></div>'+
    '<div><span>Pratiche</span><strong>'+cases.length+'</strong></div>'

  const productSeries=monthlySeries(office.id,product.id)
  $('productTrendChart').innerHTML=trendSvg(productSeries,'premium')
  $('productTrendLabel').textContent=productSeries.length?productSeries.length+' mesi disponibili':'Storico da importare'
  $('productMonthVisual').innerHTML=workloadVisual([
    {label:'Rinnovi',value:Number(snap?.renewals_due||0)},
    {label:'Proposte',value:Number(snap?.proposals_count||0)},
    {label:'Preventivi da fare',value:Number(snap?.quotes_to_do||0)},
    {label:'Perse',value:Number(snap?.lost_count||0)},
    {label:'Mono ramo',value:Number(snap?.mono_branch_count||0)}
  ])

  const typeCounts={}
  cases.forEach(x=>{typeCounts[x.case_type]=(typeCounts[x.case_type]||0)+1})
  const types=productWorkTypes(product)
  const flowTotal=Math.max(1,types.reduce((n,[code])=>n+Number(typeCounts[code]||0),0))
  $('productFlowVisual').innerHTML=types.map(([code,label],idx)=>{
    const count=Number(typeCounts[code]||0)
    const share=Math.round(count/flowTotal*100)
    const stages=officeWorkflow.filter(x=>x.case_type===code).sort((a,b)=>a.sort_order-b.sort_order)
    return '<button type="button" class="product-flow-step" data-case-filter="'+code+'">'+
      '<div class="product-flow-index">'+String(idx+1).padStart(2,'0')+'</div>'+
      '<div class="product-flow-copy"><span>'+esc(label)+'</span><strong>'+count+'</strong><small>'+esc(stages.slice(0,3).map(x=>x.label).join(' → ')||'Workflow attivo')+'</small></div>'+
      '<div class="product-flow-meter"><i style="width:'+Math.max(count?12:0,share)+'%"></i></div>'+
    '</button>'
  }).join('')
  $('productStageBoard').innerHTML=
    '<button type="button" class="product-stage-card '+(currentProductCaseFilter==='all'?'active':'')+'" data-case-filter="all"><span>Tutto il lavoro</span><strong>'+cases.length+'</strong><small>Vista completa del prodotto</small></button>'+
    types.map(([code,label])=>'<button type="button" class="product-stage-card '+(currentProductCaseFilter===code?'active':'')+'" data-case-filter="'+code+'"><span>'+esc(label)+'</span><strong>'+Number(typeCounts[code]||0)+'</strong><small>'+esc(officeWorkflow.filter(x=>x.case_type===code).slice(0,4).map(x=>x.label).join(' · ')||'Workflow configurato')+'</small></button>').join('')
  const renderCaseRows=()=>{
    const visible=currentProductCaseFilter==='all'?cases:cases.filter(x=>x.case_type===currentProductCaseFilter)
    $('productCaseList').innerHTML=visible.map(x=>'<div class="product-case-row"><div><strong>'+esc(x.title)+'</strong><small>'+esc(String(x.case_type).replaceAll('_',' '))+' · '+esc(x.stage_code.replaceAll('_',' '))+(x.due_at?' · '+esc(fmtDate(x.due_at)):'')+'</small></div><span class="priority-tag '+esc(x.priority)+'">'+esc(x.priority)+'</span></div>').join('')||'<div class="office-empty compact"><strong>Nessuna pratica in questo stato</strong><p>Le attività compariranno qui quando verranno registrate.</p></div>'
  }
  document.querySelectorAll('[data-case-filter]').forEach(b=>b.onclick=()=>{
    currentProductCaseFilter=b.dataset.caseFilter
    renderOfficeProduct()
  })
  renderCaseRows()
}

document.querySelectorAll('[data-office-home]').forEach(b=>b.onclick=()=>{
  currentOfficeId=null;currentOfficeProductId=null;currentCepaHubId=null;window.activeOfficeName=null;showOfficeQuickActions(false);setCepaShell(false);applyBrandContext(null);navigate('home')
})
if($('homeEnvironmentPrev'))$('homeEnvironmentPrev').onclick=()=>$('homeEnvironmentCards').scrollBy({left:-420,behavior:'smooth'})
if($('homeEnvironmentNext'))$('homeEnvironmentNext').onclick=()=>$('homeEnvironmentCards').scrollBy({left:420,behavior:'smooth'})
if($('futureOfficePrev'))$('futureOfficePrev').onclick=()=>$('futureOfficeCards').scrollBy({left:-330,behavior:'smooth'})
if($('futureOfficeNext'))$('futureOfficeNext').onclick=()=>$('futureOfficeCards').scrollBy({left:330,behavior:'smooth'})
if($('homePriorityTile'))$('homePriorityTile').onclick=()=>navigate('actions')
if($('homeNotificationTile'))$('homeNotificationTile').onclick=()=>navigate('actions')
if($('homeDeadlineTile'))$('homeDeadlineTile').onclick=()=>navigate('actions')
if($('homeDirectionTile'))$('homeDirectionTile').onclick=()=>document.querySelector('.home-news-list')?.scrollIntoView({behavior:'smooth',block:'center'})
if($('openAllPrioritiesBtn'))$('openAllPrioritiesBtn').onclick=()=>navigate('actions')
if($('openAllNewsBtn'))$('openAllNewsBtn').onclick=()=>navigate('actions')

$('productOfficeBack').onclick=()=>openOffice(currentOfficeId)
$('openCepaCentralBtn').onclick=openCepaCentral
if($('cepaHeroCentralBtn'))$('cepaHeroCentralBtn').onclick=openCepaCentral
if($('cepaHeroTerritoriesBtn'))$('cepaHeroTerritoriesBtn').onclick=()=>document.querySelector('.cepa-structure-grid')?.scrollIntoView({behavior:'smooth',block:'start'})
$('cepaTerritoryBack').onclick=openCepaHub
$('cepaTerritoryNewActivityBtn').onclick=()=>{if(currentCepaHubId){currentOfficeId=currentCepaHubId;openCepaActivityEditor()}}
$('officeCepaOpenBtn').onclick=()=>{if(currentOfficeId)openCepaTerritory(currentOfficeId)}

function showOfficeQuickActions(show){
  const box=$('officeQuickActions')
  if(!box)return
  box.classList.toggle('hidden',!show)
}
function selectedOffice(){
  return marketHubs.find(x=>x.id===currentOfficeId)||null
}
function selectedOfficeProduct(){
  return products.find(x=>x.id===currentOfficeProductId)||null
}
function openDirectionMessageEditor(){
  if(!isDirectionRole())return
  const options=accessibleOffices().map(h=>'<option value="'+h.id+'">'+esc(h.city)+'</option>').join('')
  showModal(
    '<div class="eyebrow">DIREZIONE</div><h2>Nuova comunicazione interna</h2>'+
    '<form id="directionMessageForm" class="form-stack">'+
      '<label>Destinazione<select id="dmHub"><option value="">Tutte le sedi</option>'+options+'</select></label>'+
      '<label>Tipo<select id="dmType"><option value="information">Informazione</option><option value="priority">Priorità</option><option value="commercial">Proposta commerciale</option><option value="cepa">C.E.P.A.</option><option value="administrative">Amministrativa</option><option value="training">Formazione</option></select></label>'+
      '<label>Priorità<select id="dmPriority"><option value="normal">Normale</option><option value="high">Alta</option><option value="urgent">Urgente</option></select></label>'+
      '<label>Titolo<input id="dmTitle" required maxlength="180"></label>'+
      '<label>Messaggio<textarea id="dmBody" rows="5" required></textarea></label>'+
      '<label class="check-line"><input id="dmAck" type="checkbox"> Richiedi presa visione</label>'+
      '<button class="primary" type="submit">Pubblica messaggio</button>'+
    '</form>'
  )
  $('directionMessageForm').onsubmit=async e=>{
    e.preventDefault()
    const row={
      organization_id:window.orgId,
      hub_id:$('dmHub').value||null,
      title:$('dmTitle').value.trim(),
      body:$('dmBody').value.trim(),
      message_type:$('dmType').value,
      priority:$('dmPriority').value,
      requires_ack:$('dmAck').checked,
      created_by:window.userId
    }
    const{error}=await supabase.from('office_direction_messages').insert(row)
    if(error)return alert(error.message)
    closeModal();await loadAll()
  }
}
function openMonthlyDataEditor(productId=currentOfficeProductId){
  const office=selectedOffice()
  const product=products.find(x=>x.id===productId)
  if(!office||!product)return
  const current=latestSnapshotFor(office.id,product.id)
  const month=(current?.period_month||new Date().toISOString().slice(0,7)+'-01').slice(0,7)
  showModal(
    '<div class="eyebrow">DATI MENSILI</div><h2>'+esc(product.name)+' · '+esc(office.city)+'</h2>'+
    '<p class="form-note">Inserimento manuale iniziale. Il parser AssiEasy userà gli stessi campi e conserverà uno snapshot per ogni mese.</p>'+
    '<form id="monthlyDataForm" class="form-stack compact-grid">'+
      '<label>Mese<input id="mdMonth" type="month" value="'+esc(month)+'" required></label>'+
      '<label>Clienti<input id="mdClients" type="number" min="0" value="'+Number(current?.clients_count||0)+'"></label>'+
      '<label>Polizze attive<input id="mdActive" type="number" min="0" value="'+Number(current?.active_policies||0)+'"></label>'+
      '<label>Premi €<input id="mdPremium" type="number" min="0" step="0.01" value="'+Number(current?.premium_total||0)+'"></label>'+
      '<label>Rinnovi da lavorare<input id="mdRenewals" type="number" min="0" value="'+Number(current?.renewals_due||0)+'"></label>'+
      '<label>Rinnovi completati<input id="mdRenewed" type="number" min="0" value="'+Number(current?.renewals_completed||0)+'"></label>'+
      '<label>Proposte<input id="mdProposals" type="number" min="0" value="'+Number(current?.proposals_count||0)+'"></label>'+
      '<label>Preventivi da fare<input id="mdQuotesTodo" type="number" min="0" value="'+Number(current?.quotes_to_do||0)+'"></label>'+
      '<label>Preventivi fatti<input id="mdQuotesDone" type="number" min="0" value="'+Number(current?.quotes_done||0)+'"></label>'+
      '<label>Perse<input id="mdLost" type="number" min="0" value="'+Number(current?.lost_count||0)+'"></label>'+
      '<label>Mono ramo<input id="mdMono" type="number" min="0" value="'+Number(current?.mono_branch_count||0)+'"></label>'+
      '<label>Cross selling<input id="mdCross" type="number" min="0" value="'+Number(current?.cross_sell_opportunities||0)+'"></label>'+
      '<label>Studi fattibilità<input id="mdFeasibility" type="number" min="0" value="'+Number(current?.feasibility_studies||0)+'"></label>'+
      '<label>Pratiche aperte<input id="mdOpenCases" type="number" min="0" value="'+Number(current?.open_cases||0)+'"></label>'+
      '<button class="primary full" type="submit">Salva snapshot mensile</button>'+
    '</form>'
  )
  $('monthlyDataForm').onsubmit=async e=>{
    e.preventDefault()
    const n=id=>Number($(id).value||0)
    const row={
      organization_id:window.orgId,hub_id:office.id,product_id:product.id,
      period_month:$('mdMonth').value+'-01',source_system:'manual',
      clients_count:n('mdClients'),active_policies:n('mdActive'),premium_total:n('mdPremium'),
      renewals_due:n('mdRenewals'),renewals_completed:n('mdRenewed'),proposals_count:n('mdProposals'),
      quotes_to_do:n('mdQuotesTodo'),quotes_done:n('mdQuotesDone'),lost_count:n('mdLost'),
      mono_branch_count:n('mdMono'),cross_sell_opportunities:n('mdCross'),feasibility_studies:n('mdFeasibility'),
      open_cases:n('mdOpenCases'),imported_by:window.userId,updated_at:new Date().toISOString()
    }
    const{error}=await supabase.from('office_product_monthly_snapshots')
      .upsert(row,{onConflict:'organization_id,hub_id,product_id,period_month'})
    if(error)return alert(error.message)
    closeModal();await loadAll();openOfficeProduct(product.id)
  }
}
function openOfficeCaseEditor(){
  const office=selectedOffice(),product=selectedOfficeProduct()
  if(!office||!product)return
  showModal(
    '<div class="eyebrow">NUOVA PRATICA</div><h2>'+esc(product.name)+' · '+esc(office.city)+'</h2>'+
    '<form id="officeCaseForm" class="form-stack">'+
      '<label>Tipo<select id="ocType"><option value="renewal">Rinnovo</option><option value="proposal">Proposta</option><option value="quote">Preventivo</option><option value="feasibility">Studio fattibilità</option><option value="practice">Pratica</option><option value="mono_branch">Mono ramo</option><option value="cross_sell">Cross selling</option><option value="other">Altro</option></select></label>'+
      '<label>Titolo<input id="ocTitle" required maxlength="220"></label>'+
      '<label>Priorità<select id="ocPriority"><option value="normal">Normale</option><option value="high">Alta</option><option value="urgent">Urgente</option><option value="low">Bassa</option></select></label>'+
      '<label>Scadenza<input id="ocDue" type="datetime-local"></label>'+
      '<label>Valore stimato €<input id="ocValue" type="number" min="0" step="0.01"></label>'+
      '<button class="primary" type="submit">Crea pratica</button>'+
    '</form>'
  )
  $('officeCaseForm').onsubmit=async e=>{
    e.preventDefault()
    const type=$('ocType').value
    const firstStage=officeWorkflow.filter(x=>x.case_type===type).sort((a,b)=>a.sort_order-b.sort_order)[0]
    const row={
      organization_id:window.orgId,hub_id:office.id,product_id:product.id,
      case_type:type,stage_code:firstStage?.stage_code||'open',status:'open',
      title:$('ocTitle').value.trim(),priority:$('ocPriority').value,
      due_at:$('ocDue').value?new Date($('ocDue').value).toISOString():null,
      estimated_value:$('ocValue').value?Number($('ocValue').value):null,
      assigned_to:window.userId,created_by:window.userId
    }
    const{error}=await supabase.from('office_product_cases').insert(row)
    if(error)return alert(error.message)
    closeModal();await loadAll();openOfficeProduct(product.id)
  }
}
function openCepaActivityEditor(){
  const office=selectedOffice()
  if(!office)return
  showModal(
    '<div class="eyebrow">C.E.P.A. · '+esc(office.city)+'</div><h2>Nuova attività territoriale</h2>'+
    '<form id="cepaOfficeForm" class="form-stack">'+
      '<label>Tipo<select id="caType"><option value="event">Evento</option><option value="training">Formazione</option><option value="sap">SAP</option><option value="company_meeting">Incontro azienda</option><option value="school">Scuola</option><option value="public_entity">Ente pubblico</option><option value="appointment">Appuntamento</option><option value="content">Contenuto</option><option value="other">Altro</option></select></label>'+
      '<label>Titolo<input id="caTitle" required maxlength="220"></label>'+
      '<label>Descrizione<textarea id="caDescription" rows="4"></textarea></label>'+
      '<label>Data<input id="caDate" type="datetime-local"></label>'+
      '<label>Luogo<input id="caLocation"></label>'+
      '<button class="primary" type="submit">Crea attività C.E.P.A.</button>'+
    '</form>'
  )
  $('cepaOfficeForm').onsubmit=async e=>{
    e.preventDefault()
    const row={
      organization_id:window.orgId,hub_id:office.id,activity_type:$('caType').value,
      title:$('caTitle').value.trim(),description:$('caDescription').value.trim()||null,
      scheduled_at:$('caDate').value?new Date($('caDate').value).toISOString():null,
      location_name:$('caLocation').value.trim()||null,status:'planned',assigned_to:window.userId,created_by:window.userId
    }
    const{error}=await supabase.from('office_cepa_activities').insert(row)
    if(error)return alert(error.message)
    closeModal();await loadAll();openOffice(office.id)
  }
}

async function openOfficeAssignmentsEditor(){
  if(!isDirectionRole())return
  await loadMembers()
  if(!members.length)return alert('Nessun utente assegnabile disponibile.')
  const memberOptions=members.map(m=>'<option value="'+m.user_id+'">'+esc(m.full_name||m.email||m.user_id)+' · '+esc(m.role||'')+'</option>').join('')
  showModal(
    '<div class="eyebrow">DIREZIONE · ACCESSI</div><h2>Assegna le sedi agli utenti</h2>'+
    '<p class="form-note">La persona vedrà la schermata iniziale MAGLIA 360, ma potrà entrare solo negli uffici assegnati. Direzione, supervisor e manager mantengono la vista globale.</p>'+
    '<form id="officeAssignmentForm" class="form-stack">'+
      '<label>Utente<select id="oaUser">'+memberOptions+'</select></label>'+
      '<div id="oaOfficeList" class="office-assignment-list"></div>'+
      '<div class="form-two"><label>Livello<select id="oaLevel"><option value="work">Operativo</option><option value="read">Sola lettura</option><option value="manage">Gestione sede</option></select></label>'+
      '<label>Sede principale<select id="oaPrimary"><option value="">Nessuna</option>'+marketHubs.map(h=>'<option value="'+h.id+'">'+esc(h.city)+'</option>').join('')+'</select></label></div>'+
      '<button class="primary" type="submit">Salva assegnazioni</button>'+
    '</form>'
  )
  const renderAssignments=()=>{
    const uid=$('oaUser').value
    $('oaOfficeList').innerHTML=marketHubs.filter(h=>h.active!==false).map(h=>{
      const found=officeAssignments.find(a=>a.user_id===uid&&a.hub_id===h.id&&a.active)
      return '<label class="office-assignment-item"><input type="checkbox" data-office-assignment="'+h.id+'" '+(found?'checked':'')+'><span><strong>'+esc(h.city)+'</strong><small>'+esc(h.address||'')+'</small></span></label>'
    }).join('')
    const active=officeAssignments.filter(a=>a.user_id===uid&&a.active)
    const primary=active.find(a=>a.is_primary)
    $('oaPrimary').value=primary?.hub_id||''
    const level=active[0]?.access_level
    if(level)$('oaLevel').value=level
  }
  $('oaUser').onchange=renderAssignments
  renderAssignments()
  $('officeAssignmentForm').onsubmit=async e=>{
    e.preventDefault()
    const uid=$('oaUser').value
    const level=$('oaLevel').value
    const primary=$('oaPrimary').value||null
    const selected=new Set([...document.querySelectorAll('[data-office-assignment]:checked')].map(x=>x.dataset.officeAssignment))
    const operations=[]
    for(const h of marketHubs.filter(x=>x.active!==false)){
      const existing=officeAssignments.find(a=>a.user_id===uid&&a.hub_id===h.id)
      if(selected.has(h.id)){
        const row={
          organization_id:window.orgId,hub_id:h.id,user_id:uid,access_level:level,
          is_primary:primary===h.id,active:true,assigned_by:window.userId,updated_at:new Date().toISOString()
        }
        operations.push(supabase.from('office_user_assignments').upsert(row,{onConflict:'organization_id,hub_id,user_id'}))
      }else if(existing?.active){
        operations.push(supabase.from('office_user_assignments').update({active:false,is_primary:false,updated_at:new Date().toISOString()}).eq('id',existing.id))
      }
    }
    const results=await Promise.all(operations)
    const error=results.find(x=>x.error)?.error
    if(error)return alert(error.message)
    closeModal();await loadAll();renderHome()
  }
}

async function openAssiEasyImport(){
  const office=selectedOffice()
  if(!office)return
  showModal(
    '<div class="eyebrow">IMPORT DATI · '+esc(office.city)+'</div><h2>Carica export AssiEasy</h2>'+
    '<p class="form-note">Il file originale viene conservato in area privata e associato a sede e mese. Il primo export reale servirà a definire il mapping automatico senza inventare colonne.</p>'+
    '<form id="assiEasyImportForm" class="form-stack">'+
      '<label>Mese di riferimento<input id="aeMonth" type="month" value="'+new Date().toISOString().slice(0,7)+'" required></label>'+
      '<label>Tipo dati<select id="aeDataKind"><option value="portfolio_monthly">Portafoglio mensile</option><option value="renewals">Rinnovi</option><option value="production">Produzione</option><option value="customers">Clienti</option><option value="other">Altro export</option></select></label>'+
      '<label>File export<input id="aeFile" type="file" accept=".csv,.txt,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv" required></label>'+
      '<div class="import-safety-note"><strong>Nessuna elaborazione distruttiva.</strong><span>Il file viene archiviato; i dati mensili esistenti non vengono cancellati o sovrascritti senza mapping verificato.</span></div>'+
      '<button class="primary" type="submit">Carica e registra</button>'+
    '</form>'
  )
  $('assiEasyImportForm').onsubmit=async e=>{
    e.preventDefault()
    const file=$('aeFile').files?.[0]
    if(!file)return
    if(file.size>26214400)return alert('Il file supera il limite di 25 MB.')
    const ext=(file.name.split('.').pop()||'').toLowerCase()
    if(!['csv','txt','xlsx','xls'].includes(ext))return alert('Formato non supportato. Usa CSV, TXT, XLSX o XLS.')
    try{
      const path=window.orgId+'/'+window.userId+'/office-imports/'+office.id+'/'+Date.now()+'-'+safeLiaFileName(file.name)
      const{error:uploadError}=await supabase.storage.from('lia-workspace').upload(path,file,{contentType:file.type||undefined,upsert:false})
      if(uploadError)throw uploadError
      const row={
        organization_id:window.orgId,hub_id:office.id,period_month:$('aeMonth').value+'-01',
        source_system:'ASSIEASY',data_kind:$('aeDataKind').value,original_name:file.name,
        storage_path:path,status:'uploaded',imported_by:window.userId,
        validation_summary:{file_size:file.size,mime_type:file.type||null,extension:ext,parser_status:'awaiting_verified_mapping'}
      }
      const{error:insertError}=await supabase.from('office_data_imports').insert(row)
      if(insertError){
        try{await supabase.storage.from('lia-workspace').remove([path])}catch(_){}
        throw insertError
      }
      closeModal();await loadAll();openOffice(office.id)
      alert('Export AssiEasy archiviato. Il file è pronto per la definizione del mapping verificato.')
    }catch(error){alert(error?.message||String(error))}
  }
}

$('manageOfficeUsersBtn').onclick=openOfficeAssignmentsEditor
$('newDirectionMessageBtn').onclick=openDirectionMessageEditor
$('importAssiEasyBtn').onclick=openAssiEasyImport
$('newMonthlyDataBtn').onclick=()=>{
  const office=selectedOffice();if(!office)return
  const options=products.map(p=>'<option value="'+p.id+'">'+esc(p.name)+'</option>').join('')
  showModal('<div class="eyebrow">DATI MENSILI</div><h2>Scegli il prodotto</h2><form id="pickMonthlyProduct" class="form-stack"><label>Prodotto<select id="pickProduct">'+options+'</select></label><button class="primary" type="submit">Continua</button></form>')
  $('pickMonthlyProduct').onsubmit=e=>{e.preventDefault();const pid=$('pickProduct').value;closeModal();openMonthlyDataEditor(pid)}
}
$('newCepaActivityBtn').onclick=openCepaActivityEditor
$('newOfficeCaseBtn').onclick=openOfficeCaseEditor

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


function clientDisplayName(c){
  if(!c)return'Cliente'
  return c.business_name||[c.first_name,c.last_name].filter(Boolean).join(' ')||c.last_name||'Cliente'
}
function normalizeMetaList(v){
  if(Array.isArray(v))return v.map(x=>typeof x==='object'?JSON.stringify(x):String(x)).filter(Boolean)
  if(v&&typeof v==='object')return Object.entries(v).map(([k,val])=>typeof val==='object'?k+': '+JSON.stringify(val):k+': '+val)
  if(v==null||v==='')return[]
  return String(v).split(/[;,|]/).map(x=>x.trim()).filter(Boolean)
}
function pipelineLabel(v){return({acquisition:'Acquisizione',development:'Sviluppo',retention:'Retention',recovery:'Recovery'})[v]||v}
function pipelineStageLabel(v){return({selected:'Selezionato',assigned:'Assegnato',contacted:'Contattato',appointment:'Appuntamento',checkup:'Check-up',proposal:'Proposta',won:'Acquisito',lost:'Perso',closed:'Chiuso'})[v]||v}
function currency(v){return v==null||v===''?'—':'€ '+Number(v).toLocaleString('it-IT',{maximumFractionDigits:0})}
function clientPipelineRows(clientId){return pipelineCases.filter(x=>x.client_id===clientId)}
function clientPolicyRows(clientId){return clientPolicies.filter(x=>x.client_id===clientId)}
function policyStatusLabel(v){return({active:'Attiva',expiring:'In scadenza',expired:'Scaduta',cancelled:'Annullata',suspended:'Sospesa',unknown:'Da verificare'})[v]||v}
function policyIsOpen(p){return['active','expiring','unknown'].includes(p.policy_status)}
function daysUntil(v){if(!v)return null;const d=new Date(v+'T12:00:00');return Math.ceil((d-Date.now())/86400000)}
function openCommerceTab(tab='clients'){
  currentCommerceTab=['clients','portfolio','pipeline','catalog'].includes(tab)?tab:'clients'
  navigate('products')
  renderCommerceWorkspace()
}
function setCommerceTab(tab){
  currentCommerceTab=['clients','portfolio','pipeline','catalog'].includes(tab)?tab:'clients'
  document.querySelectorAll('[data-commerce-tab]').forEach(b=>b.classList.toggle('active',b.dataset.commerceTab===currentCommerceTab))
  document.querySelectorAll('[data-commerce-panel]').forEach(p=>p.classList.toggle('hidden',p.dataset.commercePanel!==currentCommerceTab))
}
function renderCommerceWorkspace(){
  if(!$('commerceWorkspaceTabs'))return
  document.querySelectorAll('[data-commerce-tab]').forEach(b=>b.onclick=()=>setCommerceTab(b.dataset.commerceTab))
  if($('client360Search'))$('client360Search').oninput=renderClient360
  if($('client360Status'))$('client360Status').onchange=renderClient360
  if($('client360Producer'))$('client360Producer').onchange=renderClient360
  if($('pipelineTypeFilter'))$('pipelineTypeFilter').onchange=renderCommercialPipeline
  if($('newPipelineCaseBtn'))$('newPipelineCaseBtn').onclick=openNewPipelineCase
  renderClient360()
  renderPortfolioEngine()
  renderCommercialPipeline()
  setCommerceTab(currentCommerceTab)
}
function renderClient360(){
  if(!$('client360Body'))return
  const sourceCount=commercialClients.filter(c=>c.metadata?.recovery_pilot_rank!=null).length
  $('client360Count').textContent=commercialClients.length
  $('client360Active').textContent=commercialClients.filter(c=>c.status==='active').length
  $('client360Lost').textContent=commercialClients.filter(c=>c.status==='lost').length
  $('client360WithPipeline').textContent=new Set(pipelineCases.map(x=>x.client_id)).size
  if($('client360Scope'))$('client360Scope').textContent=sourceCount===commercialClients.length&&commercialClients.length
    ?'Perimetro attuale: '+commercialClients.length+' clienti del pilota Recovery importati da AssiEasy. Non è ancora il portafoglio clienti attivo completo.'
    :'Perimetro attuale: '+commercialClients.length+' clienti accessibili in base a ruolo e dati importati.'

  const producer=$('client360Producer')
  if(producer){
    const current=producer.value
    const names=[...new Set(commercialClients.map(c=>c.metadata?.producer).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'it'))
    producer.innerHTML='<option value="">Tutti i produttori</option>'+names.map(x=>'<option>'+esc(x)+'</option>').join('')
    if(names.includes(current))producer.value=current
  }

  const q=String($('client360Search')?.value||'').trim().toLowerCase()
  const status=$('client360Status')?.value||''
  const prod=$('client360Producer')?.value||''
  const rows=commercialClients.filter(c=>{
    const meta=c.metadata||{}
    const hay=[clientDisplayName(c),c.city,c.province,c.email,c.mobile,meta.producer,meta.producer_code,...normalizeMetaList(meta.final_branches),...normalizeMetaList(meta.final_products)].join(' ').toLowerCase()
    return(!q||hay.includes(q))&&(!status||c.status===status)&&(!prod||meta.producer===prod)
  })
  $('client360Body').innerHTML=rows.map(c=>{
    const meta=c.metadata||{}
    const cases=clientPipelineRows(c.id)
    const policies=clientPolicyRows(c.id)
    const activePolicies=policies.filter(policyIsOpen)
    const active=cases.find(x=>!['won','lost','closed'].includes(x.stage))||cases[0]
    const branches=normalizeMetaList(meta.final_branches)
    const productsMeta=normalizeMetaList(meta.final_products)
    const actualBranches=[...new Set(activePolicies.map(p=>p.branch_name).filter(Boolean))]
    const depth=activePolicies.length||Math.max(branches.length,productsMeta.length)
    const depthNote=activePolicies.length?(activePolicies.length+' polizze · '+(actualBranches.length||'—')+' rami'):(branches.length?branches.slice(0,2).join(' · ')+' · segnale fonte':'dettaglio non disponibile')
    return '<tr data-client360="'+c.id+'"><td><strong>'+esc(clientDisplayName(c))+'</strong><small>'+esc(c.kind==='company'?'Azienda':'Persona')+'</small></td><td>'+esc(c.status||'—')+'</td><td>'+esc(c.city||'—')+(c.province?' <small>'+esc(c.province)+'</small>':'')+'</td><td>'+esc(meta.producer||'—')+'</td><td><strong>'+esc(depth||'—')+'</strong><small>'+esc(depthNote)+'</small></td><td>'+esc(active?pipelineStageLabel(active.stage):'Nessuna')+'</td><td>'+esc(c.next_action||'—')+(c.next_action_at?'<small>'+esc(fmtDateTime(c.next_action_at))+'</small>':'')+'</td><td><button type="button" class="small-btn" data-open-client="'+c.id+'">Apri</button></td></tr>'
  }).join('')||'<tr><td colspan="8"><div class="empty">Nessun cliente corrisponde ai filtri.</div></td></tr>'
  document.querySelectorAll('[data-open-client]').forEach(b=>b.onclick=()=>openClient360(b.dataset.openClient))
}
function renderPortfolioEngine(){
  if(!$('portfolioEngineGrid'))return
  const financial=isManager()
  const totalClients=portfolioSnapshots.reduce((n,x)=>n+Number(x.clients_count||0),0)
  const totalPolicies=portfolioSnapshots.reduce((n,x)=>n+Number(x.policies_count||0),0)
  const totalPremium=portfolioSnapshots.reduce((n,x)=>n+Number(x.premium_total||0),0)
  const ratio=totalClients?totalPolicies/totalClients:0
  const ledgerOpen=clientPolicies.filter(policyIsOpen)
  const ledgerClients=new Set(ledgerOpen.map(x=>x.client_id)).size
  const ledgerPremium=ledgerOpen.reduce((n,x)=>n+Number(x.annual_premium||0),0)
  const renewals90=ledgerOpen.filter(x=>{const d=daysUntil(x.renewal_date||x.expiry_date);return d!=null&&d>=0&&d<=90}).length
  $('portfolioEngineClients').textContent=financial?totalClients:'—'
  $('portfolioEnginePolicies').textContent=financial?totalPolicies:'—'
  $('portfolioEngineRatio').textContent=financial?ratio.toFixed(2):'—'
  $('portfolioEnginePremium').textContent=financial?currency(totalPremium):'Riservato'
  if($('policyLedgerCount'))$('policyLedgerCount').textContent=clientPolicies.length
  if($('policyLedgerClients'))$('policyLedgerClients').textContent=ledgerClients
  if($('policyLedgerRenewals'))$('policyLedgerRenewals').textContent=renewals90
  if($('policyLedgerPremium'))$('policyLedgerPremium').textContent=financial&&ledgerPremium?currency(ledgerPremium):(ledgerPremium?'Riservato':'—')
  if(!financial){
    $('portfolioEngineGrid').innerHTML='<div class="restricted-panel"><strong>Motore Portafoglio riservato alla Direzione</strong><p>Premi, profondità e snapshot produttori seguono i permessi economici già esistenti. Nessun dato viene duplicato in una vista meno protetta.</p></div>'
    $('portfolioMixSummary').innerHTML=''
    return
  }
  $('portfolioEngineGrid').innerHTML=portfolioSnapshots.map(s=>{
    const c=s.agency_collaborators||{}
    const ppc=s.clients_count?Number(s.policies_count||0)/Number(s.clients_count):0
    const avg=s.clients_count&&s.premium_total!=null?Number(s.premium_total)/Number(s.clients_count):null
    const mix=Object.entries(s.portfolio_mix||{}).sort((a,b)=>Number(b[1]||0)-Number(a[1]||0)).slice(0,5)
    return '<article class="portfolio-engine-card '+(c.collaborator_type==='agency_central'?'central':'')+'"><div><span>'+(c.collaborator_type==='agency_central'?'AGENZIA CENTRALE':'PRODUTTORE')+'</span><h4>'+esc(c.display_name||'Rete')+'</h4><small>'+esc(c.territory||s.snapshot_label||'')+'</small></div><div class="portfolio-engine-metrics"><b>'+Number(s.clients_count||0).toLocaleString('it-IT')+'<small>clienti</small></b><b>'+Number(s.policies_count||0).toLocaleString('it-IT')+'<small>polizze</small></b><b>'+ppc.toFixed(2)+'<small>polizze/cliente</small></b><b>'+(avg!=null?currency(avg):'—')+'<small>premio/cliente</small></b></div><div class="portfolio-mini-mix">'+mix.map(([k,v])=>'<span>'+esc(k)+' <strong>'+esc(typeof v==='object'?JSON.stringify(v):v)+'</strong></span>').join('')+'</div><footer><span>Fonte: '+esc(s.source_reference||'snapshot registrato')+'</span><span>'+esc(s.observed_at?fmtDate(s.observed_at):'data non indicata')+'</span></footer></article>'
  }).join('')||empty('Snapshot portafoglio non disponibili.')

  const agg={}
  portfolioSnapshots.forEach(s=>Object.entries(s.portfolio_mix||{}).forEach(([k,v])=>{
    const n=typeof v==='number'?v:Number(v)
    if(Number.isFinite(n))agg[k]=(agg[k]||0)+n
  }))
  const mixes=Object.entries(agg).sort((a,b)=>b[1]-a[1])
  $('portfolioMixSummary').innerHTML=mixes.length
    ?mixes.map(([k,v])=>'<div><span>'+esc(k)+'</span><strong>'+Number(v).toLocaleString('it-IT')+'</strong></div>').join('')
    :'<div class="empty">Il mix aggregato non è disponibile in forma numerica negli snapshot correnti.</div>'
  if($('portfolioDataGap')){
    const coverage=commercialClients.length?Math.round(ledgerClients/commercialClients.length*100):0
    $('portfolioDataGap').innerHTML=clientPolicies.length
      ?'<strong>Copertura Policy Ledger</strong><p>'+clientPolicies.length+' polizze individuali collegate a '+ledgerClients+' clienti accessibili ('+coverage+'% del perimetro cliente corrente). I dati restanti rimangono esplicitamente da importare.</p>'
      :'<strong>Copertura dati attuale</strong><p>Il motore usa '+portfolioSnapshots.length+' snapshot produttori e '+commercialClients.length+' record cliente accessibili. Il Policy Ledger individuale è pronto ma vuoto: serve l’export AssiEasy delle polizze per attivare rinnovi, mono-ramo e cross-selling affidabili.</p>'
  }
}
function renderCommercialPipeline(){
  if(!$('pipelineBoard'))return
  const type=$('pipelineTypeFilter')?.value||''
  const rows=pipelineCases.filter(x=>!type||x.pipeline===type)
  const open=rows.filter(x=>!['won','lost','closed'].includes(x.stage))
  $('pipelineOpenCount').textContent=open.length
  $('pipelineUnassignedCount').textContent=open.filter(x=>!x.assigned_to).length
  $('pipelineCheckupCount').textContent=rows.filter(x=>x.stage==='checkup').length
  const value=open.reduce((n,x)=>n+Number(x.estimated_value||0),0)
  $('pipelineEstimatedValue').textContent=value?currency(value):'—'
  const stages=['selected','assigned','contacted','appointment','checkup','proposal','won','lost','closed']
  $('pipelineBoard').innerHTML=stages.map(stage=>{
    const items=rows.filter(x=>x.stage===stage)
    return '<section class="pipeline-column"><header><span>'+pipelineStageLabel(stage)+'</span><strong>'+items.length+'</strong></header><div>'+items.map(x=>{
      const c=x.clients||commercialClients.find(k=>k.id===x.client_id)||{}
      return '<article class="pipeline-card" data-pipeline-case="'+x.id+'"><div><strong>'+esc(clientDisplayName(c))+'</strong><small>'+esc(pipelineLabel(x.pipeline))+'</small></div><p>'+esc(x.reason||'Motivo da completare')+'</p><footer><span>'+(x.score!=null?'Score '+esc(x.score):'Score —')+'</span><span>'+esc(x.assigned_to?'assegnato':'da assegnare')+'</span></footer>'+(x.estimated_value!=null?'<b>'+currency(x.estimated_value)+'</b>':'')+'</article>'
    }).join('')+(items.length?'':'<div class="pipeline-empty">Nessun caso</div>')+'</div></section>'
  }).join('')
  document.querySelectorAll('[data-pipeline-case]').forEach(b=>b.onclick=()=>openPipelineCase(b.dataset.pipelineCase))
}
function openClient360(id){
  const c=commercialClients.find(x=>x.id===id);if(!c)return
  const meta=c.metadata||{}
  const cases=clientPipelineRows(id)
  const policies=clientPolicyRows(id)
  const checkups=clientCheckups.filter(x=>x.client_id===id)
  const interactions=clientInteractions.filter(x=>x.client_id===id)
  const works=clientWorkItems.filter(x=>x.client_id===id)
  const blockList=(title,arr)=>'<div class="client360-detail-block"><span>'+title+'</span>'+(arr.length?'<div>'+arr.map(x=>'<b>'+esc(x)+'</b>').join('')+'</div>':'<small>Dato non disponibile</small>')+'</div>'
  $('modalContent').innerHTML='<div class="eyebrow">CLIENTE 360</div><h2>'+esc(clientDisplayName(c))+'</h2><p class="muted">'+esc(c.status||'—')+' · '+esc(c.city||'Località non indicata')+(c.province?' ('+esc(c.province)+')':'')+'</p>'+
    '<div class="client360-identity"><div><span>Contatto</span><strong>'+esc(c.mobile||c.email||'Non disponibile')+'</strong><small>'+esc([c.email,c.mobile].filter(Boolean).join(' · ')||'Contatti non valorizzati')+'</small></div><div><span>Produttore</span><strong>'+esc(meta.producer||'Non indicato')+'</strong><small>'+esc(meta.producer_code||'')+'</small></div><div><span>Fonte</span><strong>'+esc(c.source||'AssiEasy / import')+'</strong><small>'+esc(meta.source_snapshot_date?fmtDate(meta.source_snapshot_date):'Data snapshot non disponibile')+'</small></div><div><span>Valore indicativo</span><strong>'+currency(meta.final_premium_indicative)+'</strong><small>solo se presente nella fonte importata</small></div></div>'+
    '<div class="client360-detail-grid">'+blockList('Rami',normalizeMetaList(meta.final_branches))+blockList('Prodotti',normalizeMetaList(meta.final_products))+blockList('Compagnie',normalizeMetaList(meta.final_companies))+blockList('Motivazioni / classe',normalizeMetaList(meta.final_reason_class||meta.final_reasons_raw))+'</div>'+
    '<div class="client-policy-ledger"><div class="modal-section-head"><div><span>POLICY LEDGER</span><h4>Polizze individuali</h4></div>'+(isManager()?'<button type="button" class="primary" id="clientNewPolicyBtn">+ Polizza</button>':'')+'</div>'+
    (policies.length?policies.map(p=>'<button type="button" class="client-policy-row" data-policy-id="'+p.id+'"><div><strong>'+esc(p.policy_number||p.product_name||'Polizza')+'</strong><small>'+esc([p.company_name,p.branch_name,p.product_name].filter(Boolean).join(' · ')||'Dettaglio da completare')+'</small></div><div><span class="policy-status '+esc(p.policy_status)+'">'+esc(policyStatusLabel(p.policy_status))+'</span><b>'+esc(p.annual_premium!=null?currency(p.annual_premium):'—')+'</b><small>'+(p.renewal_date||p.expiry_date?'Rinnovo/scadenza '+esc(fmtDate(p.renewal_date||p.expiry_date)):'Data non disponibile')+'</small></div></button>').join(''):'<div class="policy-empty"><strong>Nessuna polizza individuale importata.</strong><p>I segnali AssiEasy presenti nel profilo non vengono trasformati in polizze fittizie. Il ledger si popola solo con record reali.</p></div>')+'</div>'+
    '<div class="client360-link-grid"><section><header><strong>Pipeline</strong><span>'+cases.length+'</span></header>'+(cases.length?cases.map(x=>'<button type="button" data-modal-pipeline="'+x.id+'"><b>'+esc(pipelineLabel(x.pipeline))+'</b><small>'+esc(pipelineStageLabel(x.stage))+(x.reason?' · '+esc(x.reason):'')+'</small></button>').join(''):'<p>Nessun caso commerciale.</p>')+'</section><section><header><strong>Check-up</strong><span>'+checkups.length+'</span></header>'+(checkups.length?checkups.map(x=>'<div><b>'+esc(x.checkup_type)+'</b><small>'+esc(x.status)+(x.scheduled_at?' · '+esc(fmtDateTime(x.scheduled_at)):'')+'</small></div>').join(''):'<p>Nessun check-up registrato.</p>')+'</section><section><header><strong>Attività</strong><span>'+works.length+'</span></header>'+(works.length?works.slice(0,6).map(x=>'<div><b>'+esc(x.title)+'</b><small>'+esc(x.status)+(x.due_at?' · '+esc(fmtDateTime(x.due_at)):'')+'</small></div>').join(''):'<p>Nessuna attività cliente.</p>')+'</section><section><header><strong>Interazioni</strong><span>'+interactions.length+'</span></header>'+(interactions.length?interactions.slice(0,6).map(x=>'<div><b>'+esc(x.channel)+' · '+esc(x.outcome)+'</b><small>'+esc(fmtDateTime(x.occurred_at))+'</small></div>').join(''):'<p>Nessuna interazione registrata.</p>')+'</section></div>'+
    '<div class="modal-section"><div class="modal-section-head"><h4>Prossimo passo</h4><button type="button" class="primary" id="clientNewPipelineBtn">+ Opportunità</button></div><p>'+esc(c.next_action||'Nessuna prossima azione registrata.')+(c.next_action_at?' · '+esc(fmtDateTime(c.next_action_at)):'')+'</p></div>'
  $('modal').classList.remove('hidden')
  document.querySelectorAll('[data-modal-pipeline]').forEach(b=>b.onclick=()=>openPipelineCase(b.dataset.modalPipeline))
  document.querySelectorAll('[data-policy-id]').forEach(b=>b.onclick=()=>openPolicyEditor(id,b.dataset.policyId))
  if($('clientNewPolicyBtn'))$('clientNewPolicyBtn').onclick=()=>openPolicyEditor(id,null)
  $('clientNewPipelineBtn').onclick=()=>openNewPipelineCase(id)
}
function openPolicyEditor(clientId,policyId=null){
  const c=commercialClients.find(x=>x.id===clientId);if(!c)return
  const p=policyId?clientPolicies.find(x=>x.id===policyId):null
  const editable=isManager()
  $('modalContent').innerHTML='<div class="eyebrow">POLICY LEDGER</div><h2>'+esc(p?'Polizza '+(p.policy_number||''):'Nuova polizza')+'</h2><p class="muted">'+esc(clientDisplayName(c))+'</p><form id="policyForm" class="form"><div class="inline"><label>Numero polizza<input id="polNumber" value="'+esc(p?.policy_number||'')+'"></label><label>Stato<select id="polStatus"><option value="active">Attiva</option><option value="expiring">In scadenza</option><option value="expired">Scaduta</option><option value="cancelled">Annullata</option><option value="suspended">Sospesa</option><option value="unknown">Da verificare</option></select></label></div><div class="inline"><label>Ramo<input id="polBranch" value="'+esc(p?.branch_name||'')+'"></label><label>Prodotto<input id="polProductName" value="'+esc(p?.product_name||'')+'"></label></div><div class="inline"><label>Compagnia<input id="polCompany" value="'+esc(p?.company_name||'')+'"></label><label>Premio annuo €<input id="polPremium" type="number" min="0" step="0.01" value="'+esc(p?.annual_premium??'')+'"></label></div><div class="inline"><label>Decorrenza<input id="polStart" type="date" value="'+esc(p?.start_date||'')+'"></label><label>Scadenza<input id="polExpiry" type="date" value="'+esc(p?.expiry_date||'')+'"></label></div><div class="inline"><label>Rinnovo<input id="polRenewal" type="date" value="'+esc(p?.renewal_date||'')+'"></label><label>Produttore<input id="polProducer" value="'+esc(p?.producer_name||c.metadata?.producer||'')+'"></label></div><label>Riferimento fonte<input id="polSource" value="'+esc(p?.source_reference||'')+'" placeholder="Export AssiEasy / riferimento verificabile"></label>'+(editable?'<button type="submit" class="primary">Salva polizza</button>':'<p class="form-note">Polizza in sola lettura per questo profilo.</p>')+'</form>'
  $('polStatus').value=p?.policy_status||'active'
  if(!editable)document.querySelectorAll('#policyForm input,#policyForm select').forEach(x=>x.disabled=true)
  $('modal').classList.remove('hidden')
  if(editable)$('policyForm').onsubmit=async e=>{
    e.preventDefault()
    const row={organization_id:window.orgId,client_id:clientId,policy_number:$('polNumber').value.trim()||null,policy_status:$('polStatus').value,branch_name:$('polBranch').value.trim()||null,product_name:$('polProductName').value.trim()||null,company_name:$('polCompany').value.trim()||null,annual_premium:$('polPremium').value?Number($('polPremium').value):null,start_date:$('polStart').value||null,expiry_date:$('polExpiry').value||null,renewal_date:$('polRenewal').value||null,producer_name:$('polProducer').value.trim()||null,producer_code:c.metadata?.producer_code||p?.producer_code||null,source_system:p?.source_system||'MANUAL',source_reference:$('polSource').value.trim()||null,metadata:{...(p?.metadata||{}),updated_via:'maglia360_policy_editor'},updated_at:new Date().toISOString()}
    let result
    if(p)result=await supabase.from('client_policies').update(row).eq('id',p.id).eq('organization_id',window.orgId)
    else result=await supabase.from('client_policies').insert(row)
    if(result.error)return alert(result.error.message)
    await loadAll();openClient360(clientId)
  }
}
function openNewPipelineCase(clientId=null){
  const available=commercialClients
  if(!available.length)return alert('Nessun cliente accessibile da collegare alla pipeline.')
  $('modalContent').innerHTML='<div class="eyebrow">PIPELINE COMMERCIALE</div><h2>Nuova opportunità</h2><form id="pipelineNewForm" class="form"><label>Cliente<select id="pcClient">'+available.map(c=>'<option value="'+c.id+'">'+esc(clientDisplayName(c))+'</option>').join('')+'</select></label><div class="inline"><label>Pipeline<select id="pcType"><option value="acquisition">Acquisizione</option><option value="development">Sviluppo</option><option value="retention">Retention</option><option value="recovery">Recovery</option></select></label><label>Stadio<select id="pcStage"><option value="selected">Selezionato</option><option value="assigned">Assegnato</option><option value="contacted">Contattato</option><option value="appointment">Appuntamento</option><option value="checkup">Check-up</option><option value="proposal">Proposta</option></select></label></div><label>Motivo / bisogno<textarea id="pcReason" required></textarea></label><label>Valore stimato<input id="pcValue" type="number" min="0" step="0.01"></label><button type="submit" class="primary">Crea opportunità</button></form>'
  if(clientId)$('pcClient').value=clientId
  $('modal').classList.remove('hidden')
  $('pipelineNewForm').onsubmit=async e=>{
    e.preventDefault()
    const row={organization_id:window.orgId,client_id:$('pcClient').value,pipeline:$('pcType').value,stage:$('pcStage').value,assigned_to:window.userId,estimated_value:$('pcValue').value?Number($('pcValue').value):null,reason:$('pcReason').value.trim(),metadata:{source:'maglia360_pipeline_ui'}}
    const{error}=await supabase.from('pipeline_cases').insert(row)
    if(error)return alert(error.message)
    closeModal();await loadAll();openCommerceTab('pipeline')
  }
}
function openPipelineCase(id){
  const x=pipelineCases.find(p=>p.id===id);if(!x)return
  const c=x.clients||commercialClients.find(k=>k.id===x.client_id)||{}
  const canEdit=isManager()||x.assigned_to===window.userId
  const works=clientWorkItems.filter(w=>w.pipeline_case_id===id)
  const checks=clientCheckups.filter(k=>k.client_id===x.client_id)
  $('modalContent').innerHTML='<div class="eyebrow">PIPELINE COMMERCIALE</div><h2>'+esc(clientDisplayName(c))+'</h2><p class="muted">'+esc(pipelineLabel(x.pipeline))+' · '+esc(pipelineStageLabel(x.stage))+'</p><form id="pipelineEditForm" class="form"><div class="inline"><label>Stadio<select id="peStage">'+['selected','assigned','contacted','appointment','checkup','proposal','won','lost','closed'].map(v=>'<option value="'+v+'">'+pipelineStageLabel(v)+'</option>').join('')+'</select></label><label>Valore stimato<input id="peValue" type="number" min="0" step="0.01" value="'+esc(x.estimated_value??'')+'"></label></div><label>Motivo / bisogno<textarea id="peReason">'+esc(x.reason||'')+'</textarea></label>'+(canEdit?'<button type="submit" class="primary">Aggiorna pipeline</button>':'<p class="form-note">Caso in sola lettura per questo profilo.</p>')+'</form><div class="pipeline-case-actions"><button type="button" class="secondary" id="pipelineWorkBtn">+ Attività</button><button type="button" class="secondary" id="pipelineCheckupBtn">Programma Check-up</button><button type="button" class="secondary" id="pipelineClientBtn">Apri Cliente 360</button></div><div class="two-col top-gap"><div class="prose-box"><strong>Attività collegate</strong><p>'+(works.length?works.map(w=>esc(w.title)+' · '+esc(w.status)).join('<br>'):'Nessuna attività.')+'</p></div><div class="prose-box"><strong>Check-up cliente</strong><p>'+(checks.length?checks.map(k=>esc(k.status)+(k.scheduled_at?' · '+esc(fmtDateTime(k.scheduled_at)):'')).join('<br>'):'Nessun check-up.')+'</p></div></div>'
  $('peStage').value=x.stage
  if(!canEdit){$('peStage').disabled=true;$('peValue').disabled=true;$('peReason').disabled=true}
  $('modal').classList.remove('hidden')
  if(canEdit)$('pipelineEditForm').onsubmit=async e=>{
    e.preventDefault()
    const stage=$('peStage').value
    const patch={stage,estimated_value:$('peValue').value?Number($('peValue').value):null,reason:$('peReason').value.trim()||null,closed_at:['won','lost','closed'].includes(stage)?(x.closed_at||new Date().toISOString()):null,updated_at:new Date().toISOString()}
    const{error}=await supabase.from('pipeline_cases').update(patch).eq('id',id).eq('organization_id',window.orgId)
    if(error)return alert(error.message)
    closeModal();await loadAll();openCommerceTab('pipeline')
  }
  $('pipelineWorkBtn').onclick=()=>openPipelineWorkItem(id)
  $('pipelineCheckupBtn').onclick=()=>openPipelineCheckup(id)
  $('pipelineClientBtn').onclick=()=>openClient360(x.client_id)
}
function openPipelineWorkItem(caseId){
  const x=pipelineCases.find(p=>p.id===caseId);if(!x)return
  $('modalContent').innerHTML='<div class="eyebrow">ATTIVITÀ CLIENTE</div><h2>Nuovo follow-up commerciale</h2><form id="pipelineWorkForm" class="form"><label>Titolo<input id="pwTitle" value="Follow-up '+esc(pipelineLabel(x.pipeline))+'" required></label><label>Descrizione<textarea id="pwDesc">'+esc(x.reason||'')+'</textarea></label><div class="inline"><label>Priorità<select id="pwPriority"><option value="normal">Normale</option><option value="high">Alta</option><option value="urgent">Urgente</option><option value="low">Bassa</option></select></label><label>Scadenza<input id="pwDue" type="datetime-local"></label></div><button type="submit" class="primary">Crea attività</button></form>'
  $('modal').classList.remove('hidden')
  $('pipelineWorkForm').onsubmit=async e=>{
    e.preventDefault()
    const row={organization_id:window.orgId,client_id:x.client_id,pipeline_case_id:x.id,assigned_to:window.userId,created_by:window.userId,work_type:'commercial_followup',title:$('pwTitle').value.trim(),description:$('pwDesc').value.trim()||null,priority:$('pwPriority').value,status:'open',due_at:$('pwDue').value?new Date($('pwDue').value).toISOString():null,metadata:{source:'maglia360_pipeline_ui'}}
    const{error}=await supabase.from('work_items').insert(row)
    if(error)return alert(error.message)
    await loadAll();openPipelineCase(caseId)
  }
}
function openPipelineCheckup(caseId){
  const x=pipelineCases.find(p=>p.id===caseId);if(!x)return
  $('modalContent').innerHTML='<div class="eyebrow">CHECK-UP MAGLIA 360</div><h2>Programma check-up</h2><form id="pipelineCheckupForm" class="form"><label>Data e ora<input id="pcheckAt" type="datetime-local" required></label><label>Nota iniziale<textarea id="pcheckSummary">'+esc(x.reason||'')+'</textarea></label><button type="submit" class="primary">Programma</button></form>'
  $('modal').classList.remove('hidden')
  $('pipelineCheckupForm').onsubmit=async e=>{
    e.preventDefault()
    const row={organization_id:window.orgId,client_id:x.client_id,advisor_user_id:window.userId,checkup_type:'maglia_360',status:'scheduled',scheduled_at:new Date($('pcheckAt').value).toISOString(),summary:$('pcheckSummary').value.trim()||null}
    const{error}=await supabase.from('checkups').insert(row)
    if(error)return alert(error.message)
    const upd=await supabase.from('pipeline_cases').update({stage:'checkup',updated_at:new Date().toISOString()}).eq('id',caseId).eq('organization_id',window.orgId)
    if(upd.error)return alert(upd.error.message)
    await loadAll();openPipelineCase(caseId)
  }
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


function currentDeviceProfile(){
  const w=Math.round(window.innerWidth||document.documentElement.clientWidth||0)
  const h=Math.round(window.innerHeight||document.documentElement.clientHeight||0)
  const device=w<600?'phone':w<1024?'tablet':w<1800?'desktop':'large_display'
  const orientation=w>=h?'landscape':'portrait'
  let input='unknown'
  try{
    const touch=matchMedia('(pointer: coarse)').matches
    const mouse=matchMedia('(pointer: fine)').matches
    input=touch&&mouse?'mixed':touch?'touch':mouse?'mouse':'unknown'
  }catch(_){}
  return{device_class:device,viewport_width:w,viewport_height:h,orientation,input_mode:input}
}
function recordUxEvent(eventType,viewKey,actionKey=null,success=null,metadata={}){
  if(!window.orgId||!window.userId)return
  const row={organization_id:window.orgId,user_id:window.userId,view_key:viewKey||'unknown',action_key:actionKey,event_type:eventType,...currentDeviceProfile(),success,metadata}
  supabase.from('ux_usage_events').insert(row).then(({error})=>{if(error&&error.code!=='42501')console.warn('UX telemetry',error.message)})
}
function orchestratorProtocol(){return expertProtocols.find(x=>x.code==='adaptive_master')||expertProtocols[0]||null}
function governanceLabel(v){return({locked:'LOCKED',reuse:'REUSE',adapt:'ADAPT',rebuild:'REBUILD',verify:'VERIFY',reject:'REJECT'})[v]||String(v||'VERIFY').toUpperCase()}

function renderLiaWorkbench(){
  if(!$('liaCapabilityList'))return
  const levelLabel={admin:'Amministrazione ed esecuzione',execute:'Esecuzione autorizzata',prepare:'Preparazione e proposta',support:'Supporto al ruolo'}
  $('liaRoleMode').textContent=(window.userRole||'viewer').replaceAll('_',' ')+' · '+(isManager()?'esecuzione operativa':'supporto per ruolo')
  const protocol=orchestratorProtocol()
  if($('liaProtocolStatus'))$('liaProtocolStatus').textContent=protocol?'v'+protocol.version+' · '+protocol.status:'non configurato'
  if($('liaProtocolDecision'))$('liaProtocolDecision').innerHTML=protocol?(protocol.decision_order||[]).map((x,i)=>'<div><b>'+(i+1)+'</b><span>'+esc(x)+'</span></div>').join(''):empty('Protocollo non disponibile')
  if($('liaProtocolRules'))$('liaProtocolRules').innerHTML=protocol?(protocol.locked_principles||[]).map(x=>'<div class="lia-protocol-rule"><span>✓</span><p>'+esc(x)+'</p></div>').join(''):empty('Nessuna regola bloccata')

  if($('liaAssetCount'))$('liaAssetCount').textContent=assetRegistry.length+' asset'
  if($('liaAssetRegistry'))$('liaAssetRegistry').innerHTML=assetRegistry.map(a=>'<div class="lia-asset-row"><div><strong>'+esc(a.asset_name)+'</strong><small>'+esc(a.asset_type.replaceAll('_',' '))+' · '+esc(a.project_scope)+(a.repository_path?' · '+esc(a.repository_path):'')+'</small></div><span class="asset-state '+esc(a.governance_status)+'">'+esc(governanceLabel(a.governance_status))+'</span></div>').join('')||empty('Registro pronto. Nessun asset canonico ancora censito.')

  if($('liaUxSummary')){
    const byDevice=uxUsageEvents.reduce((m,x)=>(m[x.device_class]=(m[x.device_class]||0)+1,m),{})
    const viewEvents=uxUsageEvents.filter(x=>x.event_type==='view')
    const popular=Object.entries(viewEvents.reduce((m,x)=>(m[x.view_key]=(m[x.view_key]||0)+1,m),{})).sort((a,b)=>b[1]-a[1]).slice(0,5)
    $('liaUxSummary').innerHTML=isManager()?'<div><strong>'+uxUsageEvents.length+'</strong><span>eventi recenti</span></div><div><strong>'+esc(Object.entries(byDevice).map(([k,v])=>k+' '+v).join(' · ')||'—')+'</strong><span>dispositivi</span></div><div><strong>'+esc(popular.map(([k,v])=>k+' '+v).join(' · ')||'—')+'</strong><span>viste più usate</span></div>':'<div class="empty">Telemetria aggregata riservata alla Direzione.</div>'
  }

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


function renderAccessAdmin(){
  if(!$('accessRequestList'))return
  if(!isAccessApprover()){
    $('accessRequestList').innerHTML=empty('Area riservata all’amministratore autorizzato.')
    $('commercialLeadList').innerHTML=''
    return
  }
  const pending=accessRequests.filter(x=>x.status==='pending')
  $('accessPendingCount').textContent=pending.length
  $('accessActivatedCount').textContent=accessRequests.filter(x=>x.status==='activated').length
  $('commercialLeadNewCount').textContent=commercialLeads.filter(x=>x.status==='new').length
  $('sponsorLeadCount').textContent=commercialLeads.filter(x=>['sponsor','partner'].includes(x.lead_type)&&!['closed','lost'].includes(x.status)).length
  if($('showcaseTotalCount'))$('showcaseTotalCount').textContent=publicShowcase.length
  if($('showcasePublishedCount'))$('showcasePublishedCount').textContent=publicShowcase.filter(x=>x.published).length
  if($('showcaseFeaturedCount'))$('showcaseFeaturedCount').textContent=publicShowcase.filter(x=>x.featured).length
  if($('showcaseVisualCount'))$('showcaseVisualCount').textContent=publicShowcase.filter(x=>x.visual_url).length

  $('accessRequestList').innerHTML=accessRequests.map(r=>
    '<article class="access-request-card '+esc(r.status)+'"><div class="access-request-head"><div><strong>'+esc(r.full_name)+'</strong><small>'+esc(r.email)+' · '+esc(r.phone)+'</small></div><span>'+esc(r.status.replaceAll('_',' '))+'</span></div>'+
    (r.company_name?'<p><b>Realtà:</b> '+esc(r.company_name)+'</p>':'')+
    (r.request_reason?'<p>'+esc(r.request_reason)+'</p>':'')+
    '<footer><small>'+esc(fmtDateTime(r.created_at))+'</small>'+
    (r.status==='pending'?'<div><select data-access-role="'+r.id+'"><option value="viewer">Viewer</option><option value="operator">Operatore</option><option value="specialist">Specialista</option></select><button type="button" class="small-btn" data-access-approve="'+r.id+'">Approva</button><button type="button" class="small-btn danger" data-access-reject="'+r.id+'">Rifiuta</button></div>':r.status==='approved_pending_activation'?'<div><span>'+esc(r.assigned_role||'')+'</span><button type="button" class="small-btn" data-access-resend="'+r.id+'">Reinvia attivazione</button></div>':'<span>'+esc(r.assigned_role||'')+'</span>')+
    '</footer></article>'
  ).join('')||empty('Nessuna richiesta di accesso.')

  document.querySelectorAll('[data-access-approve]').forEach(b=>b.onclick=()=>{
    const role=document.querySelector('[data-access-role="'+b.dataset.accessApprove+'"]')?.value||'viewer'
    manageAccessRequest(b.dataset.accessApprove,'approve',role)
  })
  document.querySelectorAll('[data-access-reject]').forEach(b=>b.onclick=()=>manageAccessRequest(b.dataset.accessReject,'reject'))
  document.querySelectorAll('[data-access-resend]').forEach(b=>b.onclick=()=>manageAccessRequest(b.dataset.accessResend,'resend_activation'))

  $('commercialLeadList').innerHTML=commercialLeads.map(l=>{
    const linkedAction=actions.find(a=>a.metadata?.public_commercial_lead_id===l.id)
    return '<article class="commercial-lead-card"><div class="access-request-head"><div><strong>'+esc(l.company_name||l.full_name)+'</strong><small>'+esc(l.full_name)+' · '+esc(l.email)+' · '+esc(l.phone)+'</small></div><span>'+esc(l.lead_type)+'</span></div>'+
    (l.interest_area?'<p><b>Interesse:</b> '+esc(l.interest_area)+'</p>':'')+
    (l.message?'<p>'+esc(l.message)+'</p>':'')+
    '<footer><small>'+esc(fmtDateTime(l.created_at))+(linkedAction?' · attività collegata':'')+'</small><div class="lead-footer-actions"><select data-lead-status="'+l.id+'"><option value="new">Nuovo</option><option value="contacted">Contattato</option><option value="qualified">Qualificato</option><option value="opportunity">Opportunità</option><option value="closed">Chiuso</option><option value="lost">Perso</option></select>'+(linkedAction?'<button type="button" class="small-btn" data-lead-action="'+linkedAction.id+'">Apri attività</button>':'')+'</div></footer></article>'
  }).join('')||empty('Nessun contatto commerciale dalla vetrina.')
  document.querySelectorAll('[data-lead-status]').forEach(sel=>{
    const row=commercialLeads.find(x=>x.id===sel.dataset.leadStatus);if(row)sel.value=row.status
    sel.onchange=()=>updateCommercialLead(sel.dataset.leadStatus,sel.value)
  })
  document.querySelectorAll('[data-lead-action]').forEach(b=>b.onclick=()=>{navigate('actions');setTimeout(()=>openAction(b.dataset.leadAction),80)})
  renderShowcaseManager()
}


function showcaseAssetUrl(a){
  if(!a)return''
  if(a.source_url)return a.source_url
  const p=String(a.repository_path||'')
  const prefix='cepa-maglia-os-static/'
  return p.startsWith(prefix)?'./'+p.slice(prefix.length):''
}
function renderShowcaseManager(){
  if(!$('showcaseManagerList')||!isAccessApprover())return
  $('newShowcaseItemBtn').onclick=()=>openShowcaseEditor(null)
  $('showcaseManagerList').innerHTML=publicShowcase.map(x=>
    '<article class="showcase-manager-card '+(x.published?'published':'draft')+'">'+
      (x.visual_url?'<div class="showcase-manager-thumb"><img src="'+esc(x.visual_url)+'" alt=""></div>':'<div class="showcase-manager-thumb empty-thumb">M360</div>')+
      '<div class="showcase-manager-copy"><div><span>'+esc(x.category)+' · ordine '+esc(x.sort_order)+'</span><h4>'+esc(x.title)+'</h4><p>'+esc(x.summary)+'</p></div>'+
      '<div class="showcase-manager-tags"><b>'+(x.published?'PUBBLICATA':'NASCOSTA')+'</b>'+(x.featured?'<b>IN EVIDENZA</b>':'')+'<small>'+esc(x.audience||'')+'</small></div></div>'+
      '<button type="button" class="small-btn" data-showcase-edit="'+x.id+'">Modifica</button>'+
    '</article>'
  ).join('')||empty('Nessuna proposta pubblica.')
  document.querySelectorAll('[data-showcase-edit]').forEach(b=>b.onclick=()=>openShowcaseEditor(b.dataset.showcaseEdit))
}
function openShowcaseEditor(id=null){
  if(!isAccessApprover())return
  const x=id?publicShowcase.find(v=>v.id===id):null
  const usableAssets=assetRegistry.filter(a=>showcaseAssetUrl(a)&&a.governance_status!=='reject')
  $('modalContent').innerHTML='<div class="eyebrow">VETRINA MANAGER</div><h2>'+(x?'Modifica proposta':'Nuova proposta pubblica')+'</h2><p class="muted">Qui si gestisce ciò che il pubblico vede. Prezzi, provvigioni e condizioni economiche non fanno parte di questo contenuto.</p>'+
    '<form id="showcaseEditorForm" class="form">'+
      '<div class="inline"><label>Categoria<input id="scCategory" value="'+esc(x?.category||'partnership')+'" required></label><label>Eyebrow<input id="scEyebrow" value="'+esc(x?.eyebrow||'')+'"></label></div>'+
      '<label>Titolo<input id="scTitle" value="'+esc(x?.title||'')+'" required></label>'+
      '<label>Sintesi pubblica<textarea id="scSummary" required>'+esc(x?.summary||'')+'</textarea></label>'+
      '<label>Destinatari<input id="scAudience" value="'+esc(x?.audience||'')+'" placeholder="Aziende · persone · professionisti"></label>'+
      '<div class="inline"><label>Call to action<input id="scCta" value="'+esc(x?.cta_label||'Richiedi informazioni')+'"></label><label>Ordine<input id="scOrder" type="number" min="0" step="1" value="'+esc(x?.sort_order??100)+'"></label></div>'+
      '<label>Asset ufficiale<select id="scAsset"><option value="">Nessuno / usa URL manuale</option>'+usableAssets.map(a=>'<option value="'+a.id+'">'+esc(a.asset_name)+' · '+esc(governanceLabel(a.governance_status))+'</option>').join('')+'</select></label>'+
      '<label>URL immagine<input id="scVisual" type="url" value="'+esc(x?.visual_url||'')+'" placeholder="https://..."></label>'+
      '<div class="showcase-editor-checks"><label><input id="scPublished" type="checkbox" '+(x?.published?'checked':'')+'> Pubblicata</label><label><input id="scFeatured" type="checkbox" '+(x?.featured?'checked':'')+'> In evidenza</label></div>'+
      '<button type="submit" class="primary">Salva proposta</button>'+
    '</form>'
  $('modal').classList.remove('hidden')
  $('scAsset').onchange=e=>{
    const a=assetRegistry.find(v=>v.id===e.target.value)
    const url=showcaseAssetUrl(a)
    if(url)$('scVisual').value=url
  }
  $('showcaseEditorForm').onsubmit=async e=>{
    e.preventDefault()
    const title=$('scTitle').value.trim()
    const slugBase=title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70)||'proposta'
    const row={
      organization_id:window.orgId,
      project_scope:'MAGLIA_360',
      category:$('scCategory').value.trim()||'partnership',
      eyebrow:$('scEyebrow').value.trim()||null,
      title,
      summary:$('scSummary').value.trim(),
      audience:$('scAudience').value.trim()||null,
      cta_label:$('scCta').value.trim()||'Richiedi informazioni',
      visual_url:$('scVisual').value.trim()||null,
      published:$('scPublished').checked,
      featured:$('scFeatured').checked,
      sort_order:Number($('scOrder').value||100),
      updated_at:new Date().toISOString()
    }
    let result
    if(x) result=await supabase.from('public_showcase_items').update(row).eq('id',x.id).eq('organization_id',window.orgId)
    else result=await supabase.from('public_showcase_items').insert({...row,slug:slugBase+'-'+Date.now().toString().slice(-5)})
    if(result.error)return alert(result.error.message)
    closeModal();await loadAll()
  }
}

async function manageAccessRequest(id,action,role='viewer'){
  if(!isAccessApprover())return
  const{data,error}=await supabase.functions.invoke('manage-access-request',{body:{request_id:id,action,role}})
  if(error||data?.ok===false)return alert(data?.message||error?.message||'Operazione non riuscita.')
  alert(data?.message||'Operazione completata.')
  await loadAll()
}
async function updateCommercialLead(id,status){
  if(!isAccessApprover())return
  const lead=commercialLeads.find(x=>x.id===id);if(!lead)return
  const{error}=await supabase.from('public_commercial_leads').update({status,updated_at:new Date().toISOString()}).eq('id',id).eq('organization_id',window.orgId)
  if(error)return alert(error.message)
  const linked=actions.find(a=>a.metadata?.public_commercial_lead_id===id)
  if(linked){
    const actionStatus=['closed','lost'].includes(status)?'completed':status==='opportunity'?'in_progress':linked.status
    const next=status==='new'?'Contattare il lead e verificare interesse.':
      status==='contacted'?'Qualificare bisogno, interlocutore e prossima azione.':
      status==='qualified'?'Valutare proposta, partner e percorso commerciale.':
      status==='opportunity'?'Aprire sviluppo concreto e definire appuntamento/proposta.':
      status==='closed'?'Registrare esito finale della relazione.':'Archiviare motivazione della perdita.'
    await supabase.from('strategic_actions').update({status:actionStatus,next_action:next,updated_at:new Date().toISOString()}).eq('id',linked.id).eq('organization_id',window.orgId)
  }
  await loadAll()
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
    reply='Questa domanda non riguarda necessariamente i dati interni di MAGLIA 360. La nuova architettura di Lia prevede un motore generale separato dal Workbench operativo. Al momento questo ambiente V2 mantiene sicure e attive le funzioni aziendali; il collegamento del motore conversazionale generale richiede il relativo servizio LLM lato server e non verrà simulato con risposte preconfezionate.'
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

supabase.auth.onAuthStateChange((event,session)=>{
  if(event==='PASSWORD_RECOVERY'){
    passwordRecoveryMode=true
    setTimeout(showResetPasswordView,0)
    return
  }
  if(event==='SIGNED_OUT')passwordRecoveryMode=false
  setTimeout(boot,0)
})
await boot()