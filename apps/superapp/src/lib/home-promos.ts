/**
 * Home promo band at the bottom of the public home (Francesco 16/10/2026 21:43, UD-143):
 * «Nella home a rotazione in basso devi fare passare una promo: questi sono i nostri sponsor che a bordo campo ci
 * sostengono, vuoi farlo anche tu? Scrivi e ti ricontattiamo … Poi ogni due giorni fai comparire Sky con la divisa e
 * lo sponsor e fai lo stesso e poi anche altre idee se vuoi sostenere i nostri colori. Poi a rotazione le convenzioni
 * annunciate che ti comunico».
 *
 * Pure rules, shared by the home band and by the daily Super Giornalista (the social twin of the day tags the same
 * sponsor): everything depends only on the Rome calendar day, so server, client and agent agree.
 * - every day: "A bordo campo" (confirmed sponsors + the sponsor of the day, CTA to the /sponsor proposal form);
 * - every second day: Sky in the official match kit with the sponsors on the shirt (official artwork only);
 * - every day: "Sostieni i nostri colori";
 * - convenzioni: only those announced by Francesco, inside their dates, partner among the confirmed sponsors.
 * Copy can change at will (Francesco: «puoi decidere tu la grafica e il messaggio e cambiarlo quanto vuoi»).
 */
import { SPONSORS, type Sponsor } from "@/lib/sponsors";

export type PromoKind = "bordo-campo" | "sky" | "colori" | "convenzione";

export interface Convenzione {
  id: string;
  /** Slug of a confirmed sponsor in lib/sponsors.ts. */
  partnerSlug: string;
  title: string;
  text: string;
  /** Where the visitor goes (internal path); defaults to the sponsor page. */
  href?: string;
  /** Inclusive Rome days, YYYY-MM-DD. */
  from: string;
  until: string;
}

/**
 * Convenzioni announced by Francesco. Empty until he sends them: nothing is invented (no partner, discount or date
 * without his words). Add one entry per announcement with its source in a comment.
 */
export const CONVENZIONI: readonly Convenzione[] = [];

export interface Promo {
  kind: PromoKind;
  id: string;
  kicker: string;
  title: string;
  text: string;
  cta: { label: string; to: string; hash?: string };
  secondary?: { label: string; to: string };
  /** Sponsor shown big (sponsor of the day / convention partner). */
  sponsor?: Sponsor;
}

const DAY_MS = 86_400_000;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Days since 1970-01-01 for a Rome calendar day (YYYY-MM-DD). */
export function dayNumber(day: string): number {
  if (!DAY_RE.test(day)) throw new Error(`invalid day: ${day}`);
  return Math.floor(Date.parse(`${day}T12:00:00Z`) / DAY_MS);
}

/** Sky appears every second day (even day numbers). */
export function isSkyDay(day: string): boolean {
  return dayNumber(day) % 2 === 0;
}

/** Confirmed sponsors only: a name not verified never appears by name. */
export function confirmedSponsors(list: readonly Sponsor[] = SPONSORS): Sponsor[] {
  return list.filter((s) => Boolean(s.name) && s.nameVerified);
}

/** One confirmed sponsor per day, in turn. */
export function sponsorOfDay(day: string, list: readonly Sponsor[] = confirmedSponsors()): Sponsor | undefined {
  if (list.length === 0) return undefined;
  return list[dayNumber(day) % list.length];
}

/** A window of `n` confirmed sponsors starting from the sponsor of the day (logo row of the band). */
export function sponsorWindow(day: string, n: number, list: readonly Sponsor[] = confirmedSponsors()): Sponsor[] {
  if (list.length === 0 || n <= 0) return [];
  const start = dayNumber(day) % list.length;
  return Array.from({ length: Math.min(n, list.length) }, (_, i) => list[(start + i) % list.length]!);
}

/** Convenzioni valid on `day` whose partner is a confirmed sponsor. */
export function activeConvenzioni(
  day: string,
  list: readonly Convenzione[] = CONVENZIONI,
  sponsors: readonly Sponsor[] = confirmedSponsors(),
): Array<Convenzione & { sponsor: Sponsor }> {
  const bySlug = new Map(sponsors.map((s) => [s.slug, s]));
  return list.flatMap((c) => {
    const sponsor = bySlug.get(c.partnerSlug);
    if (!sponsor || !DAY_RE.test(c.from) || !DAY_RE.test(c.until)) return [];
    return c.from <= day && day <= c.until ? [{ ...c, sponsor }] : [];
  });
}

const PROPOSAL = { to: "/sponsor", hash: "proposta" } as const;

/** The promos of the day, in rotation order. */
export function promosForDay(
  day: string,
  convenzioni: readonly Convenzione[] = CONVENZIONI,
  sponsors: readonly Sponsor[] = confirmedSponsors(),
): Promo[] {
  const star = sponsorOfDay(day, sponsors);
  const out: Promo[] = [
    {
      kind: "bordo-campo",
      id: "bordo-campo",
      kicker: "A bordo campo",
      title: "Questi sono i nostri sponsor",
      text: "Ci sostengono a bordo campo, partita dopo partita. Vuoi farlo anche tu? Scrivici e ti ricontattiamo.",
      cta: { label: "Scrivici, ti ricontattiamo", ...PROPOSAL },
      secondary: { label: "Tutti i partner", to: "/sponsor" },
      ...(star ? { sponsor: star } : {}),
    },
  ];
  if (isSkyDay(day))
    out.push({
      kind: "sky",
      id: "sky-divisa",
      kicker: "Sky in divisa",
      title: "Sulla maglia, chi crede in noi",
      text: "Sky veste la divisa gara con i marchi delle aziende che sostengono la ColicoDerviese. Vuoi esserci anche tu? Scrivici e ti ricontattiamo.",
      cta: { label: "Porta qui il tuo marchio", ...PROPOSAL },
    });
  out.push({
    kind: "colori",
    id: "nostri-colori",
    kicker: "Sostieni i nostri colori",
    title: "Il blu e il giallo, anche fuori dal campo",
    text: "Indossa il kit 2026/27, vieni a tifare alle partite in casa, porta la tua azienda a bordo campo.",
    cta: { label: "Scopri il kit", to: "/kit" },
    secondary: { label: "Partite in casa", to: "/calendario" },
  });
  for (const c of activeConvenzioni(day, convenzioni, sponsors))
    out.push({
      kind: "convenzione",
      id: `convenzione-${c.id}`,
      kicker: "Convenzione",
      title: c.title,
      text: c.text,
      cta: { label: "Scopri la convenzione", to: c.href ?? "/sponsor" },
      sponsor: c.sponsor,
    });
  return out;
}
