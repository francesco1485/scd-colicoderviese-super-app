
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const initials=n=>n.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase();
let sponsorAccess={profile:'NON_AUTORIZZATO',platform:false};

function applySponsorCapabilities(caps={}){
  sponsorAccess={...sponsorAccess,...caps};
  const profile=String(sponsorAccess.profile||'ACCESSO AUTORIZZATO').replaceAll('_',' ');
  document.documentElement.dataset.sponsorProfile=String(sponsorAccess.profile||'').toLowerCase();
  const roleEl=$('#sessionRole');
  if(roleEl)roleEl.dataset.profile=profile;
  const gates={
    settings:'settings'
  };
  Object.entries(gates).forEach(([view,cap])=>{
    const allowed=sponsorAccess[cap]===true;
    $('[data-view="'+view+'"]').forEach(el=>{el.hidden=!allowed;el.setAttribute('aria-hidden',String(!allowed))});
    const section=$('#view-'+view);
    if(section&&!allowed)section.hidden=true;
  });
}

async function loadSponsorSession(){
  try{
    const r=await fetch('/api/sponsor/session',{credentials:'same-origin',cache:'no-store'});
    if(!r.ok)throw new Error('SESSION_REQUIRED');
    const d=await r.json();
    if($('#sessionName'))$('#sessionName').textContent=d.user?.name||d.user?.email||'Area riservata';
    applySponsorCapabilities(d.capabilities||{});
    const profile=String(d.capabilities?.profile||'ACCESSO AUTORIZZATO').replaceAll('_',' ');
    if($('#sessionRole'))$('#sessionRole').textContent=(d.user?.role||'Accesso autorizzato')+' · '+profile;
  }catch(e){
    location.replace('/sponsor/?login=1');
  }
}
if($('#sponsorLogout'))$('#sponsorLogout').onclick=async()=>{
  try{await fetch('/api/sponsor/logout',{method:'POST',credentials:'same-origin'})}catch(e){}
  location.replace('/sponsor/?login=1');
};
loadSponsorSession();


const ICONS={
home:'<svg viewBox="0 0 24 24"><path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>',
users:'<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><path d="M3.5 19c.4-4 2.4-6 5.5-6s5.1 2 5.5 6"/><circle cx="17" cy="9" r="2.2"/><path d="M15.5 14c2.8 0 4.5 1.5 5 4"/></svg>',
file:'<svg viewBox="0 0 24 24"><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v5h5"/><path d="M10 12h5M10 16h5"/></svg>',
proposal:'<svg viewBox="0 0 24 24"><path d="M6 3h12v18H6z"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>',
folder:'<svg viewBox="0 0 24 24"><path d="M3 7h7l2 2h9v10H3z"/></svg>',
screen:'<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="12" rx="2"/><path d="M9 21h6M12 17v4"/></svg>',
calendar:'<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/></svg>',
chart:'<svg viewBox="0 0 24 24"><path d="M4 20V11M10 20V6M16 20v-8M22 20V3"/></svg>',
link:'<svg viewBox="0 0 24 24"><path d="M10 14 8 16a4 4 0 0 1-6-6l3-3a4 4 0 0 1 6 0"/><path d="m14 10 2-2a4 4 0 0 1 6 6l-3 3a4 4 0 0 1-6 0"/><path d="m8 12 8 0"/></svg>',
lab:'<svg viewBox="0 0 24 24"><path d="M9 3h6M10 3v5l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/><path d="M7.5 15h9"/></svg>',
settings:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9 7 7M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1"/></svg>',
search:'<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"/><path d="m16 16 5 5"/></svg>',
bell:'<svg viewBox="0 0 24 24"><path d="M6 16h12l-1.5-2.5V9a4.5 4.5 0 0 0-9 0v4.5z"/><path d="M10 19h4"/></svg>',
history:'<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v6h6"/><path d="M12 7v5l3 2"/></svg>',
diamond:'<svg viewBox="0 0 24 24"><path d="M3 9 7 4h10l4 5-9 11z"/><path d="m7 4 5 16 5-16M3 9h18"/></svg>',
bulb:'<svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4"/><path d="M8 14a6 6 0 1 1 8 0c-.8.8-1.2 1.7-1.2 3H9.2C9.2 15.7 8.8 14.8 8 14Z"/></svg>',
target:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="m15 9 5-5M16 4h4v4"/></svg>',
star:'<svg viewBox="0 0 24 24"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z"/></svg>',
news:'<svg viewBox="0 0 24 24"><path d="M4 5h13v14H4z"/><path d="M17 8h3v11h-3M7 9h7M7 12h7M7 15h4"/></svg>',
poll:'<svg viewBox="0 0 24 24"><path d="M5 20v-5M12 20V8M19 20V4"/></svg>'
};
$$('[data-icon]').forEach(el=>el.innerHTML=ICONS[el.dataset.icon]||'');

const sponsors=[
{name:'Noratech Srl',sector:'Tecnologia / corporate',status:'DOCUMENTATO',value:'€400 + IVA',period:'17/07/2026 - 30/12/2026',asset:'Social + Centro Sportivo',next:'Sponsor Report 2026 e proposta upgrade 2027',since:'2022',type:'Sponsor',contact:'Lucia Cappelletti'},
{name:'Coperture Rasero Srl',sector:'Edilizia / impianto',status:'DOCUMENTATO',value:'€500 + IVA',period:'15/04/2026 - 15/04/2027',asset:'Striscione bordo campo + sito',next:'Preparare rinnovo',since:'2026',type:'Sponsor',contact:'copertureraserosrl@gmail.com'},
{name:'Officine Pedroncelli Srl',sector:'Mobility / officina',status:'DOCUMENTATO',value:'€500 + IVA / anno',period:'Rapporto pluriennale',asset:'Logo sui vetri laterali del pulmino',next:'Verificare scadenza e pagamento',since:'2024',type:'Sponsor',contact:'Sonia'},
{name:'DECAR Srl',sector:'Automotive',status:'ECONOMICAMENTE DOCUMENTATO',value:'€1.500 + IVA',period:'2026',asset:'Asset 2026 da ricostruire',next:'Recuperare accordo e asset',since:'2026',type:'Sponsor',contact:'Ufficio amministrativo'},
{name:'SACO Multiservizi',sector:'Servizi territoriali',status:'ECONOMICAMENTE DOCUMENTATO',value:'Rapporto ibrido',period:'2026',asset:'Sponsor + fornitura / protezioni',next:'Separare cash, fornitura e barter',since:'2026',type:'Ibrido',contact:'Da verificare'},
{name:'Bianchi Bazzi Angelo Srl',sector:'Corporate / territorio',status:'ECONOMICAMENTE DOCUMENTATO',value:'€1.500 + IVA',period:'2026',asset:'Asset 2026 da ricostruire',next:'Recuperare accordo e materiali',since:'Storico',type:'Sponsor',contact:'Da verificare'},
{name:'Saglio Sport / LEGEA',sector:'Sportswear / partner tecnico',status:'PARTNER TECNICO',value:'DA VERIFICARE',period:'2026/27 da verificare',asset:'Fornitura tecnica, kit e abbigliamento',next:'Ricostruire accordo, valore ed esclusiva',since:'2023',type:'Partner tecnico',contact:'sagliosport@libero.it'}
];

const proposals=[
{name:'Iperal',area:'Family & Community Partner',status:'In valutazione',next:'Follow-up leggero',value:'€5.000 / stagione proposto'},
{name:'Caffè Teti',area:'Coffee Partner / Club House',status:'Positivo',next:'Sopralluogo + proposta finale',value:'Fornitura / valore da definire'},
{name:'VIP Immagine',area:'Cartellonistica / sponsor board',status:'Positivo',next:'Telefonare + mappa spazi',value:'Da definire'},
{name:"McDonald's territoriale",area:'Convenzione tesserati',status:'Da formalizzare',next:'Formalizzare convenzione 10%',value:'Benefit community'},
{name:'La Roncaiola',area:'Lavanderia tecnica',status:'SOSPESA · NON INVIARE',next:'Attendere riattivazione Direzione',value:'Da definire'},
{name:'Bonazzi Grafica',area:'Grafica / stampa',status:'SOSPESA · NON INVIARE',next:'Attendere riattivazione Direzione',value:'Barter / fornitura'},
{name:'Therabody',area:'Recovery Partner',status:'Instradato B2B',next:'Compilare form partnership',value:'Da definire'}
];


