const ICONS={
home:'<svg viewBox="0 0 24 24"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M9.5 20v-6h5v6"/></svg>',
users:'<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><path d="M3.5 19c.5-4 2.4-6 5.5-6s5 2 5.5 6"/><circle cx="17" cy="9" r="2.3"/><path d="M15.4 14c2.9-.2 4.7 1.5 5.1 4.4"/></svg>',
file:'<svg viewBox="0 0 24 24"><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v5h5"/><path d="M10 12h5M10 16h5"/></svg>',
bulb:'<svg viewBox="0 0 24 24"><path d="M9 18h6"/><path d="M10 21h4"/><path d="M8.2 14.5A6 6 0 1 1 15.8 14.5c-.7.7-1 1.3-1.1 2.5H9.3c-.1-1.2-.4-1.8-1.1-2.5Z"/></svg>',
chart:'<svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V5M16 20v-8M22 20V3"/></svg>',
target:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="m15 9 5-5M16 4h4v4"/></svg>',
folder:'<svg viewBox="0 0 24 24"><path d="M3 7h7l2 2h9v10H3z"/></svg>',
image:'<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m5 18 5-5 3 3 2-2 4 4"/></svg>',
calendar:'<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/></svg>',
pie:'<svg viewBox="0 0 24 24"><path d="M11 3a9 9 0 1 0 9 9h-9Z"/><path d="M14 3.5A8 8 0 0 1 20.5 10H14Z"/></svg>',
chat:'<svg viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4z"/><path d="M8 10h1M12 10h1M16 10h1"/></svg>',
settings:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9 7 7M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1"/></svg>',
search:'<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"/><path d="m16 16 5 5"/></svg>',
bell:'<svg viewBox="0 0 24 24"><path d="M6 16h12l-1.5-2.5V9a4.5 4.5 0 0 0-9 0v4.5z"/><path d="M10 19h4"/></svg>',
screen:'<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="12" rx="2"/><path d="M9 21h6M12 17v4"/></svg>',
crown:'<svg viewBox="0 0 24 24"><path d="m4 8 4 4 4-7 4 7 4-4-2 10H6z"/><path d="M6 21h12"/></svg>',
clock:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
compass:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2.2 4.8-4.8 2.2 2.2-4.8z"/></svg>'
};
document.querySelectorAll('[data-icon]').forEach(el=>{el.innerHTML=ICONS[el.dataset.icon]||''});

