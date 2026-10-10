import { useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  ArrowRight, Bell, CalendarDays, CalendarRange, Check, ChevronLeft, ChevronRight,
  CircleHelp, ClipboardList, House, LockKeyhole, MapPin, Megaphone, MessageCircle,
  Search, ShieldCheck, Shirt, TrafficCone, Trophy, UserRound, UsersRound, Volleyball, X
} from 'lucide-react';
import logo from '@/assets/logo-scd.png.asset.json';
import { OfficialAsset } from './OfficialAsset';
import './scd-one-home.css';

type Area = 'home'|'calendar'|'teams'|'events'|'profile'|'communications'|'partners'|'territory';
type Activity = 'Gare'|'Allenamenti'|'Eventi'|'Iniziative';
const skyImage='/assets/sky-mascotte-ufficiale.png';
const nav = [
  {id:'home',label:'Home',Icon:House},
  {id:'calendar',label:'Calendario',Icon:CalendarDays},
  {id:'teams',label:'Squadre',Icon:UsersRound},
  {id:'events',label:'Eventi',Icon:CalendarRange},
  {id:'profile',label:'Profilo',Icon:UserRound},
] as const;
const quick = [
  {id:'Gare',Icon:Volleyball,tone:'blue'},
  {id:'Allenamenti',Icon:TrafficCone,tone:'orange'},
  {id:'Eventi',Icon:CalendarDays,tone:'navy'},
  {id:'Iniziative',Icon:UsersRound,tone:'green'},
] as const;

