import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowLeft, CalendarDays, Dumbbell, RefreshCw, MapPin, Users, Shirt, LayoutGrid, Bus } from 'lucide-react';
import logo from '@/assets/scd/logo_scd.png.asset.json';
import { ImpiantiPanel } from './ImpiantiPanel';
import { QuadroAllenamenti } from './QuadroAllenamenti';
import { CalendarioAnnuale } from './CalendarioAnnuale';
import { LaMiaSquadra, IlMioSettore, DervioPulmini } from './TeamSectorViews';
import { RotazioneAnnuale, Responsabili } from './RotazioneResponsabili';
import './impianti.css';

/** Ordine action-first: allenamenti e calendario prima di impianti e organigramma. */
const sections = [
  { id: 'quadro', label: 'Quadro Allenamenti', icon: Dumbbell },
  { id: 'calendario', label: 'Calendario Annuale', icon: CalendarDays },
  { id: 'squadra', label: 'La mia squadra', icon: Shirt },
  { id: 'settore', label: 'Il mio settore', icon: LayoutGrid },
  { id: 'rotazione', label: 'Rotazione Annuale', icon: RefreshCw },
  { id: 'impianti', label: 'Impianti', icon: MapPin },
  { id: 'responsabili', label: 'Piramide referenti', icon: Users },
  { id: 'dervio', label: 'Dervio e Pulmini', icon: Bus },
] as const;
type SectionId = (typeof sections)[number]['id'];

export function ImpiantiCalendari() {
  const [section, setSection] = useState<SectionId>('quadro');
  return <div className="imp">
    <div className="imp-banner" role="note">STAGING · CONSULTAZIONE FONTI · NESSUN DATO LIVE · NESSUNA SCRITTURA</div>
    <header className="imp-head">
      <Link to="/aree" className="imp-back" aria-label="Torna alle aree riservate"><ArrowLeft size={18} /></Link>
      <img src={logo.url} alt="Logo ufficiale SCD" className="imp-logo" />
      <div><small>SCD CORE · PREVIEW READ-ONLY · DEMO_NOT_RUNTIME</small><h1>Impianti e Calendari</h1></div>
    </header>
    <div className="imp-shell">
      <nav className="imp-side-nav" aria-label="Sezioni SCD CORE">
        {sections.map(s => <button key={s.id} aria-current={section === s.id ? 'page' : undefined} onClick={() => setSection(s.id)}><s.icon size={18} aria-hidden="true" /><span>{s.label}</span></button>)}
      </nav>
      <main className="imp-main">
        {section === 'quadro' && <QuadroAllenamenti />}
        {section === 'calendario' && <CalendarioAnnuale />}
        {section === 'squadra' && <LaMiaSquadra />}
        {section === 'settore' && <IlMioSettore />}
        {section === 'dervio' && <DervioPulmini />}
        {section === 'rotazione' && <RotazioneAnnuale />}
        {section === 'impianti' && <ImpiantiPanel />}
        {section === 'responsabili' && <Responsabili />}
      </main>
    </div>
    <footer className="imp-foot">Nessun dato personale · U18 ritirata, esclusa dalle categorie attive · Le fonti restano su Google Drive · Sezione SCD CORE della Super App</footer>
  </div>;
}
