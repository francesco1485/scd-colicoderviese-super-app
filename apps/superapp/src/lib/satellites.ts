/**
 * Satellite areas of the SCD Super App ("web link" per role).
 *
 * Single source for the role gateway (/aree), the Home entry strip and each
 * area landing (/aree/$area). Every area is a route of the SAME app with the
 * SAME login: no new app, no new auth (manifest INV: no duplicate systems).
 *
 * `login` lists the R20 access area actually supported today by
 * `validateAccess` (auth.validate). Areas without a supported login show an
 * honest "in activation" state instead of a fake form.
 */

export type R20Area = "famiglia" | "atleta" | "staff" | "direzione";

/**
 * VERIFIED 10/10/2026 (read-only probe of the live R20 deployment,
 * version 2026.09.28-R20.0-PUBLIC-FIRST): there is no email + PIN login
 * action. `auth.validate` only validates an existing session token
 * ("Sessione non valida"), `auth.request` / `auth.login` answer
 * "Azione API non supportata". Until R20 exposes a login action (decision
 * D3/D34), no area can be entered: the UI must say so instead of showing a
 * form that can never succeed.
 */
export const R20_LOGIN_LIVE = false;

export type SatelliteStatus = "attivo" | "in-attivazione" | "in-progettazione";

export interface Satellite {
  slug: string;
  name: string;
  /** Who enters (plain words, roles from the user's role matrix of 10/10/2026). */
  who: string;
  /** One-line promise shown on the gateway tile. */
  promise: string;
  /** What the area contains once logged in. */
  inside: readonly string[];
  /** Master data the area reads from (no parallel registers). */
  source: string;
  /** R20 login area, or null when the login for this role is not active yet. */
  login: R20Area | null;
  status: SatelliteStatus;
  /** Visual accent token for the tile. */
  tone: "blue" | "sky" | "yellow" | "navy" | "green" | "orange";
  /** Public preview already available without login. */
  preview?: { label: string; to: "/calendario" | "/allenamenti" | "/core/atleta" | "/core/famiglia" | "/core/staff" | "/core" | "/grow" | "/community" | "/core/impianti-calendari" };
}

