/**
 * Sostieni la S.C.D. ColicoDerviese (UD-113 — Direzione 14/10/2026): Fondo Solidale, "Adotta un oggetto", donations of
 * money and goods (campaigns "Adotta la nuova palestra SCD" and "Adotta la nuova infermeria") and "Proponi un
 * miglioramento". Pure rules shared by the server functions (giving.functions.ts), the pages and the tests.
 *
 * The database enforces the same rules (supabase/migrations/20261014_r101_fondo_adotta.sql). Nothing here grants
 * anything or stores anything: it shapes the screens and mirrors the SQL so that tests pin both to one contract.
 *
 * Fixed points:
 * - the app never processes payments: a public adoption is a pledge, the treasury records money from the official
 *   channel and issues receipts; companies go to the existing sponsor CRM (/sponsor#proposta);
 * - donor visibility on every donation: "nome pubblico" / "anonimo in pubblico" / "completamente anonimo" (then no
 *   personal data at all and no receipt); no amount per person is public without consent; aggregated amounts are
 *   public only with at least MIN_PUBLIC_CONTRIBUTIONS contributions or everybody's consent;
 * - Fondo Solidale: ISEE and names only for the Direzione and people granted the section; Fondo and sibling discount
 *   are never cumulative;
 * - medicines: only sealed and not expired; opened or expired medicines are never accepted;
 * - proposals are never public until staff publish a staff-written text without contacts;
 * - no amount, IBAN or text is invented: the public Fondo text comes from the Direzione (FONDO_PUBLIC_TEXT).
 */

/* ------------------------------------------------------------------ public texts */

export const CLUB_NAME = "S.C.D. ColicoDerviese";

/**
 * The public text of the Fondo Solidale as approved by the Direzione. Null until the Direzione sends it: the page then
 * shows its structure with "Testo in arrivo dalla Direzione". Never write criteria, thresholds or amounts here
 * without the Direzione's text.
 */
export const FONDO_PUBLIC_TEXT: { intro: string; who: string; how: string; when: string } | null = null;
export const TEXT_PENDING = "Testo in arrivo dalla Direzione";

/** Shown wherever r101 is not applied yet. */
export const NOT_ACTIVE_TITLE = "Da attivare";
export const NOT_ACTIVE_TEXT = "Serve l'OK della Direzione per applicare r101: fino ad allora qui non si registra nulla.";

/* ------------------------------------------------------------------ catalogues */

export const ITEM_CATEGORIES = [
  "ATTREZZATURA_CAMPO",
  "AREA_FITNESS",
  "AREA_GIOCHI_BAMBINI",
  "TRIBUNA_IMPIANTO",
  "PALESTRA",
  "INFERMERIA",
  "CLUB_HOUSE",
  "MEZZI",
  "ALTRO",
] as const;
export type ItemCategory = (typeof ITEM_CATEGORIES)[number];
export const CATEGORY_LABEL: Readonly<Record<ItemCategory, string>> = {
  ATTREZZATURA_CAMPO: "Attrezzatura campo",
  AREA_FITNESS: "Area fitness",
  AREA_GIOCHI_BAMBINI: "Area giochi bambini",
  TRIBUNA_IMPIANTO: "Tribuna e impianto",
  PALESTRA: "Palestra",
  INFERMERIA: "Infermeria",
  CLUB_HOUSE: "Club house",
  MEZZI: "Mezzi",
  ALTRO: "Altro",
};

export const ITEM_STATUSES = ["BOZZA", "DA_ADOTTARE", "IN_RACCOLTA", "ADOTTATO", "CONSEGNATO", "RITIRATO"] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];
export const ITEM_STATUS_LABEL: Readonly<Record<ItemStatus, string>> = {
  BOZZA: "Bozza",
  DA_ADOTTARE: "Da adottare",
  IN_RACCOLTA: "In raccolta",
  ADOTTATO: "Adottato",
  CONSEGNATO: "Consegnato",
  RITIRATO: "Ritirato",
};

export const PRICE_MODES = ["PREZZO", "DA_PREVENTIVO", "DA_PREVENTIVO_AGGIORNATO"] as const;
export type PriceMode = (typeof PRICE_MODES)[number];
export const PRICE_MODE_LABEL: Readonly<Record<PriceMode, string>> = {
  PREZZO: "Prezzo totale",
  DA_PREVENTIVO: "Da preventivo",
  DA_PREVENTIVO_AGGIORNATO: "Da preventivo aggiornato",
};

export const VISIBILITIES = ["NOME_PUBBLICO", "ANONIMO_PUBBLICO", "COMPLETAMENTE_ANONIMO"] as const;
export type Visibility = (typeof VISIBILITIES)[number];
/** Default visibility: anonymous in public (manifest product_direction.solidarity_fund.privacy.public_anonymity_default). */
export const DEFAULT_VISIBILITY: Visibility = "ANONIMO_PUBBLICO";
export const VISIBILITY_COPY: Readonly<Record<Visibility, { label: string; text: string }>> = {
  NOME_PUBBLICO: {
    label: "Nome pubblico",
    text: "Il nome che scegli compare sull'oggetto adottato (e sulla targhetta, se c'è). L'importo resta riservato, a meno che tu non scelga di mostrarlo.",
  },
  ANONIMO_PUBBLICO: {
    label: "Anonimo in pubblico",
    text: "In pubblico non compare nessun nome. Il tuo nome e un recapito li vede solo la Tesoreria, per contattarti e per la ricevuta.",
  },
  COMPLETAMENTE_ANONIMO: {
    label: "Completamente anonimo",
    text: "Non ci lasci nessun dato personale. Per questo non possiamo rilasciarti una ricevuta né ricontattarti.",
  },
};

export const CAMPAIGNS = ["PALESTRA", "INFERMERIA"] as const;
export type Campaign = (typeof CAMPAIGNS)[number];
export type OfferCampaign = Campaign | "ALTRO";
export const CAMPAIGN_COPY: Readonly<Record<Campaign, { title: string; lead: string; what: string; rule: string }>> = {
  PALESTRA: {
    title: "Adotta la nuova palestra SCD",
    lead: "Hai attrezzi da palestra in buono stato che non usi più? Possono allenare i nostri ragazzi.",
    what: "Attrezzi, pesi, tappetini, panche, materiale per il riscaldamento: in buone condizioni e sicuri.",
    rule: "Lo staff controlla ogni attrezzo prima di accettarlo: se non è sicuro non lo prendiamo.",
  },
  INFERMERIA: {
    title: "Adotta la nuova infermeria",
    lead: "Materiale sanitario o arredi per la nuova infermeria del club.",
    what: "Materiale sanitario nuovo e sigillato, presidi verificabili da un professionista, arredi (lettino, armadietti).",
    rule: "Accettiamo farmaci solo sigillati e non scaduti. Farmaci aperti o scaduti non si accettano mai. Decide il responsabile dell'infermeria.",
  },
};

export const CONDITIONS = ["NUOVO_SIGILLATO", "NUOVO", "OTTIMO", "BUONO", "DA_VERIFICARE"] as const;
export type Condition = (typeof CONDITIONS)[number];
export const CONDITION_LABEL: Readonly<Record<Condition, string>> = {
  NUOVO_SIGILLATO: "Nuovo e sigillato",
  NUOVO: "Nuovo, confezione aperta",
  OTTIMO: "Usato, come nuovo",
  BUONO: "Usato, in buono stato",
  DA_VERIFICARE: "Non so, da controllare",
};

