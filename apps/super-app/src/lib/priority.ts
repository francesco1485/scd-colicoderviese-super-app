import type { Audience, FeedItem, FeedKind, PriorityLevel } from "./club.types";

/** Priorità di default per tipo di contenuto (configurabile). */
export const DEFAULT_PRIORITY: Record<FeedKind, PriorityLevel> = {
  alert: 1,
  match: 2,
  result: 3,
  event: 4,
  news: 5,
  sponsor: 6,
  community: 7,
};

const HOUR = 3_600_000;

/**
 * Club Intelligence: punteggio = livello (P1 alto) + urgenza temporale + score manuale.
 * I contenuti PINNED dal DG vanno sempre in testa.
 */
export function computeScore(item: Omit<FeedItem, "priorityScore"> & { priorityScore?: number }, now = Date.now()) {
  let score = (8 - item.priority) * 100;
  if (item.startAt) {
    const delta = new Date(item.startAt).getTime() - now;
    if (delta > 0 && delta < 72 * HOUR) score += 40; // imminente
    if (delta < 0 && delta > -48 * HOUR) score += 20; // appena accaduto
  }
  score += item.priorityScore ?? 0;
  if (item.pinned) score += 10_000;
  return score;
}

export function isActive(item: FeedItem, now = Date.now()) {
  if (item.endAt && new Date(item.endAt).getTime() < now) return false;
  if (item.kind !== "match" && item.startAt && item.kind !== "result" && item.kind !== "event") {
    return new Date(item.startAt).getTime() <= now;
  }
  return true;
}

export function rankFeed(items: FeedItem[], audience: Audience = "public", now = Date.now()) {
  return items
    .filter((i) => i.audience.includes(audience) && isActive(i, now))
    .map((i) => ({ ...i, priorityScore: computeScore(i, now) }))
    .sort((a, b) => b.priorityScore - a.priorityScore);
}
