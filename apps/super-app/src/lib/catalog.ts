/**
 * Configurazione dell'offerta (non dati operativi): pacchetti, asset, categorie.
 * Modificabile dalla Direzione; prezzi non pubblicati finché non definiti.
 */
import type { CrmStage, PriorityLevel } from "./club.types";

export const SPONSOR_PACKAGES = [
  {
    id: "naming",
    nome: "Naming Event",
    tier: "Top",
    pitch: "Il tuo brand dà il nome a un torneo o evento del club.",
    include: ["Naming evento", "Hero sponsorship in app", "Led bordo campo", "Social dedicati"],
  },
  {
    id: "main",
    nome: "Main Partner",
    tier: "Top",
    pitch: "Presenza su divise, app e ogni punto di contatto della stagione.",
    include: ["Divise prima squadra", "Banner app premium", "Ticker sponsor", "Newsletter"],
  },
  {
    id: "team",
    nome: "Team Partner",
    tier: "Plus",
    pitch: "Accompagna una squadra per tutta la stagione.",
    include: ["Divise squadra", "Card match squadra", "Foto ufficiale", "Social"],
  },
  {
    id: "digital",
    nome: "Digital Partner",
    tier: "Plus",
    pitch: "Visibilità misurabile: impression e click in app.",
    include: ["Banner app", "Card evento", "Ticker sponsor", "Report impression"],
  },
  {
    id: "local",
    nome: "Local Partner",
    tier: "Base",
    pitch: "Attività del territorio vicine alle famiglie biancoblù.",
    include: ["Convenzioni tesserati", "Promo in app", "Directory partner"],
  },
  {
    id: "tecnico",
    nome: "Sponsor Tecnico",
    tier: "Plus",
    pitch: "Materiale tecnico, abbigliamento o servizi in cambio merce.",
    include: ["Brand su kit", "Shop ufficiale", "Visibilità eventi"],
  },
] as const;

export const SPONSOR_ASSETS = [
  { id: "banner_app", nome: "Banner app", digitale: true },
  { id: "hero", nome: "Hero sponsorship", digitale: true },
  { id: "card_evento", nome: "Card evento", digitale: true },
  { id: "ticker", nome: "Ticker sponsor", digitale: true },
  { id: "led", nome: "Led bordo campo", digitale: false },
  { id: "torneo", nome: "Torneo", digitale: false },
  { id: "club_house", nome: "Club house", digitale: false },
  { id: "mascotte", nome: "Mascotte Sky", digitale: true },
  { id: "area_giochi", nome: "Area giochi / fitness", digitale: false },
  { id: "divise", nome: "Divise", digitale: false },
  { id: "social", nome: "Social", digitale: true },
  { id: "newsletter", nome: "Newsletter", digitale: true },
] as const;

export const CRM_STAGES: { id: CrmStage; label: string }[] = [
  { id: "NUOVO_LEAD", label: "Nuovo lead" },
  { id: "CONTATTATO", label: "Contattato" },
  { id: "INTERESSATO", label: "Interessato" },
  { id: "PROPOSTA_INVIATA", label: "Proposta inviata" },
  { id: "NEGOZIAZIONE", label: "Negoziazione" },
  { id: "CHIUSO", label: "Chiuso" },
  { id: "PERSO", label: "Perso" },
];

export const SETTORI = [
  "Edilizia / impianti",
  "Commercio",
  "Ristorazione / turismo",
  "Servizi professionali",
  "Industria / artigianato",
  "Salute / benessere",
  "Automotive",
  "Altro",
];

export const BUDGET = ["Da definire", "< 1.000 €", "1.000 – 3.000 €", "3.000 – 10.000 €", "> 10.000 €"];

export const INTERESSI_ATLETA = [
  "Scuola calcio (5-10 anni)",
  "Settore giovanile (11-17 anni)",
  "Prima squadra / adulti",
  "Calcio femminile",
  "Portieri",
  "Non so, voglio informazioni",
];

export const TICKET_CATEGORIES = [
  { id: "notizia", label: "Segnala una notizia" },
  { id: "media", label: "Invia foto/video" },
  { id: "correzione", label: "Correzione risultato/calendario" },
  { id: "evento", label: "Proponi evento" },
  { id: "collaborazione", label: "Proponi collaborazione" },
  { id: "tecnico", label: "Problema tecnico App" },
  { id: "reclamo", label: "Reclamo generico" },
] as const;

export const REQUEST_STATUS_LABEL = {
  ricevuta: "Ricevuta",
  da_contattare: "Da contattare",
  invitato: "Invitato",
  completata: "Completata",
} as const;

export const PRIORITY_LABEL: Record<PriorityLevel, string> = {
  1: "P1 · Emergenze / variazioni ufficiali",
  2: "P2 · Prossima gara / eventi imminenti",
  3: "P3 · Risultati recenti",
  4: "P4 · Eventi e iscrizioni",
  5: "P5 · News ufficiali",
  6: "P6 · Sponsor / partner",
  7: "P7 · Community",
};

/** Revenue engine: moduli predisposti, nessun pagamento attivo. */
export const REVENUE_MODULES = [
  { id: "inventory", nome: "Sponsor inventory", desc: "Slot e periodi per ogni asset." },
  { id: "promo", nome: "Promo partner locali", desc: "Offerte dei partner in app." },
  { id: "coupon", nome: "Convenzioni tesserati", desc: "Coupon riservati a famiglie e atleti." },
  { id: "shop", nome: "Shop ufficiale", desc: "Merchandising e kit gara." },
  { id: "eventi", nome: "Iscrizioni eventi", desc: "Gratuite oggi, quota in futuro." },
  { id: "membership", nome: "Tessera sostenitore", desc: "Membership annuale del tifoso." },
  { id: "donazioni", nome: "Progetti solidali", desc: "Donazioni per progetti del club." },
  { id: "premium", nome: "Contenuti premium sponsor", desc: "Report e contenuti dedicati." },
] as const;

export const AFFILIAZIONI = [
  { nome: "LND", descrizione: "Lega Nazionale Dilettanti" },
  { nome: "FIGC SGS", descrizione: "Settore Giovanile e Scolastico" },
  { nome: "Insieme al Monza", descrizione: "Rete società affiliate AC Monza" },
];

export const CLUB_CONTACTS = {
  pec: "calciocolicoderviese@pec.it",
  safeguardingSubject: "RISERVATO - SAFEGUARDING",
  sede: "Colico (LC) · Alto Lago di Como",
};