export const MEDICAL_KINDS = ["NON_MEDICO", "FARMACO", "DISPOSITIVO", "MATERIALE_CONSUMO", "ARREDO"] as const;
export type MedicalKind = (typeof MEDICAL_KINDS)[number];
export const MEDICAL_KIND_LABEL: Readonly<Record<MedicalKind, string>> = {
  NON_MEDICO: "Non è materiale sanitario",
  FARMACO: "Farmaco o prodotto con scadenza",
  DISPOSITIVO: "Presidio o apparecchio sanitario",
  MATERIALE_CONSUMO: "Materiale sanitario di consumo (garze, cerotti…)",
  ARREDO: "Arredo (lettino, armadietto…)",
};

export const HANDOVERS = ["CONSEGNA", "RITIRO"] as const;
export type Handover = (typeof HANDOVERS)[number];
export const HANDOVER_LABEL: Readonly<Record<Handover, string>> = {
  CONSEGNA: "Lo porto io al campo",
  RITIRO: "Serve un ritiro",
};

export const OFFER_STATUSES = ["NUOVA", "INFO_RICHIESTE", "ACCETTATA", "RIFIUTATA", "RICEVUTA", "INVENTARIATA", "ANNULLATA"] as const;
export type OfferStatus = (typeof OFFER_STATUSES)[number];
export const OFFER_STATUS_LABEL: Readonly<Record<OfferStatus, string>> = {
  NUOVA: "Nuova",
  INFO_RICHIESTE: "Servono informazioni",
  ACCETTATA: "Accettata",
  RIFIUTATA: "Non accettata",
  RICEVUTA: "Ricevuta e controllata",
  INVENTARIATA: "In inventario",
  ANNULLATA: "Annullata",
};

export const PROPOSAL_AREAS = ["CAMPI", "PALESTRA", "INFERMERIA", "CLUB_HOUSE", "SICUREZZA", "ALTRO"] as const;
export type ProposalArea = (typeof PROPOSAL_AREAS)[number];
export const PROPOSAL_AREA_LABEL: Readonly<Record<ProposalArea, string>> = {
  CAMPI: "Campi",
  PALESTRA: "Palestra",
  INFERMERIA: "Infermeria",
  CLUB_HOUSE: "Club house",
  SICUREZZA: "Sicurezza",
  ALTRO: "Altro",
};
export const CONTRIBUTIONS = ["TEMPO", "BENI", "DENARO"] as const;
export type Contribution = (typeof CONTRIBUTIONS)[number];
export const CONTRIBUTION_LABEL: Readonly<Record<Contribution, string>> = { TEMPO: "Tempo", BENI: "Materiale", DENARO: "Denaro" };

export const PROPOSAL_STATUSES = ["NUOVA", "IN_VALUTAZIONE", "ACCETTATA", "NON_FATTIBILE", "SPAM"] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];
export const PROPOSAL_STATUS_LABEL: Readonly<Record<ProposalStatus, string>> = {
  NUOVA: "Nuova",
  IN_VALUTAZIONE: "In valutazione",
  ACCETTATA: "Accettata",
  NON_FATTIBILE: "Non fattibile",
  SPAM: "Spam",
};

export const FUND_STATUSES = ["INVIATA", "IN_ESAME", "INTEGRAZIONE", "APPROVATA", "RESPINTA", "RITIRATA", "SCADUTA"] as const;
export type FundStatus = (typeof FUND_STATUSES)[number];
export const FUND_STATUS_LABEL: Readonly<Record<FundStatus, string>> = {
  INVIATA: "Arrivata",
  IN_ESAME: "In esame",
  INTEGRAZIONE: "Documenti da integrare",
  APPROVATA: "Approvata",
  RESPINTA: "Non accolta",
  RITIRATA: "Ritirata",
  SCADUTA: "Scaduta",
};

export const SIBLING_OPTIONS = ["DA_VERIFICARE", "NESSUNO", "PRESENTE", "PRESENTE_RINUNCIA"] as const;
export type SiblingDiscount = (typeof SIBLING_OPTIONS)[number];
export const SIBLING_LABEL: Readonly<Record<SiblingDiscount, string>> = {
  DA_VERIFICARE: "Sconto fratelli da verificare",
  NESSUNO: "Nessuno sconto fratelli",
  PRESENTE: "Ha lo sconto fratelli",
  PRESENTE_RINUNCIA: "Ha lo sconto fratelli e ci rinuncia per il Fondo",
};

export const DONATION_STATUSES = ["PROMESSA", "RICEVUTA", "ANNULLATA"] as const;
export type DonationStatus = (typeof DONATION_STATUSES)[number];
export const DONATION_STATUS_LABEL: Readonly<Record<DonationStatus, string>> = {
  PROMESSA: "Promessa, da ricevere",
  RICEVUTA: "Ricevuta",
  ANNULLATA: "Annullata",
};
export const DONATION_PURPOSES = ["FONDO_SOLIDALE", "ADOTTA_OGGETTO", "GENERALE"] as const;
export type DonationPurpose = (typeof DONATION_PURPOSES)[number];
export const PURPOSE_LABEL: Readonly<Record<DonationPurpose, string>> = {
  FONDO_SOLIDALE: "Fondo Solidale",
  ADOTTA_OGGETTO: "Adotta un oggetto",
  GENERALE: "Per il club",
};
export const CHANNELS = ["BONIFICO", "CONTANTI", "POS", "ASSEGNO", "ALTRO"] as const;
export type Channel = (typeof CHANNELS)[number];
export const CHANNEL_LABEL: Readonly<Record<Channel, string>> = {
  BONIFICO: "Bonifico",
  CONTANTI: "Contanti",
  POS: "POS",
  ASSEGNO: "Assegno",
  ALTRO: "Altro",
};

export const MOVEMENT_SOURCES = ["DONAZIONE", "EVENTO", "SPONSOR_DEDICATO", "ALTRA_ENTRATA", "QUOTA_COPERTA", "ALTRA_USCITA"] as const;
export type MovementSource = (typeof MOVEMENT_SOURCES)[number];
export const MOVEMENT_SOURCE_LABEL: Readonly<Record<MovementSource, string>> = {
  DONAZIONE: "Donazione",
  EVENTO: "Evento",
  SPONSOR_DEDICATO: "Sponsor dedicato",
  ALTRA_ENTRATA: "Altra entrata",
  QUOTA_COPERTA: "Quota coperta",
  ALTRA_USCITA: "Altra uscita",
};
/** Sources the Fund office types by hand (donations enter by themselves when the treasury records them). */
export const MANUAL_SOURCES: readonly MovementSource[] = ["EVENTO", "SPONSOR_DEDICATO", "ALTRA_ENTRATA", "QUOTA_COPERTA", "ALTRA_USCITA"];
export function movementDirection(s: MovementSource): "ENTRATA" | "USCITA" {
  return s === "QUOTA_COPERTA" || s === "ALTRA_USCITA" ? "USCITA" : "ENTRATA";
}

/* ------------------------------------------------------------------ status changes */

export type TransitionKind = "FUND_APPLICATION" | "DONATION" | "ADOPT_ITEM" | "INKIND_OFFER" | "PROPOSAL";