const DATA={
sponsors:[
{name:'Noratech Srl',sector:'Tecnologia / corporate',status:'DOCUMENTATO',value:'€400 + IVA',asset:'Social + Centro Sportivo',period:'17/07/2026 - 30/12/2026',class:'ATTIVO - DA DIFENDERE / SVILUPPARE',next:'Verificare posizione amministrativa; Sponsor Report 2026; proposta upgrade 2027',tags:['Social','Centro Sportivo'],history:'Rapporto documentato; ipotesi precedenti U16/LED/mascotte non equivalgono al contratto finale.',since:'2022',contacts:[{name:'Lucia Cappelletti',role:'Commerciale',email:'lucia.cappelletti@noratech.it',phone:'+39 393 6125408'},{name:'Elisabetta Azzetti',role:'Digital Marketing Manager · storico',email:'elisabetta.azzetti@noratech.it',phone:'0342 1590108'}]},
{name:'Coperture Rasero Srl',sector:'Edilizia / visibilità impianto',status:'DOCUMENTATO',value:'€500 + IVA',asset:'Striscione bordo campo + sito',period:'15/04/2026 - 15/04/2027',class:'ATTIVO - DA RINNOVARE',next:'Mappare posizione/dimensioni striscione e preparare rinnovo',tags:['Cartellonistica','Digital'],history:'Contratto documentato con asset fisico e digitale.',since:'2026',contacts:[{name:'Contatto aziendale',role:'Amministrazione / sponsor',email:'copertureraserosrl@gmail.com',phone:''}]},
{name:'Officine Pedroncelli Srl',sector:'Mobility / officina',status:'DOCUMENTATO',value:'€500 + IVA / anno',asset:'Logo sui vetri laterali del pulmino',period:'Rapporto pluriennale',class:'ATTIVO - DA SVILUPPARE',next:'Verificare scadenza, pagamento e foto attuale mezzo',tags:['Mobility','Pulmino'],history:'Rapporto avviato nel 2024; annualità 2026 verificata.',since:'2024',contacts:[{name:'Sonia',role:'Referente aziendale',email:'sonia@pedroncelli.it',phone:'0341 933213'}]},
{name:'DECAR Srl',sector:'Automotive',status:'ECONOMICAMENTE DOCUMENTATO',value:'€1.500 + IVA',asset:'Asset 2026 da ricostruire',period:'2026',class:'AUDIT PRIMA DEL RINNOVO',next:'Recuperare contratto/accordo 2026 e identificare asset',tags:['Automotive','Audit'],history:'Riferimenti storici a divise, ma non attribuibili automaticamente al 2026.',since:'2026',contacts:[{name:'Ufficio Amministrativo',role:'Contatto aziendale',email:'infodecar@gmail.com',phone:'0342 682198'}]},
{name:'SACO Multiservizi',sector:'Servizi / partnership territoriale',status:'ECONOMICAMENTE DOCUMENTATO',value:'Rapporto ibrido',asset:'Sponsor + fornitura/protezioni',period:'2026',class:'DA NORMALIZZARE',next:'Separare sponsorship, fornitura, barter e cost saving',tags:['Servizi','Barter'],history:'Non conteggiare automaticamente come puro cash sponsor.',since:'2026',contacts:[]},
{name:'Bianchi Bazzi Angelo Srl',sector:'Corporate / territorio',status:'ECONOMICAMENTE DOCUMENTATO',value:'€1.500 + IVA',asset:'Asset 2026 da ricostruire',period:'2026',class:'DA RICOSTRUIRE',next:'Recuperare accordo, durata e materiali esposti',tags:['Corporate','Audit'],history:'Rapporto storico rilevante; asset 2026 non certo.',since:'storico',contacts:[]},
{name:'Saglio Sport / LEGEA',sector:'Sportswear / partner tecnico',status:'PARTNER TECNICO DA COMPLETARE',value:'DA VERIFICARE',asset:'Fornitura tecnica, kit e abbigliamento',period:'2026/27 da verificare',class:'AUDIT OBBLIGATORIO',next:'Ricostruire accordo, durata, valore, categorie ed esclusività',tags:['Partner tecnico','Kit'],history:'Non trattare come sponsorship cash finché non ricostruiamo controprestazioni.',since:'2023',contacts:[{name:'Contatto aziendale',role:'Partner tecnico',email:'sagliosport@libero.it',phone:''}]}
],
responses:[
{date:'22/09',name:'Iperal',area:'Family & Community Partner',outcome:'In valutazione interna',next:'Follow-up leggero',priority:'ALTA'},
{date:'21/09',name:'Caffè Teti',area:'Coffee Partner / Club House',outcome:'Positivo',next:'Sopralluogo + proposta finale',priority:'URGENTE'},
{date:'21/09',name:'VIP Immagine',area:'Cartellonistica / sponsor board',outcome:'Positivo - chiede contatto',next:'Telefonare + mappa spazi/foto',priority:'URGENTE'},
{date:'22/09',name:"McDonald's territoriale",area:'Convenzione tesserati',outcome:'Proposta concreta 10%',next:'Formalizzare convenzione',priority:'ALTA'},
{date:'22/09',name:'La Roncaiola',area:'Lavanderia tecnica',outcome:'Interessata',next:'Definire volumi/frequenza',priority:'ALTA'},
{date:'22/09',name:'Bonazzi Grafica',area:'Grafica / stampa / packaging',outcome:'Interessata',next:'Fabbisogno annuo + barter',priority:'ALTA'},
{date:'26/09',name:'Lario Spurghi',area:'Servizi eventi',outcome:'Positivo',next:'Chiedere listino eventi',priority:'URGENTE'},
{date:'21/09',name:'Therabody',area:'Recovery Partner',outcome:'Instradato B2B',next:'Compilare form partnership',priority:'ALTA'},
{date:'23/09',name:'Galbusera',area:'Food & Event Partner',outcome:'Inoltrata internamente',next:'Follow-up marketing',priority:'MEDIA'},
{date:'25/09',name:'Lauretana',area:'Official Water Partner',outcome:'Rifiutata per budget',next:'Riaprire estate 2027',priority:'CHIUSA'},
{date:'23/09',name:"Acqua Sant'Anna",area:'Official Water Partner',outcome:'Rifiutata',next:'Riaprire fine 2027',priority:'CHIUSA'},
{date:'28/09',name:'Foresteria Villa Simona',area:'Hospitality',outcome:'Non adatta alla continuità',next:'Mantenere contatto occasionale',priority:'BASSA'}
],
assets:[
['Family & Community Partner','Community','GDO / banca / assicurazione','€5.000','Disponibile'],
['Official Water Partner','Fornitura / branding','Acque minerali / beverage','Da definire','In proposta'],
['Official Coffee Partner','Club House','Torrefazioni / beverage','Da definire','In proposta'],
['Official Hospitality Partner','Hospitality','Beverage / hospitality','Da definire','In proposta'],
['Fondo Solidale / Sport & Futuro','Sociale','Banche / fondazioni / imprese','€2.500','Attivo'],
['Servizio Navetta','Servizio famiglie','Automotive / energia / mobilità','Da definire','Attivo'],
['Torneo Title Sponsor','Evento','Banche / GDO / grandi imprese','€7.000','Disponibile'],
['Centro Sportivo - Area Club House','Struttura','Banca / horeca / arredamento','Da definire','Disponibile'],
['Area giochi / fitness outdoor','Struttura','Outdoor / wellness / healthcare','Da definire','In sviluppo'],
['LED bordo campo','Media','PMI / sponsor multipli','Da definire','Disponibile'],
['Divise settore giovanile','Kit tecnico','Aziende territoriali','€1.500','Parzialmente disponibile'],
['Sport Tourism Network','Turismo','Hotel / ristorazione / hospitality','Da definire','In sviluppo'],
['Performance & Recovery Center','Salute / Performance','Medicale / wellness / recovery','Da definire','Da studiare'],
['Media Center & Content Lab','Media / Digitale','Media / telecom / tecnologia','Da definire','Da studiare'],
['SCD Partner Club','B2B / Networking','Partner strategici','Da definire','Da studiare'],
['Youth Development Partner','Settore giovanile','Banche / industria / tech','Da definire','Da studiare'],
['Goalkeeper Academy Partner','Settore giovanile','Sport equipment / performance','Da definire','Da studiare'],
['Centro Sportivo Montecchi Main Partner','Struttura / Naming','Banca / industria / infrastrutture','Da definire','Da studiare']
],
led:[
['DEGO ARREDAMENTI','Arredamento / design','IN REVISIONE'],['ATV VALVE','Industria / valvole','IN REVISIONE'],['IPERAL','GDO / retail','IN REVISIONE'],['LEGEA','Sportswear / partner tecnico','IN REVISIONE'],['NBC ELETTRONICA','Elettronica / tecnologia','IN REVISIONE'],['SAGLIO SPORT','Sportswear / partner tecnico','IN REVISIONE'],['HDI MAGLIA','Assicurazioni','ATTESA APPROVAZIONE'],['DELLOCA','Energia / carburanti','ATTESA APPROVAZIONE'],['CARCANO','Industria / alluminio','ATTESA APPROVAZIONE'],['MDS IMPIANTI','Impiantistica','FONTI VERIFICATE'],['RIGAMONTI GEOM. GINO','Edilizia / infrastrutture','FONTI VERIFICATE'],['TARABINI PAOLO','Termoidraulica','FONTI VERIFICATE'],['TURBOJET SPURGHI','Servizi ambientali','FONTI VERIFICATE'],['GGLASS','Auto / cristalli','FONTI VERIFICATE'],['BIRRIFICIO LEGNONE','Food & Beverage','FONTI VERIFICATE'],['RIVARENO COLICO','Gelateria / retail','FONTI VERIFICATE'],['TRAFILERIE ALLUMINIO ALEXIA','Industria / alluminio','FONTI VERIFICATE'],['GAIO BAR RISTORANTE','Ristorazione / eventi','FONTI VERIFICATE'],['I VIAGGI DELLO SQUALO','Turismo / viaggi','FONTI VERIFICATE']
],
tasks:[
['URGENTE','Caffè Teti','Sopralluogo e proposta finale'],['URGENTE','VIP Immagine','Telefonare e inviare mappa spazi/foto'],['URGENTE','Lario Spurghi','Chiedere listino eventi 1g/2g'],['ALTA','Therabody','Compilare form EU Partnership'],['ALTA',"McDonald's",'Formalizzare convenzione 10%'],['ALTA','La Roncaiola','Definire volumi, frequenza, luogo ritiro'],['ALTA','Iperal','Follow-up leggero'],['ALTA','Bonazzi Grafica','Inviare fabbisogno annuo + barter'],['MEDIA','Galbusera','Follow-up marketing'],['MOLTO ALTA','DECAR','Audit accordo e asset 2026'],['MOLTO ALTA','SACO','Separare sponsor, fornitura e barter']
]
};