const conventions=[
{name:"McDonald's territoriale",status:"IN ATTIVAZIONE",benefit:"10% su tutti i prodotti secondo proposta ricevuta",who:"Tesserati / staff, perimetro finale da confermare",how:"Tessera valida alla cassa",where:"Colico / Villa di Tirano; area franchisee Sondrio-Castione da confermare",contact:"Sebastiano Beccalli",next:"Definire formato tessere, punti vendita e formalizzazione",source:"Gmail 1a0c6d258cbeace6"},
{name:"La Piadineria",status:"PRONTA PER FORMALIZZAZIONE",benefit:"10% con badge/lettera · 12% con Carta Mondo Piada o app",who:"Community SCD da definire nell'accordo",how:"Badge/lettera oppure Carta Mondo Piada/app",where:"Piantedo · Lecco · Castione Andevenno + punti aderenti online",contact:"Annaclara Rossi",next:"Confermare interesse e ricevere lettera convenzione da firmare",source:"Gmail 1a0c32e969d98f3c"}
];

const suppliers=[
{name:"Fratelli Trussoni S.r.l.",position:"€695,86",paid:"€0",residual:"€695,86",email:"stefano.libera@trussoni.it",potential:"DA VALUTARE",next:"Ricostruire fatture 2024-2026 e referente commerciale"},
{name:"Nuova Food Italy S.r.l.s.",position:"€327,65",paid:"€0",residual:"€327,65",email:"nuovafooditaly@hotmail.com",potential:"DA VALUTARE",next:"Ricostruire fatture e condizioni commerciali"},
{name:"Dott.ssa Monica Castagna",position:"€780",paid:"€260",residual:"€520",email:"monica.castagna@outlook.com",potential:"BASSO",next:"Separare saldo pregresso dalla scelta futura"},
{name:"Fun Food Italia S.r.l.",position:"€1.093,28",paid:"€273,32",residual:"€819,96",email:"direzione@funfooditalia.com",potential:"DA VALUTARE",next:"Ricostruire volumi e margini per categoria"},
{name:"Sagim S.r.l.",position:"€471,02",paid:"€157,01",residual:"€314,01",email:"amministrazione@sagimsrl.it",potential:"DA VALUTARE",next:"Analizzare acquisti e prezzi unitari"},
{name:"Olimpiadi Duemila S.n.c.",position:"€497,76",paid:"€165,92",residual:"€331,84",email:"olimpiadi.2000@virgilio.it",potential:"DA VALUTARE",next:"Capire settore reale e storico acquisti"},
{name:"Gruppo Gimoka S.p.A.",position:"€999,67",paid:"€249,92",residual:"€749,75",email:"fulvia.bozzini@gruppogimoka.com",potential:"ALTO",next:"Collegare spesa storica alla proposta Coffee Partner"},
{name:"Panizza Natale S.n.c.",position:"€1.012,72",paid:"€253,18",residual:"€759,54",email:"panizza@dolcitalia.com",potential:"DA VALUTARE",next:"Creare paniere prodotti e ricostruire spesa storica"},
{name:"Nuova Alimentaria S.r.l.",position:"€1.341,46",paid:"€0",residual:"€1.341,46",email:"nuovaali1@nuovalimentaria.191.it",potential:"DA VALUTARE",next:"Ricostruire fatture 2024-2026 e prima rata"},
{name:"Erbagel di Sala Pietro S.n.c.",position:"€1.502",paid:"€0",residual:"€1.502",email:"marco.castelnuovo@erbagel.it",potential:"DA VALUTARE",next:"Chiudere condizioni e ricostruire storico acquisti"},
{name:"Saco Antincendio S.r.l.",position:"€122",paid:"€0",residual:"€122",email:"sacoantincendio@gmail.com",potential:"MEDIO",next:"Ricostruire servizi pluriennali e benchmark"}
];

const commercialInitiatives=[
{name:"ColicoDerviese Card · Tesserato",type:"CARD / COMMUNITY",status:"DA MODELLARE",target:"Atleti, staff, famiglie",goal:"Identità, convenzioni, benefit e relazione continuativa",next:"Definire perimetro beneficiari, funzioni e misurazione utilizzo"},
{name:"ColicoDerviese Card · Sostenitore",type:"CARD / FUNDRAISING",status:"DA MODELLARE",target:"Tifosi, famiglie, territorio",goal:"Appartenenza e sostegno economico continuativo",next:"Definire quota, durata, rinnovo e benefit"},
{name:"ColicoDerviese Card · Partner",type:"CARD / B2B",status:"DA MODELLARE",target:"Sponsor, partner, aziende",goal:"Hospitality, network e benefit B2B",next:"Definire livelli partner e collegamento dossier sponsor"},
{name:"Tessera Tifoso / Community",type:"MEMBERSHIP",status:"IDEA DA STRUTTURARE",target:"Tifosi e territorio",goal:"Trasformare pubblico occasionale in community misurabile",next:"Evitare duplicazione con Card Sostenitore"},
{name:"Spot LED Sponsor 40 secondi",type:"MEDIA / SPONSOR",status:"IN PRODUZIONE",target:"Sponsor attuali e futuri",goal:"Spot dedicato, leggibile, un solo sponsor protagonista",next:"Creare master, sottoporre idea e produrre MP4 dopo approvazione"},
{name:"Torneo nazionale 2019 · 09/05/2027",type:"EVENTO / SPONSOR",status:"DA CONFERMARE",target:"Squadre, famiglie, aziende, territorio",goal:"Sport, musica, degustazioni e asset commerciali",next:"Definire format, capacità, pacchetti e rete ricettiva"},
{name:"Video Partner / Match Content",type:"MEDIA / VIDEO",status:"IDEA DA STRUTTURARE",target:"Sponsor e partner media",goal:"Valorizzare partite, highlight e clip SCD nel rispetto dei diritti Pixellot",next:"Definire diritti, formati, inventory e proof di delivery"},
{name:"Merchandising SCD",type:"MERCHANDISING / COMMUNITY",status:"IDEA DA STRUTTURARE",target:"Tifosi, famiglie, tesserati",goal:"Prodotti ufficiali, gadget e capsule partner",next:"Definire gamma, costi, margini, produzione e canale vendita"},
{name:"Gazebo & Partner Corner",type:"EVENTO / ATTIVAZIONE",status:"IDEA DA VALIDARE",target:"Sponsor, fornitori, convenzioni",goal:"Presenza fisica utile durante tornei, open day e giornate community",next:"Definire spazi, sicurezza, servizi e regole evento"},
{name:"Strutture brandizzate",type:"IMPIANTO / SPONSOR",status:"IDEA DA STUDIARE",target:"Sponsor pluriennali / territoriali",goal:"Associare partner a spazi reali con presenza continuativa",next:"Censire aree, misure, esclusività, durata e proof fotografico"},
{name:"Mascotte Partner",type:"FAMILY / ATTIVAZIONE",status:"IDEA DA VALIDARE",target:"Brand family-friendly",goal:"Divisa mascotte, pre-gara, foto, eventi e contenuti community",next:"Definire inventory, frequenza e regole di utilizzo"},
{name:"Sublimated Kit Partner",type:"KIT / SPONSOR",status:"IDEA DA STUDIARE",target:"Sponsor territoriali / tecnici",goal:"Posizioni integrate su divise sublimatiche e pacchetti multi-canale",next:"Censire posizioni libere e compatibilità tecnica/regolamentare"},
{name:"Partner Hub Web App SCD",type:"DIGITALE / B2B",status:"IN SVILUPPO",target:"Sponsor, convenzioni e partner",goal:"Schede partner, progetti, benefit, contenuti e proof di delivery",next:"Collegare catalogo pubblico, CRM e stato erogazione"}
];

