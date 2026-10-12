import { describe, expect, it, vi } from "vitest";

import { PUBLIC_FAIL_TTL_MS, PUBLIC_OK_TTL_MS, createPublicReadCache, isPublicCacheable } from "./public-read-cache";

describe("public read cache · eligibility", () => {
  it("caches only anonymous public reads without payload", () => {
    expect(isPublicCacheable("public.feed", undefined, null)).toBe(true);
    expect(isPublicCacheable("public.calendar", {}, null)).toBe(true);
    expect(isPublicCacheable("public.feed", undefined, "session-token")).toBe(false);
    expect(isPublicCacheable("public.feed", { team: "u15" }, null)).toBe(false);
    expect(isPublicCacheable("training.mine", undefined, null)).toBe(false);
    expect(isPublicCacheable("public.registration", { name: "x" }, null)).toBe(false);
    expect(isPublicCacheable("attendance.save", undefined, null)).toBe(false);
  });
});

describe("public read cache · behaviour", () => {
  it("keeps a good answer for the ok TTL, then asks again", async () => {
    let t = 0;
    const cache = createPublicReadCache(() => t);
    const load = vi.fn(async () => ({ ok: true, data: t }));
    await cache.read("public.feed", load);
    t += PUBLIC_OK_TTL_MS - 1;
    await cache.read("public.feed", load);
    expect(load).toHaveBeenCalledTimes(1);
    t += 2;
    await cache.read("public.feed", load);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("keeps a failure only for the short fail TTL", async () => {
    let t = 0;
    const cache = createPublicReadCache(() => t);
    const load = vi.fn(async () => ({ ok: false, error: "HTTP 500" }));
    await cache.read("public.match", load);
    t += PUBLIC_FAIL_TTL_MS - 1;
    await cache.read("public.match", load);
    expect(load).toHaveBeenCalledTimes(1);
    t += 2;
    await cache.read("public.match", load);
    expect(load).toHaveBeenCalledTimes(2);
    expect(PUBLIC_FAIL_TTL_MS).toBeLessThan(PUBLIC_OK_TTL_MS);
  });

  it("shares one in-flight request among concurrent callers", async () => {
    const cache = createPublicReadCache(() => 0);
    let resolve!: (v: { ok: boolean }) => void;
    const load = vi.fn(() => new Promise<{ ok: boolean }>((r) => (resolve = r)));
    const a = cache.read("public.club", load);
    const b = cache.read("public.club", load);
    resolve({ ok: true });
    expect(await a).toBe(await b);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("keeps actions apart and recovers after a rejected load", async () => {
    const cache = createPublicReadCache(() => 0);
    await expect(cache.read("public.feed", () => Promise.reject(new Error("boom")))).rejects.toThrow("boom");
    expect(cache.size()).toBe(0);
    await cache.read("public.feed", async () => ({ ok: true }));
    await cache.read("public.club", async () => ({ ok: true }));
    expect(cache.size()).toBe(2);
  });
});
