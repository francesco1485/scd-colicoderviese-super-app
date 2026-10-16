import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  activeConvenzioni,
  confirmedSponsors,
  CONVENZIONI,
  dayNumber,
  isSkyDay,
  promosForDay,
  sponsorOfDay,
  sponsorWindow,
  type Convenzione,
} from "@/lib/home-promos";
import { SPONSORS } from "@/lib/sponsors";

const src = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

describe("home promo band (UD-143)", () => {
  it("shows Sky every second day, alternating", () => {
    const a = isSkyDay("2026-10-16");
    expect(isSkyDay("2026-10-17")).toBe(!a);
    expect(isSkyDay("2026-10-18")).toBe(a);
    expect(dayNumber("2026-10-17") - dayNumber("2026-10-16")).toBe(1);
    expect(() => dayNumber("16/10/2026")).toThrow();
  });

  it("puts the sponsor call first every day, Sky only on Sky days, then the club colours", () => {
    for (const day of ["2026-10-16", "2026-10-17"]) {
      const kinds = promosForDay(day).map((p) => p.kind);
      expect(kinds[0]).toBe("bordo-campo");
      expect(kinds.includes("sky")).toBe(isSkyDay(day));
      expect(kinds).toContain("colori");
    }
    const call = promosForDay("2026-10-16")[0]!;
    expect(call.cta).toMatchObject({ to: "/sponsor", hash: "proposta" });
    expect(call.text).toContain("Scrivici e ti ricontattiamo");
  });

  it("names only confirmed sponsors, one per day in turn", () => {
    const ok = confirmedSponsors();
    expect(ok.length).toBeGreaterThan(0);
    expect(ok.every((s) => s.name && s.nameVerified)).toBe(true);
    expect(ok.length).toBeLessThan(SPONSORS.length);
    const d1 = sponsorOfDay("2026-10-16")!;
    const d2 = sponsorOfDay("2026-10-17")!;
    expect(d1.slug).not.toBe(d2.slug);
    expect(ok).toContain(d1);
    const w = sponsorWindow("2026-10-16", 7);
    expect(w[0]).toBe(d1);
    expect(new Set(w.map((s) => s.slug)).size).toBe(w.length);
    expect(sponsorOfDay("2026-10-16", [])).toBeUndefined();
  });

  it("invents no convention: empty until Francesco announces them; dated and partner-checked when added", () => {
    expect(CONVENZIONI).toEqual([]);
    expect(promosForDay("2026-10-16").some((p) => p.kind === "convenzione")).toBe(false);
    const partner = confirmedSponsors()[0]!;
    const list: Convenzione[] = [
      { id: "a", partnerSlug: partner.slug, title: "T", text: "X", from: "2026-10-10", until: "2026-10-20" },
      { id: "b", partnerSlug: "sconosciuto", title: "T", text: "X", from: "2026-10-10", until: "2026-10-20" },
      { id: "c", partnerSlug: partner.slug, title: "T", text: "X", from: "2026-11-01", until: "2026-11-30" },
    ];
    expect(activeConvenzioni("2026-10-16", list).map((c) => c.id)).toEqual(["a"]);
    const promos = promosForDay("2026-10-16", list);
    expect(promos.at(-1)).toMatchObject({ kind: "convenzione", sponsor: partner });
  });

  it("band: official artwork only, pause and reduced motion, at the bottom of the home", () => {
    const band = src("../components/home/HomeBordoCampo.tsx");
    expect(band).toContain('"/media/brand/sky-atv-cut.webp"');
    expect(band).toContain('"/media/kit/kit-2026-27-blu.webp"');
    expect(band).toContain("prefers-reduced-motion: reduce");
    expect(band).toContain('data-testid="promo-pause"');
    expect(band).toMatch(/document\.visibilityState !== "visible"/);
    expect(band).not.toMatch(/sky-partner-base|<video|autoPlay/);
    const lobby = src("../components/home/HomeLobby.tsx");
    expect(lobby).toMatch(/<HomeBordoCampo day=\{today\} \/>/);
    expect(lobby.indexOf("<HomeBordoCampo")).toBeGreaterThan(lobby.indexOf("<MonthCard"));
  });
});

describe("more club colours (Francesco 16/10 21:54)", () => {
  it("gives each promo its own tone and cycles the slides through navy, azzurro and sole", async () => {
    const { slideTone } = await import("@/components/home/HomeSlides");
    const { TONES, toneAt } = await import("@/components/home/tones");
    const tones = Object.fromEntries(promosForDay("2026-10-16").map((p) => [p.kind, p.tone]));
    expect(tones["bordo-campo"]).toBe("navy");
    expect(tones.colori).toBe("sole");
    expect([slideTone(0), slideTone(1), slideTone(2)]).toEqual(["azzurro", "navy", "sole"]);
    expect([toneAt(3), toneAt(4), toneAt(-1)]).toEqual(["navy", "azzurro", "sole"]);
    // Gold on the yellow band would vanish: the sole band uses the navy button and navy text.
    expect(TONES.sole.cta).toBe("scd-navy-btn");
    expect(TONES.sole.band).toContain("text-[#13254d]");
    const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
    for (const c of [".scd-band-azzurro", ".scd-band-sole", ".scd-navy-btn"]) expect(css).toContain(c);
  });
});
