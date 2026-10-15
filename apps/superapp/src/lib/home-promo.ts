/**
 * Promo carousel and quick chips of the public home (Francesco 15/10/2026 10:04-10:05: the board home had "no idea and
 * no correct template", overlaps everywhere; "da qui potresti partire": the Eurobet home — a rounded banner carousel
 * with a white offer card and one clear button, a row of quick chips with HOT/NEW badges, then sections of horizontal
 * cards with a button). Only the template is taken: no betting, no odds, no money. Every slide points to a real page
 * and uses real club material (lake photo, official crest, published event posters). Pure functions, tested in
 * home-promo.test.ts.
 */
import { PUBLIC_FORMS_LIVE } from "./public-forms";
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
    | { kind: "lake"; big: string; small: string }
    | { kind: "poster"; src: string; alt: string }
    | { kind: "stripes"; big: string; small: string };
}

/** Seconds a slide stays before the carousel moves on (paused on hover, focus, touch and with reduced motion). */
export const PROMO_SECONDS = 6;

/**
 * Welcome gift (Francesco 15/10/2026 05:58: "Iscriviti avrà 50 crediti card che si trasforma in 5€ consumazione
 * omaggio se richiedi la card tifoso"). Switched on only when the credits register grants them at sign-up (today the
 * register is not connected: creditsView in avatar-studio.ts); until then the banner sells what exists.
 */
export const WELCOME_CREDITS_LIVE = false;
export const WELCOME_CREDITS = 50;

export function welcomeSlide(creditsLive: boolean = WELCOME_CREDITS_LIVE): PromoSlide {
  return creditsLive
    ? {
        id: "benvenuto",
        tag: "Nuovi iscritti",
        title: "Benvenuto in squadra",
        text: `Registrati e ricevi ${WELCOME_CREDITS} crediti: con la Card Tifoso diventano una consumazione omaggio in club house.`,
        cta: { label: "Registrati", to: "/registrati" },
        secondary: { label: "Accedi", to: "/accedi" },
        art: { kind: "lake", big: String(WELCOME_CREDITS), small: "crediti di benvenuto" },
      }
    : {
        id: "benvenuto",
        tag: "Nuovi iscritti",
        title: "Benvenuto in squadra",
        text: "Registrati: rose, allenamenti, carte della squadra e tutta la vita del club, sempre in tasca.",
        cta: { label: "Registrati", to: "/registrati" },
        secondary: { label: "Accedi", to: "/accedi" },
        art: { kind: "lake", big: "2026/27", small: "la stagione è qui" },
      };
}

/** Sign-up slide: the in-app request only while the public forms are live, otherwise the official contacts. */
export function iscrizioniSlide(formsLive: boolean = PUBLIC_FORMS_LIVE): PromoSlide {
  return formsLive
    ? {
        id: "iscrizioni",
        tag: "Stagione 2026/27",
        title: "Vuoi giocare con noi?",
        text: "Scegli categoria e annata e chiedi una prova: la segreteria ti ricontatta.",
        cta: { label: "Chiedi una prova", to: "/entra" },
        art: { kind: "stripes", big: "26/27", small: "Iscrizioni aperte" },
      }
    : {
        id: "iscrizioni",
        tag: "Stagione 2026/27",
        title: "Vuoi giocare con noi?",
        text: "Scrivi alla segreteria per categoria, annata e una prova in campo.",
        cta: { label: "Contatta la segreteria", to: "/contatti" },
        art: { kind: "stripes", big: "26/27", small: "Iscrizioni aperte" },
      };
}

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

/**
 * Slides of a Rome day: welcome first, then the upcoming published events, then the season sign-up. The banner is on the
 * visitors' home only, so no slide points to a members-only page (the cards of the squad went to the access screen:
 * audit of the PC chat 15/10/2026, item 5).
 */
export function promoSlides(
  day: string,
  events: readonly ClubEvent[],
  formsLive: boolean = PUBLIC_FORMS_LIVE,
  creditsLive: boolean = WELCOME_CREDITS_LIVE,
): PromoSlide[] {
  const upcoming = events.filter((e) => !e.date || e.date >= day).map(eventSlide);
  return [welcomeSlide(creditsLive), ...upcoming, iscrizioniSlide(formsLive)];
}

/**
 * Whether the home carousel may move by itself (B4, WCAG 2.2.2 / 2.3.3): never with reduced motion, never while
 * the visitor paused it or is hovering, touching or focusing it, never with fewer than two slides.
 */
export function autoAdvance(s: { reduced: boolean; paused: boolean; hold: boolean; length: number }): boolean {
  return !s.reduced && !s.paused && !s.hold && s.length >= 2;
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
  /** Only a live game earns a badge: counts and "Nuovo" were noise for the public (cleanup 15/10/2026). */
  badge?: { kind: "live" };
}

/**
 * Quick chips under the banner: the most used pages first, a LIVE badge on the games while a club game is played.
 * The public home is shown to visitors only (routes/index.tsx renders MemberHome for a session), so members-only pages
 * (Allenamenti, Carte della rosa: they show the access screen to visitors) are not offered here (cleanup 15/10/2026).
 */
export function quickChips(live: boolean): QuickChip[] {
  const gare: QuickChip = { id: "gare", label: "Gare", to: "/calendario" };
  if (live) gare.badge = { kind: "live" };
  return [
    gare,
    { id: "eventi", label: "Eventi", to: "/eventi" },
    { id: "tornei", label: "Tornei", to: "/tornei" },
    { id: "iscrizioni", label: "Iscrizioni", to: PUBLIC_FORMS_LIVE ? "/entra" : "/contatti" },
    { id: "impianti", label: "Impianti", to: "/impianti" },
    { id: "sponsor", label: "Partner", to: "/sponsor" },
  ];
}
