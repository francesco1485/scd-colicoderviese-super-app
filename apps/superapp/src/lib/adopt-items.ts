/**
 * "Adotta un oggetto" (UD-113, Direzione 14/10/2026 11:09): a catalogue of things the club needs, each with a price,
 * a picture and a state (da adottare / adottato / consegnato), open to families, fans and companies. Whoever adopts
 * gets a recognition (plate, thanks on social media only with consent, certificate). Money goes to the treasury with
 * a receipt; companies move into the sponsor CRM (GROW).
 *
 * Pure logic shared by the public page and tests. Rules kept here on purpose:
 * - No invented prices: an item without a price set by the Direzione shows "valore indicato dalla società".
 * - No online payment: adopting = writing to the club's official mailbox with a prefilled subject; the treasury
 *   issues the receipt. Public forms stay paused (src/lib/public-forms.ts).
 * - Adopters are named publicly ONLY with consent (`publicName` is set by the Direzione after consent); families
 *   are never named by default and minors never appear.
 * - The live states will come from `scd_adopt_items` (staged migration r101, NOT APPLIED). Until then every item is
 *   "da adottare" and the page says so.
 */
import { CLUB_PROFILE } from "./club-profile";

export type AdoptState =
  "DA_ADOTTARE" | "IN_ADOZIONE" | "ADOTTATO" | "CONSEGNATO";

export type AdoptCategory =
  | "campo"
  | "allenamento"
  | "sicurezza"
  | "squadra"
  | "trasporti"
  | "club-house";

export type AdopterKind = "famiglia" | "tifoso" | "azienda";

export interface AdoptItem {
  id: string;
  name: string;
  category: AdoptCategory;
  /** What it is for, in one plain sentence. */
  purpose: string;
  /** Price in euro decided by the Direzione; null = not set yet (never guessed). */
  priceEur: number | null;
  /** How many pieces the club needs (1 for single objects). */
  needed: number;
  /** Pieces already adopted (live value from the database once r101 is applied). */
  adopted: number;
  state: AdoptState;
  /** Can be shared among several adopters (e.g. a set of balls, one ball each). */
  shareable: boolean;
  /** Public name of the adopter, only after written consent. */
  publicName: string | null;
}

export const ADOPT_CATEGORY_LABEL: Readonly<Record<AdoptCategory, string>> = {
  campo: "Campo",
  allenamento: "Allenamento",
  sicurezza: "Sicurezza e salute",
  squadra: "Squadre",
  trasporti: "Pulmini",
  "club-house": "Club House",
};

export const ADOPT_STATE_LABEL: Readonly<Record<AdoptState, string>> = {
  DA_ADOTTARE: "Da adottare",
  IN_ADOZIONE: "In adozione",
  ADOTTATO: "Adottato",
  CONSEGNATO: "Consegnato",
};

export const ADOPTER_KIND_LABEL: Readonly<Record<AdopterKind, string>> = {
  famiglia: "Famiglia",
  tifoso: "Tifoso o amico del club",
  azienda: "Azienda",
};

/** Recognition given to every adopter; social thanks only with consent. */
export const ADOPT_RECOGNITION: readonly {
  id: string;
  title: string;
  text: string;
}[] = [
  {
    id: "targhetta",
    title: "Targhetta",
    text: "Una targhetta sull'oggetto o in Club House con il nome che scegli tu.",
  },
  {
    id: "attestato",
    title: "Attestato",
    text: "Un attestato di ringraziamento della società, consegnato in campo o in sede.",
  },
  {
    id: "social",
    title: "Grazie sui social",
    text: "Un ringraziamento pubblico sui canali del club, solo se ci dai il consenso scritto.",
  },
  {
    id: "ricevuta",
    title: "Ricevuta",
    text: "La tesoreria rilascia sempre la ricevuta del contributo.",
  },
];

/**
 * Catalogue 2026/27 from the Direzione's list (14/10/2026). Prices stay null until the Direzione sets them; `needed`
 * is 1 per item (one set) except the four vans (VERIFIED: four units, src/lib/pulmini-vans.ts) until the Direzione
 * sets real quantities.
 */
