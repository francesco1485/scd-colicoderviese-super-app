import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

import { PLACE_STYLE, countdownText, dayAnchor, dayHeading, groupByDay, nextHomeGame, placeTone, weekCells } from "./calendario-layout";

const APP = resolve(__dirname, "../..");
const read = (f: string) => readFileSync(resolve(APP, f), "utf8");

describe("calendario layout helpers", () => {
  test("placeTone: one tone per meaning, unknown stays neutral", () => {
    expect(placeTone("CASA")).toBe("casa");
    expect(placeTone("FUORI")).toBe("fuori");
    expect(placeTone("")).toBe("neutro");
    expect(PLACE_STYLE.casa.pill).toContain("scd-band-sole");
    expect(PLACE_STYLE.casa.pill).toContain("text-[#13254d]");
    expect(PLACE_STYLE.fuori.pill).toContain("scd-band-azzurro");
    expect(PLACE_STYLE.fuori.pill).toContain("text-white");
  });

  test("groupByDay keeps order and groups consecutive days", () => {
    const g = groupByDay([{ date: "2026-10-17", id: "a" }, { date: "2026-10-17", id: "b" }, { date: "2026-10-18", id: "c" }]);
    expect(g.map((x) => [x.date, x.rows.map((r) => r.id)])).toEqual([["2026-10-17", ["a", "b"]], ["2026-10-18", ["c"]]]);
    expect(groupByDay([])).toEqual([]);
  });

  test("dayHeading: Oggi / Domani / Ieri lead, otherwise capitalised", () => {
    expect(dayHeading("2026-10-16", "2026-10-16")).toEqual({ lead: "Oggi", text: "venerdì 16 ottobre" });
    expect(dayHeading("2026-10-17", "2026-10-16").lead).toBe("Domani");
    expect(dayHeading("2026-10-15", "2026-10-16").lead).toBe("Ieri");
    expect(dayHeading("2026-11-01", "2026-10-16")).toEqual({ lead: null, text: "Domenica 1 novembre" });
    expect(dayAnchor("2026-10-17")).toBe("cal-day-2026-10-17");
  });

  test("weekCells: Monday first, games and home counts, today flagged", () => {
    const c = weekCells("2026-10-12", "2026-10-16", [
      { date: "2026-10-17", homeAway: "CASA" },
      { date: "2026-10-17", homeAway: "FUORI" },
      { date: "2026-10-18", homeAway: "FUORI" },
    ]);
    expect(c.map((x) => x.letter).join("")).toBe("LMMGVSD");
    expect(c[4]!.isToday).toBe(true);
    expect([c[5]!.games, c[5]!.home, c[6]!.games, c[6]!.home]).toEqual([2, 1, 1, 0]);
    expect(c[0]!.games).toBe(0);
  });

  test("nextHomeGame: next home game with a time, Rome clock", () => {
    const now = Date.parse("2026-10-17T10:00:00Z"); // 12:00 Rome
    const ev = [
      { date: "2026-10-17", time: "11:00", homeAway: "CASA" },
      { date: "2026-10-17", time: "15:00", homeAway: "FUORI" },
      { date: "2026-10-18", time: "", homeAway: "CASA" },
      { date: "2026-10-18", time: "10:30", homeAway: "CASA" },
    ];
    const hit = nextHomeGame(ev, now);
    expect(hit?.e).toBe(ev[3]);
    expect(hit?.at).toBe(Date.parse("2026-10-18T08:30:00Z"));
    expect(nextHomeGame([], now)).toBeNull();
  });

  test("countdownText", () => {
    expect(countdownText((2 * 1440 + 3 * 60) * 60_000)).toBe("tra 2 giorni e 3 ore");
    expect(countdownText(70 * 60_000)).toBe("tra 1 ora e 10 minuti");
    expect(countdownText(60_000)).toBe("tra 1 minuto");
    expect(countdownText(-5)).toBe("tra 0 minuti");
  });
});

describe("Partite page structure (SCD METAL)", () => {
  const page = read("src/routes/calendario.tsx");
  const live = read("src/components/calendario/CalendarioLive.tsx");

  test("metal band header with crest, gold day tabs, no photo", () => {
    expect(page).toContain('data-testid="calendar-header"');
    expect(page).toMatch(/className="scd-band relative overflow-hidden text-white/);
    expect(page).toContain("<ClubCrestOfficial");
    expect(page).toMatch(/on \? "scd-gold" : "text-white hover:bg-white\/10"/);
    expect(page).not.toMatch(/lario-header|KitTexture|<img /);
  });

  test("rows grouped by day, week strip, legend, right column", () => {
    expect(page).toContain("groupByDay(rows)");
    expect(page).toContain('data-testid="cal-day"');
    expect(page).toContain('data-testid="cal-week-days"');
    expect(page).toContain('data-testid="cal-legend"');
    expect(page).toContain('data-testid="cal-next-home"');
    expect(page).toContain('data-testid="cal-come-arrivare"');
    expect(page).toContain('to="/calendario/rotazione-campi"');
    expect(page).toContain('to="/impianti"');
    expect(page).toMatch(/lg:grid-cols-\[minmax\(0,1fr\)_320px\]/);
  });

  test("existing behaviour kept: freshness stamp, follow, share, members gate", () => {
    expect(page).toContain("data-calendar-origin={origin}");
    expect(page).toContain("Calendario aggiornato {freshnessLabel(sourceModifiedAt)}");
    expect(page).toContain("readFollowed(store)");
    expect(page).toContain("writeFollowed(store, next)");
    expect(page).toContain("<LiveBanner");
    expect(page).toContain("Entra per allenamenti e dettagli");
    expect(live).toContain("<ShareWhatsApp");
    expect(live).toContain("da confermare");
    expect(live).toContain("crestFor(e.opponent)");
  });

  test("sole/azzurro used with purpose; no gold on the sole band", () => {
    expect(live).toContain("PLACE_STYLE");
    const card = page.slice(page.indexOf("function NextHomeCard"), page.indexOf("function HowToGetThere"));
    expect(card).toContain("scd-band-sole");
    expect(card).toContain("text-[#034a96]");
    const band = card.slice(card.indexOf("scd-band-sole"), card.indexOf("</div>"));
    expect(band).not.toContain("scd-gold");
  });

  test("no carousel or autoplay on the page", () => {
    expect(page + live).not.toMatch(/autoPlay|scd-ticker|<video|snap-x/);
  });
});
