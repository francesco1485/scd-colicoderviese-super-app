export const UNVERIFIED = 'DA VERIFICARE ALLA FONTE' as const;

export const sources = {
  hub: { label: '19_HUB_IMPIANTI · Master rotazione campi', url: 'https://docs.google.com/spreadsheets/d/1cWSCMzXQspCEePEnezsgJDL7MGGQt1EJvr5aGmYz3h4/edit#gid=2030456101', kind: 'Google Sheet', role: 'Unica regia delle rotazioni' },
  spazi: { label: 'Registro strutture SCD · SPAZI', url: 'https://docs.google.com/spreadsheets/d/1vcEMucnKtoJ9ICE4FwB5tDwMW16msSATZetxWGwU-2I/edit', kind: 'Google Sheet', role: 'Anagrafica spazi' },
  calendario: { label: 'Calendario master · IMPIANTI & RISORSE', url: 'https://docs.google.com/spreadsheets/d/1p78Kgla_cCjYxCPjksS8lHxmlFQxuvpd1aBXv6-1H1s/edit', kind: 'Google Sheet', role: 'Calendario societario' },
  colicoMaster: { label: 'Colico · master impianto', url: 'https://drive.google.com/drive/folders/19DaBpAqx-A3fezCuDu8Tj3wEXVarRWEl', kind: 'Cartella Drive', role: 'Documentazione Colico' },
  colicoSim: { label: 'Colico · simulatore V02', url: 'https://drive.google.com/file/d/1MvuFBZRWfGkh720AExj3O-637A5rgXuP/view', kind: 'File Drive', role: 'Simulatore rotazione' },
  dervioDocs: { label: 'Dervio · revisione documentale', url: 'https://drive.google.com/drive/folders/13HjYGga-gvRAp0a9m-9YuHZ0Zu_nhDub', kind: 'Cartella Drive', role: 'Documentazione Dervio' },
  dervioNav: { label: 'Dervio · navigatore V01', url: 'https://drive.google.com/file/d/1nfybIxk5ZZIvs2rAaMdMjurR8tcCrkhc/view', kind: 'File Drive', role: 'Navigatore impianto' },
  quadro: { label: 'Quadro settimanale allenamenti · master XLSM', url: 'https://drive.google.com/file/d/1ypXAz2kydBiybllil4AjRmH7nGxlBhDb/view', kind: 'File Drive', role: 'Origine Quadro Allenamenti' },
  calendarioEventi: { label: 'Calendario partite ed eventi · master XLSX', url: 'https://drive.google.com/file/d/1eXS-kY5PCHFg4CXiAErNAKtIVEMIKgWs/view', kind: 'File Drive', role: 'Origine Calendario Annuale' },
  rotazione: { label: 'Rotazione Campi Annuale', url: 'https://docs.google.com/spreadsheets/d/1cWSCMzXQspCEePEnezsgJDL7MGGQt1EJvr5aGmYz3h4/edit', kind: 'Google Sheet', role: 'Terza fonte autonoma' },
  dervioRegistro: { label: 'Dervio · registro operativo V01', url: 'https://drive.google.com/file/d/1sDJ8_VphZx0_BZPAbpyyrxa_SD4Vz5YC/view', kind: 'File Drive', role: 'Fonte autonoma, dati non sincronizzati' },
  pulmini: { label: 'Master Pulmini', url: 'https://docs.google.com/spreadsheets/d/1eBhjOymnJF6GfE-6-GRuo7UYgkE82ad24_VnY097n9Q/edit', kind: 'Google Sheet', role: 'Solo corse confermate' },
  organigramma: { label: 'Master organigramma', url: 'https://docs.google.com/spreadsheets/d/1BtRsEydia-fMoTyz4niKMOEGGSRePlrHekymq5GsuPE/edit', kind: 'Google Sheet', role: 'Rubrica ruoli' },
  zipQuadro: { label: 'Pacchetto di prova Quadro RC8', url: 'https://drive.google.com/file/d/19BcPaq1nnkCBkJtf3WB9eQcJs6ZE9blE/view', kind: 'ZIP di prova', role: 'NON fonte corrente' },
  zipCalendario: { label: 'Pacchetto di prova Calendario RC1', url: 'https://drive.google.com/file/d/10Kx1Wgg8w90XGYYev0Be6_dnD-kBcBqf/view', kind: 'ZIP di prova', role: 'NON fonte corrente' },
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