export const ADOPT_ITEMS: readonly AdoptItem[] = [
  {
    id: "porta-11",
    name: "Porta da calcio a 11",
    category: "campo",
    purpose:
      "Porte regolamentari per le partite e gli allenamenti della prima squadra e delle annate grandi.",
    priceEur: null,
    needed: 1,
    adopted: 0,
    state: "DA_ADOTTARE",
    shareable: false,
    publicName: null,
  },
  {
    id: "porta-7",
    name: "Porta da calcio a 7",
    category: "campo",
    purpose:
      "Porte trasportabili per l'attività di base e le partite a 7 e a 9.",
    priceEur: null,
    needed: 1,
    adopted: 0,
    state: "DA_ADOTTARE",
    shareable: false,
    publicName: null,
  },
  {
    id: "panchina",
    name: "Panchina a bordo campo",
    category: "campo",
    purpose:
      "Panchine coperte per staff e ragazzi durante partite e allenamenti.",
    priceEur: null,
    needed: 1,
    adopted: 0,
    state: "DA_ADOTTARE",
    shareable: false,
    publicName: null,
  },
  {
    id: "palloni",
    name: "Set di palloni",
    category: "allenamento",
    purpose:
      "Palloni per gli allenamenti delle annate, dai Piccoli Amici alla Juniores.",
    priceEur: null,
    needed: 1,
    adopted: 0,
    state: "DA_ADOTTARE",
    shareable: true,
    publicName: null,
  },
  {
    id: "materiale-tecnico",
    name: "Materiale tecnico",
    category: "allenamento",
    purpose:
      "Coni, cinesini, ostacoli, pettorine e scale per lavorare bene in campo.",
    priceEur: null,
    needed: 1,
    adopted: 0,
    state: "DA_ADOTTARE",
    shareable: true,
    publicName: null,
  },
  {
    id: "defibrillatore",
    name: "Defibrillatore",
    category: "sicurezza",
    purpose:
      "Un defibrillatore sempre pronto al campo, con teca e manutenzione.",
    priceEur: null,
    needed: 1,
    adopted: 0,
    state: "DA_ADOTTARE",
    shareable: true,
    publicName: null,
  },
  {
    id: "kit-squadra",
    name: "Kit di una squadra",
    category: "squadra",
    purpose: "Maglie, pantaloncini e calzettoni per un'intera annata.",
    priceEur: null,
    needed: 1,
    adopted: 0,
    state: "DA_ADOTTARE",
    shareable: false,
    publicName: null,
  },
  {
    id: "pulmino",
    name: "Un pulmino per una stagione",
    category: "trasporti",
    purpose:
      "Carburante e manutenzione di uno dei quattro pulmini che portano i ragazzi al campo.",
    priceEur: null,
    needed: 4,
    adopted: 0,
    state: "DA_ADOTTARE",
    shareable: true,
    publicName: null,
  },
  {
    id: "club-house",
    name: "Un pezzo della Club House",
    category: "club-house",
    purpose: "Arredi e attrezzature per la Club House di Colico e Dervio.",
    priceEur: null,
    needed: 1,
    adopted: 0,
    state: "DA_ADOTTARE",
    shareable: true,
    publicName: null,
  },
];

/** "1.250 €" in Italian format, or the neutral sentence when the Direzione has not set a price. */
export function priceLabel(priceEur: number | null): string {
  if (priceEur === null || !Number.isFinite(priceEur) || priceEur <= 0)
    return "Valore indicato dalla società";
  // Manual grouping: Intl "it-IT" leaves 4-digit numbers ungrouped ("1250"), the club writes "1.250 €".
  const digits = String(Math.round(priceEur)).replace(
    /\B(?=(\d{3})+(?!\d))/g,
    ".",
  );
  return `${digits} €`;
}

/** Remaining pieces, never negative. */
export function remaining(item: Pick<AdoptItem, "needed" | "adopted">): number {
  return Math.max(0, item.needed - Math.max(0, item.adopted));
}

/** Progress 0–100, rounded. */
export function progressPct(
  item: Pick<AdoptItem, "needed" | "adopted">,
): number {
  if (item.needed <= 0) return 100;
  return Math.min(
    100,
    Math.round((Math.max(0, item.adopted) / item.needed) * 100),
  );
}

/**
 * State shown to the public. A stored state wins when it is further along (CONSEGNATO > ADOTTATO > IN_ADOZIONE);
 * otherwise it is derived from the counters so the badge never contradicts the progress bar.
 */
export function effectiveState(
  item: Pick<AdoptItem, "needed" | "adopted" | "state">,
): AdoptState {
  if (item.state === "CONSEGNATO") return "CONSEGNATO";
  if (remaining(item) === 0) return "ADOTTATO";
  if (item.state === "ADOTTATO") return "ADOTTATO";
  if (item.adopted > 0 || item.state === "IN_ADOZIONE") return "IN_ADOZIONE";
  return "DA_ADOTTARE";
}

/** Items still open for adoption first (by category order), then adopted, then delivered. */
export function sortForCatalogue(items: readonly AdoptItem[]): AdoptItem[] {
  const stateRank: Record<AdoptState, number> = {
    DA_ADOTTARE: 0,
    IN_ADOZIONE: 1,
    ADOTTATO: 2,
    CONSEGNATO: 3,
  };
  const catOrder = Object.keys(ADOPT_CATEGORY_LABEL) as AdoptCategory[];
  return [...items].sort(
    (a, b) =>
      stateRank[effectiveState(a)] - stateRank[effectiveState(b)] ||
      catOrder.indexOf(a.category) - catOrder.indexOf(b.category) ||
      a.name.localeCompare(b.name, "it"),
  );
}

export function catalogueTotals(items: readonly AdoptItem[]): {
  items: number;
  open: number;
  adopted: number;
  delivered: number;
} {
  let open = 0;
  let adopted = 0;
  let delivered = 0;
  for (const i of items) {
    const s = effectiveState(i);
    if (s === "CONSEGNATO") delivered++;
    else if (s === "ADOTTATO") adopted++;
    else open++;
  }
  return { items: items.length, open, adopted, delivered };
}

/**
 * Prefilled e-mail to the club's official mailbox. The body carries only blanks for the adopter to fill: no data is
 * collected by the app and nothing is sent automatically.
 */
export function adoptMailto(
  item: Pick<AdoptItem, "id" | "name">,
  kind: AdopterKind,
  to: string = CLUB_PROFILE.contacts.email,
): string {
  const subject = `Adotta un oggetto · ${item.name}`;
  const body = [
    "Ciao S.C.D. ColicoDerviese,",
    "",
    `vorrei adottare: ${item.name} (rif. ${item.id}).`,
    `Adotto come: ${ADOPTER_KIND_LABEL[kind]}.`,
    kind === "azienda" ? "Ragione sociale:" : "Nome e cognome:",
    "Telefono:",
    "Quanti pezzi o che contributo:",
    "Nome da scrivere sulla targhetta:",
    "Posso essere ringraziato sui social (sì/no):",
    "",
    "Grazie!",
  ].join("\n");
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
