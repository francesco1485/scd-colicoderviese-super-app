/**
 * Content contract of the reserved work areas (release 2 item 6): which Drive masters each
 * area reads, the few facts verified on 2026-10-11 and the role labels offered by the
 * "Inserisci" action. Read-only: nothing here writes to Drive, R20 or any sheet.
 *
 * Rules:
 * - a Drive master gets an "Apri il file" link ONLY when its file id was given by the club
 *   (DRIVE_MASTERS[*].fileId); every other source is named without a link;
 * - unknown is null (rendered "—"), never 0;
 * - no minors' names, no health data, no amounts or IBAN.
 */
import { roleLabel } from "./access";
import { findArea } from "./areas";

export type WorkAreaId =
  | "pulmini"
  | "segreteria"
  | "crm"
  | "magazzino"
  | "tesoreria"
  | "club-house"
  | "biglietteria"
  | "magazzino-cassa"
  | "compensi"
  | "quote"
  | "coda"
  | "scadenzario"
  | "movimenti"
  | "infermeria"
  | "mister"
  | "organigramma"
  | "persone"
  | "accessi"
  | "cervellone"
  | "certificati";

export interface DriveMaster {
  key: string;
  name: string;
  /** Google Sheets file id given by the club; null = named only, no link. */
  fileId: string | null;
  /** Plain status when the source is not on Drive yet ("da collegare", "da caricare"). */
  note?: string;
}

/** Drive file ids provided by the club on 2026-10-11 (the only ones that may be linked). */
export const DRIVE_MASTERS = {
  calendario: { key: "calendario", name: "Master Calendario 2026/27", fileId: "1p78Kgla_cCjYxCPjksS8lHxmlFQxuvpd1aBXv6-1H1s" },
  pulmini: { key: "pulmini", name: "05_PULMINI - Master Flotta e Trasporti", fileId: "1eBhjOymnJF6GfE-6-GRuo7UYgkE82ad24_VnY097n9Q" },
  sponsor: { key: "sponsor", name: "Master Sponsor", fileId: "1-5-MUnrrAltflJSATe6bKkjm_3SItO0gvadi_PXPoAQ" },
  contatti: { key: "contatti", name: "MASTER CONTATTI", fileId: "1RacFticU85AWw4Sgkz60hqUfsXRGcCpd5heKH6Tkqak" },
  economico: { key: "economico", name: "Gestionale economico", fileId: "1N2MisMPM79Uboj70A7PPMdCGNf043-GX6WjBrAyT3rg" },
  fornitori: { key: "fornitori", name: "SCD - TESORERIA FORNITORI | Scadenze e chiusure 2026-2027", fileId: "1l9_mmmo9zuALF2IrQvevhBFaNYFCWzOOjjyDuphQGsY" },
  impianti: { key: "impianti", name: "Sedi e impianti", fileId: "1vcEMucnKtoJ9ICE4FwB5tDwMW16msSATZetxWGwU-2I" },
  inserimenti: { key: "inserimenti", name: "Inserimenti a Sky", fileId: "15Dew9ankJXHsZMVD426BHwYD-u9TKVtQWVMOWcSLnwk" },
  quadro: { key: "quadro", name: "Quadro settimanale allenamenti 2026/27", fileId: null, note: "copia di sola lettura del 09/10" },
  r20: { key: "r20", name: "R20 · gestionale operativo", fileId: null, note: "da collegare" },
  iscrizioni: { key: "iscrizioni", name: "Database Iscrizioni", fileId: null, note: "da collegare" },
  certificati: { key: "certificati", name: "Registro certificati", fileId: null, note: "da collegare" },
  inventario: { key: "inventario", name: "Inventario kit", fileId: null, note: "da caricare" },
  ordineKit: { key: "ordineKit", name: "SCD_ORDINE_KIT · ordine kit pre campionato 2026/27", fileId: null, note: "copia automatica, solo numeri per squadra e taglia" },
  listino: { key: "listino", name: "Listino Club House", fileId: null, note: "da caricare" },
  tariffe: { key: "tariffe", name: "Tariffario biglietteria", fileId: null, note: "da confermare" },
  sanitario: { key: "sanitario", name: "Servizi e orari dello staff sanitario", fileId: null, note: "da definire" },
  sgsManuale: { key: "sgsManuale", name: "C.U. n.18 SGS · Manuale Sistema di Qualità 2026", fileId: null, note: "regole in config/sgs-quality-system.v1.json" },
  organigrammaFigc: { key: "organigrammaFigc", name: "Organigramma FIGC (Portale Servizi)", fileId: null, note: "estratto del 24/09, privato" },
  elencoRuoli: { key: "elencoRuoli", name: "Elenco dirigenti e ruoli 2026/27", fileId: null, note: "privato, solo Direzione" },
  controlTower: { key: "controlTower", name: "SCD Control Tower 2026/27 · rapporti economici", fileId: null, note: "import iniziale del 12/10, privato" },
  cervelloneDrive: { key: "cervelloneDrive", name: "SCD CERVELLONE · Catalogo e Memoria (Drive)", fileId: null, note: "cartella privata della società" },
  contoSumup: { key: "contoSumup", name: "Conto SumUp della società · estratto movimenti", fileId: null, note: "estratto caricato da Direzione/Tesoreria, privato" },
  supabase: { key: "supabase", name: "Supabase SCD · persone, ruoli e storico", fileId: null, note: "database del club (r59)" },
} as const satisfies Record<string, DriveMaster>;

