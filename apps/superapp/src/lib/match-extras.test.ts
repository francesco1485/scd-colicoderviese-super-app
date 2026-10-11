import { describe, expect, it } from "vitest";

import { TICKETING, describeWeather, euro, forecastAvailable, kickoffHour, mapsUrl, pickHour, pickNow, ticketingFor, venueTown, weatherMode } from "./match-extras";

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

  it("ticket office only at home first-team matches; youth is free; prices honest", () => {
    expect(ticketingFor({ homeAway: "CASA", group: "prima" })).toBe("office");
    expect(ticketingFor({ homeAway: "CASA", group: "u15" })).toBe("free");
    expect(ticketingFor({ homeAway: "FUORI", group: "prima" })).toBeNull();
    expect(TICKETING.status).toBe("PRICES_TO_CONFIRM");
    expect(TICKETING.prices.every((p) => p.price === null)).toBe(true);
    expect(euro(5)).toBe("5 €");
    expect(euro(7.5)).toBe("7,50 €");
  });
});