const audience=[
{segment:"Persone attive censite",value:"268",unit:"persone",source:"00 CONTROL ROOM",note:"KPI canonico. Non sommare automaticamente con atleti e staff."},
{segment:"Atleti attivi",value:"221",unit:"atleti",source:"00 CONTROL ROOM",note:"Sottoinsieme della base persone."},
{segment:"Staff attivo",value:"53",unit:"persone",source:"00 CONTROL ROOM",note:"Può sovrapporsi alla base persone."},
{segment:"Atleti operativi",value:"233",unit:"atleti",source:"00 DASH TESSERAMENTI",note:"Definizione diversa da Atleti attivi."},
{segment:"Atleti FIGC ufficiali",value:"134",unit:"atleti",source:"00 DASH TESSERAMENTI",note:"Sottoinsieme degli atleti operativi."},
{segment:"Copertura FIGC",value:"57,9%",unit:"copertura",source:"Dashboard tesseramenti",note:"Indicatore qualità dati, non reach commerciale."},
{segment:"Tessere richieste stampa McDonald's",value:"250",unit:"tessere",source:"Gmail 1a0c6d258cbeace6",note:"Dato logistico, NON KPI audience."}
];

const assets=[
['Family & Community Partner','Community','Disponibile','€5.000'],
['Official Water Partner','Fornitura / branding','In proposta','Da definire'],
['Official Coffee Partner','Club House','In proposta','Da definire'],
['Fondo Solidale / Sport & Futuro','Sociale','Attivo','€2.500'],
['Servizio Navetta','Servizio famiglie','Attivo','Da definire'],
['Torneo Title Sponsor','Evento','Disponibile','€7.000'],
['Centro Sportivo - Area Club House','Struttura','Disponibile','Da definire'],
['Area giochi / fitness outdoor','Struttura','In sviluppo','Da definire'],
['LED bordo campo','Media','Disponibile','Da definire'],
['Divise settore giovanile','Kit tecnico','Parziale','€1.500'],
['Sport Tourism Network','Turismo','In sviluppo','Da definire'],
['Performance & Recovery Center','Performance','Da studiare','Da definire'],
['Divise sublimatiche','Kit / visibilità','Da censire per posizioni','Da definire'],
['Striscioni & cartellonistica','Impianto','Da censire','Da definire'],
['Gazebo / Partner Corner','Evento','In sviluppo','Da definire'],
['Strutture brandizzate','Impianto','In sviluppo','Da definire'],
['Mascotte Partner','Family / attivazione','In sviluppo','Da definire'],
['Pixellot & Match Content','Media / video','Da strutturare','Da definire'],
['Merchandising SCD','Community / retail','Da strutturare','Da definire'],
['Carta Tifoso / Sostenitore','Membership','Da modellare','Da definire'],
['Carta Tesserato','Community / servizi','Da modellare','Da definire'],
['Partner Hub Web App','Digitale','In sviluppo','Da definire']
];

const led=[
['DEGO ARREDAMENTI','IN REVISIONE'],['ATV VALVE','IN REVISIONE'],['IPERAL','IN REVISIONE'],['LEGEA','IN REVISIONE'],['NBC ELETTRONICA','IN REVISIONE'],['SAGLIO SPORT','IN REVISIONE'],['HDI MAGLIA','ATTESA APPROVAZIONE'],['DELLOCA','ATTESA APPROVAZIONE'],['CARCANO','ATTESA APPROVAZIONE'],['MDS IMPIANTI','FONTI VERIFICATE'],['RIGAMONTI GEOM. GINO','FONTI VERIFICATE'],['TURBOJET SPURGHI','FONTI VERIFICATE']
];

const events=[
['09 MAG 2027','Torneo nazionale · annata 2019','16 squadre · sport, musica e territorio','DA CONFERMARE'],
['DA DEFINIRE','Family & Community Day','Attivazione territoriale sponsor','IN VALUTAZIONE'],
['DA FISSARE','Sopralluogo Caffè Teti','Club House · Coffee Partner','URGENTE']
];

const news=[
['17/09/2026','Under 18 Élite: ritiro dal campionato 2026/27','SCD ufficiale'],
['09/07/2026','Affiliazione SCD ColicoDerviese × AC Monza','SCD ufficiale'],
['20/07/2026','Iscrizioni stagione 2026/27 aperte','SCD ufficiale']
];

const stats={
prima2526:{title:'Prima Squadra · Promozione 2025/26 · Girone B',m:[['Posizione','4ª'],['Punti','59'],['Gare','30'],['Media','1,97']],note:'Dato storico ufficiale. La classifica 2026/27 non viene mostrata finché non è sincronizzata con una fonte ufficiale aggiornata.',source:'CR Lombardia'},
u16:{title:'U16 · stagione 2025/26',m:[['Esito','Play-off vinti'],['Percorso','Verso Élite'],['Fonte','SCD'],['Stato','Storico']],note:'Percorso storico SCD. Nessun punteggio inventato.',source:'SCD ufficiale'},
u18:{title:'Under 18 Élite · 2026/27',m:[['Stato','Ritirata'],['Data','17/09/2026'],['Competizione','U18 Élite'],['Fonte','SCD']],note:'Ritiro formalmente comunicato.',source:'SCD ufficiale'}
};

const folders=['Contratti','Proposte','Loghi ufficiali','Foto','Video & LED','Email & verbali','Fatture','Report sponsor','Eventi','Convenzioni','Rassegna stampa','Altro'];
const tags=['@Direzione','@Commerciale','@Amministrazione','@Marketing','@Eventi','@Segreteria'];
const pollOptions=[['led','LED & Media'],['eventi','Tornei & Eventi'],['conv','Convenzioni famiglie'],['club','Club House & Hospitality']];

function openView(name){
  $$('.view').forEach(v=>v.classList.remove('active'));
  $('#view-'+name)?.classList.add('active');
  $$('.nav-link').forEach(b=>b.classList.toggle('active',b.dataset.view===name));
  if(innerWidth<901)$('#sidebar').classList.remove('open');
  window.scrollTo({top:0,behavior:'smooth'});
}
$$('[data-view]').forEach(b=>b.addEventListener('click',()=>openView(b.dataset.view)));
$('#mobileMenu').onclick=()=>$('#sidebar').classList.toggle('open');

function renderKpis(){
  const data=[
    ['users','7','Sponsor / partner','rapporti documentati'],
    ['proposal','7','Proposte vive','pipeline corrente'],
    ['file','€4,4K','Cash verificato','dato prudenziale'],
    ['calendar','3','Eventi / attivazioni','in evidenza'],
    ['target','4','Asset disponibili','da sviluppare']
  ];
  $('#homeKpis').innerHTML=data.map(x=>'<article class="kpi-card"><span class="kpi-icon">'+(ICONS[x[0]]||'')+'</span><div><strong>'+x[1]+'</strong><small>'+x[2]+'</small></div><em>'+x[3]+'</em></article>').join('');
}

function renderSponsorStrip(){
  const names=[...sponsors.map(s=>s.name),'IPERAL','HDI MAGLIA','DELLOCA','CARCANO'];
  const row=names.map(n=>'<span class="strip-item">'+esc(n)+'</span>').join('');
  $('#sponsorStrip').innerHTML=row+row;
}

