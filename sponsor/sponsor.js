const PRIVATE_SPONSOR_ORIGIN='https://scd-colicoderviese-official-r21.onrender.com';
const ON_PUBLIC_STATIC=['scd-sponsor-platform.onrender.com','francesco1485.github.io'].includes(location.hostname);
const $=s=>document.querySelector(s);
const $$=s=>Array.from(document.querySelectorAll(s));

const clubModules={
  partner:{
    kicker:'PARTNER HUB',
    title:'Ogni azienda entra in un progetto, non in un elenco loghi.',
    text:'Profilo partner, obiettivi, asset attivati, documenti, appuntamenti, proof e rinnovi in un unico percorso leggibile.',
    points:['Profilo 360°','Asset attivi','Scadenze e rinnovi','Proof di delivery'],
    cta:'Parla con SCD',
    preview:'<div class="ui-hero"><small>PARTNER HUB</small><h4>Benvenuto, Rossi Srl</h4><p>Stagione 2026/27 · Partner attivo</p></div><div class="ui-kpis"><b>80%<small>attivazioni completate</small></b><b>12<small>materiali caricati</small></b><b>3<small>richieste aperte</small></b></div><div class="ui-list"><span>LEDWall Matchday <em>ATTIVO</em></span><span>Sponsor Wall <em>PRONTO</em></span><span>Convenzione <em>DA FORMALIZZARE</em></span></div>'
  },
  led:{
    kicker:'LEDWALL MATCHDAY',
    title:'Il brand entra nel ritmo della partita.',
    text:'Playlist sponsor, creatività dedicate, rotazioni programmate e proof fotografico/video costruiti per tribuna e camera principale.',
    points:['Spot su misura','Rotazione per gara','Camera safe','Report sponsor'],
    cta:'Costruiamo lo spot LED',
    preview:'<div class="ui-led"><div class="ui-led-main">SCD COLICODERVIESE</div><div class="ui-led-rotate"><span>GGLASS</span><span>TA CLEANING</span><span>AGC MEDICAL</span></div></div><div class="ui-kpis"><b>20s<small>preview spot</small></b><b>25fps<small>master video</small></b><b>4<small>canali proof</small></b></div><div class="ui-list"><span>Tribuna <em>VISIBILE</em></span><span>Camera principale <em>DA COLLAUDARE</em></span><span>Pixellot <em>DIRITTI DA VERIFICARE</em></span></div>'
  },
  media:{
    kicker:'MEDIA & SPONSOR WALL',
    title:'Il partner deve essere riconoscibile anche quando la partita finisce.',
    text:'Backdrop interviste, contenuti video, Pixellot autorizzato, social e materiali scaricabili diventano un unico Media Hub.',
    points:['Sponsor Wall','Interviste','Clip partner','Archivio materiali'],
    cta:'Scopri il Media Hub',
    preview:'<div class="ui-media"><div class="ui-wall"><b>SCD</b><span>NORATECH</span><span>RASERO</span><span>DECAR</span><span>SACO</span><span>LEGEA</span><span>BIANCHI BAZZI</span></div><div class="ui-video"><i>▶</i><strong>Match Content</strong><small>clip · interviste · proof</small></div></div><div class="ui-list"><span>Intervista post gara <em>03:42</em></span><span>Clip sponsor <em>02:15</em></span><span>Best moments <em>05:20</em></span></div>'
  },
  community:{
    kicker:'CARD & CONVENZIONI',
    title:'La community deve ricevere valore concreto, non soltanto comunicazioni.',
    text:'Supporter Card, Tesserato Card, benefit territoriali, QR e convenzioni diventano un sistema semplice da usare e misurare.',
    points:['Supporter Card','Tesserato Card','Benefit territoriali','QR / Wallet futuro'],
    cta:'Scopri le convenzioni',
    preview:'<div class="ui-cards"><article><small>SCD SUPPORTER</small><b>COMMUNITY CARD</b><em>La passione che ti porta più vicino.</em></article><article><small>SCD TESSERATO</small><b>PLAYER & STAFF</b><em>Dentro la squadra. Dentro i vantaggi.</em></article></div><div class="ui-list"><span>Food & ristorazione <em>IN SVILUPPO</em></span><span>Sport & benessere <em>IN SVILUPPO</em></span><span>Turismo & servizi <em>IN SVILUPPO</em></span></div>'
  },
  events:{
    kicker:'EVENTI & TORNEI',
    title:'Un torneo può diventare un’esperienza di marca completa.',
    text:'Title partnership, gazebo, hospitality, premiazioni, famiglie e territorio: ogni evento può offrire attivazioni diverse e misurabili.',
    points:['Title sponsor','Gazebo & corner','Hospitality','Family experience'],
    cta:'Costruiamo un evento',
    preview:'<div class="ui-event"><div class="ui-event-badge">TORNEO SCD</div><h4>Sport · famiglie · territorio</h4><div class="ui-event-grid"><span>GAZEBO</span><span>LED</span><span>PREMIAZIONI</span><span>HOSPITALITY</span></div></div><div class="ui-kpis"><b>16<small>squadre concept</small></b><b>1<small>title partner</small></b><b>4<small>attivazioni core</small></b></div>'
  },
  territory:{
    kicker:'COLICO · ALTO LARIO',
    title:'Un club locale può comunicare con la qualità di un club internazionale.',
    text:'La differenza è il contesto: lago, montagne, turismo, famiglie, imprese e sport. Il territorio non è uno sfondo: è parte del prodotto sponsor.',
    points:['Colico','Alto Lario','Lago di Como','Rete imprese e famiglie'],
    cta:'Entra nella rete SCD',
    preview:'<div class="ui-territory"><div class="territory-map-card"><small>HOME OF SCD</small><h4>COLICO</h4><b>ALTO LARIO · LAGO DI COMO</b><p>Sport · turismo · imprese · community</p></div><div class="territory-points"><span>Centro Sportivo</span><span>Club House</span><span>Eventi</span><span>Partner Network</span></div></div>'
  }
};

