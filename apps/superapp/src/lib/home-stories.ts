/**
 * "Guarda cosa succede a Colico": the story rings of the public home (Francesco 15/10/2026 06:46 — the board home is
 * "poco wow, poco vivo"; 05:50 "fammi vedere cosa fa Colico"). Only real, already public material: club events with
 * their posters, the partners' LED spots (showable only, in the day's rotation order), the sports centre plan and the lake (never the aerial centre photo, UD-100).
 * No minor, no invented content. Pure functions, tested in home-stories.test.ts.
 */
import { clubEventsOn } from "./club-events";
import { spotsForHome, spotsInDayOrder, type SponsorSpot } from "./sponsor-spots";
import type { ClubEvent } from "./stories";

export type HomeStory = {
  id: string;
  /** Ring label (short). */
  label: string;
  /** Small round image of the ring. */
  thumb: string;
  /** Full-screen media. */
  media: { kind: "image"; src: string } | { kind: "video"; src: string; poster: string };
  /** Caption over the media. */
  title: string;
  text: string;
  /** Where the story leads, with its button label. */
  href: string;
  cta: string;
};

/** How many partner spots appear among the stories (the rest stay on the LED wall and /sponsor). */
export const STORY_SPOTS = 3;

/** Seconds an image story stays on screen; videos last as long as the clip. */
export const STORY_IMAGE_SECONDS = 6;

const CENTRE: HomeStory = {
  id: "centro",
  label: "Il centro",
  thumb: "/media/scd/pianta-colico-2026.webp",
  media: { kind: "image", src: "/media/scd/pianta-colico-2026.webp" },
  title: "Il centro sportivo di Colico",
  text: "Campi, spogliatoi e come arrivare: tutto il centro in una pagina.",
  href: "/impianti",
  cta: "Scopri il centro",
};

const LAKE: HomeStory = {
  id: "lago",
  label: "Il club",
  thumb: "/media/scd/lario-header.webp",
  media: { kind: "image", src: "/media/scd/lario-header.webp" },
  title: "Colico e Dervio, un solo club",
  text: "Chi siamo, la nostra storia e le persone che fanno vivere la S.C.D. ColicoDerviese.",
  href: "/societa",
  cta: "Chi siamo",
};

export function eventStory(e: ClubEvent): HomeStory {
  return {
    id: `evento-${e.id}`,
    label: e.title.length > 14 ? `${e.title.split(" ").slice(-2).join(" ")}` : e.title,
    thumb: e.image,
    media: { kind: "image", src: e.image },
    title: e.title,
    text: `${e.when} · ${e.text}`,
    href: e.href,
    cta: "Scopri l'evento",
  };
}

export function spotStory(s: SponsorSpot): HomeStory {
  return {
    id: `spot-${s.slug}`,
    label: s.sponsorName.length > 12 ? `${s.sponsorName.slice(0, 11)}…` : s.sponsorName,
    thumb: s.poster,
    media: s.preview ? { kind: "video", src: s.preview, poster: s.poster } : { kind: "image", src: s.poster },
    title: `In onda sul LED: ${s.sponsorName}`,
    text: "Lo spot del partner che passa sul LED wall del campo di Colico.",
    href: `/spot/${s.slug}`,
    cta: "Guarda lo spot",
  };
}

/** Stories of a Rome day: events first, then the partners of the day's rotation, then the centre and the club. */
export function homeStories(
  day: string,
  events: readonly ClubEvent[] = clubEventsOn(day),
  spots: readonly SponsorSpot[] = spotsForHome(),
): HomeStory[] {
  const upcoming = events.filter((e) => !e.date || e.date >= day).map(eventStory);
  const partners = spotsInDayOrder(spots, day).slice(0, STORY_SPOTS).map(spotStory);
  return [...upcoming, ...partners, CENTRE, LAKE];
}
