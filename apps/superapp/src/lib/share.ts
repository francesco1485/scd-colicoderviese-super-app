/**
 * Sharing of public pages (C3, Direzione 14/10/2026: "l'app deve essere condivisibile e girare col passaparola").
 *
 * - Every shared link is absolute on the official public origin (app.colicoderviese.it, lib/install-link.ts), whatever
 *   host the page was opened from, so a forwarded message never carries a temporary address.
 * - WhatsApp uses the plain https://wa.me/?text= link: no SDK, no tracking parameters.
 * - pageMeta() builds the <head> entries (title, description, Open Graph, Twitter card) for a route head(); og:image
 *   is always an official file already served from public/ (crest on the club background or an official poster).
 *
 * Share texts are short, plain Italian and carry only facts already written on the page.
 */
import { officialOrigin } from "@/lib/install-link";

/** Official image served from public/ and used as og:image. */
export type ShareImage = {
  /** Root-relative path under public/, e.g. "/icon-maskable-512.png". */
  src: string;
  width: number;
  height: number;
  alt: string;
};

/** Crest on the club navy background (PWA icon built from the official crest, config/scd-assets.v1.json). */
export const CREST_SHARE_IMAGE: ShareImage = {
  src: "/icon-maskable-512.png",
  width: 512,
  height: 512,
  alt: "Stemma della S.C.D. ColicoDerviese",
};

/** Official Christmas Lario Cup 2026 poster (maschile), EVENT_POSTER in config/scd-assets.v1.json. */
export const CHRISTMAS_POSTER_SHARE_IMAGE: ShareImage = {
  src: "/media/eventi/christmas-lario-cup-2026-maschile.webp",
  width: 560,
  height: 700,
  alt: "Locandina ufficiale della Christmas Lario Cup 2026",
};

export type SharePage = {
  /** Root-relative path of the page, e.g. "/sponsor". */
  path: string;
  /** <title> of the page. */
  title: string;
  /** Meta description (search engines). */
  description: string;
  /** og:title; defaults to title. */
  ogTitle?: string;
  /** og:description; defaults to description. */
  ogDescription?: string;
  /** Message sent with the link (WhatsApp, system share sheet). */
  shareText: string;
  image: ShareImage;
};

/** Public pages that carry a ShareButton and full Open Graph meta (C3). */
export const SHARE_PAGES = {
  sponsor: {
    path: "/sponsor",
    title: "Diventa Sponsor — Commercial Hub | SCD ColicoDerviese",
    description:
      "Pacchetti Naming Event, Main Partner, Team, Digital, Local e Sponsor Tecnico: porta il tuo brand in campo con la S.C.D. ColicoDerviese.",
    ogTitle: "Diventa Sponsor della SCD ColicoDerviese",
    ogDescription: "Commercial Hub: pacchetti, asset digitali e fisici, richiesta proposta.",
    shareText: "Diventa sponsor della ColicoDerviese: pacchetti per aziende e richiesta di una proposta su misura.",
    image: CREST_SHARE_IMAGE,
  },
  sostieni: {
    path: "/sostieni",
    title: "Sostieni il club — S.C.D. ColicoDerviese",
    description:
      "Adotta un oggetto di cui il club ha bisogno, dona materiale per la nuova palestra e la nuova infermeria, sostieni il Fondo Solidale o proponi un miglioramento.",
    ogTitle: "Sostieni la S.C.D. ColicoDerviese",
    ogDescription: "Adotta un oggetto, dona materiale, sostieni il Fondo Solidale, proponi un miglioramento.",
    shareText: "Sostieni la ColicoDerviese: adotta un oggetto di cui il club ha bisogno o dona materiale per la nuova palestra e la nuova infermeria.",
    image: CREST_SHARE_IMAGE,
  },
  donaMateriale: {
    path: "/sostieni/dona-materiale",
    title: "Dona materiale — S.C.D. ColicoDerviese",
    description:
      "Adotta la nuova palestra SCD e la nuova infermeria: offri attrezzi in buono stato, materiale sanitario nuovo e sigillato o arredi.",
    ogTitle: "Dona materiale alla S.C.D. ColicoDerviese",
    shareText: "Hai attrezzi in buono stato o materiale sanitario nuovo? Puoi donarlo alla ColicoDerviese per la nuova palestra e la nuova infermeria.",
    image: CREST_SHARE_IMAGE,
  },
  fondoSolidale: {
    path: "/sostieni/fondo-solidale",
    title: "Fondo Solidale — S.C.D. ColicoDerviese",
    description:
      "Il Fondo Solidale della S.C.D. ColicoDerviese aiuta le famiglie in difficoltà con la quota. Come sostenerlo e come fare domanda, in modo riservato.",
    ogTitle: "Fondo Solidale della S.C.D. ColicoDerviese",
    shareText: "Il Fondo Solidale della ColicoDerviese aiuta le famiglie in difficoltà con la quota: nessun ragazzo resta fuori.",
    image: CREST_SHARE_IMAGE,
  },
  proponi: {
    path: "/sostieni/proponi",
    title: "Proponi un miglioramento — S.C.D. ColicoDerviese",
    description:
      "Segnala alla S.C.D. ColicoDerviese un miglioramento o un bisogno per campi, palestra, infermeria, club house o sicurezza, anche in forma anonima.",
    ogTitle: "Proponi un miglioramento alla S.C.D. ColicoDerviese",
    shareText: "Hai un'idea per migliorare campi, palestra, infermeria o club house della ColicoDerviese? Puoi proporla, anche senza nome.",
    image: CREST_SHARE_IMAGE,
  },
  lotteria: {
    path: "/eventi/lotteria-dello-sport",
    // UD-132: kept internal — neutral wording until Francesco decides to publish it.
    title: "Iniziativa in preparazione — S.C.D. ColicoDerviese",
    description: "La S.C.D. ColicoDerviese pubblicherà qui i dettagli quando saranno pronti.",
    shareText: "Un'iniziativa della ColicoDerviese in preparazione.",
    image: CREST_SHARE_IMAGE,
  },
  tornei: {
    path: "/tornei",
    title: "Tornei — S.C.D. ColicoDerviese",
    description:
      "I tornei della S.C.D. ColicoDerviese: Christmas Lario Cup maschile e Female Edition (8 dicembre 2026), Memorial José Nasazzi 2027, Memorial Sandro Guattini.",
    ogDescription: "Tornei giovanili maschili e femminili organizzati dalla ColicoDerviese a Colico e Dervio.",
    shareText: "I tornei della ColicoDerviese a Colico e Dervio: calendario e iscrizioni.",
    image: CREST_SHARE_IMAGE,
  },
  christmasLarioCup: {
    path: "/eventi/christmas-lario-cup",
    title: "Christmas Lario Cup 2026 — 8 dicembre, Colico e Dervio",
    description:
      "1ª edizione della Christmas Lario Cup: torneo giovanile maschile (annate 2015 e 2016) a Colico e Female Edition (Esordienti 9v9) a Dervio, martedì 8 dicembre 2026. Iscrizioni aperte.",
    ogTitle: "Christmas Lario Cup 2026 — Colico e Dervio",
    ogDescription: "Il calcio che unisce, anche a Natale. 8 dicembre 2026 sul Lago di Como.",
    shareText: "Christmas Lario Cup, 8/12/2026 a Colico e Dervio: torneo giovanile di Natale della ColicoDerviese. Iscrizioni aperte.",
    image: CHRISTMAS_POSTER_SHARE_IMAGE,
  },
} as const satisfies Record<string, SharePage>;

