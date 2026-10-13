import { describe, expect, it } from "vitest";

import {
  CAMEO_SEQUENCE,
  CAMEO_VISIBLE_MS,
  CROVI_AVATAR,
  CROVI_POSES,
  cameoDelayMs,
  forceCameo,
  cameoLine,
  croviFrame,
  isInterior,
  poseAt,
  sequenceLength,
} from "./crovi-cameo";

describe("Crovi cameo", () => {
  it("speaks on public pages with a page-specific line", () => {
    expect(cameoLine("/calendario")?.ask).toBe("Prossima partita");
    expect(cameoLine("/impianti")?.text).toMatch(/mappa/);
    expect(cameoLine("/")?.text).toMatch(/Crovi/);
    expect(cameoLine("/eventi/christmas-lario-cup")?.ask).toBe("Eventi");
  });

  it("stays silent in the reserved areas", () => {
    expect(isInterior("/gestionale/organigramma")).toBe(true);
    expect(cameoLine("/quadro")).toBeNull();
    expect(cameoLine("/tesoreria/biglietteria")).toBeNull();
    expect(isInterior("/gestionalex")).toBe(false);
  });

  it("waits between 18 and 32 seconds", () => {
    expect(cameoDelayMs(0)).toBe(18_000);
    expect(cameoDelayMs(1)).toBe(32_000);
    expect(cameoDelayMs(5)).toBe(32_000);
  });

  it("plays the poses in order and holds the last one", () => {
    expect(poseAt(0)).toBe("wave");
    expect(poseAt(1_499)).toBe("wave");
    expect(poseAt(1_500)).toBe("point");
    expect(poseAt(3_200)).toBe("thumbs");
    expect(poseAt(4_500)).toBe("laugh");
    expect(poseAt(60_000)).toBe("wave");
    expect(poseAt(Number.NaN)).toBe("wave");
    expect(sequenceLength(CAMEO_SEQUENCE)).toBeLessThanOrEqual(CAMEO_VISIBLE_MS);
  });

  it("loops when asked", () => {
    const seq = [
      { pose: "thumbs", ms: 100 },
      { pose: "laugh", ms: 100 },
    ] as const;
    expect(poseAt(250, seq, true)).toBe("thumbs");
    expect(poseAt(250, seq, false)).toBe("laugh");
    expect(poseAt(350, seq, true)).toBe("laugh");
    expect(poseAt(420, seq, true)).toBe("thumbs");
    expect(poseAt(50, [])).toBe("wave");
  });

  it("serves every pose and the avatar from the versioned folder", () => {
    for (const p of CROVI_POSES) expect(croviFrame(p)).toMatch(/^\/media\/crovi\/v3\/crovi-[a-z]+-440\.webp$/);
    expect(croviFrame("laugh", 900)).toContain("-900.webp");
    expect(CROVI_AVATAR).toBe("/media/crovi/v3/crovi-avatar-256.webp");
  });

  it("shows at once with ?crovi in the address", () => {
    expect(forceCameo("?crovi")).toBe(true);
    expect(forceCameo("?squadra=u16&crovi=1")).toBe(true);
    expect(forceCameo("")).toBe(false);
    expect(forceCameo("?croviX=1")).toBe(false);
  });

  it("never states scores, times or names", () => {
    for (const p of ["/", "/calendario", "/squadre", "/impianti", "/eventi", "/sponsor", "/partner", "/societa", "/contatti"]) {
      expect(cameoLine(p)!.text).not.toMatch(/\d{1,2}[:.]\d{2}|\d+\s*-\s*\d+/);
    }
  });
});
