/**
 * Listino partner of the /sponsor page (item C1, Direzione 14/10/2026: "the app must be commercially productive").
 *
 * What each package gives and who sees it. Rules:
 * - no price is published until the Direzione approves it: every entry is `{ kind: "da_approvare" }` and renders as
 *   "Prezzo su richiesta · in approvazione". The `euro` variant exists only so an approved price can be entered later.
 * - audience is described in words; numbers only when documented in the repo, otherwise `audienceNumbers: null`
 *   (rendered "Numeri: da misurare"). Nothing here is measured yet.
 * - this file never says who is a sponsor (that is `sponsors.ts`); tournament facts come from `events.ts` / `tournaments.ts`.
 * - `requestable` packages preselect themselves in the proposal form (#proposta, `PartnerForm` interessi);
 *   a package with `link` sends people to an existing page instead. "Seggiolino in tribuna" is kept internal (UD-132,
 *   SEAT_PACKAGE_INTERNAL) and is not part of PARTNER_PACKAGES.
 */

export type PackagePrice =
  { kind: "da_approvare" } | { kind: "euro"; from: number; to?: number };

export type PackageIcon =
  "ledwall" | "maglia" | "tornei" | "digitale" | "seggiolino";

export interface PartnerPackage {
  /** Stable id: also sent in the form payload (`interessi`) and accepted as `?pacchetto=` on /sponsor. Max 40 chars. */
  id: string;
  title: string;
  /** One short sentence: what the package is. */
  summary: string;
  /** What the partner gets, concrete. At least 3. */
  benefits: readonly string[];
  /** Who sees it, in words. */
  audience: string;
  /** Documented audience numbers, or null = "da misurare". */
  audienceNumbers: string | null;
  price: PackagePrice;
  icon: PackageIcon;
  /** Main package: shown first and larger. Exactly one. */
  featured?: boolean;
  /** Link to an existing page instead of the proposal form. */
  link?: { to: "/sostieni"; label: string };
}

export const PARTNER_PACKAGES_AS_OF = "2026-10-14";

export const PARTNER_PACKAGES: readonly PartnerPackage[] = [
  {
    id: "ledwall",
    title: "LED wall",
    summary:
      "Il tuo spot sul ledwall a bordo campo a Colico, in rotazione con gli altri partner.",
    benefits: [
      "Uno slot nella rotazione del ledwall a bordo campo",
      "Logo, messaggio, servizi, zona e sito nel tuo spot",
      "Testi e immagini concordati con la società prima della messa in onda",
    ],
    audience:
      "Giocatori, famiglie, tifosi e squadre ospiti presenti al campo di Colico.",
    audienceNumbers: null,
    price: { kind: "da_approvare" },
    icon: "ledwall",
  },
  {
    id: "maglia-kit",
    title: "Maglia e kit",
    summary:
      "Il tuo marchio sulle divise di una squadra o sul materiale del club.",
    benefits: [
      "Logo sulla maglia da gara o di allenamento della squadra scelta",
      "Presenza nella foto ufficiale della squadra",
      "Marchio su borse, tute o materiale tecnico, da definire nella proposta",
    ],
    audience:
      "Chi segue la squadra in casa e in trasferta, e chi vede le foto della società.",
    audienceNumbers: null,
    price: { kind: "da_approvare" },
    icon: "maglia",
  },
  {
    id: "tornei",
    title: "Tornei",
    summary:
      "Partner dei tornei del club: Christmas Lario Cup e Memorial Nasazzi.",
    benefits: [
      "Title partner di un torneo: il tuo nome accanto al nome del torneo",
      "Premio fair play con il tuo marchio, consegnato in campo",
      "Spazio nel villaggio del torneo per farti conoscere",
      "Christmas Lario Cup l'8 dicembre 2026, maschile e femminile; Memorial Nasazzi a maggio 2027 (date da confermare)",
    ],
    audience:
      "Squadre ospiti, accompagnatori e famiglie che vengono a Colico e Dervio per i tornei.",
    audienceNumbers: null,
    price: { kind: "da_approvare" },
    icon: "tornei",
  },
  {
    id: "digitale-giovanili",
    title: "Digitale e settore giovanile",
    summary:
      "Visibilità nell'app del club e partner di una squadra del settore giovanile.",
    benefits: [
      "Il tuo marchio nelle pagine pubbliche dell'app del club",
      "Partner di una squadra del settore giovanile per la stagione",
      "Spazio per raccontare la tua attività nelle notizie del club",
    ],
    audience:
      "Famiglie dei ragazzi, atleti e tifosi che usano l'app per calendari, risultati e notizie.",
    audienceNumbers: null,
    price: { kind: "da_approvare" },
    icon: "digitale",
  },
];

