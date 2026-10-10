import { House, CalendarDays, UserRound, UsersRound, ClipboardList, Radio } from 'lucide-react';

export const visionScreens = [
  { id: 'home', title: 'Home Pubblica', short: 'Home', icon: House, family: 'SCD UNIVERSE', subtitle: 'Il club. Il territorio. Noi.', tabs: ['Gare', 'Allenamenti', 'Eventi', 'Iniziative'], widget: 'Prossimo incontro', empty: 'Calendario gare non disponibile', extra: 'Sponsor approvati', extraEmpty: 'Catalogo sponsor non collegato' },
  { id: 'calendar', title: 'Calendario', short: 'Calendario', icon: CalendarDays, family: 'SCD UNIVERSE', subtitle: 'Il tempo del club.', tabs: ['Settimana', 'Mese', 'Squadra'], widget: 'Gare e allenamenti', empty: 'Nessun calendario collegato', extra: 'Filtri calendario', extraEmpty: 'Squadre e categorie non disponibili' },
  { id: 'athlete', title: 'Area Atleta', short: 'Atleta', icon: UserRound, family: 'SCD UNIVERSE', subtitle: 'Il tuo spazio in squadra.', tabs: ['Convocazioni', 'Quote', 'Documenti'], widget: 'Profilo atleta', empty: 'Nessun profilo collegato', extra: 'Documenti', extraEmpty: 'Nessun documento disponibile' },
  { id: 'family', title: 'Area Famiglia', short: 'Famiglia', icon: UsersRound, family: 'SCD UNIVERSE', subtitle: 'Insieme, ogni giorno.', tabs: ['Figli', 'Quote', 'Impegni'], widget: 'Nucleo familiare', empty: 'Nessun nucleo collegato', extra: 'Documenti famiglia', extraEmpty: 'Nessun documento disponibile' },
  { id: 'staff', title: 'Staff / Direzione', short: 'Staff', icon: ClipboardList, family: 'SCD GESTIONALE', subtitle: 'Una regia. Un solo club.', tabs: ['Gruppi', 'Presenze', 'Agenda'], widget: 'Quadro operativo', empty: 'Metriche non disponibili', extra: 'Comunicazioni staff', extraEmpty: 'Nessuna comunicazione collegata' },
  { id: 'communications', title: 'Comunicazioni', short: 'News', icon: Radio, family: 'SCD UNIVERSE', subtitle: 'La voce della SCD.', tabs: ['Notizie', 'Avvisi', 'Social Hub'], widget: 'Feed del club', empty: 'Nessuna fonte editoriale collegata', extra: 'Media approvati', extraEmpty: 'Archivio media non collegato' },
] as const;

export type VisionScreen = (typeof visionScreens)[number];
export type VisionScreenId = VisionScreen['id'];
export const visionData = {
  status: 'DEMO_NOT_RUNTIME',
  approval: 'PENDING_VISUAL_APPROVAL',
  fixtures: null, athletes: null, families: null, payments: null,
  documents: null, metrics: null, news: null, sponsors: null,
  assistantConnected: false,
} as const;
/** Foto ufficiale repo canonico (assets/hero-colico.webp), copiata in public/scd-preview. */
export const HERO_PHOTO = '/media/scd/hero-colico.webp';

/** Contenuti puramente dimostrativi: nessun nome, gara, quota o risultato reale. */
export const demo = {
  category: 'CATEGORIA DEMO',
  opponent: 'AVVERSARIO DEMO',
  venue: 'Campo demo · Colico',
  agenda: [
    { id: 'a1', time: '--:--', title: 'Allenamento demo', place: 'Colico · Campo demo', kind: 'Allenamenti' },
    { id: 'a2', time: '--:--', title: 'Gara demo · casa', place: 'Colico · Campo demo', kind: 'Gare' },
    { id: 'a3', time: '--:--', title: 'Allenamento demo', place: 'Dervio · Campo demo', kind: 'Allenamenti' },
    { id: 'a4', time: '--:--', title: 'Gara demo · trasferta', place: 'Sede da fonte FIGC', kind: 'Gare' },
  ],
  athlete: {
    Convocazioni: [{ t: 'Convocazione demo', s: 'Nessuna convocazione reale' }],
    Quote: [{ t: 'Quota stagionale', s: 'Stato NON COLLEGATO' }],
    Documenti: [{ t: 'Certificato medico', s: 'Scadenza UNKNOWN' }, { t: 'Modulo iscrizione', s: 'Non collegato' }],
  },
  family: {
    Figli: [{ t: 'Profilo figlio/a', s: 'Solo iniziali · nessun volto' }],
    Quote: [{ t: 'Quota iscrizione', s: 'Importo UNKNOWN' }, { t: 'Quota pulmino', s: 'Importo UNKNOWN' }],
    Impegni: [{ t: 'Impegno demo', s: 'Data UNKNOWN' }],
  },
  staff: {
    Gruppi: [{ t: 'Gruppo demo', s: 'Responsabile da R20' }],
    Presenze: [{ t: 'Registro presenze', s: 'UNKNOWN · non zero' }],
    Agenda: [{ t: 'Riunione demo', s: 'Data UNKNOWN' }],
  },
  comms: {
    Notizie: ['Notizia demo dal club', 'Storia del territorio · demo'],
    Avvisi: ['Avviso demo · nessun invio'],
    'Social Hub': ['Post social demo', 'Galleria demo'],
  },
} as const;

/** Tre famiglie applicative con lo stesso linguaggio visivo (UD-015). */
export const appFamilies = [
  { id: 'one', name: 'SCD ONE', role: 'Pubblico e famiglie', screens: ['home', 'calendar', 'athlete', 'family', 'communications'] },
  { id: 'core', name: 'SCD CORE', role: 'Gestionale e direzione', screens: ['staff'] },
  { id: 'grow', name: 'SCD GROW', role: 'Sponsor e partner', screens: [] },
] as const;
