/**
 * Storie della home (Instagram-style), built only from real data already on the page: the official calendar copy
 * (matches of the next 7 days), the 2026/27 sponsor list given by Direzione and the club events already published.
 * No scores, no photos of people, no invented content. A story with nothing real to show is not built.
 */
import { addDays } from "./board-data";
import type { WeekItem } from "./home-week";
import type { Sponsor } from "./sponsors";
import { itemState, type Team } from "./universe";

export type StorySlide =
  | {
      kind: "week";
      id: string;
      games: number;
      home: number;
      away: number;
      firstDay: string;
      lastDay: string;
    }
  | { kind: "match"; id: string; item: WeekItem }
  | { kind: "sponsor"; id: string; sponsor: Sponsor }
  | {
      kind: "event";
      id: string;
      title: string;
      when: string;
      text: string;
      href: string;
      image: string;
    }
  | { kind: "cta"; id: string; text: string; href: string; label: string };

export interface Story {
  id: string;
  label: string;
  /** "club" uses the official crest; teams use their master-calendar code and colour (no unverified crests). */
  kind: "club" | "team";
  team?: Team;
  live: boolean;
  slides: StorySlide[];
  /** Changes when the content changes: an already-seen story becomes "new" again. */
  signature: string;
}

export interface ClubEvent {
  id: string;
  title: string;
  when: string;
  text: string;
  href: string;
  image: string;
  date: string;
}

const MAX_MATCHES_PER_TEAM = 3;

/** Sponsor of the day: a fair rotation over the sponsors whose name is confirmed (same one for everybody that day). */
export function sponsorOfTheDay(
  sponsors: readonly Sponsor[],
  day: string,
): Sponsor | null {
  const list = sponsors.filter((s) => s.nameVerified && s.name);
  if (!list.length) return null;
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  const n = Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
  return list[((n % list.length) + list.length) % list.length] ?? null;
}

/**
 * Builds the story row: the club story first (the week in numbers, next home match, sponsor of the day, the next
 * club event), then one story per team that plays in the next 7 days, live teams first, then by first kick-off.
 */
export function buildStories(input: {
  items: readonly WeekItem[];
  teams: readonly Team[];
  today: string;
  nowMs: number;
  sponsors: readonly Sponsor[];
  events: readonly ClubEvent[];
}): Story[] {
  const { items, teams, today, nowMs, sponsors, events } = input;
  const lastDay = addDays(today, 6);
  const games = items
    .filter(
      (i) =>
        i.kind === "Gara" &&
        i.date >= today &&
        i.date <= lastDay &&
        itemState(i, nowMs) !== "done",
    )
    .slice()
    .sort((a, b) =>
      (a.date + (a.time || "99:99")).localeCompare(
        b.date + (b.time || "99:99"),
      ),
    );

  const clubSlides: StorySlide[] = [];
  if (games.length) {
    clubSlides.push({
      kind: "week",
      id: `week-${today}-${games.length}`,
      games: games.length,
      home: games.filter((g) => g.homeAway === "CASA").length,
      away: games.filter((g) => g.homeAway === "FUORI").length,
      firstDay: today,
      lastDay,
    });
    const home = games.find((g) => g.homeAway === "CASA");
    if (home)
      clubSlides.push({ kind: "match", id: `m-${home.id}`, item: home });
  }
  const sponsor = sponsorOfTheDay(sponsors, today);
  if (sponsor)
    clubSlides.push({
      kind: "sponsor",
      id: `sp-${sponsor.slug}-${today}`,
      sponsor,
    });
  const nextEvent = events
    .filter((e) => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  if (nextEvent)
    clubSlides.push({
      kind: "event",
      id: `ev-${nextEvent.id}`,
      title: nextEvent.title,
      when: nextEvent.when,
      text: nextEvent.text,
      href: nextEvent.href,
      image: nextEvent.image,
    });

  const stories: Story[] = [];
  if (clubSlides.length) {
    stories.push({
      id: "club",
      label: "SCD",
      kind: "club",
      live: games.some((g) => itemState(g, nowMs) === "live"),
      slides: clubSlides,
      signature: clubSlides.map((s) => s.id).join("|"),
    });
  }

  const byTeam = new Map<string, WeekItem[]>();
  for (const g of games)
    byTeam.set(g.group, [...(byTeam.get(g.group) ?? []), g]);
  const teamStories: Story[] = [];
  for (const team of teams) {
    const list = byTeam.get(team.id);
    if (!list?.length) continue;
    const slides: StorySlide[] = list
      .slice(0, MAX_MATCHES_PER_TEAM)
      .map((item) => ({ kind: "match", id: `m-${item.id}`, item }));
    slides.push({
      kind: "cta",
      id: `cta-${team.id}`,
      text:
        list.length > MAX_MATCHES_PER_TEAM
          ? `Altre ${list.length - MAX_MATCHES_PER_TEAM} gare questa settimana.`
          : "Allenamenti, campi e tutte le gare della stagione.",
      href: `/calendario?annata=${encodeURIComponent(team.id)}`,
      label: `Calendario ${team.short}`,
    });
    teamStories.push({
      id: `team-${team.id}`,
      label: team.short,
      kind: "team",
      team,
      live: list.some((g) => itemState(g, nowMs) === "live"),
      slides,
      signature: slides.map((s) => s.id).join("|"),
    });
  }
  const firstKick = (s: Story) => {
    const m = s.slides.find(
      (x): x is Extract<StorySlide, { kind: "match" }> => x.kind === "match",
    );
    return m ? m.item.date + (m.item.time || "99:99") : "9999";
  };
  teamStories.sort(
    (a, b) =>
      Number(b.live) - Number(a.live) ||
      firstKick(a).localeCompare(firstKick(b)),
  );
  return [...stories, ...teamStories];
}

/** Seen state lives only on this device: storyId → signature last watched. */
export function isUnseen(
  story: Pick<Story, "id" | "signature">,
  seen: Readonly<Record<string, string>>,
): boolean {
  return seen[story.id] !== story.signature;
}

export function parseSeen(raw: string | null): Record<string, string> {
  try {
    const v: unknown = JSON.parse(raw ?? "{}");
    if (!v || typeof v !== "object" || Array.isArray(v)) return {};
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>)
        .filter((e): e is [string, string] => typeof e[1] === "string")
        .slice(0, 80),
    );
  } catch {
    return {};
  }
}