const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const initials=name=>name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase();
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

function sponsorIntel(s){
  let evidence=25;
  const reasons=[];
  if(s.status==='DOCUMENTATO'){evidence+=28;reasons.push('Rapporto documentato');}
  else if(/ECONOMICAMENTE/.test(s.status)){evidence+=16;reasons.push('Valore economico documentato, struttura rapporto incompleta');}
  else reasons.push('Accordo da completare o verificare');
  if((s.contacts||[]).length){evidence+=14;reasons.push('Referente/contatto disponibile');} else reasons.push('Referente non ancora collegato');
  if(s.period && !/verificare/i.test(s.period)){evidence+=10;} else reasons.push('Durata o scadenza da verificare');
  if(s.asset && !/ricostruire/i.test(s.asset)){evidence+=10;} else reasons.push('Asset corrente da ricostruire');
  if(s.value && !/DA VERIFICARE|ibrido/i.test(s.value)){evidence+=8;} else reasons.push('Valore o natura economica da normalizzare');
  if(s.history)evidence+=5;
  evidence=Math.min(100,evidence);

  const activation=/ricostruire/i.test(s.asset)?38:/Fornitura tecnica/i.test(s.asset)?62:82;
  const relationship=/pluriennale|2022|2023|2024|storico/i.test((s.period||'')+' '+(s.since||'')+' '+(s.history||''))?86:68;
  const renewal=/RINNOVARE/.test(s.class)?45:/AUDIT|RICOSTRUIRE|NORMALIZZARE/.test(s.class)?35:72;
  const state=evidence>=75?'verified':evidence<60?'partial':'opportunity';

  return {evidence,activation,relationship,renewal,state,reasons};
}
function portfolioIntel(){
  const rows=DATA.sponsors.map(s=>({s,intel:sponsorIntel(s)}));
  return {
    rows,
    avgEvidence:Math.round(rows.reduce((a,x)=>a+x.intel.evidence,0)/rows.length),
    complete:rows.filter(x=>x.intel.evidence>=75).length,
    partial:rows.filter(x=>x.intel.evidence<75).length,
    decisions:rows.filter(x=>/AUDIT|RICOSTRUIRE|NORMALIZZARE|RINNOVARE/.test(x.s.class)||x.intel.evidence<65)
  };
}
function assetFit(s,a){
  const text=(s.sector+' '+s.tags.join(' ')).toLowerCase();
  const asset=(a[0]+' '+a[1]+' '+a[2]).toLowerCase();
  let score=1; const why=[];
  const add=(n,r)=>{score+=n;why.push(r)};
  if(/tecnologia|technology/.test(text)&&/media|digital|led|youth|tech/.test(asset))add(3,'Coerenza tecnologia ↔ media/digital/giovani');
  if(/automotive|mobility|officina/.test(text)&&/navetta|mobilità|evento|led/.test(asset))add(3,'Coerenza mobilità ↔ servizio/evento/visibilità');
  if(/sportswear|tecnico|kit/.test(text)&&/divise|giovanile|goalkeeper|evento/.test(asset))add(4,'Coerenza partner tecnico ↔ kit/settore giovanile');
  if(/corporate|territorio|servizi/.test(text)&&/community|torneo|club house|led|partner club/.test(asset))add(2,'Coerenza territoriale ↔ community/evento/B2B');
  if(/edilizia|coperture/.test(text)&&/struttura|centro sportivo|club house/.test(asset))add(3,'Coerenza edilizia ↔ struttura/impianto');
  if(/Disponibile/.test(a[4]))add(1,'Asset dichiarato disponibile');
  if(/Attivo|In proposta/.test(a[4])){score-=1;why.push('Asset già attivo/in proposta: verificare disponibilità ed esclusiva');}
  if(/AUDIT|RICOSTRUIRE|NORMALIZZARE/.test(s.class)){score-=1;why.push('Prima completare audit del rapporto corrente');}
  score=Math.max(0,Math.min(6,score));
  return {score,level:score>=4?'high':score>=2?'mid':'low',why};
}


