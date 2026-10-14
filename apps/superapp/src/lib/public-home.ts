/**
 * Content model of the public home and of the site index (UD-100, UD-110, UD-116 — Direzione 14/10/2026: the big
 * "Tutto sul club" footer is useless to people; the link index lives in the menu and its search).
 *
 * Every internal link is an existing route (checked by public-home.test.ts against src/routeTree.gen.ts). Teams,
 * rosters and trainings are not part of the public home: they live inside after sign-in.
 */
import { quickActions } from "./home-actions";
import { SPONSORS, type Sponsor } from "./sponsors";

/** An internal route (optionally with search/hash). */
export interface PublicLink {
  to: string;
  search?: Record<string, string>;
  hash?: string;
}

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
 * The site index (former footer "Tutto sul club" groups, UD-110 → UD-116: now reachable from the menu and its search,
 * never as a footer wall). Real routes only; reserved areas are marked.
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

/* ---------------------------------------------------------- no repeats */

interface HrefSlot {
  href: string;
}

/** Pages the home already opens from its own blocks (quick actions, news, partner band, join banner). */
export function vetrinaRepeats(actions: readonly PublicLink[]): string[] {
  return [
    ...new Set([
      ...actions.map((a) => a.to),
      "/rassegna-stampa",
      "/sponsor",
      "/registrati",
    ]),
  ];
}

/**
 * Vetrina without the slots that only repeat a page the home already opens elsewhere (UD-116 "niente si ripete").
 * A world that would be left empty keeps its original picks: the vetrina never disappears because of the trim.
 */
export function trimVetrina<W extends string, S extends HrefSlot>(
  worlds: Readonly<Record<W, readonly S[]>>,
  repeats: readonly string[],
): Record<W, S[]> {
  const out = {} as Record<W, S[]>;
  for (const w of Object.keys(worlds) as W[]) {
    const list = worlds[w] ?? [];
    const kept = list.filter((s) => !repeats.includes(s.href));
    out[w] = kept.length > 0 ? kept : [...list];
  }
  return out;
}

/** Every internal route the signed-out home and its footer link to (for the route-existence test). */
export function publicHomeRoutes(): string[] {
  const all: PublicLink[] = [
    ...quickActions("visitatore"),
    { to: "/calendario" },
    { to: "/rassegna-stampa" },
    { to: "/eventi" },
    { to: "/accedi" },
    { to: "/registrati" },
    { to: "/sponsor" },
    { to: "/contatti" },
    { to: "/installa" },
    { to: "/privacy" },
    { to: "/safeguarding" },
    { to: "/elimina-account" },
  ];
  return [...new Set(all.map((l) => l.to))];
}