/** Same map as scd_giving_transition_ok in r101 (pinned by giving.test.ts). */
export const TRANSITIONS: Readonly<Record<TransitionKind, Readonly<Record<string, readonly string[]>>>> = {
  FUND_APPLICATION: {
    INVIATA: ["IN_ESAME", "RITIRATA"],
    IN_ESAME: ["INTEGRAZIONE", "APPROVATA", "RESPINTA", "RITIRATA"],
    INTEGRAZIONE: ["IN_ESAME", "RITIRATA", "SCADUTA"],
    APPROVATA: ["SCADUTA"],
  },
  DONATION: { PROMESSA: ["RICEVUTA", "ANNULLATA"], RICEVUTA: ["ANNULLATA"] },
  ADOPT_ITEM: {
    BOZZA: ["DA_ADOTTARE", "RITIRATO"],
    DA_ADOTTARE: ["IN_RACCOLTA", "ADOTTATO", "RITIRATO", "BOZZA"],
    IN_RACCOLTA: ["ADOTTATO", "DA_ADOTTARE", "RITIRATO"],
    ADOTTATO: ["CONSEGNATO", "IN_RACCOLTA"],
  },
  INKIND_OFFER: {
    NUOVA: ["INFO_RICHIESTE", "ACCETTATA", "RIFIUTATA", "ANNULLATA"],
    INFO_RICHIESTE: ["ACCETTATA", "RIFIUTATA", "ANNULLATA"],
    ACCETTATA: ["RICEVUTA", "RIFIUTATA", "ANNULLATA"],
    RICEVUTA: ["INVENTARIATA"],
  },
  PROPOSAL: { NUOVA: ["IN_VALUTAZIONE", "NON_FATTIBILE", "SPAM"], IN_VALUTAZIONE: ["ACCETTATA", "NON_FATTIBILE"] },
};

export function canTransition(kind: TransitionKind, from: string, to: string): boolean {
  return (TRANSITIONS[kind][from] ?? []).includes(to);
}
export function nextStatuses(kind: TransitionKind, from: string): readonly string[] {
  return TRANSITIONS[kind][from] ?? [];
}

/* ------------------------------------------------------------------ personal data in free text */

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const PHONE_RE = /\+?[0-9]{8,}/;
const CF_RE = /[A-Z]{6}[0-9LMNPQRSTUV]{2}[A-EHLMPRST][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]/;
const IBAN_RE = /IT[0-9]{2}[A-Z][0-9]{10}[0-9A-Z]{12}/;

/** Same test as scd_giving_has_contact: e-mail, phone number, fiscal code or IBAN in a free text. */
export function hasContact(text: string | null | undefined): boolean {
  const t = text ?? "";
  return (
    EMAIL_RE.test(t) ||
    PHONE_RE.test(t.replace(/[\s./-]/g, "")) ||
    CF_RE.test(t.toUpperCase()) ||
    IBAN_RE.test(t.toUpperCase().replace(/\s/g, ""))
  );
}

/* ------------------------------------------------------------------ donor visibility */

export interface DonorInput {
  visibility: Visibility;
  name?: string | null;
  contact?: string | null;
  publicName?: string | null;
  plateText?: string | null;
  showAmount?: boolean;
  /** True when the pledge is for one numbered unit (the plate needs a unit). */
  unit?: boolean;
}

const clean = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();

/** Field errors for the donor part of a form (same rules as scd_adopt_pledge / the scd_donations checks). */
export function donorErrors(d: DonorInput): Partial<Record<"name" | "contact" | "publicName" | "plateText" | "showAmount", string>> {
  const e: Partial<Record<"name" | "contact" | "publicName" | "plateText" | "showAmount", string>> = {};
  const name = clean(d.name);
  const contact = clean(d.contact);
  const pub = clean(d.publicName);
  const plate = clean(d.plateText);
  if (d.visibility === "COMPLETAMENTE_ANONIMO") {
    if (name || contact || pub || plate) e.name = "Completamente anonimo: non lasciare nome, recapiti o testi con il tuo nome.";
    if (d.showAmount) e.showAmount = "Completamente anonimo: l'importo non si mostra.";
    return e;
  }
  if (name.length < 2 || name.length > 120) e.name = "Scrivi nome e cognome (serve alla Tesoreria per contattarti e per la ricevuta).";
  if (!contact || contact.length > 120) e.contact = "Lascia un'e-mail o un telefono per essere ricontattato.";
  if (d.visibility === "ANONIMO_PUBBLICO") {
    if (pub || plate) e.publicName = "Anonimo in pubblico: nessun nome viene mostrato.";
    if (d.showAmount) e.showAmount = "Anonimo in pubblico: l'importo non si mostra.";
    return e;
  }
  if (pub.length < 2 || pub.length > 60) e.publicName = "Scrivi il nome da mostrare (2-60 caratteri).";
  else if (hasContact(pub)) e.publicName = "Il nome pubblico non può contenere recapiti.";
  if (plate) {
    if (!d.unit) e.plateText = "La targhetta c'è solo quando adotti un posto numerato.";
    else if (plate.length < 2 || plate.length > 60) e.plateText = "Testo della targhetta: da 2 a 60 caratteri.";
    else if (hasContact(plate)) e.plateText = "La targhetta non può contenere recapiti.";
  }
  return e;
}

/** A receipt can be issued only when the treasury knows who donated. */
export function receiptPossible(v: Visibility): boolean {
  return v !== "COMPLETAMENTE_ANONIMO";
}

export interface DonationLike {
  visibility: Visibility;
  publicName: string | null;
  plateText: string | null;
  showAmount: boolean;
  amount: number | null;
  status: DonationStatus;
}

/** What the public may see of one donation (null = nothing, it is anonymous or not received). */
export function publicDonor(d: DonationLike): { name: string; plate: string | null; amount: number | null } | null {
  if (d.status !== "RICEVUTA" || d.visibility !== "NOME_PUBBLICO" || !d.publicName) return null;
  return { name: d.publicName, plate: d.plateText, amount: d.showAmount ? d.amount : null };
}

/* ------------------------------------------------------------------ adoption math */

/** Aggregated amounts are public only with at least this many contributions (or everybody's consent). */
export const MIN_PUBLIC_CONTRIBUTIONS = 3;

/** Same as scd_adopt_effective_price_mode: an expired quote is shown as "da preventivo aggiornato". */
export function effectivePriceMode(mode: PriceMode, quoteValidUntil: string | null, today: string): PriceMode {
  return mode === "PREZZO" && quoteValidUntil !== null && quoteValidUntil < today ? "DA_PREVENTIVO_AGGIORNATO" : mode;
}

const cents = (n: number) => Math.round(n * 100);

/** Price of one unit: the explicit unit price, else the total split evenly (to the cent). */
export function unitPriceOf(i: { priceTotal: number | null; unitsTotal: number | null; unitPrice: number | null }): number | null {
  if (i.unitPrice !== null) return i.unitPrice;
  if (i.priceTotal === null || !i.unitsTotal) return null;
  return Math.round((i.priceTotal * 100) / i.unitsTotal) / 100;
}

export interface ProgressInput {
  priceMode: PriceMode;
  priceTotal: number | null;
  quoteValidUntil: string | null;
  unitsTotal: number | null;
  unitsAdopted: number;
  /** Received money contributions (amount and whether the donor consented to show it). */
  contributions: ReadonlyArray<{ amount: number; showAmount: boolean }>;
}

export interface Progress {
  mode: PriceMode;
  target: number | null;
  collected: number;
  /** 0..100, null when there is no valid target or the amount must stay private. */
  pct: number | null;
  /** Units progress 0..100 when the item has units. */
  unitsPct: number | null;
  complete: boolean;
  /** True when the aggregated amount may be shown publicly. */
  amountPublic: boolean;
}

