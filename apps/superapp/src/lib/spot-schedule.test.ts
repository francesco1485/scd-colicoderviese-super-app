import { describe, expect, it } from "vitest";

import { SPONSOR_SPOTS, spotsForLedwall, type SponsorSpot } from "./sponsor-spots";
import {
  SPOT_SLOT_MS,
  chooseVideoFormat,
  ledOnAir,
  loopSeconds,
  onAirAt,
  passesPerHour,
  romeClock,
  spotVideoFile,
  upcomingSlots,
} from "./spot-schedule";

// 14/10/2026 10:00:00 in Rome (CEST, UTC+2).
const T0 = Date.parse("2026-10-14T08:00:00Z");
const list = [{ slug: "a" }, { slug: "b" }, { slug: "c" }];

describe("spot schedule (one clock for player, home and regia)", () => {
  it("slot length is the 20 s master", () => {
    expect(SPOT_SLOT_MS).toBe(20_000);
  });

  it("moves to the next spot every 20 seconds and loops", () => {
    // 10:00:00 = 36000 s into the day = 1800 slots, 1800 mod 3 = 0
    const at = (s: number) => onAirAt(list, T0 + s * 1000).current?.slug;
    expect(at(0)).toBe("a");
    expect(at(19)).toBe("a");
    expect(at(20)).toBe("b");
    expect(at(40)).toBe("c");
    expect(at(60)).toBe("a");
  });

  it("gives elapsed and remaining time inside the slot", () => {
    const air = onAirAt(list, T0 + 7_500);
    expect(air.elapsedMs).toBe(7_500);
    expect(air.remainingMs).toBe(12_500);
    expect(air.next?.slug).toBe("b");
  });

  it("is the same on every screen at the same instant", () => {
    const x = ledOnAir(T0 + 123_456);
    const y = ledOnAir(T0 + 123_456);
    expect(x.current?.slug).toBe(y.current?.slug);
    expect(x.order.map((s) => s.slug)).toEqual(y.order.map((s) => s.slug));
  });

  it("puts every showable spot on air once per loop", () => {
    const n = spotsForLedwall().length;
    const seen = new Set<string>();
    for (let k = 0; k < n; k++) seen.add(ledOnAir(T0 + k * SPOT_SLOT_MS).current!.slug);
    expect(seen.size).toBe(n);
  });

  it("never puts a spot with requested changes on air", () => {
    const spots: SponsorSpot[] = SPONSOR_SPOTS.map((s, i) => (i === 0 ? { ...s, status: "MODIFICHE_RICHIESTE" } : s));
    const shown = spotsForLedwall(spots);
    for (let k = 0; k < shown.length * 2; k++) {
      expect(ledOnAir(T0 + k * SPOT_SLOT_MS, shown).current?.slug).not.toBe(SPONSOR_SPOTS[0]!.slug);
    }
  });

  it("handles an empty rotation", () => {
    const air = onAirAt([], T0);
    expect(air.current).toBeNull();
    expect(air.index).toBe(-1);
    expect(upcomingSlots(air, T0, 5)).toEqual([]);
  });

  it("calculates passes per hour and loop length from the slot length only", () => {
    expect(passesPerHour(7)).toBe(25); // 3600 / (20 x 7) = 25.7
    expect(passesPerHour(1)).toBe(180);
    expect(passesPerHour(0)).toBe(0);
    expect(loopSeconds(7)).toBe(140);
  });

  it("lists the palinsesto from the spot on air", () => {
    const now = T0 + 25_000;
    const air = onAirAt(list, now);
    const up = upcomingSlots(air, now, 3);
    expect(up.map((u) => u.spot.slug)).toEqual(["b", "c", "a"]);
    expect(romeClock(up[0]!.at)).toBe("10:00:20");
    expect(romeClock(up[1]!.at)).toBe("10:00:40");
  });

  it("serves H.264 where it plays and the VP9 twin elsewhere", () => {
    expect(spotVideoFile("/media/ledwall/2026-27/atv-master.mp4", "webm")).toBe("/media/ledwall/2026-27/atv-master.webm");
    expect(spotVideoFile("/media/ledwall/2026-27/atv-master.mp4", "mp4")).toBe("/media/ledwall/2026-27/atv-master.mp4");
    expect(chooseVideoFormat({ canPlayType: (t) => (t.includes("mp4") ? "probably" : "") })).toBe("mp4");
    expect(chooseVideoFormat({ canPlayType: (t) => (t.includes("webm") ? "probably" : "") })).toBe("webm");
    expect(chooseVideoFormat(null)).toBe("mp4");
  });

  it("gives an absolute slot number whose parity alternates at every change (player double buffer)", () => {
    const a = onAirAt(list, T0 + 19_000);
    const b = onAirAt(list, T0 + 20_000);
    expect(b.slot).toBe(a.slot + 1);
    expect(b.slot % 2).not.toBe(a.slot % 2);
    expect(onAirAt([], T0).slot).toBe(a.slot);
  });
});
