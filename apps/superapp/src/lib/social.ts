/**
 * Social structure of the Super App (r86, UD-089): pure logic for the feed, the "Segui" channels and the posts.
 * Channels are the club, every team of the official calendar copy and the published club events. Nothing here invents
 * data: posts come from the database (approved only), teams from the calendar copy, events from the pages already live.
 */
import type { Team } from "./universe";

export type PostKind = "NEWS" | "MATCH" | "LIVE";
export type PostStatus = "PENDING" | "APPROVED" | "REJECTED" | "ARCHIVED";

export interface Post {
  id: string;
  channel: string;
  kind: PostKind;
  title: string | null;
  body: string;
  mediaUrl: string | null;
  liveUrl: string | null;
  status: PostStatus;
  publishedAt: string | null;
  createdAt: string;
  decisionNote: string | null;
  forza: number;
  mine: boolean;
  own: boolean;
  authorKind: AuthorKind;
  verdict: string | null;
  reasons: string[];
  reports: number;
}

export type AuthorKind = "OFFICE" | "STAFF" | "ATHLETE" | "FAMILY";
export const AUTHOR_LABEL: Readonly<Record<AuthorKind, string>> = {
  OFFICE: "Ufficiale",
  STAFF: "Staff",
  ATHLETE: "Atleta",
  FAMILY: "Famiglia",
};

export const POST_KINDS: readonly PostKind[] = ["NEWS", "MATCH", "LIVE"];
export const POST_STATUSES: readonly PostStatus[] = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "ARCHIVED",
];

export const KIND_LABEL: Readonly<Record<PostKind, string>> = {
  NEWS: "Notizia",
  MATCH: "Gara",
  LIVE: "Diretta",
};
export const STATUS_LABEL: Readonly<Record<PostStatus, string>> = {
  PENDING: "In attesa della Direzione",
  APPROVED: "Pubblicato",
  REJECTED: "Non pubblicato",
  ARCHIVED: "Archiviato",
};

/** Channel keys as the database checks them. */
export const CHANNEL_RE =
  /^(club|team:[a-z0-9_-]{1,40}|event:[a-z0-9_-]{1,60})$/;

export const CLUB_CHANNEL = "club";
export const teamChannel = (teamId: string) => `team:${teamId}`;
export const eventChannel = (eventId: string) => `event:${eventId}`;

export function isChannelKey(x: unknown): x is string {
  return typeof x === "string" && CHANNEL_RE.test(x);
}

/** Teams of the attività di base: no results, no standings during the season (SGS CU n.2 2026/27). */
export const BASE_ACTIVITY_TEAMS: ReadonlySet<string> = new Set([
  "pulcini",
  "primicalci",
  "piccoli",
  "esordienti",
  "2014",
  "2015",
]);

export function isBaseActivityChannel(channel: string): boolean {
  return (
    channel.startsWith("team:") && BASE_ACTIVITY_TEAMS.has(channel.slice(5))
  );
}

export interface ChannelInfo {
  key: string;
  label: string;
  short: string;
  code: string;
  color: string;
  kind: "club" | "team" | "event";
  href: string;
}

export interface EventChannelSource {
  id: string;
  title: string;
  href: string;
}

/** Every channel a person can follow, from real sources only. The club first, then the teams in age order, then events. */
export function channelsFrom(
  teams: readonly Team[],
  events: readonly EventChannelSource[],
): ChannelInfo[] {
  const out: ChannelInfo[] = [
    {
      key: CLUB_CHANNEL,
      label: "SCD ColicoDerviese",
      short: "Società",
      code: "SCD",
      color: "#06306f",
      kind: "club",
      href: "/societa",
    },
  ];
  for (const t of teams)
    out.push({
      key: teamChannel(t.id),
      label: t.label,
      short: t.short,
      code: t.code,
      color: t.color,
      kind: "team",
      href: `/squadre/${t.id}`,
    });
  for (const e of events)
    out.push({
      key: eventChannel(e.id),
      label: e.title,
      short: e.title,
      code: "EV",
      color: "#ffd600",
      kind: "event",
      href: e.href,
    });
  return out;
}

export function channelOf(
  channels: readonly ChannelInfo[],
  key: string,
): ChannelInfo | undefined {
  return channels.find((c) => c.key === key);
}

/** Channels the author may post on: the office on all, other staff on teams and events (never as the club). */
export function postableChannels(
  channels: readonly ChannelInfo[],
  office: boolean,
): ChannelInfo[] {
  return office ? [...channels] : channels.filter((c) => c.kind !== "club");
}

/* -------------------------------------------------------------- parsing */

function str(x: unknown): string | null {
  return typeof x === "string" && x.length ? x : null;
}

