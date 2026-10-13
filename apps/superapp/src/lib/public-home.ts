/**
 * Content model of the signed-out public home (UD-100, brief "Public home v4"; vetrina clean-up UD-110, Direzione
 * 13/10/2026).
 *
 * Layout reference: the Eurobet web homepage structure only (quick-link strip, credential strip, games of the week,
 * rotating vetrina, wide CTA banner, ONE sponsor zone, rich footer with the link groups). Never betting, odds, bonus or
 * casino content. The vetrina slots live in vetrina-slots.server.ts (picked per day on the server). Every entry below is real club content and every internal link is an existing public route
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
  { label: "Tornei", to: "/tornei", icon: "trophy" },
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

/** Partners named with certainty in the 2026/27 list (src/lib/sponsors.ts). */
export const verifiedSponsors = (
  list: readonly Sponsor[] = SPONSORS,
): Sponsor[] => list.filter((s) => s.nameVerified && !!s.name);

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

/**
 * Link groups of the site footer (UD-110: moved off the home body, the former "Tutto sul club" accordions). Real
 * public routes only; reserved areas are marked.
 */
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
      { label: "Kit ufficiale 2026/27", to: "/kit" },
      { label: "Le card 2026/27", to: "/card" },
      { label: "Registrati nell'app", to: "/registrati" },
      { label: "Calendario gare", to: "/calendario" },
      { label: "Guida all'app", to: "/guida" },
      { label: "Area famiglia", to: "/famiglia", reserved: true },
      { label: "Area club", to: "/aree", reserved: true },
    ],
  },
  {
    id: "eventi",
    title: "Eventi e tornei",
    items: [
      { label: "Tutti gli eventi", to: "/eventi" },
      { label: "Tornei del club", to: "/tornei" },
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
      { label: "Dicono di noi", to: "/rassegna-stampa" },
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
    ...LINK_GROUPS.flatMap((g) => g.items),
    { to: "/accedi" },
    { to: "/registrati" },
    { to: "/sponsor" },
    { to: "/contatti" },
  ];
  return [...new Set(all.map((l) => l.to))];
}