function homeContracts(){
  $('#homeContracts').innerHTML='<table class="table-mini"><thead><tr><th>Sponsor</th><th>Tipologia</th><th>Validità</th><th>Stato</th></tr></thead><tbody>'+
  sponsors.slice(0,4).map(s=>'<tr onclick="openSponsor(\''+s.name.replace(/'/g,"\\'")+'\')"><td><b>'+esc(s.name)+'</b></td><td>'+esc(s.type)+'</td><td>'+esc(s.period)+'</td><td><span class="status-badge">Attivo</span></td></tr>').join('')+'</tbody></table>';
}
function homeProposals(){
  $('#homeProposals').innerHTML='<table class="table-mini"><thead><tr><th>Azienda</th><th>Area</th><th>Stato</th><th>Valore</th></tr></thead><tbody>'+
  proposals.slice(0,4).map(p=>'<tr><td><b>'+esc(p.name)+'</b></td><td>'+esc(p.area)+'</td><td><span class="status-badge '+(/Positivo|valutazione/.test(p.status)?'blue':'orange')+'">'+esc(p.status)+'</span></td><td>'+esc(p.value)+'</td></tr>').join('')+'</tbody></table>';
}
function renderAvailability(q=''){
  const rows=assets.filter(a=>(a.join(' ')).toLowerCase().includes(q.toLowerCase())).slice(0,5);
  $('#availabilityResults').innerHTML=rows.map(a=>'<div class="compact-item"><div><b>'+esc(a[0])+'</b><small>'+esc(a[1])+'</small></div><em>'+esc(a[2])+'</em></div>').join('') || '<div class="compact-item"><small>Nessun risultato</small></div>';
}
$('#availabilitySearch').addEventListener('input',e=>renderAvailability(e.target.value));

function renderHomeEvents(){
  $('#homeEvents').innerHTML=events.map(e=>'<div class="event-row"><time>'+esc(e[0])+'</time><div><b>'+esc(e[1])+'</b><span>'+esc(e[2])+'</span></div><em>'+esc(e[3])+'</em></div>').join('');
}
function renderPipeline(){
  $('#homePipeline').innerHTML=proposals.slice(0,5).map(p=>'<div class="pipeline-row"><div><b>'+esc(p.name)+'</b><span>'+esc(p.area)+'</span></div><em>'+esc(p.status)+'</em></div>').join('');
}
function renderNews(){
  $('#weeklyNews').innerHTML='<div class="news-status">Nessuna nuova pubblicazione ufficiale censita negli ultimi 7 giorni. Mostro gli ultimi aggiornamenti verificati.</div>'+
  news.map(n=>'<div class="news-row"><time>'+esc(n[0])+'</time><div><b>'+esc(n[1])+'</b></div><em>'+esc(n[2])+'</em></div>').join('');
}
function renderStats(key='prima2526'){
  const s=stats[key];
  $('#statsSnapshot').innerHTML='<div class="stats-title"><small>STORICO VERIFICATO</small><h4>'+esc(s.title)+'</h4></div><div class="stats-metrics">'+s.m.map(m=>'<div><small>'+esc(m[0])+'</small><b>'+esc(m[1])+'</b></div>').join('')+'</div><p class="stats-note">'+esc(s.note)+'</p><span class="stats-source">Fonte: '+esc(s.source)+'</span>';
}
$('#statsSelector').addEventListener('change',e=>renderStats(e.target.value));

function pollState(){try{return JSON.parse(localStorage.getItem('scd_poll_v8')||'{"votes":{},"choice":null}')}catch(e){return {votes:{},choice:null}}}
function renderPoll(){
  const s=pollState(),total=Object.values(s.votes).reduce((a,b)=>a+Number(b||0),0);
  $('#livePoll').innerHTML=pollOptions.map(([id,label])=>{const n=Number(s.votes[id]||0),pct=total?Math.round(n/total*100):0;return '<button class="poll-option '+(s.choice===id?'selected':'')+'" data-poll="'+id+'"><div><b>'+label+'</b><span>'+n+' · '+pct+'%</span></div><i><span style="width:'+pct+'%"></span></i></button>'}).join('');
  $$('[data-poll]').forEach(b=>b.onclick=()=>{const st=pollState();if(st.choice)return;st.choice=b.dataset.poll;st.votes[b.dataset.poll]=Number(st.votes[b.dataset.poll]||0)+1;localStorage.setItem('scd_poll_v8',JSON.stringify(st));renderPoll()});
}
function renderTags(){
  const active=localStorage.getItem('scd_tag_v8')||'';
  $('#peopleTags').innerHTML=tags.map(t=>'<button class="people-tag '+(active===t?'active':'')+'" data-tag="'+t+'">'+t+'</button>').join('');
  $('#tagState').textContent=active?'Tag attivo: '+active:'Nessun tag selezionato';
  $$('[data-tag]').forEach(b=>b.onclick=()=>{const next=active===b.dataset.tag?'':b.dataset.tag;localStorage.setItem('scd_tag_v8',next);renderTags()});
}

function sponsorCard(s){
  return '<article class="sponsor-card" onclick="openSponsor(\''+s.name.replace(/'/g,"\\'")+'\')"><div class="sponsor-cover"></div><div class="sponsor-body"><div class="sponsor-head"><div class="brand-tile">'+esc(initials(s.name))+'</div><div><h3>'+esc(s.name)+'</h3><p>'+esc(s.sector)+'</p></div><span class="sponsor-tag">'+esc(s.status)+'</span></div><div class="sponsor-data"><div><small>VALORE</small><b>'+esc(s.value)+'</b></div><div><small>PERIODO</small><b>'+esc(s.period)+'</b></div><div><small>ASSET</small><b>'+esc(s.asset)+'</b></div><div><small>PROSSIMO PASSO</small><b>'+esc(s.next)+'</b></div></div></div></article>';
}
function renderSponsorViews(){
  $('#sponsorGrid').innerHTML=sponsors.map(sponsorCard).join('');
  $('#storiciGrid').innerHTML=sponsors.filter(s=>['Noratech Srl','Officine Pedroncelli Srl','Saglio Sport / LEGEA','Bianchi Bazzi Angelo Srl'].includes(s.name)).map(sponsorCard).join('');
}
$('#sponsorFilter').addEventListener('input',e=>{const q=e.target.value.toLowerCase();$('#sponsorGrid').querySelectorAll('.sponsor-card').forEach((el,i)=>el.hidden=!sponsors[i].name.toLowerCase().includes(q))});
$('#sponsorStatus').addEventListener('change',e=>{const q=e.target.value;$('#sponsorGrid').querySelectorAll('.sponsor-card').forEach((el,i)=>el.hidden=q&&!sponsors[i].status.includes(q))});

function renderContracts(){
  $('#contractsTable').innerHTML='<div class="data-row header"><span>Sponsor</span><span>Tipologia</span><span>Validità</span><span>Valore</span><span>Prossima azione</span></div>'+
  sponsors.map(s=>'<div class="data-row" onclick="openSponsor(\''+s.name.replace(/'/g,"\\'")+'\')"><b>'+esc(s.name)+'</b><span>'+esc(s.type)+'</span><span>'+esc(s.period)+'</span><span>'+esc(s.value)+'</span><span>'+esc(s.next)+'</span></div>').join('');
}
function renderProposalGrid(){
  $('#proposalGrid').innerHTML=proposals.map(p=>'<article class="proposal-card"><h3>'+esc(p.name)+'</h3><p>'+esc(p.area)+'</p><div class="card-row"><span>Stato</span><b>'+esc(p.status)+'</b></div><div class="card-row"><span>Valore</span><b>'+esc(p.value)+'</b></div><div class="card-row"><span>Prossima azione</span><b>'+esc(p.next)+'</b></div></article>').join('');
}

function renderConventions(){
  if($('#convenzioniKpi'))$('#convenzioniKpi').innerHTML=[
    ['Convenzioni censite',String(conventions.length),'Registro dedicato 2026/27'],
    ['Pronte / in attivazione',String(conventions.filter(x=>/PRONTA|ATTIVAZIONE/.test(x.status)).length),'Nessuna pubblicazione prima della formalizzazione'],
    ['Card collegate','2','McDonald\'s + La Piadineria da integrare']
  ].map(x=>'<article class="report-card"><h3>'+x[0]+'</h3><div class="report-value">'+x[1]+'</div><p>'+x[2]+'</p></article>').join('');
  if($('#convenzioniGrid'))$('#convenzioniGrid').innerHTML=conventions.map(x=>'<article class="proposal-card"><h3>'+esc(x.name)+'</h3><p>'+esc(x.benefit)+'</p><div class="card-row"><span>Stato</span><b>'+esc(x.status)+'</b></div><div class="card-row"><span>Destinatari</span><b>'+esc(x.who)+'</b></div><div class="card-row"><span>Come</span><b>'+esc(x.how)+'</b></div><div class="card-row"><span>Dove</span><b>'+esc(x.where)+'</b></div><div class="card-row"><span>Prossima azione</span><b>'+esc(x.next)+'</b></div><small>'+esc(x.source)+'</small></article>').join('');
}
function renderSuppliers(){
  if($('#fornitoriKpi'))$('#fornitoriKpi').innerHTML=[
    ['Fornitori censiti',String(suppliers.length),'Posizioni economiche documentate'],
    ['Radar alto',String(suppliers.filter(x=>x.potential==='ALTO').length),'Da trasformare in proposta mirata'],
    ['Volumi storici','IN RICOSTRUZIONE','Le posizioni correnti non sono spesa annua']
  ].map(x=>'<article class="report-card"><h3>'+x[0]+'</h3><div class="report-value">'+x[1]+'</div><p>'+x[2]+'</p></article>').join('');
  if($('#fornitoriTable'))$('#fornitoriTable').innerHTML='<div class="data-row header"><span>Fornitore</span><span>Posizione 2026</span><span>Residuo</span><span>Potenziale</span><span>Prossima azione</span></div>'+suppliers.map(x=>'<div class="data-row"><b>'+esc(x.name)+'</b><span>'+esc(x.position)+'</span><span>'+esc(x.residual)+'</span><span>'+esc(x.potential)+'</span><span>'+esc(x.next)+'</span></div>').join('');
}
function renderCommercialInitiatives(){
  if($('#iniziativeGrid'))$('#iniziativeGrid').innerHTML=commercialInitiatives.map(x=>'<article class="proposal-card"><h3>'+esc(x.name)+'</h3><p>'+esc(x.goal)+'</p><div class="card-row"><span>Tipo</span><b>'+esc(x.type)+'</b></div><div class="card-row"><span>Target</span><b>'+esc(x.target)+'</b></div><div class="card-row"><span>Stato</span><b>'+esc(x.status)+'</b></div><div class="card-row"><span>Prossima azione</span><b>'+esc(x.next)+'</b></div></article>').join('');
}
function renderAudience(){
  if($('#audienceGrid'))$('#audienceGrid').innerHTML=audience.map(x=>'<article class="report-card"><h3>'+esc(x.segment)+'</h3><div class="report-value">'+esc(x.value)+'</div><p>'+esc(x.unit)+' · '+esc(x.source)+'</p><p>'+esc(x.note)+'</p></article>').join('');
  $('[data-public-link]').forEach(b=>b.onclick=()=>location.href='/sponsor/');
}

function renderFolders(){
  $('#folderGrid').innerHTML=folders.map(x=>'<article class="folder-card"><div class="folder-icon"></div><h3>'+esc(x)+'</h3><p>Collega qui i file ufficiali del progetto Sponsor.</p></article>').join('');
}
function renderLed(){
  $('#ledGrid').innerHTML=led.map(x=>'<article class="led-card"><div class="led-logo">'+esc(initials(x[0]))+'</div><div><h3>'+esc(x[0])+'</h3><p>Materiale ufficiale da usare senza alterare il marchio.</p></div><span class="status-badge '+(/ATTESA/.test(x[1])?'orange':'blue')+'">'+esc(x[1])+'</span></article>').join('');
}
function renderEvents(){
  $('#eventGrid').innerHTML=events.map(e=>'<article class="event-card"><small>'+esc(e[0])+'</small><h3>'+esc(e[1])+'</h3><p>'+esc(e[2])+' · '+esc(e[3])+'</p></article>').join('');
}
function renderReport(){
  const cash=4400;
  $('#reportGrid').innerHTML=[
    ['Cash verificato','€'+cash.toLocaleString('it-IT'),'Esclusi rapporti ibridi/non verificati'],
    ['Rapporti documentati',String(sponsors.length),'Sponsor, partner e ibridi censiti'],
    ['Proposte vive',String(proposals.length),'Pipeline da seguire'],
    ['LED censiti',String(led.length),'Stato produzione / approvazione'],
    ['Asset disponibili',String(assets.filter(a=>a[2]==='Disponibile').length),'Da verificare sempre esclusiva'],
    ['Audit prioritari','3','DECAR · SACO · Bianchi Bazzi']
  ].map(x=>'<article class="report-card"><h3>'+x[0]+'</h3><div class="report-value">'+x[1]+'</div><p>'+x[2]+'</p></article>').join('');
}
function renderAssets(){
  $('#assetGrid').innerHTML=assets.map(a=>'<article class="asset-card"><h3>'+esc(a[0])+'</h3><p>'+esc(a[1])+'</p><div class="card-row"><span>Stato</span><b>'+esc(a[2])+'</b></div><div class="card-row"><span>Valore</span><b>'+esc(a[3])+'</b></div></article>').join('');
}

function fit(s,a){
  const st=(s.sector+' '+s.type).toLowerCase(),at=(a[0]+' '+a[1]).toLowerCase();let n=1,why=[];
  if(/tecnologia/.test(st)&&/media|led/.test(at)){n+=3;why.push('Tecnologia coerente con media/LED')}
  if(/automotive|mobility/.test(st)&&/navetta|evento/.test(at)){n+=3;why.push('Mobilità coerente con servizio/evento')}
  if(/sportswear|tecnico/.test(st)&&/divise|kit/.test(at)){n+=4;why.push('Partner tecnico coerente con kit')}
  if(/edilizia/.test(st)&&/club house|struttura/.test(at)){n+=3;why.push('Settore coerente con struttura')}
  if(a[2]==='Disponibile'){n+=1;why.push('Asset segnato disponibile')}
  return {level:n>=4?'high':n>=2?'mid':'low',why:why.length?why:['Nessuna coerenza specifica rilevata dai dati attuali']};
}
function renderScenario(){
  const ss=sponsors.slice(0,5),aa=assets.filter(a=>a[2]==='Disponibile'||a[2]==='Parziale').slice(0,5);
  let html='<div class="fit-grid"><div class="fit-cell head">SPONSOR / ASSET</div>'+aa.map(a=>'<div class="fit-cell head">'+esc(a[0])+'</div>').join('');
  ss.forEach((s,si)=>{html+='<div class="fit-cell head">'+esc(s.name)+'</div>';aa.forEach((a,ai)=>{const f=fit(s,a);html+='<button class="fit-cell '+f.level+'" data-fit="'+si+':'+ai+'">'+(f.level==='high'?'FORTE':f.level==='mid'?'VALUTARE':'DEBOLE')+'</button>'})});
  html+='</div>';$('#fitMatrix').innerHTML=html;
  $$('[data-fit]').forEach(b=>b.onclick=()=>{const [si,ai]=b.dataset.fit.split(':').map(Number),s=ss[si],a=aa[ai],f=fit(s,a);$('#scenarioInspector').innerHTML='<h3>'+esc(s.name)+' × '+esc(a[0])+'</h3><ul>'+f.why.map(x=>'<li>'+esc(x)+'</li>').join('')+'<li>Verificare esclusiva e disponibilità reale prima di proporre.</li><li>Il sistema non predice la firma del contratto.</li></ul>'});
}

function detectDevice(){
  const w=innerWidth,h=innerHeight,dpr=devicePixelRatio||1,coarse=matchMedia('(pointer:coarse)').matches,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  return {format:w<600?'Phone':w<1024?'Tablet':w<1600?'Desktop':'Large display',viewport:w+'×'+h,dpr:dpr.toFixed(1)+'×',input:coarse?'Touch':'Mouse / trackpad',motion:reduced?'Ridotto':'Normale'};
}
function renderSettings(){
  const d=detectDevice();
  $('#settingsGrid').innerHTML=
  '<article class="settings-card"><h3>Asset immutabili</h3><ul><li>Logo SCD ufficiale: non ridisegnare, non ricolorare.</li><li>Loghi sponsor: solo file ufficiali / press kit verificati.</li><li>Kit: stagione corretta, colori e sponsor placement reali.</li><li>Avversari: stemmi reali da club, FIGC/LND o fonte ufficiale.</li></ul></article>'+
  '<article class="settings-card"><h3>Dispositivo rilevato</h3><p><b>'+d.format+'</b> · '+d.viewport+' · '+d.dpr+' · '+d.input+' · movimento '+d.motion+'.</p><p>La piattaforma si adatta senza inviare telemetria pubblicitaria.</p></article>'+
  '<article class="settings-card"><h3>Gerarchia fonti</h3><ol><li>Cartella master SCD.</li><li>Sito / press kit ufficiale.</li><li>Federazione, lega, istituzione.</li><li>Archivio verificato.</li><li>Fonte pubblica autorevole con controllo incrociato.</li></ol></article>'+
  '<article class="settings-card"><h3>Regola creativa</h3><p>Si migliora impaginazione, scontorno, risoluzione e ambientazione. Non si altera il contenuto sostanziale di marchi, kit, dati o contratti.</p></article>';
}

window.openSponsor=function(name){
  const s=sponsors.find(x=>x.name===name);if(!s)return;
  $('#sponsorDetail').innerHTML='<button class="btn-light" id="detailBack">← Sponsor</button><section class="detail-hero"><div><small>'+esc(s.sector.toUpperCase())+'</small><h1>'+esc(s.name)+'</h1><p>'+esc(s.asset)+'</p></div></section><section class="detail-summary"><div><small>DAL</small><b>'+esc(s.since)+'</b></div><div><small>TIPO</small><b>'+esc(s.type)+'</b></div><div><small>VALORE</small><b>'+esc(s.value)+'</b></div><div><small>PERIODO</small><b>'+esc(s.period)+'</b></div><div><small>STATO</small><b>'+esc(s.status)+'</b></div></section><section class="detail-layout"><article class="detail-panel"><h3>Contratto / rapporto corrente</h3><p>'+esc(s.asset)+'</p><p><b>Prossima azione:</b> '+esc(s.next)+'</p></article><article class="detail-panel"><h3>Contatto / referente</h3><p>'+esc(s.contact)+'</p><p>Qui andranno collegati documenti, logo ufficiale, foto, video, fatture e storico.</p></article></section>';
  $('#detailBack').onclick=()=>openView('sponsor');openView('detail');
};

function searchItems(){
  return [
    ...sponsors.map(s=>({title:s.name,meta:'Sponsor · '+s.sector,view:'sponsor',action:()=>openSponsor(s.name)})),
    ...proposals.map(p=>({title:p.name,meta:'Proposta · '+p.area,view:'proposte'})),
    ...assets.map(a=>({title:a[0],meta:'Asset · '+a[2],view:'opportunita'})),
    ...led.map(l=>({title:l[0],meta:'LED · '+l[1],view:'media'}))
  ];
}
$('#globalSearch').addEventListener('input',e=>{const q=e.target.value.toLowerCase().trim(),box=$('#searchResults');if(!q){box.hidden=true;return}const rows=searchItems().filter(x=>(x.title+' '+x.meta).toLowerCase().includes(q)).slice(0,12);box.innerHTML=rows.length?rows.map((x,i)=>'<div class="search-result" data-sr="'+i+'"><b>'+esc(x.title)+'</b><small>'+esc(x.meta)+'</small></div>').join(''):'<div class="search-result"><b>Nessun risultato</b></div>';box.hidden=false;$$('[data-sr]').forEach(el=>el.onclick=()=>{const x=rows[+el.dataset.sr];box.hidden=true;e.target.value='';x.action?x.action():openView(x.view)})});
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('#globalSearch').focus()}});

function liaAnswer(q){
  const t=q.toLowerCase();
  if(t.includes('led'))return 'LED: HDI Maglia, Dell’Oca e Carcano sono in attesa approvazione; DEGO, ATV, Iperal, LEGEA, NBC e Saglio sono in revisione.';
  if(t.includes('asset'))return 'Asset segnati disponibili: Family & Community Partner, Torneo Title Sponsor, Club House e LED bordo campo. Prima di proporre va verificata l’esclusiva.';
  if(t.includes('rinn'))return 'Rinnovi prioritari: Rasero, Noratech e verifica scadenza Pedroncelli.';
  if(t.includes('evento'))return 'In evidenza: torneo nazionale 9 maggio 2027 da confermare, Family & Community Day da definire e sopralluogo Caffè Teti da fissare.';
  if(t.includes('report'))return 'Cash verificato normalizzato: €4.400. Audit prioritari: DECAR, SACO e Bianchi Bazzi.';
  if(t.includes('sponsor'))return 'Posso cercare nel portafoglio attuale, nella pipeline e negli asset. Per ricerca esterna territoriale serve una fonte web aggiornata.';
  return 'Posso aiutarti su sponsor, proposte, contratti, asset, LED, rinnovi, eventi e report usando i dati presenti nella piattaforma.';
}
function addLia(text,cls){const d=document.createElement('div');d.className=cls;d.textContent=text;$('#liaChat').appendChild(d);$('#liaChat').scrollTop=$('#liaChat').scrollHeight}
$$('[data-lia]').forEach(b=>b.onclick=()=>{addLia(b.dataset.lia,'lia-user');setTimeout(()=>addLia(liaAnswer(b.dataset.lia),'lia-bot'),80)});
$('#liaForm').onsubmit=e=>{e.preventDefault();const q=$('#liaInput').value.trim();if(!q)return;addLia(q,'lia-user');$('#liaInput').value='';setTimeout(()=>addLia(liaAnswer(q),'lia-bot'),80)};

const modal=$('#newSponsorModal');
function openModal(){modal.hidden=false}
$('#homeNewSponsor').onclick=openModal;$('#newSponsorBtn').onclick=openModal;$('#closeNewSponsor').onclick=()=>modal.hidden=true;$('#cancelNewSponsor').onclick=()=>modal.hidden=true;
$('#newSponsorForm').onsubmit=e=>{e.preventDefault();const fd=new FormData(e.target),draft=Object.fromEntries(fd.entries()),arr=JSON.parse(localStorage.getItem('scd_drafts_v8')||'[]');arr.push({...draft,created:new Date().toISOString()});localStorage.setItem('scd_drafts_v8',JSON.stringify(arr));modal.hidden=true;e.target.reset();alert('Bozza salvata localmente. Nessuna pubblicazione o invio è stato effettuato.')};

$('#promoReviewBtn').onclick=()=>{localStorage.setItem('scd_promo_review','review');$('#promoText').textContent='Promozione messa in revisione interna. Nessuna pubblicazione automatica.'};

renderKpis();renderSponsorStrip();homeContracts();homeProposals();renderAvailability();renderHomeEvents();renderPipeline();renderNews();renderStats();renderPoll();renderTags();
renderSponsorViews();renderContracts();renderProposalGrid();renderConventions();renderSuppliers();renderCommercialInitiatives();renderAudience();renderFolders();renderLed();renderEvents();renderReport();renderAssets();renderScenario();renderSettings();

function activateKeyboardCards(){
  document.addEventListener('keydown',e=>{
    const card=e.target.closest('.macro-card[role="button"],.sponsor-card[role="button"]');
    if(!card || !['Enter',' '].includes(e.key))return;
    e.preventDefault();
    if(card.matches('.macro-card')) openView(card.dataset.view);
    if(card.matches('.sponsor-card')) openSponsor(card.dataset.sponsorName);
  });
}
activateKeyboardCards();

let lastModalFocus=null;
function openSponsorModalAccessible(){
  lastModalFocus=document.activeElement;
  modal.hidden=false;
  requestAnimationFrame(()=>$('#newSponsorForm input[name="name"]')?.focus());
}
$('#homeNewSponsor').onclick=openSponsorModalAccessible;
$('#newSponsorBtn').onclick=openSponsorModalAccessible;
function closeSponsorModalAccessible(){
  modal.hidden=true;
  if(lastModalFocus&&typeof lastModalFocus.focus==='function')lastModalFocus.focus();
}
$('#closeNewSponsor').onclick=closeSponsorModalAccessible;
$('#cancelNewSponsor').onclick=closeSponsorModalAccessible;
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)closeSponsorModalAccessible()});