function renderClubModule(key='partner'){
  const m=clubModules[key]||clubModules.partner;
  const kicker=$('#clubModuleKicker'),title=$('#clubModuleTitle'),text=$('#clubModuleText'),points=$('#clubModulePoints'),cta=$('#clubModuleCta'),preview=$('#clubDeviceMain');
  if(kicker)kicker.textContent=m.kicker;
  if(title)title.textContent=m.title;
  if(text)text.textContent=m.text;
  if(points)points.innerHTML=m.points.map(x=>'<span>'+x+'</span>').join('');
  if(cta)cta.textContent=m.cta;
  if(preview)preview.innerHTML=m.preview;
  $$('[data-club-module]').forEach(b=>b.classList.toggle('active',b.dataset.clubModule===key));
}
$$('[data-club-module]').forEach(b=>b.addEventListener('click',()=>renderClubModule(b.dataset.clubModule)));
renderClubModule('partner');



function modal(name){
  return name==='access'?$('#accessModal'):$('#loginModal');
}
function openModal(name){
  if(name==='login'&&ON_PUBLIC_STATIC){location.href=PRIVATE_SPONSOR_ORIGIN+'/sponsor/?login=1';return}
  $$('.modal').forEach(x=>x.hidden=true);
  const m=modal(name); if(!m)return;
  m.hidden=false;
  document.body.classList.add('modal-open');
  requestAnimationFrame(()=>m.querySelector('input,select,textarea,button')?.focus());
}
function closeModals(){
  $$('.modal').forEach(x=>x.hidden=true);
  document.body.classList.remove('modal-open');
}
$$('[data-open]').forEach(b=>b.addEventListener('click',()=>openModal(b.dataset.open)));
$$('[data-close]').forEach(b=>b.addEventListener('click',closeModals));
$$('[data-switch]').forEach(b=>b.addEventListener('click',()=>openModal(b.dataset.switch)));
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModals()});
$$('.modal').forEach(m=>m.addEventListener('mousedown',e=>{if(e.target===m)closeModals()}));

async function api(url,body){
  const target=ON_PUBLIC_STATIC?PRIVATE_SPONSOR_ORIGIN+url:url;
  const res=await fetch(target,{
    method:'POST',
    headers:{'content-type':'application/json'},
    credentials:'same-origin',
    body:JSON.stringify(body)
  });
  let data={};
  try{data=await res.json()}catch{}
  if(!res.ok||data.ok===false)throw new Error(data.error||data.message||'Operazione non riuscita');
  return data;
}
async function apiGet(url){
  const target=ON_PUBLIC_STATIC?PRIVATE_SPONSOR_ORIGIN+url:url;
  const res=await fetch(target,{method:'GET',credentials:'same-origin',cache:'no-store'});
  let data={};
  try{data=await res.json()}catch{}
  if(!res.ok||data.ok===false)throw new Error(data.error||data.message||'Operazione non riuscita');
  return data;
}
function formData(form){
  const f=new FormData(form),o=Object.fromEntries(f.entries());
  o.privacy=f.get('privacy')==='on';
  o.anonymous=f.get('anonymous')==='on';
  return o;
}
function pending(btn,on){
  if(!btn)return;
  btn.disabled=on;
  if(on){btn.dataset.original=btn.textContent;btn.textContent='Invio in corso…'}
  else if(btn.dataset.original){btn.textContent=btn.dataset.original}
}

