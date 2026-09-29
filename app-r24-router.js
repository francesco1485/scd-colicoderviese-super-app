(() => {
  const R24={
    version:'24.0.0',
    routes:['home','calendar','communications','services','profile','athlete','family','staff'],
    current:'home',
    route(){
      const raw=(location.hash||'#/home').replace(/^#\/?/,'').split('?')[0].trim();
      return this.routes.includes(raw)?raw:'home';
    },
    go(name){
      const route=this.routes.includes(name)?name:'home';
      try{closeModal()}catch{}
      const hash='#/'+route;
      if(location.hash===hash)this.render(route);
      else location.hash=hash;
    },
    roleMode(){
      const d=state.privateData||{},u=d.user||{},p=d.permissions||{},personal=d.personal||[];
      if(p.direction||u.role==='DIREZIONE'||u.role==='ADMIN')return 'staff';
      if(u.staff||['STAFF','MISTER','MANAGER','SECRETARIAT','REGISTRATION','TOURNAMENTS'].includes(String(u.role||'').toUpperCase()))return 'staff';
      if(personal.length>1)return 'family';
      if(personal.length===1)return 'athlete';
      return 'base';
    },
    navItems(){
      const role=this.roleMode();
      if(role==='staff')return [
        ['staff','▦','Dashboard'],['calendar','▣','Calendario'],['communications','✉','Comunicazioni'],['services','◆','Servizi'],['profile','●','Profilo']
      ];
      if(role==='family')return [
        ['home','⌂','Home'],['calendar','▣','Calendario'],['family','●','Famiglia'],['communications','✉','Comunicazioni'],['profile','◉','Profilo']
      ];
      if(role==='athlete')return [
        ['home','⌂','Home'],['calendar','▣','Calendario'],['athlete','●','Atleta'],['communications','✉','Comunicazioni'],['profile','◉','Profilo']
      ];
      return [
        ['home','⌂','Home'],['calendar','▣','Calendario'],['communications','✉','Comunicazioni'],['services','◆','Servizi'],['profile','●','Profilo']
      ];
    },
    syncNav(){
      const items=this.navItems();
      const mobile=document.querySelector('.mobile-nav');
      if(mobile){
        mobile.innerHTML=items.map(([route,icon,label])=>'<button type="button" data-r24-route="'+route+'" data-nav="'+route+'" class="'+(this.current===route?'active':'')+'"><span>'+icon+'</span>'+label+'</button>').join('');
        mobile.querySelectorAll('[data-r24-route]').forEach(b=>b.onclick=()=>this.go(b.dataset.r24Route));
      }
      const desktop=document.querySelector('.desktop-nav');
      if(desktop){
        const desktopItems=this.roleMode()==='staff'
          ?[['staff','Dashboard'],['calendar','Calendario'],['communications','Comunicazioni'],['services','Servizi'],['profile','Profilo']]
          :[['home','Home'],['calendar','Calendario'],['communications','Comunicazioni'],['services','Servizi'],['profile','Profilo']];
        desktop.innerHTML=desktopItems.map(([route,label])=>'<button type="button" data-r24-route="'+route+'" class="'+(this.current===route?'active':'')+'">'+label+'</button>').join('');
        desktop.querySelectorAll('[data-r24-route]').forEach(b=>b.onclick=()=>this.go(b.dataset.r24Route));
      }
    },
    render(name=this.route()){
      this.current=name;
      document.body.classList.add('r24-router-ready');
      const home=document.querySelector('#home');
      const outlet=document.querySelector('#appRouteView');
      const ticker=document.querySelector('.sponsor-ticker');
      if(!home||!outlet)return;
      home.hidden=true;
      if(ticker)ticker.hidden=true;
      outlet.hidden=false;
      outlet.innerHTML='';
      const renderer=this['render_'+name];
      if(typeof renderer==='function')renderer.call(this,outlet);
      else this.render_notFound(outlet);
      window.scrollTo({top:0,behavior:'auto'});
      this.syncNav();
      this.updateHeader();
      try{track('page_view',{section:'r24_'+name})}catch{}
    },
    updateHeader(){
      const login=document.querySelector('#loginBtn');
      const reg=document.querySelector('#registerBtn');
      const role=this.roleMode();
      if(login)login.textContent=role==='base'?'Area riservata':'Area '+(role==='staff'?'Staff':role==='family'?'Famiglia':'Atleta');
      if(reg)reg.hidden=role!=='base';
    },
    shellHeader(title,subtitle,badge='SCD SUPER APP'){
      return '<header class="r24-screen-head"><div class="r24-screen-head-bg"></div><div class="r24-screen-brand"><img src="./assets/logo-scd.png" alt="SCD ColicoDerviese"><div><small>'+esc(badge)+'</small><h1>'+esc(title)+'</h1><p>'+esc(subtitle)+'</p></div></div><button class="r24-sky-mini" type="button" data-r24-sky aria-label="Apri Sky"><img src="./assets/sky.png" alt=""><span>Sky</span></button></header>';
    },
    bindCommon(root){
      root.querySelectorAll('[data-r24-route]').forEach(b=>b.onclick=()=>this.go(b.dataset.r24Route));
      root.querySelectorAll('[data-r24-sky]').forEach(b=>b.onclick=()=>openSky());
      root.querySelectorAll('[data-r24-action]').forEach(b=>b.onclick=()=>openPublicAction(b.dataset.r24Action));
      root.querySelectorAll('[data-r24-register]').forEach(b=>b.onclick=openRegister);
      root.querySelectorAll('[data-r24-login]').forEach(b=>b.onclick=openLogin);
    },
    render_home(outlet){
      const p=publicData(state.summary||FALLBACK),cal=(state.calendar||[]);
      const counts={
        games:cal.length?cal.filter(x=>/gara|partita|campionato|coppa|amichevole|match/i.test([x.type,x.title].join(' '))).length:'—',
        trainings:cal.length?cal.filter(x=>/allenament/i.test([x.type,x.title].join(' '))).length:'—',
        events:cal.length?cal.filter(x=>!/gara|partita|campionato|coppa|amichevole|match|allenament/i.test([x.type,x.title].join(' '))).length:'—',
        initiatives:(p.initiatives||[]).length||'—'
      };
      const n=p.nextMatch||{};
      const team=displayValue(field(n,'team','teamName'),'SCD ColicoDerviese');
      const opp=displayValue(field(n,'opponentName','opponent','avversario'),'Dato in aggiornamento');
      const when=[fmtDate(field(n,'date','data')),field(n,'time','ora')].filter(Boolean).join(' · ');
      const sponsors=(p.sponsors||[]).slice(0,4);
      const sponsorHtml=sponsors.length?sponsors.map(x=>{
        const name=field(x,'name','sponsor','company','title')||'Partner SCD';
        const logo=field(x,'logo','logoUrl','image');
        return '<div class="r24-home-sponsor">'+(logo?'<img src="'+esc(logo)+'" alt="'+esc(name)+'">':'<b>'+esc(name)+'</b>')+'</div>';
      }).join(''):'<div class="r24-home-sponsor"><b>Partner SCD</b></div>';
      outlet.innerHTML=
        '<section class="r24-home-hero"><div class="r24-home-hero-bg"></div><div class="r24-home-brand"><img src="./assets/logo-scd.png" alt="SCD"><div><small>S.D.C.</small><b>COLICO<span>DERVIESE</span></b><em>PIÙ DI UNA SQUADRA. UN TERRITORIO, UNA FAMIGLIA.</em></div></div><div class="r24-home-copy"><small>STAGIONE '+esc((state.summary&&state.summary.season)||'2026/27')+'</small><h1>Questa settimana</h1><p>Sport, crescita e comunità nel cuore dell’Alto Lario.</p></div><img class="r24-home-sky" src="./assets/sky.png" alt="Sky mascotte SCD"><button class="r24-home-bell" type="button" id="r24HomeNotify" aria-label="Notifiche">♢</button></section>'+
        '<section class="r24-home-kpis"><article><span>⚽</span><strong>'+esc(counts.games)+'</strong><small>Gare</small></article><article><span>◭</span><strong>'+esc(counts.trainings)+'</strong><small>Allenamenti</small></article><article><span>▣</span><strong>'+esc(counts.events)+'</strong><small>Eventi</small></article><article><span>●</span><strong>'+esc(counts.initiatives)+'</strong><small>Iniziative</small></article></section>'+
        '<section class="r24-home-match"><div class="r24-home-match-head"><b>PROSSIMA GARA</b><button type="button" data-r24-route="calendar">Vedi tutte ›</button></div><div class="r24-home-match-body"><time><b>'+esc(field(n,'date','data')?fmtDate(field(n,'date','data')):'Dato in aggiornamento')+'</b><small>'+esc(field(n,'time','ora')||'')+'</small></time><div class="r24-home-team"><img src="./assets/logo-scd.png" alt=""><b>'+esc(team)+'</b></div><strong>VS</strong><div class="r24-home-team opponent"><span>'+esc((opp||'?').slice(0,1).toUpperCase())+'</span><b>'+esc(opp)+'</b></div></div><div class="r24-home-match-meta">'+esc(field(n,'venue','luogo','field')||when||'Dato in aggiornamento')+'</div></section>'+
        '<section class="r24-home-quick"><button type="button" data-r24-route="calendar"><span class="training">◭</span><div><b>Allenamenti</b><small>Consulta attività e categorie</small></div><i>›</i></button><button type="button" data-r24-action="join"><span class="open">●</span><div><b>Open Day</b><small>Vieni a scoprire il calcio con noi</small></div><i>›</i></button></section>'+
        '<section class="r24-home-sponsors"><div class="r24-home-section-title"><b>I nostri sponsor</b><button type="button" data-r24-route="services">Vedi tutti ›</button></div><div>'+sponsorHtml+'</div></section>'+
        '<section class="r24-home-world"><div class="r24-home-world-photo"></div><div><small>MONDO COLICODERVIESE</small><h2>Notizie, storie, eventi e territorio</h2><p>La vita del Club, dentro e fuori dal campo.</p><button type="button" data-r24-route="communications">Scopri ›</button></div></section>';
      const notify=outlet.querySelector('#r24HomeNotify');if(notify)notify.onclick=requestNotificationPermission;
      this.bindCommon(outlet);
    },
    render_notFound(outlet){
      outlet.innerHTML=this.shellHeader('Percorso non disponibile','La sezione richiesta non fa parte del contratto applicativo.')+'<section class="r24-panel"><button class="primary" data-r24-route="home">TORNA ALLA HOME</button></section>';
      this.bindCommon(outlet);
    },
    render_calendar(outlet){
      const rows=(state.calendar||[]).slice().sort((a,b)=>String(a.date||'').localeCompare(String(b.date||''))||String(a.time||'').localeCompare(String(b.time||'')));
      const teams=[...new Set(rows.map(x=>displayValue(x.team,'')).filter(Boolean))].sort();
      outlet.innerHTML=this.shellHeader('Calendario Live','Gare, allenamenti, riunioni, tornei ed eventi della società.','TEMPO · SQUADRE · ATTIVITÀ')+
      '<section class="r24-toolbar"><div class="r24-segment" role="tablist"><button class="active" data-cal-filter="ALL">Tutti</button><button data-cal-filter="MATCH">Gare</button><button data-cal-filter="TRAINING">Allenamenti</button><button data-cal-filter="EVENT">Eventi</button></div><select id="r24TeamFilter" aria-label="Filtra squadra"><option value="">Tutte le squadre</option>'+teams.map(t=>'<option>'+esc(t)+'</option>').join('')+'</select></section>'+
      '<section class="r24-calendar-summary"><article><strong id="r24CountAll">'+rows.length+'</strong><span>Attività caricate</span></article><article><strong>'+teams.length+'</strong><span>Squadre nel feed</span></article><article><strong>'+esc(state.clubTimeZone||'Europe/Rome')+'</strong><span>Fuso ufficiale</span></article></section>'+
      '<section class="r24-panel"><div class="r24-panel-head"><div><small>AGENDA SOCIETARIA</small><h2>Prossime attività</h2></div><button class="outline" id="r24CalendarRefresh">Sincronizza</button></div><div id="r24CalendarRows" class="r24-event-list"></div></section>';
      let filter='ALL';
      const list=outlet.querySelector('#r24CalendarRows');
      const team=outlet.querySelector('#r24TeamFilter');
      const isMatch=x=>/gara|partita|campionato|coppa|amichevole|match/i.test([x.type,x.title].join(' '));
      const isTraining=x=>/allenament/i.test([x.type,x.title].join(' '));
      const renderRows=()=>{
        const selected=team?.value||'';
        const use=rows.filter(x=>{
          if(selected&&displayValue(x.team,'')!==selected)return false;
          if(filter==='MATCH'&&!isMatch(x))return false;
          if(filter==='TRAINING'&&!isTraining(x))return false;
          if(filter==='EVENT'&&(isMatch(x)||isTraining(x)))return false;
          return true;
        }).slice(0,60);
        list.innerHTML=use.length?use.map(x=>{
          const kind=isMatch(x)?'GARA':isTraining(x)?'ALLENAMENTO':'EVENTO';
          return '<button class="r24-event-row" type="button" data-r24-event="'+esc(x.id||'')+'"><span class="r24-event-kind '+kind.toLowerCase()+'">'+kind+'</span><time><b>'+esc(fmtDate(x.date))+'</b><small>'+esc(x.time||'')+'</small></time><div><b>'+esc(x.title||displayValue(x.team,'Attività SCD'))+'</b><small>'+esc([displayValue(x.team,''),x.venue].filter(Boolean).join(' · ')||'Dato in aggiornamento')+'</small></div><i>›</i></button>';
        }).join(''):'<div class="r24-empty"><b>Dato in aggiornamento</b><span>Nessuna attività disponibile per il filtro selezionato.</span></div>';
        list.querySelectorAll('[data-r24-event]').forEach(b=>b.onclick=()=>openCalendarEvent(b.dataset.r24Event));
        const count=outlet.querySelector('#r24CountAll');if(count)count.textContent=use.length;
      };
      outlet.querySelectorAll('[data-cal-filter]').forEach(b=>b.onclick=()=>{
        outlet.querySelectorAll('[data-cal-filter]').forEach(x=>x.classList.remove('active'));
        b.classList.add('active');filter=b.dataset.calFilter;renderRows();
      });
      if(team)team.onchange=renderRows;
      const refresh=outlet.querySelector('#r24CalendarRefresh');
      if(refresh)refresh.onclick=async()=>{refresh.disabled=true;try{await loadPublicCalendar(false);this.render('calendar')}finally{refresh.disabled=false}};
      renderRows();this.bindCommon(outlet);
    },
    render_communications(outlet){
      const p=publicData(state.summary||FALLBACK),rows=(p.highlights||[]).slice(0,12);
      const important=rows.find(x=>/urgent|sospension|variaz|annull|rinvi|cambio/i.test([x.status,x.feedType,x.title,x.message].join(' ')))||rows[0]||{};
      const rest=rows.filter(x=>x!==important);
      outlet.innerHTML=this.shellHeader('Comunicazioni','Club, squadre, social e aggiornamenti ufficiali in un unico spazio.','CLUB · SQUADRE · SOCIAL')+
      '<section class="r24-tabs"><button class="active">Club</button><button data-r24-route="calendar">Attività</button><button data-r24-route="services">Servizi</button></section>'+
      '<section class="r24-important"><span>!</span><div><small>IN EVIDENZA</small><h2>'+esc(field(important,'title','subject','event')||'Aggiornamenti SCD')+'</h2><p>'+esc(field(important,'message','excerpt','venue')||'Le comunicazioni ufficiali del Club vengono raccolte qui.')+'</p><time>'+esc(field(important,'date','time')||'')+'</time></div></section>'+
      '<section class="r24-panel"><div class="r24-panel-head"><div><small>FEED UFFICIALE</small><h2>Ultimi aggiornamenti</h2></div><button class="outline" id="r24CommsRefresh">Aggiorna</button></div><div class="r24-comms-list">'+(rest.length?rest.map(x=>'<article><span>▣</span><div><small>'+esc(field(x,'feedType','source')||'SCD')+'</small><b>'+esc(field(x,'title','subject','event')||'Aggiornamento')+'</b><p>'+esc(field(x,'message','venue','status')||'')+'</p></div><time>'+esc(field(x,'date','time')||'')+'</time></article>').join(''):'<div class="r24-empty"><b>Dato in aggiornamento</b><span>Nessuna nuova comunicazione disponibile.</span></div>')+'</div></section>'+
      '<section class="r24-social-strip"><div><small>SOCIAL HUB</small><h3>Canali ufficiali</h3></div><a href="https://www.instagram.com/s.c.d.colicoderviese/" target="_blank" rel="noopener">Instagram</a><a href="https://www.facebook.com/ColicoDerviese?locale=it_IT" target="_blank" rel="noopener">Facebook</a><a href="https://www.colicoderviese.it/" target="_blank" rel="noopener">Sito</a></section>';
      const refresh=outlet.querySelector('#r24CommsRefresh');if(refresh)refresh.onclick=async()=>{await loadSummary(false);this.render('communications')};
      this.bindCommon(outlet);
    },
    render_services(outlet){
      outlet.innerHTML=this.shellHeader('Servizi SCD','Ingresso al Club, tornei, campi, card, ticketing, sponsor, community e strumenti personali.','SPORT · PERSONE · TERRITORIO')+
      '<section class="r24-service-grid">'+
      '<button data-r24-action="join"><span>⚽</span><b>Gioca con noi</b><small>Preiscrizione, prova, Open Day</small></button>'+
      '<button data-r24-action="tournament"><span>🏆</span><b>Tornei</b><small>Iscrizioni e manifestazioni</small></button>'+
      '<button data-r24-action="rent"><span>⌂</span><b>Campi & spazi</b><small>Richiedi disponibilità</small></button>'+
      '<button data-r24-action="cards"><span>★</span><b>Card SCD</b><small>Tifoso, famiglia, tesserato, partner</small></button>'+
      '<button data-r24-action="tickets"><span>🎟</span><b>Biglietti</b><small>Gare ed eventi abilitati</small></button>'+
      '<button data-r24-action="sponsor"><span>◆</span><b>Diventa Sponsor</b><small>Partnership e progetti</small></button>'+
      '<button id="r24Avatar"><span>◉</span><b>Avatar SCD</b><small>Identità digitale personale</small></button>'+
      '<button data-r24-action="idea"><span>💡</span><b>Proponi un progetto</b><small>Idee e iniziative per il Club</small></button>'+
      '<button data-r24-action="fan"><span>💬</span><b>Community</b><small>Tifosi e partecipazione</small></button>'+
      '<button id="r24Safeguarding" class="safeguarding"><span>🛡</span><b>Safeguarding</b><small>Canale separato e riservato</small></button>'+
      '</section>';
      const avatar=outlet.querySelector('#r24Avatar');if(avatar)avatar.onclick=openAvatarStudio;
      const safe=outlet.querySelector('#r24Safeguarding');if(safe)safe.onclick=openSafeguarding;
      this.bindCommon(outlet);
    },
    render_profile(outlet){
      const count=localRequests().length,session=storedSession(),role=this.roleMode();
      outlet.innerHTML=this.shellHeader('Profilo','Un solo account, più ruoli e servizi secondo le autorizzazioni della Direzione.','ACCOUNT UNICO')+
      '<section class="r24-profile-hero"><div class="r24-profile-avatar">'+esc(((session.email||'SCD')[0]||'S').toUpperCase())+'</div><div><small>'+esc(role==='base'?'UTENTE BASE':role.toUpperCase())+'</small><h2>'+esc(session.email||'Profilo SCD')+'</h2><p>Le funzioni personali si attivano sullo stesso account dopo verifica societaria.</p></div></section>'+
      '<section class="r24-service-grid compact">'+
      '<button id="r24ProfileLogin"><span>⌘</span><b>Area riservata</b><small>Accedi con email e PIN</small></button>'+
      '<button id="r24ProfileLink"><span>＋</span><b>Collega tesserato</b><small>Atleta o famiglia, previa verifica</small></button>'+
      '<button id="r24ProfileRequests"><span>☑</span><b>Le mie richieste</b><small>'+count+' su questo dispositivo</small></button>'+
      '<button id="r24ProfileAvatar"><span>◉</span><b>Avatar & foto</b><small>Identità digitale SCD</small></button>'+
      (role==='athlete'?'<button data-r24-route="athlete"><span>⚽</span><b>Area Atleta</b><small>Profilo personale</small></button>':'')+
      (role==='family'?'<button data-r24-route="family"><span>●</span><b>Area Famiglia</b><small>Profili collegati</small></button>':'')+
      (role==='staff'?'<button data-r24-route="staff"><span>▦</span><b>Area Staff</b><small>Dashboard operativa</small></button>':'')+
      '<a href="./delete-account.html"><span>×</span><b>Account e privacy</b><small>Gestione cancellazione dati</small></a>'+
      '</section>';
      const login=outlet.querySelector('#r24ProfileLogin');if(login)login.onclick=openLogin;
      const link=outlet.querySelector('#r24ProfileLink');if(link)link.onclick=openTesseratoLink;
      const req=outlet.querySelector('#r24ProfileRequests');if(req)req.onclick=openMyRequests;
      const avatar=outlet.querySelector('#r24ProfileAvatar');if(avatar)avatar.onclick=openAvatarStudio;
      this.bindCommon(outlet);
    },
    privateGate(outlet,title,subtitle){
      outlet.innerHTML=this.shellHeader(title,subtitle,'AREA RISERVATA')+
      '<section class="r24-access-gate"><img src="./assets/logo-scd.png" alt=""><small>ACCOUNT UNICO SCD</small><h2>Accesso qualificato</h2><p>Questa schermata utilizza i ruoli e gli scope assegnati dalla Direzione. Nessun ruolo viene scelto autonomamente.</p><button class="primary" data-r24-login>ACCEDI ALL’AREA RISERVATA</button></section>';
      this.bindCommon(outlet);
    },
    render_athlete(outlet){
      const d=state.privateData||{},rows=d.personal||[];
      if(!rows.length)return this.privateGate(outlet,'Area Atleta','Convocazioni, documenti, attività e servizi personali.');
      const p=rows[0],name=[p.firstName,p.lastName].filter(Boolean).join(' ')||p.fullName||'Atleta SCD';
      const key=String(p.code||p.playerCode||p.personId||p.id||'');
      const conv=(d.convocations||[]).filter(x=>!key||String(x.playerCode||x.personId||x.playerId||'')===key).slice(0,4);
      const figc=displayValue(p.figcStatus||p.recordStatus||'','Dato in aggiornamento');
      const cert=displayValue(p.certificateStatus||p.certificateExpiry||'','Dato in aggiornamento');
      const payment=displayValue(p.paymentStatus||p.payment||p.feeStatus||'','Dato in aggiornamento');
      outlet.innerHTML=this.shellHeader('Area Atleta','Profilo personale e prossimi impegni.','ATLETA · '+(p.teamName||'SCD'))+
      '<section class="r24-athlete-hero"><div class="r24-athlete-avatar">'+esc(((p.firstName||name||'?')[0]+(p.lastName||'')[0]).toUpperCase())+'</div><div><small>PROFILO ATLETA</small><h2>'+esc(name)+'</h2><p>'+esc(p.teamName||p.group||'Squadra in aggiornamento')+'</p><span>'+esc(figc)+'</span></div><strong>'+esc(p.number||p.shirtNumber||'')+'</strong></section>'+
      '<section class="r24-calendar-summary three"><article><strong>'+conv.length+'</strong><span>Convocazioni</span></article><article><strong>'+esc(cert)+'</strong><span>Certificato</span></article><article><strong>'+esc(payment)+'</strong><span>Pagamenti</span></article></section>'+
      '<section class="r24-panel"><div class="r24-panel-head"><div><small>PROSSIMI IMPEGNI</small><h2>Convocazioni</h2></div><button class="outline" data-r24-route="calendar">Calendario</button></div><div class="r24-event-list">'+(conv.length?conv.map(x=>'<article class="r24-event-row static"><span class="r24-event-kind gara">GARA</span><time><b>'+esc(fmtDate(x.date||''))+'</b><small>'+esc(x.meetingTime||'')+'</small></time><div><b>'+esc(x.team||x.teamName||'Convocazione SCD')+'</b><small>'+esc(x.meetingPlace||'Luogo in aggiornamento')+'</small></div><i>'+esc(x.response||'DA CONFERMARE')+'</i></article>').join(''):'<div class="r24-empty"><b>Dato in aggiornamento</b><span>Nessuna convocazione disponibile.</span></div>')+'</div></section>';
      this.bindCommon(outlet);
    },
    render_family(outlet){
      const d=state.privateData||{},rows=d.personal||[];
      if(!rows.length)return this.privateGate(outlet,'Area Famiglia','Figli collegati, documenti, attività, trasporti e comunicazioni.');
      outlet.innerHTML=this.shellHeader('Area Famiglia','Tutti i profili autorizzati nello stesso account.','FAMIGLIA · ACCOUNT UNICO')+
      '<section class="r24-family-strip">'+rows.map((p,i)=>{const name=[p.firstName,p.lastName].filter(Boolean).join(' ')||p.fullName||('Atleta '+(i+1));return '<button type="button" data-r24-family="'+i+'" class="'+(i===0?'active':'')+'"><span>'+esc(((p.firstName||name)[0]||'?').toUpperCase())+'</span><b>'+esc(name.split(' ')[0])+'</b><small>'+esc(p.teamName||p.group||'')+'</small></button>'}).join('')+'</section><section id="r24FamilyDetail"></section>';
      const detail=outlet.querySelector('#r24FamilyDetail');
      const renderDetail=i=>{
        const p=rows[i]||rows[0],name=[p.firstName,p.lastName].filter(Boolean).join(' ')||p.fullName||'Atleta SCD';
        const key=String(p.code||p.playerCode||p.personId||p.id||'');
        const conv=(d.convocations||[]).filter(x=>!key||String(x.playerCode||x.personId||x.playerId||'')===key).slice(0,3);
        detail.innerHTML='<section class="r24-profile-hero family"><div class="r24-profile-avatar">'+esc(((p.firstName||name)[0]||'?').toUpperCase())+'</div><div><small>PROFILO COLLEGATO</small><h2>'+esc(name)+'</h2><p>'+esc(p.teamName||p.group||'Squadra in aggiornamento')+'</p></div></section><section class="r24-service-grid compact"><button data-r24-family-action="docs"><span>▤</span><b>Documenti</b><small>'+esc(displayValue(p.certificateStatus||p.certificateExpiry||'','Dato in aggiornamento'))+'</small></button><button data-r24-family-action="payments"><span>▰</span><b>Quote / pagamenti</b><small>'+esc(displayValue(p.paymentStatus||p.payment||'','Dato in aggiornamento'))+'</small></button><button data-r24-route="calendar"><span>▣</span><b>Calendario</b><small>'+conv.length+' convocazioni disponibili</small></button><button data-r24-family-action="transport"><span>▰</span><b>Pulmino</b><small>Trasporti e richieste</small></button></section>';
        detail.querySelectorAll('[data-r24-route]').forEach(b=>b.onclick=()=>this.go(b.dataset.r24Route));
        detail.querySelectorAll('[data-r24-family-action]').forEach(b=>b.onclick=()=>toast(b.dataset.r24FamilyAction==='docs'?'Documenti sincronizzati dal gestionale SCD':b.dataset.r24FamilyAction==='payments'?'Stato amministrativo in aggiornamento':'Trasporti disponibili secondo autorizzazione'));
      };
      outlet.querySelectorAll('[data-r24-family]').forEach(b=>b.onclick=()=>{outlet.querySelectorAll('[data-r24-family]').forEach(x=>x.classList.remove('active'));b.classList.add('active');renderDetail(Number(b.dataset.r24Family||0))});
      renderDetail(0);this.bindCommon(outlet);
    },
    render_staff(outlet){
      const d=state.privateData||{},u=d.user||{},p=d.permissions||{};
      if(!state.sessionToken&&!storedSession().token)return this.privateGate(outlet,'Area Staff / Direzione','Gestione operativa della società secondo ruolo e scope.');
      const personal=d.personal||[],conv=d.convocations||[],requests=(d.direction&&d.direction.requests)||[],transport=(d.transport&&d.transport.kpis)||{};
      const role=managementRole(d),dir=!!p.direction,staff=!!u.staff||dir;
      outlet.innerHTML=this.shellHeader(dir?'Direzione ColicoDerviese':'Area Staff','Squadre, persone, attività, documenti e operatività societaria.','STAFF · DIREZIONE')+
      '<section class="r24-staff-ident"><div><small>PROFILO OPERATIVO</small><h2>'+esc(managementName(d))+'</h2><p>'+esc(role)+(u.area?' · '+esc(u.area):'')+'</p></div><span>'+esc(dir?'DIREZIONE':staff?'STAFF':'RISERVATO')+'</span></section>'+
      '<section class="r24-calendar-summary four"><article><strong>'+personal.length+'</strong><span>Profili</span></article><article><strong>'+conv.length+'</strong><span>Convocazioni</span></article><article><strong>'+requests.length+'</strong><span>Richieste</span></article><article><strong>'+esc(transport.requests||0)+'</strong><span>Pulmini</span></article></section>'+
      '<section class="r24-service-grid staff">'+
      (personal.length?'<button data-r24-route="'+(personal.length>1?'family':'athlete')+'"><span>●</span><b>Atleti / Famiglie</b><small>'+personal.length+' profili collegati</small></button>':'')+
      (staff?'<button id="r24Attendance"><span>✓</span><b>Presenze</b><small>Registro squadra</small></button><button id="r24Convocations"><span>⚽</span><b>Convocazioni</b><small>Crea e gestisci</small></button><button id="r24Messages"><span>✉</span><b>Comunicazioni</b><small>Messaggi operativi</small></button>':'')+
      '<button id="r24Requests"><span>☑</span><b>Richieste</b><small>Invii e stato</small></button>'+
      '<button id="r24Transport"><span>▰</span><b>Pulmini</b><small>Trasporti</small></button>'+
      (dir?'<button id="r24Access"><span>♙</span><b>Utenti & permessi</b><small>Direzione</small></button><button id="r24Evolution"><span>↗</span><b>Evolution Queue</b><small>Miglioramenti</small></button><button id="r24Diagnostics"><span>⌁</span><b>Diagnostica</b><small>Stato tecnico</small></button>':'')+
      '</section><div class="r24-staff-actions"><button class="outline" id="r24StaffSync">SINCRONIZZA</button><button class="outline danger-soft" id="r24StaffLogout">ESCI</button></div>';
      const bind=(id,fn)=>{const el=outlet.querySelector(id);if(el)el.onclick=fn};
      bind('#r24Attendance',openAttendanceManager);bind('#r24Convocations',openConvocationManager);bind('#r24Messages',openMessageManager);
      bind('#r24Requests',openMyRequests);bind('#r24Transport',openTransportManager);bind('#r24Access',openAccessManager);bind('#r24Evolution',openEvolutionManager);bind('#r24Diagnostics',openDiagnosticsManager);
      bind('#r24StaffSync',async()=>{try{state.privateData=await mgmtApi('dashboard.summary');toast('Area aggiornata');this.render('staff')}catch(e){toast(e.message||'Sincronizzazione non riuscita')}});
      bind('#r24StaffLogout',()=>{clearSession();toast('Sessione chiusa');this.go('profile')});
      this.bindCommon(outlet);
    },
    init(){
      const brand=document.querySelector('.brand');if(brand)brand.setAttribute('href','#/home');
      const login=document.querySelector('#loginBtn');if(login)login.onclick=()=>this.go(this.roleMode()==='staff'?'staff':'profile');
      const profile=document.querySelector('#mobileProfile');if(profile)profile.onclick=()=>this.go('profile');
      const settings=document.querySelector('#mobileSettings');if(settings)settings.onclick=()=>this.go('profile');
      window.addEventListener('hashchange',()=>this.render(this.route()));
      const legacyManagement=window.openManagementHome;
      window.openManagementHome=(data)=>{
        state.privateData=data||state.privateData||{};
        try{closeModal()}catch{}
        this.go('staff');
      };
      const legacyCalendar=window.openCalendar;
      window.openCalendar=()=>this.go('calendar');
      const legacyCommunications=window.openCommunicationsHub;
      window.openCommunicationsHub=()=>this.go('communications');
      const legacyProfile=window.openProfile;
      window.openProfile=()=>this.go('profile');
      const legacyEvents=window.openEventsHub;
      window.openEventsHub=()=>this.go('services');
      window.R24={...this,legacy:{legacyManagement,legacyCalendar,legacyCommunications,legacyProfile,legacyEvents}};
      this.render(this.route());
      setTimeout(()=>this.render(this.route()),700);
    }
  };
  document.addEventListener('DOMContentLoaded',()=>R24.init());
})();
