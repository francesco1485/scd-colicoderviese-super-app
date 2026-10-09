import { useMemo, useState, type FormEvent } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  ArrowRight, ArrowUpRight, Bell, CalendarDays, CalendarRange, Check,
  ChevronLeft, ChevronRight, CircleHelp, Clock3, Compass, FileText, Flag,
  House, LockKeyhole, MapPin, Megaphone, Menu, MessageCircle, Mountain,
  Search, ShieldCheck, Shirt, Ticket, Trophy, UsersRound, Volleyball, X,
} from 'lucide-react';
import logo from '@/assets/logo-scd.png.asset.json';
import { OfficialAsset } from './OfficialAsset';
import './scd-one-home.css';

type PublicArea = 'home' | 'calendar' | 'teams' | 'events' | 'communications';
type Activity = 'Gare' | 'Allenamenti' | 'Eventi' | 'Iniziative';
const publicNav: { id: PublicArea; text: string; Icon: typeof House }[] = [
  { id: 'home', text: 'Home', Icon: House },
  { id: 'calendar', text: 'Calendario', Icon: CalendarDays },
  { id: 'teams', text: 'Squadre', Icon: Shirt },
  { id: 'events', text: 'Eventi', Icon: Ticket },
  { id: 'communications', text: 'Notizie', Icon: Megaphone },
];
const quickActions: { id: Activity; Icon: typeof House; description: string }[] = [
  { id: 'Gare', Icon: Volleyball, description: 'Campionati e partite' },
  { id: 'Allenamenti', Icon: Flag, description: 'Attività sul campo' },
  { id: 'Eventi', Icon: CalendarRange, description: 'Incontri e tornei' },
  { id: 'Iniziative', Icon: UsersRound, description: 'Club e comunità' },
];
const emptyMessages: Record<Activity, string> = {
  Gare: 'Il calendario ufficiale delle gare non è ancora collegato a questa anteprima.',
  Allenamenti: 'Le attività sportive non sono ancora collegate a questa anteprima.',
  Eventi: 'Il registro degli eventi non è ancora collegato a questa anteprima.',
  Iniziative: 'Le iniziative della comunità non sono ancora collegate a questa anteprima.',
};
const SKY_SRC = '/assets/sky-mascotte-ufficiale.png';

