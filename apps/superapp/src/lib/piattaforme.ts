/**
 * The 26 platforms of the internal gestionale (Francesco, DG, 16/10/2026 22:58, SCD_COMANDI_PERMANENTI §1).
 *
 * One typed map from each platform (dossier docs/piattaforme/NN-*.md, owners in .claude/agents/PIPELINE.md §0)
 * to what really exists in the app today:
 * - "live": a page devoted to the platform exists (VERIFIED against the route tree in piattaforme.test.ts);
 * - "parziale": an existing page hosts part of the platform, the rest is still to build;
 * - "in-costruzione": no page existed on 17/10/2026; the platform has its starter page under
 *   /gestionale/piattaforme/<slug> (purpose, owner, what you can do today, what arrives next, data sources).
 *
 * This is a map, not a second registry: access stays with the existing gates (work-area gate of each page,
 * src/lib/work-areas.functions.ts); `audiences` only drives the role filter of the hub and is INFERRED from
 * each page's own description. No personal data, no amounts, no minors' names: unknown is «da confermare».
 */
import type { FileRoutesByTo } from "@/routeTree.gen";

/** Every path the router knows (generated route tree): routes and actions are typed against it. */
export type AppPath = keyof FileRoutesByTo;

export type PlatformStatus = "live" | "parziale" | "in-costruzione";

export type SectorId = "persone" | "campo" | "struttura" | "soldi" | "crescita";

export interface Sector {
  id: SectorId;
  label: string;
  /** Sector director agent (PIPELINE.md §0, level 3). */
  director: string;
}

/** The 5 sector directors of PIPELINE.md §0, in the order of the hub. */
export const SECTORS: readonly Sector[] = [
  { id: "persone", label: "Persone e società", director: "scd-segreteria" },
  { id: "campo", label: "Campo", director: "scd-squadre" },
  { id: "struttura", label: "Struttura e servizi", director: "scd-impianti" },
  { id: "soldi", label: "Soldi", director: "scd-cfo" },
  { id: "crescita", label: "Crescita e comunicazione", director: "scd-commerciale" },
];

export type AudienceId = "direzione" | "segreteria" | "tesoreria" | "mister" | "responsabili" | "soci";

/** Role filter of the hub (view aid only: the server gate of every page decides). */
export const AUDIENCES: readonly { id: AudienceId; label: string }[] = [
  { id: "direzione", label: "Direzione" },
  { id: "segreteria", label: "Segreteria" },
  { id: "tesoreria", label: "Tesoreria" },
  { id: "mister", label: "Mister e dirigenti" },
  { id: "responsabili", label: "Responsabili di area" },
  { id: "soci", label: "Soci e famiglie" },
];

export type Engine = "SOLDI" | "PERSONE" | "TEMPO";

export type PlatformIcon =
  | "bus"
  | "wallet"
  | "clipboard"
  | "handshake"
  | "trophy"
  | "stethoscope"
  | "coffee"
  | "dumbbell"
  | "building"
  | "calendar"
  | "repeat"
  | "apple"
  | "clapperboard"
  | "user"
  | "medal"
  | "puzzle"
  | "search-user"
  | "newspaper"
  | "percent"
  | "shirt"
  | "package"
  | "chart"
  | "file-search"
  | "heart"
  | "gift"
  | "lightbulb";

export interface PlatformAction {
  label: string;
  /** Existing route of the app (typed against the generated route tree). */
  to: AppPath;
}

export interface PlannedItem {
  /** Row id of docs/piattaforme/IDEE.md. */
  idea: string;
  text: string;
  /** State as written in IDEE.md (Pronta, Serve ok…). */
  state: string;
}

/** Content of a starter page (only for platforms with no page before 17/10/2026). */
export interface StarterContent {
  /** What arrives next, from docs/piattaforme/IDEE.md; empty = decided at the next Cantiere cycle. */
  next: readonly PlannedItem[];
  /** Master sheets, Drive folders or tables by name only (no links, no personal data). */
  sources: readonly { name: string; note: string }[];
  /** The club person in charge: never invented. */
  person: string;
}