export type MasterKey = keyof typeof DRIVE_MASTERS;

const DRIVE_ID = /^[A-Za-z0-9_-]{25,}$/;

/** https://docs.google.com/spreadsheets/d/<id>/edit, or null when no valid id was given. */
export function driveUrl(fileId: string | null | undefined): string | null {
  if (!fileId || !DRIVE_ID.test(fileId)) return null;
  return `https://docs.google.com/spreadsheets/d/${fileId}/edit`;
}

export interface WorkAreaConfig {
  id: WorkAreaId;
  /** Label used in the shell title, the Inserisci "Area" cell and the head. */
  label: string;
  /** Canonical direct path (from the registry). */
  path: string;
  /** Rail item to highlight. */
  railId: string;
  /** Short description for <head>. */
  description: string;
  sources: readonly MasterKey[];
  /** "Inserito da (ruolo)" options: plain role labels, not permissions. */
  insertRoles: readonly string[];
}

const pathOf = (id: string) => {
  const a = findArea(id);
  if (!a) throw new Error(`Unknown area "${id}"`);
  return a.path;
};

/** Role labels of the registry for an area (e.g. "responsabile trasporti"), capitalised. */
const registryRoles = (id: string) => (findArea(id)?.roles ?? []).map((r) => cap(roleLabel(r)));
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const uniq = (xs: readonly string[]) => [...new Set(xs)];

