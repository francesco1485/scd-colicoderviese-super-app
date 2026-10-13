/**
 * Content model of the signed-out public home (UD-100, brief "Public home v4", Direzione 13/10/2026).
 *
 * Layout reference: the Eurobet web homepage structure only (quick-link strip, editorial carousel, wide CTA banner,
 * trust carousel, content of the week, partners, SEO accordions, rich footer). Never betting, odds, bonus or casino
 * content. Every entry below is real club content and every internal link is an existing public route
 * (checked by public-home.test.ts against src/routeTree.gen.ts). Teams, rosters, fixtures and team calendars are
 * not part of the public home: they live inside after sign-in.
 */
import { SPONSORS, type Sponsor } from "./sponsors";

/** Icon keys resolved to lucide glyphs by the view (keeps this module free of React). */
export type PublicIcon =
  | "trophy"
  | "handshake"
  | "clipboard"
  | "newspaper"
  | "video"
  | "gamepad"
  | "star"
  | "ticket"
  | "calendar"
  | "phone"
  | "shield"
  | "badge"
  | "map"
  | "heart"
  | "whistle"
  | "smartphone"
  | "building";

/** An internal route (optionally with search/hash) or an external https link. */
export interface PublicLink {
  to: string;
  search?: Record<string, string>;
  hash?: string;
}

export interface QuickLink extends PublicLink {
  label: string;
  icon: PublicIcon;
  badge?: "nuovo" | "top";
}

/** Quick-link strip under the top bar (Eurobet strip with "new"/"hot" badges). One row on desktop. */
export const QUICK_LINKS: readonly QuickLink[] = [
  {
    label: "Christmas Lario Cup",
    to: "/eventi/christmas-lario-cup",
    icon: "trophy",
    badge: "nuovo",
  },
  { label: "Diventa partner", to: "/sponsor", icon: "handshake", badge: "top" },
  { label: "Iscrizioni 2026/27", to: "/entra", icon: "clipboard" },
  { label: "Notizie", to: "/comunicazioni", icon: "newspaper" },
  {
    label: "Video",
    to: "/comunicazioni",
    search: { tab: "social" },
    icon: "video",
  },
  { label: "Fantacalcio", to: "/fantacalcio", icon: "gamepad" },
  { label: "Top 11", to: "/top11", icon: "star" },
  { label: "Biglietti", to: "/impianti", icon: "ticket" },
  { label: "Calendario gare", to: "/calendario", icon: "calendar" },
  { label: "Contatti", to: "/contatti", icon: "phone" },
];

/** Visual of an editorial card: a real image, or an original typographic/logo panel (no invented asset). */
export type FeatureVisual =
  | {
      kind: "image";
      src: string;
      alt: string;
      position?: string;
      fit?: "cover" | "contain";
    }
  | { kind: "sponsors" }
  | { kind: "type"; big: string; small: string };

export interface FeatureCard extends PublicLink {
  id: string;
  title: string;
  text: string;
  kicker: string;
  badge?: string;
  visual: FeatureVisual;
}

/** "In primo piano": editorial carousel of real club content. No aerial photo of the sports centre (UD-100). */
export const FEATURES: readonly FeatureCard[] = [
  {
    id: "lario-cup",
    kicker: "Torneo · 8 dicembre 2026",
    title: "Christmas Lario Cup",
    text: "1ª edizione a Colico: annate 2015 e 2016, iscrizioni aperte.",
    badge: "Nuovo",
    to: "/eventi/christmas-lario-cup",
    visual: {
      kind: "image",
      src: "/media/eventi/christmas-lario-cup-2026-maschile.webp",
      alt: "Locandina ufficiale della Christmas Lario Cup 2026",
      position: "center 18%",
    },
  },
  {
    id: "partner",
    kicker: "Partner 2026/27",
    title: "Il tuo marchio sul campo",
    text: "LED, divise, eventi e app: una proposta su misura per la tua azienda.",
    to: "/sponsor",
    visual: { kind: "sponsors" },
  },
  {
    id: "iscrizioni",
    kicker: "Stagione 2026/27",
    title: "Iscrizioni e Scuola Calcio",
    text: "Dai Piccoli Amici alla Prima Squadra: chiedi una prova.",
    to: "/entra",
    // Typographic panel: the kit boards carry shop prices, which do not belong on an editorial card.
    visual: { kind: "type", big: "26/27", small: "Iscrizioni aperte" },
  },
  {
    id: "rassegna",
    kicker: "Rassegna stampa",
    title: "Dicono di noi",
    text: "I titoli delle testate su società, Colico e Dervio.",
    to: "/rassegna",
    visual: {
      kind: "image",
      src: "/media/scd/lario-header.webp",
      alt: "L'Alto Lago di Como visto da Colico",
      position: "30% center",
    },
  },
  {
    id: "fantacalcio",
    kicker: "Giochi del club",
    title: "Fantacalcio SCD",
    text: "Scegli i tuoi 11 tra i giocatori del club e sfida gli altri tifosi.",
    to: "/fantacalcio",
    visual: { kind: "type", big: "11", small: "Fantacalcio SCD" },
  },
  {
    id: "monza",
    kicker: "Affiliazione",
    title: "Insieme al Monza",
    text: "Società affiliata al progetto Academy dell'AC Monza.",
    to: "/societa",
    visual: {
      kind: "image",
      src: "/media/affiliazioni/insieme-al-monza.webp",
      alt: "Marchio Insieme al Monza, progetto Academy AC Monza",
      fit: "contain",
    },
  },
];

