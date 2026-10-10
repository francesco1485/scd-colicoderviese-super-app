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