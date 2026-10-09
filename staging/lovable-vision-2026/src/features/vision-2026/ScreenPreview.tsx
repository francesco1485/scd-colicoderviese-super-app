import { useState } from 'react';
import { ChevronDown, ArrowUpRight, CalendarDays, FileText, Link2Off, ImageOff, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OfficialAsset } from './OfficialAsset';
import { type VisionScreen, visionData } from './screens';
import logo from '@/assets/logo-scd.png.asset.json';

export function TerritoryPlaceholder({ compact = false }: { compact?: boolean }) {
  return <div className={`vision-territory ${compact ? 'vision-territory-compact' : ''}`}>
    <div className="vision-mountain" aria-hidden="true" />
    <div className="vision-water" aria-hidden="true" />
    <span><ImageOff size={15} aria-hidden="true" />FOTO TERRITORIO IN ATTESA DI ASSET APPROVATO</span>
  </div>;
}

function EmptyState({ title, icon: Icon = Link2Off }: { title: string; icon?: typeof Link2Off }) {
  return <div className="vision-empty" role="status"><Icon size={23} aria-hidden="true" /><strong>{title}</strong><span>Fonte non collegata · dati NULL</span></div>;
}

export function ScreenPreview({ screen, selected, onSelect }: { screen: VisionScreen; selected: boolean; onSelect: () => void }) {
  const [active, setActive] = useState<string>(screen.tabs[0]);
  const [expanded, setExpanded] = useState(false);
  const [type, setType] = useState('Tutti');
  const Icon = screen.icon;
  const tabEmpty = active === 'Quote' ? 'Quote e pagamenti non disponibili' : active === 'Documenti' ? 'Nessun documento disponibile' : active === 'Convocazioni' ? 'Nessuna convocazione collegata' : active === 'Presenze' ? 'Presenze non disponibili' : active === 'Social Hub' ? 'Canali social non collegati' : active === 'Avvisi' ? 'Nessun avviso collegato' : screen.empty;

  return <article className={`vision-preview ${selected ? 'is-selected' : ''}`} aria-label={screen.title}>
    <div className="vision-preview-caption"><span>{screen.family}</span><Button variant="quiet" className="vision-select" aria-pressed={selected} aria-label={`Seleziona ${screen.title}`} onClick={onSelect}><ArrowUpRight size={16} /><span>{selected ? 'Selezionata' : 'Esplora'}</span></Button></div>
    <div className="vision-phone">
      <header className="vision-phone-header"><OfficialAsset src={logo.url} alt="Stemma SCD" /><div><small>S.C.D. COLICODERVIESE</small><h2>{screen.title}</h2></div><Icon size={20} aria-hidden="true" /></header>
      <div className="vision-phone-body">
        <span className="vision-demo">{visionData.status}</span>
        {screen.id === 'home' ? <><TerritoryPlaceholder compact /><h3 className="vision-home-title">IL NOSTRO CLUB.<br /><em>IL NOSTRO LARIO.</em></h3></> : <div className="vision-screen-intro"><Icon size={26} aria-hidden="true" /><h3>{screen.subtitle}</h3></div>}
        <div className="vision-widget-tabs" role="group" aria-label={`Viste ${screen.title}`}>{screen.tabs.map(tab => <Button key={tab} variant="quiet" aria-pressed={active === tab} onClick={() => setActive(tab)}>{tab}</Button>)}</div>
        <div className="vision-widget-heading"><h4>{screen.id === 'home' ? screen.widget : active}</h4><span>NON COLLEGATO</span></div>
        <EmptyState title={tabEmpty} icon={screen.id === 'calendar' || screen.id === 'home' ? CalendarDays : screen.id === 'athlete' || screen.id === 'family' ? FileText : Link2Off} />
        <Button variant="outline" className="vision-expand" aria-expanded={expanded} aria-controls={`widget-${screen.id}`} onClick={() => setExpanded(!expanded)}><span>{screen.id === 'calendar' ? 'Filtra attività' : screen.id === 'home' ? 'Sponsor e territorio' : screen.extra}</span><ChevronDown size={17} className={expanded ? 'is-expanded' : ''} /></Button>
        {expanded && <div className="vision-widget-expanded" id={`widget-${screen.id}`}>
          {screen.id === 'calendar' && <><div role="group" aria-label="Tipo attività" className="vision-widget-tabs">{['Tutti', 'Gare', 'Allenamenti'].map(t => <Button variant="quiet" key={t} aria-pressed={type === t} onClick={() => setType(t)}>{t}</Button>)}</div><p role="status">Filtro: {type} · nessuna attività collegata.</p></>}
          {screen.id !== 'calendar' && <><strong>{screen.extra}</strong><p>{screen.extraEmpty} · NULL</p>{screen.id === 'home' && <TerritoryPlaceholder compact />}{screen.id === 'communications' && <div className="vision-skeleton" aria-label="Segnaposto media, non in caricamento"><i /><i /><i /></div>}</>}
        </div>}
      </div>
      <div className="vision-phone-foot"><ShieldCheck size={13} aria-hidden="true" />STAGING READ ONLY<span>NULL / DEMO</span></div>
    </div>
  </article>;
}