/**
 * Promo carousel and quick chips of the public home (Francesco 15/10/2026 10:04-10:05: the board home had "no idea and
 * no correct template", overlaps everywhere; "da qui potresti partire": the Eurobet home — a rounded banner carousel
 * with a white offer card and one clear button, a row of quick chips with HOT/NEW badges, then sections of horizontal
 * cards with a button). Only the template is taken: no betting, no odds, no money. Every slide points to a real page
 * and uses real club material (lake photo, official crest, published event posters). Pure functions, tested in
 * home-promo.test.ts.
 */
import type { ClubEvent } from "./stories";

export interface PromoSlide {
  id: string;
  /** Small coloured tag over the title ("NUOVI ISCRITTI"). */
  tag: string;
  title: string;
  text: string;
  cta: { label: string; to: string };
  secondary?: { label: string; to: string };
  /** Background: the lake photo, a published poster (shown whole), or the club stripes. */
  art:
    | { kind: "lake" }
    | { kind: "poster"; src: string; alt: string }
    | { kind: "stripes"; big: string; small: string };
}

/** Seconds a slide stays before the carousel moves on (paused on hover, focus, touch and with reduced motion). */
export const PROMO_SECONDS = 6;

const WELCOME: PromoSlide = {
  id: "benvenuto",
  tag: "Nuovi iscritti",
  title: "Entra nel mondo ColicoDerviese",
  text: "Iscriviti in un minuto: rose, allenamenti, carte della squadra e tutta la vita del club, sempre in tasca.",
  cta: { label: "Registrati", to: "/registrati" },
  secondary: { label: "Accedi", to: "/entra" },
  art: { kind: "lake" },
};

const ISCRIZIONI: PromoSlide = {
  id: "iscrizioni",
  tag: "Stagione 2026/27",
  title: "Vuoi giocare con noi?",
  text: "Scegli categoria e annata e chiedi una prova: la segreteria ti ricontatta.",
  cta: { label: "Chiedi una prova", to: "/entra" },
  art: { kind: "stripes", big: "26/27", small: "Iscrizioni aperte" },
};

const CARTE: PromoSlide = {
  id: "carte",
  tag: "Nuovo",
  title: "Le carte della rosa",
  text: "Giocatori della Prima Squadra e staff di ogni annata: tocca una carta e girala. Per i soci.",
  cta: { label: "Apri le carte", to: "/squadre/carte" },
  art: { kind: "stripes", big: "P D C A", small: "Carte della rosa" },
};

export function eventSlide(e: ClubEvent): PromoSlide {
  return {
    id: `evento-${e.id}`,
    tag: e.when,
    title: e.title,
    text: e.text,
    cta: { label: "Scopri l'evento", to: e.href },
    art: { kind: "poster", src: e.image, alt: `Locandina ${e.title}` },
  };
}

/** Slides of a Rome day: welcome first, then the upcoming published events, the season sign-up, the new cards. */
export function promoSlides(day: string, events: readonly ClubEvent[]): PromoSlide[] {
  const upcoming = events.filter((e) => !e.date || e.date >= day).map(eventSlide);
  return [WELCOME, ...upcoming, ISCRIZIONI, CARTE];
}

/** Next index of the carousel, wrapping around; 0 for an empty list. */
export function nextIndex(i: number, length: number, step = 1): number {
  if (length <= 0) return 0;
  return (((i + step) % length) + length) % length;
}

export interface QuickChip {
  id: string;
  label: string;
  to: string;
  /** "count" shows a number, the others a short label like the reference badges. */
  badge?: { kind: "count"; value: number } | { kind: "new" } | { kind: "live" };
}

/** Quick chips under the banner: the most used pages first. Games left this week and a live game decide the badges. */
export function quickChips(gamesLeftThisWeek: number, live: boolean): QuickChip[] {
  const gare: QuickChip = { id: "gare", label: "Gare", to: "/calendario" };
  if (live) gare.badge = { kind: "live" };
  else if (gamesLeftThisWeek > 0) gare.badge = { kind: "count", value: gamesLeftThisWeek };
  return [
    gare,
    { id: "allenamenti", label: "Allenamenti", to: "/allenamenti" },
    { id: "carte", label: "Carte della rosa", to: "/squadre/carte", badge: { kind: "new" } },
    { id: "eventi", label: "Eventi", to: "/eventi" },
    { id: "tornei", label: "Tornei", to: "/tornei" },
    { id: "iscrizioni", label: "Iscrizioni", to: "/entra" },
    { id: "impianti", label: "Impianti", to: "/impianti" },
    { id: "sponsor", label: "Partner", to: "/sponsor" },
  ];
}
