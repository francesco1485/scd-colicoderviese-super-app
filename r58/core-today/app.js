'use strict';

const SESSION_KEY='scd:r58:core-session';
const $=selector=>document.querySelector(selector);

function readSession(){
  try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'{}')}catch{return {}}
}
function saveSession(token,email){
  localStorage.setItem(SESSION_KEY,JSON.stringify({token,email,savedAt:new Date().toISOString()}));
}
function clearSession(){
  localStorage.removeItem(SESSION_KEY);
}
async function fetchJson(url,options={}){
  const response=await fetch(url,{...options,headers:{'content-type':'application/json',...(options.headers||{})}});
  let body={};
  try{body=await response.json()}catch{}
  if(!response.ok){
    const error=new Error(body.error||('HTTP_'+response.status));
    error.status=response.status;
    error.body=body;
    throw error;
  }
  return body;
}
async function scdAction(action,payload={},sessionToken=''){
  return fetchJson('/api/scd',{method:'POST',body:JSON.stringify({action,payload,sessionToken})});
}
function cleanText(value,fallback=''){
  return value===undefined||value===null?fallback:String(value);
}
function safeHttps(value){
  try{
    const url=new URL(String(value||''));
    return url.protocol==='https:'?url.toString():'';
  }catch{return ''}
}
function formatDateTime(value){
  if(!value)return '';
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return cleanText(value);
  return new Intl.DateTimeFormat('it-IT',{timeZone:'Europe/Rome',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(date);
}
function element(tag,className,text){
  const node=document.createElement(tag);
  if(className)node.className=className;
  if(text!==undefined)node.textContent=text;
  return node;
}
function setSourceState(state,coverage={}){
  const normalized=['VERIFIED','PARTIAL','UNVERIFIED'].includes(state)?state:'UNVERIFIED';
  $('#sourceBox').dataset.state=normalized;
  $('#sourceState').textContent=normalized==='VERIFIED'?'VERIFICATE':(normalized==='PARTIAL'?'PARZIALI':'NON VERIFICATE');
  const verified=(coverage.verified||[]).length;
  const missing=(coverage.missing||[]).length;
  $('#sourceDetail').textContent=normalized==='VERIFIED'
    ?verified+' canali verificati'
    :normalized==='PARTIAL'
      ?verified+' verificati · '+missing+' non disponibili'
      :'Nessun dato viene stimato.';
}
function renderProvenance(projection){
  const body=$('#provenanceBody');
  body.replaceChildren();
  const verified=(projection.coverage?.verified||[]).join(', ')||'nessuna';
  const missing=(projection.coverage?.missing||[]).map(x=>x.id+' ('+x.error+')').join(', ')||'nessuna';
  const p1=element('p','', 'Verificate: '+verified+'.');
  const p2=element('p','', 'Non disponibili: '+missing+'.');
  const p3=element('p','', 'Stato: '+cleanText(projection.source_state,'UNVERIFIED')+' · comando '+cleanText(projection.command_trigger,'/today')+'.');
  body.append(p1,p2,p3);
}
function renderPrimary(item,projection){
  const slot=$('#primarySlot');
  slot.replaceChildren();
  if(!item){
    const fail=projection.fail_closed||{};
    const wrap=element('div','fail-state');
    wrap.append(
      element('h2','',cleanText(fail.message,'Nessuna azione verificata da mostrare.')),
      element('p','',cleanText(fail.code,'NO_VERIFIED_ATTENTION')+'. Il sistema resta vuoto invece di inventare priorità o ricostruire dati mancanti.')
    );
    const button=element('button','fail-action','Riprova verifica');
    button.type='button';
    button.addEventListener('click',()=>loadProjection(currentCommand));
    wrap.append(button);
    slot.append(wrap);
    return;
  }

  const wrap=element('article','primary-attention');
  const content=element('div','primary-copy');
  const title=element('h2','',cleanText(item.title,'Elemento operativo'));
  const why=element('p','why',cleanText(item.reason,'Elemento verificato dalla fonte indicata.'));
  const meta=element('div','meta-line');
  const values=[
    ['Responsabile',item.owner],
    ['Scadenza',formatDateTime(item.due_at)],
    ['Fonte',item.source],
    ['Verifica',item.verification_state]
  ];
  for(const [label,value] of values){
    if(!value)continue;
    const span=element('span');
    span.append(element('b','',label+':'),document.createTextNode(' '+cleanText(value)));
    meta.append(span);
  }
  content.append(title,why,meta);

  const action=element('aside','action-panel');
  action.append(element('span','micro','PROSSIMA AZIONE'));
  action.append(element('p','',cleanText(item.next_action?.label,'Apri la fonte verificata')));
  const href=safeHttps(item.source_url);
  if(item.next_action?.mode==='READ'&&href){
    const link=element('a','action-button','Apri fonte');
    link.href=href;
    link.target='_blank';
    link.rel='noopener noreferrer';
    link.style.display='grid';
    link.style.placeItems='center';
    link.style.textDecoration='none';
    action.append(link);
  }else{
    const button=element('button','action-button',item.next_action?.mode==='HUMAN_GATE'?'Decisione umana richiesta':'Fonte verificata');
    button.type='button';
    button.disabled=true;
    action.append(button);
  }
  wrap.append(content,action);
  slot.append(wrap);
}
function renderSecondary(projection){
  const list=$('#secondaryList');
  list.replaceChildren();
  const merged=[];
  for(const row of [...(projection.changed||[]),...(projection.next||[])]){
    if(!row?.id||merged.some(x=>x.id===row.id)||row.id===projection.primary_attention?.id)continue;
    merged.push(row);
    if(merged.length>=3)break;
  }
  if(!merged.length){
    list.append(element('div','secondary-empty','Nessun altro elemento verificato richiede spazio adesso.'));
    return;
  }
  merged.forEach((row,index)=>{
    const article=element('article','secondary-item');
    article.append(element('div','rank',String(index+2)));
    const copy=element('div');
    copy.append(element('h3','',cleanText(row.title,'Elemento operativo')),element('p','',cleanText(row.reason,'Fonte verificata.')));
    article.append(copy);
    if(row.due_at)article.append(element('time','',formatDateTime(row.due_at)));
    list.append(article);
  });
}
function renderProjection(payload){
  const projection=payload.projection||{};
  setSourceState(projection.source_state,projection.coverage);
  renderPrimary(projection.primary_attention,projection);
  renderSecondary(projection);
  renderProvenance(projection);
  const verified=(projection.coverage?.verified||[]).length;
  const missing=(projection.coverage?.missing||[]).length;
  $('#coverageLabel').textContent=missing?(verified+' fonti verificate · '+missing+' mancanti'):(verified+' fonti verificate');
}
function setAuthenticated(identity={}){
  $('#authGate').hidden=true;
  $('#workspace').hidden=false;
  $('#logoutBtn').hidden=false;
  const user=identity.user||identity.profile||identity;
  const role=cleanText(user.coreRole||user.role||'Profilo autorizzato');
  $('#roleLabel').textContent=role;
  $('#identityLabel').textContent=cleanText(user.name||user.email||'R20');
}
function setUnauthenticated(){
  $('#authGate').hidden=false;
  $('#workspace').hidden=true;
  $('#logoutBtn').hidden=true;
  $('#roleLabel').textContent='Non autenticato';
  $('#identityLabel').textContent='R20 identity';
  setSourceState('UNVERIFIED',{});
}
let currentCommand='/today';

async function loadProjection(command='/today'){
  currentCommand=command;
  document.querySelectorAll('[data-command]').forEach(btn=>btn.classList.toggle('active',btn.dataset.command===command));
  const session=readSession();
  if(!session.token){setUnauthenticated();return}
  $('#workspace').hidden=false;
  $('#primarySlot').replaceChildren(element('div','loading-line','Verifico le fonti operative…'));
  try{
    const payload=await fetchJson('/api/core-today',{method:'POST',body:JSON.stringify({sessionToken:session.token,command,input:{}})});
    setAuthenticated({role:payload.projection?.role_scope?.[0]||'Profilo autorizzato'});
    renderProjection(payload);
    const now=new Date(payload.projection?.generated_at||Date.now());
    $('#clubDate').textContent=new Intl.DateTimeFormat('it-IT',{timeZone:'Europe/Rome',weekday:'long',day:'2-digit',month:'long'}).format(now);
  }catch(error){
    if(error.status===401||error.status===403){
      clearSession();
      setUnauthenticated();
      $('#authState').textContent=error.status===403?'Profilo non autorizzato a questa centralina.':'Sessione scaduta. Accedi di nuovo.';
      return;
    }
    const projection={
      source_state:'UNVERIFIED',coverage:{verified:[],missing:[{id:'runtime',error:error.message}]},
      primary_attention:null,changed:[],next:[],fail_closed:{code:'RUNTIME_UNAVAILABLE',message:'Le fonti non sono verificabili in questo momento.'},
      command_trigger:command
    };
    renderProjection({projection});
  }
}
async function requestCode(){
  const email=$('#emailInput').value.trim();
  if(!email){$('#authState').textContent='Inserisci la tua email SCD.';return}
  $('#authState').textContent='Invio codice…';
  try{
    await scdAction('auth.request',{email});
    $('#authState').textContent='Se l’account è abilitato, il codice temporaneo è stato inviato.';
  }catch(error){
    $('#authState').textContent='Invio non disponibile: '+error.message;
  }
}
async function login(){
  const email=$('#emailInput').value.trim();
  const code=$('#codeInput').value.trim();
  if(!email||!code){$('#authState').textContent='Email e codice / PIN sono obbligatori.';return}
  $('#authState').textContent='Verifica identità…';
  try{
    const out=await scdAction('auth.login',{email,pin:code,code});
    const data=out.data||out;
    const token=String(data.token||data.sessionToken||data.accessToken||'');
    if(!token)throw new Error('Token di sessione non ricevuto');
    saveSession(token,email);
    await loadProjection(currentCommand);
  }catch(error){
    $('#authState').textContent='Accesso non riuscito: '+error.message;
  }
}
function logout(){
  clearSession();
  setUnauthenticated();
  $('#codeInput').value='';
  $('#authState').textContent='Sessione chiusa.';
}
document.querySelectorAll('[data-command]').forEach(button=>button.addEventListener('click',()=>loadProjection(button.dataset.command)));
$('#refreshBtn').addEventListener('click',()=>loadProjection(currentCommand));
$('#requestCodeBtn').addEventListener('click',requestCode);
$('#loginBtn').addEventListener('click',login);
$('#logoutBtn').addEventListener('click',logout);
$('#codeInput').addEventListener('keydown',event=>{if(event.key==='Enter')login()});

const session=readSession();
if(session.email)$('#emailInput').value=session.email;
loadProjection('/today');
