(()=>{
  'use strict';
  const $=selector=>document.querySelector(selector);
  const $$=selector=>[...document.querySelectorAll(selector)];
  const reduced=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const definitions={
    universe:{label:'UNIVERSE SOCIAL',kicker:'SCD UNIVERSE SOCIAL',headline:'IL CLUB ',emphasis:'SI VIVE.',description:'Notizie, territorio, persone e partite: la casa pubblica della comunità ColicoDerviese.',action:'Esplora Universe'},
    sponsor:{label:'SPONSOR',kicker:'SCD SPONSOR',headline:'VALORE CHE ',emphasis:'UNISCE.',description:'Un luogo per aziende e partner che vogliono costruire progetti, visibilità e opportunità insieme al Club.',action:'Scopri le partnership'},
    gestionale:{label:'GESTIONALE',kicker:'SCD GESTIONALE',headline:'IL CLUB ',emphasis:'SI ORGANIZZA.',description:'Atleti, famiglie, staff e direzione: strumenti diversi con la stessa identità e accesso soltanto dopo R20.',action:'Esplora i ruoli'}
  };
  const panels=$$('[data-platform]');
  const switches=$$('[data-switch]');
  const heroTitle=$('#heroTitle');
  const heroKicker=$('#heroKicker');
  const heroDescription=$('#heroDescription');
  const activeName=$('#activePageName');
  const heroAction=$('#heroAction');
  let activePlatform='universe';
  function setPlatform(name,scroll=true){
    if(!definitions[name])return false;
    activePlatform=name;
    const d=definitions[name];
    panels.forEach(panel=>{panel.hidden=panel.dataset.platform!==name});
    switches.forEach(button=>{
      if(button.dataset.switch===name)button.setAttribute('aria-current','page');
      else button.removeAttribute('aria-current');
    });
    heroKicker.textContent=d.kicker;
    heroTitle.replaceChildren(document.createTextNode(d.headline));
    const accent=document.createElement('em');accent.textContent=d.emphasis;heroTitle.append(accent);
    heroDescription.textContent=d.description;
    activeName.textContent=d.label;
    heroAction.firstChild.textContent=d.action+' ';
    document.body.dataset.activePlatform=name;
    if(scroll){
      $('.arena')?.scrollIntoView({block:'start',behavior:reduced()?'auto':'smooth'});
    }
    return true;
  }
  switches.forEach(button=>button.addEventListener('click',()=>setPlatform(button.dataset.switch)));
  $('[data-home]')?.addEventListener('click',event=>{event.preventDefault();setPlatform('universe')});
  heroAction.addEventListener('click',()=>{
    document.querySelector('[data-platform="'+activePlatform+'"]')?.scrollIntoView({
      block:'start',behavior:reduced()?'auto':'smooth'
    });
  });
  setPlatform('universe',false);

  // Functional public filter. No invented posts or server-side data.
  const filters=$$('[data-filter]');
  filters.forEach(button=>button.addEventListener('click',()=>{
    const value=button.dataset.filter;
    filters.forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
    $$('.feature-card[data-category]').forEach(card=>{
      card.hidden=value!=='all'&&card.dataset.category!==value;
    });
  }));

  // Visual exploration only. R20 auth remains unchanged in the canonical application.
  const roles={
    athlete:{label:'AREA ATLETA',title:'Convocazioni, calendario, documenti.',note:'Ogni persona accede esclusivamente alle informazioni che la riguardano.',features:['Allenamenti e partite','Documenti personali','Comunicazioni autorizzate']},
    family:{label:'AREA FAMIGLIA',title:'Figli, impegni e comunicazioni in un solo posto.',note:'Genitori e tutori vedranno soltanto i dati dei minori che sono autorizzati a gestire.',features:['Calendario dei propri figli','Documenti consentiti','Avvisi e scadenze']},
    staff:{label:'AREA STAFF',title:'Attività tecniche coordinate.',note:'Mister e dirigenti avranno strumenti coerenti con gli incarichi e i permessi previsti.',features:['Convocazioni della squadra','Presenze autorizzate','Messaggi al gruppo']},
    direction:{label:'AREA DIREZIONE',title:'Il quadro operativo del Club.',note:'La Direzione potrà consultare soltanto fonti verificate e dati conformi ai permessi assegnati.',features:['Squadre e attività','Radar bandi e territorio','Amministrazione e partner']}
  };
  const roleSummary=$('#roleSummary');
  function showRole(role){
    const details=roles[role];
    if(!details)return;
    $$('[data-role]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.role===role)));
    roleSummary.replaceChildren();
    const label=document.createElement('span');label.className='role-mini';label.textContent=details.label;
    const title=document.createElement('h3');title.textContent=details.title;
    const para=document.createElement('p');para.textContent=details.note;
    const list=document.createElement('ul');
    details.features.forEach(feature=>{const item=document.createElement('li');item.textContent=feature;list.appendChild(item)});
    roleSummary.append(label,title,para,list);
  }
  $$('[data-role]').forEach(button=>button.addEventListener('click',()=>showRole(button.dataset.role)));
  showRole('athlete');

  const reservedDialog=$('#reservedDialog');
  $('#reservedInfo')?.addEventListener('click',()=>reservedDialog?.showModal());
  $('#reservedClose')?.addEventListener('click',()=>reservedDialog?.close());
  reservedDialog?.addEventListener('click',event=>{if(event.target===reservedDialog)reservedDialog.close()});

  // One shared help component. All responses are deterministic and local.
  // No model/API integration is claimed; never request or store credentials.
  const assistantDialog=$('#assistantDialog');
  const messages=$('#assistantMessages');
  const form=$('#assistantForm');
  const input=$('#assistantInput');
  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  function respondTo(question){
    const q=normalize(question);
    if(/(?:calendario|partit|gara|allenament|evento)/.test(q))
      return 'Per calendario, gare ed eventi apri SCD Universe e scegli “Sport”. In questa anteprima non sono collegati dati ufficiali, quindi non posso indicare date o risultati.';
    if(/(?:sponsor|partnership|azienda|partner|led|pubblicit)/.test(q))
      return 'Apri SCD Sponsor per vedere le aree di collaborazione. Per una proposta concreta puoi scrivere a sportclubcolico@gmail.com; non mostriamo prezzi o risultati non verificati.';
    if(/(?:document|pagament|quota|certificat|convocazion|presenz|tesserament)/.test(q))
      return 'Queste informazioni appartengono al Gestionale riservato. Per sicurezza non posso leggerle in questa anteprima; nell’app reale serviranno autenticazione R20 e permessi appropriati.';
    if(/(?:access|login|riservat|password|pin|codice|account)/.test(q))
      return 'La Home pubblica è SCD Universe. L’accesso al Gestionale avviene solo attraverso l’identità R20 esistente e controlli di ruolo. Qui non inserire password, PIN o dati personali.';
    if(/(?:contatt|email|segreteria|telefono|scriv)/.test(q))
      return 'Il contatto centrale della società è sportclubcolico@gmail.com. Questa anteprima non invia messaggi e non raccoglie dati.';
    if(/(?:social|foto|video|news|notizi|comunit)/.test(q))
      return 'In SCD Universe trovi le aree dedicate a notizie, fotografie, video e comunità. Pubblicheremo solo contenuti ufficiali e autorizzati.';
    return 'Posso orientarti tra SCD Universe, SCD Sponsor e SCD Gestionale. Prova a chiedermi di calendario, partnership, documenti oppure contatti. In questa anteprima sono un assistente informativo, non una AI collegata ai sistemi.';
  }
  function addBubble(text,from='user'){
    const bubble=document.createElement('div');bubble.className='bubble'+(from==='bot'?' bot':'');
    bubble.textContent=text;messages.appendChild(bubble);
    bubble.scrollIntoView({block:'nearest',behavior:reduced()?'auto':'smooth'});
    return bubble;
  }
  function ask(question){
    const text=String(question||'').trim().slice(0,220);
    if(!text)return;
    addBubble(text);addBubble(respondTo(text),'bot');
  }
  function openAssistant(){
    if(!assistantDialog?.open)assistantDialog?.showModal();
    input?.focus();
  }
  $$('[data-assistant-open]').forEach(button=>button.addEventListener('click',openAssistant));
  $('#assistantClose')?.addEventListener('click',()=>assistantDialog?.close());
  assistantDialog?.addEventListener('click',event=>{if(event.target===assistantDialog)assistantDialog.close()});
  $$('[data-ask]').forEach(button=>button.addEventListener('click',()=>ask(button.dataset.ask)));
  form?.addEventListener('submit',event=>{
    event.preventDefault();ask(input.value);input.value='';input.focus();
  });
  // Review contract: the same actual instance survives switching between three platforms.
})();