export interface Platform {
  /** "01" … "26", as in the dossier file name. */
  id: string;
  /** Name exactly as the dossier title. */
  name: string;
  slug: string;
  /** Dossier file in docs/piattaforme/. */
  dossier: string;
  sector: SectorId;
  /** Responsible agent (PIPELINE.md §0). */
  responsible: string;
  support: readonly string[];
  /** Route to open today (typed against the generated route tree). */
  route: AppPath;
  status: PlatformStatus;
  purpose: string;
  /** 2-3 things a user can do today, each on an existing route. */
  today: readonly PlatformAction[];
  audiences: readonly AudienceId[];
  icon: PlatformIcon;
  engine: Engine;
  measure: string;
  starter?: StarterContent;
  /** Set when the platform's page is owned by another agent outside this map (no starter page here). */
  builtElsewhere?: string;
}

export const STARTER_BASE = "/gestionale/piattaforme";
export const HUB_PATH: AppPath = "/gestionale/piattaforme";
export const UNKNOWN = "da confermare";

type StarterSlug = AppPath extends infer P ? (P extends `${typeof STARTER_BASE}/${infer S}` ? S : never) : never;
/** Starter path; the slug is constrained to the starter routes of the tree, so the result is a known path. */
const starterPath = (slug: StarterSlug): AppPath => `${STARTER_BASE}/${slug}` as AppPath;

/** Shared «Chiedi» path: the existing improvement / request form (UD-113), read by the staff. */
export const ASK_PATH: AppPath = "/sostieni/proponi";