export const WORK_AREAS: Readonly<Record<WorkAreaId, WorkAreaConfig>> = {
  pulmini: {
    id: "pulmini", label: "Pulmini", path: pathOf("pulmini"), railId: "pulmini",
    description: "Trasferte del weekend dal calendario ufficiale e flotta dal Master Flotta e Trasporti. Sola lettura.",
    sources: ["pulmini", "calendario", "inserimenti"],
    insertRoles: uniq([...registryRoles("pulmini"), "Segreteria"]),
  },
  persone: {
    id: "persone", label: "Persone", path: pathOf("persone"), railId: "segreteria",
    description: "Tesserati, staff e dirigenti del club con ruolo, squadra e storico: chi entra e chi esce resta scritto. Direzione e Segreteria.",
    sources: ["supabase", "iscrizioni", "elencoRuoli", "r20", "inserimenti"],
    insertRoles: ["Direzione", "Segreteria"],
  },
  certificati: {
    id: "certificati", label: "Certificati medici", path: pathOf("certificati"), railId: "segreteria",
    description: "Scadenze dei certificati medici di ogni atleta, squadra per squadra: chi manca, chi è scaduto, chi è da controllare. Direzione e Segreteria.",
    sources: ["supabase", "iscrizioni", "inserimenti"],
    insertRoles: ["Direzione", "Segreteria"],
  },
  cervellone: {
    id: "cervellone", label: "Cervellone · catalogo e memoria", path: pathOf("cervellone"), railId: "direzione",
    description: "Ricerca in tutto ciò che la società ha catalogato: documenti agli atti, file, posta, economia, storia e impianti.",
    sources: ["supabase", "cervelloneDrive", "inserimenti"],
    insertRoles: ["Direzione"],
  },
  accessi: {
    id: "accessi", label: "Accessi", path: pathOf("accessi"), railId: "direzione",
    description: "Chi entra nell'app e cosa può fare: ruolo, aree su misura, sospensioni e storico delle modifiche. Direzione e Segreteria.",
    sources: ["supabase", "inserimenti"],
    insertRoles: ["Direzione", "Segreteria"],
  },
  segreteria: {
    id: "segreteria", label: "Segreteria", path: pathOf("segreteria"), railId: "segreteria",
    description: "Code di lavoro della segreteria (scadenze, distinte, tesseramenti) e collegamenti ai master. Sola lettura.",
    sources: ["r20", "iscrizioni", "calendario", "contatti", "impianti", "certificati", "inserimenti"],
    insertRoles: ["Segreteria", "Direzione", "Dirigente di annata", "Tornei"],
  },
  crm: {
    id: "crm", label: "CRM contatti", path: pathOf("crm"), railId: "crm",
    description: "Pipeline sponsor e partner dal Master Sponsor e dal MASTER CONTATTI: un solo registro. Sola lettura.",
    sources: ["contatti", "sponsor", "inserimenti"],
    insertRoles: ["Segreteria", "Direzione", "Tornei", "Sponsor e partnership"],
  },
  magazzino: {
    id: "magazzino", label: "Magazzino", path: pathOf("magazzino"), railId: "magazzino",
    description: "Ordine kit per squadra e taglia dalla copia del foglio SCD_ORDINE_KIT; consegne segnate per taglia, senza nomi.",
    sources: ["ordineKit", "inventario", "economico", "inserimenti"],
    insertRoles: ["Responsabile magazzino", "Segreteria", "Direzione"],
  },
  tesoreria: {
    id: "tesoreria", label: "Tesoreria", path: pathOf("tesoreria"), railId: "tesoreria",
    description: "Sottoaree della tesoreria con accesso dedicato e acquisti della Dirigenza. Nessun importo mostrato.",
    sources: ["economico", "inserimenti"],
    insertRoles: ["Tesoreria", "Direzione"],
  },
  "club-house": {
    id: "club-house", label: "Tesoreria · Club House", path: pathOf("club-house"), railId: "tesoreria",
    description: "Cassa del bar della Club House: listino da caricare, nessun incasso mostrato.",
    sources: ["listino", "economico", "inserimenti"],
    insertRoles: uniq([...registryRoles("club-house"), "Tesoreria"]),
  },
  biglietteria: {
    id: "biglietteria", label: "Tesoreria · Biglietteria", path: pathOf("biglietteria"), railId: "tesoreria",
    description: "Incassi e abbonamenti della biglietteria: tariffario da confermare prima di vendere.",
    sources: ["tariffe", "economico", "inserimenti"],
    insertRoles: uniq([...registryRoles("biglietteria"), "Tesoreria"]),
  },
  "magazzino-cassa": {
    id: "magazzino-cassa", label: "Tesoreria · Magazzino", path: pathOf("magazzino-cassa"), railId: "tesoreria",
    description: "Ordini e incassi del kit: cassa da collegare, nessun importo mostrato.",
    sources: ["inventario", "economico", "inserimenti"],
    insertRoles: uniq([...registryRoles("magazzino-cassa"), "Tesoreria"]),
  },
  compensi: {
    id: "compensi", label: "Tesoreria · Compensi e stipendi", path: pathOf("compensi"), railId: "tesoreria",
    description: "Compensi del mese: la Direzione verifica e autorizza, la Tesoreria paga. Riservato.",
    sources: ["controlTower", "supabase", "inserimenti"],
    insertRoles: ["Direzione", "Tesoreria"],
  },
  quote: {
    id: "quote", label: "Tesoreria · Quote e Fondo", path: pathOf("quote"), railId: "tesoreria",
    description: "Quote della stagione dal Gestionale: dovuto, pagato, scaduto, rate e lista di lavoro. Riservato.",
    sources: ["economico", "supabase", "inserimenti"],
    insertRoles: ["Segreteria", "Tesoreria"],
  },
  coda: {
    id: "coda", label: "Gestionale · Coda di lavoro", path: pathOf("coda"), railId: "gestionale",
    description: "Proposte arrivate da mail e copie dei master: una persona conferma, scarta o rinvia. Ogni decisione resta registrata.",
    sources: ["supabase", "inserimenti"],
    insertRoles: ["Direzione", "Segreteria", "Tesoreria"],
  },
  scadenzario: {
    id: "scadenzario", label: "Tesoreria · Fornitori e scadenze", path: pathOf("scadenzario"), railId: "tesoreria",
    description: "Debiti verso fornitori, piani di rientro e agenda dei pagamenti dal foglio TESORERIA FORNITORI. Riservato.",
    sources: ["fornitori", "supabase", "inserimenti"],
    insertRoles: ["Direzione", "Tesoreria"],
  },
  movimenti: {
    id: "movimenti", label: "Tesoreria · Movimenti del conto", path: pathOf("movimenti"), railId: "tesoreria",
    description: "Registro dei movimenti del conto SumUp della società e riscontro dei pagamenti delle famiglie con le quote. Riservato.",
    sources: ["contoSumup", "economico", "supabase", "inserimenti"],
    insertRoles: ["Direzione", "Tesoreria"],
  },
  infermeria: {
    id: "infermeria", label: "Infermeria", path: pathOf("infermeria"), railId: "infermeria",
    description: "Servizi dell'infermeria del club e prenotazione, attiva quando lo staff pubblica gli orari.",
    sources: ["sanitario", "impianti", "inserimenti"],
    insertRoles: ["Staff sanitario", "Direzione", "Segreteria"],
  },
  mister: {
    id: "mister", label: "Mister", path: pathOf("mister"), railId: "gestionale",
    description: "Oggi del mister: prossima gara e allenamenti della squadra dal calendario e dal quadro. Nessun nome di atleti.",
    sources: ["calendario", "quadro", "r20", "impianti", "inserimenti"],
    insertRoles: uniq([...registryRoles("mister"), "Direzione"]),
  },
  organigramma: {
    id: "organigramma", label: "Organigramma e 3° livello SGS", path: pathOf("organigramma"), railId: "gestionale",
    description: "Ruoli, allenatori e scadenze richiesti dal Sistema di Qualità SGS per il livello scelto. Nessun nome: lo stato arriva dal server.",
    sources: ["sgsManuale", "organigrammaFigc", "elencoRuoli", "inserimenti"],
    insertRoles: ["Direzione", "Segreteria", "Responsabile attività di base"],
  },
};