/** Partial adoption: many contributions toward one item; units count on their own. */
export function adoptionProgress(i: ProgressInput, today: string): Progress {
  const mode = effectivePriceMode(i.priceMode, i.quoteValidUntil, today);
  const target = mode === "PREZZO" ? i.priceTotal : null;
  const collectedC = i.contributions.reduce((s, c) => s + cents(c.amount), 0);
  const n = i.contributions.length;
  const amountPublic = n >= MIN_PUBLIC_CONTRIBUTIONS || (n > 0 && i.contributions.every((c) => c.showAmount));
  const unitsPct = i.unitsTotal ? Math.min(100, Math.floor((i.unitsAdopted * 100) / i.unitsTotal)) : null;
  const complete = (i.unitsTotal !== null && i.unitsAdopted >= i.unitsTotal) || (target !== null && collectedC >= cents(target));
  const pct = target !== null && target > 0 && (amountPublic || n === 0) ? Math.min(100, Math.floor((collectedC * 100) / cents(target))) : null;
  return { mode, target, collected: collectedC / 100, pct, unitsPct, complete, amountPublic };
}

/** The item status the database moves to after a received or voided donation (scd_adopt_refresh). */
export function autoItemStatus(current: ItemStatus, p: { complete: boolean; contributions: number }): ItemStatus {
  if (current === "BOZZA" || current === "CONSEGNATO" || current === "RITIRATO") return current;
  if (p.complete) return "ADOTTATO";
  return p.contributions > 0 ? "IN_RACCOLTA" : "DA_ADOTTARE";
}

export interface ItemDraft {
  title: string;
  category: ItemCategory | "";
  description: string;
  supplier: string;
  supplierCode: string;
  productUrl: string;
  photoPath: string;
  priceMode: PriceMode;
  priceTotal: string;
  priceNote: string;
  quoteRef: string;
  quoteValidUntil: string;
  unitLabel: string;
  unitsTotal: string;
  unitPrice: string;
  campaign: Campaign | "";
  published: boolean;
}

/** Field errors of the catalogue form (same checks as the scd_adopt_items constraints). */
export function itemErrors(d: ItemDraft): Partial<Record<keyof ItemDraft, string>> {
  const e: Partial<Record<keyof ItemDraft, string>> = {};
  if (d.title.trim().length < 3 || d.title.trim().length > 120) e.title = "Titolo da 3 a 120 caratteri.";
  if (!d.category) e.category = "Scegli la categoria.";
  if (d.description.length > 1500) e.description = "Descrizione troppo lunga (max 1500).";
  if (d.productUrl && !/^https:\/\/\S+$/.test(d.productUrl.trim())) e.productUrl = "Link del prodotto: indirizzo https completo.";
  if (d.photoPath && !/^\/[A-Za-z0-9/_.-]+\.(webp|jpg|jpeg|png)$/.test(d.photoPath.trim()))
    e.photoPath = "Solo foto del club caricate nell'app (percorso che inizia con /). Mai foto del catalogo del fornitore.";
  const price = Number(d.priceTotal.replace(",", "."));
  if (d.priceMode === "PREZZO" && !(d.priceTotal.trim() && Number.isFinite(price) && price > 0)) e.priceTotal = "Con «Prezzo totale» serve un importo maggiore di zero.";
  if (d.priceMode !== "PREZZO" && d.priceTotal.trim()) e.priceTotal = "Da preventivo: lascia vuoto l'importo.";
  const units = d.unitsTotal.trim() ? Number(d.unitsTotal) : null;
  if (units !== null && !(Number.isInteger(units) && units >= 1 && units <= 2000)) e.unitsTotal = "Numero di unità da 1 a 2000.";
  if ((units !== null) !== Boolean(d.unitLabel.trim())) e.unitLabel = "Unità: indica sia il nome (es. «posto») sia il numero.";
  if (d.unitPrice.trim() && units === null) e.unitPrice = "Il prezzo per unità serve solo se ci sono unità.";
  return e;
}

/* ------------------------------------------------------------------ goods offers */

export interface OfferInput {
  campaign: OfferCampaign;
  what: string;
  quantity: number;
  condition: Condition;
  medicalKind: MedicalKind;
  sealed: boolean;
  expiresOn: string | null;
  professionalCheck: boolean;
  handover: Handover;
  note: string;
  visibility: Visibility;
}

export type OfferRefusal = "MEDICINE_REFUSED" | "MEDICAL_NOT_VERIFIABLE" | "ANONYMOUS_NEEDS_DELIVERY" | "CONTACT_IN_ANONYMOUS" | "INVALID";

/** Same rules as scd_inkind_offer_submit: medicines sealed and not expired, other medical items verifiable. */
export function offerRefusal(o: OfferInput, today: string): OfferRefusal | null {
  const what = clean(o.what);
  if (what.length < 3 || what.length > 200 || !Number.isInteger(o.quantity) || o.quantity < 1 || o.quantity > 500 || o.note.length > 500) return "INVALID";
  if (o.medicalKind === "FARMACO" && (!o.sealed || !o.expiresOn || o.expiresOn < today)) return "MEDICINE_REFUSED";
  if ((o.medicalKind === "DISPOSITIVO" || o.medicalKind === "MATERIALE_CONSUMO") && o.condition !== "NUOVO_SIGILLATO" && !o.professionalCheck)
    return "MEDICAL_NOT_VERIFIABLE";
  if (o.visibility === "COMPLETAMENTE_ANONIMO") {
    if (o.handover !== "CONSEGNA") return "ANONYMOUS_NEEDS_DELIVERY";
    if (hasContact(`${o.what} ${o.note}`)) return "CONTACT_IN_ANONYMOUS";
  }
  return null;
}

export function isMedical(o: { campaign: OfferCampaign; medicalKind: MedicalKind }): boolean {
  return o.campaign === "INFERMERIA" || o.medicalKind !== "NON_MEDICO";
}

/** Staff side (scd_inkind_review): why a status change is refused, or null. */
export function reviewProblem(
  o: { status: OfferStatus; campaign: OfferCampaign; medicalKind: MedicalKind; sealed: boolean; expiresOn: string | null },
  to: OfferStatus,
  input: { canInfermeria: boolean; text: string; conditionOk: boolean; receivedOn: string | null; inventoryRef: string },
  today: string,
): string | null {
  if (!canTransition("INKIND_OFFER", o.status, to)) return "Passaggio di stato non previsto.";
  if ((to === "ACCETTATA" || to === "RICEVUTA") && isMedical(o) && !input.canInfermeria) return "Materiale sanitario: decide il responsabile dell'infermeria.";
  if ((to === "ACCETTATA" || to === "RICEVUTA") && o.medicalKind === "FARMACO" && (!o.sealed || !o.expiresOn || o.expiresOn < (input.receivedOn ?? today)))
    return "Farmaci solo sigillati e non scaduti: questo non si può accettare.";
  if (to === "RIFIUTATA" && input.text.trim().length < 3) return "Scrivi il motivo (lo leggerà chi ha offerto).";
  if (to === "INFO_RICHIESTE" && input.text.trim().length < 3) return "Scrivi cosa serve sapere.";
  if (to === "RICEVUTA" && (!input.conditionOk || !input.receivedOn || input.receivedOn > today)) return "Conferma il controllo dello stato e la data di arrivo.";
  if (to === "INVENTARIATA" && (input.inventoryRef.trim().length < 1 || input.inventoryRef.trim().length > 80)) return "Indica il riferimento di magazzino.";
  return null;
}

/* ------------------------------------------------------------------ proposals */