export const PLATFORMS: readonly Platform[] = [
  {
    id: "01", name: "Servizio pulmini", slug: "servizio-pulmini", dossier: "01-servizio-pulmini.md",
    sector: "struttura", responsible: "scd-pulmini", support: ["scd-squadre", "scd-tesoreria"],
    route: "/pulmini", status: "live",
    purpose: "Trasferte del weekend, flotta e richieste di posto sul pulmino.",
    today: [
      { label: "Vedi le trasferte del weekend e la flotta", to: "/pulmini" },
      { label: "Controlla le gare in calendario", to: "/calendario" },
    ],
    audiences: ["direzione", "responsabili", "segreteria"], icon: "bus",
    engine: "TEMPO", measure: "trasferte del weekend con pulmino deciso 48 ore prima",
  },
  {
    id: "02", name: "Tesoreria", slug: "tesoreria", dossier: "02-tesoreria.md",
    sector: "soldi", responsible: "scd-tesoreria", support: ["scd-cfo", "scd-rendicontazione"],
    route: "/tesoreria", status: "live",
    purpose: "Sottoaree della cassa: quote, movimenti, fornitori, compensi, Club House e biglietteria.",
    today: [
      { label: "Apri le sottoaree della tesoreria", to: "/tesoreria" },
      { label: "Quote della stagione e rate", to: "/tesoreria/quote" },
      { label: "Fornitori e scadenze", to: "/tesoreria/fornitori" },
    ],
    audiences: ["direzione", "tesoreria"], icon: "wallet",
    engine: "SOLDI", measure: "quote scadute sul totale dovuto, a fine mese",
  },
  {
    id: "03", name: "Segreteria", slug: "segreteria", dossier: "03-segreteria.md",
    sector: "persone", responsible: "scd-segreteria", support: ["scd-tesserati", "scd-figc-lnd", "scd-documenti"],
    route: "/segreteria", status: "live",
    purpose: "Code di lavoro della segreteria: persone, certificati, richieste delle squadre, scadenze.",
    today: [
      { label: "Code di lavoro e gare del weekend", to: "/segreteria" },
      { label: "Persone del club con ruolo e storico", to: "/segreteria/persone" },
      { label: "Certificati medici per squadra", to: "/segreteria/certificati" },
    ],
    audiences: ["direzione", "segreteria"], icon: "clipboard",
    engine: "TEMPO", measure: "pratiche chiuse a settimana e certificati scaduti",
  },
  {
    id: "04", name: "Sponsor", slug: "sponsor", dossier: "04-sponsor.md",
    sector: "crescita", responsible: "scd-sponsor", support: ["scd-commerciale", "scd-ledwall"],
    route: "/grow", status: "live",
    purpose: "SCD GROW: pipeline sponsor, kit partner, spot LED e copertura degli sponsor.",
    today: [
      { label: "Strumenti commerciali di SCD GROW", to: "/grow" },
      { label: "Pipeline sponsor e contatti", to: "/crm" },
      { label: "Pagina pubblica degli sponsor", to: "/sponsor" },
    ],
    audiences: ["direzione", "responsabili"], icon: "handshake",
    engine: "SOLDI", measure: "contratti sponsor firmati per stagione",
  },
  {
    id: "05", name: "Tornei ed eventi", slug: "tornei-ed-eventi", dossier: "05-tornei-ed-eventi.md",
    sector: "campo", responsible: "scd-tornei", support: ["scd-negoziazione", "scd-commerciale", "scd-impianti"],
    route: "/eventi", status: "live",
    purpose: "Tornei, iniziative ed eventi del club nella stagione.",
    today: [
      { label: "Tornei, iniziative ed eventi", to: "/eventi" },
      { label: "Planning annuale con tornei e scadenze", to: "/gestionale/planning" },
      { label: "Iscrizioni ai tornei nella Vetrina richieste", to: "/gestionale/richieste" },
    ],
    audiences: ["direzione", "segreteria", "responsabili", "mister", "soci"], icon: "trophy",
    engine: "PERSONE", measure: "squadre iscritte e presenze per torneo",
  },
  {
    id: "06", name: "Infermeria", slug: "infermeria", dossier: "06-infermeria.md",
    sector: "struttura", responsible: "scd-infermeria", support: ["scd-legale"],
    route: "/infermeria", status: "live",
    purpose: "Scadenze dei certificati per squadra, cassette di primo soccorso e defibrillatori per sede.",
    today: [
      { label: "Certificati, cassette e DAE", to: "/infermeria" },
      { label: "Dona materiale per l'infermeria", to: "/sostieni/dona-materiale" },
    ],
    audiences: ["direzione", "responsabili"], icon: "stethoscope",
    engine: "TEMPO", measure: "certificati in scadenza nei 30 giorni gestiti prima della scadenza",
  },
  {
    id: "07", name: "Club House Colico e Dervio", slug: "club-house", dossier: "07-club-house-colico-e-dervio.md",
    sector: "struttura", responsible: "scd-clubhouse", support: ["scd-tesoreria", "scd-community", "scd-convenzioni"],
    route: "/tesoreria/club-house", status: "parziale",
    purpose: "Cassa del bar, orari di Colico e Dervio, listino e menu per gruppi (inserimento r115 da attivare) e serate della Club House.",
    today: [
      { label: "Cassa e inserimento di orari, listino e menu per gruppi", to: "/tesoreria/club-house" },
      { label: "Orari, listino e menu in pubblico", to: "/impianti" },
      { label: "Serate Club House in Attività in struttura", to: "/gestionale/struttura" },
    ],
    audiences: ["direzione", "tesoreria", "responsabili"], icon: "coffee",
    engine: "SOLDI", measure: "serate Club House al mese",
  },
  {
    id: "08", name: "Palestra", slug: "palestra", dossier: "08-palestra.md",
    sector: "struttura", responsible: "scd-palestra", support: ["scd-impianti", "scd-infermeria", "scd-sociale"],
    route: starterPath("palestra"), status: "in-costruzione",
    purpose: "La palestra del club: attività in struttura, materiale da donare e regole d'uso.",
    today: [
      { label: "Attività della palestra in Attività in struttura", to: "/gestionale/struttura" },
      { label: "Campagna «Adotta la nuova palestra SCD»", to: "/sostieni/dona-materiale" },
      { label: "Chiedi o proponi un miglioramento", to: ASK_PATH },
    ],
    audiences: ["direzione", "responsabili", "mister"], icon: "dumbbell",
    engine: "PERSONE", measure: "attività in palestra registrate a settimana in Attività in struttura",
    starter: {
      next: [
        { idea: "I-261017-20", text: "Il personaggio del servizio si presenta nella vetrina e propone la palestra con un'azione (UD-148)", state: "Pronta" },
      ],
      sources: [
        { name: "Sedi e impianti", note: "master impianti di Colico e Dervio" },
        { name: "Supabase SCD · attività in struttura", note: "area Palestra (r135, applicata il 16/10/2026)" },
        { name: "Inserimenti a Sky", note: "registro delle proposte di inserimento" },
      ],
      person: UNKNOWN,
    },
  },
  {
    id: "09", name: "Centro sportivo Colico e Dervio", slug: "centro-sportivo", dossier: "09-centro-sportivo-colico-e-dervio.md",
    sector: "struttura", responsible: "scd-impianti", support: ["scd-negoziazione"],
    route: "/gestionale/mappa", status: "live",
    purpose: "Mappa dei centri di Colico e Dervio: spazi, ingressi, campi e spogliatoi in uso.",
    today: [
      { label: "Mappa impianti con spazi e ingressi", to: "/gestionale/mappa" },
      { label: "Settimana dei centri: turni, aperture, serate", to: "/gestionale/struttura" },
      { label: "Come arrivare ai campi", to: "/impianti" },
    ],
    audiences: ["direzione", "segreteria", "responsabili", "mister"], icon: "building",
    engine: "TEMPO", measure: "spazi del master con orari e ingressi compilati",
  },
  {
    id: "10", name: "Quadro allenamenti settimanale", slug: "quadro-allenamenti", dossier: "10-quadro-allenamenti-settimanale.md",
    sector: "campo", responsible: "scd-squadre", support: ["scd-atleti", "scd-impianti"],
    route: "/quadro", status: "live",
    purpose: "Campi e spogliatoi della settimana dal quadro allenamenti.",
    today: [
      { label: "Quadro settimanale per campo", to: "/quadro" },
      { label: "Orari di allenamento per le famiglie", to: "/allenamenti" },
    ],
    audiences: ["direzione", "segreteria", "mister", "responsabili", "soci"], icon: "calendar",
    engine: "TEMPO", measure: "sovrapposizioni sullo stesso campo per settimana",
  },
  {
    id: "11", name: "Rotazione campi (Colico 1, Colico 2, Dervio)", slug: "rotazione-campi", dossier: "11-rotazione-campi-colico-1-colico-2-dervio.md",
    sector: "campo", responsible: "scd-impianti", support: ["scd-squadre", "scd-figc-lnd"],
    route: "/gestionale/impianti", status: "live",
    purpose: "Rotazioni, simulazioni, affitti a terzi ed eventi sui campi di Colico e Dervio.",
    today: [
      { label: "Impianti e campi", to: "/gestionale/impianti" },
      { label: "Simula una rotazione Colico/Dervio", to: "/gestionale/impianti/simulazione" },
      { label: "Nuova prenotazione da approvare", to: "/gestionale/impianti/nuova" },
    ],
    audiences: ["direzione", "responsabili"], icon: "repeat",
    engine: "TEMPO", measure: "gare spostate su Dervio con preavviso di un mese",
  },
  {
    id: "12", name: "Nutrizionista", slug: "nutrizionista", dossier: "12-nutrizionista.md",
    sector: "struttura", responsible: "scd-nutrizione", support: ["scd-infermeria", "scd-legale"],
    route: "/nutrizionista", status: "live",
    purpose: "Consigli generali per fascia d'età e richieste di consulenza, senza piani personali.",
    today: [
      { label: "Consigli per fascia d'età", to: "/nutrizionista" },
      { label: "Chiedi una consulenza", to: "/nutrizionista" },
    ],
    audiences: ["direzione", "responsabili", "soci"], icon: "apple",
    engine: "PERSONE", measure: "richieste di consulenza al mese",
  },
  {
    id: "13", name: "Social e video", slug: "social-e-video", dossier: "13-social-e-video.md",
    sector: "crescita", responsible: "scd-social", support: ["scd-comunicazione", "scd-avatar", "scd-crescita"],
    route: "/crea", status: "parziale",
    purpose: "Post del club con approvazione della Direzione; video e dirette ancora da collegare.",
    today: [
      { label: "Crea un post per la Direzione", to: "/crea" },
      { label: "Novità e social del club", to: "/comunicazioni" },
    ],
    audiences: ["direzione", "mister", "responsabili"], icon: "clapperboard",
    engine: "PERSONE", measure: "post approvati a settimana",
  },
  {
    id: "14", name: "Avatar", slug: "avatar", dossier: "14-avatar.md",
    sector: "crescita", responsible: "scd-avatar", support: ["scd-grafica", "scd-community"],
    route: "/la-mia-scd/campione", status: "live",
    purpose: "«Crea il tuo campione»: avatar e card digitali nell'area soci.",
    today: [
      { label: "Crea il tuo campione", to: "/la-mia-scd/campione" },
      { label: "Le card del club", to: "/card" },
    ],
    audiences: ["soci", "direzione"], icon: "user",
    engine: "PERSONE", measure: "avatar creati a settimana",
  },
  {
    id: "15", name: "Fantacalcio", slug: "fantacalcio", dossier: "15-fantacalcio.md",
    sector: "campo", responsible: "scd-community", support: ["scd-atleti"],
    route: "/fantacalcio", status: "live",
    purpose: "Fantacalcio gratuito sulle squadre agonistiche, punti solo dai referti dello staff.",
    today: [
      { label: "Fai la tua squadra", to: "/fantacalcio" },
      { label: "Vota la Top 11 della settimana", to: "/top11" },
    ],
    audiences: ["soci"], icon: "medal",
    engine: "PERSONE", measure: "squadre di fantacalcio salvate a settimana",
  },
  {
    id: "16", name: "Giochi interattivi", slug: "giochi-interattivi", dossier: "16-giochi-interattivi.md",
    sector: "crescita", responsible: "scd-community", support: ["scd-crescita", "scd-relazioni"],
    route: "/community", status: "parziale",
    purpose: "Comunità: gioca, segui, partecipa. Quiz e sfida della settimana ancora da costruire.",
    today: [
      { label: "Comunità e giochi", to: "/community" },
      { label: "Top 11 della settimana", to: "/top11" },
    ],
    audiences: ["soci"], icon: "puzzle",
    engine: "PERSONE", measure: "account che giocano almeno una volta a settimana",
  },
  {
    id: "17", name: "Vetta Legnone · Ricerca calciatori", slug: "vetta-legnone", dossier: "17-ricerca-calciatori-e-iscriviti-come-calc.md",
    sector: "campo", responsible: "scd-scouting", support: ["scd-tesserati", "scd-legale"],
    route: "/vetta-legnone", status: "live", builtElsewhere: "vetrina pubblica su /vetta-legnone",
    purpose: "Vetta Legnone: vetrina pubblica della ricerca calciatori e richiesta di prova; profili in arrivo.",
    today: [
      { label: "Vetrina Vetta Legnone", to: "/vetta-legnone" },
      { label: "Richiedi una prova o l'open day", to: "/entra" },
      { label: "Rose delle squadre", to: "/squadre" },
    ],
    audiences: ["direzione", "segreteria", "mister", "soci"], icon: "search-user",
    engine: "PERSONE", measure: "richieste di prova al mese e quante diventano iscrizioni",
  },
  {
    id: "18", name: "News e grandi notizie", slug: "news", dossier: "18-news-e-grandi-notizie.md",
    sector: "crescita", responsible: "scd-super-giornalista", support: ["scd-comunicazione", "scd-social"],
    route: "/comunicazioni", status: "live",
    purpose: "Novità del club, calendario e rassegna stampa.",
    today: [
      { label: "Novità e comunicazioni", to: "/comunicazioni" },
      { label: "Rassegna stampa", to: "/rassegna-stampa" },
    ],
    audiences: ["direzione", "segreteria", "mister", "responsabili", "soci"], icon: "newspaper",
    engine: "PERSONE", measure: "notizie pubblicate a settimana",
  },
  {
    id: "19", name: "Convenzioni", slug: "convenzioni", dossier: "19-convenzioni.md",
    sector: "crescita", responsible: "scd-convenzioni", support: ["scd-commerciale", "scd-sponsor"],
    route: starterPath("convenzioni"), status: "in-costruzione",
    purpose: "Accordi con attività del territorio a favore di soci e famiglie, collegati alle card del club.",
    today: [
      { label: "Convenzioni e card in pubblico", to: "/card" },
      { label: "Richieste di convenzione nella Vetrina richieste", to: "/gestionale/richieste" },
      { label: "Chiedi o proponi una convenzione", to: ASK_PATH },
    ],
    audiences: ["direzione", "segreteria", "responsabili"], icon: "percent",
    engine: "SOLDI", measure: "richieste di convenzione ricevute e accettate al mese",
    starter: {
      next: [
        { idea: "I-261017-14", text: "Convenzioni con il territorio: Forte Montecchio Nord, battelli, scuole vela e windsurf", state: "Serve ok (contatti con terzi)" },
      ],
      sources: [
        { name: "MASTER CONTATTI", note: "registro unico dei contatti" },
        { name: "Master Sponsor", note: "partner già legati al club" },
        { name: "Supabase SCD · richieste esterne", note: "tipo «convenzione» della Vetrina richieste" },
      ],
      person: UNKNOWN,
    },
  },
  {
    id: "20", name: "Magazzino abbigliamento", slug: "magazzino-abbigliamento", dossier: "20-magazzino-abbigliamento.md",
    sector: "struttura", responsible: "scd-magazzino", support: ["scd-tesoreria"],
    route: "/magazzino", status: "live",
    purpose: "Ordine kit per squadra e taglia e consegne, senza nomi.",
    today: [
      { label: "Ordine kit per squadra e taglia", to: "/magazzino" },
      { label: "Kit ufficiale 2026/27", to: "/kit" },
    ],
    audiences: ["direzione", "segreteria", "tesoreria", "responsabili"], icon: "shirt",
    engine: "TEMPO", measure: "taglie mancanti per squadra",
  },
  {
    id: "21", name: "Magazzino attrezzature", slug: "magazzino-attrezzature", dossier: "21-magazzino-attrezzature.md",
    sector: "struttura", responsible: "scd-magazzino", support: ["scd-impianti"],
    route: starterPath("magazzino-attrezzature"), status: "in-costruzione",
    purpose: "Attrezzature sportive dei centri: cosa c'è, dove si trova, cosa manca.",
    today: [
      { label: "Spazi e depositi sulla mappa impianti", to: "/gestionale/mappa" },
      { label: "Materiale donato al club", to: "/sostieni/dona-materiale" },
      { label: "Chiedi o segnala un bisogno", to: ASK_PATH },
    ],
    audiences: ["direzione", "responsabili", "mister"], icon: "package",
    engine: "TEMPO", measure: "richieste di materiale chiuse entro 7 giorni",
    starter: {
      next: [],
      sources: [
        { name: "Sedi e impianti", note: "spazi e depositi di Colico e Dervio" },
        { name: "Inventario attrezzature", note: UNKNOWN },
        { name: "Inserimenti a Sky", note: "registro delle proposte di inserimento" },
      ],
      person: UNKNOWN,
    },
  },
  {
    id: "22", name: "Meta: analisi andamento app e web", slug: "meta-analisi", dossier: "22-meta-analisi-andamento-app-e-web.md",
    sector: "crescita", responsible: "scd-analisi", support: ["scd-crescita", "scd-sviluppo"],
    route: starterPath("meta-analisi"), status: "in-costruzione",
    purpose: "Come va l'app e il sito: visite, pagine e accessi, solo in forma aggregata.",
    today: [
      { label: "Accessi all'app per ruolo", to: "/direzione/accessi" },
      { label: "Proposte di miglioramento arrivate", to: "/direzione/proposte" },
    ],
    audiences: ["direzione"], icon: "chart",
    engine: "PERSONE", measure: "visite al giorno e account attivi a settimana, quando il contatore sarà approvato",
    starter: {
      next: [
        { idea: "I-261017-01", text: "Contatore anonimo delle visite, senza cookie né dati personali: visite al giorno e pagine più viste", state: "Serve ok («ok contatore» + «applica rNNN»)" },
        { idea: "I-261017-28", text: "Cruscotto Direzione con riquadri numerici calcolati e datati, solo conteggi aggregati senza nomi", state: "Pronta (Serve ok se servono letture o permessi nuovi)" },
      ],
      sources: [
        { name: "Supabase SCD · persone, ruoli e storico", note: "solo conteggi aggregati" },
        { name: "Statistiche del sito", note: UNKNOWN },
      ],
      person: UNKNOWN,
    },
  },
  {
    id: "23", name: "Bandi e ricerca", slug: "bandi-e-ricerca", dossier: "23-bandi-e-ricerca.md",
    sector: "soldi", responsible: "scd-bandi", support: ["scd-rendicontazione", "scd-legale"],
    route: starterPath("bandi-e-ricerca"), status: "in-costruzione",
    purpose: "Bandi e contributi per lo sport: scadenze, requisiti, domande e rendiconti.",
    today: [
      { label: "Cerca bandi e documenti nel Cervellone", to: "/direzione/cervellone" },
      { label: "Scadenze nel Planning annuale", to: "/gestionale/planning" },
      { label: "Segnala un bando", to: ASK_PATH },
    ],
    audiences: ["direzione", "tesoreria", "segreteria"], icon: "file-search",
    engine: "SOLDI", measure: "bandi individuati, presentati e finanziati per stagione",
    starter: {
      next: [],
      sources: [
        { name: "SCD CERVELLONE · Catalogo e Memoria (Drive)", note: "documenti agli atti della società" },
        { name: "Gestionale economico", note: "per rendiconti e cofinanziamenti" },
        { name: "Registro dei bandi", note: UNKNOWN },
      ],
      person: UNKNOWN,
    },
  },
  {
    id: "24", name: "Fondo Solidale", slug: "fondo-solidale", dossier: "24-fondo-solidale.md",
    sector: "soldi", responsible: "scd-sociale", support: ["scd-tesoreria", "scd-legale"],
    route: "/tesoreria/fondo-solidale", status: "live",
    purpose: "Gestionale del Fondo Solidale e pagina pubblica con i testi della Direzione.",
    today: [
      { label: "Gestionale del Fondo Solidale", to: "/tesoreria/fondo-solidale" },
      { label: "Pagina pubblica del Fondo", to: "/sostieni/fondo-solidale" },
    ],
    audiences: ["direzione", "tesoreria", "soci"], icon: "heart",
    engine: "SOLDI", measure: "richieste di aiuto gestite per stagione",
  },
  {
    id: "25", name: "Dona e adotta", slug: "dona-e-adotta", dossier: "25-dona-e-adotta.md",
    sector: "soldi", responsible: "scd-sociale", support: ["scd-sponsor", "scd-tesoreria"],
    route: "/sostieni", status: "live",
    purpose: "Sostieni il club: Adotta un oggetto, dona materiale, proponi un miglioramento.",
    today: [
      { label: "Sostieni il club", to: "/sostieni" },
      { label: "Catalogo «Adotta un oggetto»", to: "/direzione/adotta" },
      { label: "Dona materiale", to: "/sostieni/dona-materiale" },
    ],
    audiences: ["direzione", "tesoreria", "soci"], icon: "gift",
    engine: "SOLDI", measure: "oggetti adottati e offerte di materiale accettate al mese",
  },
  {
    id: "26", name: "Analizza e ricerca idee e sviluppo", slug: "idee-e-sviluppo", dossier: "26-analizza-e-ricerca-idee-e-sviluppo.md",
    sector: "persone", responsible: "scd-stratega", support: ["scd-skill", "scd-crescita"],
    route: "/direzione/proposte", status: "parziale",
    purpose: "Proposte di miglioramento arrivate da tutti e coda di lavoro; l'elenco unico delle idee è nel Cantiere.",
    today: [
      { label: "Proposte di miglioramento da valutare", to: "/direzione/proposte" },
      { label: "Coda di lavoro del gestionale", to: "/gestionale/coda" },
      { label: "Proponi un'idea", to: ASK_PATH },
    ],
    audiences: ["direzione", "segreteria", "soci"], icon: "lightbulb",
    engine: "TEMPO", measure: "idee decise (fatte o scartate) a settimana",
  },
];