export const SATELLITES: readonly Satellite[] = [
  {
    slug: "atleta",
    name: "Atleta",
    who: "Atlete e atleti tesserati, dirigenti di annata",
    promise: "La tua annata, i tuoi documenti, la vita del club.",
    inside: ["Calendario e allenamenti della tua annata", "Convocazioni e presenze", "I tuoi documenti e lo stato del certificato", "Sfide di squadra e vita del club"],
    source: "R20 + Master Calendario + registri certificati",
    login: "atleta",
    status: "in-attivazione",
    tone: "sky",
    preview: { label: "Anteprima area atleta", to: "/core/atleta" },
  },
  {
    slug: "famiglia",
    name: "Famiglia",
    who: "Genitori e tutori registrati all'iscrizione",
    promise: "Quello che vede tuo figlio, più lo stato dei pagamenti.",
    inside: ["Annata, calendario e convocazioni dei figli", "Stato quote e rate dei figli", "Documenti e certificati da caricare", "Avvisi importanti del club"],
    source: "R20 + gestionale quote + registri certificati",
    login: "famiglia",
    status: "in-attivazione",
    tone: "blue",
    preview: { label: "Anteprima area famiglia", to: "/core/famiglia" },
  },
  {
    slug: "tifoso",
    name: "Tifoso",
    who: "Sostenitori, ex giocatori, chi ama la SCD",
    promise: "Il club da vicino: partite, sfide, eventi, community.",
    inside: ["Prossime partite e risultati ufficiali", "Sfide e quiz di community", "Eventi e tornei del club", "Card del sostenitore"],
    source: "Master Calendario + Master Tornei & Iniziative",
    login: null,
    status: "in-progettazione",
    tone: "yellow",
    preview: { label: "Community", to: "/community" },
  },
  {
    slug: "staff",
    name: "Staff tecnico",
    who: "Responsabili, mister, dirigenti accompagnatori",
    promise: "La tua squadra, il quadro allenamenti, le richieste.",
    inside: ["Calendario e quadro allenamenti con modifiche per il tuo ruolo", "Ragazzi e annate assegnati", "Richieste campi e variazioni", "I tuoi pagamenti e documenti"],
    source: "R20 + Quadro allenamenti + Master Calendario (richieste)",
    login: "staff",
    status: "in-attivazione",
    tone: "green",
    preview: { label: "Anteprima area staff", to: "/core/staff" },
  },
  {
    slug: "segreteria",
    name: "Segreteria",
    who: "Segreteria sportiva e tesseramenti",
    promise: "Tesseramenti, distinte, modulistica e scadenze.",
    inside: ["Tesseramenti e matricole FIGC", "Distinte e modulistica compilabile", "Certificati: scadenze e promemoria", "Comunicazioni FIGC, LND, SGS"],
    source: "04_TESSERATI + Database Iscrizioni + registri certificati",
    login: null,
    status: "in-attivazione",
    tone: "navy",
  },
  {
    slug: "tesoreria",
    name: "Tesoreria",
    who: "Tesoreria della società",
    promise: "Quote, Fondo, kit, pulmini, Club House: un solo quadro.",
    inside: ["Quote e rate per atleta", "Fondo solidale e agevolazioni", "Kit, pulmini, Club House Colico e Dervio", "Compensi e rimborsi da approvare"],
    source: "Gestionale quote + Fondo + Cassa (fogli esistenti)",
    login: null,
    status: "in-attivazione",
    tone: "navy",
  },
  {
    slug: "pulmini",
    name: "Pulmini",
    who: "Responsabile trasporti e autisti",
    promise: "Mezzi, autisti, corse e posti a sedere.",
    inside: ["Corse della settimana", "Assegnazione autisti e mezzi", "Posti e passeggeri (solo chi serve)", "Richieste e cambi"],
    source: "Master Pulmini",
    login: null,
    status: "in-attivazione",
    tone: "orange",
  },
  {
    slug: "direzione",
    name: "Direzione",
    who: "Direttore generale e presidente",
    promise: "La società in un colpo d'occhio: gestionale, calendario, sponsor.",
    inside: ["Oggi e attenzione: cosa richiede una decisione", "Approvazioni e richieste", "Calendario, impianti e rotazione campi", "Sponsor e CRM"],
    source: "R20 + tutti i fogli master",
    login: "direzione",
    status: "in-attivazione",
    tone: "navy",
    preview: { label: "Anteprima gestionale", to: "/core" },
  },
  {
    slug: "sponsor",
    name: "Sponsor e partner",
    who: "Aziende partner e chi vuole diventarlo",
    promise: "Visibilità sul territorio, LED, maglie, eventi.",
    inside: ["La tua scheda partner", "Materiali e spazi (LED, maglie, eventi)", "Proposte e rinnovi", "Valore della visibilità"],
    source: "MASTER CONTATTI MAIL (CRM) + Master Sponsor",
    login: null,
    status: "in-progettazione",
    tone: "yellow",
    preview: { label: "Diventa partner", to: "/grow" },
  },
] as const;

export const STATUS_LABEL: Record<SatelliteStatus, string> = {
  attivo: "Accesso attivo",
  "in-attivazione": "Accesso in attivazione",
  "in-progettazione": "In arrivo",
};

export function findSatellite(slug: string): Satellite | undefined {
  return SATELLITES.find((s) => s.slug === slug);
}

/** Satellites mapped to an R20 access area (ready as soon as R20 login is live). */
export function loginSatellites(): Satellite[] {
  return SATELLITES.filter((s) => s.login !== null);
}

/** True only when the area can really be entered today. */
export function canEnter(s: Satellite): boolean {
  return R20_LOGIN_LIVE && s.login !== null && s.status === "attivo";
}
