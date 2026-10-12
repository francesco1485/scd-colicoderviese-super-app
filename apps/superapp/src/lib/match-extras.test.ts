import { describe, expect, it } from "vitest";

import { TICKETING, describeWeather, ticketedHomeMatches, euro, forecastAvailable, kickoffHour, mapsUrl, pickHour, pickNow, ticketingFor, venueTown, weatherMode } from "./match-extras";

describe("match extras", () => {
  it("reads the town from a FIGC venue and builds a maps link", () => {
    expect(venueTown("Costa Masnaga - C.S. Parrocchiale N.1 (E.A.), Via Diaz 3")).toBe("Costa Masnaga");
    expect(venueTown("Colico - Campo 1")).toBe("Colico");
    expect(venueTown("")).toBeNull();
    expect(mapsUrl("Galbiate - C.S. Del Mare")).toBe("https://www.google.com/maps/search/?api=1&query=Galbiate%20-%20C.S.%20Del%20Mare");
    expect(mapsUrl("  ")).toBeNull();
  });

  it("describes WMO codes in Italian", () => {
    expect(describeWeather(0)).toEqual({ label: "Sereno", kind: "sun" });
    expect(describeWeather(3).kind).toBe("cloud");
    expect(describeWeather(63)).toEqual({ label: "Pioggia", kind: "rain" });
    expect(describeWeather(95).kind).toBe("storm");
    expect(describeWeather(45).kind).toBe("fog");
  });

  it("only forecasts within 16 days and picks the kick-off hour", () => {
    expect(forecastAvailable("2026-10-11", "2026-10-11")).toBe(true);
    expect(forecastAvailable("2026-10-11", "2026-10-26")).toBe(true);
    expect(forecastAvailable("2026-10-11", "2026-10-27")).toBe(false);
    expect(forecastAvailable("2026-10-11", "2026-10-10")).toBe(false);
    expect(kickoffHour("15:30")).toBe(16);
    expect(kickoffHour("15:29")).toBe(15);
    expect(kickoffHour("")).toBeNull();
    const hourly = { time: ["2026-10-11T15:00", "2026-10-11T16:00"], temperature_2m: [18.4, 17.6], weather_code: [2, 61], precipitation_probability: [10, 60], wind_speed_10m: [12.2, 25.7], apparent_temperature: [17.1, 15.4] };
    expect(pickHour(hourly, "2026-10-11", "15:30", "Colico")).toMatchObject({ mode: "forecast", temp: 18, feelsLike: 15, wind: 26, label: "Pioggia", kind: "rain", rain: 60, at: "2026-10-11T16:00" });
    expect(pickHour(hourly, "2026-10-11", "09:00", "Colico")).toBeNull();
  });

  it("switches from forecast to live conditions near kick-off, and to nothing after the match", () => {
    expect(weatherMode("2026-10-11T09:00:00", "2026-10-11", "15:30")).toBe("forecast");
    expect(weatherMode("2026-10-11T12:30:00", "2026-10-11", "15:30")).toBe("now");
    expect(weatherMode("2026-10-11T16:10:00", "2026-10-11", "15:30")).toBe("now");
    expect(weatherMode("2026-10-11T17:31:00", "2026-10-11", "15:30")).toBe("none");
    expect(weatherMode("2026-10-05T10:00:00", "2026-10-11", "15:30")).toBe("forecast");
    expect(weatherMode("2026-10-11T10:00:00", "2026-10-11", "")).toBe("forecast");
    expect(pickNow({ time: "2026-10-11T15:45", temperature_2m: 11.4, weather_code: 73, wind_speed_10m: 31.2, apparent_temperature: 6.8 }, "Sondrio")).toMatchObject({ mode: "now", temp: 11, feelsLike: 7, wind: 31, label: "Neve", kind: "snow", place: "Sondrio" });
  });

  it("ticket office at home matches of the paid championships; youth free; prices from the board", () => {
    expect(ticketingFor({ homeAway: "CASA", group: "prima", competition: "CAMPIONATO" })).toMatchObject({ kind: "office", cup: false, tariff: { intero: 10, ridotto: 5 } });
    expect(ticketingFor({ homeAway: "CASA", group: "u19", competition: "COPPA" })).toMatchObject({ kind: "office", cup: true, tariff: { intero: 7, ridotto: 4 } });
    expect(ticketingFor({ homeAway: "CASA", group: "u16" })).toMatchObject({ kind: "office", tariff: { label: "Campionato U16 Élite" } });
    expect(ticketingFor({ homeAway: "CASA", group: "u15" })).toEqual({ kind: "free" });
    expect(ticketingFor({ homeAway: "CASA", group: "pulcini" })).toEqual({ kind: "free" });
    expect(ticketingFor({ homeAway: "FUORI", group: "prima" })).toBeNull();
    expect(TICKETING.status).toBe("CONFIRMED");
    // Direzione 2026-10-12 (UD-079): league = member + 2 relatives free; cup = only the member; no U18 tariff (team withdrawn).
    expect(TICKETING.members).toContain("fino a 2 familiari");
    expect(TICKETING.membersShort).toContain("fino a 2 familiari");
    expect(TICKETING.cup).toContain("solo il tesserato non paga");
    expect(Object.values(TICKETING.tariffs).some((t) => t.groups.includes("u18") || /U18/.test(t.label))).toBe(false);
    expect(ticketingFor({ homeAway: "CASA", group: "u18" })).not.toMatchObject({ kind: "office" });
    expect(euro(5)).toBe("5\u00a0€");
    expect(euro(7.5)).toBe("7,50\u00a0€");
  });
});

describe("ticketedHomeMatches", () => {
  it("keeps future home matches of paid groups, cup included, in order", () => {
    const ev = (o: Partial<{ date: string; time: string; homeAway: string; group: string; type: string }>) => ({ date: "2026-10-18", time: "15:30", homeAway: "CASA", group: "prima", type: "CAMPIONATO", ...o });
    const out = ticketedHomeMatches([
      ev({ date: "2026-10-25" }),
      ev({ date: "2026-10-18", group: "u16", time: "10:00" }),
      ev({ group: "u15" }),
      ev({ homeAway: "FUORI" }),
      ev({ date: "2026-10-01" }),
      ev({ date: "2026-10-21", type: "COPPA ITALIA" }),
    ], "2026-10-12");
    expect(out.map((e) => `${e.date} ${e.group} ${e.type}`)).toEqual(["2026-10-18 u16 CAMPIONATO", "2026-10-21 prima COPPA ITALIA", "2026-10-25 prima CAMPIONATO"]);
  });
});