export interface ProposalInput {
  area: ProposalArea | "";
  title: string;
  body: string;
  anonymous: boolean;
  contact: string;
  canContribute: readonly Contribution[];
  signedIn: boolean;
}

export function proposalErrors(p: ProposalInput): Partial<Record<"area" | "title" | "body" | "contact", string>> {
  const e: Partial<Record<"area" | "title" | "body" | "contact", string>> = {};
  const title = clean(p.title);
  if (!p.area) e.area = "Scegli dove serve il miglioramento.";
  if (title.length < 5 || title.length > 80) e.title = "Titolo da 5 a 80 caratteri.";
  if (p.body.trim().length < 10 || p.body.trim().length > 1000) e.body = "Racconta in 10-1000 caratteri cosa serve e perché.";
  if (p.anonymous) {
    if (p.contact.trim()) e.contact = "Hai scelto di restare anonimo: togli il recapito.";
    else if (hasContact(`${p.title} ${p.body}`)) e.body = "Hai scritto un recapito nel testo: toglilo per restare anonimo, oppure scegli di farti ricontattare.";
  } else if (!p.contact.trim() && !p.signedIn) e.contact = "Lascia un recapito oppure accedi, così possiamo risponderti.";
  else if (p.contact.length > 120) e.contact = "Recapito troppo lungo.";
  return e;
}

/** Staff-written public text: no contacts, published only while being evaluated or accepted. */
export function publishProblem(p: { status: ProposalStatus }, title: string, text: string): string | null {
  if (p.status !== "IN_VALUTAZIONE" && p.status !== "ACCETTATA") return "Si pubblica solo una proposta in valutazione o accettata.";
  if (title.trim().length < 5 || title.trim().length > 80) return "Titolo pubblico da 5 a 80 caratteri.";
  if (text.trim().length < 10 || text.trim().length > 600) return "Testo pubblico da 10 a 600 caratteri.";
  if (hasContact(`${title} ${text}`)) return "Il testo pubblico non può contenere recapiti o dati personali.";
  return null;
}

/* ------------------------------------------------------------------ Fondo Solidale */

export interface DecisionInput {
  decision: "APPROVATA" | "RESPINTA";
  baseFee: number | null;
  reducedFee: number | null;
  siblingDiscount: SiblingDiscount;
  /** family_rule of the linked fee position in the Gestionale copy (scd_fee_positions), if any. */
  feeFamilyRule: string | null;
  reason: string;
}

/** Same checks as scd_fund_decide. Fondo and sibling discount are never cumulative. */
export function decisionProblem(d: DecisionInput): string | null {
  if (d.reason.trim().length < 3) return "Scrivi la motivazione della decisione.";
  if (d.decision === "RESPINTA") return null;
  if (d.baseFee === null || d.reducedFee === null || !(d.baseFee > 0) || d.reducedFee < 0 || d.reducedFee > d.baseFee)
    return "Quota piena e quota ridotta: la ridotta va da zero alla piena.";
  if (d.siblingDiscount !== "NESSUNO" && d.siblingDiscount !== "PRESENTE_RINUNCIA")
    return "Fondo e sconto fratelli non sono cumulabili: indica che non c'è sconto fratelli oppure che la famiglia ci rinuncia.";
  if (d.feeFamilyRule && /fratell/i.test(d.feeFamilyRule) && d.siblingDiscount !== "PRESENTE_RINUNCIA")
    return "Nel Gestionale questa quota ha lo sconto fratelli: la famiglia deve rinunciarci per avere il Fondo.";
  return null;
}

/** What the office still has to do in the Gestionale after an approval (UD-082: the fee lives there). */
export function gestionaleTodo(a: { status: FundStatus; siblingDiscount: SiblingDiscount; feeFundInSheet: boolean | null }): string | null {
  if (a.status !== "APPROVATA") return null;
  if (a.siblingDiscount === "PRESENTE_RINUNCIA") return "Togliere lo sconto fratelli e segnare il Fondo nel Gestionale";
  if (a.feeFundInSheet !== true) return "Segnare il Fondo nel Gestionale";
  return null;
}

/** How much of the decided reduction can still be paid out by the Fund. */
export function coverRoom(a: { baseFee: number | null; reducedFee: number | null; covered: number }): number {
  if (a.baseFee === null || a.reducedFee === null) return 0;
  return Math.max(0, cents(a.baseFee - a.reducedFee) - cents(a.covered)) / 100;
}

export interface MovementLike {
  direction: "ENTRATA" | "USCITA";
  source: MovementSource;
  amount: number;
  voided: boolean;
}

export function fundTotals(ms: readonly MovementLike[]): { income: number; outgoings: number; balance: number; bySource: Partial<Record<MovementSource, number>> } {
  let inc = 0;
  let out = 0;
  const by: Partial<Record<MovementSource, number>> = {};
  for (const m of ms) {
    if (m.voided) continue;
    const c = cents(m.amount);
    if (m.direction === "ENTRATA") inc += c;
    else out += c;
    by[m.source] = ((by[m.source] ?? 0) * 100 + c) / 100;
  }
  return { income: inc / 100, outgoings: out / 100, balance: (inc - out) / 100, bySource: by };
}

/** Deadlines of the open applications, most urgent first (review deadline or documents deadline). */
export function fundDeadlines(
  apps: ReadonlyArray<{ code: string; status: FundStatus; reviewDue: string | null; documentsDue: string | null }>,
  today: string,
): Array<{ code: string; kind: "esame" | "documenti"; due: string; late: boolean }> {
  const out: Array<{ code: string; kind: "esame" | "documenti"; due: string; late: boolean }> = [];
  for (const a of apps) {
    if (a.status === "INTEGRAZIONE" && a.documentsDue) out.push({ code: a.code, kind: "documenti", due: a.documentsDue, late: a.documentsDue < today });
    if ((a.status === "INVIATA" || a.status === "IN_ESAME" || a.status === "INTEGRAZIONE") && a.reviewDue)
      out.push({ code: a.code, kind: "esame", due: a.reviewDue, late: a.reviewDue < today });
  }
  return out.sort((x, y) => x.due.localeCompare(y.due) || x.code.localeCompare(y.code));
}

/* ------------------------------------------------------------------ public submit outcomes */

export type SubmitOutcome =
  | { ok: true; reference: string }
  | { ok: false; code: "NOT_ACTIVE" | "BUSY" | "INVALID" | "NOT_AVAILABLE" | "ERROR" | OfferRefusal };

export function parseSubmit(v: unknown): SubmitOutcome {
  if (typeof v !== "string") return { ok: false, code: "ERROR" };
  if (v.startsWith("RECEIVED:")) return { ok: true, reference: v.slice(9) };
  const known = ["BUSY", "INVALID", "NOT_AVAILABLE", "MEDICINE_REFUSED", "MEDICAL_NOT_VERIFIABLE", "CONTACT_IN_ANONYMOUS"] as const;
  return (known as readonly string[]).includes(v) ? { ok: false, code: v as (typeof known)[number] } : { ok: false, code: "ERROR" };
}