/** "Seggiolino in tribuna": kept internal while INTERNAL_ONLY.seatAdoption (UD-132); not offered on /sponsor. */
export const SEAT_PACKAGE_INTERNAL: PartnerPackage = {
  id: "seggiolino",
  title: "Seggiolino in tribuna",
  summary: "Un posto della tribuna con la targhetta della tua azienda.",
  benefits: [
    "Targhetta con il nome dell'azienda sul posto adottato",
    "Puoi adottare un solo posto o più posti",
    "Lo stato del posto (da adottare, adottato) è visibile in Sostieni",
  ],
  audience: "Chi siede in tribuna alle partite in casa.",
  audienceNumbers: null,
  price: { kind: "da_approvare" },
  icon: "seggiolino",
  link: { to: "/sostieni", label: "Vedi la tribuna in Sostieni" },
};

export const AUDIENCE_TO_MEASURE = "da misurare";

export function formatPackagePrice(price: PackagePrice): string {
  if (price.kind === "da_approvare")
    return "Prezzo su richiesta · in approvazione";
  // Fixed grouping (1.500), independent of the runtime ICU data (it-IT does not group 4-digit numbers).
  const eur = (n: number) =>
    `€ ${Math.round(n)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
  return price.to !== undefined && price.to > price.from
    ? `${eur(price.from)} – ${eur(price.to)}`
    : `da ${eur(price.from)}`;
}

export function formatAudienceNumbers(
  p: Pick<PartnerPackage, "audienceNumbers">,
): string {
  return `Numeri: ${p.audienceNumbers ?? AUDIENCE_TO_MEASURE}`;
}

/** Packages that are asked for through the proposal form (not the ones that link elsewhere). */
export const requestablePackages = (): PartnerPackage[] =>
  PARTNER_PACKAGES.filter((p) => !p.link);

export function packageById(
  id: string | null | undefined,
): PartnerPackage | undefined {
  return id ? PARTNER_PACKAGES.find((p) => p.id === id) : undefined;
}

/** `?pacchetto=` value accepted by /sponsor: only a known requestable id, otherwise undefined. */
export function parsePackageParam(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const p = packageById(v);
  return p && !p.link ? p.id : undefined;
}

/** Text prefilled in the form message when a package is chosen, so the choice travels with the request. */
export function packageRequestNote(id: string | null | undefined): string {
  const p = packageById(id);
  return p ? `Mi interessa il pacchetto «${p.title}».` : "";
}

/** Words the club does not use in its commercial copy (stem match, lower case). */
export const FORBIDDEN_HYPE_STEMS = [
  "straordinari",
  "incredibil",
  "unico",
  "unica",
  "eccezional",
  "imperdibil",
  "esclusiv",
  "rivoluzion",
  "fantastic",
  "pazzesc",
] as const;

export function hypeWordsIn(text: string): string[] {
  const t = text.toLowerCase();
  return FORBIDDEN_HYPE_STEMS.filter((w) =>
    new RegExp(`(^|[^\\p{L}])${w}`, "u").test(t),
  );
}

/** "Come funziona": no response time is documented, so the second step says only that the club calls back. */
export const PACKAGE_STEPS: readonly { title: string; text: string }[] = [
  {
    title: "Scegli il pacchetto",
    text: "Guarda cosa comprende e premi «Chiedi questo pacchetto».",
  },
  {
    title: "Ti ricontattiamo",
    text: "La società ti chiama per capire cosa ti serve e prepara la proposta.",
  },
  {
    title: "Contratto e fattura",
    text: "Contratto e fattura li fa la società. Nessun pagamento online.",
  },
];