$('#partnerLeadForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const form=e.currentTarget,state=$('#partnerLeadState'),btn=form.querySelector('[type=submit]');
  const d=formData(form);
  state.textContent='';
  pending(btn,true);
  try{
    const r=await api('/api/sponsor/lead',d);
    state.className='form-state ok';
    state.textContent='Richiesta registrata'+(r.requestId?' · '+r.requestId:'')+'. La Direzione SCD ti ricontatterà.';
    form.reset();
  }catch(err){
    state.className='form-state error'; state.textContent=err.message;
  }finally{pending(btn,false)}
});

$('#accessRequestForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const form=e.currentTarget,state=$('#accessState'),btn=form.querySelector('[type=submit]');
  const d=formData(form);
  state.textContent='';
  pending(btn,true);
  try{
    const r=await api('/api/sponsor/request-access',d);
    state.className='form-state ok';
    state.textContent='Richiesta inviata alla Direzione'+(r.requestId?' · '+r.requestId:'')+'. Dopo l’approvazione potrai richiedere il codice temporaneo.';
    form.reset();
  }catch(err){
    state.className='form-state error';state.textContent=err.message;
  }finally{pending(btn,false)}
});

let loginEmail='';
$('#otpRequestForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const form=e.currentTarget,state=$('#loginState'),btn=form.querySelector('[type=submit]');
  loginEmail=new FormData(form).get('email').trim();
  pending(btn,true);state.textContent='';
  try{
    await api('/api/sponsor/otp',{email:loginEmail});
    state.className='form-state ok';
    state.textContent='Se l’indirizzo è stato approvato, il codice temporaneo è stato inviato via email.';
    $('#otpLoginForm').hidden=false;
    $('#otpLoginForm input').focus();
  }catch(err){
    state.className='form-state error';state.textContent=err.message;
  }finally{pending(btn,false)}
});

$('#otpLoginForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const form=e.currentTarget,state=$('#loginState'),btn=form.querySelector('[type=submit]');
  const code=new FormData(form).get('code').trim();
  pending(btn,true);state.textContent='';
  try{
    const r=await api('/api/sponsor/login',{email:loginEmail,code});
    state.className='form-state ok';
    state.textContent='Accesso verificato. Apertura piattaforma…';
    location.href='/sponsor/app';
  }catch(err){
    state.className='form-state error';state.textContent=err.message;
  }finally{pending(btn,false)}
});

// If a valid session already exists, keep a discreet shortcut available.
if(!ON_PUBLIC_STATIC)fetch('/api/sponsor/session?probe=1',{credentials:'same-origin'}).then(async r=>{
  if(!r.ok)return;
  const d=await r.json();
  if(d.authenticated!==true)return;
  const b=document.createElement('a');
  b.className='session-chip';
  b.href=d.isDirection?'/sponsor/admin':'/sponsor/app';
  b.textContent='Sessione attiva · Apri area riservata';
  document.body.appendChild(b);
}).catch(()=>{});

const sponsorQuery=new URLSearchParams(location.search);
if(sponsorQuery.get('access')==='1')openModal('access');
if(sponsorQuery.get('login')==='1')openModal('login');


const wallModeLabels={
  INTERVISTE:'MEDIA & INTERVISTE',
  EVENTI:'EVENTI & PREMIAZIONI',
  WEB:'WEB APP & SOCIAL'
};
function setSponsorWallMode(mode){
  const stage=document.querySelector('[data-wall-stage]');
  if(!stage)return;
  stage.dataset.wallStage=mode;
  const label=document.querySelector('#wallModeLabel');
  if(label)label.textContent=wallModeLabels[mode]||mode;
  document.querySelectorAll('[data-wall-mode]').forEach(b=>b.classList.toggle('active',b.dataset.wallMode===mode));
}
document.querySelectorAll('[data-wall-mode]').forEach(b=>b.addEventListener('click',()=>setSponsorWallMode(b.dataset.wallMode)));