export const OUTCOME_TEXT: Readonly<Record<Exclude<SubmitOutcome, { ok: true }>["code"], string>> = {
  NOT_ACTIVE: `${NOT_ACTIVE_TITLE}: ${NOT_ACTIVE_TEXT} Nulla è stato inviato.`,
  BUSY: "Troppi invii in poco tempo: riprova tra qualche minuto.",
  INVALID: "Controlla i campi evidenziati e riprova.",
  NOT_AVAILABLE: "Questo oggetto o posto non è più disponibile: scegline un altro.",
  ERROR: "Invio non riuscito. Riprova tra poco.",
  MEDICINE_REFUSED: "Farmaci: accettiamo solo confezioni sigillate e non scadute. Farmaci aperti o scaduti non si accettano mai.",
  MEDICAL_NOT_VERIFIABLE: "Materiale sanitario: accettiamo solo prodotti nuovi e sigillati o verificabili da un professionista.",
  ANONYMOUS_NEEDS_DELIVERY: "Se resti completamente anonimo non possiamo organizzare un ritiro: scegli di portarlo tu oppure lasciaci un recapito.",
  CONTACT_IN_ANONYMOUS: "Hai scritto un recapito nel testo: toglilo per restare anonimo, oppure scegli di farti ricontattare.",
};

export function receivedText(kind: "proposal" | "offer" | "pledge", reference: string): string {
  if (kind === "proposal") return `Grazie! La proposta è arrivata (riferimento ${reference}). Lo staff la valuta: non diventa pubblica finché non la pubblichiamo noi.`;
  if (kind === "offer") return `Grazie! L'offerta è arrivata (riferimento ${reference}). Lo staff la controlla e, se hai lasciato un recapito, ti ricontatta.`;
  return `Grazie! L'adozione è registrata come promessa (riferimento ${reference}). La Tesoreria ti contatta per il versamento: l'app non incassa nulla.`;
}

/* ------------------------------------------------------------------ parsing */

type Raw = Record<string, unknown>;
const obj = (v: unknown): Raw | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Raw) : null);
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() !== "" ? v : null);
const num = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
};
const bool = (v: unknown): boolean => v === true;
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
function oneOf<T extends string>(list: readonly T[], v: unknown, fallback: T): T {
  return typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : fallback;
}

export interface PublicUnit {
  n: number;
  adopted: boolean;
  plate: string | null;
}
export interface PublicItem {
  id: string;
  code: string;
  title: string;
  category: ItemCategory;
  description: string;
  supplier: string | null;
  supplierCode: string | null;
  productUrl: string | null;
  photoPath: string | null;
  priceMode: PriceMode;
  priceTotal: number | null;
  priceNote: string | null;
  quoteExpired: boolean;
  status: ItemStatus;
  campaign: Campaign | null;
  unitLabel: string | null;
  unitsTotal: number | null;
  unitPrice: number | null;
  contributions: number;
  collected: number | null;
  units: PublicUnit[];
  adopters: Array<{ name: string; amount: number | null }>;
  anonymousAdopters: number;
}
export interface PublicData {
  items: PublicItem[];
  proposals: Array<{ code: string; area: ProposalArea; title: string; text: string; status: ProposalStatus }>;
  campaigns: Record<Campaign, { received: number }>;
  fund: { confirmed: number; allocated: number; available: number; asOf: string | null; source: string } | null;
}

export function parsePublic(v: unknown): PublicData {
  const r = obj(v) ?? {};
  const camp = obj(r["campaigns"]) ?? {};
  const fund = obj(r["fund"]);
  return {
    items: arr(r["items"]).flatMap((x) => {
      const i = obj(x);
      const id = i ? str(i["id"]) : null;
      if (!i || !id) return [];
      const units = arr(i["units"]).flatMap((u) => {
        const o = obj(u);
        const n = o ? num(o["n"]) : null;
        return o && n !== null ? [{ n, adopted: o["status"] === "ADOTTATO", plate: str(o["plate"]) }] : [];
      });
      return [{
        id,
        code: str(i["code"]) ?? "",
        title: str(i["title"]) ?? "Oggetto",
        category: oneOf(ITEM_CATEGORIES, i["category"], "ALTRO"),
        description: str(i["description"]) ?? "",
        supplier: str(i["supplier"]),
        supplierCode: str(i["supplierCode"]),
        productUrl: str(i["productUrl"]),
        photoPath: str(i["photoPath"]),
        priceMode: oneOf(PRICE_MODES, i["priceMode"], "DA_PREVENTIVO"),
        priceTotal: num(i["priceTotal"]),
        priceNote: str(i["priceNote"]),
        quoteExpired: bool(i["quoteExpired"]),
        status: oneOf(ITEM_STATUSES, i["status"], "DA_ADOTTARE"),
        campaign: i["campaign"] === "PALESTRA" || i["campaign"] === "INFERMERIA" ? i["campaign"] : null,
        unitLabel: str(i["unitLabel"]),
        unitsTotal: num(i["unitsTotal"]),
        unitPrice: num(i["unitPrice"]),
        contributions: num(i["contributions"]) ?? 0,
        collected: num(i["collected"]),
        units,
        adopters: arr(i["adopters"]).flatMap((a) => {
          const o = obj(a);
          const name = o ? str(o["name"]) : null;
          return o && name ? [{ name, amount: num(o["amount"]) }] : [];
        }),
        anonymousAdopters: num(i["anonymousAdopters"]) ?? 0,
      }];
    }),
    proposals: arr(r["proposals"]).flatMap((x) => {
      const p = obj(x);
      const title = p ? str(p["title"]) : null;
      const text = p ? str(p["text"]) : null;
      return p && title && text
        ? [{ code: str(p["code"]) ?? "", area: oneOf(PROPOSAL_AREAS, p["area"], "ALTRO"), title, text, status: oneOf(PROPOSAL_STATUSES, p["status"], "IN_VALUTAZIONE") }]
        : [];
    }),
    campaigns: {
      PALESTRA: { received: num(obj(camp["PALESTRA"])?.["received"]) ?? 0 },
      INFERMERIA: { received: num(obj(camp["INFERMERIA"])?.["received"]) ?? 0 },
    },
    fund: fund
      ? {
          confirmed: num(fund["confirmed"]) ?? 0,
          allocated: num(fund["allocated"]) ?? 0,
          available: num(fund["available"]) ?? 0,
          asOf: str(fund["asOf"]),
          source: str(fund["source"]) ?? "Tesoreria",
        }
      : null,
  };
}

export interface FundApplication {
  id: string;
  code: string;
  status: FundStatus;
  applicantName: string;
  beneficiaryLabel: string;
  contactEmail: string | null;
  contactPhone: string | null;
  feeSourceRecordId: string | null;
  iseeValue: number | null;
  iseeExpiresOn: string | null;
  documentsRef: string | null;
  householdNote: string;
  siblingDiscount: SiblingDiscount;
  submittedAt: string | null;
  reviewDue: string | null;
  documentsDue: string | null;
  decidedAt: string | null;
  decisionReason: string | null;
  baseFee: number | null;
  reducedFee: number | null;
  validUntil: string | null;
  covered: number;
  feeFamilyRule: string | null;
  feeFundInSheet: boolean | null;
}
export interface FundMovement extends MovementLike {
  id: string;
  occurredOn: string;
  description: string;
  donationCode: string | null;
  applicationCode: string | null;
  ledgerRef: string | null;
  voidReason: string | null;
}
export interface FundBoard {
  canWrite: boolean;
  canApprove: boolean;
  applications: FundApplication[];
  movements: FundMovement[];
  publicTotals: boolean;
}

