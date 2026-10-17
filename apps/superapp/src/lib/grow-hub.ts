/**
 * Tools of the SCD GROW hub (/grow, internal, same access as /crm): what GROW promises (docs/SCD_GROW_MASTER.md, UD-109,
 * UD-119, UD-142) next to what exists in the app today. Audit of 16/10/2026; a status changes only when the code does.
 * Only routes that exist; tools still to build have no link. No prospect data, no amounts, no names here.
 */

export type GrowToolStatus = "attivo" | "parziale" | "da-fare";
export type GrowAudience = "interna" | "pubblica";

/** Internal routes the hub may link to (all exist in src/routes). */
export type GrowRoute = "/crm" | "/sponsor" | "/fornitori" | "/sostieni" | "/partner";

export interface GrowTool {
  id: string;
  title: string;
  text: string;
  status: GrowToolStatus;
  audience: GrowAudience;
  /** Internal link (TanStack Link); absent for tools still to build or for external/new-tab links. */
  to?: GrowRoute;
  hash?: string;
  /** Plain href opened in a new tab (the LED player runs full screen on the PC of the LED controller). */
  href?: string;
}

export const GROW_STATUS_LABEL: Readonly<Record<GrowToolStatus, string>> = {
  attivo: "Attivo",
  parziale: "In parte",
  "da-fare": "Da fare",
};

export const GROW_AUDIENCE_LABEL: Readonly<Record<GrowAudience, string>> = {
  interna: "Interna",
  pubblica: "Pubblica",
};

export const GROW_AUDIT_DATE = "2026-10-16";

export const GROW_TOOLS: readonly GrowTool[] = [
  {
    id: "pipeline",
    title: "Pipeline e contratti",
    text: "Partner attivi e da rinnovare dal Master Sponsor. Trattative e aziende da contattare: registro da importare.",
    status: "parziale",
    audience: "interna",
    to: "/crm",
  },
  {
    id: "kit",
    title: "Kit partner",
    text: "Per ogni sponsor della stagione: LED dedicato, proposta Sky, maglie, offerta da stampare. Anche per un nuovo partner.",
    status: "attivo",
    audience: "interna",
    to: "/crm",
    hash: "crm-kit-title",
  },
  {
    id: "regia",
    title: "Spot LED in regia",
    text: "Gli spot pronti con stato e flusso di approvazione. Lo stato oggi è nel codice: il registro spot è una migrazione da approvare.",
    status: "parziale",
    audience: "interna",
    to: "/crm",
    hash: "crm-spot-title",
  },
  {
    id: "player",
    title: "Player del LED wall",
    text: "Da aprire a tutto schermo sul PC del LED a bordo campo. Stessa rotazione della pagina sponsor.",
    status: "attivo",
    audience: "interna",
    href: "/ledwall/player",
  },
  {
    id: "sponsor",
    title: "Pagina sponsor",
    text: "LED wall in rotazione, pacchetti, come lavoriamo e domande frequenti.",
    status: "attivo",
    audience: "pubblica",
    to: "/sponsor",
  },
  {
    id: "listino",
    title: "Pacchetti",
    text: "I livelli di partnership con «Parliamone» e le idee da sponsorizzare. Nessun prezzo pubblicato: proposta su misura del Presidente.",
    status: "attivo",
    audience: "pubblica",
    to: "/sponsor",
    hash: "listino",
  },
  {
    id: "proposta",
    title: "Richiesta di proposta",
    text: "Dove arrivano le aziende dalla home. Finché i moduli pubblici sono in pausa apre la mail ufficiale con il pacchetto scelto.",
    status: "parziale",
    audience: "pubblica",
    to: "/sponsor",
    hash: "proposta",
  },
  {
    id: "fornitori",
    title: "Fornitori",
    text: "Le aziende che vogliono proporre prodotti o servizi al club.",
    status: "attivo",
    audience: "pubblica",
    to: "/fornitori",
  },
  {
    id: "sostieni",
    title: "Sostieni e Fondo Solidale",
    text: "Adotta un oggetto o dedica una sponsorizzazione al Fondo Solidale.",
    status: "attivo",
    audience: "pubblica",
    to: "/sostieni",
  },
  {
    id: "partner",
    title: "Area partner",
    text: "La scheda del partner con materiali e rinnovi. Oggi c'è solo la schermata di accesso.",
    status: "da-fare",
    audience: "pubblica",
    to: "/partner",
  },
  {
    id: "ricerca",
    title: "Ricerca nuovi partner",
    text: "Aziende del territorio da verificare e qualificare. Restano interne: un'azienda cercata non è uno sponsor.",
    status: "da-fare",
    audience: "interna",
  },
  {
    id: "report",
    title: "Report per i partner",
    text: "Impression e click di LED, app e pagina sponsor. Da misurare: nessun numero finché non c'è il tracciamento.",
    status: "da-fare",
    audience: "interna",
  },
];

/** Count of tools per status (hub summary line). */
export function growStatusCounts(tools: readonly GrowTool[] = GROW_TOOLS): Record<GrowToolStatus, number> {
  const out: Record<GrowToolStatus, number> = { attivo: 0, parziale: 0, "da-fare": 0 };
  for (const t of tools) out[t.status] += 1;
  return out;
}