export function parsePost(raw: unknown): Post | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = str(r["id"]);
  const channel = str(r["channel"]);
  const body = str(r["body"]);
  const kind = r["kind"];
  const status = r["status"];
  if (!id || !channel || !body || !isChannelKey(channel)) return null;
  if (
    !(POST_KINDS as readonly unknown[]).includes(kind) ||
    !(POST_STATUSES as readonly unknown[]).includes(status)
  )
    return null;
  return {
    id,
    channel,
    kind: kind as PostKind,
    title: str(r["title"]),
    body,
    mediaUrl: str(r["mediaUrl"]),
    liveUrl: str(r["liveUrl"]),
    status: status as PostStatus,
    publishedAt: str(r["publishedAt"]),
    createdAt: str(r["createdAt"]) ?? "",
    decisionNote: str(r["decisionNote"]),
    forza:
      typeof r["forza"] === "number"
        ? r["forza"]
        : Number(r["forza"] ?? 0) || 0,
    mine: r["mine"] === true,
    own: r["own"] === true,
    authorKind:
      (["OFFICE", "STAFF", "ATHLETE", "FAMILY"] as const).find(
        (k) => k === r["authorKind"],
      ) ?? "STAFF",
    verdict: str(r["verdict"]),
    reasons: Array.isArray(r["reasons"])
      ? r["reasons"].filter((x): x is string => typeof x === "string")
      : [],
    reports:
      typeof r["reports"] === "number"
        ? r["reports"]
        : Number(r["reports"] ?? 0) || 0,
  };
}

export function parsePosts(raw: unknown): Post[] {
  return Array.isArray(raw)
    ? raw.map(parsePost).filter((p): p is Post => !!p)
    : [];
}

export function parseFollows(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.filter(isChannelKey) : [];
}

export function parseCounts(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const n = typeof v === "number" ? v : Number(v);
    if (isChannelKey(k) && Number.isFinite(n) && n >= 0) out[k] = n;
  }
  return out;
}

/* ---------------------------------------------------------------- feed */

export type FeedMode = "perte" | "tutti" | "dirette";

/**
 * Orders the public feed for a viewer. "Per te": posts of followed channels first (newest first), then the rest; with
 * nothing followed it equals "Tutti". "Dirette": only LIVE posts. Never drops an approved post in "Tutti".
 */
export function orderFeed(
  posts: readonly Post[],
  mode: FeedMode,
  follows: readonly string[],
): Post[] {
  const approved = posts.filter((p) => p.status === "APPROVED");
  const byTime = (a: Post, b: Post) =>
    (b.publishedAt ?? b.createdAt).localeCompare(a.publishedAt ?? a.createdAt);
  if (mode === "dirette")
    return approved.filter((p) => p.kind === "LIVE").sort(byTime);
  if (mode === "perte" && follows.length) {
    const set = new Set(follows);
    const mine = approved.filter((p) => set.has(p.channel)).sort(byTime);
    const rest = approved.filter((p) => !set.has(p.channel)).sort(byTime);
    return [...mine, ...rest];
  }
  return approved.slice().sort(byTime);
}

export type FeedNode<M, E> =
  | { k: "week" }
  | { k: "post"; post: Post }
  | { k: "match"; match: M }
  | { k: "sponsor" }
  | { k: "event"; event: E }
  | { k: "empty" };

/**
 * Interleaves posts with the real-data cards: the week first, then after every second post one extra (team matches,
 * the sponsor of the day, the next event). With no post the extras follow the week and an empty note closes the list.
 * "Dirette" shows live posts only.
 */
export function composeFeed<M, E>(
  posts: readonly Post[],
  matches: readonly M[],
  hasSponsor: boolean,
  event: E | null,
  mode: FeedMode,
): FeedNode<M, E>[] {
  if (mode === "dirette")
    return posts.length
      ? posts.map((post) => ({ k: "post" as const, post }))
      : [{ k: "empty" }];
  const out: FeedNode<M, E>[] = [{ k: "week" }];
  const extras: FeedNode<M, E>[] = [
    ...matches.map((match) => ({ k: "match" as const, match })),
    ...(hasSponsor ? [{ k: "sponsor" as const }] : []),
    ...(event ? [{ k: "event" as const, event }] : []),
  ];
  let e = 0;
  posts.forEach((post, i) => {
    out.push({ k: "post", post });
    if (i % 2 === 0 && e < extras.length) out.push(extras[e++]!);
  });
  while (e < extras.length) out.push(extras[e++]!);
  if (!posts.length) out.push({ k: "empty" });
  return out;
}

/** Plain Italian for a database refusal code. */
export function postError(code: string | null | undefined): string {
  switch (code) {
    case "forbidden":
      return "Il tuo accesso non permette di pubblicare. Chiedi alla Direzione di abilitarti.";
    case "missing":
      return "Scrivi almeno il testo del post.";
    case "channel":
      return "Scegli per chi pubblichi: società, squadra o evento.";
    case "checks":
      return "Prima di inviare conferma i controlli sui minori (e, per l'attività di base, niente risultato).";
    case "live":
      return "Per una diretta serve il link del canale ufficiale della società (https://...).";
    case "media":
      return "Il link della foto o del video non è valido.";
    case "note_required":
      return "Scrivi il motivo: l'autore lo legge.";
    case "not_found":
      return "Post non trovato.";
    case "decision":
      return "Decisione non valida.";
    default:
      return "Non è stato possibile salvare. Riprova tra poco.";
  }
}

/** "2 min fa", "ieri", "12 ott": short and in Italian. */
export function timeAgo(iso: string | null, nowMs: number): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const diff = Math.max(0, nowMs - t);
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "adesso";
  if (m < 60) return `${m} min fa`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ${h === 1 ? "ora" : "ore"} fa`;
  const d = Math.floor(h / 24);
  if (d === 1) return "ieri";
  if (d < 7) return `${d} giorni fa`;
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    day: "numeric",
    month: "short",
  })
    .format(new Date(t))
    .replace(".", "");
}