export function parseFundBoard(v: unknown): FundBoard | null {
  const r = obj(v);
  if (!r) return null;
  return {
    canWrite: bool(r["canWrite"]),
    canApprove: bool(r["canApprove"]),
    publicTotals: bool(r["publicTotals"]),
    applications: arr(r["applications"]).flatMap((x) => {
      const a = obj(x);
      const id = a ? str(a["id"]) : null;
      if (!a || !id) return [];
      return [{
        id,
        code: str(a["code"]) ?? "",
        status: oneOf(FUND_STATUSES, a["status"], "INVIATA"),
        applicantName: str(a["applicantName"]) ?? "",
        beneficiaryLabel: str(a["beneficiaryLabel"]) ?? "",
        contactEmail: str(a["contactEmail"]),
        contactPhone: str(a["contactPhone"]),
        feeSourceRecordId: str(a["feeSourceRecordId"]),
        iseeValue: num(a["iseeValue"]),
        iseeExpiresOn: str(a["iseeExpiresOn"]),
        documentsRef: str(a["documentsRef"]),
        householdNote: str(a["householdNote"]) ?? "",
        siblingDiscount: oneOf(SIBLING_OPTIONS, a["siblingDiscount"], "DA_VERIFICARE"),
        submittedAt: str(a["submittedAt"]),
        reviewDue: str(a["reviewDue"]),
        documentsDue: str(a["documentsDue"]),
        decidedAt: str(a["decidedAt"]),
        decisionReason: str(a["decisionReason"]),
        baseFee: num(a["baseFee"]),
        reducedFee: num(a["reducedFee"]),
        validUntil: str(a["validUntil"]),
        covered: num(a["covered"]) ?? 0,
        feeFamilyRule: str(a["feeFamilyRule"]),
        feeFundInSheet: typeof a["feeFundInSheet"] === "boolean" ? a["feeFundInSheet"] : null,
      }];
    }),
    movements: arr(r["movements"]).flatMap((x) => {
      const m = obj(x);
      const id = m ? str(m["id"]) : null;
      const amount = m ? num(m["amount"]) : null;
      if (!m || !id || amount === null) return [];
      const source = oneOf(MOVEMENT_SOURCES, m["source"], "ALTRA_ENTRATA");
      return [{
        id,
        direction: movementDirection(source),
        source,
        amount,
        occurredOn: str(m["occurredOn"]) ?? "",
        description: str(m["description"]) ?? "",
        donationCode: str(m["donationCode"]),
        applicationCode: str(m["applicationCode"]),
        ledgerRef: str(m["ledgerRef"]),
        voided: bool(m["voided"]),
        voidReason: str(m["voidReason"]),
      }];
    }),
  };
}

export interface FundReport {
  applications: Partial<Record<FundStatus, number>>;
  reductionDecided: number;
  income: Partial<Record<MovementSource, number>>;
  outgoings: Partial<Record<MovementSource, number>>;
  asOf: string | null;
}

export function parseFundReport(v: unknown): FundReport | null {
  const r = obj(v);
  if (!r) return null;
  const counts = (x: unknown): Partial<Record<string, number>> => {
    const o = obj(x) ?? {};
    return Object.fromEntries(Object.entries(o).flatMap(([k, n]) => (num(n) === null ? [] : [[k, num(n) as number]])));
  };
  return {
    applications: counts(r["applications"]) as Partial<Record<FundStatus, number>>,
    reductionDecided: num(r["reductionDecided"]) ?? 0,
    income: counts(r["income"]) as Partial<Record<MovementSource, number>>,
    outgoings: counts(r["outgoings"]) as Partial<Record<MovementSource, number>>,
    asOf: str(r["asOf"]),
  };
}

export interface DonationRow extends DonationLike {
  id: string;
  code: string;
  purpose: DonationPurpose;
  itemCode: string | null;
  itemTitle: string | null;
  unitNumber: number | null;
  donorName: string | null;
  donorContact: string | null;
  donorFiscalCode: string | null;
  pledgedAmount: number | null;
  channel: Channel | null;
  receivedOn: string | null;
  receiptNumber: string | null;
  receiptIssuedOn: string | null;
  voidReason: string | null;
  source: "PUBBLICO" | "TESORERIA";
  createdAt: string | null;
}
export interface OfferRow {
  id: string;
  code: string;
  campaign: OfferCampaign;
  itemCode: string | null;
  what: string;
  quantity: number;
  condition: Condition;
  medicalKind: MedicalKind;
  sealed: boolean;
  expiresOn: string | null;
  professionalCheck: boolean;
  hasPhotos: boolean;
  handover: Handover;
  town: string | null;
  note: string;
  visibility: Visibility;
  donorName: string | null;
  donorContact: string | null;
  publicName: string | null;
  status: OfferStatus;
  declineReason: string | null;
  infoRequest: string | null;
  conditionChecked: boolean;
  conditionNote: string | null;
  receivedOn: string | null;
  inventoryRef: string | null;
  createdAt: string | null;
}
export interface DonationBoard {
  canWrite: boolean;
  canApprove: boolean;
  canInfermeria: boolean;
  donations: DonationRow[];
  offers: OfferRow[];
}

export function parseDonationBoard(v: unknown): DonationBoard | null {
  const r = obj(v);
  if (!r) return null;
  return {
    canWrite: bool(r["canWrite"]),
    canApprove: bool(r["canApprove"]),
    canInfermeria: bool(r["canInfermeria"]),
    donations: arr(r["donations"]).flatMap((x) => {
      const d = obj(x);
      const id = d ? str(d["id"]) : null;
      if (!d || !id) return [];
      return [{
        id,
        code: str(d["code"]) ?? "",
        purpose: oneOf(DONATION_PURPOSES, d["purpose"], "GENERALE"),
        itemCode: str(d["itemCode"]),
        itemTitle: str(d["itemTitle"]),
        unitNumber: num(d["unitNumber"]),
        visibility: oneOf(VISIBILITIES, d["visibility"], "ANONIMO_PUBBLICO"),
        donorName: str(d["donorName"]),
        donorContact: str(d["donorContact"]),
        donorFiscalCode: str(d["donorFiscalCode"]),
        publicName: str(d["publicName"]),
        plateText: str(d["plateText"]),
        showAmount: bool(d["showAmount"]),
        pledgedAmount: num(d["pledgedAmount"]),
        amount: num(d["amount"]),
        channel: d["channel"] ? oneOf(CHANNELS, d["channel"], "ALTRO") : null,
        receivedOn: str(d["receivedOn"]),
        receiptNumber: str(d["receiptNumber"]),
        receiptIssuedOn: str(d["receiptIssuedOn"]),
        status: oneOf(DONATION_STATUSES, d["status"], "PROMESSA"),
        voidReason: str(d["voidReason"]),
        source: d["source"] === "PUBBLICO" ? "PUBBLICO" : "TESORERIA",
        createdAt: str(d["createdAt"]),
      }];
    }),
    offers: arr(r["offers"]).flatMap((x) => {
      const o = obj(x);
      const id = o ? str(o["id"]) : null;
      if (!o || !id) return [];
      return [{
        id,
        code: str(o["code"]) ?? "",
        campaign: oneOf(["PALESTRA", "INFERMERIA", "ALTRO"] as const, o["campaign"], "ALTRO"),
        itemCode: str(o["itemCode"]),
        what: str(o["what"]) ?? "",
        quantity: num(o["quantity"]) ?? 1,
        condition: oneOf(CONDITIONS, o["condition"], "DA_VERIFICARE"),
        medicalKind: oneOf(MEDICAL_KINDS, o["medicalKind"], "NON_MEDICO"),
        sealed: bool(o["sealed"]),
        expiresOn: str(o["expiresOn"]),
        professionalCheck: bool(o["professionalCheck"]),
        hasPhotos: bool(o["hasPhotos"]),
        handover: oneOf(HANDOVERS, o["handover"], "CONSEGNA"),
        town: str(o["town"]),
        note: str(o["note"]) ?? "",
        visibility: oneOf(VISIBILITIES, o["visibility"], "ANONIMO_PUBBLICO"),
        donorName: str(o["donorName"]),
        donorContact: str(o["donorContact"]),
        publicName: str(o["publicName"]),
        status: oneOf(OFFER_STATUSES, o["status"], "NUOVA"),
        declineReason: str(o["declineReason"]),
        infoRequest: str(o["infoRequest"]),
        conditionChecked: bool(o["conditionChecked"]),
        conditionNote: str(o["conditionNote"]),
        receivedOn: str(o["receivedOn"]),
        inventoryRef: str(o["inventoryRef"]),
        createdAt: str(o["createdAt"]),
      }];
    }),
  };
}

