import { useState } from 'react';
import { ArrowUpRight, ArrowRight, Bell, CalendarDays, ChevronDown, ClipboardList, FileText, House, MapPin, Megaphone, ShieldCheck, Trophy, UserRound, UsersRound, Volleyball, Cone, ImageOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OfficialAsset } from './OfficialAsset';
import { type VisionScreen, type VisionScreenId, visionData, demo, HERO_PHOTO } from './screens';
import logo from '@/assets/brand/logo-scd.png.asset.json';

/** Sfondo territoriale: foto ufficiale repo (hero-colico.webp); fallback astratto se non caricata. */
export function TerritoryPlaceholder({ compact = false }: { compact?: boolean }) {
  return <div className={`vision-territory ${compact ? 'vision-territory-compact' : ''}`}>
    <div className="vision-mountain" aria-hidden="true" />
    <div className="vision-water" aria-hidden="true" />
    <span><ImageOff size={15} aria-hidden="true" />FOTO TERRITORIO IN ATTESA DI ASSET APPROVATO</span>
  </div>;
}

const Demo = () => <span className="vp-demo">DEMO</span>;

function Chips({ items, value, onChange, label }: { items: readonly string[]; value: string; onChange: (v: string) => void; label: string }) {
  return <div className="vision-widget-tabs" role="group" aria-label={label}>{items.map(t => <Button key={t} variant="quiet" aria-pressed={value === t} onClick={() => onChange(t)}>{t}</Button>)}</div>;
}

