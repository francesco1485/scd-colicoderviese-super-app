import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  ARRIVAL_POINTS,
  AUTO_CLOSE_MINUTES,
  FAMILY_REFRESH_MS,
  MIN_PING_GAP_MS,
  PING_INTERVAL_MS,
  agoLabel,
  createPingLimiter,
  distanceLabel,
  estimateArrival,
  etaLabel,
  haversineKm,
  isSessionOpen,
  liveErrorText,
  parseLiveView,
  pingFromFix,
  plannedEndMinutes,
  shouldSendPing,
  validatePing,
} from "./transport-live";

const SID = "0b8f8a52-6a3f-4c1e-9d2c-1f2e3d4c5b6a";
const NOW = Date.parse("2026-10-17T13:00:00Z");
const good = { sessionId: SID, lat: 46.1, lng: 9.35, accuracy: 25, speed: 12.5, heading: 180, recordedAt: new Date(NOW - 5000).toISOString() };

const sql = readFileSync(fileURLToPath(new URL("../../../../supabase/migrations/20261015_r110_transport_live.sql", import.meta.url)), "utf8");

describe("phase 1 decisions", () => {
  it("pings every 15 s, families refresh every 20 s, auto-close after 60 min", () => {
    expect(PING_INTERVAL_MS).toBe(15_000);
    expect(FAMILY_REFRESH_MS).toBe(20_000);
    expect(AUTO_CLOSE_MINUTES).toBe(60);
    expect(MIN_PING_GAP_MS).toBeLessThan(PING_INTERVAL_MS);
  });

  it("never ships an arrival coordinate that is not verified", () => {
    for (const p of ARRIVAL_POINTS) {
      expect(p.lat).toBeNull();
      expect(p.lng).toBeNull();
    }
  });
});

describe("validatePing (allowlist)", () => {
  it("accepts a well-formed fix and normalises it", () => {
    const r = validatePing(good, NOW);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual({ ...good, recordedAt: new Date(NOW - 5000).toISOString() });
  });

  it("refuses unknown keys (e.g. a name or a child id smuggled in)", () => {
    expect(validatePing({ ...good, name: "Mario R." }, NOW)).toEqual({ ok: false, problem: "INVALID" });
    expect(validatePing({ ...good, personId: SID }, NOW)).toEqual({ ok: false, problem: "INVALID" });
  });

  it("refuses wrong shapes and out-of-range numbers", () => {
    expect(validatePing(null, NOW).ok).toBe(false);
    expect(validatePing([good], NOW).ok).toBe(false);
    expect(validatePing({ ...good, sessionId: "abc" }, NOW).ok).toBe(false);
    expect(validatePing({ ...good, lat: 91 }, NOW).ok).toBe(false);
    expect(validatePing({ ...good, lng: -181 }, NOW).ok).toBe(false);
    expect(validatePing({ ...good, lat: Number.NaN }, NOW).ok).toBe(false);
    expect(validatePing({ ...good, lat: "46.1" }, NOW).ok).toBe(false);
    expect(validatePing({ ...good, speed: 120 }, NOW).ok).toBe(false);
    expect(validatePing({ ...good, heading: 400 }, NOW).ok).toBe(false);
    expect(validatePing({ ...good, accuracy: -1 }, NOW).ok).toBe(false);
    expect(validatePing({ ...good, recordedAt: "ieri" }, NOW).ok).toBe(false);
  });

  it("allows missing speed and heading", () => {
    const { speed: _s, heading: _h, ...rest } = good;
    const r = validatePing(rest, NOW);
    expect(r.ok && r.value.speed === null && r.value.heading === null).toBe(true);
  });

  it("flags inaccurate and stale fixes", () => {
    expect(validatePing({ ...good, accuracy: 501 }, NOW)).toEqual({ ok: false, problem: "INACCURATE" });
    expect(validatePing({ ...good, recordedAt: new Date(NOW - 3 * 60_000).toISOString() }, NOW)).toEqual({ ok: false, problem: "STALE" });
    expect(validatePing({ ...good, recordedAt: new Date(NOW + 60_000).toISOString() }, NOW)).toEqual({ ok: false, problem: "STALE" });
  });

  it("builds a valid payload from a browser fix", () => {
    const p = pingFromFix(SID, { coords: { latitude: 46.1, longitude: 9.35, accuracy: 12.7, speed: -1, heading: Number.NaN }, timestamp: NOW });
    expect(p).toEqual({ sessionId: SID, lat: 46.1, lng: 9.35, accuracy: 13, speed: null, heading: null, recordedAt: new Date(NOW).toISOString() });
    expect(validatePing(p, NOW).ok).toBe(true);
  });
});