function weekText(offset:number) {
  const now=new Date();
  const monday=new Date(now);
  monday.setHours(12,0,0,0);
  monday.setDate(now.getDate()-(now.getDay()+6)%7+offset*7);
  const sunday=new Date(monday);
  sunday.setDate(monday.getDate()+6);
  const format=new Intl.DateTimeFormat('it-IT',{day:'numeric',month:'short',year:'numeric'});
  return format.format(monday)+' – '+format.format(sunday);
}
function Nav({current,go,mobile=false}:{current:Area;go:(a:Area)=>void;mobile?:boolean}) {
  return <nav className={mobile?'scd-f-nav scd-f-nav-mobile':'scd-f-nav scd-f-nav-desktop'} aria-label={mobile?'Navigazione mobile':'Navigazione SCD ONE'}>
    {nav.map(({id,label,Icon})=><button key={id} type="button" data-testid={(mobile?'mobile-nav-':'nav-')+id}
      aria-current={current===id?'page':undefined} onClick={()=>go(id)} className={current===id?'current':''}>
      <Icon size={20} strokeWidth={current===id?2.8:1.9}/><span>{label}</span>
    </button>)}
  </nav>;
}
function Brand({go,notify}:{go:()=>void;notify:()=>void}) {
  return <div className="scd-f-brandrow">
    <button type="button" className="scd-f-brand" aria-label="Home S.C.D. Colicoderviese" onClick={go}>
      <OfficialAsset src={logo.url} alt="Stemma ufficiale della S.C.D. Colicoderviese"/>
      <span><small>S.C.D.</small><strong>COLICO<span>DERVIESE</span></strong><i/></span>
    </button>
    <button type="button" className="scd-f-notify" onClick={notify} aria-label="Apri le comunicazioni">
      <Bell size={24} strokeWidth={2.3}/><span aria-hidden="true"/>
    </button>
  </div>;
}
function HomeCover({go,sky,notify}:{go:(a:Area)=>void;sky:()=>void;notify:()=>void}) {
  return <section className="scd-f-cover" aria-label="Home pubblica SCD">
    <Brand go={()=>go('home')} notify={notify}/>
    <div className="scd-f-landscape" aria-hidden="true"/>
    <button type="button" className="scd-f-sky" data-testid="sky-open" onClick={sky} aria-label="Apri Sky, mascotte ufficiale della SCD">
      <img data-testid="sky-original" src={skyImage} alt="Sky, mascotte ufficiale originale SCD"/>
    </button>
    <div className="scd-f-headline"><h1>Questa settimana</h1><p>Sport, crescita e comunità<br/>nel cuore dell'Alto Lario.</p></div>
  </section>;
}
function QuickAccess({selection,onSelect}:{selection:Activity|null;onSelect:(a:Activity)=>void}) {
  return <section className="scd-f-quick" aria-label="Accessi rapidi">
    <div className="scd-f-quickgrid">
      {quick.map(({id,Icon,tone})=><button type="button" key={id} onClick={()=>onSelect(id)} data-testid={'quick-'+id.toLowerCase()}
        aria-pressed={selection===id} className={'scd-f-quickitem tone-'+tone+(selection===id?' selected':'')}>
        <Icon size={32} strokeWidth={2.4}/><span>{id}</span>
      </button>)}
    </div>
    {selection!==null && <div role="status" data-testid="activity-panel" className="scd-f-quick-feedback">
      <strong>{selection} · In aggiornamento</strong>
      <span>Le informazioni ufficiali saranno visibili quando collegate e verificate.</span>
      <button type="button" aria-label="Chiudi filtro" onClick={()=>onSelect(selection)}><X size={15}/></button>
    </div>}
  </section>;
}
function MatchPreview({openCalendar}:{openCalendar:()=>void}) {
  return <section className="scd-f-match" aria-label="Prossima gara">
    <div className="scd-f-match-heading">
      <div className="scd-f-match-ribbon"><Trophy size={17}/><strong>PROSSIMA GARA</strong></div>
      <button type="button" onClick={openCalendar}>Vedi tutti <ChevronRight size={16}/></button>
    </div>
    <div className="scd-f-match-inner">
      <div className="scd-f-date"><span>DATA</span><strong>DA<br/>DEFINIRE</strong><small>ORA DA CONFERMARE</small></div>
      <div className="scd-f-club"><OfficialAsset src={logo.url} alt="Stemma SCD"/><b>ColicoDerviese</b><small>Categoria da verificare</small></div>
      <span className="scd-f-vs">VS</span>
      <div className="scd-f-club"><div className="scd-f-opponent" aria-label="Stemma avversario non disponibile"><CircleHelp size={27}/></div><b>Avversario</b><small>Da confermare</small></div>
    </div>
    <div className="scd-f-venue"><MapPin size={15}/><span>Campo, data e orario in attesa di fonte ufficiale</span></div>
  </section>;
}
function Promos({go}:{go:(a:Area)=>void}) {
  return <section className="scd-f-promos" aria-label="Allenamenti e iniziative">
    <button type="button" onClick={()=>go('calendar')} className="scd-f-promo">
      <span className="scd-f-promo-icon scd-f-green"><TrafficCone size={34}/></span>
      <span><strong>Allenamenti</strong><small>Orari e attività<br/>per tutte le categorie</small></span>
    </button>
    <button type="button" onClick={()=>go('events')} className="scd-f-promo">
      <span className="scd-f-promo-icon scd-f-gold"><UsersRound size={34}/></span>
      <span><strong>Open Day</strong><small>Scopri le iniziative<br/>per i nuovi atleti</small></span>
    </button>
  </section>;
}
function SponsorStrip({go}:{go:()=>void}) {
  return <section className="scd-f-sponsors" aria-label="I nostri sponsor">
    <div className="scd-f-bluebar"><h2>I nostri sponsor</h2><button onClick={go} type="button">Vedi tutti <ChevronRight size={16}/></button></div>
    <div className="scd-f-sponsorlist">{['01','02','03'].map(x=><div key={x} className="scd-f-sponsor-slot"><span className="scd-f-sponsor-badge">SCD</span><small>Partner da confermare</small></div>)}</div>
  </section>;
}
function Territory({go}:{go:()=>void}) {
  return <section className="scd-f-territory" aria-label="Mondo Colico">
    <h2>Mondo Colico</h2>
    <div className="scd-f-territorycard">
      <div className="scd-f-territoryphoto" role="img" aria-label="Panorama del territorio dell'Alto Lario"/>
      <div className="scd-f-territorytext"><strong>Mondo Colico</strong><p>Notizie, storie, eventi e territorio sempre con noi.</p>
        <button type="button" onClick={go}>Scopri <ArrowRight size={15}/></button>
      </div>
    </div>
  </section>;
}
function EmptyArea({area,go,week,nextWeek}:{area:Area;go:(a:Area)=>void;week:string;nextWeek:(v:number)=>void}) {
 const title:Record<Area,string>={home:'Home',calendar:'Calendario',teams:'Squadre',events:'Eventi',profile:'Il mio profilo',communications:'Comunicazioni',partners:'Sponsor del club',territory:'Mondo Colico'};
 return <main className="scd-f-subpage">
   <div className="scd-f-pageheading"><h1>{title[area]}</h1><span>STAGIONE 2026/27</span></div>
   {area==='calendar'&&<>
     <div className="scd-f-tabs"><button className="current">Settimana</button><button onClick={()=>nextWeek(0)}>Mese</button><button onClick={()=>nextWeek(0)}>Squadra</button></div>
     <div className="scd-f-week-nav"><button aria-label="Settimana precedente" onClick={()=>nextWeek(-1)}><ChevronLeft size={20}/></button>
       <span data-testid="week-label"><CalendarDays size={17}/> {week}</span><button aria-label="Settimana successiva" onClick={()=>nextWeek(1)}><ChevronRight size={20}/></button></div>
   </>}
   <div className="scd-f-emptyarea" role="status"><CalendarRange size={33}/><strong>Informazioni in aggiornamento</strong><p>Nessun dato viene pubblicato senza una fonte ufficiale e verificata.</p></div>
   <button type="button" className="scd-f-back" onClick={()=>go('home')}><ChevronLeft size={18}/> Torna alla Home</button>
 </main>;
}
export function SCDOneExperience({onOpenGallery}:{onOpenGallery:()=>void}) {
 const [area,setArea]=useState<Area>('home');
 const [activity,setActivity]=useState<Activity|null>(null);
 const [skyOpen,setSkyOpen]=useState(false);
 const [notifyOpen,setNotifyOpen]=useState(false);
 const [weekOffset,setWeekOffset]=useState(0);
 const week=useMemo(()=>weekText(weekOffset),[weekOffset]);
 const go=(a:Area)=>{setArea(a);setActivity(null);window.scrollTo?.({top:0,behavior:'instant'});};
 const changeActivity=(a:Activity)=>setActivity(prev=>prev===a?null:a);
 return <div className="scd-fidelity" data-testid="scd-one-app">
  <a className="scd-f-skip" href="#scd-f-content">Vai ai contenuti</a>
  <div className="scd-f-layout">
    {area==='home'?<>
      <HomeCover go={go} sky={()=>setSkyOpen(true)} notify={()=>setNotifyOpen(true)}/>
      <main className="scd-f-content" id="scd-f-content">
        <QuickAccess selection={activity} onSelect={changeActivity}/>
        <div className="scd-f-primary-grid"><MatchPreview openCalendar={()=>go('calendar')}/><Promos go={go}/></div>
        <div className="scd-f-secondary-grid"><SponsorStrip go={()=>go('partners')}/><Territory go={()=>go('territory')}/></div>
      </main>
    </>:<>
      <div className="scd-f-subheader"><Brand go={()=>go('home')} notify={()=>setNotifyOpen(true)}/></div>
      <EmptyArea area={area} go={go} week={week} nextWeek={n=>setWeekOffset(n===0?0:prev=>prev+n)}/>
    </>}
    <div className="scd-f-devnote"><ShieldCheck size={12}/> ANTEPRIMA GRAFICA · DATI DIMOSTRATIVI <button type="button" onClick={onOpenGallery}>Confronto sei schermate</button></div>
    <Nav mobile current={area} go={go}/>
    <Nav current={area} go={go}/>
  </div>
  <Dialog.Root open={skyOpen} onOpenChange={setSkyOpen}>
    <Dialog.Portal><Dialog.Overlay className="scd-f-overlay"/><Dialog.Content className="scd-f-modal">
      <Dialog.Close className="scd-f-modal-x" aria-label="Chiudi Sky"><X size={18}/></Dialog.Close>
      <img src={skyImage} alt="Sky originale SCD"/><div><Dialog.Title>Ciao, sono Sky!</Dialog.Title>
       <Dialog.Description>La mascotte è originale. L'assistente digitale non è collegato in questa anteprima grafica.</Dialog.Description>
       <button type="button" onClick={()=>setSkyOpen(false)}><Check size={18}/> Ho capito</button></div>
    </Dialog.Content></Dialog.Portal>
  </Dialog.Root>
  <Dialog.Root open={notifyOpen} onOpenChange={setNotifyOpen}><Dialog.Portal>
    <Dialog.Overlay className="scd-f-overlay"/><Dialog.Content className="scd-f-modal scd-f-modal-notice">
      <Dialog.Close className="scd-f-modal-x" aria-label="Chiudi comunicazioni"><X size={18}/></Dialog.Close>
      <Megaphone size={42}/><div><Dialog.Title>Comunicazioni SCD</Dialog.Title><Dialog.Description>Le comunicazioni ufficiali verranno visualizzate soltanto dopo il collegamento alle fonti autorizzate.</Dialog.Description>
      <button type="button" onClick={()=>{setNotifyOpen(false);go('communications');}}>Apri comunicazioni <ArrowRight size={16}/></button></div>
    </Dialog.Content>
  </Dialog.Portal></Dialog.Root>
 </div>;
}
