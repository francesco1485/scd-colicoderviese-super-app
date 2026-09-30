(() => {
  const R24={
    version:'42.0.0',
    routes:['pulse','home','calendar','communications','services','profile','athlete','family','staff','commercial','lia'],
    current:'pulse',
    route(){
      const raw=(location.hash||'#/pulse').replace(/^#\/?/,'').split('?')[0].trim();
      return this.routes.includes(raw)?raw:'pulse';
    },
    go(name){
      const route=this.routes.includes(name)?name:'pulse';
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
        ['pulse','◉','Pulse'],['calendar','▣','Sport'],['staff','▦','Direzione'],['commercial','◆','Commerciale'],['lia','✦','Lia'],['profile','●','Profilo']
      ];
      if(role==='family')return [
        ['pulse','◉','Pulse'],['calendar','▣','Sport'],['family','●','Famiglia'],['communications','✉','Community'],['profile','◉','Profilo']
      ];
      if(role==='athlete')return [
        ['pulse','◉','Pulse'],['calendar','▣','Sport'],['athlete','●','Atleta'],['communications','✉','Community'],['profile','◉','Profilo']
      ];
      return [
        ['pulse','◉','Pulse'],['calendar','▣','Sport'],['communications','✉','Community'],['services','◆','World'],['profile','●','Profilo']
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
        const role=this.roleMode();
        const desktopItems=role==='staff'
          ?[['pulse','Pulse'],['calendar','Sport'],['staff','Direzione'],['commercial','Commerciale'],['lia','Lia'],['profile','Profilo']]
          :role==='family'
            ?[['pulse','Pulse'],['calendar','Sport'],['family','Famiglia'],['communications','Community'],['profile','Profilo']]
            :role==='athlete'
              ?[['pulse','Pulse'],['calendar','Sport'],['athlete','Atleta'],['communications','Community'],['profile','Profilo']]
              :[['pulse','Pulse'],['calendar','Sport'],['communications','Community'],['services','World'],['profile','Profilo']];
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
      try{window.SCDExperience?.bind(outlet,this.roleMode())}catch{}
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
    render_pulse(outlet){
      const p=publicData(state.summary||FALLBACK);
      const role=this.roleMode();
      const now=clubNow();
      const today=clubDateKey(now);
      const rows=(state.calendar||[]).slice().sort((a,b)=>String(a.date||'').localeCompare(String(b.date||''))||String(a.time||'').localeCompare(String(b.time||'')));
      const future=rows.filter(x=>!x.date||String(x.date).slice(0,10)>=today);
      const todayRows=rows.filter(x=>String(x.date||'').slice(0,10)===today);
      const isMatch=x=>/gara|partita|campionato|coppa|amichevole|match/i.test([x.type,x.title].join(' '));
      const matches=future.filter(isMatch);
      const nextMatch=(p.nextMatch&&Object.keys(p.nextMatch).length)?p.nextMatch:(matches[0]||{});
      const roleLabel=role==='staff'?'STAFF / DIREZIONE':role==='family'?'FAMIGLIA':role==='athlete'?'ATLETA':'COMMUNITY';
      const dateLabel=new Intl.DateTimeFormat('it-IT',{timeZone:state.clubTimeZone,weekday:'long',day:'2-digit',month:'long'}).format(now);
      const team=displayValue(field(nextMatch,'team','teamName'),'SCD ColicoDerviese');
      const opp=displayValue(field(nextMatch,'opponentName','opponent','avversario','title'),'Dato in aggiornamento');
      const matchWhen=[fmtDate(field(nextMatch,'date','data')),field(nextMatch,'time','ora')].filter(Boolean).join(' · ');
      const matchVenue=field(nextMatch,'venue','luogo','field')||'Dato in aggiornamento';

      const sponsorRows=(p.sponsors||[]).filter(x=>!/prospect|negativ|non disponibile|budget esaurito/i.test(String(field(x,'status','state')||'')));
      const sponsorNames=[...new Set(sponsorRows.map(x=>field(x,'name','sponsor','company','title')).filter(Boolean))];
      if(!sponsorNames.length)sponsorNames.push('Noratech Srl','Bianchi Bazzi Angelo Srl');
      const sponsorLoop=[...sponsorNames,...sponsorNames,...sponsorNames,...sponsorNames].map(x=>'<span>'+esc(x)+'</span>').join('');
      const sponsorSpot=sponsorRows.slice(0,4).map(x=>{
        const name=field(x,'name','sponsor','company','title')||'Partner SCD';
        const logo=field(x,'logo','logoUrl','image');
        return '<article class="r38-partner">'+(logo?'<img src="'+esc(logo)+'" alt="'+esc(name)+'">':'<div><b>'+esc(name)+'</b><small>Partner SCD</small></div>')+'</article>';
      }).join('')||sponsorNames.slice(0,4).map(name=>'<article class="r38-partner"><div><b>'+esc(name)+'</b><small>Partner SCD</small></div></article>').join('');

      const roleWorldData=role==='staff'
        ?[
          ['staff','▦','Direzione','Operatività, richieste, dati e controllo','staff'],
          ['calendar','⚽','Sport','Gare, attività e calendario societario','sport'],
          ['communications','✉','Comunicazioni','Club, squadre e social','communications'],
          ['profile','●','SCD ID','Identità, ruoli e permessi','profile']
        ]
        :role==='family'
          ?[
            ['family','◎','Famiglia','Figli, documenti, quote e trasporti','family'],
            ['calendar','⚽','Sport','Impegni e calendario','sport'],
            ['communications','✉','Community','Avvisi e vita del Club','community'],
            ['services','◆','Servizi','Campi, tornei, card e Club','services']
          ]
          :role==='athlete'
            ?[
              ['athlete','◉','Il mio sport','Convocazioni, attività e profilo','athlete'],
              ['calendar','⚽','Sport','Gare e calendario','sport'],
              ['communications','✦','Community','News, MVP e contenuti','community'],
              ['profile','●','SCD ID','Avatar, identità e richieste','profile']
            ]
            :[
              ['calendar','⚽','Sport','Gare, risultati, tornei e attività','sport'],
              ['communications','✦','Community','News, social, MVP e storie','community'],
              ['services','◆','Club','Iscrizioni, campi, card e servizi','club'],
              ['profile','●','SCD ID','Il tuo profilo, avatar e mondo personale','profile']
            ];
      const worlds=roleWorldData.map(([route,icon,title,copy,key])=>'<button class="r38-world" type="button" data-meta-key="'+key+'" data-r24-route="'+route+'" data-twin-evolve="1" data-evo-reason="'+esc(key)+'"><span>'+icon+'</span><b>'+esc(title)+'</b><small>'+esc(copy)+'</small></button>').join('');

      const weekday=new Intl.DateTimeFormat('en-US',{timeZone:state.clubTimeZone,weekday:'short'}).format(now);
      const dayIndex={Mon:0,Tue:1,Wed:2,Thu:3,Fri:4,Sat:5,Sun:6}[weekday]??0;
      const localNoon=new Date(today+'T12:00:00');
      const weekStartDate=new Date(localNoon.getTime()-dayIndex*86400000);
      const weekEndDate=new Date(weekStartDate.getTime()+6*86400000);
      const dateKey=d=>new Intl.DateTimeFormat('en-CA',{timeZone:state.clubTimeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
      const weekStart=dateKey(weekStartDate),weekEnd=dateKey(weekEndDate);
      const localWeek=rows.filter(x=>x.date&&String(x.date).slice(0,10)>=weekStart&&String(x.date).slice(0,10)<=weekEnd);
      const newsroomRows=Array.isArray(state.newsroom?.calendar?.rows)?state.newsroom.calendar.rows:[];
      const weekRows=(newsroomRows.length?newsroomRows:localWeek).slice().sort((a,b)=>String(a.date||'').localeCompare(String(b.date||''))||String(a.time||'').localeCompare(String(b.time||'')));
      const groupLabel=x=>displayValue(x.category||x.birthYear||x.team||field(x,'category','annata','team'),'SCD');
      const groups=[...new Set(weekRows.map(groupLabel).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'it',{numeric:true}));
      const kindOf=x=>{
        const t=[x.kind,x.type,x.title].join(' ');
        if(/allenament|training/i.test(t))return 'ALLENAMENTO';
        if(/gara|partita|campionato|coppa|amichevole|match/i.test(t))return 'GARA';
        if(/torneo|tournament/i.test(t))return 'TORNEO';
        return 'EVENTO';
      };
      const weekCounts=state.newsroom?.calendar?.counts||{
        activities:weekRows.length,
        matches:weekRows.filter(x=>kindOf(x)==='GARA').length,
        trainings:weekRows.filter(x=>kindOf(x)==='ALLENAMENTO').length,
        tournaments:weekRows.filter(x=>kindOf(x)==='TORNEO').length,
        groups:groups.length
      };
      const weekFilters='<button class="active" type="button" data-r40-team-filter="ALL">TUTTE</button>'+groups.map(g=>'<button type="button" data-r40-team-filter="'+esc(g)+'">'+esc(g)+'</button>').join('');
      const dayGroups=new Map();
      weekRows.forEach(x=>{const k=String(x.date||'').slice(0,10)||'SENZA-DATA';if(!dayGroups.has(k))dayGroups.set(k,[]);dayGroups.get(k).push(x)});
      const weekHtml=dayGroups.size?[...dayGroups.entries()].map(([date,items])=>{
        const d=date==='SENZA-DATA'?'DATA IN AGGIORNAMENTO':new Intl.DateTimeFormat('it-IT',{timeZone:state.clubTimeZone,weekday:'long',day:'numeric',month:'long'}).format(new Date(date+'T12:00:00'));
        return '<article class="r40-day" data-r40-day><header><span>'+esc(d.toUpperCase())+'</span><b>'+items.length+'</b></header><div>'+items.map(x=>{
          const grp=groupLabel(x);
          return '<button class="r40-week-event" type="button" data-r40-week-group="'+esc(grp)+'" '+(x.id?'data-r26-event="'+esc(x.id)+'"':'data-r24-route="calendar"')+'><span class="r40-time">'+esc(x.time||'--:--')+'</span><span class="r40-event-main"><small>'+esc(grp)+' · '+esc(kindOf(x))+'</small><b>'+esc(x.title||x.team||'Attività SCD')+'</b><em>'+esc([x.team&&x.team!==grp?x.team:'',x.opponent,x.venue].filter(Boolean).join(' · ')||'Dettagli in aggiornamento')+'</em></span>'+(x.result?'<strong>'+esc(x.result)+'</strong>':'<i>›</i>')+'</button>';
        }).join('')+'</div></article>';
      }).join(''):'<div class="r40-empty"><b>Nessuna attività sportiva verificata per questa settimana.</b><p>Il calendario non viene riempito con dati inventati.</p></div>';

      const newsroom=state.newsroom;
      const newsroomCards=Array.isArray(newsroom?.cards)?newsroom.cards:[];
      const newsHtml=newsroomCards.length?newsroomCards.map(card=>{
        const evidence=Array.isArray(card.evidence)?card.evidence.length:0;
        return '<article class="r40-news-card"><small>'+esc(card.category||'SCD NEWSROOM AI')+'</small><h3>'+esc(card.title||'Sintesi settimanale')+'</h3><p class="r40-news-dek">'+esc(card.dek||'')+'</p><p>'+esc(card.body||'')+'</p><footer><span>'+evidence+' evidenze</span><span>DATI VERIFICATI</span></footer></article>';
      }).join(''):'<article class="r40-news-card"><small>SCD NEWSROOM AI</small><h3>Nessuna news automatica senza fatti.</h3><p>Risultati, classifiche, calendario e iniziative alimenteranno qui il racconto settimanale. Il sito datato non viene usato come riempitivo.</p><footer><span>0 evidenze</span><span>ATTESA DATI</span></footer></article>';

      outlet.innerHTML=
      '<div class="r38-universe">'+
        '<section class="r38-hero">'+
          '<div class="r38-hero-grid">'+
            '<div class="r38-hero-copy"><span class="r38-eyebrow">'+esc(dateLabel.toUpperCase())+' · '+esc(roleLabel)+'</span><h1>La SCD non si guarda.<br><span>Si vive.</span></h1><p>Sport, famiglia, tifo, servizi e territorio dentro un unico universo digitale che cambia con chi lo usa.</p><div class="r38-hero-actions"><button class="r38-btn primary" type="button" data-r24-route="calendar" data-meta-key="sport" data-twin-evolve="2" data-evo-reason="sport">COSA SUCCEDE ORA</button><button class="r38-btn glass" type="button" data-r24-action="join" data-meta-key="join" data-twin-evolve="2" data-evo-reason="community">ENTRA NEL CLUB</button><button class="r38-btn glass" type="button" data-twin-mirror-open data-meta-key="mirror">CHIEDI A MIRROR</button></div></div>'+
            '<div class="r38-hero-side"><div class="r38-mini-brand"><img src="./assets/logo-scd.png" alt="SCD"><div><small>SCD UNIVERSE</small><b>COLICO DERVIESE</b></div></div><div class="r38-next-match"><small>PROSSIMA GARA</small><h2>'+esc(team)+'<br>VS '+esc(opp)+'</h2><p>'+esc(matchWhen||'Data in aggiornamento')+' · '+esc(matchVenue)+'</p><button type="button" data-r24-route="calendar" data-meta-key="match">MATCH CENTRE ›</button></div></div>'+
          '</div>'+
        '</section>'+
        '<section class="r38-sponsor-rail"><strong>PARTNER SCD</strong><div class="r38-sponsor-window"><div class="r38-sponsor-track">'+sponsorLoop+'</div></div></section>'+
        '<section class="r39-experience-bar" aria-label="Modalità esperienza"><div class="r39-experience-copy"><span>◎</span><div><b>Come vuoi vivere SCD adesso?</b><small>Scopri = completa · Rapida = essenziale · Focus = solo ciò che serve.</small></div></div><div class="r39-mode-switch"><button type="button" data-experience-mode="DISCOVER">SCOPRI</button><button type="button" data-experience-mode="QUICK">RAPIDA</button><button type="button" data-experience-mode="FOCUS">FOCUS</button></div></section>'+
        '<section class="r38-live"><div class="r38-live-copy"><span class="r38-live-pulse"></span><div><b>SCD LIVE</b><small>'+esc(todayRows.length?todayRows.length+' attività registrate oggi':'Fonti ufficiali in sincronizzazione')+'</small></div></div><strong>'+esc(todayRows.length)+'</strong><button type="button" id="r38Sync">↻ SINCRONIZZA</button></section>'+
        '<section class="r38-orbits">'+
          '<button class="r38-orbit" data-r24-route="calendar" data-meta-key="match" data-twin-evolve="1"><i>⚽</i><b>Matchday</b><small>Gare & live</small></button>'+
          '<button class="r38-orbit" data-r24-action="fan" data-meta-key="fan" data-twin-evolve="2"><i>🔥</i><b>MVP</b><small>Vota</small></button>'+
          '<button class="r38-orbit" data-r24-action="fan" data-meta-key="fan" data-twin-evolve="2"><i>🎯</i><b>Pronostico</b><small>Community</small></button>'+
          '<button class="r38-orbit" data-twin-mirror-open data-meta-key="mirror"><i>🪞</i><b>Mirror</b><small>Collaboratore</small></button>'+
          '<button class="r38-orbit" data-twin-avatar-open data-meta-key="avatar"><i>🧬</i><b>Avatar</b><small>Evolvi</small></button>'+
          '<button class="r38-orbit" data-r24-action="story" data-meta-key="social" data-twin-evolve="2"><i>📸</i><b>Story</b><small>Condividi</small></button>'+
          '<button class="r38-orbit" data-r24-route="services" data-meta-key="club"><i>◆</i><b>SCD World</b><small>Servizi</small></button>'+
        '</section>'+

        '<section class="r40-week-shell r38-section" data-meta-key="sport">'+
          '<div class="r40-week-head"><div><small>SETTIMANA SCD · TUTTE LE ANNATE</small><h2>Dal lunedì alla domenica. Tutta la vita sportiva.</h2><p>Prima squadra, agonistica, attività di base, allenamenti, gare, tornei ed eventi: un solo calendario, senza tagliare via nessuno.</p></div><button type="button" data-r24-route="calendar">APRI CALENDARIO ›</button></div>'+
          '<div class="r40-week-stats"><div><b>'+esc(weekCounts.activities||0)+'</b><span>attività</span></div><div><b>'+esc(weekCounts.matches||0)+'</b><span>gare</span></div><div><b>'+esc(weekCounts.trainings||0)+'</b><span>allenamenti</span></div><div><b>'+esc(weekCounts.groups||groups.length||0)+'</b><span>annate / gruppi</span></div></div>'+
          '<div class="r40-team-filters" aria-label="Filtra per annata">'+weekFilters+'</div>'+
          '<div class="r40-week-days">'+weekHtml+'</div>'+
        '</section>'+

        '<section class="r40-newsroom r38-section" data-meta-key="community">'+
          '<div class="r40-news-head"><div><small>SCD NEWSROOM AI · SETTIMANALE</small><h2>Le news nascono dai fatti del Club.</h2><p>Risultati inseriti, classifiche strutturate, calendario e iniziative territoriali. Nessun commento recuperato dal sito datato.</p></div><button type="button" id="r40NewsRefresh">RIGENERA ›</button></div>'+
          '<div class="r40-news-grid">'+newsHtml+'</div>'+
          '<div class="r40-news-policy"><span>◎</span><p><b>Politica editoriale R40:</b> se manca un dato verificato, la Newsroom non inventa il contenuto. Il vecchio sito resta escluso dalle news fino a nuova verifica di freschezza.</p></div>'+
        '</section>'+

        '<section class="r38-section"><div class="r38-section-head"><div><small>UN CLUB · PIÙ MODI DI VIVERLO</small><h2>Il tuo mondo SCD</h2></div><button type="button" data-r24-route="profile">Il mio SCD ID ›</button></div><div class="r38-worlds" data-meta-container>'+worlds+'</div></section>'+

        '<section class="r38-twin-grid r38-section">'+
          '<article class="r38-twin-card" data-meta-key="twin">'+
            '<div class="r38-twin-head"><small>SCD TWIN · IDENTITÀ EVOLUTIVA</small><h2>Il tuo compagno digitale cresce con te.</h2><p>Una reinterpretazione moderna del Tamagotchi: non giudica talento o comportamento, ma rende visibile la tua partecipazione alla vita SCD.</p></div>'+
            '<div class="r38-twin-stage"><div class="r38-twin-avatar" aria-label="SCD Twin"></div><div class="r38-twin-stats"><div class="r38-twin-level"><b data-twin-stage>Scintilla</b><span data-twin-xp>0 XP</span></div><div class="r38-xp" data-twin-progress></div><div class="r38-twin-meta"><div><small>AZIONI</small><b data-twin-actions>0</b></div><div><small>MISSIONE</small><b>Vivi il Club</b></div></div></div></div>'+
            '<div class="r38-twin-actions"><button class="primary" type="button" data-twin-avatar-open data-meta-key="avatar">PERSONALIZZA AVATAR</button><button type="button" data-twin-evolve="3" data-evo-reason="esplorazione" data-meta-key="twin">ESPLORA +3 XP</button><button type="button" data-r24-route="communications" data-twin-evolve="2" data-meta-key="community">COMMUNITY</button></div>'+
          '</article>'+
          '<article class="r38-mirror" data-meta-key="mirror">'+
            '<div class="r38-mirror-head"><img src="./assets/sky.png" alt="SCD Mirror"><div><small>SCD MIRROR · COLLABORATORE VIRTUALE</small><h2>Chiedi. Capisce il contesto.</h2><p>Gare, iscrizioni, tornei, sponsor, servizi e Club. Non sostituisce i permessi: lavora dentro le regole SCD.</p></div></div>'+
            '<div class="r38-mirror-chips"><button type="button" data-mirror-prompt="Qual è la prossima gara?">Prossima gara</button><button type="button" data-mirror-prompt="Come posso iscrivermi?">Iscrizioni</button><button type="button" data-mirror-prompt="Come divento sponsor?">Sponsor</button><button type="button" data-mirror-prompt="Cosa posso fare oggi?">Oggi</button></div>'+
            '<div class="r38-mirror-feed"><div class="r38-mirror-bubble">Sono Mirror. Posso orientarti nel mondo SCD e aprire il percorso giusto senza costringerti a cercare in dieci menu.</div></div>'+
            '<form class="r38-mirror-form" data-mirror-form><input aria-label="Chiedi a SCD Mirror" placeholder="Chiedi a Mirror…"><button>INVIA</button></form>'+
          '</article>'+
        '</section>'+

        '<section class="r38-section"><div class="r38-section-head"><div><small>FAN LAB · INTERAZIONE</small><h2>Qui non sei uno spettatore.</h2></div><button type="button" data-r24-route="communications">Community ›</button></div><div class="r38-fan-lab" data-meta-container>'+
          '<button class="r38-fan" type="button" data-r24-action="fan" data-meta-key="fan" data-twin-evolve="3" data-evo-reason="mvp"><i>🔥</i><b>Vota l’MVP</b><small>Scegli il tuo protagonista del weekend.</small></button>'+
          '<button class="r38-fan" type="button" data-r24-action="fan" data-meta-key="community" data-twin-evolve="3" data-evo-reason="pronostico"><i>🎯</i><b>Pronostico SCD</b><small>Gioco community gratuito, senza denaro o betting.</small></button>'+
          '<button class="r38-fan" type="button" data-r24-action="story" data-meta-key="social" data-twin-evolve="3" data-evo-reason="story"><i>📸</i><b>Matchday Story</b><small>Foto e momenti passano dalla moderazione.</small></button>'+
          '<button class="r38-fan" type="button" data-twin-mirror-open data-meta-key="mirror" data-twin-evolve="1"><i>⚡</i><b>Sfida Mirror</b><small>Domande, curiosità e scorciatoie sul Club.</small></button>'+
        '</div></section>'+

        '<section class="r38-section"><div class="r38-section-head"><div><small>PARTNER · TERRITORIO</small><h2>Chi cresce con noi.</h2></div><button type="button" data-r24-action="sponsor" data-meta-key="sponsors">Diventa partner ›</button></div><div class="r38-partners">'+sponsorSpot+'</div></section>'+
        '<section class="r39-growth-loop"><article class="r39-growth-card dark"><small>IL CICLO CHE FINANZIA IL CLUB</small><h3>Più valore → più partecipazione → più opportunità.</h3><p>L’obiettivo non è trattenerti senza motivo. È diventare abbastanza utile e piacevole da farti tornare: sport, servizi, eventi e community aumentano il valore reale per famiglie, partner e territorio.</p><button type="button" data-r24-action="idea" data-meta-key="community">PROPONI UN’IDEA</button></article><article class="r39-growth-card"><small>PARTNER VALUE</small><h3>Visibilità che deve produrre risultati.</h3><p>Sponsor, eventi, card, shop e iniziative vengono progettati per generare metriche verificabili, non loghi messi in fondo a una pagina dimenticata.</p><button type="button" data-r24-action="sponsor" data-meta-key="sponsors">SCOPRI LE PARTNERSHIP</button></article></section>'+
      '</div>';

      outlet.querySelectorAll('[data-r26-event]').forEach(b=>b.onclick=()=>openCalendarEvent(b.dataset.r26Event));
      outlet.querySelectorAll('[data-r40-team-filter]').forEach(b=>b.onclick=()=>{
        const wanted=b.dataset.r40TeamFilter;
        outlet.querySelectorAll('[data-r40-team-filter]').forEach(x=>x.classList.toggle('active',x===b));
        outlet.querySelectorAll('[data-r40-week-group]').forEach(ev=>{ev.hidden=wanted!=='ALL'&&ev.dataset.r40WeekGroup!==wanted});
        outlet.querySelectorAll('[data-r40-day]').forEach(day=>{
          const any=[...day.querySelectorAll('[data-r40-week-group]')].some(ev=>!ev.hidden);
          day.hidden=!any;
        });
      });
      const sync=outlet.querySelector('#r38Sync');
      if(sync)sync.onclick=async()=>{
        sync.disabled=true;
        try{
          await Promise.all([loadSummary(true),loadPublicCalendar(true),loadWeeklyNewsroom(true)]);
          toast('SCD Universe sincronizzato');
          this.render('pulse');
        }catch(e){toast(e.message||'Sincronizzazione non riuscita')}
        finally{sync.disabled=false}
      };
      const newsRefresh=outlet.querySelector('#r40NewsRefresh');
      if(newsRefresh)newsRefresh.onclick=async()=>{
        newsRefresh.disabled=true;
        try{
          await Promise.all([loadPublicCalendar(true),loadWeeklyNewsroom(false)]);
          this.render('pulse');
        }finally{newsRefresh.disabled=false}
      };
      this.bindCommon(outlet);
      try{window.SCDMeta?.apply(outlet,role)}catch{}
      try{window.SCDTwin?.mount(outlet)}catch{}
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
    render_commercial(outlet){
      const d=state.privateData||{},u=d.user||{},perm=d.permissions||{};
      const direction=!!perm.direction||['DIREZIONE','ADMIN'].includes(String(u.role||'').toUpperCase());
      const portfolio=[
        {name:'Noratech Srl',sector:'Tecnologia / corporate',status:'ATTIVO',years:'2026',value:'€400 + IVA',assets:['SOCIAL','CENTRO SPORTIVO'],next:'Report 2026 + proposta upgrade 2027',evidence:'Contratto + PEC'},
        {name:'Coperture Rasero Srl',sector:'Edilizia',status:'ATTIVO',years:'2026-2027',value:'€500 + IVA',assets:['BORDO CAMPO','SITO'],next:'Mappare striscione e rinnovo',evidence:'Contratto'},
        {name:'Officine Pedroncelli Srl',sector:'Mobility / officina',status:'ATTIVO',years:'2024-2026',value:'€500 + IVA / anno',assets:['PULMINO'],next:'Verificare scadenza e foto mezzo',evidence:'Contratto / fattura'},
        {name:'DECAR Srl',sector:'Automotive',status:'AUDIT',years:'2026',value:'€1.500 + IVA',assets:['DA RICOSTRUIRE'],next:'Recuperare accordo e asset 2026',evidence:'Fattura / pagamento'},
        {name:'SACO Multiservizi',sector:'Servizi',status:'DA NORMALIZZARE',years:'2026',value:'€2.440 fatturati',assets:['SPONSOR + FORNITURA'],next:'Separare sponsorship, fornitura e barter',evidence:'Fatturazione'},
        {name:'Bianchi Bazzi Angelo Srl',sector:'Corporate / territorio',status:'AUDIT',years:'2026',value:'€1.500 + IVA',assets:['DA RICOSTRUIRE'],next:'Recuperare accordo e materiali',evidence:'Documentazione contabile'},
        {name:'Saglio Sport / LEGEA',sector:'Sportswear / partner tecnico',status:'PARTNER TECNICO',years:'2026/27',value:'DA VERIFICARE',assets:['KIT','ABBIGLIAMENTO'],next:'Ricostruire accordo, esclusiva e visibilità',evidence:'Gmail / fatturazione'}
      ];
      const led=[
        ['DEGO ARREDAMENTI','Arredamento / design','IN REVISIONE','PRESENTE - DA RICONVALIDARE','PRESENTE','DA ACQUISIRE'],
        ['ATV VALVE','Industria / valvole','IN REVISIONE','PRESENTE - DA RICONVALIDARE','PRESENTE','DA ACQUISIRE'],
        ['IPERAL','GDO / retail','IN REVISIONE','PRESENTE - DA RICONVALIDARE','PRESENTE','DA ACQUISIRE'],
        ['LEGEA','Sportswear / partner tecnico','IN REVISIONE','PRESENTE - DA RICONVALIDARE','PRESENTE','DA ACQUISIRE'],
        ['NBC ELETTRONICA','Elettronica / tecnologia','IN REVISIONE','PRESENTE - DA RICONVALIDARE','PRESENTE','DA ACQUISIRE'],
        ['SAGLIO SPORT','Sportswear / partner tecnico','IN REVISIONE','PRESENTE - DA RICONVALIDARE','PRESENTE','DA ACQUISIRE'],
        ['HDI MAGLIA','Assicurazioni','ATTESA APPROVAZIONE','VERIFICATO','PRESENTE','DA ACQUISIRE'],
        ['DELLOCA','Energia / carburanti / mobilità','ATTESA APPROVAZIONE','VERIFICATO','PRESENTE','DA ACQUISIRE'],
        ['CARCANO','Industria / alluminio','ATTESA APPROVAZIONE','VERIFICATO','PRESENTE','DA ACQUISIRE'],
        ['MDS IMPIANTI','Impiantistica','FONTI VERIFICATE','MANCANTE','MANCANTE','NON RICHIESTA'],
        ['RIGAMONTI GEOM. GINO','Edilizia / infrastrutture','FONTI VERIFICATE','MANCANTE','MANCANTE','NON RICHIESTA'],
        ['TARABINI PAOLO','Termoidraulica / impianti','FONTI VERIFICATE','MANCANTE','MANCANTE','NON RICHIESTA'],
        ['TURBOJET SPURGHI','Servizi ambientali','FONTI VERIFICATE','ASSET UFFICIALE INDIVIDUATO','MANCANTE','NON RICHIESTA'],
        ['GGLASS','Auto / cristalli','FONTI VERIFICATE','FONTE UFFICIALE VERIFICATA','MANCANTE','NON RICHIESTA'],
        ['BIRRIFICIO LEGNONE','Food & Beverage / eventi','FONTI VERIFICATE','MANCANTE','MANCANTE','NON RICHIESTA'],
        ['RIVARENO COLICO','Gelateria / retail','FONTI VERIFICATE','NON VALIDATO','MANCANTE','NON RICHIESTA'],
        ['TRAFILERIE ALLUMINIO ALEXIA','Industria / alluminio','FONTI VERIFICATE','FONTE UFFICIALE VERIFICATA','MANCANTE','NON RICHIESTA'],
        ['GAIO BAR RISTORANTE','Ristorazione / eventi','FONTI VERIFICATE','MANCANTE','MANCANTE','NON RICHIESTA'],
        ['I VIAGGI DELLO SQUALO','Turismo / viaggi','FONTI VERIFICATE','MANCANTE','MANCANTE','NON RICHIESTA']
      ].map((x,i)=>({order:i+1,name:x[0],sector:x[1],status:x[2],logo:x[3],mp4:x[4],approval:x[5]}));
      const ledLogoMap={
        'HDI MAGLIA':'./assets/sponsors/hdi-maglia.png',
        'DELLOCA':'./assets/sponsors/delloca.png',
        'CARCANO':'./assets/sponsors/carcano.jpg'
      };
      const assetTypes=['MAIN SPONSOR','MAGLIA GARA','ABBIGLIAMENTO ALLENAMENTO','SQUADRA','SETTORE GIOVANILE','TORNEO','EVENTO','LED WALL','CARTELLONISTICA','SITO / DIGITAL','SOCIAL','HOSPITALITY','CONVENZIONE','PARTNER TECNICO','FORNITORE','STRUTTURA / AREA','MASCOTTE','FONDO SOLIDALE / CSR','BARTER','ALTRO'];
      const card=s=>'<article class="r42-sponsor-card" data-r42-sponsor-card="'+esc(s.name)+'" data-status="'+esc(s.status)+'"><div class="r42-sponsor-logo" aria-label="Logo '+esc(s.name)+'"><span>'+esc(s.name.split(/\\s+/).slice(0,2).map(v=>v[0]).join('').toUpperCase())+'</span><small>LOGO DA COLLEGARE</small></div><div class="r42-sponsor-card-body"><div class="r42-card-top"><div><h3>'+esc(s.name)+'</h3><p>'+esc(s.sector)+'</p></div><span class="r42-state">'+esc(s.status)+'</span></div><div class="r42-tags">'+s.assets.map(a=>'<span>'+esc(a)+'</span>').join('')+'</div><dl><div><dt>ANNI</dt><dd>'+esc(s.years)+'</dd></div><div><dt>PROSSIMA AZIONE</dt><dd>'+esc(s.next)+'</dd></div></dl>'+(direction?'<div class="r42-economic"><b>'+esc(s.value)+'</b><small>'+esc(s.evidence)+'</small></div>':'')+'<button type="button" class="r42-open-detail" data-open-sponsor="'+esc(s.name)+'">APRI SCHEDA SPONSOR</button></div></article>';
      const ledCard=s=>{const logoSrc=ledLogoMap[s.name];return '<article class="r42-led-card" data-led-status="'+esc(s.status)+'"><div class="r42-led-logo '+(logoSrc?'has-image':'')+'">'+(logoSrc?'<img src="'+esc(logoSrc)+'" alt="'+esc(s.name)+'">':'<span>'+esc(s.name.split(/\\s+/).slice(0,2).map(v=>v[0]).join('').toUpperCase())+'</span>')+'</div><div><div class="r42-card-top"><div><h3>'+esc(s.name)+'</h3><p>'+esc(s.sector)+'</p></div><span class="r42-state">'+esc(s.status)+'</span></div><div class="r42-led-meta"><span>Logo <b>'+esc(s.logo)+'</b></span><span>Master <b>'+esc(s.mp4)+(s.mp4==='PRESENTE'?' · 20s legacy → 40s target':'')+'</b></span><span>Approvazione <b>'+esc(s.approval)+'</b></span></div></div></article>'};
      const readyApproval=led.filter(x=>x.status==='ATTESA APPROVAZIONE').length;
      const mp4Ready=led.filter(x=>x.mp4==='PRESENTE').length;
      outlet.innerHTML=this.shellHeader('Sponsor & LED Control Room','Portafoglio sponsor, attivazioni, materiali, spot LED e vista Direzione nello stesso ambiente.','COMMERCIAL DEVELOPMENT OS · R42')+
      '<section class="r42-status"><div><span class="r42-dot"></span><b>VERTICAL SLICE SPONSOR + LED</b><small>Snapshot verificato dal Master Sponsor Intelligence. Scritture ancora disabilitate.</small></div><span>'+(direction?'SESSIONE DIREZIONE':'VISTA OPERATIVA')+'</span></section>'+
      '<section class="r42-kpis"><article><small>RAPPORTI DOCUMENTATI</small><strong>'+portfolio.length+'</strong><span>portafoglio verificato / audit</span></article><article><small>SPONSOR LED</small><strong>'+led.length+'</strong><span>control room corrente</span></article><article><small>MP4 PRESENTI</small><strong>'+mp4Ready+'</strong><span>master già censiti</span></article><article><small>DA APPROVARE</small><strong>'+readyApproval+'</strong><span>HDI · DellOca · Carcano</span></article></section>'+
      '<section class="r42-tabs" role="tablist"><button class="active" data-r42-tab="control">CONTROL ROOM</button><button data-r42-tab="sponsors">SPONSOR</button><button data-r42-tab="led">LED WALL</button><button data-r42-tab="assets">ASSET</button><button data-r42-tab="sources">FONTI</button></section>'+
      '<section class="r42-view" data-r42-view="control">'+
        '<div class="r42-control-hero"><div><small>OGGI</small><h2>Cosa richiede attenzione</h2><p>Tre spot sono in attesa di approvazione sponsor. Sei sponsor LED hanno MP4 e preview già presenti ma materiali e intelligence vanno ancora riallineati.</p></div><button type="button" data-r42-open="led">APRI LED CONTROL ROOM</button></div>'+
        '<div class="r42-grid">'+
          '<button data-r42-open="sponsors"><span>01</span><b>Sponsor & Partner</b><small>Schede, logo, settore, contatti, anni e attivazioni.</small></button>'+
          '<button data-r42-open="led"><span>02</span><b>LED Wall Studio</b><small>Logo, master MP4, preview, approvazioni e playlist.</small></button>'+
          '<button data-r42-open="assets"><span>03</span><b>Asset sponsorizzabili</b><small>Maglie, LED, tornei, strutture, social, hospitality e altro.</small></button>'+
          '<button><span>04</span><b>Rinnovi & storico</b><small>Stagioni, continuità, upgrade e rapporti da difendere.</small></button>'+
          '<button><span>05</span><b>Contratti</b><small>Durata, esclusiva, deliverable, documenti e stato amministrativo.</small></button>'+
          '<button><span>06</span><b>Materiali brand</b><small>Loghi originali, formati, autorizzazioni e creatività.</small></button>'+
          '<button><span>07</span><b>Nuovi sponsor</b><small>Inserimento guidato di aziende non ancora censite.</small></button>'+
          '<button data-r24-route="lia"><span>AI</span><b>Lia · Assistente operativo</b><small>Ricerca, documenti, follow-up e supporto autorizzato.</small></button>'+
        '</div>'+
      '</section>'+
      '<section class="r42-view" data-r42-view="sponsors" hidden>'+
        '<div class="r42-panel-head"><div><small>PORTAFOGLIO SPONSOR</small><h2>Sponsor reali e rapporti documentati</h2><p>Ogni azienda deve avere un’unica scheda, più attivazioni e più stagioni. Il valore economico è mostrato solo alla Direzione.</p></div><div class="r42-panel-actions"><input id="r42SponsorSearch" type="search" placeholder="Cerca sponsor…"><button type="button" id="r42NewSponsor">+ NUOVO SPONSOR</button></div></div>'+
        '<div class="r42-filterbar"><button class="active" data-sponsor-filter="ALL">TUTTI</button><button data-sponsor-filter="ATTIVO">ATTIVI</button><button data-sponsor-filter="AUDIT">AUDIT</button><button data-sponsor-filter="PARTNER TECNICO">PARTNER TECNICI</button></div>'+
        '<div class="r42-sponsor-cards" id="r42SponsorCards">'+portfolio.map(card).join('')+'</div>'+
        '<aside class="r42-sponsor-drawer" id="r42SponsorDrawer" hidden><div class="r42-drawer-head"><div><small>SCHEDA SPONSOR</small><h3 id="r42DrawerName">Sponsor</h3></div><button type="button" id="r42DrawerClose" aria-label="Chiudi">×</button></div><div id="r42DrawerBody"></div></aside>'+
        '<div class="r42-inline-form" id="r42NewSponsorForm" hidden><div><small>NUOVO SPONSOR / PARTNER</small><h3>Inserimento guidato</h3><p>La UI è pronta; il salvataggio verrà collegato solo all’adapter autorizzato.</p></div><div class="r42-form-grid"><label>Azienda<input placeholder="Ragione sociale / brand"></label><label>Settore<input placeholder="Es. edilizia, banca, food"></label><label>Referente<input placeholder="Nome e ruolo"></label><label>Email<input type="email" placeholder="email professionale"></label><label>Sponsor dal<input placeholder="Es. 2024/25"></label><label>Tipo sponsorizzazione<select><option>Seleziona…</option>'+assetTypes.map(x=>'<option>'+esc(x)+'</option>').join('')+'</select></label></div><label class="r42-wide">Altro / descrizione manuale<textarea rows="3" placeholder="Dettagli, asset non presenti nel menu, note operative"></textarea></label><div class="r42-form-actions"><button type="button" id="r42CancelSponsor">ANNULLA</button><button type="button" id="r42SaveSponsor" class="primary">SALVA QUANDO COLLEGATO</button></div></div>'+
      '</section>'+
      '<section class="r42-view" data-r42-view="led" hidden>'+
        '<div class="r42-panel-head"><div><small>LED WALL STUDIO</small><h2>19 sponsor nel flusso LED</h2><p>Uno sponsor alla volta, identità pulita, spot MP4 da 40 secondi, approvazione prima della messa in onda.</p></div><input id="r42LedSearch" type="search" placeholder="Cerca sponsor LED…"></div>'+
        '<div class="r42-filterbar"><button class="active" data-led-filter="ALL">TUTTI</button><button data-led-filter="ATTESA APPROVAZIONE">DA APPROVARE</button><button data-led-filter="IN REVISIONE">IN REVISIONE</button><button data-led-filter="FONTI VERIFICATE">DA PRODURRE</button></div>'+
        '<div class="r42-led-list" id="r42LedList">'+led.map(ledCard).join('')+'</div>'+
        '<div class="r42-led-spec"><b>STANDARD VIDEO SCD LED</b><span>MP4 · 1920×1080 · 40 secondi · sponsor singolo · nessuna sovrapposizione decorativa non richiesta</span></div>'+
      '</section>'+
      '<section class="r42-view" data-r42-view="assets" hidden>'+
        '<div class="r42-panel-head"><div><small>CATALOGO ASSET</small><h2>Cosa può sponsorizzare un’azienda</h2><p>Menu standard + voce Altro/manuale. Uno sponsor può avere più asset contemporaneamente e per stagioni diverse.</p></div></div>'+
        '<div class="r42-asset-cloud">'+assetTypes.map(x=>'<span>'+esc(x)+'</span>').join('')+'</div>'+
      '</section>'+
      '<section class="r42-view" data-r42-view="sources" hidden>'+
        '<div class="r42-source-list"><article><b>MASTER SPONSOR INTELLIGENCE</b><span>CRM, Sponsor Attivi & Asset, Loghi e Brand, LED Control Room</span><i>CANONICO COMMERCIALE</i></article><article><b>SCD OPERATIVO PILOTA</b><span>Stakeholder, opportunità, task, touchpoint e lineage</span><i>SOURCE OF TRUTH OPERATIVA</i></article><article><b>SCD DRIVE</b><span>Contratti, loghi, proposte, master MP4 e preview</span><i>BACKOFFICE</i></article><article><b>SCD GMAIL</b><span>Storico relazioni e approvazioni</span><i>BACKOFFICE</i></article></div>'+
      '</section>';
      const tabs=[...outlet.querySelectorAll('[data-r42-tab]')],views=[...outlet.querySelectorAll('[data-r42-view]')];
      const open=name=>{tabs.forEach(b=>b.classList.toggle('active',b.dataset.r42Tab===name));views.forEach(v=>v.hidden=v.dataset.r42View!==name)};
      tabs.forEach(b=>b.onclick=()=>open(b.dataset.r42Tab));
      outlet.querySelectorAll('[data-r42-open]').forEach(b=>b.onclick=()=>open(b.dataset.r42Open));
      const sponsorSearch=outlet.querySelector('#r42SponsorSearch');
      if(sponsorSearch)sponsorSearch.oninput=()=>{const q=sponsorSearch.value.trim().toLowerCase();outlet.querySelectorAll('[data-r42-sponsor-card]').forEach(x=>x.hidden=q&&!String(x.dataset.r42SponsorCard||'').toLowerCase().includes(q))};
      outlet.querySelectorAll('[data-sponsor-filter]').forEach(b=>b.onclick=()=>{outlet.querySelectorAll('[data-sponsor-filter]').forEach(x=>x.classList.remove('active'));b.classList.add('active');const f=b.dataset.sponsorFilter;outlet.querySelectorAll('[data-r42-sponsor-card]').forEach(x=>x.hidden=f!=='ALL'&&!String(x.dataset.status||'').includes(f))});
      const ledSearch=outlet.querySelector('#r42LedSearch');
      if(ledSearch)ledSearch.oninput=()=>{const q=ledSearch.value.trim().toLowerCase();outlet.querySelectorAll('.r42-led-card').forEach(x=>x.hidden=q&&!x.textContent.toLowerCase().includes(q))};
      outlet.querySelectorAll('[data-led-filter]').forEach(b=>b.onclick=()=>{outlet.querySelectorAll('[data-led-filter]').forEach(x=>x.classList.remove('active'));b.classList.add('active');const f=b.dataset.ledFilter;outlet.querySelectorAll('[data-led-status]').forEach(x=>x.hidden=f!=='ALL'&&x.dataset.ledStatus!==f)});
      const drawer=outlet.querySelector('#r42SponsorDrawer'),drawerBody=outlet.querySelector('#r42DrawerBody'),drawerName=outlet.querySelector('#r42DrawerName');
      const renderSponsorDetail=s=>{
        if(!drawer||!drawerBody||!drawerName)return;
        drawerName.textContent=s.name;
        drawerBody.innerHTML='<div class="r42-drawer-status"><span class="r42-state">'+esc(s.status)+'</span><b>'+esc(s.sector)+'</b></div>'+
          '<nav class="r42-detail-tabs"><button class="active">OVERVIEW</button><button>SPONSORIZZAZIONI</button><button>STORICO</button><button>MATERIALI</button>'+(direction?'<button>ECONOMICO</button>':'')+'</nav>'+
          '<div class="r42-detail-grid"><div><small>STAGIONI / ANNI</small><b>'+esc(s.years)+'</b></div><div><small>REFERENTE</small><b>DA VERIFICARE / COLLEGARE</b></div><div><small>CONTATTI</small><b>DA RECUPERARE DAL MASTER / GMAIL</b></div><div><small>EVIDENZA</small><b>'+esc(s.evidence)+'</b></div></div>'+
          '<section class="r42-detail-section"><small>COSA SPONSORIZZA / ASSET</small><div class="r42-tags">'+s.assets.map(a=>'<span>'+esc(a)+'</span>').join('')+'</div></section>'+
          '<section class="r42-detail-section"><small>PROSSIMA AZIONE</small><p>'+esc(s.next)+'</p></section>'+
          '<section class="r42-detail-section"><small>MATERIALI BRAND</small><p>Logo ufficiale, documenti, contratto, immagini e materiali LED vengono collegati alla stessa anagrafica sponsor. Se mancanti restano marcati come DA ACQUISIRE.</p></section>'+
          (direction?'<section class="r42-detail-section economic"><small>VISTA DIREZIONE</small><b>'+esc(s.value)+'</b><p>Valore verificato disponibile. Fatturazione, pagamenti, barter e storico economico saranno letti dal Source of Truth autorizzato.</p></section>':'');
        drawer.hidden=false;
        drawer.scrollIntoView({behavior:'smooth',block:'start'});
      };
      outlet.querySelectorAll('[data-open-sponsor]').forEach(b=>b.onclick=()=>{const s=portfolio.find(x=>x.name===b.dataset.openSponsor);if(s)renderSponsorDetail(s)});
      const drawerClose=outlet.querySelector('#r42DrawerClose');if(drawerClose)drawerClose.onclick=()=>drawer.hidden=true;
      const form=outlet.querySelector('#r42NewSponsorForm');
      const newBtn=outlet.querySelector('#r42NewSponsor'),cancel=outlet.querySelector('#r42CancelSponsor'),save=outlet.querySelector('#r42SaveSponsor');
      if(newBtn)newBtn.onclick=()=>{form.hidden=false;form.scrollIntoView({behavior:'smooth',block:'start'})};
      if(cancel)cancel.onclick=()=>form.hidden=true;
      if(save)save.onclick=()=>toast('Salvataggio disabilitato finché l’adapter Sponsor Master non è autorizzato.');
      this.bindCommon(outlet);
    },
    render_lia(outlet){
      const d=state.privateData||{},u=d.user||{},p=d.permissions||{};
      const token=state.sessionToken||storedSession().token||'';
      if(!token)return this.privateGate(outlet,'Lia · Assistente operativo','Accedi per usare Lia con il tuo ruolo e il tuo perimetro autorizzato.');
      const role=String(u.role||u.coreRole||u.type||(p.direction?'DIREZIONE':'USER_BASE')).toUpperCase();
      const direction=!!p.direction||role==='DIREZIONE'||role==='ADMIN';
      const liaApi=location.hostname==='scd-commercial-r42-staging.onrender.com'
        ?'https://scd-lia-r42-staging.onrender.com'
        :'https://scd-colicoderviese-command-r22.onrender.com';
      const roleCopy=direction
        ?'Puoi impartire comandi operativi autorizzati. Le azioni irreversibili o sensibili restano soggette a conferma.'
        :'Lia ti supporta nel perimetro del tuo ruolo. Non può elevare privilegi o operare fuori scope.';
      outlet.innerHTML=this.shellHeader('Lia','Assistente operativo interno SCD: capisce, pianifica, esegue ciò che è autorizzato e registra il risultato.','ASSISTENTE · RUOLI · COMANDI')+
      '<section class="r42-lia-status"><div><span class="r42-lia-orb">L</span><div><small>SESSIONE</small><b>'+esc(role)+'</b><p>'+esc(roleCopy)+'</p></div></div><span>'+(direction?'POTERI DIREZIONE':'SUPPORTO DI RUOLO')+'</span></section>'+
      '<section class="r42-lia-shell">'+
        '<div class="r42-lia-main"><div class="r42-lia-prompt"><label for="r42LiaCommand">Cosa deve fare Lia?</label><textarea id="r42LiaCommand" rows="5" placeholder="Esempio: Mappa tutte le attività del Comune di Colico e prepara il lavoro commerciale."></textarea><div class="r42-lia-actions"><button class="primary" id="r42LiaRun">ESEGUI / PREPARA</button><button class="outline" id="r42LiaHandoff">PREPARA SUPPORTO CHATGPT</button></div></div>'+
        '<div class="r42-lia-result" id="r42LiaResult"><div class="r42-empty"><b>Lia è pronta.</b><span>I comandi vengono autorizzati dal server in base al ruolo. Nessun privilegio nasce dal browser.</span></div></div></div>'+
        '<aside class="r42-lia-side"><small>COMANDI RAPIDI</small>'+
          '<button data-lia-command="Mappa tutte le aziende e attività presenti nel Comune di Colico e mostrami il risultato senza salvare."><b>Mapping Colico</b><span>Ricerca open-data, senza scritture</span></button>'+
          (direction?'<button data-lia-command="Mappa tutte le aziende e attività presenti nel Comune di Colico, crea la cartella di mapping commerciale e salva il risultato."><b>Mapping + Drive</b><span>Direzione · salvataggio tracciato</span></button>':'')+
          (direction?'<button data-lia-command="Crea una sottocartella MAPPING TERRITORIALE / COLICO nel lavoro commerciale."><b>Crea cartella Colico</b><span>Direzione · Drive</span></button>':'')+
          '<button data-lia-command="Prepara una bozza di contratto sponsor usando i documenti che allegherò e indicami cosa serve per completarla."><b>Contratto / documenti</b><span>Piano + handoff documentale</span></button>'+
          '<button data-lia-command="Prepara una locandina sponsor: definisci brief, materiali, formati e controlli prima della generazione grafica."><b>Locandina</b><span>Brief creativo + handoff</span></button>'+
        '</aside>'+
      '</section>'+
      '<section class="r42-lia-policy"><b>Lia non è esterna.</b><span>R22 esegue i comandi; R20/Drive/Supabase restano fonti e motori autorizzati. Il supporto ChatGPT remoto passa per un pacchetto strutturato finché non esiste un canale gratuito, autorizzato e sicuro di collegamento diretto.</span></section>';

      const command=outlet.querySelector('#r42LiaCommand');
      const result=outlet.querySelector('#r42LiaResult');
      outlet.querySelectorAll('[data-lia-command]').forEach(b=>b.onclick=()=>{command.value=b.dataset.liaCommand||'';command.focus()});

      const municipalityOf=q=>{
        const m=String(q||'').match(/(?:comune\\s+di|comune\\s+del|a)\\s+([A-Za-zÀ-ÿ'’ -]{2,60})(?=\\s+(?:e|con|senza|mostra|prepara|crea|salva|tutte|tutti)\\b|[,.]|$)/i);
        return m?m[1].trim():(/colico/i.test(q)?'Colico':'');
      };
      const postCommand=async(name,payload)=>{
        const r=await fetch(liaApi.replace(/\\/$/,'')+'/v1/commands/'+encodeURIComponent(name),{
          method:'POST',
          headers:{'content-type':'application/json','x-scd-session':token,'x-correlation-id':'lia-'+Date.now()},
          body:JSON.stringify(payload)
        });
        const j=await r.json().catch(()=>({ok:false,error:'Risposta Lia non valida'}));
        if(!r.ok)throw new Error(j.error||'Comando Lia non riuscito');
        return j;
      };
      const handoff=q=>{
        const packet={
          schema:'SCD_LIA_HANDOFF_V1',
          createdAt:new Date().toISOString(),
          assistant:'LIA',
          destination:'CHATGPT_REMOTE_SUPPORT',
          actor:{role:role},
          command:q,
          system:{release:'R42',route:'#/lia'},
          rules:['Nessun PIN/token/segreto','Usare fonti reali e citabili','Restituire output pronto da reimportare in Lia']
        };
        return JSON.stringify(packet,null,2);
      };
      const renderMap=data=>{
        const map=data&&data.result?data.result:data;
        const rows=(map&&map.items)||[];
        return '<div class="r42-lia-answer"><div class="r42-lia-answer-head"><div><small>RISULTATO</small><h2>'+esc(map.municipality||'Mapping territoriale')+'</h2><p>'+esc(map.source||'')+' · '+esc(map.coverage||'')+'</p></div><strong>'+esc(map.count??rows.length)+'</strong></div>'+
          '<div class="r42-lia-table"><div class="r42-lia-row head"><span>NOME</span><span>CATEGORIA</span><span>CONTATTO</span></div>'+
          rows.slice(0,80).map(x=>'<div class="r42-lia-row"><span><b>'+esc(x.name||'')+'</b><small>'+esc(x.address||'')+'</small></span><span>'+esc(x.category||'')+'</span><span>'+esc(x.website||x.email||x.phone||'DA ARRICCHIRE')+'</span></div>').join('')+'</div>'+
          (rows.length>80?'<p class="r42-lia-more">Mostrate 80 righe su '+esc(rows.length)+'.</p>':'')+'</div>';
      };

      const run=async()=>{
        const q=String(command.value||'').trim();
        if(!q)return;
        result.innerHTML='<div class="r42-lia-loading"><span></span><b>Lia sta lavorando…</b><small>Verifica ruolo, comando e fonti.</small></div>';
        const municipality=municipalityOf(q);
        try{
          if(/mapp/i.test(q)&&/aziend|attivit/i.test(q)&&municipality){
            const wantsSave=/salva|drive|crea.+cartell/i.test(q);
            const cmd=wantsSave&&direction?'build-municipality-commercial-map':'map-municipality-businesses';
            const response=await postCommand(cmd,{municipality,limit:300,...(cmd==='build-municipality-commercial-map'?{dryRun:false}:{})});
            if(response.result&&response.result.mapping){
              const saved=response.result.saved||{};
              result.innerHTML=renderMap(response.result.mapping)+(saved.spreadsheetUrl?'<div class="r42-lia-saved"><b>Salvato su Drive</b><a href="'+esc(saved.spreadsheetUrl)+'" target="_blank" rel="noopener">Apri mapping</a></div>':'');
            }else result.innerHTML=renderMap(response.result||response);
            return;
          }
          if(/crea/i.test(q)&&/cartell/i.test(q)&&direction){
            const municipality=municipalityOf(q)||'COLICO';
            const response=await postCommand('create-drive-folder',{path:['01 MAPPING TERRITORIALE',municipality],purpose:'Lia · sviluppo commerciale territoriale'});
            const data=response.result||{};
            result.innerHTML='<div class="r42-lia-answer"><small>ESEGUITO</small><h2>Cartella pronta</h2><p>'+esc((data.path||[]).join(' / '))+'</p>'+(data.url?'<a class="primary" href="'+esc(data.url)+'" target="_blank" rel="noopener">APRI DRIVE</a>':'')+'</div>';
            return;
          }
          const packet=handoff(q);
          result.innerHTML='<div class="r42-lia-answer"><small>PIANO / HANDOFF</small><h2>Questo comando richiede un modulo di produzione dedicato.</h2><p>Lia ha preparato il pacchetto da usare con il supporto ChatGPT remoto senza inventare un’esecuzione inesistente.</p><pre class="r42-lia-code">'+esc(packet)+'</pre><button class="outline" id="r42CopyHandoff">COPIA PACCHETTO</button></div>';
          const copy=outlet.querySelector('#r42CopyHandoff');if(copy)copy.onclick=async()=>{await navigator.clipboard.writeText(packet);toast('Pacchetto Lia copiato')};
        }catch(e){
          const msg=String(e&&e.message?e.message:e);
          const bridgeBlock=/Azione API non consentita|Modulo R42 Lia non installato|R20 action failed/i.test(msg);
          result.innerHTML='<div class="r42-lia-error"><b>'+esc(bridgeBlock?'Bridge R20 da aggiornare':'Comando non completato')+'</b><p>'+esc(msg)+'</p>'+(bridgeBlock?'<small>Il motore Lia è pronto, ma la scrittura Drive resta correttamente bloccata finché il patch R42 non viene distribuito sul Web App R20 canonico.</small>':'')+'</div>';
        }
      };
      const runBtn=outlet.querySelector('#r42LiaRun');if(runBtn)runBtn.onclick=run;
      const handoffBtn=outlet.querySelector('#r42LiaHandoff');if(handoffBtn)handoffBtn.onclick=async()=>{
        const q=String(command.value||'').trim()||'Supporto generale Lia';
        const packet=handoff(q);
        try{
          const saved=await postCommand('save-lia-handoff',{command:q,module:'LIA',currentState:'Richiesta preparata dal Command Center R42',requestedOutput:'Supporto remoto ChatGPT tracciato',refs:[]});
          const data=saved.result||{};
          result.innerHTML='<div class="r42-lia-answer"><small>HANDOFF SALVATO</small><h2>Richiesta pronta per il supporto remoto</h2><p>Il pacchetto è stato archiviato nella coda Lia su Drive, senza token o credenziali.</p>'+(data.url?'<a class="primary" href="'+esc(data.url)+'" target="_blank" rel="noopener">APRI HANDOFF</a>':'')+'</div>';
          await navigator.clipboard.writeText(packet).catch(()=>{});
          toast('Handoff Lia salvato');
        }catch(e){
          await navigator.clipboard.writeText(packet).catch(()=>{});
          toast('Bridge handoff non attivo: pacchetto copiato');
        }
      };
      this.bindCommon(outlet);
    },
    render_staff(outlet){
      const d=state.privateData||{},u=d.user||{},p=d.permissions||{};
      if(!state.sessionToken&&!storedSession().token)return this.privateGate(outlet,'Area Staff / Direzione','Gestione operativa della società secondo ruolo e scope.');
      const personal=d.personal||[],conv=d.convocations||[],requests=(d.direction&&d.direction.requests)||[],transport=(d.transport&&d.transport.kpis)||{};
      const role=managementRole(d),dir=!!p.direction,staff=!!u.staff||dir;
      const focusPrimary=requests.length
        ?'<button class="r39-focus-item urgent" id="r39DeskRequests"><span>DA GESTIRE</span><b>'+esc(requests.length)+' richieste aperte</b><small>Apri solo ciò che richiede attenzione.</small></button>'
        :'<button class="r39-focus-item" id="r39DeskMessages"><span>STATO</span><b>Nessuna richiesta aperta</b><small>Puoi passare a comunicazioni o programmazione.</small></button>';
      const focusSport=conv.length
        ?'<button class="r39-focus-item action" id="r39DeskConvocations"><span>SPORT</span><b>'+esc(conv.length)+' convocazioni</b><small>Controlla e gestisci il flusso squadra.</small></button>'
        :'<button class="r39-focus-item action" data-r24-route="calendar"><span>SPORT</span><b>Calendario societario</b><small>Vai direttamente agli impegni.</small></button>';
      const focusTransport='<button class="r39-focus-item" id="r39DeskTransport"><span>LOGISTICA</span><b>'+esc(transport.requests||0)+' richieste pulmino</b><small>Trasporti senza cercare tra cartelle e fogli.</small></button>';
      outlet.innerHTML=this.shellHeader(dir?'Direzione ColicoDerviese':'Area Staff','Squadre, persone, attività, documenti e operatività societaria.','STAFF · DIREZIONE')+
      '<section class="r39-private-desk"><div class="r39-desk-top"><div><small>PRIVATE DESK · '+esc(role)+'</small><h2>Il lavoro che conta, davanti.</h2><p>Questa area mostra priorità e strumenti consentiti dal tuo ruolo. Gli archivi restano dietro al sistema: qui devi lavorare, non cercare file.</p></div><span class="r39-private-badge">RISERVATO · ROLE/SCOPE</span></div><div class="r39-focus-queue">'+focusPrimary+focusSport+focusTransport+'</div><div class="r39-desk-controls"><button type="button" data-experience-mode="FOCUS">FOCUS</button><button type="button" data-experience-mode="QUICK">RAPIDA</button><button type="button" data-experience-mode="DISCOVER">COMPLETA</button><button type="button" data-twin-mirror-open>CHIEDI A MIRROR</button></div></section>'+
      '<section class="r24-staff-ident"><div><small>PROFILO OPERATIVO</small><h2>'+esc(managementName(d))+'</h2><p>'+esc(role)+(u.area?' · '+esc(u.area):'')+'</p></div><span>'+esc(dir?'DIREZIONE':staff?'STAFF':'RISERVATO')+'</span></section>'+
      '<section class="r24-calendar-summary four"><article><strong>'+personal.length+'</strong><span>Profili</span></article><article><strong>'+conv.length+'</strong><span>Convocazioni</span></article><article><strong>'+requests.length+'</strong><span>Richieste</span></article><article><strong>'+esc(transport.requests||0)+'</strong><span>Pulmini</span></article></section>'+
      '<section class="r24-service-grid staff">'+
      '<button id="r42LiaStaff" data-r24-route="lia"><span>✦</span><b>Lia</b><small>Assistente operativo per il tuo ruolo</small></button>'+
      (personal.length?'<button data-r24-route="'+(personal.length>1?'family':'athlete')+'"><span>●</span><b>Atleti / Famiglie</b><small>'+personal.length+' profili collegati</small></button>':'')+
      (staff?'<button id="r24Attendance"><span>✓</span><b>Presenze</b><small>Registro squadra</small></button><button id="r24Convocations"><span>⚽</span><b>Convocazioni</b><small>Crea e gestisci</small></button><button id="r24Messages"><span>✉</span><b>Comunicazioni</b><small>Messaggi operativi</small></button>':'')+
      '<button id="r24Requests"><span>☑</span><b>Richieste</b><small>Invii e stato</small></button>'+
      '<button id="r24Transport"><span>▰</span><b>Pulmini</b><small>Trasporti</small></button>'+
      (dir?'<button id="r24Access"><span>♙</span><b>Utenti & permessi</b><small>Direzione</small></button><button id="r24Evolution"><span>↗</span><b>Evolution Queue</b><small>Miglioramenti</small></button><button id="r24Diagnostics"><span>⌁</span><b>Diagnostica</b><small>Stato tecnico</small></button>'+(featureEnabled('dataFabricObservability')?'<button id="r28DataFabric"><span>◎</span><b>Data Fabric</b><small>Fonti · sync · provenienza</small></button>':''):'')+
      '</section><div class="r24-staff-actions"><button class="outline" id="r24StaffSync">SINCRONIZZA</button><button class="outline danger-soft" id="r24StaffLogout">ESCI</button></div>';
      const bind=(id,fn)=>{const el=outlet.querySelector(id);if(el)el.onclick=fn};
      bind('#r24Attendance',openAttendanceManager);bind('#r24Convocations',openConvocationManager);bind('#r24Messages',openMessageManager);
      bind('#r24Requests',openMyRequests);bind('#r24Transport',openTransportManager);bind('#r24Access',openAccessManager);bind('#r24Evolution',openEvolutionManager);bind('#r24Diagnostics',openDiagnosticsManager);bind('#r28DataFabric',openDataFabricManager);
      bind('#r39DeskRequests',openMyRequests);bind('#r39DeskMessages',openMessageManager);bind('#r39DeskConvocations',openConvocationManager);bind('#r39DeskTransport',openTransportManager);
      bind('#r24StaffSync',async()=>{try{state.privateData=await mgmtApi('dashboard.summary');toast('Area aggiornata');this.render('staff')}catch(e){toast(e.message||'Sincronizzazione non riuscita')}});
      bind('#r24StaffLogout',()=>{clearSession();toast('Sessione chiusa');this.go('profile')});
      this.bindCommon(outlet);
    },
    init(){
      const brand=document.querySelector('.brand');if(brand)brand.setAttribute('href','#/pulse');
      const login=document.querySelector('#loginBtn');if(login)login.onclick=()=>this.go(this.roleMode()==='staff'?'staff':'profile');
      const profile=document.querySelector('#mobileProfile');if(profile)profile.onclick=()=>this.go('profile');
      const settings=document.querySelector('#mobileSettings');if(settings)settings.onclick=()=>this.go('profile');
      window.addEventListener('hashchange',()=>this.render(this.route()));
      window.addEventListener('scd:capabilities',()=>this.render(this.route()));
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