describe("rate limit", () => {
  it("client sends at most every 15 s", () => {
    expect(shouldSendPing(null, NOW)).toBe(true);
    expect(shouldSendPing(NOW - 14_999, NOW)).toBe(false);
    expect(shouldSendPing(NOW - 15_000, NOW)).toBe(true);
  });

  it("server accepts one point per session every 10 s", () => {
    const allow = createPingLimiter();
    expect(allow(SID, NOW)).toBe(true);
    expect(allow(SID, NOW + 9_999)).toBe(false);
    expect(allow("other", NOW + 1)).toBe(true);
    expect(allow(SID, NOW + 10_000)).toBe(true);
  });
});

describe("distance and estimate", () => {
  it("haversine: zero, symmetry and a known distance (1° of latitude ≈ 111.2 km)", () => {
    const a = { lat: 46, lng: 9.3 };
    expect(haversineKm(a, a)).toBe(0);
    expect(haversineKm(a, { lat: 47, lng: 9.3 })).toBeCloseTo(111.19, 1);
    const b = { lat: 45.85, lng: 9.39 };
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 10);
  });

  it("estimate: road factor 1.3, default 40 km/h, speed clamped to 15-80 km/h, always 'stima'", () => {
    expect(estimateArrival(10)).toEqual({ distanceKm: 10, minutes: 20, arriving: false, label: "stima" });
    expect(estimateArrival(10, 200)?.minutes).toBe(10);
    expect(estimateArrival(10, 2)?.minutes).toBe(52);
    expect(estimateArrival(0.1)?.arriving).toBe(true);
    expect(estimateArrival(0)?.minutes).toBe(1);
    expect(estimateArrival(null)).toBeNull();
    expect(estimateArrival(-1)).toBeNull();
  });

  it("labels say 'stima' and never invent precision", () => {
    expect(etaLabel(estimateArrival(10)!)).toBe("circa 20 min (stima)");
    expect(etaLabel(estimateArrival(60)!)).toBe("circa 1 h 57 min (stima)");
    expect(etaLabel(estimateArrival(0.1)!)).toBe("in arrivo (stima)");
    expect(distanceLabel(0.345)).toBe("350 m");
    expect(distanceLabel(2.34)).toBe("2,3 km");
    expect(distanceLabel(23.6)).toBe("24 km");
    expect(agoLabel(new Date(NOW - 30_000).toISOString(), NOW)).toBe("aggiornato 30 s fa");
    expect(agoLabel(new Date(NOW - 5 * 60_000).toISOString(), NOW)).toBe("aggiornato 5 min fa");
    expect(agoLabel(null, NOW)).toBe("nessun aggiornamento");
  });
});

describe("expiry", () => {
  it("planned end: return estimate, else departure + 4 h", () => {
    expect(plannedEndMinutes("14:00", "19:30")).toBe(19 * 60 + 30);
    expect(plannedEndMinutes("14:00", null)).toBe(18 * 60);
    expect(plannedEndMinutes("14:00", "13:00")).toBe(18 * 60);
    expect(plannedEndMinutes("25:00", null)).toBeNull();
  });

  it("a session is open before its expiry and while positions keep arriving (60 min)", () => {
    const s = { startedAt: new Date(NOW - 30 * 60_000).toISOString(), expiresAt: new Date(NOW + 60_000).toISOString(), lastPingAt: new Date(NOW - 15_000).toISOString() };
    expect(isSessionOpen(s, NOW)).toBe(true);
    expect(isSessionOpen({ ...s, expiresAt: new Date(NOW - 1).toISOString() }, NOW)).toBe(false);
    expect(isSessionOpen({ ...s, lastPingAt: new Date(NOW - 61 * 60_000).toISOString() }, NOW)).toBe(false);
    expect(isSessionOpen({ ...s, lastPingAt: null, startedAt: new Date(NOW - 61 * 60_000).toISOString() }, NOW)).toBe(false);
    expect(isSessionOpen({ ...s, expiresAt: "x" }, NOW)).toBe(false);
  });
});