/**
 * Plain Italian names of the agents shown to the staff (ids stay in the dossiers and PIPELINE.md §0).
 * Every agent used in PLATFORMS and SECTORS has a label (piattaforme.test.ts).
 */
export const AGENT_LABEL: Readonly<Record<string, string>> = {
  "scd-segreteria": "Segreteria",
  "scd-squadre": "Squadre",
  "scd-impianti": "Impianti e campi",
  "scd-cfo": "Direzione finanziaria",
  "scd-commerciale": "Commerciale",
  "scd-pulmini": "Pulmini",
  "scd-tesoreria": "Tesoreria",
  "scd-rendicontazione": "Rendicontazione",
  "scd-tesserati": "Tesseramenti",
  "scd-figc-lnd": "FIGC e LND",
  "scd-documenti": "Documenti",
  "scd-sponsor": "Sponsor",
  "scd-ledwall": "Ledwall",
  "scd-tornei": "Tornei",
  "scd-negoziazione": "Trattative",
  "scd-infermeria": "Infermeria",
  "scd-legale": "Consulenza legale",
  "scd-clubhouse": "Club House",
  "scd-community": "Comunità",
  "scd-convenzioni": "Convenzioni",
  "scd-palestra": "Palestra",
  "scd-sociale": "Solidarietà",
  "scd-atleti": "Atleti",
  "scd-nutrizione": "Nutrizione",
  "scd-social": "Social",
  "scd-comunicazione": "Comunicazione",
  "scd-avatar": "Avatar e personaggi",
  "scd-crescita": "Crescita",
  "scd-grafica": "Grafica",
  "scd-relazioni": "Relazioni",
  "scd-scouting": "Osservatori",
  "scd-super-giornalista": "Redazione",
  "scd-magazzino": "Magazzino",
  "scd-analisi": "Analisi",
  "scd-sviluppo": "Sviluppo",
  "scd-bandi": "Bandi",
  "scd-stratega": "Strategia",
  "scd-skill": "Competenze",
};