export type SharePageKey = keyof typeof SHARE_PAGES;

/** Absolute URL on the official public origin for a root-relative path (query/hash kept). Absolute URLs pass through. */
export function absoluteUrl(path: string, siteUrl?: string | null): string {
  if (/^https?:\/\//i.test(path)) return path;
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${officialOrigin(siteUrl)}${clean}`;
}

export type ShareData = { title: string; text: string; url: string };

/** Data for navigator.share and for the WhatsApp / copy fallbacks. */
export function shareData(page: SharePage, siteUrl?: string | null): ShareData {
  return {
    title: page.ogTitle ?? page.title,
    text: page.shareText,
    url: absoluteUrl(page.path, siteUrl),
  };
}

/** Text + link in one message (WhatsApp, clipboard). */
export function shareMessage(data: Pick<ShareData, "text" | "url">): string {
  return `${data.text.trim()} ${data.url}`;
}

/** WhatsApp "click to chat" link without a recipient: the person picks the chat. */
export function whatsappUrl(data: Pick<ShareData, "text" | "url">): string {
  return `https://wa.me/?text=${encodeURIComponent(shareMessage(data))}`;
}

export type MetaEntry =
  | { title: string }
  | { name: string; content: string }
  | { property: string; content: string };

/** <head> meta entries for a public page: title, description, Open Graph and Twitter card, all non-empty. */
export function pageMeta(page: SharePage, siteUrl?: string | null): MetaEntry[] {
  const ogTitle = page.ogTitle ?? page.title;
  const ogDescription = page.ogDescription ?? page.description;
  const image = absoluteUrl(page.image.src, siteUrl);
  const square = page.image.width === page.image.height;
  return [
    { title: page.title },
    { name: "description", content: page.description },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: "S.C.D. ColicoDerviese" },
    { property: "og:locale", content: "it_IT" },
    { property: "og:title", content: ogTitle },
    { property: "og:description", content: ogDescription },
    { property: "og:url", content: absoluteUrl(page.path, siteUrl) },
    { property: "og:image", content: image },
    { property: "og:image:width", content: String(page.image.width) },
    { property: "og:image:height", content: String(page.image.height) },
    { property: "og:image:alt", content: page.image.alt },
    { name: "twitter:card", content: square ? "summary" : "summary_large_image" },
    { name: "twitter:title", content: ogTitle },
    { name: "twitter:description", content: ogDescription },
    { name: "twitter:image", content: image },
  ];
}
