import * as React from 'react';
import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
 ArrowRight, Bell, Calendar, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight,
 CircleHelp, ClipboardCheck, ClipboardList, CreditCard, FileText, Flag,
 Home, Mail, MapPin, Megaphone, Menu, MessageSquareText, Plus,
 Search, Settings, ShieldCheck, Shirt, Trophy, Users, UserRound, X,
 Volleyball, TrafficCone, Bus, TrendingUp, Heart, Instagram, Facebook,
 Youtube, Newspaper, Award, FolderOpen, Clock3, AlertTriangle, PenLine
} from 'lucide-react';
import logo from '@/assets/logo-scd.png.asset.json';
import { OfficialAsset } from './OfficialAsset';
import './scd-fidelity-six.css';

export type Screen = 'home'|'calendar'|'athlete'|'family'|'staff'|'communications';
const allScreens: {id:Screen; title:string; app:string}[]=[
 {id:'home',title:'Home Pubblica',app:'ONE'},
 {id:'calendar',title:'Calendario Live',app:'ONE'},
 {id:'athlete',title:'Area Atleta',app:'CORE'},
 {id:'family',title:'Area Famiglia',app:'CORE'},
 {id:'staff',title:'Staff / Direzione',app:'CORE'},
 {id:'communications',title:'Comunicazioni',app:'ONE'}
];
type DemoAction=(name:string)=>void;
function Crest({size='normal'}:{size?:'normal'|'small'|'large'}) {
 return <OfficialAsset src={logo.url} alt="Stemma originale SCD ColicoDerviese" className={'scd6-crest scd6-crest-'+size}/>;
}
function StatusBar(){return <div className="scd6-statusbar" aria-label="Anteprima dispositivo"><span>9:41</span><div className="scd6-notch" aria-hidden="true"/><span className="scd6-signals">▂▄▆ <span>◉</span> ▰</span></div>;}
function Top({title,brand=false,search=false,settings=false,onNotice,onAction}:{title?:string;brand?:boolean;search?:boolean;settings?:boolean;onNotice:()=>void;onAction:DemoAction}) {
 return <div className="scd6-top">
  <StatusBar/>
  <div className="scd6-top-content">
   <Crest/>
   <div className={brand?'scd6-topbrand':'scd6-toptitle'}>{brand?<><span>S.C.D.</span><strong><b>COLICO</b><em>DERVIESE</em></strong></>:title}</div>
   <button type="button" className="scd6-topicon" aria-label={search?'Apri ricerca':settings?'Apri impostazioni':'Apri comunicazioni'} onClick={search?()=>onAction('Ricerca'):settings?()=>onAction('Impostazioni'):onNotice}>
    {search?<Search size={26}/>:settings?<Settings size={26}/>:<Bell size={26}/>}
    {!search&&!settings&&<i className="scd6-bell-dot"/>}
   </button>
  </div>
 </div>;
}
function Bar({text,other,onClick}:{text:string;other?:string;onClick?:()=>void}){
 return <div className="scd6-sectionbar"><strong>{text}</strong>{other&&<button type="button" onClick={onClick}>{other}<ChevronRight size={17}/></button>}</div>;
}
function Nav({active,onSelect}:{active:Screen;onSelect:(s:Screen)=>void}){
 const entries: {label:string;Icon:typeof Home;id:Screen}[]=[
  {label:'Home',Icon:Home,id:'home' as Screen},
  {label:'Calendario',Icon:CalendarDays,id:'calendar' as Screen},
  {label:'Squadre',Icon:Users,id:'staff' as Screen},
  {label:'Eventi',Icon:Calendar,id:'communications' as Screen},
  {label:'Profilo',Icon:UserRound,id:'athlete' as Screen}
 ];
 if(active==='staff'){entries[0]={label:'Dashboard',Icon:Home,id:'staff'};entries[1]={label:'Squadre',Icon:Users,id:'calendar'};entries[2]={label:'Atleti',Icon:Shirt,id:'athlete'};entries[3]={label:'Comunicazioni',Icon:MessageSquareText,id:'communications'};entries[4]={label:'Altro',Icon:Menu,id:'family'};}
 if(active==='communications'){entries[2]={label:'Comunicazioni',Icon:MessageSquareText,id:'communications'};entries[3]={label:'Squadre',Icon:Users,id:'staff'};entries[4]={label:'Altro',Icon:Menu,id:'family'};}
 return <nav className="scd6-bottomnav" aria-label="Navigazione principale">
  {entries.map((e,i)=><button type="button" key={i} onClick={()=>onSelect(e.id)} data-testid={'bottom-'+e.id} aria-current={active===e.id?'page':undefined} className={e.id===active?'scd6-active':''}><e.Icon size={24} strokeWidth={2.1}/><span>{e.label}</span></button>)}
 </nav>;
}
function HomeScreen({to,onAction,onNotice}:{to:(x:Screen)=>void;onAction:DemoAction;onNotice:()=>void}){
 return <>
  <div className="scd6-homehero">
   <Top brand onNotice={onNotice} onAction={onAction}/>
   <div className="scd6-homehero-photo"/>
   <button type="button" className="scd6-hero-sky" onClick={()=>onAction('Sky, assistente virtuale')} aria-label="Apri Sky"><img src="/assets/sky-mascotte-ufficiale.png" alt="Mascotte Sky originale"/></button>
   <div className="scd6-homehero-copy"><h1>Questa settimana</h1><p>Sport, crescita e comunità<br/>nel cuore dell'Alto Lario.</p></div>
  </div>
  <div className="scd6-homebody">
   <div className="scd6-quickrow">
    {([{t:'Gare',I:Volleyball,c:'navy',next:'calendar'},{t:'Allenamenti',I:TrafficCone,c:'orange',next:'calendar'},{t:'Eventi',I:CalendarDays,c:'blue',next:'calendar'},{t:'Iniziative',I:Users,c:'green',next:'communications'}] as const).map(e=><button type="button" onClick={()=>to(e.next)} key={e.t} className="scd6-quick"><e.I size={32} strokeWidth={2.6} className={'scd6-icon-'+e.c}/><strong>{e.t}</strong></button>)}
   </div>
   <div className="scd6-home-match">
    <Bar text="⚽ PROSSIMA GARA" other="Vedi tutti" onClick={()=>to('calendar')}/>
    <div className="scd6-match-content">
     <div className="scd6-dateblock"><small>DOM</small><strong>10</strong><b>NOV</b><span>15:30</span></div>
     <div className="scd6-team"><Crest size="small"/><strong>ColicoDerviese</strong><span>U15</span></div>
     <span className="scd6-vs">VS</span>
     <div className="scd6-team"><span className="scd6-opp-badge">B</span><strong>Bellagina</strong><span>U15</span></div>
    </div>
    <div className="scd6-stadium"><MapPin size={15}/> Stadio Comunale · Colico</div>
   </div>
   <div className="scd6-activities">
    <button type="button" onClick={()=>to('calendar')}><span className="scd6-activity-art green"><TrafficCone size={36}/></span><span><strong>Allenamenti</strong><small>della settimana<br/>tutte le attività</small></span></button>
    <button type="button" onClick={()=>to('communications')}><span className="scd6-activity-art yellow"><Users size={36}/></span><span><strong>Open Day</strong><small>Vieni a scoprire<br/>il calcio con noi</small></span></button>
   </div>
   <div className="scd6-sponsorbox"><Bar text="I nostri sponsor" other="Vedi tutti" onClick={()=>onAction('Sponsor e partnership')}/><div className="scd6-sponsorlogos"><div className="scd6-sponsor-atv">ATV</div><div className="scd6-sponsor-hdi">HDI</div><div className="scd6-sponsor-partner">◉</div></div></div>
   <div className="scd6-mondocolico"><h2>Mondo Colico</h2><div className="scd6-mondo-card"><div className="scd6-mondo-image" role="img" aria-label="Fotografia sportiva del territorio"/><div><strong>Mondo Colico</strong><p>Notizie, storie, eventi e territorio sempre con noi.</p><button type="button" onClick={()=>onAction('Mondo Colico')}>Scopri <ArrowRight size={16}/></button></div></div></div>
  </div>
 </>;
}
function DemoEvents({filter,onAction}:{filter:string;onAction:DemoAction}){
 const items=[
  {d:'MAR 8 APR',t:'17:30',name:'Allenamento Under 14',where:'Centro Sportivo · Colico',Icon:TrafficCone,c:'blue'},
  {d:'MER 9 APR',t:'20:00',name:'Riunione Staff',where:'Sede del club',Icon:Users,c:'yellow'},
  {d:'VEN 11 APR',t:'',name:'Allenamento Under 14',where:'Centro Sportivo · Colico',Icon:TrafficCone,c:'green'},
  {d:'SAB 12 APR',t:'',name:'Partita Campionato Under 15',where:'Trasferta',Icon:Volleyball,c:'red'},
 ];
 return <div className="scd6-eventlist">{(filter==='Settimana'?items:filter==='Squadra'?items.filter(z=>z.name.includes('Under')):[]).map((e,i)=>
 <button type="button" onClick={()=>onAction(e.name)} key={i} className={'scd6-eventline scd6-mark-'+e.c}>
  <div className="scd6-eventdate"><strong>{e.d}</strong><b>{e.t}</b></div><e.Icon size={30} className={e.c==='blue'||e.c==='green'?'scd6-icon-orange':'scd6-icon-navy'}/><div className="scd6-eventdesc"><strong>{e.name}</strong><span><MapPin size={12}/>{e.where}</span></div></button>)}
 {filter==='Mese'&&<div className="scd6-calendar-month"><CalendarDays size={35}/><p>Vista mese selezionata · dati dimostrativi</p></div>}
 </div>;
}
function UpcomingMatches({onAction}:{onAction:DemoAction}){
 return <><div className="scd6-minor-header"><h2>Prossime gare</h2><button type="button" onClick={()=>onAction('Tutte le gare')}>Vedi tutti <ChevronRight size={16}/></button></div><div className="scd6-upcoming">
 {['Bellagina','Dubino'].map((r,i)=><button type="button" key={r} onClick={()=>onAction('Gara ColicoDerviese vs '+r)} className={'scd6-upcomingrow scd6-mark-'+(i===0?'blue':'red')}><div className="scd6-upcoming-date"><small>DOM</small><strong>{i===0?'10':'17'}</strong><span>NOV</span></div><Crest size="small"/><div className="scd6-upcoming-info"><strong>ColicoDerviese U{ i===0?'15':'17'}</strong><b>vs {r}</b><small>Stadio Comunale · Colico</small></div><ChevronRight size={18}/></button>)}
 </div></>;
}
function CalendarScreen({onAction,onNotice}:{onAction:DemoAction;onNotice:()=>void}){
 const [filter,setFilter]=useState('Settimana');
 const [week,setWeek]=useState(0);
 const label=week===0?'7 – 13 Aprile 2025':week>0?'Settimana successiva (+ '+week+')':'Settimana precedente ('+week+')';
 return <><Top title="Calendario" search onAction={onAction} onNotice={onNotice}/><div className="scd6-page scd6-calendar">
  <div className="scd6-tabs">{['Settimana','Mese','Squadra'].map(k=><button key={k} type="button" aria-pressed={filter===k} className={filter===k?'selected':''} onClick={()=>setFilter(k)}>{k}</button>)}</div>
  <div className="scd6-weekpicker"><button type="button" aria-label="Settimana precedente" onClick={()=>setWeek(v=>v-1)}><ChevronLeft size={22}/></button><strong><CalendarDays size={18}/>{label}</strong><button type="button" aria-label="Settimana successiva" onClick={()=>setWeek(v=>v+1)}><ChevronRight size={22}/></button></div>
  {week===0?<DemoEvents filter={filter} onAction={onAction}/>:<div className="scd6-demo-empty"><CalendarDays size={26}/> Dati della settimana non collegati</div>}
  <button type="button" className="scd6-primarybtn" onClick={()=>onAction('Tutti gli eventi')}>Vedi tutti gli eventi <ArrowRight size={20}/></button>
  <UpcomingMatches onAction={onAction}/>
 </div></>;
}
function ProfileTabs({screen,onSelect}:{screen:Screen;onSelect:(a:Screen)=>void}){
 return <div className="scd6-tabs scd6-role-tabs">{([{id:'athlete',name:'Atleta'},{id:'family',name:'Famiglia'},{id:'staff',name:'Staff'}] as const).map(e=><button type="button" key={e.id} onClick={()=>onSelect(e.id)} aria-pressed={screen===e.id} className={screen===e.id?(e.id==='family'?'selected yellow':'selected'):''}>{e.name}</button>)}</div>;
}
function ActionGrid({onAction}:{onAction:DemoAction}){
 const opts=[{name:'Convocazioni',Icon:CalendarDays,b:'2'},{name:'Pagamenti',Icon:CreditCard},{name:'Documenti',Icon:FileText},{name:'Messaggi',Icon:Mail,b:'1'},{name:'Diario',Icon:Bus},{name:'Il mio Profilo',Icon:UserRound}];
 return <div className="scd6-actiongrid">{opts.map(o=><button key={o.name} type="button" onClick={()=>onAction(o.name)}><o.Icon size={28} strokeWidth={2.2}/><strong>{o.name}</strong>{o.b&&<i>{o.b}</i>}</button>)}</div>;
}
function AthleteScreen({onAction,onNotice,onSelect}:{onAction:DemoAction;onNotice:()=>void;onSelect:(x:Screen)=>void}){
 return <><Top title="Area Atleta" onAction={onAction} onNotice={onNotice}/><div className="scd6-page scd6-personpage">
  <ProfileTabs screen="athlete" onSelect={onSelect}/>
  <div className="scd6-athlete-banner"><div className="scd6-avatar">LR</div><div className="scd6-athlete-copy"><strong>Luca Rossi</strong><span>Under 15</span><small>Centrocampista</small><b><CheckCircle2 size={15}/> Tesserato</b></div><strong className="scd6-athletenumber">10</strong></div>
  <ActionGrid onAction={onAction}/>
  <div className="scd6-minor-header"><h2>Prossima convocazione</h2><button type="button" onClick={()=>onAction('Convocazioni')}>Vedi tutti <ChevronRight size={15}/></button></div>
  <button className="scd6-called" type="button" onClick={()=>onAction('Dettaglio convocazione')}>
   <div className="scd6-called-date"><small>DOM</small><strong>10</strong><span>NOV</span><b>15:30</b></div><Crest size="small"/><div><strong>ColicoDerviese U15</strong><small>Stadio Comunale · Colico</small><span><CheckCircle2 size={14}/> CONVOCATO</span></div><span className="scd6-called-away">U15</span>
  </button>
  <div className="scd6-minor-header"><h2>I miei documenti</h2><button type="button" onClick={()=>onAction('Documenti')}>Vedi tutti <ChevronRight size={15}/></button></div>
  <div className="scd6-doclist">{[['Certificato medico','Valido fino al 30/06/2026'],['Tesseramento FIGC','Stagione 2025/2026'],['Documento identità','Caricato il 12/06/2024']].map(v=><button type="button" key={v[0]} onClick={()=>onAction(v[0] ?? 'Documento')}><FileText size={25}/><div><strong>{v[0]}</strong><small>{v[1]}</small></div><CheckCircle2 size={23}/></button>)}</div>
 </div></>;
}
function CircularProgress(){return <div className="scd6-progress-circle"><strong>70%</strong></div>;}
function FamilyScreen({onAction,onNotice,onSelect}:{onAction:DemoAction;onNotice:()=>void;onSelect:(x:Screen)=>void}){
 return <><Top title="Area Riservata" onNotice={onNotice} onAction={onAction}/><div className="scd6-page scd6-personpage scd6-family">
  <ProfileTabs screen="family" onSelect={onSelect}/>
  <div className="scd6-minor-header"><h2>I nostri figli</h2><button onClick={()=>onAction('Gestione figli')}>Gestisci <ChevronRight size={16}/></button></div>
  <div className="scd6-kids">
   <button type="button" onClick={()=>onAction('Profilo Luca')}><span className="scd6-kidportrait boy">L</span><strong>Luca</strong><small>Under 15</small></button>
   <button type="button" onClick={()=>onAction('Profilo Emma')}><span className="scd6-kidportrait girl">E</span><strong>Emma</strong><small>Under 12</small></button>
   <button type="button" onClick={()=>onAction('Aggiungi atleta')}><span className="scd6-kidportrait add"><Plus size={39}/></span><strong>Aggiungi</strong><small>atleta</small></button>
  </div>
  <div className="scd6-minor-header"><h2>Stato pagamenti</h2><button type="button" onClick={()=>onAction('Dettaglio quote')}>Vedi dettagli <ChevronRight size={15}/></button></div>
  <div className="scd6-payments"><CircularProgress/><div><strong>Quote stagione 2024/2025</strong><p>3 di 4 rate versate</p><button type="button" onClick={()=>onAction('Pagamento quote')}>Paga ora</button></div></div>
  <div className="scd6-familytiles">{[{title:'Certificato medico',sub:'Valido fino al 30/05/2026',Icon:FileText,t:'green'},{title:'Kit e abbigliamento',sub:'Completato',Icon:Shirt,t:'blue'},{title:'Tesseramento FIGC',sub:'Stagione 2025/26',Icon:ClipboardCheck,t:'blue'}].map(o=><button type="button" key={o.title} onClick={()=>onAction(o.title)}><o.Icon className={'scd6-icon-'+o.t} size={30}/><strong>{o.title}</strong><small>{o.sub}</small></button>)}</div>
  <div className="scd6-minor-header"><h2>Prossimi impegni dei figli</h2><button onClick={()=>onAction('Impegni familiari')}>Vedi tutti <ChevronRight size={15}/></button></div>
  <div className="scd6-family-schedule"><button type="button" onClick={()=>onAction('Allenamento Under 14')}><i className="yellow"/><TrafficCone size={31}/><div><small>Lun 11 Nov · 17:30</small><strong>Allenamento Under 14</strong><span>Centro Sportivo · Colico</span></div><ChevronRight size={16}/></button><button type="button" onClick={()=>onAction('Gara Under 15')}><i className="blue"/><Volleyball size={31}/><div><small>Dom 10 Nov · 15:30</small><strong>ColicoDerviese U15 vs Bellagina</strong><span>Stadio Comunale · Colico</span></div><ChevronRight size={16}/></button></div>
 </div></>;
}
function StaffScreen({onAction,onNotice}:{onAction:DemoAction;onNotice:()=>void}){
 const stats=[{n:'12',text:'Squadre',Icon:Users,c:'blue'},{n:'256',text:'Atleti',Icon:Users,c:'green'},{n:'28',text:'Staff',Icon:UserRound,c:'yellow'},{n:'94',text:'Documenti',Icon:FileText,c:'blue'}];
 const actions=[{n:'Convocazioni e presenze',Icon:CalendarDays,b:'3'},{n:'Comunicazioni',Icon:Megaphone,b:'3'},{n:'Persone e staff',Icon:Users},{n:'Documenti e scadenze',Icon:ClipboardList,b:'1'}];
 return <><div className="scd6-staffhero"><Top brand settings onNotice={onNotice} onAction={onAction}/><img src="/assets/sky-mascotte-ufficiale.png" alt="Sky mascotte originale"/><div><h1>Area Staff</h1><p>Statistiche, squadre, atleti<br/>e gestione del club.</p></div></div><div className="scd6-page scd6-staff">
  <div className="scd6-statsrow">{stats.map(s=><button type="button" key={s.text} onClick={()=>onAction(s.text)}><s.Icon className={'scd6-icon-'+s.c} size={25}/><b>{s.n}</b><strong>{s.text}</strong></button>)}</div>
  <div className="scd6-staffactions">{actions.map(a=><button type="button" key={a.n} onClick={()=>onAction(a.n)}><a.Icon size={29}/><strong>{a.n}</strong>{a.b&&<i>{a.b}</i>}</button>)}</div>
  <Bar text="Prossime attività di oggi" other="Vedi calendario" onClick={()=>onAction('Calendario staff')}/>
  <div className="scd6-staffagenda">{[
  {date:'17:00',until:'18:30',name:'Allenamento Under 14',tag:'Under 14',c:'blue'},
  {date:'19:00',until:'19:30',name:'Allenamento Juniores',tag:'Juniores',c:'yellow'},
  {date:'20:45',until:'20:30',name:'Allenamento Prima Squadra',tag:'Prima Squadra',c:'green'},
  ].map(a=><button type="button" onClick={()=>onAction(a.name)} key={a.name} className={'scd6-mark-'+a.c}><span>{a.date}<small>{a.until}</small></span><TrafficCone size={25}/><div><strong>{a.name}</strong><small>Centro Sportivo · Colico</small></div><i>{a.tag}</i></button>)}</div>
  <Bar text="Andamento squadre" other="Vedi tutti" onClick={()=>onAction('Statistiche squadre')}/>
  <div className="scd6-trends">{[['U15','3V 1N 1P'],['U17','4V 0N 1P'],['Juniores','2V 2N 1P'],['Prima Squadra','4V 1N 0P']].map((a,i)=><button type="button" onClick={()=>onAction('Andamento '+a[0])} key={a[0]}><strong>{a[0]}</strong><TrendingUp size={33} className={i===2?'scd6-icon-yellow':'scd6-icon-green'}/><span>{a[1]}</span></button>)}</div>
 </div></>;
}
function CommunicationsScreen({onAction,onNotice}:{onAction:DemoAction;onNotice:()=>void}){
 const [tab,setTab]=useState('Club');
 return <><div className="scd6-comm-header"><Top brand onNotice={onNotice} onAction={onAction}/><h1>Comunicazioni</h1><p>Tutte le notizie, gli aggiornamenti<br/>e i contenuti del club.</p></div><div className="scd6-page scd6-communications">
  <div className="scd6-tabs scd6-comm-tabs">{['Club','Squadre','Social'].map(s=><button type="button" onClick={()=>setTab(s)} aria-pressed={tab===s} className={tab===s?'selected':''} key={s}>{s}</button>)}</div>
  {tab==='Club'&&<><button type="button" className="scd6-alert" onClick={()=>onAction('Sospensione attività di allenamento')}><span>IMPORTANTE</span><Megaphone size={35}/><div><strong>Sospensione attività di allenamento</strong><p>Per condizioni meteo avverse, tutti gli allenamenti di oggi sono sospesi.</p><small>Oggi, 12 Apr ore 12:30 · Dato dimostrativo</small></div></button>
   <div className="scd6-comm-list">{[
   ['Riunione genitori Settore Giovanile','Dom 14 Apr · Sede del club',ClipboardList],
   ['Nuovo calendario partite disponibile','Online il calendario aprile/maggio',CalendarDays],
   ['Aggiornamento organizzazione pulmini','Nuovi orari per le trasferte di sabato',Users],
   ['Consegna documenti figura sanitaria','Scadenze e modalità di invio',FileText]
   ].map((e,i)=>{const Icon=e[2] as typeof CalendarDays;return <button type="button" key={i} onClick={()=>onAction(e[0] as string)}><Icon size={25}/><div><strong>{e[0] as string}</strong><small>{e[1] as string}</small></div><ChevronRight size={20}/></button>;})}</div></>}
   {tab!=='Club'&&<div className="scd6-other-tab"><Megaphone size={30}/><strong>{tab} · contenuti del club</strong><p>Questa sezione potrà mostrare soltanto contenuti verificati e autorizzati.</p></div>}
   <div className="scd6-minor-header"><h2>Social Hub</h2><button type="button" onClick={()=>onAction('Post social')}>Vedi tutti i post <ChevronRight size={15}/></button></div>
   <div className="scd6-socials">{[{label:'Instagram',n:'1.248',Icon:Instagram,c:'ig'},{label:'Facebook',n:'2.310',Icon:Facebook,c:'fb'},{label:'YouTube',n:'620',Icon:Youtube,c:'yt'}].map((e,i)=><button type="button" onClick={()=>onAction(e.label)} key={e.label}><span className={'scd6-socialicon '+e.c}><e.Icon size={30}/></span><span><strong>{e.n}</strong><small>follower</small><em>+{i===0?'12':i===1?'9':'15'}%</em></span></button>)}</div>
   <div className="scd6-social-actions"><button type="button" onClick={()=>onAction('Crea post')}><PenLine size={21}/> Crea post</button><button type="button" onClick={()=>onAction('Rassegna media')}><Newspaper size={20}/> Rassegna media</button></div>
  </div></>;
}
export function SCDFidelitySix({onOpenGallery}:{onOpenGallery?:()=>void}){
 const [screen,setScreen]=useState<Screen>('home');
 useEffect(()=>{const q=new URLSearchParams(window.location.search).get('screen');if(allScreens.some(s=>s.id===q))setScreen(q as Screen);},[]);
 const [dialog,setDialog]=useState<string|null>(null);
 const to=(s:Screen)=>{setScreen(s);if(typeof window!=='undefined'){const u=new URL(window.location.href);u.searchParams.set('screen',s);window.history.replaceState(null,'',u.toString());}};
 const onAction=(name:string)=>setDialog(name);
 return <div className="scd6-stage" data-testid="scd-six-app">
  <div className="scd6-stage-toolbar"><div><Crest size="small"/><strong>SCD · TAVOLE ORIGINALI IN SOFTWARE</strong><span>ANTEPRIMA DI SVILUPPO ISOLATA</span></div><div className="scd6-screen-picker" role="group" aria-label="Scegli schermata da controllare">{allScreens.map(x=><button key={x.id} className={screen===x.id?'selected':''} type="button" onClick={()=>to(x.id)} data-testid={'pick-'+x.id}>{x.title}</button>)}</div></div>
  <div className="scd6-stage-content">
   <div className="scd6-phone" data-testid="phone"><div className="scd6-phone-screen">
    {screen==='home'&&<HomeScreen to={to} onAction={onAction} onNotice={()=>to('communications')}/>}
    {screen==='calendar'&&<CalendarScreen onAction={onAction} onNotice={()=>to('communications')}/>}
    {screen==='athlete'&&<AthleteScreen onAction={onAction} onNotice={()=>to('communications')} onSelect={to}/>}
    {screen==='family'&&<FamilyScreen onAction={onAction} onNotice={()=>to('communications')} onSelect={to}/>}
    {screen==='staff'&&<StaffScreen onAction={onAction} onNotice={()=>to('communications')}/>}
    {screen==='communications'&&<CommunicationsScreen onAction={onAction} onNotice={()=>to('communications')}/>}
    <Nav active={screen} onSelect={to}/>
   </div></div>
   <div className="scd6-screen-meta"><span className="scd6-meta-app">{allScreens.find(x=>x.id===screen)?.app}</span><strong>{allScreens.find(x=>x.id===screen)?.title}</strong><p>Da tavola originale SCD 2026/27. Navigazione e componenti React; informazioni di esempio non collegate ai dati reali.</p>{onOpenGallery&&<button onClick={onOpenGallery} type="button">Archivio visual precedente <ArrowRight size={14}/></button>}</div>
  </div>
  <div className="scd6-demofoot">SCD · ANTEPRIMA GRAFICA · DATI DIMOSTRATIVI · NON PUBBLICATA</div>
  <Dialog.Root open={dialog!==null} onOpenChange={open=>{if(!open)setDialog(null);}}><Dialog.Portal><Dialog.Overlay className="scd6-overlay"/><Dialog.Content className="scd6-modal">
    <Dialog.Close className="scd6-modal-close" aria-label="Chiudi"><X size={23}/></Dialog.Close>
    <Crest size="small"/><Dialog.Title>{dialog??'Dettaglio'}</Dialog.Title>
    <Dialog.Description>Questa schermata grafica è interattiva. I dati ufficiali e le funzionalità riservate verranno collegati soltanto ai servizi SCD esistenti, con autorizzazioni effettive. Nessun dato personale reale è presente nella demo.</Dialog.Description>
    <Dialog.Close asChild><button type="button" className="scd6-modal-confirm"><CheckCircle2 size={18}/> Chiudi dettaglio</button></Dialog.Close>
  </Dialog.Content></Dialog.Portal></Dialog.Root>
 </div>;
}