/* ===== R40.1 CRM RELAZIONALE ===== */
const crmState={rows:[],selected:null,loading:false,error:''};

function crmPolicyLabel(value){
  const v=String(value||'').toUpperCase();
  if(v==='SOSPESO_NON_INVIARE')return 'SOSPESO · NON INVIARE';
  if(v==='NO_CONTACT')return 'NO CONTACT';
  if(v==='AUTO_OK')return 'AUTO OK';
  if(v==='MANUALE')return 'MANUALE';
  return v||'DA DEFINIRE';
}
function crmBlocked(row){
  return /SOSPESO|NO_CONTACT/.test(String(row?.contactPolicy||'').toUpperCase());
}
async function crmApi(id=''){
  const url='/api/sponsor/crm'+(id?'?id='+encodeURIComponent(id):'?limit=300');
  const r=await fetch(url,{credentials:'same-origin',cache:'no-store'});
  const j=await r.json().catch(()=>({}));
  if(!r.ok||j.ok===false)throw new Error(j.error||'CRM non disponibile');
  return j.data||{};
}
function renderCrmKpis(kpi={}){
  const el=$('#crmKpis');if(!el)return;
  const data=[
    ['Profili CRM',String(kpi.total??crmState.rows.length),'Record canonici persone/aziende'],
    ['Relazioni aperte',String(kpi.active??'—'),'Escluse chiuse negative/perse'],
    ['Contatti sospesi',String(kpi.suspended??crmState.rows.filter(crmBlocked).length),'Nessun invio esterno automatico'],
    ['Prossime azioni',String(kpi.due??crmState.rows.filter(x=>x.nextDeadline).length),'Profili con scadenza valorizzata']
  ];
  el.innerHTML=data.map(x=>'<article class="report-card"><h3>'+esc(x[0])+'</h3><div class="report-value">'+esc(x[1])+'</div><p>'+esc(x[2])+'</p></article>').join('');
}
function crmFilteredRows(){
  const q=String($('#crmSearch')?.value||'').trim().toLowerCase();
  const policy=String($('#crmPolicy')?.value||'').trim().toUpperCase();
  return crmState.rows.filter(x=>{
    const hay=[x.name,x.category,x.area,x.location,x.tags,x.email,x.phone,x.owner,x.relationshipStatus].join(' ').toLowerCase();
    return (!q||hay.includes(q))&&(!policy||String(x.contactPolicy||'').toUpperCase()===policy);
  });
}
function renderCrmTable(){
  const el=$('#crmTable');if(!el)return;
  if(crmState.loading){el.innerHTML='<div class="crm-empty">Caricamento CRM…</div>';return}
  if(crmState.error){el.innerHTML='<div class="crm-empty"><b>CRM non disponibile</b><span>'+esc(crmState.error)+'</span></div>';return}
  const rows=crmFilteredRows();
  el.innerHTML='<div class="crm-row crm-head"><span>Profilo</span><span>Relazione</span><span>Ultimo contatto</span><span>Prossima azione</span><span>Policy</span></div>'+
    (rows.length?rows.map(x=>
      '<button class="crm-row crm-record" data-crm-id="'+esc(x.id)+'">'+
      '<span><b>'+esc(x.name)+'</b><small>'+esc(x.category||x.type||'')+'</small></span>'+
      '<span><b>'+esc(x.relationshipStatus||'—')+'</b><small>'+esc(x.owner||'Owner da definire')+'</small></span>'+
      '<span><b>'+esc(x.lastContact||x.lastTouchpoint?.timestamp||'—')+'</b><small>'+esc(x.lastTouchpoint?.channel||'')+'</small></span>'+
      '<span><b>'+esc(x.nextAction||'Nessuna azione registrata')+'</b><small>'+esc(x.nextDeadline||'')+'</small></span>'+
      '<span><em class="crm-policy '+(crmBlocked(x)?'blocked':'')+'">'+esc(crmPolicyLabel(x.contactPolicy))+'</em><small>'+esc(x.preferredChannel||'')+'</small></span>'+
      '</button>').join(''):'<div class="crm-empty">Nessun profilo corrisponde ai filtri.</div>');
  $$('[data-crm-id]').forEach(b=>b.onclick=()=>openCrmProfile(b.dataset.crmId));
}
function renderCrmInspector(data){
  const el=$('#crmInspector');if(!el)return;
  if(!data){el.innerHTML='<h3>Profilo CRM</h3><p>Seleziona una persona o azienda per vedere il profilo relazionale completo.</p>';return}
  const s=data.stakeholder||{},blocked=data.safety?.externalContactBlocked;
  const tps=Array.isArray(data.touchpoints)?data.touchpoints:[];
  const tasks=Array.isArray(data.tasks)?data.tasks:[];
  const opps=Array.isArray(data.opportunities)?data.opportunities:[];
  const agreements=Array.isArray(data.agreements)?data.agreements:[];
  el.innerHTML=
    '<div class="crm-profile-head"><small>'+esc(s.TIPO||'PROFILO')+'</small><h2>'+esc(s.NOME||'Profilo')+'</h2><p>'+esc(s.CATEGORIA||'')+'</p></div>'+
    (blocked?'<div class="crm-alert"><b>CONTATTO BLOCCATO</b><span>Policy '+esc(crmPolicyLabel(data.safety?.contactPolicy))+'. Nessun follow-up esterno deve partire automaticamente.</span></div>':'')+
    (!blocked&&s.EMAIL?'<div class="crm-primary-actions"><button class="btn-yellow" id="crmEmailAction" type="button">✉ Prepara email istituzionale</button></div>':'')+
    '<div class="crm-facts">'+
      '<div><small>STATO</small><b>'+esc(s.STATO_RELAZIONE||'—')+'</b></div>'+
      '<div><small>OWNER</small><b>'+esc(s.OWNER||'—')+'</b></div>'+
      '<div><small>CANALE</small><b>'+esc(s.PREFERRED_CHANNEL||'—')+'</b></div>'+
      '<div><small>PROSSIMA SCADENZA</small><b>'+esc(s.PROSSIMA_SCADENZA||'—')+'</b></div>'+
    '</div>'+
    '<section class="crm-section"><h3>Prossima azione</h3><p>'+esc(s.PROSSIMA_AZIONE||'Nessuna azione registrata')+'</p></section>'+
    '<section class="crm-section"><h3>Contatti</h3><p>'+esc(s.EMAIL||'')+(s.EMAIL&&s.TELEFONO?' · ':'')+esc(s.TELEFONO||'')+'</p><p>'+esc(s.LOCALITA||'')+'</p></section>'+
    '<section class="crm-section"><h3>Tag</h3><p>'+esc(s.CRM_TAGS||'Nessun tag')+'</p></section>'+
    '<section class="crm-section"><h3>Timeline recente</h3>'+
      (tps.length?tps.slice(0,8).map(x=>'<div class="crm-timeline"><time>'+esc(x.TIMESTAMP||'')+'</time><div><b>'+esc(x.OGGETTO||x.CANALE||'Touchpoint')+'</b><p>'+esc(x.SINTESI||'')+'</p><small>'+esc(x.ESITO||'')+'</small></div></div>').join(''):'<p>Nessun touchpoint registrato.</p>')+
    '</section>'+
    '<section class="crm-section"><h3>Accordi / contratti</h3>'+
      (agreements.length?agreements.map(a=>'<div class="crm-agreement"><div><b>'+esc(a.PACCHETTO||a.PARTNER||'Accordo')+'</b><small>'+esc(a.STATO||'')+'</small></div><div><span>Valore</span><strong>'+esc(a['VALORE €']!==''&&a['VALORE €']!=null?'€ '+a['VALORE €']:'Da verificare')+'</strong></div><div><span>Incasso</span><strong>'+esc(a['STATO INCASSO']||'Da verificare')+'</strong></div><p>'+esc(a['ASSET PROMESSI']||'')+'</p><small>'+esc(a['PROSSIMA AZIONE']||'')+'</small></div>').join(''):'<p>Nessun accordo formalizzato collegato.</p>')+
    '</section>'+
    '<section class="crm-section"><h3>Attività e opportunità</h3><p>'+tasks.length+' task collegati · '+opps.length+' opportunità collegate · '+agreements.length+' accordi collegati</p></section>';
  const mailBtn=$('#crmEmailAction');
  if(mailBtn)mailBtn.onclick=()=>openCrmEmailComposer(data);
}
async function loadCrm(){
  crmState.loading=true;crmState.error='';renderCrmTable();
  try{
    const data=await crmApi();
    crmState.rows=Array.isArray(data.rows)?data.rows:[];
    renderCrmKpis(data.kpi||{});
  }catch(e){
    crmState.error=e.message||'Errore CRM';
    renderCrmKpis({});
  }finally{
    crmState.loading=false;renderCrmTable();
  }
}
async function openCrmProfile(id){
  const el=$('#crmInspector');if(el)el.innerHTML='<h3>Profilo CRM</h3><p>Caricamento profilo…</p>';
  try{
    const data=await crmApi(id);
    crmState.selected=id;renderCrmInspector(data);
  }catch(e){
    if(el)el.innerHTML='<h3>Profilo CRM</h3><p>'+esc(e.message||'Profilo non disponibile')+'</p>';
  }
}
if($('#crmRefresh'))$('#crmRefresh').onclick=loadCrm;
if($('#crmSearch'))$('#crmSearch').addEventListener('input',renderCrmTable);
if($('#crmPolicy'))$('#crmPolicy').addEventListener('change',renderCrmTable);
loadCrm();


