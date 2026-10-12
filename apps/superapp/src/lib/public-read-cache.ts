/**
 * Short in-memory cache for anonymous public reads from R20 (launch L1, 2026-10-12).
 *
 * The home page asked the Apps Script backend five times on every visit (feed, match, club, calendar, initiatives),
 * which put 1-3 s of server time before the first byte. Public reads carry no session and no personal data, so the
 * server keeps each answer for a short time and shares one request among visitors arriving together.
 *
 * Rules:
 * - only actions listed in PUBLIC_CACHEABLE_ACTIONS, only without a session token and without a payload;
 * - a good answer is kept for PUBLIC_OK_TTL_MS, a failure only for PUBLIC_FAIL_TTL_MS (quick recovery);
 * - concurrent callers of the same action share the same in-flight request.
 */

export const PUBLIC_CACHEABLE_ACTIONS: readonly string[] = [
  "public.feed",
  "public.match",
  "public.club",
  "public.calendar",
  "public.initiatives",
];

export const PUBLIC_OK_TTL_MS = 60_000;
export const PUBLIC_FAIL_TTL_MS = 15_000;

type Outcome = { ok: boolean };

interface Entry<T> {
  value: T;
  expiresAt: number;
}

export function isPublicCacheable(action: string, payload: Record<string, unknown> | undefined, sessionToken: string | null | undefined): boolean {
  if (sessionToken) return false;
  if (payload && Object.keys(payload).length > 0) return false;
  return PUBLIC_CACHEABLE_ACTIONS.includes(action);
}

export function createPublicReadCache(now: () => number = Date.now) {
  const entries = new Map<string, Entry<unknown>>();
  const inflight = new Map<string, Promise<unknown>>();

  async function read<T extends Outcome>(action: string, load: () => Promise<T>): Promise<T> {
    const hit = entries.get(action);
    if (hit && hit.expiresAt > now()) return hit.value as T;
    const pending = inflight.get(action);
    if (pending) return pending as Promise<T>;
    const p = load()
      .then((value) => {
        entries.set(action, { value, expiresAt: now() + (value.ok ? PUBLIC_OK_TTL_MS : PUBLIC_FAIL_TTL_MS) });
        return value;
      })
      .finally(() => {
        inflight.delete(action);
      });
    inflight.set(action, p);
    return p;
  }

  return {
    read,
    clear: () => {
      entries.clear();
      inflight.clear();
    },
    size: () => entries.size,
  };
}
