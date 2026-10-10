export const UNVERIFIED = 'DA VERIFICARE ALLA FONTE' as const;

/**
 * Super App (pubblica, senza login): i link ai master Google (Sheet/Drive) NON sono inclusi nel bundle.
 * Le fonti sono citate solo per nome; il collegamento tornerà dietro accesso R20 verificato.
 */
export const RESERVED_SOURCE_NOTE = 'Link riservato · disponibile con accesso R20' as const;

export const sources = {
  hub: { label: '19_HUB_IMPIANTI · Master rotazione campi', url: null, kind: 'Google Sheet', role: 'Unica regia delle rotazioni' },
  spazi: { label: 'Registro strutture SCD · SPAZI', url: null, kind: 'Google Sheet', role: 'Anagrafica spazi' },
  calendario: { label: 'Calendario master · IMPIANTI & RISORSE', url: null, kind: 'Google Sheet', role: 'Calendario societario' },
  colicoMaster: { label: 'Colico · master impianto', url: null, kind: 'Cartella Drive', role: 'Documentazione Colico' },
  colicoSim: { label: 'Colico · simulatore V02', url: null, kind: 'File Drive', role: 'Simulatore rotazione' },
  dervioDocs: { label: 'Dervio · revisione documentale', url: null, kind: 'Cartella Drive', role: 'Documentazione Dervio' },
  dervioNav: { label: 'Dervio · navigatore V01', url: null, kind: 'File Drive', role: 'Navigatore impianto' },
  quadro: { label: 'Quadro settimanale allenamenti · master XLSM', url: null, kind: 'File Drive', role: 'Origine Quadro Allenamenti' },
  calendarioEventi: { label: 'Calendario partite ed eventi · master XLSX', url: null, kind: 'File Drive', role: 'Origine Calendario Annuale' },
  rotazione: { label: 'Rotazione Campi Annuale', url: null, kind: 'Google Sheet', role: 'Terza fonte autonoma' },
  dervioRegistro: { label: 'Dervio · registro operativo V01', url: null, kind: 'File Drive', role: 'Fonte autonoma, dati non sincronizzati' },
  pulmini: { label: 'Master Pulmini', url: null, kind: 'Google Sheet', role: 'Solo corse confermate' },
  organigramma: { label: 'Master organigramma', url: null, kind: 'Google Sheet', role: 'Rubrica ruoli' },
  zipQuadro: { label: 'Pacchetto di prova Quadro RC8', url: null, kind: 'ZIP di prova', role: 'NON fonte corrente' },
  zipCalendario: { label: 'Pacchetto di prova Calendario RC1', url: null, kind: 'ZIP di prova', role: 'NON fonte corrente' },
} as const;
export type SourceKey = keyof typeof sources;

export const fields = [
  { id: 'colico-1', site: 'Colico', name: 'Campo 1', surface: 'Sintetico', rule: 'Gare base', sources: ['hub', 'colicoMaster', 'colicoSim'] as SourceKey[] },
  { id: 'colico-2', site: 'Colico', name: 'Campo 2', surface: 'Sintetico', rule: 'Gare ufficiali NON automatiche', sources: ['hub', 'colicoMaster', 'colicoSim'] as SourceKey[] },
  { id: 'dervio', site: 'Dervio', name: 'Campo principale', surface: 'Erba', rule: 'Rotazione controllata', sources: ['hub', 'dervioDocs', 'dervioNav'] as SourceKey[] },
] as const;

export const unverifiedChecks = ['Disponibilità attuale', 'Omologazione recente', 'Meteo', 'Autorizzazione federale', 'Cambi gara'] as const;

export const steps = [
  { id: 'PROPOSTA', text: 'Ipotesi di modifica campo o orario. Non è una variazione FIGC formalizzata.' },
  { id: 'RESPONSABILE', text: 'Human gate: il responsabile impianti valuta e approva o respinge.' },
  { id: 'FORMALIZZAZIONE', text: 'Comunicazione a LND/FIGC prima di qualsiasi aggiornamento societario.' },
  { id: 'CALENDARIO', text: 'Solo dopo la formalizzazione il calendario master viene aggiornato alla fonte.' },
] as const;

export const documents = [
  { id: 'd1', topic: 'Rotazione campi', source: 'hub' as SourceKey, site: 'Tutti', note: 'Regia rotazioni; gare con source of truth separata' },
  { id: 'd2', topic: 'Anagrafica spazi', source: 'spazi' as SourceKey, site: 'Tutti', note: 'Possibile divergenza con 19_HUB_IMPIANTI' },
  { id: 'd3', topic: 'Calendario risorse', source: 'calendario' as SourceKey, site: 'Tutti', note: 'Possibile divergenza con rotazione proposta' },
  { id: 'd4', topic: 'Master impianto', source: 'colicoMaster' as SourceKey, site: 'Colico', note: 'Documenti da riscontrare' },
  { id: 'd5', topic: 'Simulatore V02', source: 'colicoSim' as SourceKey, site: 'Colico', note: 'Simulazione, non occupazione reale' },
  { id: 'd6', topic: 'Revisione documentale', source: 'dervioDocs' as SourceKey, site: 'Dervio', note: 'Revisione in corso' },
  { id: 'd7', topic: 'Navigatore V01', source: 'dervioNav' as SourceKey, site: 'Dervio', note: 'Strumento di consultazione' },
] as const;

export const activeCategoriesExclude = ['U18'] as const;