describe("parseLiveView", () => {
  const raw = {
    engine: "r110",
    office: true,
    driver: { acknowledged: true, runs: [{ runId: SID, title: "Trasferta U15", kind: "TRASFERTA", departure: "14:00", returnEstimate: null, destination: "Sondrio", meetingPoint: null, session: null, phone: "333" }] },
    live: [
      { runId: SID, title: "Trasferta U15", departure: "14:00", state: "IN_VIAGGIO", lastUpdate: "2026-10-17T12:59:50Z", distanceKm: "12.40", avgSpeedKmh: 43.2, targetLabel: null, position: { lat: 46, lng: 9 }, riders: ["Mario R."] },
      { runId: SID, title: "Altra", departure: "16:00", state: "CONCLUSO", lastUpdate: "2026-10-17T12:00:00Z", distanceKm: 3 },
      { runId: SID, departure: "16:00", state: "BOH" },
    ],
  };

  it("keeps only allowlisted fields: no coordinates, no names, no phones", () => {
    const v = parseLiveView(raw)!;
    expect(v.office).toBe(true);
    expect(v.driver?.runs[0]).not.toHaveProperty("phone");
    expect(v.live).toHaveLength(2);
    expect(v.live[0]).toEqual({ runId: SID, title: "Trasferta U15", departure: "14:00", state: "IN_VIAGGIO", lastUpdate: "2026-10-17T12:59:50Z", targetLabel: null, distanceKm: 12.4, avgSpeedKmh: 43.2 });
    expect(JSON.stringify(v)).not.toMatch(/Mario|position|"lat"|333/);
  });

  it("drops distance and last update of a run that is not travelling", () => {
    const v = parseLiveView(raw)!;
    expect(v.live[1]).toMatchObject({ state: "CONCLUSO", distanceKm: null, lastUpdate: null });
  });

  it("refuses anything that is not the r110 view", () => {
    expect(parseLiveView(null)).toBeNull();
    expect(parseLiveView({ ...raw, engine: "r999" })).toBeNull();
    expect(parseLiveView([])).toBeNull();
  });
});

describe("errors in plain Italian", () => {
  it("never shows a raw code", () => {
    for (const c of ["NOT_ACTIVE", "not_assigned", "outside_window", "ack_required", "inaccurate", "expired", "boh", null]) {
      expect(liveErrorText(c)).not.toMatch(/_|r110|\bnull\b|undefined/);
    }
    expect(liveErrorText("NOT_ACTIVE")).toContain("Funzione in preparazione");
  });
});

describe("migration r110 contract", () => {
  it("keeps RLS on, no policies and no direct grants on the live tables", () => {
    for (const t of ["scd_transport_live_drivers", "scd_transport_live_sessions", "scd_transport_live_points"]) {
      expect(sql).toContain(`alter table public.${t} enable row level security;`);
    }
    expect(sql).not.toMatch(/create policy/i);
    expect(sql).not.toMatch(/grant\s+(select|insert|update|delete|all)\s+on\s+(table\s+)?public\.scd_transport_live/i);
    expect(sql).toMatch(/revoke all on table public\.scd_transport_live_drivers, public\.scd_transport_live_sessions, public\.scd_transport_live_points\s+from public, anon, authenticated;/);
  });

  it("defines the five functions as security definer, purge for service_role only", () => {
    for (const f of ["start", "ping", "stop", "view", "purge"]) {
      const block = sql.slice(sql.indexOf(`function public.scd_transport_live_${f}(`));
      expect(block.slice(0, 1200)).toContain("security definer");
    }
    expect(sql).toContain("grant execute on function public.scd_transport_live_purge() to service_role;");
    expect(sql).toContain("revoke all on function public.scd_transport_live_purge() from public, anon, authenticated;");
    expect(sql).not.toMatch(/grant execute on function public\.scd_transport_live_(start|ping|stop|view|purge|link_driver)\([^)]*\) to [^;]*anon/);
  });

  it("encodes the phase 1 numbers: 10 s gap, 24 h points, 90 days log, +60 min close, 500 m accuracy", () => {
    expect(sql).toContain("interval '10 seconds'");
    expect(sql).toContain("interval '24 hours'");
    expect(sql).toContain("interval '90 days'");
    expect(sql).toContain("interval '60 minutes'");
    expect(sql).toContain("p_accuracy > 500");
  });

  it("stores and returns no person name", () => {
    expect(sql).not.toMatch(/display_name|first_name|last_name|scd_people p/);
  });
});