export interface TrustFact extends PublicLink {
  icon: PublicIcon;
  title: string;
  text: string;
}

/** Partners named with certainty in the 2026/27 list (src/lib/sponsors.ts). */
export const verifiedSponsors = (
  list: readonly Sponsor[] = SPONSORS,
): Sponsor[] => list.filter((s) => s.nameVerified && !!s.name);

/** "Perché la ColicoDerviese": real facts only (club profile, affiliations, documents, sponsor list). */
export function trustFacts(
  sponsorCount: number = SPONSORS.length,
): TrustFact[] {
  return [
    {
      icon: "badge",
      title: "Club FIGC SGS 3° livello",
      text: "Riconoscimento del Settore Giovanile e Scolastico FIGC. Matricola 26020.",
      to: "/societa",
    },
    {
      icon: "shield",
      title: "Progetto Academy AC Monza",
      text: "Società affiliata all'AC Monza: un percorso di crescita condiviso.",
      to: "/societa",
    },
    {
      icon: "map",
      title: "Colico e Dervio, Alto Lago",
      text: "Due paesi, una società: campi a Colico e a Dervio sul Lago di Como.",
      to: "/impianti",
    },
    {
      icon: "heart",
      title: "Tutela dei minori",
      text: "Modello safeguarding, regole su trasferte e immagini, segnalazioni riservate.",
      to: "/safeguarding",
    },
    {
      icon: "whistle",
      title: "Tecnici per ogni gruppo",
      text: "Uno staff dedicato a ogni annata, dalla Scuola Calcio alla Prima Squadra.",
      to: "/societa",
    },
    {
      icon: "smartphone",
      title: "Un'app per tutto il club",
      text: "Famiglie, atleti e tifosi: avvisi, calendario, giochi e aree riservate.",
      to: "/guida",
    },
    {
      icon: "building",
      title: "Partner del territorio",
      text: `${sponsorCount} aziende sostengono la stagione 2026/27.`,
      to: "/sponsor",
    },
  ];
}

/** Partner shown "in vetrina" this month: rotates over the verified list by calendar month (Europe/Rome date). */
export function partnerOfTheMonth(
  day: string,
  list: readonly Sponsor[] = SPONSORS,
): Sponsor | null {
  const ok = verifiedSponsors(list);
  if (!ok.length) return null;
  const [y, m] = day.split("-").map(Number) as [number, number];
  if (!Number.isFinite(y) || !Number.isFinite(m)) return ok[0] ?? null;
  const n = y * 12 + (m - 1);
  return ok[((n % ok.length) + ok.length) % ok.length] ?? null;
}

export interface LinkItem extends PublicLink {
  label: string;
  /** Opens a reserved area: the page shows its access screen to anonymous visitors. */
  reserved?: boolean;
}

export interface LinkGroup {
  id: string;
  title: string;
  items: readonly LinkItem[];
}