/* ===== R50.5 SOLIDARITY FUND · SPONTANEOUS DONATIONS ===== */
let solidarityConfig=null;
function donationAmount(){
  const input=$('#donationAmount');
  const value=Number(String(input?.value||'').replace(',','.'));
  return Number.isFinite(value)?Math.max(1,Math.min(50000,value)):25;
}
function syncDonationAmount(value){
  const n=Math.max(1,Math.min(50000,Number(value)||25));
  const input=$('#donationAmount'),hidden=$('#donationIntentAmount');
  if(input)input.value=String(n);
  if(hidden)hidden.value=String(n);
  $('[data-donation-amount]').forEach(b=>b.classList.toggle('active',Number(b.dataset.donationAmount)===n));
  syncDonationDirectLink();
}
function resolvedDonationUrl(){
  const online=solidarityConfig?.channels?.online||{};
  const amount=donationAmount().toFixed(2);
  if(online.urlTemplate){
    return String(online.urlTemplate).replaceAll('{amount}',encodeURIComponent(amount)).replaceAll('{currency}','EUR');
  }
  return String(online.url||'');
}
function syncDonationDirectLink(){
  const link=$('#donationOnlineLink');
  if(!link)return;
  const url=resolvedDonationUrl();
  if(url){
    link.href=url;
    link.hidden=false;
    const online=solidarityConfig?.channels?.online||{};
    const baseLabel=online.provider?'Dona ora con '+online.provider:'Dona ora online';
    link.textContent=baseLabel+(online.amountAware?' · €'+donationAmount().toFixed(2):'');
  }else link.hidden=true;
}
function renderDonationConfig(){
  const state=$('#donationChannelState'),bank=$('#donationBankToggle'),box=$('#donationBankBox');
  if(!state)return;
  const online=solidarityConfig?.channels?.online||{},transfer=solidarityConfig?.channels?.bankTransfer||{};
  const channels=[online.enabled?'pagamento online':null,transfer.enabled?'bonifico':null].filter(Boolean);
  state.className='donation-channel-state '+(channels.length?'ready':'pending');
  state.textContent=channels.length?'Canali ufficiali disponibili: '+channels.join(' + ')+'.':'Canale di pagamento diretto non ancora pubblicato. Puoi comunque registrare la richiesta e ricevere istruzioni ufficiali dalla società.';
  syncDonationDirectLink();
  if(bank){
    bank.hidden=!transfer.enabled;
    bank.textContent='Coordinate per bonifico';
  }
  if(box){
    box.hidden=true;
    if(transfer.enabled){
      $('#donationAccountHolder').textContent=transfer.accountHolder||'—';
      $('#donationIban').textContent=transfer.iban||'—';
      $('#donationCausal').textContent=transfer.causal||'Erogazione liberale Fondo Solidale SCD';
    }
  }
}
async function loadDonationConfig(){
  const state=$('#donationChannelState');
  if(!state)return;
  try{
    solidarityConfig=await apiGet('/api/public/donation-config');
    renderDonationConfig();
  }catch(err){
    state.className='donation-channel-state pending';
    state.textContent='Canali diretti momentaneamente non verificabili. Usa il modulo di contatto per ricevere istruzioni ufficiali SCD.';
  }
}
$('[data-donation-amount]').forEach(b=>b.addEventListener('click',()=>syncDonationAmount(b.dataset.donationAmount)));
$('#donationAmount')?.addEventListener('input',e=>syncDonationAmount(e.target.value));
$('#donationBankToggle')?.addEventListener('click',()=>{
  const box=$('#donationBankBox');if(!box)return;
  box.hidden=!box.hidden;
});
$('#copyDonationIban')?.addEventListener('click',async()=>{
  const iban=String($('#donationIban')?.textContent||'').trim();
  if(!iban||iban==='—')return;
  try{await navigator.clipboard.writeText(iban);$('#copyDonationIban').textContent='IBAN copiato'}
  catch{$('#copyDonationIban').textContent='Seleziona e copia l’IBAN'}
});
$('#solidarityIntentForm')?.addEventListener('submit',async e=>{
  e.preventDefault();
  const form=e.currentTarget,state=$('#solidarityIntentState'),btn=form.querySelector('[type=submit]');
  const d=formData(form);d.amount=donationAmount();
  state.textContent='';pending(btn,true);
  try{
    const r=await api('/api/public/donation-intent',d);
    state.className='form-state ok';
    state.textContent='Richiesta registrata'+(r.requestId?' · '+r.requestId:'')+'. Il pagamento è valido solo quando effettuato tramite un canale ufficiale SCD.';
    form.reset();
    syncDonationAmount(d.amount);
  }catch(err){
    state.className='form-state error';
    state.textContent=err.message;
  }finally{pending(btn,false)}
});
syncDonationAmount(25);
loadDonationConfig();

/* ===== R50.4 CENTER DEVELOPMENT CTA ===== */
$$('[data-project-interest]').forEach(btn=>btn.addEventListener('click',()=>{
  const form=$('#partnerLeadForm');
  if(!form)return;
  const project=String(btn.dataset.projectInterest||'').trim();
  const input=$('#partnerProject');
  if(input)input.value=project;
  const select=form.elements.interest;
  if(select){
    if(project==='Fondo Solidale SCD')select.value='Fondo Solidale SCD';
    else if(/dona|donazione/i.test(project))select.value='Donazione beni / servizi';
    else if(/brandizza|adotta/i.test(project))select.value='Adotta / brandizza un\'area';
    else select.value='Progetto Centro Sportivo';
  }
  form.scrollIntoView({behavior:'smooth',block:'center'});
  setTimeout(()=>form.elements.company?.focus(),350);
}));