function openView(name){
  $$('.view').forEach(v=>v.classList.remove('active'));
  $('#view-'+name)?.classList.add('active');
  $$('.nav-item[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===name));
  if(innerWidth<821) $('#sidebar').classList.remove('open');
  window.scrollTo({top:0,behavior:'smooth'});
}
$$('[data-view]').forEach(el=>el.addEventListener('click',e=>{if(el.tagName==='BUTTON' || el.classList.contains('macro-visual') || el.classList.contains('hero-cta')) openView(el.dataset.view)}));
$('#mobileMenu').onclick=()=>$('#sidebar').classList.toggle('open');
$('#modeSwitch button').forEach(b=>b.onclick=()=>{$('#modeSwitch button').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.body.dataset.mode=b.dataset.mode;});


function priorityClass(p){return /URGENTE|MOLTO/.test(p)?'urgent':''}
$('#todayList').innerHTML=DATA.tasks.slice(0,5).map((t,i)=>'<div class="priority-row"><span class="priority-check '+(i===0?'done':'')+'"></span><b>'+esc(t[1])+' · '+esc(t[2])+'</b><time>'+(9+i*2)+':00</time><span class="priority-badge '+priorityClass(t[0])+'">'+esc(t[0])+'</span></div>').join('');
$('#recentTimeline').innerHTML=DATA.responses.slice(0,5).map((r,i)=>'<div class="activity-row"><span class="activity-dot">'+(i+1)+'</span><div><b>'+esc(r.name)+'</b><span>'+esc(r.outcome)+'</span></div><time>'+esc(r.date)+'</time></div>').join('');

const PINT=portfolioIntel();
(function renderIntelligenceHome(){
  const pos=[[11,18],[77,12],[84,58],[62,76],[24,73],[5,52],[48,7]];
  const map=$('#relationshipMap');
  if(map){
    let html='<div class="map-center">SCD</div>';
    PINT.rows.forEach((x,i)=>{
      const p=pos[i%pos.length],abbr=initials(x.s.name);
      html+='<span class="map-node '+x.intel.state+'" style="left:'+p[0]+'%;top:'+p[1]+'%" title="'+esc(x.s.name)+' · dati '+x.intel.evidence+'%">'+esc(abbr)+'</span>';
    });
    map.innerHTML=html;
  }

  const decisions=[
    ...PINT.decisions.slice(0,4).map(x=>({title:x.s.name,text:x.s.next,kind:/RINNOVARE/.test(x.s.class)?'Rinnovo':'Audit',action:x.s.name}))
  ];
  const dc=$('#decisionCenter');
  if(dc){
    dc.innerHTML=decisions.map(d=>'<div class="decision-item"><span class="decision-icon">!</span><div><b>'+esc(d.title)+'</b><p>'+esc(d.text)+'</p></div><button data-sponsor-decision="'+esc(d.action)+'">'+esc(d.kind)+'</button></div>').join('');
    $('#decisionCount').textContent=String(decisions.length);
    dc.querySelectorAll('[data-sponsor-decision]').forEach(b=>b.onclick=()=>openSponsorDetail(b.dataset.sponsorDecision));
  }

  const gr=$('#growthRadar');
  if(gr){
    gr.innerHTML='<div class="growth-ring"><i class="growth-axis"></i><i class="growth-axis"></i><i class="growth-axis"></i><span class="growth-dot hot" style="left:66%;top:17%"></span><span class="growth-dot" style="left:25%;top:54%"></span><span class="growth-dot" style="left:57%;top:70%"></span><span class="growth-label" style="left:71%;top:6%">Community</span><span class="growth-label" style="left:3%;top:54%">Eventi</span><span class="growth-label" style="left:59%;top:82%">Media</span></div><div class="growth-summary"><div><small>ASSET DISPONIBILI</small><b>'+DATA.assets.filter(a=>a[4]==='Disponibile').length+'</b></div><div><small>DATI DA COMPLETARE</small><b>'+PINT.partial+'</b></div></div>';
  }
})();

(function renderScenarioLab(){
  const sponsorSubset=DATA.sponsors.slice(0,6);
  const assetSubset=DATA.assets.filter(a=>['Disponibile','In sviluppo','Da studiare'].includes(a[4])).slice(0,6);
  const matrix=$('#fitMatrix');
  if(matrix){
    let html='<div class="fit-table"><div class="fit-cell head">SPONSOR / ASSET</div>'+assetSubset.map(a=>'<div class="fit-cell head">'+esc(a[0])+'</div>').join('');
    sponsorSubset.forEach((s,si)=>{
      html+='<div class="fit-cell row-head">'+esc(s.name)+'</div>';
      assetSubset.forEach((a,ai)=>{
        const f=assetFit(s,a),label=f.level==='high'?'FORTE':f.level==='mid'?'DA VALUTARE':'DEBOLE';
        html+='<div class="fit-cell fit-'+f.level+'">'+label+'<button data-fit="'+si+':'+ai+'" aria-label="Analizza '+esc(s.name)+' e '+esc(a[0])+'"></button></div>';
      });
    });
    html+='</div>';matrix.innerHTML=html;
    matrix.querySelectorAll('[data-fit]').forEach(b=>b.onclick=()=>{
      const [si,ai]=b.dataset.fit.split(':').map(Number),s=sponsorSubset[si],a=assetSubset[ai],f=assetFit(s,a);
      $('#scenarioTitle').textContent=s.name+' × '+a[0];
      const cautions=[];
      if(/AUDIT|RICOSTRUIRE|NORMALIZZARE/.test(s.class))cautions.push('Completare prima l’audit del rapporto corrente.');
      if(a[4]!=='Disponibile')cautions.push('Lo stato asset è "'+a[4]+'": verificare disponibilità reale ed eventuali esclusive.');
      $('#scenarioInspector').innerHTML='<div class="reason-list">'+
        f.why.map(x=>'<div class="reason positive"><b>Elemento favorevole</b><span>'+esc(x)+'</span></div>').join('')+
        cautions.map(x=>'<div class="reason caution"><b>Controllo necessario</b><span>'+esc(x)+'</span></div>').join('')+
        '<div class="reason"><b>Regola</b><span>Il sistema non stima probabilità di chiusura. Evidenzia soltanto coerenze e dati mancanti.</span></div></div>';
    });
  }

  const cb=$('#confidenceBoard');
  if(cb)cb.innerHTML='<div class="confidence-list">'+[
    ['Identità sponsor',100],['Valori economici',Math.round(PINT.rows.reduce((a,x)=>a+(!/DA VERIFICARE|ibrido/.test(x.s.value)?100:35),0)/PINT.rows.length)],
    ['Asset correnti',Math.round(PINT.rows.reduce((a,x)=>a+(!/ricostruire/i.test(x.s.asset)?100:35),0)/PINT.rows.length)],
    ['Contatti',Math.round(PINT.rows.reduce((a,x)=>a+((x.s.contacts||[]).length?100:25),0)/PINT.rows.length)],
    ['Completezza media',PINT.avgEvidence]
  ].map(x=>'<div class="confidence-row"><b>'+x[0]+'</b><span class="confidence-bar"><i style="width:'+x[1]+'%"></i></span><span>'+x[1]+'%</span></div>').join('')+'</div>';

  const nba=$('#nextBestActions');
  if(nba)nba.innerHTML='<div class="action-intel-list">'+PINT.decisions.slice(0,6).map((x,i)=>'<div class="action-intel"><div><b>'+(i+1)+'. '+esc(x.s.name)+'</b><p>'+esc(x.s.next)+'</p></div><em>'+x.intel.evidence+'% dati</em></div>').join('')+'</div>';
})();

const marketingIdeas=[
  ['✦','Partnership Story','Trasforma sponsor + territorio + persone in un racconto editoriale coerente.'],
  ['▭','LED Concept','Costruisci uno spot sponsor-only partendo da identità, messaggio autorizzato e obiettivo.'],
  ['◎','Community Activation','Collega convenzione o sponsor a famiglie, tesserati, torneo e territorio.'],
  ['◈','Event Experience','Integra naming, hospitality, LED, social, premiazioni e presenza fisica.'],
  ['↗','Renewal Dossier','Prepara report dell’anno, prove di attivazione e proposta di continuità.'],
  ['◫','Content System','Pianifica contenuti social, foto, video e report senza ripetere sempre lo stesso messaggio.']
];
if($('#marketingIdeas'))$('#marketingIdeas').innerHTML=marketingIdeas.map(x=>'<article class="marketing-idea"><span>'+x[0]+'</span><h4>'+x[1]+'</h4><p>'+x[2]+'</p><button data-lia="'+esc(x[1])+' per SCD">Apri con Lia →</button></article>').join('');


function sponsorCard(s){
  return '<article class="sponsor-card" data-name="'+esc(s.name.toLowerCase())+'" data-status="'+esc(s.status)+'" onclick="openSponsorDetail(\''+s.name.replace(/'/g,"\\'")+'\')">'+
  '<div class="sponsor-head"><div class="sponsor-logo">'+esc(initials(s.name))+'</div><div><h3>'+esc(s.name)+'</h3><p>'+esc(s.sector)+'</p></div><span class="status-pill">'+esc(s.class)+'</span></div>'+
  '<div class="sponsor-tags">'+s.tags.map(t=>'<span>'+esc(t)+'</span>').join('')+'</div>'+
  '<div class="sponsor-metrics"><div><small>VALORE</small><b>'+esc(s.value)+'</b></div><div><small>PERIODO</small><b>'+esc(s.period)+'</b></div><div><small>ASSET</small><b>'+esc(s.asset)+'</b></div><div><small>PROSSIMA AZIONE</small><b>'+esc(s.next)+'</b></div></div></article>';
}
$('#sponsorGrid').innerHTML=DATA.sponsors.map(sponsorCard).join('');
$('#storiciGrid').innerHTML=DATA.sponsors.filter(s=>['Noratech Srl','Officine Pedroncelli Srl','Saglio Sport / LEGEA','Bianchi Bazzi Angelo Srl'].includes(s.name)).map(sponsorCard).join('');

$('#contractsBoard').innerHTML=DATA.sponsors.map(s=>'<article class="contract-row" onclick="openSponsorDetail(\''+s.name.replace(/'/g,"\\'")+'\')"><div><b>'+esc(s.name)+'</b><small>'+esc(s.asset)+'</small></div><span>'+esc(s.period)+'</span><span>'+esc(s.value)+'</span><span>'+esc(s.status)+'</span><span>'+esc(s.next)+'</span></article>').join('');

$('#convenzioniGrid').innerHTML=DATA.responses.map(r=>'<article class="pipeline-card"><div style="display:flex;justify-content:space-between;gap:8px"><h3>'+esc(r.name)+'</h3><span class="priority-pill">'+esc(r.priority)+'</span></div><p>'+esc(r.area)+'</p><div class="row"><span>Esito</span><b>'+esc(r.outcome)+'</b></div><div class="row"><span>Prossima azione</span><b>'+esc(r.next)+'</b></div></article>').join('');

$('#researchPipeline').innerHTML=DATA.responses.filter(r=>!r.priority.includes('CHIUSA')).slice(0,10).map(r=>'<div class="research-row"><div><b>'+esc(r.name)+'</b><small>'+esc(r.area)+'</small></div><span>'+esc(r.outcome)+'</span><span>'+esc(r.priority)+'</span><span>'+esc(r.next)+'</span></div>').join('');
$('#radarList').innerHTML=['Banche & Finanza','Industria Alto Lago / Valtellina','Healthcare & Recovery','Technology & Telecom','Hospitality & Turismo','Food & Beverage','Mobility & Automotive'].map((x,i)=>'<div class="radar"><b>'+x+'</b><span>'+(i<3?'PRIORITÀ':'SVILUPPO')+'</span></div>').join('');

$('#assetGrid').innerHTML=DATA.assets.map(a=>'<article class="asset-card"><h3>'+esc(a[0])+'</h3><p>'+esc(a[1])+' · Target: '+esc(a[2])+'</p><footer><b>'+esc(a[3])+'</b><span class="asset-state">'+esc(a[4])+'</span></footer></article>').join('');

const folders=['Contratti','Proposte','Loghi & Brand','Foto','Video & LED','Email & Verbali','Fatture','Report Sponsor','Rassegna stampa','Eventi','Convenzioni','Altro'];
$('#documentsHub').innerHTML=folders.map(f=>'<article class="folder-card"><div class="folder-top"><span class="folder-icon"></span><span>•••</span></div><h3>'+f+'</h3><p>Apri raccolta · collega file sponsor</p></article>').join('');

$('#ledBoard').innerHTML=DATA.led.map(x=>'<article class="led-row"><div class="led-logo">'+esc(initials(x[0]))+'</div><div><h3>'+esc(x[0])+'</h3><p>'+esc(x[1])+'</p></div><span class="led-state">'+esc(x[2])+'</span></article>').join('');

$('#eventsBoard').innerHTML=[
['Torneo Title Sponsor','Naming, hospitality, LED, social e attivazioni sponsor.'],
['Club House & Community Day','Area relazione, famiglie, partner e territorio.'],
['Sport Tourism Network','Tornei, ricettività, ristorazione e pacchetti partner.']
].map(e=>'<article class="event-card"><h3>'+e[0]+'</h3><p>'+e[1]+'</p></article>').join('');

$('#reportBoard').innerHTML=
'<article class="report-card"><h3>Situazione economica prudenziale</h3><div class="report-list"><div class="report-item"><span>Cash verificato normalizzato</span><b>€4.400</b></div><div class="report-item"><span>Rapporti documentati</span><b>7</b></div><div class="report-item"><span>Rapporti ibridi da normalizzare</span><b>2</b></div></div></article>'+
'<article class="report-card"><h3>Criticità da chiudere</h3><div class="report-list"><div class="report-item"><span>DECAR: asset 2026</span><b>Audit</b></div><div class="report-item"><span>SACO: sponsor / fornitura / barter</span><b>Audit</b></div><div class="report-item"><span>Saglio / LEGEA: accordo tecnico</span><b>Audit</b></div></div></article>'+
'<article class="report-card"><h3>Pipeline prioritaria</h3><div class="report-list">'+DATA.tasks.slice(0,6).map(t=>'<div class="report-item"><span>'+esc(t[1])+'</span><b>'+esc(t[0])+'</b></div>').join('')+'</div></article>'+
'<article class="report-card"><h3>LED</h3><div class="report-list"><div class="report-item"><span>Attesa approvazione</span><b>3</b></div><div class="report-item"><span>In revisione</span><b>6</b></div><div class="report-item"><span>Fonti verificate / da produrre</span><b>10</b></div></div></article>';

function proposalIdeas(s){
  const out=[];
  if(/RINNOVARE|DIFENDERE|SVILUPPARE/.test(s.class)) out.push({title:'Rinnovo anticipato',text:'Preparare proposta di continuità prima della scadenza.',tag:'Rinnovo'});
  if(!/LED/.test(s.asset)) out.push({title:'Opportunità LED',text:'Valutare visibilità LED se compatibile con categoria ed esclusiva.',tag:'LED'});
  if(!/Social/i.test(s.asset)) out.push({title:'Storytelling sponsor',text:'Contenuto dedicato per valorizzare territorio, persone e partnership.',tag:'Media'});
  if(/PARTNER TECNICO/.test(s.status)) out.push({title:'Valorizzazione tecnica',text:'Ricostruire controprestazioni e visibilità prima di qualsiasi upgrade.',tag:'Tecnico'});
  return out.slice(0,3);
}
function sponsorDeadlines(s){
  const out=[];
  if(s.name==='Coperture Rasero Srl') out.push(['Feb 2027','Preparare rinnovo sponsor','Da fare'],['15 Apr 2027','Scadenza rapporto','Scadenza']);
  else if(s.name==='Noratech Srl') out.push(['Dic 2026','Sponsor Report 2026','Da fare'],['2027','Proposta upgrade','Pianificare']);
  else out.push(['Ora','Completare audit documenti','Da fare'],['Prossimo step',s.next,'Operativo']);
  return out;
}
function currentContractType(s){if(/PARTNER TECNICO/.test(s.status))return 'Accordo tecnico';if(/Barter/i.test(s.tags.join(' ')))return 'Rapporto ibrido';return 'Sponsorizzazione'}
function contractProgress(s){if(/2027/.test(s.period))return 55;if(/pluriennale/i.test(s.period))return 70;return 75}

window.openSponsorDetail=function(name){
  const s=DATA.sponsors.find(x=>x.name===name); if(!s)return;
  const intel=sponsorIntel(s);
  const proposals=proposalIdeas(s), deadlines=sponsorDeadlines(s), contacts=s.contacts||[];
  $('#sponsorDetailPage').innerHTML=
  '<button class="detail-back" id="detailBack">← Torna agli sponsor</button>'+
  '<section class="sponsor-hero"><div class="sponsor-hero-content"><div class="detail-logo">'+esc(initials(s.name))+'</div><div class="detail-title"><small>'+esc(s.sector.toUpperCase())+'</small><h1>'+esc(s.name)+'</h1><p>'+esc(s.asset)+'</p><span class="hero-status">'+esc(s.class)+'</span></div></div><div class="sponsor-hero-quote">Più di uno sponsor.<br>Un compagno di strada.</div><div class="sponsor-holo"><small>RELATIONSHIP INTELLIGENCE</small><b>'+intel.evidence+'% dati solidi</b><span>'+esc(s.next)+'</span></div></section>'+
  '<nav class="detail-tabs">'+['Panoramica','Contratti','Documenti','Visibilità','Attività','Contatti','Note'].map((t,i)=>'<button class="'+(i===0?'active':'')+'">'+t+'</button>').join('')+'</nav>'+
  '<section class="detail-kpis">'+
    '<article class="detail-kpi"><small>INIZIO RAPPORTO</small><b>'+esc(s.since)+'</b></article>'+
    '<article class="detail-kpi"><small>CONTRATTI ATTIVI</small><b>1</b></article>'+
    '<article class="detail-kpi"><small>VALORE VERIFICATO</small><b>'+esc(s.value)+'</b></article>'+
    '<article class="detail-kpi"><small>TIPOLOGIA</small><b>'+esc(currentContractType(s))+'</b></article>'+
    '<article class="detail-kpi"><small>STRATEGICITÀ</small><b>'+(/DA RICOSTRUIRE|AUDIT/.test(s.class)?'Da valutare':'Alta')+'</b></article>'+
    '<article class="detail-kpi"><small>RELAZIONE</small><b>'+(/storico|pluriennale/i.test(s.history+' '+s.period)?'Storica':'Attiva')+'</b></article>'+
  '</section>'+
  '<section class="intel-strip">'+
    '<article class="intel-metric"><small>SOLIDITÀ DATI</small><b>'+intel.evidence+'%</b><div class="intel-meter"><i style="width:'+intel.evidence+'%"></i></div></article>'+
    '<article class="intel-metric"><small>ATTIVAZIONE DOCUMENTATA</small><b>'+intel.activation+'%</b><div class="intel-meter"><i style="width:'+intel.activation+'%"></i></div></article>'+
    '<article class="intel-metric"><small>STORICITÀ RELAZIONE</small><b>'+intel.relationship+'%</b><div class="intel-meter"><i style="width:'+intel.relationship+'%"></i></div></article>'+
    '<article class="intel-metric"><small>PRONTEZZA RINNOVO</small><b>'+intel.renewal+'%</b><div class="intel-meter"><i style="width:'+intel.renewal+'%"></i></div></article>'+
  '</section>'+
  '<section class="detail-grid">'+
    '<div class="detail-column">'+
      '<article class="detail-panel"><header><h3>Contratti attuali</h3><button>Vedi tutti →</button></header><div class="contract-card"><div class="contract-card-top"><div><h4>'+esc(currentContractType(s))+' · 2026/27</h4><small>'+esc(s.period)+'</small></div><strong>'+esc(s.value)+'</strong></div><div class="progress-line"><i style="width:'+contractProgress(s)+'%"></i></div></div></article>'+
      '<article class="detail-panel"><header><h3>Cartelle sponsor</h3><button>Apri archivio →</button></header><div class="folder-mini-grid">'+['Contratti','Materiali brand','Foto & Video','Comunicazione','Fatture','Report'].map(f=>'<div class="folder-mini"><span class="folder-icon"></span><b>'+f+'</b><span>Collega / apri</span></div>').join('')+'</div></article>'+
      '<article class="detail-panel"><header><h3>Contatti & Referenti</h3><button>+ Aggiungi</button></header><div class="contact-list">'+(contacts.length?contacts.map(c=>'<div class="contact-card"><span class="contact-avatar">'+esc(initials(c.name))+'</span><div><b>'+esc(c.name)+'</b><span>'+esc(c.role)+'</span><span>'+esc(c.email||'')+(c.phone?' · '+esc(c.phone):'')+'</span></div></div>').join(''):'<div class="contact-card"><span class="contact-avatar">?</span><div><b>Referente da verificare</b><span>Collegare contatto ufficiale</span></div></div>')+'</div></article>'+
    '</div>'+
    '<div class="detail-column">'+
      '<article class="detail-panel"><header><h3>Proposte ipotetiche</h3><button>Vedi tutte →</button></header>'+proposals.map(p=>'<div class="proposal-card"><div class="proposal-visual"></div><div><h4>'+esc(p.title)+'</h4><p>'+esc(p.text)+'</p><span class="asset-state">'+esc(p.tag)+'</span></div><button>›</button></div>').join('')+'</article>'+
      '<article class="detail-panel"><header><h3>Scadenze / rinnovi</h3><button>Vedi tutte →</button></header><div class="deadline-list">'+deadlines.map(d=>'<div class="deadline-item"><time>'+esc(d[0])+'</time><b>'+esc(d[1])+'</b><span>'+esc(d[2])+'</span></div>').join('')+'</div></article>'+
      '<article class="detail-panel"><header><h3>Storico collaborazione</h3><button>Vedi tutto →</button></header><div class="history-list"><div class="history-item"><time>'+esc(s.since)+'</time><b>Avvio / storico relazione</b><span>'+esc(s.history)+'</span></div><div class="history-item"><time>2026</time><b>Situazione corrente</b><span>'+esc(s.class)+'</span></div></div></article>'+
    '</div>'+
    '<div class="detail-column">'+
      '<article class="detail-lia-card"><div class="detail-lia-top"><div class="detail-lia-avatar">L</div><div><b>Lia Sponsor</b><span class="ai-pill">AI locale</span></div></div><p>Analisi specifica del rapporto con '+esc(s.name)+'.</p><div class="suggestion-list">'+proposals.map(p=>'<div class="suggestion"><b>'+esc(p.title)+'</b>'+esc(p.text)+'</div>').join('')+'</div><div class="detail-reasoning"><h4>Perché il sistema ragiona così</h4><ul>'+intel.reasons.map(r=>'<li>'+esc(r)+'</li>').join('')+'</ul></div></article>'+
      '<article class="detail-panel"><header><h3>Note direzione</h3><button>+ Nota</button></header><div class="direction-note">'+esc(s.history)+'<br><br><b>Prossima azione:</b> '+esc(s.next)+'</div></article>'+
    '</div>'+
  '</section>';
  $('#detailBack').onclick=()=>openView('attuali');
  openView('sponsor-detail');
};

$$('.local-search').forEach(inp=>inp.addEventListener('input',()=>{const q=inp.value.toLowerCase();$('#'+inp.dataset.target).querySelectorAll('[data-name]').forEach(c=>c.hidden=!c.dataset.name.includes(q))}));
$('#statusFilter').addEventListener('change',e=>$('#sponsorGrid').querySelectorAll('.sponsor-card').forEach(c=>c.hidden=e.target.value&&!c.dataset.status.includes(e.target.value)));

const allSearchItems=()=>[
...DATA.sponsors.map(s=>({title:s.name,meta:'Sponsor · '+s.sector,view:'attuali',action:()=>openSponsorDetail(s.name)})),
...DATA.responses.map(r=>({title:r.name,meta:'Pipeline · '+r.area,view:'convenzioni'})),
...DATA.assets.map(a=>({title:a[0],meta:'Asset · '+a[1],view:'asset'})),
...DATA.led.map(x=>({title:x[0],meta:'LED · '+x[2],view:'media'}))
];
const globalSearch=$('#globalSearch'),searchResults=$('#searchResults');
globalSearch.addEventListener('input',()=>{
  const q=globalSearch.value.toLowerCase().trim();
  if(!q){searchResults.hidden=true;return}
  const found=allSearchItems().filter(x=>(x.title+' '+x.meta).toLowerCase().includes(q)).slice(0,12);
  searchResults.innerHTML=found.length?found.map((x,i)=>'<div class="search-result" data-i="'+i+'"><b>'+esc(x.title)+'</b><small>'+esc(x.meta)+'</small></div>').join(''):'<div class="search-result"><b>Nessun risultato</b><small>Prova con sponsor, LED, asset o azienda.</small></div>';
  searchResults.hidden=false;
  $$('.search-result[data-i]').forEach(el=>el.onclick=()=>{const x=found[+el.dataset.i];searchResults.hidden=true;globalSearch.value='';if(x.action)x.action();else openView(x.view)});
});
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();globalSearch.focus()}});

function botAnswer(q){
  const t=q.toLowerCase(),p=portfolioIntel();
  if(t.includes('portafoglio')||t.includes('analizza'))return 'Portafoglio: '+p.rows.length+' rapporti censiti. Completezza media dati '+p.avgEvidence+'%. '+p.complete+' rapporti hanno una base informativa solida; '+p.partial+' richiedono completamenti. Le priorità strutturali sono '+p.decisions.slice(0,4).map(x=>x.s.name).join(', ')+'. Non sto stimando probabilità commerciali: sto leggendo qualità dei dati e prossime azioni.';
  if(t.includes('incomplet')||t.includes('manca'))return 'Dati da completare soprattutto su: '+p.rows.filter(x=>x.intel.evidence<75).map(x=>x.s.name+' ('+x.intel.evidence+'%)').join(', ')+'. Conviene chiudere prima asset, durata, contatti e natura economica.';
  if(t.includes('cresc')||t.includes('opportun'))return 'Crescita: gli asset oggi segnati disponibili sono '+DATA.assets.filter(a=>a[4]==='Disponibile').map(a=>a[0]).join(', ')+'. Prima di abbinarli a un’azienda, Scenario Lab controlla coerenza settore/asset, stato del rapporto e necessità di verificare esclusive.';
  if(t.includes('oggi')||t.includes('fare'))return 'Priorità immediate: Caffè Teti, VIP Immagine e Lario Spurghi. Subito dopo: McDonald’s, Therabody, Iperal e audit DECAR/SACO. Sul portafoglio attuale, DECAR, SACO e Bianchi Bazzi richiedono ricostruzione prima di qualsiasi proposta evolutiva.';
  if(t.includes('led'))return 'LED: HDI Maglia, Dell’Oca e Carcano sono in attesa approvazione. DEGO, ATV, Iperal, LEGEA, NBC e Saglio sono in revisione. Gli altri richiedono completamento fonti/materiali. Nessun nuovo spot dovrebbe partire senza logo/materiale ufficiale e messaggio autorizzato.';
  if(t.includes('asset')&&t.includes('liber'))return 'Asset indicati come disponibili: Family & Community Partner, Torneo Title Sponsor, Centro Sportivo - Area Club House e LED bordo campo. Prima di proporre va verificata ogni esclusiva di categoria e l’eventuale occupazione reale.';
  if(t.includes('rinn'))return 'Rinnovi: Coperture Rasero va preparato con anticipo; Noratech richiede Sponsor Report 2026 e proposta upgrade; Pedroncelli richiede verifica scadenza e situazione amministrativa. Il rinnovo parte dalle prove di attivazione, non dal nuovo prezzo.';
  const sponsor=DATA.sponsors.find(s=>t.includes(s.name.toLowerCase().split(' ')[0]));
  if(sponsor){const i=sponsorIntel(sponsor);return sponsor.name+': '+sponsor.class+'. Solidità dati '+i.evidence+'%. Fatto certo: '+sponsor.asset+'; valore: '+sponsor.value+'. Prossima azione: '+sponsor.next+'. Punti da verificare: '+i.reasons.filter(x=>/verific|ricostru|normalizzare|non ancora/.test(x.toLowerCase())).join('; ')+'.';}
  return 'Posso ragionare su portafoglio, completezza dati, sponsor, contratti, LED, rinnovi, asset, pipeline, Scenario Lab e prossime azioni. Le conclusioni sono sempre separate tra fatti verificati, ipotesi e controlli necessari.';
}
function addMsg(text,cls){const d=document.createElement('div');d.className=cls;d.textContent=text;$('#assistantBody').appendChild(d);$('#assistantBody').scrollTop=$('#assistantBody').scrollHeight}
const assistant=$('#assistant');
function openAssistant(prefill){assistant.hidden=false;if(prefill){addMsg(prefill,'user-msg');setTimeout(()=>addMsg(botAnswer(prefill),'bot-msg'),120)}}
$('#assistantFab').onclick=()=>openAssistant();
$('#openLiaNav').onclick=()=>openAssistant();
$('#assistantClose').onclick=()=>assistant.hidden=true;
$('#assistantForm').onsubmit=e=>{e.preventDefault();const q=$('#assistantInput').value.trim();if(!q)return;addMsg(q,'user-msg');$('#assistantInput').value='';setTimeout(()=>addMsg(botAnswer(q),'bot-msg'),120)};
$$('.quick-prompts button').forEach(b=>b.onclick=()=>openAssistant(b.textContent));
$$('[data-lia]').forEach(b=>b.onclick=()=>openAssistant(b.dataset.lia));
$('#liaHomeSend').onclick=()=>{const q=$('#liaHomeInput').value.trim();if(q){$('#liaHomeInput').value='';openAssistant(q)}};
$('#liaHomeInput').addEventListener('keydown',e=>{if(e.key==='Enter')$('#liaHomeSend').click()});

const newModal=$('#newSponsorModal');
[$('#newSponsorBtn'),$('#newSponsorBtn2')].forEach(b=>{if(b)b.onclick=()=>newModal.hidden=false});
$$('[data-close-modal]').forEach(b=>b.onclick=()=>newModal.hidden=true);
$('#newSponsorForm').onsubmit=e=>{
  e.preventDefault();
  const f=new FormData(e.target),draft={name:f.get('name'),sector:f.get('sector'),contact:f.get('contact'),email:f.get('email'),season:f.get('season'),type:f.get('type'),notes:f.get('notes'),created:new Date().toISOString()};
  const arr=JSON.parse(localStorage.getItem('scd_sponsor_drafts')||'[]');arr.push(draft);localStorage.setItem('scd_sponsor_drafts',JSON.stringify(arr));
  newModal.hidden=true;e.target.reset();openAssistant('Ho salvato una nuova bozza sponsor locale. Cosa devo completare prima di considerarla valida?');
};
document.addEventListener('click',e=>{const liaBtn=e.target.closest('[data-lia]');if(liaBtn&&typeof openAssistant==='function'){e.preventDefault();openAssistant(liaBtn.dataset.lia||liaBtn.textContent.trim())}});