/* ===== R40.2 COMUNICAZIONI ISTITUZIONALI ===== */
const crmMailState={templates:[],preview:null,current:null};
const crmEmailModal=$('#crmEmailModal');
const crmEmailForm=$('#crmEmailForm');

async function communicationApi(mode,payload={}){
  if(mode==='templates'){
    const r=await fetch('/api/sponsor/communication',{credentials:'same-origin',cache:'no-store'});
    const j=await r.json().catch(()=>({}));
    if(!r.ok||j.ok===false)throw new Error(j.error||'Template email non disponibili');
    return j.data||[];
  }
  const r=await fetch('/api/sponsor/communication',{
    method:'POST',credentials:'same-origin',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({...payload,mode})
  });
  const j=await r.json().catch(()=>({}));
  if(!r.ok||j.ok===false)throw new Error(j.error||'Operazione email non riuscita');
  return j.data||{};
}
async function ensureCrmMailTemplates(){
  if(crmMailState.templates.length)return crmMailState.templates;
  const rows=await communicationApi('templates');
  crmMailState.templates=Array.isArray(rows)?rows:[];
  const sel=$('#crmEmailTemplate');
  if(sel)sel.innerHTML='<option value="">Seleziona template…</option>'+crmMailState.templates.map(t=>
    '<option value="'+esc(t.id)+'">'+esc(t.category+' · '+t.name)+'</option>'
  ).join('');
  return crmMailState.templates;
}
function resetCrmMailApproval(){
  crmMailState.preview=null;
  const p=$('#crmMailPreview');if(p){p.hidden=true;p.innerHTML=''}
  const chk=$('#crmEmailConfirm');if(chk)chk.checked=false;
  const send=$('#crmEmailSendBtn');if(send)send.disabled=true;
}
async function openCrmEmailComposer(data){
  const s=data?.stakeholder||{};
  if(data?.safety?.externalContactBlocked)return;
  crmMailState.current=data;
  resetCrmMailApproval();
  crmEmailModal.hidden=false;
  try{
    await ensureCrmMailTemplates();
  }catch(e){
    const p=$('#crmMailPreview');p.hidden=false;p.innerHTML='<div class="crm-mail-error">'+esc(e.message)+'</div>';
  }
  crmEmailForm.elements.stakeholderId.value=s.STAKEHOLDER_ID||'';
  crmEmailForm.elements.to.value=s.EMAIL||'';
  crmEmailForm.elements.project.value=s.CATEGORIA||'';
  crmEmailForm.elements.subject.value='';
  crmEmailForm.elements.message.value='';
  crmEmailForm.elements.cc.value='';
  crmEmailForm.elements.nextAction.value=s.PROSSIMA_AZIONE||'';
  crmEmailForm.elements.nextDeadline.value=/^\d{4}-\d{2}-\d{2}$/.test(String(s.PROSSIMA_SCADENZA||''))?s.PROSSIMA_SCADENZA:'';
  requestAnimationFrame(()=>$('#crmEmailTemplate')?.focus());
}
function closeCrmEmailComposer(){
  crmEmailModal.hidden=true;
  resetCrmMailApproval();
  crmMailState.current=null;
}
if($('#closeCrmEmail'))$('#closeCrmEmail').onclick=closeCrmEmailComposer;
crmEmailModal?.addEventListener('click',e=>{if(e.target===crmEmailModal)closeCrmEmailComposer()});
crmEmailForm?.addEventListener('input',e=>{
  if(e.target.id==='crmEmailConfirm'){
    $('#crmEmailSendBtn').disabled=!(crmMailState.preview&&e.target.checked);
    return;
  }
  resetCrmMailApproval();
});
function crmMailPayload(){
  const fd=new FormData(crmEmailForm);
  return Object.fromEntries(fd.entries());
}
if($('#crmEmailPreviewBtn'))$('#crmEmailPreviewBtn').onclick=async()=>{
  const p=$('#crmMailPreview');
  try{
    if(!crmEmailForm.reportValidity())return;
    p.hidden=false;p.innerHTML='<div class="crm-mail-loading">Generazione anteprima istituzionale…</div>';
    const data=await communicationApi('preview',crmMailPayload());
    crmMailState.preview=data;
    p.innerHTML='<div class="crm-mail-meta"><b>Da:</b> '+esc(data.sender||'')+'<br><b>A:</b> '+esc(data.to||'')+'<br><b>Firma:</b> '+esc((data.signature?.name||'')+' · '+(data.signature?.role||''))+'<br><b>Oggetto:</b> '+esc(data.subject||'')+'</div><div class="crm-mail-render">'+String(data.html||'')+'</div>';
    const chk=$('#crmEmailConfirm');chk.checked=false;
    $('#crmEmailSendBtn').disabled=true;
  }catch(e){
    crmMailState.preview=null;
    p.hidden=false;p.innerHTML='<div class="crm-mail-error">'+esc(e.message||'Anteprima non disponibile')+'</div>';
  }
};
if($('#crmEmailConfirm'))$('#crmEmailConfirm').onchange=e=>{
  $('#crmEmailSendBtn').disabled=!(crmMailState.preview&&e.target.checked);
};
crmEmailForm?.addEventListener('submit',async e=>{
  e.preventDefault();
  if(!crmMailState.preview||!$('#crmEmailConfirm').checked)return;
  const send=$('#crmEmailSendBtn'),preview=$('#crmMailPreview');
  send.disabled=true;send.textContent='Invio in corso…';
  try{
    const payload={...crmMailPayload(),confirm:true};
    const data=await communicationApi('send',payload);
    preview.hidden=false;
    preview.innerHTML='<div class="crm-mail-success"><b>Email inviata e registrata nel CRM.</b><span>ID '+esc(data.mailId||'')+'</span></div>';
    if(crmState.selected)await openCrmProfile(crmState.selected);
    await loadCrm();
    $('#crmEmailConfirm').checked=false;
  }catch(err){
    preview.hidden=false;preview.innerHTML='<div class="crm-mail-error">'+esc(err.message||'Invio non riuscito')+'</div>';
    send.disabled=false;
  }finally{
    send.textContent='Invia email istituzionale';
  }
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&crmEmailModal&&!crmEmailModal.hidden)closeCrmEmailComposer()});
