/**
 * Review page of one sponsor LED spot (backlog B1, UD-119; Francesco 14/10/2026: "il presidente o commerciale propone
 * lo spot, lo sponsor accetta oppure chiede di cambiare").
 *
 * /spot/$slug is the link the Presidente or the commerciale sends to the company (they send it themselves, from
 * WhatsApp or their own mail: the app never sends messages). The company watches the spot and answers "Approvo lo
 * spot" or "Chiedo modifiche". The answer travels on the EXISTING sponsor proposal path of /sponsor#proposta
 * (PartnerForm → submitPartnerLead, or the official e-mail while public forms are paused): no new table, endpoint
 * or CRM. The status never changes by itself: the club updates it after reading the answer (today in
 * sponsor-spots.ts, later in the staged r106 spot register).
 *
 * The page is not secret (the spots are already public on the home): noindex, out of the navigation and the sitemap.
 * Pure data and functions, SSR safe, tested in spot-review.test.ts.
 */
import { absoluteUrl, whatsappUrl, type MetaEntry } from "./share";
import { SPOT_STANDARD_TEXT } from "./sponsor-process";
import { SPONSOR_SPOTS, SPOT_STATUS_LABEL, isShowable, type SponsorSpot } from "./sponsor-spots";
import { SPONSORS, type Sponsor } from "./sponsors";

export { SPOT_STANDARD_TEXT };

/** Route prefix of the review pages. */
export const SPOT_REVIEW_PREFIX = "/spot";

/** Same slug shape as the staged spot register (r106 sponsor_slug check). */
const SLUG_RE = /^[a-z0-9-]{2,60}$/;

/** Root-relative path of the review page of a spot. */
export function spotReviewPath(slug: string): string {
  return `${SPOT_REVIEW_PREFIX}/${encodeURIComponent(slug)}`;
}

/** Absolute link on the official public origin (the one the commerciale copies and sends). */
export function spotReviewUrl(slug: string, siteUrl?: string | null): string {
  return absoluteUrl(spotReviewPath(slug), siteUrl);
}

/** The spot of a slug, only among the ready spots of confirmed sponsors; anything else is undefined (not found). */
export function findSpot(slug: string | null | undefined, spots: readonly SponsorSpot[] = SPONSOR_SPOTS): SponsorSpot | undefined {
  if (typeof slug !== "string") return undefined;
  const s = slug.trim().toLowerCase();
  if (!SLUG_RE.test(s)) return undefined;
  return spots.find((x) => x.slug === s);
}

/** Official logo of the sponsor, only the file already listed in sponsors.ts (cropped from the official board). */
export function sponsorLogoSrc(slug: string, list: readonly Sponsor[] = SPONSORS): string | null {
  const s = list.find((x) => x.slug === slug);
  return s && s.src.startsWith("/media/sponsor/") ? s.src : null;
}

/** Where the spot runs: only what is true (LED wall player, FAQ "spot-dove"). No in-app showcase (Francesco 15/10/2026: no vetrine). */
export const SPOT_WHERE: readonly { id: string; title: string; text: string }[] = [
  { id: "ledwall", title: "LED wall del campo", text: "Sul LED wall a bordo campo a Colico, in rotazione con gli altri partner." },
];

/** One line on whether the spot is in rotation now, from the same rule as the home and the LED wall (isShowable). */
export function spotAirNote(spot: Pick<SponsorSpot, "slug" | "status">, list: readonly Sponsor[] = SPONSORS): string {
  if (!isShowable(spot, list)) {
    return "Con modifiche richieste lo spot non va in onda: il club prepara la nuova versione e te la propone.";
  }
  if (spot.status === "DA_APPROVARE") return "Intanto lo spot è già in rotazione sul LED wall del campo, in attesa della tua risposta.";
  return "Lo spot è in rotazione sul LED wall del campo.";
}

export type SpotAnswerKind = "approvato" | "modifiche";

export const SPOT_ANSWER_LABEL: Readonly<Record<SpotAnswerKind, string>> = {
  approvato: "Approvo lo spot",
  modifiche: "Chiedo modifiche",
};

