(function(global){
  'use strict';

  const CLUB_TIME_ZONE='Europe/Rome';

  function qs(selector,root=document){return root.querySelector(selector)}
  function el(tag,className,text){
    const node=document.createElement(tag);
    if(className)node.className=className;
    if(text!==undefined&&text!==null)node.textContent=String(text);
    return node;
  }
  function safeHttpUrl(value){
    if(!value)return null;
    try{
      const url=new URL(String(value),window.location.origin);
      if(!/^https?:$/.test(url.protocol))return null;
      return url.href;
    }catch{return null}
  }
  function tuttocampoUrl(match){
    const explicit=safeHttpUrl(match?.tuttocampo_url);
    if(explicit)return explicit;
    const raw=String(match?.tuttocampo_match_id||'').trim();
    if(!raw)return null;
    if(/^https?:\/\//i.test(raw))return safeHttpUrl(raw);
    if(raw.startsWith('/'))return 'https://www.tuttocampo.it'+raw;
    return null;
  }
  function formatClubDate(value){
    const d=new Date(value);
    if(Number.isNaN(d.getTime()))return '';
    return new Intl.DateTimeFormat('it-IT',{
      timeZone:CLUB_TIME_ZONE,
      day:'2-digit',month:'2-digit',year:'numeric',
      hour:'2-digit',minute:'2-digit'
    }).format(d);
  }

  function renderSegreteriaAlerts(alerts,options={}){
    const root=qs(options.mount||'#segreteria-alerts-dashboard');
    if(!root)return {rendered:0};
    root.replaceChildren();

    const rows=Array.isArray(alerts)?alerts:[];
    if(!rows.length){
      const empty=el('div','alert-empty','Nessuna anomalia di segreteria nei dati verificati.');
      root.appendChild(empty);
      return {rendered:0};
    }

    rows.forEach(alert=>{
      const item=el('article','alert-item '+(alert.severity==='critical'?'bg-danger':'bg-warning'));
      const title=el('strong','alert-title');
      title.textContent='⚠️ '+String(alert.categoria||'Categoria non indicata')+' · '+String(alert.athlete_name||'Atleta');
      const detail=el('p','alert-detail',alert.message||'Verifica richiesta.');
      const state=el('small','alert-state','Stato: '+String(alert.portal_status||'DA VERIFICARE'));
      const button=el('button','btn-sollecito','Prepara sollecito');
      button.type='button';
      button.addEventListener('click',()=>{
        const event=new CustomEvent('scd:secretariat-reminder',{
          bubbles:true,
          detail:{
            personId:String(alert.person_id||''),
            registrationId:String(alert.registration_id||''),
            severity:String(alert.severity||'warning')
          }
        });
        button.dispatchEvent(event);
        if(typeof options.onRemind==='function')options.onRemind(event.detail,alert);
      });
      item.append(title,detail,state,button);
      root.appendChild(item);
    });
    return {rendered:rows.length};
  }

  function setupMatchDayWidget(matchData,options={}){
    const widget=qs(options.mount||'#match-day-widget');
    if(!widget)return false;
    widget.replaceChildren();

    const header=el('div','match-header');
    header.append(
      el('span','campionato',matchData?.campionato_name||'Competizione'),
      el('span','data',formatClubDate(matchData?.match_date))
    );

    const teams=el('div','match-teams');
    teams.append(
      el('strong','',matchData?.home_team||'Casa'),
      document.createTextNode(' vs '),
      el('strong','',matchData?.away_team||'Trasferta')
    );

    const logistics=el('div','match-logistics');
    logistics.appendChild(el('p','', '🏟️ Campo: '+String(matchData?.venue_name||'Da confermare')));

    const maps=safeHttpUrl(matchData?.google_maps_url);
    if(maps){
      const a=el('a','btn-navigation','Apri navigatore Google Maps');
      a.href=maps;a.target='_blank';a.rel='noopener noreferrer';
      logistics.appendChild(a);
    }

    const tc=tuttocampoUrl(matchData);
    if(tc){
      const a=el('a','btn-tuttocampo','Vedi su Tuttocampo');
      a.href=tc;a.target='_blank';a.rel='noopener noreferrer';
      logistics.appendChild(a);
    }

    widget.append(header,teams,logistics);
    return true;
  }

  function buildMatchDayCaption(matchData){
    const date=new Date(matchData?.match_date);
    const time=Number.isNaN(date.getTime())?'[Orario]':new Intl.DateTimeFormat('it-IT',{
      timeZone:CLUB_TIME_ZONE,hour:'2-digit',minute:'2-digit'
    }).format(date);

    return [
      '⚽️ MATCH DAY - LA NOSTRA TERRA, I NOSTRI COLORI! 🔴🔵',
      '',
      'I ragazzi sono pronti a scendere in campo per difendere i colori della SCD COLICODERVIESE! Serve la voce di tutto il territorio, da Colico a Dervio, per spingere la squadra oltre l\'ostacolo.',
      '',
      '🏆 Campionato: '+String(matchData?.campionato_name||'[Campionato]'),
      '🆚 Avversario: '+String(matchData?.opponent||matchData?.away_team||'[Avversario]'),
      '⏱️ Fischio d\'inizio: Ore '+time,
      '🏟️ Stadio: '+String(matchData?.venue_name||'[Campo]'),
      '',
      'Sostieni la squadra seguendo gli aggiornamenti ufficiali oppure raggiungici direttamente al campo attraverso le indicazioni pubblicate nei canali SCD.',
      '',
      '#SCDColicoDerviese #Colico #Dervio #CalcioDilettanti #LNDLombardia #MatchDay #CuoreRossoBlu'
    ].join('\n');
  }

  global.SCDOperativeEngine=Object.freeze({
    renderSegreteriaAlerts,
    setupMatchDayWidget,
    buildMatchDayCaption,
    formatClubDate,
    tuttocampoUrl
  });
})(window);
