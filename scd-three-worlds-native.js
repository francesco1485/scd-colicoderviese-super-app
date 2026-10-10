/* SCD 2026/27 | Three-world native integration, behind scdVision=1.
 * ONE = canonical verified public read model, CORE = R20 auth gate,
 * GROW = existing /sponsor app. No screenshot overlay, no duplicate database.
 */
(() => {
 'use strict';
 if(new URLSearchParams(location.search).get('scdVision')!=='1')return;
 const app=window.SCDNextGen;
 const main=document.querySelector('#app main');
 if(!app||!main||typeof app.setView!=='function')return;
 const views=[
  {id:'athlete',label:'Atleta',world:'CORE'},
  {id:'family',label:'Famiglia',world:'CORE'},
  {id:'staff',label:'Staff e direzione',world:'CORE'},
  {id:'communications',label:'Comunicazioni',world:'ONE'},
  {id:'grow',label:'Sponsor e partner',world:'GROW'}
 ];
 const routes=new Set(['pulse','calendar','teams','social','desk','twin',...views.map(x=>x.id)]);
 const it='it-IT';
 const esc=(s)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const ic={
  house:'<path d="m3 11 9-8 9 8v10h-7v-7h-4v7H3V11Z"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M8 14h8m-8 3h5"/>',
  users:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 6a3 3 0 0 1 0 6M19 15a5 5 0 0 1 2 4v1"/>',
  athlete:'<circle cx="12" cy="7" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  wallet:'<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 9h18m-5 5h2"/>',
  file:'<path d="M7 2h7l5 5v15H5V2h2zm7 0v5h5M8 13h8M8 17h8"/>',
  news:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 9h10M7 13h10M7 17h7"/>',
  megaphone:'<path d="m4 10 14-5v14L4 14v-4zM4 14l2 7h4l-2-6M18 9l3-2m-3 8 3 2"/>',
  handshake:'<path d="m2 9 5-4 4 2 2-2 5 2 4 4-4 4-2-2-5 6-3-2-2 1-4-4 2-5z"/>',
  target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  pin:'<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  lock:'<rect x="5" y="10" width="14" height="12" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  shield:'<path d="M12 2 4 5v6c0 5 4 8 8 11 4-3 8-6 8-11V5l-8-3z"/><path d="m8 12 3 3 5-6"/>',
  alert:'<path d="M12 3 2 21h20L12 3zM12 9v5m0 3v1"/>',
  chevron:'<path d="m9 5 7 7-7 7"/>',
  arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
  filter:'<path d="M3 5h18l-7 8v5l-4 2v-7L3 5z"/>',
  trophy:'<path d="M7 4h10v8a5 5 0 0 1-10 0V4zM7 6H4v3a3 3 0 0 0 3 3m10-6h3v3a3 3 0 0 1-3 3M12 17v4m-4 0h8"/>',
  edit:'<path d="m16 4 4 4-12 12H4v-4L16 4zM14 6l4 4"/>',
  download:'<path d="M12 3v13m-5-5 5 5 5-5M4 18v3h16v-3"/>',
  cross:'<path d="M5 5l14 14M19 5 5 19"/>',
  menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
  check:'<path d="m4 12 5 5L20 6"/>',
  cone:'<path d="M9 3h6l4 16H5L9 3zM7 14h10M8 10h8M3 21h18"/>'
 };
 const icon=(name,size=21)=>'<svg width="'+size+'" height="'+size+'" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" stroke-linecap="round">'+(ic[name]||ic.shield)+'</svg>';
 const banner=(heading,lead,world)=>'<header class="scde-head"><div class="scde-head-backdrop"></div><div class="scde-brand"><img src="./assets/logo-scd.png" alt="SCD ColicoDerviese"><div><small>S.C.D. COLICODERVIESE</small><strong>'+esc(heading)+'</strong></div><button type="button" class="scde-head-world" data-scd-world-open aria-label="Apri le tre applicazioni">'+icon('menu')+' <span>'+world+'</span></button></div><div class="scde-head-title"><h1>'+esc(heading)+'</h1><p>'+esc(lead)+'</p></div></header>';
 const pills=(items,selected,dataName)=>'<div class="scde-pills" role="group" aria-label="Seleziona sezione">'+items.map(([key,title])=>'<button type="button" data-'+dataName+'="'+key+'" class="'+(selected===key?'active':'')+'" aria-pressed="'+(selected===key?'true':'false')+'">'+esc(title)+'</button>').join('')+'</div>';
 const status=(text='Accesso riservato')=>'<span class="scde-badge">'+icon('shield',13)+' '+esc(text)+'</span>';
 const card=(heading,desc,svg,btn='',body='')=>'<section class="scde-panel"><div class="scde-card-heading"><div class="scde-card-icon">'+icon(svg,26)+'</div><div><h2>'+esc(heading)+'</h2><p>'+esc(desc)+'</p></div></div>'+body+(btn||'')+'</section>';
 const cta=(text,view)=>'<button class="scde-cta" type="button" data-scd-route="'+view+'">'+esc(text)+' '+icon('arrow',17)+'</button>';
 const link=(text,href,ico='chevron')=>'<a class="scde-link" href="'+esc(href)+'" target="_blank" rel="noopener noreferrer">'+esc(text)+' '+icon(ico,16)+'</a>';
 const nav=()=>'<nav class="scde-bottom" aria-label="Navigazione SCD">'+[
  ['pulse','house','Home'],['calendar','calendar','Calendario'],['athlete','athlete','Atleta'],['family','users','Famiglia'],['staff','trophy','Staff']
 ].map(([route,ic,label])=>'<button type="button" data-scd-route="'+route+'">'+icon(ic,22)+'<small>'+label+'</small></button>').join('')+'</nav>';
 const footer=()=>'<footer class="scde-footer"><span>Stagione 2026/27 · Colico · Dervio · Alto Lario</span><strong>Stato: ANTEPRIMA / accesso per ruolo da verificare</strong></footer>';
 const roleWarning='<div class="scde-notice">'+icon('lock',21)+'<div><b>Contenuti personali protetti</b><span>Le informazioni di atleti, famiglie e staff si visualizzano solo tramite accesso e autorizzazioni R20. Nessun dato personale è simulato o pubblicato in questa anteprima.</span></div></div>';
 const access=()=>'<div class="scde-access">'+icon('shield',22)+'<div><b>Area operativa esistente</b><p>Apri il Gestionale SCD con autenticazione e ruoli verificati.</p></div>'+cta('Apri accesso protetto','desk')+'</div>';
 const scopes=[
  {id:'athlete',name:'Atleta',icon:'athlete',detail:'Convocazioni, documenti e impegni personali'},
  {id:'family',name:'Famiglia',icon:'users',detail:'Figli, documenti, quote e attività'},
  {id:'staff',name:'Staff',icon:'trophy',detail:'Squadre, presenze e attività operative'}
 ];
 let selected={athlete:'convocazioni',family:'figli',staff:'agenda',communications:'avvisi',grow:'partner'};
 let growSearch='',growInterest='ALL',draft=null;
 const coreNav=(here)=>'<div class="scde-section-nav" aria-label="Aree SCD CORE">'+scopes.map(s=>'<button type="button" data-scd-route="'+s.id+'" class="'+(here===s.id?'on':'')+'">'+icon(s.icon,20)+esc(s.name)+'</button>').join('')+'</div>';
 const publicChannels=[
  ['Sito ufficiale','https://www.colicoderviese.it/'],
  ['Facebook SCD','https://www.facebook.com/ColicoDerviese'],
  ['Instagram SCD','https://www.instagram.com/s.c.d.colicoderviese/'],
  ['YouTube SCD','https://www.youtube.com/@S.C.D.ColicoDerviese']
 ];
 const channelCards=()=>publicChannels.map(([name,url])=>'<div class="scde-channel">'+icon('news',21)+'<b>'+esc(name)+'</b>'+link('Apri',url)+'</div>').join('');
 const sharedIntro=(w)=>'<div class="scde-world-intro">'+icon('pin',17)+' Colico · Dervio · Lago di Como · montagne dell’Alto Lario <span>· '+w+' ·</span></div>';
 function athlete(){
  const tab=selected.athlete;
  const content=tab==='convocazioni'?card('Le mie convocazioni','Presenze e comunicazioni tecniche protette','calendar',cta('Accedi al Gestionale','desk'),'<p class="scde-empty">Nessuna convocazione mostrata senza identificazione dell’atleta.</p>'):
   tab==='documenti'?card('I miei documenti','Certificato medico, tesseramento, documenti riservati','file',cta('Apri area documenti','desk'),'<p class="scde-empty">Documenti disponibili esclusivamente nel profilo autorizzato.</p>'):
   tab==='pagamenti'?card('Quote e stato pagamenti','Importi e residui visibili solo al titolare autorizzato','wallet',cta('Apri area riservata','desk'),'<p class="scde-empty">Nessun importo dedotto da ricevute non riconciliate.</p>'):
   card('Comunicazioni personali','Avvisi e messaggi rivolti all’atleta','megaphone',cta('Apri messaggi protetti','desk'),'<p class="scde-empty">Nessuna comunicazione privata esposta.</p>');
  return banner('Area Atleta','Impegni sportivi, tesseramento e comunicazioni personali','CORE')+
   '<main class="scde-main">'+sharedIntro('CORE')+coreNav('athlete')+pills([['convocazioni','Convocazioni'],['documenti','Documenti'],['pagamenti','Pagamenti'],['messaggi','Messaggi']],tab,'scde-athlete')+
   '<div class="scde-columns"><div><div class="scde-feature"><div class="scde-avatar">'+icon('athlete',48)+'</div><div><b>Il mio profilo atleta</b><small>Identità disponibile dopo l’accesso</small>'+status('VERIFICA IDENTITÀ')+'</div></div>'+content+'</div><div>'+roleWarning+access()+'</div></div>'+footer()+'</main>'+nav();
 }
 function family(){
  const tab=selected.family;
  const content=tab==='figli'?card('I nostri figli','Gestione dei profili collegati da consenso e identità','users',cta('Collega profilo con accesso sicuro','desk'),'<div class="scde-three"><div class="scde-neutral-avatar">'+icon('athlete',31)+'</div><div><b>Profili non esposti</b><small>Aggiungi o consulta soltanto i figli collegati al tuo account.</small></div></div>'):
   tab==='quote'?card('Stato delle quote','Visualizzazione degli importi soltanto dopo riconciliazione','wallet',cta('Apri gestione quote riservata','desk'),'<p class="scde-empty">Dati economici protetti. Nessun saldo ipotetico.</p>'):
   tab==='documenti'?card('Documenti dei figli','Scadenze sanitarie e moduli a protezione elevata','file',cta('Apri documenti riservati','desk'),'<p class="scde-empty">Nessuna informazione sanitaria in anteprima.</p>'):
   card('Prossimi impegni','Attività pubbliche e convocazioni riservate','calendar',cta('Consulta il calendario pubblico','calendar'),'<p class="scde-empty">Per convocazioni personali è necessario l’accesso R20.</p>');
  return banner('Area Famiglia','Un punto unico per impegni e documenti dei tuoi figli','CORE')+
   '<main class="scde-main">'+sharedIntro('CORE')+coreNav('family')+pills([['figli','I nostri figli'],['quote','Quote'],['documenti','Documenti'],['impegni','Impegni']],tab,'scde-family')+
   '<div class="scde-columns"><div>'+content+'</div><div>'+roleWarning+access()+'</div></div>'+footer()+'</main>'+nav();
 }
 function staff(){
  const tab=selected.staff;
  const content=tab==='agenda'?card('Attività di oggi','Lettura autorizzata delle agende sportive','calendar',cta('Calendario pubblico verificato','calendar'),'<p class="scde-empty">Programmazione interna disponibile dopo accesso del referente.</p>'):
   tab==='squadre'?card('Le mie squadre','Viste per categoria, ruoli e responsabilità','users',cta('Apri gestione squadre','desk'),'<p class="scde-empty">Le categorie gestite dipendono dalle autorizzazioni della società.</p>'):
   tab==='presenze'?card('Presenze e convocazioni','Verifica tecnica e registri riservati','trophy',cta('Apri gestione presenze','desk'),'<p class="scde-empty">Non esiste un registro presenze pubblico.</p>'):
   card('Comunicazioni operative','Avvisi da validare prima della pubblicazione','megaphone',cta('Apri area comunicazioni protetta','desk'),'<p class="scde-empty">Nessun invio automatico in questa anteprima.</p>');
  return banner('Staff e Direzione','Squadre, atleti e gestione del Club, con accesso per ruoli','CORE')+
   '<main class="scde-main">'+sharedIntro('CORE')+coreNav('staff')+
   '<div class="scde-metrics"><div><small>Squadre</small><strong>—</strong><span>Accesso richiesto</span></div><div><small>Atleti</small><strong>—</strong><span>Dati riservati</span></div><div><small>Documenti</small><strong>—</strong><span>Dati riservati</span></div></div>'+
   pills([['agenda','Agenda'],['squadre','Squadre'],['presenze','Presenze'],['comunicazioni','Comunicazioni']],tab,'scde-staff')+
   '<div class="scde-columns"><div>'+content+'</div><div>'+roleWarning+access()+'</div></div>'+footer()+'</main>'+nav();
 }
 function communications(){
  const tab=selected.communications;
  const list=tab==='avvisi'?card('Avvisi del Club','Stato pubblico verificato, non generato automaticamente','megaphone',cta('Apri feed SCD esistente','social'),'<div class="scde-empty"><b>Avvisi ufficiali in aggiornamento</b><p>Consulta il feed attuale. Solo notizie effettivamente pubblicate dal Club devono comparire qui.</p></div>'):
   tab==='social'?card('Canali ufficiali','Collegamenti alle fonti social della società','news','', '<div class="scde-channel-list">'+channelCards()+'</div>'):
   card('Eventi e manifestazioni','Appuntamenti pubblici e iniziative autorizzate','calendar',cta('Calendario del Club','calendar'),'<p class="scde-empty">Tornei, giornate aperte ed eventi sono pubblicati solo quando verificati.</p>');
  return banner('Comunicazioni','Notizie, aggiornamenti e contenuti del Club','ONE')+
   '<main class="scde-main">'+sharedIntro('ONE')+pills([['avvisi','Club'],['social','Social'],['eventi','Eventi']],tab,'scde-communications')+
   '<div class="scde-columns"><div>'+list+'</div><div>'+card('Il Club e il territorio','Storie di sport, lago e montagne, insieme alla comunità','pin',link('Visita il sito del Club','https://www.colicoderviese.it/'))+
   card('Sport e comunità','Le stesse persone e gli stessi colori, da Colico a Dervio','users',cta('Esplora il mondo SCD','pulse'))+'</div></div>'+footer()+'</main>'+nav();
 }
 const opportunities=[
  {tag:'VISIBILITÀ',title:'Brand sul campo',text:'Opportunità di visibilità negli spazi sportivi, soggette ad accordi reali.'},
  {tag:'EVENTI',title:'Tornei e manifestazioni',text:'Collaborazioni per iniziative sportive e territoriali da approvare.'},
  {tag:'COMMUNITY',title:'Iniziative per i giovani',text:'Partnership orientate alla crescita sportiva e al territorio.'},
  {tag:'TERRITORIO',title:'Club house e strutture',text:'Progetti per gli spazi del Club, da verificare con la Direzione.'}
 ];
 function grow(){
  const tab=selected.grow;
  let body='';
  if(tab==='partner')body=card('Le opportunità di partnership','Proposte SCD, sport e territorio con dettagli da approvare','handshake','<button type="button" class="scde-cta" data-scd-grow-tab="bozza">Prepara una proposta '+icon('arrow',16)+'</button>',
    '<div class="scde-opps">'+opportunities.map(o=>'<article><span>'+esc(o.tag)+'</span><h3>'+esc(o.title)+'</h3><p>'+esc(o.text)+'</p></article>').join('')+'</div>');
  if(tab==='pipeline')body=card('Pipeline sponsor','Solo contatti e stati verificati nell’app commerciale autenticata','target',link('Apri piattaforma sponsor esistente','./sponsor/'),'<p class="scde-empty">Nessun nome azienda o trattativa estratto dai registri riservati. Stato: DATI NON COLLEGATI IN ANTEPRIMA.</p>');
  if(tab==='bozza')body='<section class="scde-panel"><div class="scde-card-heading"><div class="scde-card-icon">'+icon('edit',26)+'</div><div><h2>Prepara una proposta</h2><p>Bozza locale esportabile: non invia messaggi, non crea record CRM, non definisce prezzi.</p></div></div><form id="scde-grow-form" class="scde-form"><label>Organizzazione / referente (facoltativo)<input name="company" maxlength="100" placeholder="Nome azienda o ente" autocomplete="organization"></label><label>Tipologia<select name="kind"><option value="PARTNERSHIP">Partnership</option><option value="TORNEO">Torneo ed evento</option><option value="VISIBILITA">Visibilità sportiva</option><option value="TERRITORIO">Progetto territorio</option></select></label><label>Obiettivi e note<textarea name="note" maxlength="600" placeholder="Descrivi la proposta, poi sottoponila alla Direzione." rows="4"></textarea></label><button class="scde-cta" type="submit">Genera bozza locale '+icon('file',17)+'</button></form><div id="scde-grow-result" aria-live="polite"></div></section>';
  if(tab==='territorio')body=card('Alto Lario: un progetto condiviso','Colico · Dervio · Lago di Como · comunità sportive','pin',link('Sito sportivo ufficiale','https://www.colicoderviese.it/'),'<p>Il territorio fa parte dell’identità dei partner. Nessuna statistica o cifra commerciale viene pubblicata senza fonte verificata.</p>');
  return banner('Sponsor e Partner','Sport, territorio e opportunità di collaborazione','GROW')+
   '<main class="scde-main">'+sharedIntro('GROW')+
   '<div class="scde-grow-top"><div><strong>COLICODERVIESE</strong><p>Crescere insieme, nel cuore dell’Alto Lario.</p></div><img src="./assets/sky.png" alt="Sky, mascotte ufficiale SCD"></div>'+
   pills([['partner','Partnership'],['pipeline','CRM'],['bozza','Proposta'],['territorio','Territorio']],tab,'scde-grow-tab')+
   '<div class="scde-columns"><div>'+body+'</div><div>'+card('Un partner, più possibilità','Tornei, community, visibilità e sviluppo sportivo','handshake',link('Apri SCD GROW esistente','./sponsor/'))+
   '<div class="scde-notice">'+icon('shield',20)+'<div><b>Trattative riservate</b><span>I contatti, i compensi, le offerte e i documenti reali restano nel sistema protetto. Questa è un’anteprima commerciale, non un CRM sincronizzato.</span></div></div></div></div>'+footer()+'</main>'+nav();
 }
 const renderers={athlete,family,staff,communications,grow};
 const host={};
 for(const r of views){
  const el=document.createElement('section');el.className='view scd-ecosystem-view';el.id='view-'+r.id;el.dataset.view=r.id;el.dataset.scdeWorld=r.world;
  el.innerHTML='<div class="scde-screen" id="scde-'+r.id+'"></div>';
  main.insertBefore(el,document.getElementById('view-desk'));
  host[r.id]=el.querySelector('.scde-screen');
 }
 const worldLauncher=document.createElement('div');worldLauncher.id='scde-launcher';worldLauncher.innerHTML='<button type="button" data-scd-world-open class="scde-world-toggle" aria-label="Apri applicazioni SCD">'+icon('menu',18)+' <span>3 APP SCD</span></button><div id="scde-world-drawer" role="dialog" aria-modal="false" aria-label="Scegli applicazione SCD" hidden><div class="scde-drawer-head"><b>Un Club. Tre applicazioni.</b><button type="button" aria-label="Chiudi menu" data-scd-world-close>'+icon('cross',22)+'</button></div><button type="button" data-scd-route="pulse"><b>01 · SCD ONE</b><span>Home · Calendario · Comunicazioni</span>'+icon('chevron')+'</button><button type="button" data-scd-route="athlete"><b>02 · SCD CORE</b><span>Atleta · Famiglia · Staff · R20</span>'+icon('chevron')+'</button><button type="button" data-scd-route="grow"><b>03 · SCD GROW</b><span>Partner · Sponsor · Proposte</span>'+icon('chevron')+'</button><p>Stessa identità grafica e geografica · <strong>ANTEPRIMA</strong></p></div>';
 document.body.append(worldLauncher);
 const render=id=>{if(host[id])host[id].innerHTML=renderers[id]()};
 const renderAll=()=>views.forEach(v=>render(v.id));
 renderAll();
 function sync(){
  const active=document.querySelector('.view.active')?.dataset.view||'pulse';
  const isOur=!!host[active]||active==='pulse'||active==='calendar';
  document.body.classList.toggle('scd-one-public-view',isOur);
  document.body.classList.toggle('scde-active',isOur);
  document.body.classList.toggle('scde-role-view',!!host[active]);
  worldLauncher.hidden=!isOur;
  for(const btn of document.querySelectorAll('.scde-bottom [data-scd-route]'))btn.classList.toggle('selected',btn.dataset.scdRoute===active);
  const drawer=document.getElementById('scde-world-drawer');if(drawer)drawer.hidden=true;
 }
 function navigate(view){
  if(routes.has(view)){app.setView(view);sync();}
 }
 document.addEventListener('click',e=>{
  const to=e.target.closest('[data-scd-route]');
  if(to){e.preventDefault();navigate(to.dataset.scdRoute);return;}
  const open=e.target.closest('[data-scd-world-open]');
  if(open){e.preventDefault();const el=document.getElementById('scde-world-drawer');if(el)el.hidden=!el.hidden;return;}
  if(e.target.closest('[data-scd-world-close]')){document.getElementById('scde-world-drawer').hidden=true;return;}
  const t=e.target.closest('[data-scde-athlete],[data-scde-family],[data-scde-staff],[data-scde-communications],[data-scde-grow-tab]');
  if(t){
   const key=t.hasAttribute('data-scde-athlete')?'athlete':t.hasAttribute('data-scde-family')?'family':t.hasAttribute('data-scde-staff')?'staff':t.hasAttribute('data-scde-communications')?'communications':'grow';
   selected[key]=t.getAttribute('data-scde-'+(key==='grow'?'grow-tab':key));
   render(key);return;
  }
  const dl=e.target.closest('[data-scde-download]');
  if(dl && draft){const b=new Blob([draft],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(b);const a=document.createElement('a');a.href=url;a.download='SCD_GROW_Bozza_Non_Inviata.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
 });
 document.addEventListener('submit',e=>{
  if(e.target.id!=='scde-grow-form')return;
  e.preventDefault();
  const f=new FormData(e.target),company=String(f.get('company')||'').trim().slice(0,100),kind=String(f.get('kind')||'PARTNERSHIP'),note=String(f.get('note')||'').trim().slice(0,600);
  draft='SCD COLICODERVIESE — BOZZA COMMERCIALE LOCALE NON INVIATA\nStagione 2026/27\nAzienda: '+(company||'Da indicare')+'\nProposta: '+kind+'\nNote: '+(note||'Da completare')+'\n\nStato: BOZZA, PREZZI/TERMINI NON APPROVATI\nNon costituisce accordo o offerta vincolante. Prima dell’invio richiede revisione della Direzione SCD.';
  const el=document.getElementById('scde-grow-result');
  if(el)el.innerHTML='<div class="scde-generated"><div>'+icon('check',22)+'<b>Bozza creata soltanto in questo browser</b></div><p>Non è stata salvata nel CRM o inviata ad alcun destinatario.</p><button type="button" data-scde-download class="scde-cta">Scarica bozza .txt '+icon('download',17)+'</button></div>';
 });
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){const d=document.getElementById('scde-world-drawer');if(d)d.hidden=true;}});
 window.addEventListener('scd:public:view',()=>queueMicrotask(sync));
 window.addEventListener('hashchange',()=>{const v=location.hash.slice(1);if(host[v])navigate(v);});
 const initial=location.hash.slice(1);
 if(host[initial])navigate(initial);
 else sync();
 window.SCDThreeWorlds={version:'2026-10-10',views:[...views.map(v=>v.id)],go:navigate,kind:'NATIVE_COMPONENTS',auth:'R20_EXISTING_ONLY',publicCalendar:'R20_PUBLIC_VERIFIED_ONLY',grow:'EXISTING_SPONSOR_APPLICATION'};
})();