/**
 * Weather at kick-off from Open-Meteo (free, no key, https://open-meteo.com), fetched on the
 * server with a small in-memory cache. Nothing is invented: outside the 16-day horizon, or
 * when the town cannot be geocoded, the function returns null and the UI says nothing.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { forecastAvailable, pickHour, pickNow, venueTown, weatherMode, type MatchWeather } from "./match-extras";

const GEO = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST = "https://api.open-meteo.com/v1/forecast";
const TTL_MS = 30 * 60_000;

const cache = new Map<string, { at: number; value: MatchWeather | null }>();
const geoCache = new Map<string, { lat: number; lon: number; name: string } | null>();

async function geocode(town: string): Promise<{ lat: number; lon: number; name: string } | null> {
  const key = town.toLowerCase();
  if (geoCache.has(key)) return geoCache.get(key) ?? null;
  try {
    const r = await fetch(`${GEO}?name=${encodeURIComponent(town)}&count=1&language=it&format=json&countryCode=IT`, { signal: AbortSignal.timeout(4000) });
    if (!r.ok) throw new Error(String(r.status));
    const j = (await r.json()) as { results?: Array<{ latitude: number; longitude: number; name: string }> };
    const hit = j.results?.[0];
    const out = hit ? { lat: hit.latitude, lon: hit.longitude, name: hit.name } : null;
    geoCache.set(key, out);
    return out;
  } catch {
    return null;
  }
}

function todayRome(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/** "2026-10-11T15:42:00" wall-clock time in Rome, comparable with the match date+time. */
function nowRomeIso(): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
      .formatToParts(new Date())
      .map((x) => [x.type, x.value]),
  );
  return `${p["year"]}-${p["month"]}-${p["day"]}T${p["hour"] === "24" ? "00" : p["hour"]}:${p["minute"]}:${p["second"]}`;
}

const CURRENT = "current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation";
const HOURLY = "hourly=temperature_2m,apparent_temperature,weather_code,precipitation_probability,wind_speed_10m";

/** Live conditions for a place (used for the venue close to kick-off and for Colico during the week). */
export async function placeNow(place: string): Promise<MatchWeather | null> {
  const key = `now|${place.toLowerCase()}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 10 * 60_000) return hit.value;
  const geo = await geocode(place);
  if (!geo) return null;
  let value: MatchWeather | null = null;
  try {
    const r = await fetch(`${FORECAST}?latitude=${geo.lat}&longitude=${geo.lon}&${CURRENT}&timezone=Europe%2FRome`, { signal: AbortSignal.timeout(4000) });
    if (r.ok) {
      const j = (await r.json()) as { current?: { time: string; temperature_2m: number; weather_code: number; wind_speed_10m?: number; apparent_temperature?: number; precipitation?: number } };
      value = j.current ? pickNow(j.current, geo.name) : null;
    }
  } catch {
    value = null;
  }
  cache.set(key, { at: Date.now(), value });
  return value;
}

export async function matchWeather(input: { date: string; time: string; venue: string }): Promise<MatchWeather | null> {
  const town = venueTown(input.venue);
  if (!town) return null;
  const mode = weatherMode(nowRomeIso(), input.date, input.time);
  if (mode === "none") return null;
  if (mode === "now") return placeNow(town);
  if (!forecastAvailable(todayRome(), input.date)) return null;
  const key = `${town.toLowerCase()}|${input.date}|${input.time}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
  const geo = await geocode(town);
  if (!geo) return null;
  let value: MatchWeather | null = null;
  try {
    const url = `${FORECAST}?latitude=${geo.lat}&longitude=${geo.lon}&${HOURLY}&timezone=Europe%2FRome&start_date=${input.date}&end_date=${input.date}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (r.ok) {
      const j = (await r.json()) as { hourly?: { time: string[]; temperature_2m: number[]; weather_code: number[]; precipitation_probability?: number[]; wind_speed_10m?: number[]; apparent_temperature?: number[] } };
      value = j.hourly ? pickHour(j.hourly, input.date, input.time, geo.name) : null;
    }
  } catch {
    value = null;
  }
  cache.set(key, { at: Date.now(), value });
  return value;
}

export const getMatchWeather = createServerFn({ method: "GET" })
  .inputValidator((d: { date: string; time: string; venue: string }) =>
    z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), time: z.string().max(5), venue: z.string().max(200) }).parse(d),
  )
  .handler(async ({ data }) => matchWeather(data));

/** Colico, now: the week-day weather for the home and the training pages. */
export const getColicoNow = createServerFn({ method: "GET" }).handler(async () => placeNow("Colico"));