export interface AdoptItemRow {
  id: string;
  code: string;
  title: string;
  category: ItemCategory;
  description: string;
  supplier: string | null;
  supplierCode: string | null;
  productUrl: string | null;
  photoPath: string | null;
  priceMode: PriceMode;
  effectivePriceMode: PriceMode;
  priceTotal: number | null;
  priceNote: string | null;
  quoteRef: string | null;
  quoteValidUntil: string | null;
  unitLabel: string | null;
  unitsTotal: number | null;
  unitPrice: number | null;
  campaign: Campaign | null;
  status: ItemStatus;
  published: boolean;
  received: number;
  contributions: number;
  pledges: number;
  unitsAdopted: number;
  units: PublicUnit[];
}
export interface AdoptBoard {
  canWrite: boolean;
  canApprove: boolean;
  items: AdoptItemRow[];
}

export function parseAdoptBoard(v: unknown): AdoptBoard | null {
  const r = obj(v);
  if (!r) return null;
  return {
    canWrite: bool(r["canWrite"]),
    canApprove: bool(r["canApprove"]),
    items: arr(r["items"]).flatMap((x) => {
      const i = obj(x);
      const id = i ? str(i["id"]) : null;
      if (!i || !id) return [];
      return [{
        id,
        code: str(i["code"]) ?? "",
        title: str(i["title"]) ?? "",
        category: oneOf(ITEM_CATEGORIES, i["category"], "ALTRO"),
        description: str(i["description"]) ?? "",
        supplier: str(i["supplier"]),
        supplierCode: str(i["supplierCode"]),
        productUrl: str(i["productUrl"]),
        photoPath: str(i["photoPath"]),
        priceMode: oneOf(PRICE_MODES, i["priceMode"], "DA_PREVENTIVO"),
        effectivePriceMode: oneOf(PRICE_MODES, i["effectivePriceMode"], "DA_PREVENTIVO"),
        priceTotal: num(i["priceTotal"]),
        priceNote: str(i["priceNote"]),
        quoteRef: str(i["quoteRef"]),
        quoteValidUntil: str(i["quoteValidUntil"]),
        unitLabel: str(i["unitLabel"]),
        unitsTotal: num(i["unitsTotal"]),
        unitPrice: num(i["unitPrice"]),
        campaign: i["campaign"] === "PALESTRA" || i["campaign"] === "INFERMERIA" ? i["campaign"] : null,
        status: oneOf(ITEM_STATUSES, i["status"], "BOZZA"),
        published: bool(i["published"]),
        received: num(i["received"]) ?? 0,
        contributions: num(i["contributions"]) ?? 0,
        pledges: num(i["pledges"]) ?? 0,
        unitsAdopted: num(i["unitsAdopted"]) ?? 0,
        units: arr(i["units"]).flatMap((u) => {
          const o = obj(u);
          const n = o ? num(o["n"]) : null;
          return o && n !== null ? [{ n, adopted: o["status"] === "ADOTTATO", plate: str(o["plate"]) }] : [];
        }),
      }];
    }),
  };
}

export interface ProposalRow {
  id: string;
  code: string;
  area: ProposalArea;
  title: string;
  body: string;
  anonymous: boolean;
  contact: string | null;
  canContribute: Contribution[];
  status: ProposalStatus;
  reason: string | null;
  published: boolean;
  publicTitle: string | null;
  publicText: string | null;
  itemId: string | null;
  createdAt: string | null;
}
export interface ProposalBoard {
  canWrite: boolean;
  canApprove: boolean;
  canAdopt: boolean;
  proposals: ProposalRow[];
  spam: number;
}

export function parseProposalBoard(v: unknown): ProposalBoard | null {
  const r = obj(v);
  if (!r) return null;
  return {
    canWrite: bool(r["canWrite"]),
    canApprove: bool(r["canApprove"]),
    canAdopt: bool(r["canAdopt"]),
    spam: num(r["spam"]) ?? 0,
    proposals: arr(r["proposals"]).flatMap((x) => {
      const p = obj(x);
      const id = p ? str(p["id"]) : null;
      if (!p || !id) return [];
      return [{
        id,
        code: str(p["code"]) ?? "",
        area: oneOf(PROPOSAL_AREAS, p["area"], "ALTRO"),
        title: str(p["title"]) ?? "",
        body: str(p["body"]) ?? "",
        anonymous: bool(p["anonymous"]),
        contact: str(p["contact"]),
        canContribute: arr(p["canContribute"]).filter((c): c is Contribution => typeof c === "string" && (CONTRIBUTIONS as readonly string[]).includes(c)),
        status: oneOf(PROPOSAL_STATUSES, p["status"], "NUOVA"),
        reason: str(p["reason"]),
        published: bool(p["published"]),
        publicTitle: str(p["publicTitle"]),
        publicText: str(p["publicText"]),
        itemId: str(p["itemId"]),
        createdAt: str(p["createdAt"]),
      }];
    }),
  };
}

/* ------------------------------------------------------------------ wording */

const EUR = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });
export function euro(n: number | null | undefined): string {
  return n === null || n === undefined ? "—" : EUR.format(n);
}
export function itDay(iso: string | null | undefined): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

/** Price line of an item in plain words; never a number when there is no valid price. */
export function priceLine(i: { priceMode: PriceMode; priceTotal: number | null; priceNote: string | null; quoteExpired?: boolean }): string {
  if (i.priceMode === "PREZZO" && i.priceTotal !== null) return `${euro(i.priceTotal)}${i.priceNote ? ` · ${i.priceNote}` : ""}`;
  if (i.priceMode === "DA_PREVENTIVO_AGGIORNATO") return "Da preventivo aggiornato: l'offerta precedente è scaduta, il prezzo va riconfermato.";
  return "Da preventivo: il prezzo arriva con l'offerta del fornitore.";
}

/* ------------------------------------------------------------------ vetrina-ready slot */

/**
 * Ready for the public-home vetrina (UD-110 "banner collegati o anche dona"), NOT on air: the home layout is unchanged.
 * To put it on air, add it to VETRINA_SLOTS in vetrina-slots.server.ts once the Direzione approves r101 and the texts.
 */
export const SOSTIENI_VETRINA_SLOT = {
  id: "sostieni-adotta",
  kind: "promo",
  theme: "servizi",
  kicker: "Sostieni il club",
  title: "Adotta un oggetto, dona materiale, proponi un'idea",
  text: "Cose di cui il club ha bisogno, campagne palestra e infermeria e proposte di miglioramento.",
  href: "/sostieni",
  cta: "Scopri come aiutare",
  visual: { kind: "type", big: "Adotta", small: CLUB_NAME },
  audience: "public",
  audiences: ["famiglie", "tifosi"],
  weight: 2,
  evergreen: false,
} as const;