export const WORK_AREA_LIST: readonly WorkAreaConfig[] = Object.values(WORK_AREAS);

/** Sources of an area resolved to name, note and (only when an id was given) the Drive link. */
export function areaSources(id: WorkAreaId): { name: string; note: string | null; url: string | null }[] {
  return WORK_AREAS[id].sources.map((k) => {
    const m: DriveMaster = DRIVE_MASTERS[k];
    return { name: m.name, note: m.note ?? null, url: driveUrl(m.fileId) };
  });
}

/* ------------------------------------------------------------------ verified facts */

export interface DatedFact {
  /** ISO date the fact was read from its source. */
  asOf: string;
  source: string;
}

/**
 * Master Flotta e Trasporti, read on 2026-10-11. Seats are not confirmed yet (null),
 * no run has been planned yet (runsPlanned 0 is a documented fact, not an unknown).
 */
export const PULMINI_FLEET = {
  asOf: "2026-10-11",
  source: DRIVE_MASTERS.pulmini.name,
  vehicles: 4,
  driversRegistered: 6,
  driversActive: 3,
  membersActive: 50,
  membersTotal: 61,
  runsPlanned: 0,
  seatsConfirmed: null as number | null,
} as const satisfies DatedFact & Record<string, unknown>;

/** Sponsor contracts documented on 2026-10-11 (Master Sponsor + contracts PDF). Names only. */
export const CRM_PIPELINE = {
  asOf: "2026-10-11",
  source: `${DRIVE_MASTERS.sponsor.name} e contratti`,
  active: ["ATV", "ATL", "New Generation", "EdilMelos", "Officine Pedroncelli", "Coperture Rasero", "Noratech"],
  expiredToRenew: ["MDS", "Consilia", "Attività di Recupero", "Essegi", "Bottazzi"],
  /** Not imported yet: unknown, rendered "—". */
  prospects: null as number | null,
  negotiations: null as number | null,
} as const satisfies DatedFact & Record<string, unknown>;

/** "11/10/2026" from an ISO date. */
export function italianDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** "dato al 11/10/2026, fonte <source>". */
export function factStamp(f: DatedFact): string {
  return `dato al ${italianDate(f.asOf)}, fonte ${f.source}`;
}

/* ------------------------------------------------------------------ calendar helpers */

/**
 * The coming weekend as the boards show it: the first Saturday AFTER today and the Sunday
 * after it (on Saturday 10/10 the board plans 17–18/10; on Sunday 11/10 it plans 17–18/10).
 */
export function nextWeekend(today: string): { sat: string; sun: string } {
  const [y, m, d] = today.split("-").map(Number) as [number, number, number];
  const base = new Date(Date.UTC(y, m - 1, d));
  const dow = base.getUTCDay(); // 0 Sunday … 6 Saturday
  const toSat = dow === 6 ? 7 : 6 - dow;
  const iso = (n: number) => new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
  return { sat: iso(toSat), sun: iso(toSat + 1) };
}

/** Matches of the coming weekend from the calendar snapshot, in time order; away only when asked. */
export function weekendMatches<E extends { date: string; time: string; homeAway: string }>(events: readonly E[], today: string, awayOnly = false): E[] {
  const { sat, sun } = nextWeekend(today);
  return events
    .filter((e) => (e.date === sat || e.date === sun) && (!awayOnly || e.homeAway === "FUORI"))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}

/** Steps of the Dirigenza purchases (registry flow of /direzione/acquisti). */
export function purchaseSteps(): string[] {
  return (findArea("acquisti")?.flow ?? []).map(cap);
}
