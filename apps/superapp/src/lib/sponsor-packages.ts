/**
 * Listino partner of the /sponsor page (item C1, Direzione 14/10/2026: "the app must be commercially productive").
 *
 * What each package gives, where the brand appears and who sees it. Rules:
 * - no price, amount or discount, ever (Francesco 17/10/2026 09:42: «prezzi non esposti perché li fa al momento il
 *   Presidente; dobbiamo solo rendere appetibile il singolo sponsor o idea di sponsorizzazione»). There is no price
 *   field at all: every package renders PROPOSAL_ON_MEASURE. Prices live only in the Presidente's proposal;
 * - audience is described in words; numbers only when documented in the repo, otherwise `audienceNumbers: null`
 *   (rendered "Numeri: da misurare"). Nothing here is measured yet.
 * - this file never says who is a sponsor (that is `sponsors.ts`); tournament facts come from `events.ts` / `tournaments.ts`.
 * - `requestable` packages preselect themselves in the proposal form (#proposta, `PartnerForm` interessi);
 *   a package with `link` sends people to an existing page instead. "Seggiolino in tribuna" is kept internal (UD-132,
 *   SEAT_PACKAGE_INTERNAL) and is not part of PARTNER_PACKAGES.
 */

/** Shown wherever a price would be (packages, ideas, FAQ): the Presidente defines the proposal with the company. */
export const PROPOSAL_ON_MEASURE = "Proposta su misura: la definisce il Presidente con te";

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
  /** Where the brand appears, as short concrete places (chips on the card). 2 to 4. */
  placements: readonly string[];
  /** One plain story line: the scene the sponsor becomes part of. */
  story: string;
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
    placements: ["LED a bordo campo, Colico", "LED wall dal vivo nella pagina Sponsor dell'app"],
    story: "Partita in casa a Colico: le famiglie guardano i loro ragazzi e, a bordo campo, gira anche il tuo spot.",
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
    placements: ["Maglia da gara o di allenamento", "Foto ufficiale della squadra", "Borse, tute e materiale tecnico"],
    story: "Il tuo marchio scende in campo con i ragazzi, in casa e in trasferta, e resta nella foto di squadra.",
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
    placements: ["Christmas Lario Cup, Colico e Dervio", "Premio fair play in campo", "Villaggio del torneo"],
    story: "A dicembre squadre ospiti e famiglie arrivano sul lago per la Christmas Lario Cup: il tuo nome le accoglie.",
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
    placements: ["Pagine pubbliche dell'app del club", "Una squadra del settore giovanile", "Notizie del club"],
    story: "Le famiglie aprono l'app per sapere quando e dove si gioca: lì trovano anche la tua azienda.",
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
  placements: ["Targhetta sul seggiolino della tribuna"],
  story: "Ogni partita in casa, qualcuno si siede al posto con il nome della tua azienda.",
  icon: "seggiolino",
  link: { to: "/sostieni", label: "Vedi la tribuna in Sostieni" },
};

export const AUDIENCE_TO_MEASURE = "da misurare";

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
    title: "Scegli il pacchetto o l'idea",
    text: "Guarda dove compare il tuo marchio e premi «Parliamone».",
  },
  {
    title: "Ne parli con il Presidente",
    text: "La società ti chiama: il Presidente capisce cosa ti serve e definisce con te la proposta su misura.",
  },
  {
    title: "Contratto e fattura",
    text: "Contratto e fattura li fa la società. Nessun pagamento online.",
  },
];