/** «Assistente Segreteria» for "scd-segreteria"; an unknown id is never shown raw. */
export function agentLabel(id: string): string {
  const l = AGENT_LABEL[id];
  return l ? `Assistente ${l}` : "Assistente da confermare";
}

export const STATUS_LABEL: Readonly<Record<PlatformStatus, string>> = {
  live: "Attiva",
  parziale: "In parte",
  "in-costruzione": "In costruzione",
};

export function sectorOf(id: SectorId): Sector {
  const s = SECTORS.find((x) => x.id === id);
  if (!s) throw new Error(`Unknown sector "${id}"`);
  return s;
}

export function findPlatformBySlug(slug: string): Platform | undefined {
  return PLATFORMS.find((p) => p.slug === slug);
}

/** Platform by slug, for the starter routes: throws on a typo so the build never ships a blank page. */
export function platformBySlug(slug: string): Platform {
  const p = findPlatformBySlug(slug);
  if (!p) throw new Error(`Unknown platform "${slug}"`);
  return p;
}

export function statusCounts(list: readonly Platform[] = PLATFORMS): Record<PlatformStatus, number> {
  const out: Record<PlatformStatus, number> = { live: 0, parziale: 0, "in-costruzione": 0 };
  for (const p of list) out[p.status] += 1;
  return out;
}

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Hub filter: role (null = all) and free text on number, name, purpose, actions, agent. */
export function filterPlatforms(
  query: string,
  audience: AudienceId | null,
  list: readonly Platform[] = PLATFORMS,
): Platform[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  return list.filter((p) => {
    if (audience && !p.audiences.includes(audience)) return false;
    if (words.length === 0) return true;
    const hay = fold([p.id, String(Number(p.id)), p.name, p.purpose, p.responsible, sectorOf(p.sector).label, ...p.today.map((a) => a.label)].join(" "));
    return words.every((w) => hay.includes(w));
  });
}

/** Platforms of a sector, in dossier order. */
export function bySector(list: readonly Platform[]): { sector: Sector; items: Platform[] }[] {
  return SECTORS.map((sector) => ({ sector, items: list.filter((p) => p.sector === sector.id) })).filter((g) => g.items.length > 0);
}