/** Bounds of the "what to change" text. The full message stays within the proposal form limit (1500 characters). */
export const MODIFICHE_MIN = 5;
export const MODIFICHE_MAX = 1000;
export const PARTNER_MESSAGE_MAX = 1500;

/** Error to show for an answer, or null when it can be sent. */
export function validateSpotAnswer(kind: SpotAnswerKind, text = ""): string | null {
  if (kind === "approvato") return null;
  const t = text.trim();
  if (t.length < MODIFICHE_MIN) return "Scrivi cosa vuoi cambiare nello spot.";
  if (t.length > MODIFICHE_MAX) return `Il testo è troppo lungo: al massimo ${MODIFICHE_MAX} caratteri.`;
  return null;
}

/** Short subject: "Spot carcano: approvato" / "Spot carcano: modifiche richieste". */
export function spotAnswerTopic(slug: string, kind: SpotAnswerKind): string {
  return `Spot ${slug}: ${kind === "approvato" ? "approvato" : "modifiche richieste"}`;
}

/**
 * Message carried by the proposal form (or the e-mail body while forms are paused):
 * "Spot carcano: approvato." / "Spot carcano: modifiche richieste — <text>", then company and page link.
 * Whitespace of the text is normalised; the caller validates first (validateSpotAnswer).
 */
export function spotAnswerMessage(
  spot: Pick<SponsorSpot, "slug" | "sponsorName">,
  kind: SpotAnswerKind,
  text = "",
  siteUrl?: string | null,
): string {
  const topic = spotAnswerTopic(spot.slug, kind);
  const clean = text.replace(/\s+/g, " ").trim().slice(0, MODIFICHE_MAX);
  const head = kind === "approvato" ? `${topic}.` : `${topic} — ${clean}`;
  return [head, `Azienda: ${spot.sponsorName}`, `Pagina dello spot: ${spotReviewUrl(spot.slug, siteUrl)}`].join("\n");
}

/** Shown once the answer has reached the club (never claims an automatic status change). */
export const SPOT_ANSWER_RECEIVED = "Ricevuto: il club aggiorna lo stato dopo aver letto la risposta.";

/** Shown next to the official e-mail while the online form is paused (nothing is sent by the app). */
export const SPOT_ANSWER_AFTER_MAIL = "Quando la tua e-mail arriva, il club aggiorna lo stato dopo aver letto la risposta.";

/** Text sent with the link by the commerciale (WhatsApp or copy): facts only, no prices, no numbers. */
export function spotReviewShareText(spot: Pick<SponsorSpot, "sponsorName">): string {
  return `Ecco lo spot LED di ${spot.sponsorName} per il campo di Colico: guardalo e dicci se va bene o cosa cambiare.`;
}

/** wa.me link without a recipient (the commerciale picks the chat), same helper as the public share buttons. */
export function spotReviewWhatsapp(spot: Pick<SponsorSpot, "slug" | "sponsorName">, siteUrl?: string | null): string {
  return whatsappUrl({ text: spotReviewShareText(spot), url: spotReviewUrl(spot.slug, siteUrl) });
}

/** <head> of the review page: always noindex, nofollow (also for an unknown slug). */
export function spotReviewMeta(spot: Pick<SponsorSpot, "sponsorName"> | undefined): MetaEntry[] {
  const title = spot ? `Spot LED di ${spot.sponsorName} — S.C.D. ColicoDerviese` : "Spot non trovato — S.C.D. ColicoDerviese";
  return [
    { title },
    { name: "robots", content: "noindex, nofollow" },
    {
      name: "description",
      content: spot
        ? `Lo spot LED di ${spot.sponsorName} per il campo della S.C.D. ColicoDerviese: approvalo o chiedi modifiche.`
        : "Spot LED dei partner della S.C.D. ColicoDerviese.",
    },
  ];
}

/** Status label of the spot, from sponsor-spots.ts. */
export function spotStatusLabel(spot: Pick<SponsorSpot, "status">): string {
  return SPOT_STATUS_LABEL[spot.status];
}
