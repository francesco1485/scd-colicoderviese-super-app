/**
 * First-access tour flag (UD-172): once per device and role, no table, no tracking. localStorage is read and written in
 * try/catch (private mode, blocked storage, SSR); without it an in-memory set keeps the tour closed for the rest of the
 * visit, so it never reopens on every page.
 */
import { isGuideRole, type GuideRole } from "./guide-content";

export const TOUR_STORAGE_PREFIX = "scd.guide.tour.v1.";
/** Window event that opens the tour on demand (e.g. «Rivedi il tour» in /guida). detail: { role }. */
export const TOUR_OPEN_EVENT = "scd:guide-tour";

export interface TourStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const memory = new Set<GuideRole>();

function browserStorage(): TourStorage | null {
  try {
    return typeof window !== "undefined" && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function hasSeenTour(role: GuideRole, storage: TourStorage | null = browserStorage()): boolean {
  if (memory.has(role)) return true;
  if (!storage) return false;
  try {
    return storage.getItem(TOUR_STORAGE_PREFIX + role) === "1";
  } catch {
    return false;
  }
}

export function markTourSeen(role: GuideRole, storage: TourStorage | null = browserStorage()): void {
  memory.add(role);
  if (!storage) return;
  try {
    storage.setItem(TOUR_STORAGE_PREFIX + role, "1");
  } catch {
    // Storage full or blocked: the in-memory flag still keeps the tour closed for this visit.
  }
}

/** Test helper: forget the in-memory flags. */
export function resetTourMemory(): void {
  memory.clear();
}

/** Ask the mounted tour host to open the tour of a role. */
export function requestTour(role: GuideRole): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(TOUR_OPEN_EVENT, { detail: { role } }));
}

export function roleFromTourEvent(e: Event): GuideRole | null {
  const detail = (e as CustomEvent<{ role?: unknown }>).detail;
  return detail && isGuideRole(detail.role) ? detail.role : null;
}