function getWeekLabel(shift: number) {
  const today = new Date();
  const monday = new Date(today);
  monday.setHours(12, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) + shift * 7);
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const short = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', timeZone: 'Europe/Rome' });
  const year = new Intl.DateTimeFormat('it-IT', { year: 'numeric', timeZone: 'Europe/Rome' }).format(sunday);
  return `${short.format(monday)} – ${short.format(sunday)} ${year}`;
}
function Status({ label = 'DATO_IN_AGGIORNAMENTO' }: { label?: string }) {
  return <span className="scd-one-status"><span aria-hidden="true" className="scd-one-status-dot"/>{label}</span>;
}
function NavButton({ id, text, Icon, selected, onSelect, testid }: {
  id: PublicArea; text: string; Icon: typeof House; selected: boolean;
  onSelect: (id: PublicArea) => void; testid?: string;
}) {
  return <button type="button" data-testid={testid || `nav-${id}`} aria-current={selected ? 'page' : undefined}
    className={`scd-one-navbtn ${selected ? 'active' : ''}`} onClick={() => onSelect(id)}>
    <Icon size={20} strokeWidth={selected ? 2.8 : 2} aria-hidden="true"/><span>{text}</span>
  </button>;
}
export function SCDOneExperience({ onOpenGallery }: { onOpenGallery: () => void }) {
  const [area, setArea] = useState<PublicArea>('home');
  const [activity, setActivity] = useState<Activity>('Gare');
  const [weekShift, setWeekShift] = useState(0);
  const [skyOpen, setSkyOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [searchNotice, setSearchNotice] = useState('');
  const [territoryOpen, setTerritoryOpen] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const weekLabel = useMemo(() => getWeekLabel(weekShift), [weekShift]);
  const selectArea = (next: PublicArea) => { setArea(next); setMobileMenu(false); setSearchNotice(''); };
  const searchSubmit = (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const value = search.trim();
    setSearchNotice(value ? `Ricerca per “${value}”: servizio non collegato al laboratorio visivo.` : 'Inserisci un termine da cercare.');
  };
  const currentTitle: Record<PublicArea, string> = {
    home: 'Questa settimana', calendar: 'Calendario Live',
    teams: 'Le nostre squadre', events: 'Eventi e tornei', communications: 'La voce del club',
  };
  const categoryText: Record<PublicArea, string> = {
    home: '', calendar: 'Gare, allenamenti, trasferte e iniziative in un unico calendario autorizzato.',
    teams: 'Tutte le squadre del club, per categoria e stagione.',
    events: 'Le iniziative che uniscono sport, famiglie e territorio.',
    communications: 'Notizie, aggiornamenti e comunicazioni ufficiali.',
  };
  return <div className="scd-one" data-testid="scd-one-app">
    <a className="scd-one-skip" href="#scd-one-main">Vai al contenuto</a>
    <div className="scd-one-stage"><span><ShieldCheck size={13}/> SCD ONE · VISION 2026/27</span><span>LABORATORIO NON PUBBLICATO · DATI NON COLLEGATI</span></div>
    <header className="scd-one-header">
      <div className="scd-one-header-inner">
        <button className="scd-one-brand" type="button" onClick={() => selectArea('home')} aria-label="SCD ColicoDerviese, torna alla Home">
          <OfficialAsset src={logo.url} alt="Stemma ufficiale SCD ColicoDerviese"/>
          <span className="scd-one-brand-text"><small>S.C.D.</small><strong>COLICO<span>DERVIESE</span></strong><em>SPORT · PERSONE · TERRITORIO</em></span>
        </button>
        <nav className="scd-one-desktop-nav" aria-label="Navigazione SCD ONE">
          {publicNav.map(x => <NavButton key={x.id} {...x} selected={area === x.id} onSelect={selectArea}/>)}
        </nav>
        <div className="scd-one-header-actions">
          <button type="button" className="scd-one-header-search" onClick={() => document.getElementById('scd-one-search')?.focus()} aria-label="Cerca nel club"><Search size={20}/></button>
          <button type="button" className="scd-one-bell" onClick={() => selectArea('communications')} aria-label="Vai alle comunicazioni"><Bell size={20}/><span/></button>
          <button type="button" className="scd-one-login" onClick={() => setSkyOpen(true)}><LockKeyhole size={16}/> Area personale</button>
          <button type="button" className="scd-one-menu" aria-expanded={mobileMenu} aria-label="Apri menu" onClick={() => setMobileMenu(v => !v)}>{mobileMenu ? <X size={22}/> : <Menu size={22}/>}</button>
        </div>
      </div>
      {mobileMenu && <nav className="scd-one-mobile-drawer" aria-label="Menu di navigazione">{publicNav.map(x => <NavButton key={x.id} {...x} selected={area === x.id} onSelect={selectArea}/>)}</nav>}
    </header>
    <main id="scd-one-main" className="scd-one-main">
      <div className="scd-one-toolbar">
        <div className="scd-one-toolbar-kicker"><span className="scd-one-live-dot" aria-hidden="true"/> STAGIONE 2026/27 <span className="scd-one-mid-dot">·</span> COLICO & DERVIO</div>
        <form onSubmit={searchSubmit} className="scd-one-search" role="search">
          <Search size={18} aria-hidden="true"/><input id="scd-one-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca squadre, gare, notizie..." aria-label="Cerca nell'universo SCD"/>
          <button type="submit">Cerca <ArrowRight size={15}/></button>
        </form>
      </div>
      {searchNotice && <div role="status" className="scd-one-search-notice">{searchNotice}<button type="button" onClick={() => setSearchNotice('')} aria-label="Chiudi avviso ricerca"><X size={16}/></button></div>}
      {area === 'home' ? <>
        <section className="scd-one-home-head" aria-label="Questa settimana alla SCD">
          <div className="scd-one-hero">
            <span className="scd-one-hero-stroke" aria-hidden="true"/>
            <div className="scd-one-hero-copy">
              <span className="scd-one-eyebrow"><span aria-hidden="true"/> IL CLUB SI VIVE, OGNI GIORNO</span>
              <h1>Questa<br/><mark>settimana.</mark></h1>
              <p>Sport, crescita e comunità<br/>nel cuore dell'Alto Lario.</p>
              <button type="button" onClick={() => selectArea('calendar')} className="scd-one-hero-cta">Esplora il calendario <ArrowRight size={19}/></button>
            </div>
            <button type="button" data-testid="sky-open" className="scd-one-sky-hero" onClick={() => setSkyOpen(true)} aria-label="Apri Sky, mascotte ufficiale SCD">
              <img data-testid="sky-original" src={SKY_SRC} alt="Sky, mascotte ufficiale originale SCD ColicoDerviese"/>
              <span className="scd-one-sky-bubble"><MessageCircle size={16}/> Ciao, sono Sky!</span>
            </button>
            <div className="scd-one-hero-location"><MapPin size={14}/> COLICO · DERVIO · ALTO LARIO</div>
          </div>
          <aside className="scd-one-match" aria-label="Prossima gara">
            <div className="scd-one-match-title"><Trophy size={20}/><span>PROSSIMA GARA</span><ArrowUpRight size={18}/></div>
            <div className="scd-one-match-main">
              <div className="scd-one-match-ident"><OfficialAsset src={logo.url} alt="Stemma SCD"/><strong>COLICODERVIESE</strong></div>
              <span className="scd-one-match-vs">VS</span>
              <div className="scd-one-match-ident"><span className="scd-one-opponent-empty"><CircleHelp size={30}/></span><strong>DA CONFERMARE</strong></div>
            </div>
            <Status/>
            <p>Avversario, categoria, orario e campo saranno mostrati soltanto dopo una conferma ufficiale.</p>
            <button type="button" className="scd-one-match-link" onClick={() => selectArea('calendar')}>Apri il calendario <ArrowRight size={18}/></button>
          </aside>
        </section>
        <section className="scd-one-quick-section" aria-label="Servizi del club">
          <div className="scd-one-section-title"><div><span>IL TUO CLUB IN UN TOCCO</span><h2>Vivi la SCD.</h2></div><span className="scd-one-mini-subtitle">Dall'allenamento alla tribuna.</span></div>
          <div className="scd-one-quicklinks" role="group" aria-label="Seleziona tipo di attività">
            {quickActions.map(({id,Icon,description}) => <button type="button" key={id} data-testid={`quick-${id.toLowerCase()}`} aria-pressed={activity===id} onClick={() => setActivity(id)} className={`scd-one-quickcard ${activity===id ? 'selected' : ''}`}>
              <span className="scd-one-quickicon"><Icon size={27} strokeWidth={2.3}/></span><span><strong>{id}</strong><small>{description}</small></span><ArrowUpRight className="scd-one-quickarrow" size={16}/>
            </button>)}
          </div>
        </section>
        <div className="scd-one-content-grid">
          <section className="scd-one-week card" aria-label="Attività settimanali">
            <div className="scd-one-card-top">
              <div><span className="scd-one-card-kicker">AGENDA DEL CLUB</span><h2>La settimana SCD</h2></div>
              <button type="button" onClick={() => selectArea('calendar')} className="scd-one-text-link">Calendario <ArrowRight size={16}/></button>
            </div>
            <div className="scd-one-week-picker"><button type="button" aria-label="Settimana precedente" onClick={() => setWeekShift(x=>x-1)}><ChevronLeft size={20}/></button><span data-testid="week-label"><CalendarDays size={18}/>{weekLabel}</span><button type="button" aria-label="Settimana successiva" onClick={() => setWeekShift(x=>x+1)}><ChevronRight size={20}/></button></div>
            <div className="scd-one-activity-empty" data-testid="activity-panel" role="status"><span className="scd-one-empty-icon"><CalendarRange size={23}/></span><div><strong>{activity} · In aggiornamento</strong><p>{emptyMessages[activity]}</p></div></div>
            <div className="scd-one-week-bottom"><Status/><button type="button" onClick={() => {setWeekShift(0);setArea('calendar');}}>Tutti gli appuntamenti <ArrowRight size={17}/></button></div>
          </section>
          <section className="scd-one-stories card" aria-label="News e comunità">
            <div className="scd-one-card-top"><div><span className="scd-one-card-kicker">IL CLUB RACCONTA</span><h2>Notizie e comunità</h2></div><button type="button" onClick={() => selectArea('communications')} className="scd-one-text-link">Notizie <ArrowRight size={16}/></button></div>
            <div className="scd-one-story-body"><span><Megaphone size={26}/></span><div><strong>La voce della SCD</strong><p>Comunicazioni, novità e storie ufficiali arriveranno qui dopo la verifica della redazione.</p></div></div>
            <button type="button" onClick={() => selectArea('communications')} className="scd-one-story-link">Vai alle comunicazioni <ArrowRight size={17}/></button>
          </section>
        </div>
        <section className="scd-one-bottom-grid" aria-label="Territorio e partnership">
          <div className="scd-one-territory">
            <div className="scd-one-territory-photo" aria-hidden="true"><span>ALTO LARIO</span></div>
            <div className="scd-one-territory-copy"><span className="scd-one-card-kicker">MONDO COLICO</span><h2>Le nostre radici.<br/>Il nostro futuro.</h2><p>Colico, Dervio, il lago e le montagne: lo sport incontra il territorio.</p><button type="button" onClick={() => setTerritoryOpen(v => !v)} aria-expanded={territoryOpen} data-testid="territory-details">Scopri il territorio <ArrowRight size={17}/></button>{territoryOpen && <p role="status" className="scd-one-territory-detail">Una comunità sportiva tra lago e montagne. Nessun itinerario o evento viene pubblicato senza una fonte verificata.</p>}</div>
          </div>
          <div className="scd-one-sponsors card"><div><span className="scd-one-card-kicker">INSIEME SI CRESCE</span><h2>Partner del club</h2></div><div className="scd-one-sponsor-placeholder"><UsersRound size={25}/><div><strong>Partner in aggiornamento</strong><p>Pubblicheremo soltanto marchi e accordi autorizzati.</p></div></div><Status label="NESSUN LOGO NON VERIFICATO"/></div>
        </section>
      </> : <section className="scd-one-subpage" data-testid={`page-${area}`}>
        <div className="scd-one-subpage-hero"><span className="scd-one-eyebrow">SCD COLICODERVIESE · 2026/27</span><h1>{currentTitle[area]}</h1><p>{categoryText[area]}</p></div>
        <div className="scd-one-subpage-panel card">
          <div className="scd-one-card-top"><div><span className="scd-one-card-kicker">VERIFICA DELLE FONTI</span><h2>Dati in aggiornamento</h2></div><Status/></div>
          {area === 'calendar' && <div className="scd-one-week-picker"><button aria-label="Settimana precedente" onClick={()=>setWeekShift(x=>x-1)}><ChevronLeft size={18}/></button><span>{weekLabel}</span><button aria-label="Settimana successiva" onClick={()=>setWeekShift(x=>x+1)}><ChevronRight size={18}/></button></div>}
          <div className="scd-one-subpage-empty"><CalendarRange size={34}/><strong>Nessun contenuto ufficiale collegato</strong><p>La navigazione è attiva. Nessuna gara, squadra, notizia o attività viene inventata per riempire l'interfaccia.</p></div>
          <button type="button" className="scd-one-return" onClick={() => selectArea('home')}><ChevronLeft size={18}/> Torna alla Home</button>
        </div>
      </section>}
    </main>
    <footer className="scd-one-footer"><div><OfficialAsset src={logo.url} alt="Stemma SCD"/><span>S.C.D. COLICODERVIESE<br/><small>SPORT · PERSONE · TERRITORIO</small></span></div><span>Stagione 2026/27 · Demo visiva senza dati personali</span><button type="button" onClick={onOpenGallery}>Apri confronto delle sei schermate <ArrowRight size={17}/></button></footer>
    <nav className="scd-one-bottomnav" aria-label="Navigazione mobile SCD ONE">{publicNav.map(x=><NavButton key={x.id} {...x} selected={area===x.id} onSelect={selectArea} testid={`mobile-nav-${x.id}`}/>)}</nav>
    <Dialog.Root open={skyOpen} onOpenChange={setSkyOpen}><Dialog.Portal><Dialog.Overlay className="scd-one-dialog-overlay"/><Dialog.Content className="scd-one-dialog" aria-describedby="scd-one-sky-description"><img src={SKY_SRC} alt="Sky, mascotte ufficiale" /><div><span className="scd-one-card-kicker">SKY · ASSISTENTE DEL CLUB</span><Dialog.Title>Ciao! Sono Sky.</Dialog.Title><Dialog.Description id="scd-one-sky-description">L'assistente e l'accesso personale non sono collegati in questa demo. Non vengono elaborati dati o conversazioni.</Dialog.Description><Status label="DEMO_NON_COLLEGATA"/><Dialog.Close asChild><button type="button" className="scd-one-modal-close"><Check size={18}/> Ho capito</button></Dialog.Close></div><Dialog.Close className="scd-one-dialog-x" aria-label="Chiudi"><X size={20}/></Dialog.Close></Dialog.Content></Dialog.Portal></Dialog.Root>
  </div>;
}