/** Accordion link groups (Eurobet SEO accordions). Real public routes only; reserved areas are marked. */
export const LINK_GROUPS: readonly LinkGroup[] = [
  {
    id: "club",
    title: "Il club",
    items: [
      { label: "Chi siamo", to: "/societa" },
      { label: "Documenti della società", to: "/societa", hash: "documenti-t" },
      { label: "Impianti di Colico e Dervio", to: "/impianti" },
      { label: "Tutela dei minori", to: "/safeguarding" },
    ],
  },
  {
    id: "famiglie",
    title: "Per le famiglie",
    items: [
      { label: "Iscrizioni e prova", to: "/entra" },
      { label: "Registrati nell'app", to: "/registrati" },
      { label: "Calendario gare", to: "/calendario" },
      { label: "Guida all'app", to: "/guida" },
      { label: "Area famiglia", to: "/famiglia", reserved: true },
    ],
  },
  {
    id: "eventi",
    title: "Eventi e tornei",
    items: [
      { label: "Tutti gli eventi", to: "/eventi" },
      { label: "Christmas Lario Cup", to: "/eventi/christmas-lario-cup" },
      { label: "Fantacalcio SCD", to: "/fantacalcio" },
      { label: "Top 11 della settimana", to: "/top11" },
    ],
  },
  {
    id: "partner",
    title: "Partner e sponsor",
    items: [
      { label: "Diventa partner", to: "/sponsor" },
      { label: "Richiedi una proposta", to: "/sponsor", hash: "proposta" },
      { label: "Fornitori", to: "/fornitori" },
      { label: "Area partner", to: "/partner", reserved: true },
    ],
  },
  {
    id: "comunicazione",
    title: "Comunicazione",
    items: [
      { label: "Comunicazioni del club", to: "/comunicazioni" },
      { label: "Dicono di noi", to: "/rassegna" },
      {
        label: "Social e video",
        to: "/comunicazioni",
        search: { tab: "social" },
      },
      { label: "Tifosi", to: "/community" },
      { label: "Contatti", to: "/contatti" },
    ],
  },
  {
    id: "app",
    title: "App",
    items: [
      { label: "Installa l'app", to: "/installa" },
      { label: "Come funziona", to: "/guida" },
      { label: "Privacy", to: "/privacy" },
    ],
  },
];

/** Official social profiles (same links as /comunicazioni). */
export const SOCIAL_LINKS = [
  {
    id: "instagram",
    label: "Instagram",
    handle: "@s.c.d.colicoderviese",
    href: "https://www.instagram.com/s.c.d.colicoderviese/",
  },
  {
    id: "facebook",
    label: "Facebook",
    handle: "ColicoDerviese",
    href: "https://www.facebook.com/ColicoDerviese",
  },
] as const;

/** Countdown segments to a kickoff, for the matchday card. Null once the game has started (or with no kickoff). */
export interface KickoffClock {
  d: number;
  h: number;
  m: number;
  s: number;
}

export function kickoffClock(
  kickoffMs: number | null,
  nowMs: number,
): KickoffClock | null {
  if (kickoffMs === null || !Number.isFinite(kickoffMs)) return null;
  const dt = Math.floor((kickoffMs - nowMs) / 1000);
  if (dt <= 0) return null;
  return {
    d: Math.floor(dt / 86_400),
    h: Math.floor((dt % 86_400) / 3_600),
    m: Math.floor((dt % 3_600) / 60),
    s: dt % 60,
  };
}

/** Day of a game as a family reads it: "Oggi", "Domani" or "Sabato 17 ottobre" (dates are Europe/Rome days). */
export function matchdayLabel(date: string, today: string): string {
  if (date === today) return "Oggi";
  const t = Date.parse(`${today}T12:00:00Z`);
  if (Number.isFinite(t)) {
    const tomorrow = new Date(t + 86_400_000).toISOString().slice(0, 10);
    if (date === tomorrow) return "Domani";
  }
  const s = new Intl.DateTimeFormat("it-IT", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${date}T12:00:00Z`));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Every internal route the public home links to (for the route-existence test). */
export function publicHomeRoutes(): string[] {
  const all: PublicLink[] = [
    ...QUICK_LINKS,
    ...FEATURES,
    ...trustFacts(),
    ...LINK_GROUPS.flatMap((g) => g.items),
    { to: "/accedi" },
    { to: "/registrati" },
    { to: "/sponsor" },
    { to: "/rassegna" },
    { to: "/eventi" },
  ];
  return [...new Set(all.map((l) => l.to))];
}
