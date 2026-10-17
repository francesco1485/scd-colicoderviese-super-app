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

/** What a public page needs for its <head>: title, description, Open Graph, canonical link (B8). */
export type PageMetaInput = {
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
  image: ShareImage;
};

export type SharePage = PageMetaInput & {
  /** Message sent with the link (WhatsApp, system share sheet). */
  shareText: string;
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
      "I tornei della S.C.D. ColicoDerviese: Christmas Lario Cup maschile e Female Edition (8 dicembre 2026), Memorial José Nasazzi e Female Edition (22–23 maggio 2027), Memorial Sandro Guattini.",
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
export function pageMeta(page: PageMetaInput, siteUrl?: string | null): MetaEntry[] {
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
    { property: "og:url", content: canonicalUrl(page.path, siteUrl) },
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

/**
 * Canonical address of a page (B8): official origin, path only (no query, no hash, no trailing slash except the home),
 * so the same page reached from the Render host, with ?lang= or with a #section is one page for search engines and
 * link previews.
 */
export function canonicalUrl(path: string, siteUrl?: string | null): string {
  const clean = path.split(/[?#]/)[0] || "/";
  const withSlash = clean.startsWith("/") ? clean : `/${clean}`;
  const trimmed = withSlash.length > 1 ? withSlash.replace(/\/+$/, "") || "/" : withSlash;
  return `${officialOrigin(siteUrl)}${trimmed}`;
}

export type LinkEntry = { rel: string; href: string; hrefLang?: string };

/**
 * Full head() result for a public page: its own meta (title, description, Open Graph, Twitter) + canonical link.
 * `canonical`: an absolute URL built by the route from validated values only (e.g. a language variant), or false for a
 * page that must not declare one (noindex, not found). `siteUrl` is a configured origin, never a request header.
 */
export function pageHead(
  page: PageMetaInput,
  options: { siteUrl?: string | null; extraMeta?: MetaEntry[]; extraLinks?: LinkEntry[]; canonical?: string | false | undefined } = {},
): { meta: MetaEntry[]; links: LinkEntry[] } {
  const href = options.canonical === undefined ? canonicalUrl(page.path, options.siteUrl) : options.canonical;
  const meta = pageMeta(page, options.siteUrl).map((m) =>
    href && "property" in m && m.property === "og:url" ? { property: "og:url", content: href } : m,
  );
  return {
    meta: [...meta, ...(options.extraMeta ?? [])],
    links: [...(href ? [{ rel: "canonical", href }] : []), ...(options.extraLinks ?? [])],
  };
}

/**
 * Public pages without a share button that still need their own link preview (B8). Titles and descriptions are the ones
 * each page already had; the image is always the official crest (CREST_SHARE_IMAGE), never a photo or a made-up
 * graphic. Pages owned by the PC chat (access, contacts, install, privacy, safeguarding) are listed in
 * PUBLIC_META_ELSEWHERE in public-meta.test.ts and keep their own head().
 */
export const PUBLIC_PAGES = {
  home: {
    path: "/",
    title: "S.C.D. ColicoDerviese — Calcio a Colico e Dervio",
    description:
      "La S.C.D. ColicoDerviese, il club di calcio di Colico e Dervio sull'Alto Lago di Como: eventi e tornei, notizie, Fantacalcio SCD, iscrizioni 2026/27 e partner del territorio.",
    ogDescription: "Eventi, notizie, giochi, iscrizioni e partner della S.C.D. ColicoDerviese.",
    image: CREST_SHARE_IMAGE,
  },
  calendario: {
    path: "/calendario",
    title: "Calendario 2026/27 — S.C.D. ColicoDerviese",
    description:
      "Le gare SCD di ieri, oggi, domani e della settimana: casa e trasferta, stagione 2026/27. Dati da riconfermare in caso di variazioni.",
    ogDescription: "Le gare SCD della stagione 2026/27 per giorno, settimana, mese e squadra.",
    image: CREST_SHARE_IMAGE,
  },
  eventi: {
    path: "/eventi",
    title: "Eventi — S.C.D. ColicoDerviese",
    description: "Open day, tornei e serate biancoblù pubblicati dalla S.C.D. ColicoDerviese sull'Alto Lago di Como.",
    ogDescription: "Open day, tornei e serate biancoblù della S.C.D. ColicoDerviese.",
    image: CREST_SHARE_IMAGE,
  },
  lezioniTecnicoCoordinative: {
    path: "/eventi/lezioni-tecnico-coordinative",
    title: "Lezioni tecnico-coordinative — S.C.D. ColicoDerviese",
    description:
      "Lezioni per migliorare tecnica e coordinazione con il mister Alessandro Perico (Tecnico UEFA C), in collaborazione con la S.C.D. ColicoDerviese.",
    ogTitle: "Lezioni tecnico-coordinative con il mister Alessandro Perico",
    ogDescription: "In collaborazione con la S.C.D. ColicoDerviese. Giorni, orari e costi dal mister.",
    image: CREST_SHARE_IMAGE,
  },
  impianti: {
    path: "/impianti",
    title: "I nostri campi — Impianti S.C.D. ColicoDerviese",
    description:
      "Mappa dei centri sportivi di Colico e Dervio: campi, spogliatoi, servizi, orari, ingresso per il pubblico e biglietteria.",
    ogTitle: "I nostri campi — S.C.D. ColicoDerviese",
    ogDescription: "Dove si gioca, da dove si entra, quando è aperto.",
    image: CREST_SHARE_IMAGE,
  },
  societa: {
    path: "/societa",
    title: "Chi siamo — S.C.D. ColicoDerviese",
    description:
      "La S.C.D. ColicoDerviese: il club di calcio di Colico e Dervio sull'Alto Lago di Como, matricola FIGC 26020, società affiliata AC Monza. Identità, campi, documenti e contatti della stagione 2026/27.",
    ogDescription: "Due paesi, un club: Colico e Dervio, stagione 2026/27.",
    image: CREST_SHARE_IMAGE,
  },
  kit: {
    path: "/kit",
    title: "Kit ufficiale 2026/27 — S.C.D. ColicoDerviese",
    description:
      "Il kit ufficiale 2026/27 della S.C.D. ColicoDerviese: kit atleti, kit Primi Calci e kit di rappresentanza, con contenuto e prezzi dalle tavole del fornitore.",
    ogDescription: "Kit atleti, kit Primi Calci e kit di rappresentanza della stagione 2026/27.",
    image: CREST_SHARE_IMAGE,
  },
  community: {
    path: "/community",
    title: "Tifosi — S.C.D. ColicoDerviese",
    description:
      "La parte dei tifosi della S.C.D. ColicoDerviese: segui le squadre, pubblica, vota la Top 11 e gioca al Fantacalcio SCD.",
    ogDescription: "Segui le squadre, vota la Top 11 e gioca al Fantacalcio SCD.",
    image: CREST_SHARE_IMAGE,
  },
  comunicazioni: {
    path: "/comunicazioni",
    title: "Comunicazioni — S.C.D. ColicoDerviese",
    description:
      "Notizie, avvisi e aggiornamenti della S.C.D. ColicoDerviese: calendario gare, eventi e social del club.",
    ogDescription: "Tutte le notizie, gli aggiornamenti e i contenuti del club.",
    image: CREST_SHARE_IMAGE,
  },
  top11: {
    path: "/top11",
    title: "Top 11 della settimana — S.C.D. ColicoDerviese",
    description:
      "La Top 11 della settimana votata da chi ha un account del club S.C.D. ColicoDerviese: Prima Squadra, Juniores, U16 e U15 insieme.",
    ogDescription: "Prima Squadra, Juniores, U16 e U15: la Top 11 votata da chi ha un account del club.",
    image: CREST_SHARE_IMAGE,
  },
  classifiche: {
    path: "/classifiche",
    title: "Classifiche e risultati ufficiali LND — S.C.D. ColicoDerviese",
    description:
      "Classifiche e ultimi risultati delle squadre S.C.D. ColicoDerviese: Prima Squadra, Juniores, U16 e U15. Solo dati ufficiali LND, con fonte e link.",
    ogTitle: "Classifiche ufficiali LND — S.C.D. ColicoDerviese",
    ogDescription: "Campionati e coppe delle squadre del club: solo dati ufficiali LND, con fonte e link.",
    image: CREST_SHARE_IMAGE,
  },
  rassegnaStampa: {
    path: "/rassegna-stampa",
    title: "Rassegna stampa · Dicono di noi — S.C.D. ColicoDerviese",
    description:
      "Rassegna stampa della S.C.D. ColicoDerviese: i titoli delle testate che parlano della società, di Colico e di Dervio, con il link all'articolo originale.",
    ogTitle: "Dicono di noi — S.C.D. ColicoDerviese",
    ogDescription: "I titoli delle testate che parlano del club, con il link all'articolo originale.",
    image: CREST_SHARE_IMAGE,
  },
  fantacalcio: {
    path: "/fantacalcio",
    title: "Fantacalcio SCD — S.C.D. ColicoDerviese",
    description:
      "Il fantacalcio gratuito della S.C.D. ColicoDerviese: scegli 11 giocatori di Prima Squadra, Juniores, U16 e U15 e fai punti con le loro partite.",
    ogDescription: "Gratuito: scegli 11 giocatori del club e fai punti con le loro partite.",
    image: CREST_SHARE_IMAGE,
  },
  guida: {
    path: "/guida",
    title: "Come funziona l'app | S.C.D. ColicoDerviese",
    description:
      "Guida rapida all'app della S.C.D. ColicoDerviese per tifosi, soci, famiglie, atleti, mister e segreteria: accesso, convocazioni e presa visione, notifiche, certificati e distinta.",
    ogDescription: "Guida rapida all'app per tifosi, soci, famiglie, atleti, mister e segreteria.",
    image: CREST_SHARE_IMAGE,
  },
  card: {
    path: "/card",
    title: "Le card 2026/27 — S.C.D. ColicoDerviese",
    description:
      "Card Tesserato, Sostenitore e Partner: credito alla Club House, listino dedicato, biglietteria e attività convenzionate.",
    ogTitle: "Le card ColicoDerviese 2026/27",
    ogDescription: "Tesserato, Sostenitore e Partner: si attivano alla Club House.",
    image: CREST_SHARE_IMAGE,
  },
  fornitori: {
    path: "/fornitori",
    title: "Proponi prodotti o servizi — SCD ColicoDerviese",
    description:
      "Fornitori e aziende: proponi alla S.C.D. ColicoDerviese prodotti, servizi, convenzioni per famiglie e collaborazioni.",
    ogTitle: "Proponi il tuo prodotto o servizio alla SCD",
    ogDescription: "Canale dedicato a fornitori e partner della S.C.D. ColicoDerviese.",
    image: CREST_SHARE_IMAGE,
  },
} as const satisfies Record<string, PageMetaInput>;

export type PublicPageKey = keyof typeof PUBLIC_PAGES;