function SectionHead({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return <div className="vp-section"><h4>{title}</h4>{action && <button type="button" className="vp-link" onClick={onAction}>{action}<ArrowRight size={13} /></button>}</div>;
}

function Expand({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return <><Button variant="outline" className="vision-expand" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}><span>{label}</span><ChevronDown size={17} className={open ? 'is-expanded' : ''} /></Button>
    {open && <div className="vision-widget-expanded" id={id} role="region" aria-label={label}>{children}</div>}</>;
}

function MatchCard() {
  return <div className="vp-match"><span className="vp-match-tag"><Trophy size={13} />PROSSIMA GARA</span>
    <div className="vp-match-body"><div className="vp-date"><small>GIO</small><strong>--</strong><small>MESE</small><b>--:--</b></div>
      <div className="vp-teams"><div><OfficialAsset src={logo.url} alt="Stemma SCD" /><span>ColicoDerviese<br />{demo.category}</span></div><em>VS</em><div><i className="vp-crest-empty" aria-hidden="true">?</i><span>{demo.opponent}</span></div></div></div>
    <p className="vp-venue"><MapPin size={13} />{demo.venue} <Demo /></p></div>;
}

function HomeBody({ go }: { go: (id: VisionScreenId) => void }) {
  const shortcuts = [
    { label: 'Gare', icon: Volleyball, to: 'calendar' }, { label: 'Allenamenti', icon: Cone, to: 'calendar' },
    { label: 'Eventi', icon: CalendarDays, to: 'calendar' }, { label: 'Iniziative', icon: UsersRound, to: 'communications' },
  ] as const;
  return <>
    <div className="vp-shortcuts">{shortcuts.map(s => <button type="button" key={s.label} onClick={() => go(s.to)}><s.icon size={22} aria-hidden="true" /><span>{s.label}</span></button>)}</div>
    <SectionHead title="Prossima gara" action="Vedi tutti" onAction={() => go('calendar')} />
    <MatchCard />
    <div className="vp-promos"><button type="button" onClick={() => go('calendar')}><Cone size={20} /><span><strong>Allenamenti</strong>Quadro settimanale <Demo /></span></button><button type="button" className="is-yellow" onClick={() => go('communications')}><UsersRound size={20} /><span><strong>Open Day</strong>Iniziativa demo <Demo /></span></button></div>
    <div className="vp-sponsors"><SectionHead title="I nostri sponsor" /><div>{[1, 2, 3].map(n => <span key={n}>SLOT SPONSOR<br /><small>DA APPROVARE</small></span>)}</div></div>
    <SectionHead title="Mondo Colico" />
    <div className="vp-world"><div className="vp-photo" role="img" aria-label="Foto ufficiale del lago di Colico" /><div><strong>Mondo Colico</strong><p>Notizie, storia, eventi e territorio.</p></div></div>
    <Expand id="home-world" label="Scopri territorio e sponsor"><p>Colico · Dervio · Alto Lario. Contenuti editoriali e sponsor approvati non collegati: {visionData.sponsors === null ? 'NULL' : ''}.</p></Expand>
  </>;
}

function CalendarBody() {
  const [view, setView] = useState('Settimana');
  const [day, setDay] = useState('Lun');
  const [type, setType] = useState('Tutti');
  const items = demo.agenda.filter(i => type === 'Tutti' || i.kind === type);
  return <>
    <Chips items={['Settimana', 'Mese', 'Squadra']} value={view} onChange={setView} label="Vista calendario" />
    {view === 'Settimana' && <div className="vp-days" role="group" aria-label="Giorno">{['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(d => <button type="button" key={d} aria-pressed={day === d} onClick={() => setDay(d)}>{d}<small>--</small></button>)}</div>}
    {view === 'Mese' && <div className="vp-month" aria-label="Mese demo">{Array.from({ length: 28 }, (_, i) => <span key={i} className={i % 7 === 6 ? 'is-match' : ''}>{i + 1}</span>)}</div>}
    {view === 'Squadra' && <p className="vp-note">Selezione squadra disponibile in CORE · qui solo demo.</p>}
    <Chips items={['Tutti', 'Gare', 'Allenamenti']} value={type} onChange={setType} label="Tipo attività" />
    <SectionHead title={`${view === 'Settimana' ? day : view} · ${type}`} />
    <ul className="vp-list" aria-live="polite">{items.map(i => <li key={i.id}><b>{i.time}</b><span><strong>{i.title}</strong>{i.place}</span><em className={i.kind === 'Gare' ? 'is-match' : ''}>{i.kind === 'Gare' ? 'GARA' : 'ALL.'}</em></li>)}</ul>
    <Expand id="cal-legend" label="Legenda stati"><p>DEMO = esempio grafico · nessuna gara reale. I dati veri vivono nel Calendario Annuale CORE.</p></Expand>
  </>;
}

function Profile({ initials, title, sub }: { initials: string; title: string; sub: string }) {
  return <div className="vp-profile"><i aria-hidden="true">{initials}</i><div><strong>{title}</strong><span>{sub}</span></div><Demo /></div>;
}

function RowList({ rows }: { rows: readonly { t: string; s: string }[] }) {
  return <ul className="vp-list">{rows.map(r => <li key={r.t}><FileText size={16} aria-hidden="true" /><span><strong>{r.t}</strong>{r.s}</span><em>DEMO</em></li>)}</ul>;
}

function AthleteBody() {
  const [tab, setTab] = useState('Convocazioni');
  return <><Profile initials="AT" title="Atleta demo" sub={`${demo.category} · nessun profilo R20`} />
    <Chips items={['Convocazioni', 'Quote', 'Documenti']} value={tab} onChange={setTab} label="Area atleta" />
    <RowList rows={demo.athlete[tab as keyof typeof demo.athlete]} />
    <Expand id="ath-docs" label="Come funzionerà"><p>Convocazioni e documenti arriveranno solo con identità R20 verificata.</p></Expand></>;
}

function FamilyBody() {
  const [kid, setKid] = useState('A');
  const [tab, setTab] = useState('Quote');
  return <><div className="vp-kids" role="group" aria-label="Seleziona figlio/a">{['A', 'B'].map(k => <button type="button" key={k} aria-pressed={kid === k} onClick={() => setKid(k)}><i aria-hidden="true">{k}</i>Figlio/a {k}</button>)}</div>
    <Chips items={['Figli', 'Quote', 'Impegni']} value={tab} onChange={setTab} label="Area famiglia" />
    <div className="vp-status"><span>Stato {tab.toLowerCase()} · Figlio/a {kid}</span><strong>NON COLLEGATO</strong></div>
    <RowList rows={demo.family[tab as keyof typeof demo.family]} />
    <Expand id="fam-docs" label="Documenti famiglia"><p>Nessun documento reale. Accesso futuro solo con R20.</p></Expand></>;
}

function StaffBody() {
  const [tab, setTab] = useState('Gruppi');
  return <><div className="vp-metrics">{['Gruppi', 'Presenze', 'Gare 7gg'].map(m => <div key={m}><strong>—</strong><span>{m}</span><small>UNKNOWN</small></div>)}</div>
    <Chips items={['Gruppi', 'Presenze', 'Agenda']} value={tab} onChange={setTab} label="Area staff" />
    <RowList rows={demo.staff[tab as keyof typeof demo.staff]} />
    <Expand id="staff-com" label="Comunicazioni staff"><p>Nessun invio: le comunicazioni restano bozze in CORE con approvazione umana.</p></Expand></>;
}

function CommsBody() {
  const [tab, setTab] = useState('Notizie');
  return <><Chips items={['Notizie', 'Avvisi', 'Social Hub']} value={tab} onChange={setTab} label="Comunicazioni" />
    <div className="vp-feed">{demo.comms[tab as keyof typeof demo.comms].map(n => <article key={n}><div className="vp-photo" aria-hidden="true" /><div><Demo /><strong>{n}</strong><span>Fonte editoriale non collegata</span></div></article>)}</div>
    <Expand id="com-media" label="Media approvati"><div className="vision-skeleton" aria-label="Segnaposto media"><i /><i /><i /></div></Expand></>;
}

const navItems = [
  { label: 'Home', icon: House, to: 'home' }, { label: 'Calendario', icon: CalendarDays, to: 'calendar' },
  { label: 'Atleta', icon: UserRound, to: 'athlete' }, { label: 'Staff', icon: ClipboardList, to: 'staff' }, { label: 'News', icon: Megaphone, to: 'communications' },
] as const;

export function ScreenPreview({ screen, selected, onSelect, onNavigate }: { screen: VisionScreen; selected: boolean; onSelect: () => void; onNavigate: (id: VisionScreenId) => void }) {
  const isHome = screen.id === 'home';
  return <article className={`vision-preview ${selected ? 'is-selected' : ''}`} aria-label={screen.title}>
    <div className="vision-preview-caption"><span>{screen.family}</span><Button variant="quiet" className="vision-select" aria-pressed={selected} aria-label={`Seleziona ${screen.title}`} onClick={onSelect}><ArrowUpRight size={16} /><span>{selected ? 'Selezionata' : 'Esplora'}</span></Button></div>
    <div className="vision-phone">
      <header className={`vp-hero ${isHome ? 'is-home' : ''}`} style={{ backgroundImage: `linear-gradient(180deg, color-mix(in oklab, var(--vision-blue) 70%, transparent), color-mix(in oklab, var(--vision-navy) 85%, transparent)), url(${HERO_PHOTO})` }}>
        <div className="vp-brand"><OfficialAsset src={logo.url} alt="Stemma SCD" /><div><small>S.C.D.</small><strong>COLICO<span>DERVIESE</span></strong></div><Bell size={18} aria-hidden="true" /></div>
        <div className="vp-hero-copy"><h2>{isHome ? 'Questa settimana' : screen.title}</h2><p>{isHome ? "Sport, crescita e comunità nel cuore dell'Alto Lario." : screen.subtitle}</p></div>
        <span className="vp-hero-badge">{visionData.status}</span>
      </header>
      <div className="vision-phone-body">
        {screen.id === 'home' && <HomeBody go={onNavigate} />}
        {screen.id === 'calendar' && <CalendarBody />}
        {screen.id === 'athlete' && <AthleteBody />}
        {screen.id === 'family' && <FamilyBody />}
        {screen.id === 'staff' && <StaffBody />}
        {screen.id === 'communications' && <CommsBody />}
      </div>
      <nav className="vp-tabbar" aria-label={`Navigazione app · ${screen.title}`}>{navItems.map(n => <button type="button" key={n.to} aria-current={screen.id === n.to ? 'page' : undefined} onClick={() => onNavigate(n.to)}><n.icon size={17} aria-hidden="true" /><span>{n.label}</span></button>)}</nav>
      <div className="vision-phone-foot"><ShieldCheck size={13} aria-hidden="true" />STAGING READ ONLY<span>DATI DIMOSTRATIVI</span></div>
    </div>
  </article>;
}

