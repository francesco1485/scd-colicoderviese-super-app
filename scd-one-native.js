/* SCD ONE 2026/27: native, data-bound Home + Calendar. NO screenshot overlay.
 * Public records come only from window.SCDNextGen.publicSnapshot() / R20 public.calendar.
 * To test without changing production default: ?scdVision=1#pulse.
 */
(() => {
 'use strict';
 const params=new URLSearchParams(location.search);
 if(params.get('scdVision')!=='1')return;
 const app=window.SCDNextGen;
 const homeHost=document.getElementById('view-pulse');
 const calendarHost=document.getElementById('view-calendar');
 if(!app||typeof app.publicSnapshot!=='function'||!homeHost||!calendarHost)return;
 let snapshot=app.publicSnapshot();
 let weekShift=0,mode='WEEK',team='ALL',term='',kindFilter='ALL';
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const icons={
  ball:'<circle cx="12" cy="12" r="9.2"/><path d="m12 7 4 3-1.6 4.8h-4.8L8 10zM12 7V3m4 7 4-1m-5.6 5 2.3 5M9.6 14.8 7 19m1-9-4-1"/>',
  cone:'<path d="m9 3h6l4 15H5L9 3Z"/><path d="M7 13h10M8 9h8M3 20h18"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M8 14h3m3 0h3M8 17h3"/>',
  people:'<circle cx="8.5" cy="8" r="3"/><path d="M3 20v-2a5.5 5.5 0 0 1 11 0v2H3z"/><circle cx="17" cy="9" r="2.5"/><path d="M16 15a4.6 4.6 0 0 1 5 4.5V20h-5"/>',
  home:'<path d="m3 11 9-8 9 8v10h-7v-7h-4v7H3V11Z"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  pin:'<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
  arrow:'<path d="m5 12 14 0m-5-5 5 5-5 5"/>',
  right:'<path d="m9 5 7 7-7 7"/>',
  left:'<path d="m15 5-7 7 7 7"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/>',
  shield:'<path d="M12 2 4 5v6c0 5.5 4 9 8 11 4-2 8-5.5 8-11V5l-8-3Z"/><path d="m8 12 3 3 5-6"/>'
 };
 const icon=(name,size=22)=>'<svg aria-hidden="true" width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.95" stroke-linecap="round" stroke-linejoin="round">'+(icons[name]||icons.calendar)+'</svg>';
 const todayISO=()=>{
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const o=Object.fromEntries(parts.map(p=>[p.type,p.value]));return o.year+'-'+o.month+'-'+o.day;
 };
 const isoShift=(iso,delta)=>{
  const [y,m,d]=iso.split('-').map(Number),v=new Date(Date.UTC(y,m-1,d+delta));
  return v.toISOString().slice(0,10);
 };
 const weekBounds=()=>{
  const today=todayISO(),date=new Date(today+'T12:00:00Z'),offset=(date.getUTCDay()+6)%7;
  const start=isoShift(today,-offset+weekShift*7);return [start,isoShift(start,6)];
 };
 const itDate=(iso,options)=>{if(!iso||!/^\d{4}-\d{2}-\d{2}$/.test(iso))return 'Dato in aggiornamento';return new Intl.DateTimeFormat('it-IT',{timeZone:'Europe/Rome',...options}).format(new Date(iso+'T12:00:00Z'))};
 const nav=()=>'<nav class="scd-one-bottom" aria-label="Navigazione SCD ONE">'+[
  ['pulse','home','Home'],['calendar','calendar','Calendario'],['teams','people','Squadre'],['social','bell','Eventi'],['desk','user','Profilo']
 ].map(([route,ic,label])=>'<button data-scd-go="'+route+'" type="button" class="'+(document.querySelector('.view.active')?.dataset.view===route?'is-active':'')+'">'+icon(ic,22)+'<span>'+label+'</span></button>').join('')+'</nav>';
 const header=(isHome=false)=>'<div class="scd-one-header '+(isHome?'in-hero':'')+'"><button class="scd-one-brand" type="button" data-scd-go="pulse" aria-label="SCD ColicoDerviese, Home"><img src="./assets/logo-scd.png" alt="Stemma SCD ColicoDerviese"><span><small>S.C.D.</small><strong><em>COLICO</em>DERVIESE</strong></span></button><button type="button" class="scd-one-bell" data-scd-go="social" aria-label="Comunicazioni del club">'+icon('bell',27)+'<i aria-hidden="true"></i></button></div>';
 const match=()=>{
  const m=snapshot.nextMatch;
  if(!m)return '<div class="scd-one-match-empty">'+icon('ball',36)+'<strong>Prossima gara in aggiornamento</strong><span>In attesa di calendario ufficiale verificato.</span></div>';
  return '<button type="button" class="scd-one-match-row" data-scd-event="'+esc(m.id)+'"><div class="scd-one-match-date"><small>'+esc(itDate(m.date,{weekday:'short'}).toUpperCase())+'</small><strong>'+esc(itDate(m.date,{day:'2-digit'}))+'</strong><span>'+esc(itDate(m.date,{month:'short'}).toUpperCase())+'</span><small>'+esc(m.time||'Orario da confermare')+'</small></div><div class="scd-one-team"><img src="./assets/logo-scd.png" alt="Stemma SCD"><b>'+esc(m.team||'ColicoDerviese')+'</b></div><b class="scd-one-versus">VS</b><div class="scd-one-team"><span class="scd-one-opponent">?</span><b>'+esc(m.opponent||'Avversario da confermare')+'</b></div></button><div class="scd-one-match-venue">'+icon('pin',15)+'<span>'+esc(m.venue||'Campo da confermare')+'</span><small>Fonte: '+esc(m.source)+'</small></div>';
 };
 const shortcuts=[
  ['Gare','ball','MATCH'],['Allenamenti','cone','TRAINING'],['Eventi','calendar','EVENT'],['Iniziative','people','TOURNAMENT']
 ];
 const quick=()=>'<div class="scd-one-shortcuts">'+shortcuts.map(([title,ic,filter])=>'<button type="button" data-scd-filter="'+filter+'" aria-label="Apri '+title+' nel calendario">'+icon(ic,35)+'<span>'+title+'</span></button>').join('')+'</div>';
 const sponsors=()=>{
  const partners=snapshot.partners||[];
  const cells=partners.length?partners.slice(0,3).map(p=>'<div class="scd-one-sponsor-name">'+esc(p.name)+'</div>').join(''):'<div class="scd-one-sponsor-pending">Partner ufficiali in aggiornamento</div>';
  return '<section class="scd-one-sponsors"><div class="scd-one-bluebar"><h2>I nostri sponsor</h2><a href="./sponsor/" data-scd-sponsor>Vedi tutti '+icon('right',16)+'</a></div><div class="scd-one-sponsor-cells">'+cells+'</div></section>';
 };
 const homeHTML=()=>{
  const count=snapshot.events.length, upcoming=snapshot.events.filter(e=>e.date>=todayISO()).length;
  return '<div class="scd-one-screen scd-one-home" data-testid="one-home">'+
   '<section class="scd-one-hero">'+header(true)+
   '<button type="button" class="scd-one-sky" aria-label="Apri l’assistente Sky" data-scd-sky><img src="./assets/sky.png" alt="Sky, mascotte ufficiale del club"></button>'+
   '<div class="scd-one-hero-copy"><h1>Questa settimana</h1><p>Sport, crescita e comunità<br>nel cuore dell’Alto Lario.</p></div></section>'+
   '<main class="scd-one-home-content">'+quick()+
   '<div class="scd-one-desktop-columns"><div><section class="scd-one-match"><div class="scd-one-section-title scd-one-match-title"><b>'+icon('ball',18)+' PROSSIMA GARA</b><button type="button" data-scd-go="calendar">Vedi tutti '+icon('right',17)+'</button></div>'+match()+'</section>'+
   '<div class="scd-one-actions"><button type="button" data-scd-filter="TRAINING"><span class="scd-one-promo-icon green">'+icon('cone',32)+'</span><span><b>Allenamenti</b><small>Orari e attività delle categorie</small></span></button><button type="button" data-scd-go="social"><span class="scd-one-promo-icon yellow">'+icon('people',32)+'</span><span><b>Open Day</b><small>Scopri le iniziative del club</small></span></button></div></div>'+
   '<div class="scd-one-desktop-side">'+sponsors()+
   '<section class="scd-one-territory"><h2>Mondo Colico</h2><div class="scd-one-territory-grid"><div class="scd-one-territory-img" role="img" aria-label="Panorama dell’Alto Lario"></div><div><b>Mondo Colico</b><p>Notizie, storie, eventi e territorio sempre con noi.</p><button type="button" data-scd-go="social">Scopri '+icon('arrow',16)+'</button></div></div></section></div></div>'+
   '<p class="scd-one-source-note">'+icon('shield',14)+' '+(snapshot.status==='VERIFIED_PUBLIC_CALENDAR'?count+' attività pubbliche dal calendario verificato':'Calendario ufficiale in aggiornamento')+' · Stagione 2026/27</p>'+
   '</main>'+nav()+'</div>';
 };
 const updateHome=()=>{const root=document.getElementById('scdOneHome');if(root)root.innerHTML=homeHTML()};
 const calendarRange=()=>{
  const [start,end]=weekBounds();
  if(mode==='MONTH'){
   const month=itDate(start,{month:'long',year:'numeric'});
   return {label:month.charAt(0).toUpperCase()+month.slice(1),start:start.slice(0,7)+'-01',end:isoShift(start.slice(0,7)+'-01',new Date(Date.UTC(+start.slice(0,4),+start.slice(5,7),0)).getUTCDate()-1)};
  }
  return {label:itDate(start,{day:'numeric',month:'short'})+' – '+itDate(end,{day:'numeric',month:'short',year:'numeric'}),start,end};
 };
 const eventList=(items)=>{
  if(!items.length)return '<div class="scd-one-no-events"><strong>Nessuna attività pubblica verificata</strong><p>Per il periodo selezionato non ci sono eventi pubblicati dalla fonte ufficiale.</p><small>Stato fonte: '+esc(snapshot.status||'IN_AGGIORNAMENTO')+'</small></div>';
  const days=new Map();items.forEach(e=>{if(!days.has(e.date))days.set(e.date,[]);days.get(e.date).push(e)});
  return [...days].map(([date,dayItems])=>'<section class="scd-one-day"><h2>'+esc(itDate(date,{weekday:'long',day:'numeric',month:'long'}))+'</h2>'+
   dayItems.map(e=>'<button type="button" class="scd-one-event '+(e.kind==='MATCH'?'match':e.kind==='TRAINING'?'training':'other')+'" data-scd-event="'+esc(e.id)+'"><span class="scd-one-event-time">'+esc(e.time||'—')+'</span><span class="scd-one-event-icon">'+icon(e.kind==='TRAINING'?'cone':e.kind==='MATCH'?'ball':e.kind==='TOURNAMENT'?'people':'calendar',30)+'</span><span class="scd-one-event-description"><strong>'+esc(e.title)+'</strong><small>'+esc([e.team,e.opponent?'vs '+e.opponent:'',e.venue].filter(Boolean).join(' · ')||'Sede da confermare')+'</small></span>'+icon('right',19)+'</button>').join('')+'</section>').join('');
 };
 const calendarHTML=()=>{
  const range=calendarRange();
  const events=snapshot.events.filter(x=>x.date>=range.start&&x.date<=range.end&&(team==='ALL'||x.team===team)&&(kindFilter==='ALL'||x.kind===kindFilter)&&(!term||[x.title,x.team,x.venue,x.opponent,x.category].join(' ').toLowerCase().includes(term.toLowerCase()))).sort((a,b)=>String(a.date+a.time).localeCompare(String(b.date+b.time)));
  const teams=[...new Set(snapshot.events.map(x=>x.team).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'it'));
  const future=snapshot.events.filter(x=>x.date>=todayISO()&&x.kind==='MATCH').sort((a,b)=>String(a.date+a.time).localeCompare(String(b.date+b.time))).slice(0,2);
  return '<div class="scd-one-screen scd-one-calendar" data-testid="one-calendar">'+
   '<section class="scd-one-calendar-header">'+header(false)+'<h1>Calendario</h1><p>Gare, allenamenti ed eventi del Club</p></section>'+
   '<main class="scd-one-calendar-content"><div class="scd-one-tabs">'+[['WEEK','Settimana'],['MONTH','Mese'],['TEAM','Squadra']].map(([id,label])=>'<button type="button" data-scd-tab="'+id+'" aria-pressed="'+(id===mode)+'" class="'+(id===mode?'active':'')+'">'+label+'</button>').join('')+'</div>'+
   '<div class="scd-one-weekselect"><button type="button" data-scd-week="-1" aria-label="Periodo precedente">'+icon('left',22)+'</button><strong>'+icon('calendar',18)+' '+esc(range.label)+'</strong><button type="button" data-scd-week="1" aria-label="Periodo successivo">'+icon('right',22)+'</button></div>'+
   '<div class="scd-one-calendar-filters">'+(kindFilter!=='ALL'?'<button class="scd-one-clear-filter" type="button" data-scd-clear-filter>Filtro: '+esc(({MATCH:'Gare',TRAINING:'Allenamenti',EVENT:'Eventi',TOURNAMENT:'Tornei'})[kindFilter]||'Attività')+' ×</button>':'')+(mode==='TEAM'?'<label>Squadra <select data-scd-team><option value="ALL">Tutte le squadre</option>'+teams.map(t=>'<option value="'+esc(t)+'" '+(team===t?'selected':'')+'>'+esc(t)+'</option>').join('')+'</select></label>':'')+
   '<label class="scd-one-search">'+icon('search',19)+'<input data-scd-search type="search" value="'+esc(term)+'" placeholder="Cerca un’attività o una squadra" aria-label="Cerca attività"></label></div>'+
   '<div class="scd-one-event-dataset">'+eventList(events)+'</div>'+
   '<button type="button" class="scd-one-all-events" data-scd-all>Tutti gli eventi '+icon('arrow',21)+'</button>'+
   '<section class="scd-one-upcoming"><div class="scd-one-upcoming-head"><h2>Prossime gare</h2><button type="button" data-scd-match-filter>Vedi tutti '+icon('right',17)+'</button></div>'+
   (future.length?future.map(m=>'<button type="button" class="scd-one-future-card" data-scd-event="'+esc(m.id)+'"><span class="scd-one-future-date"><small>'+esc(itDate(m.date,{weekday:'short'}))+'</small><strong>'+esc(itDate(m.date,{day:'numeric'}))+'</strong><small>'+esc(itDate(m.date,{month:'short'}))+'</small></span><img src="./assets/logo-scd.png" alt="SCD"><span><b>'+esc(m.team||'ColicoDerviese')+'</b><strong>vs '+esc(m.opponent||'Avversario da confermare')+'</strong><small>'+esc(m.venue||'Campo da confermare')+'</small></span>'+icon('right',18)+'</button>').join(''):'<p class="scd-one-future-empty">Prossime gare in aggiornamento.</p>')+
   '</section><p class="scd-one-source-note">'+icon('shield',14)+' Fonte: '+esc(snapshot.status||'IN_AGGIORNAMENTO')+'</p></main>'+nav()+'</div>';
 };
 const updateCalendar=()=>{const el=document.getElementById('scdOneCalendar');if(el)el.innerHTML=calendarHTML()};
 const syncVisible=()=>{
  const view=document.querySelector('.view.active')?.dataset.view||'pulse';
  document.body.classList.toggle('scd-one-public-view',view==='pulse'||view==='calendar');
 };
 const navigate=route=>{if(route==='pulse'||route==='calendar'||route==='teams'||route==='social'||route==='desk'){app.setView(route);syncVisible();}};
 const home=document.createElement('div');home.id='scdOneHome';homeHost.prepend(home);
 const cal=document.createElement('div');cal.id='scdOneCalendar';calendarHost.prepend(cal);
 document.body.classList.add('scd-one-native-ready');
 updateHome();updateCalendar();syncVisible();
 app.loadCalendar();
 window.addEventListener('scd:public:update',()=>{snapshot=app.publicSnapshot();updateHome();updateCalendar()});
 window.addEventListener('scd:public:view',()=>{queueMicrotask(syncVisible)});
 const click=e=>{
  const target=e.target.closest('button[data-scd-go],button[data-scd-filter],button[data-scd-sky],button[data-scd-event],button[data-scd-tab],button[data-scd-week],button[data-scd-all],button[data-scd-match-filter]');
  if(!target)return;
  if(target.hasAttribute('data-scd-go')){navigate(target.dataset.scdGo);return}
  if(target.hasAttribute('data-scd-filter')){mode='MONTH';term='';team='ALL';kindFilter=target.dataset.scdFilter;navigate('calendar');updateCalendar();return}
  if(target.hasAttribute('data-scd-sky')){app.openMirror();return}
  if(target.hasAttribute('data-scd-event')){app.openPublicEvent(target.dataset.scdEvent);return}
  if(target.hasAttribute('data-scd-tab')){mode=target.dataset.scdTab;weekShift=0;updateCalendar();return}
  if(target.hasAttribute('data-scd-week')){weekShift+=Number(target.dataset.scdWeek);updateCalendar();return}
  if(target.hasAttribute('data-scd-all')){mode='MONTH';weekShift=0;team='ALL';term='';kindFilter='ALL';updateCalendar();return}
  if(target.hasAttribute('data-scd-match-filter')){mode='MONTH';kindFilter='MATCH';term='';updateCalendar();return}
  if(target.hasAttribute('data-scd-clear-filter')){kindFilter='ALL';updateCalendar();return}
 };
 [home,cal].forEach(el=>el.addEventListener('click',click));
 cal.addEventListener('change',e=>{if(e.target.matches('[data-scd-team]')){team=e.target.value;updateCalendar()}});
 cal.addEventListener('input',e=>{if(!e.target.matches('[data-scd-search]'))return;const pos=e.target.selectionStart;term=e.target.value;const search=e.target;const list=cal.querySelector('.scd-one-event-dataset');if(list){const bounds=calendarRange();const ev=snapshot.events.filter(x=>x.date>=bounds.start&&x.date<=bounds.end&&(team==='ALL'||x.team===team)&&(kindFilter==='ALL'||x.kind===kindFilter)&&[x.title,x.team,x.venue,x.opponent,x.category].join(' ').toLowerCase().includes(term.toLowerCase()));list.innerHTML=eventList(ev)}});
})();
