/**
 * Match extras on the home (UD-055): weather at kick-off, map of the venue, ticket office.
 * Pure helpers here; the weather fetch lives in match-extras.functions.ts.
 */
import raw from "../../../../config/scd-ticketing.v1.json";

/* --------------------------------------------------------------- venue → place */

/** Town of a FIGC venue string ("Costa Masnaga - C.S. Parrocchiale N.1 (E.A.), Via Diaz 3" → "Costa Masnaga"). */
export function venueTown(venue: string): string | null {
  const first = venue.split(/\s+-\s+/)[0]?.trim() ?? "";
  const town = first.replace(/\(.*?\)/g, "").trim();
  return town.length >= 3 ? town : null;
}

/** Google Maps search link for the venue text, with the town to disambiguate. */
export function mapsUrl(venue: string): string | null {
  const v = venue.replace(/\s+/g, " ").trim();
  if (!v) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v)}`;
}

/* --------------------------------------------------------------- weather */

export interface MatchWeather {
  /** "now": live conditions at the venue (match day, close to kick-off or in play); "forecast": hourly forecast at kick-off. */
  mode: "now" | "forecast";
  /** Temperature, °C, rounded. */
  temp: number;
  /** Apparent temperature, °C, rounded (null when not given). */
  feelsLike: number | null;
  /** Wind speed km/h, rounded (null when not given). */
  wind: number | null;
  /** WMO weather code. */
  code: number;
  /** Precipitation probability 0..100, null when not given. */
  rain: number | null;
  /** Short Italian label ("Sereno", "Pioggia leggera"). */
  label: string;
  /** "sun" | "cloud" | "rain" | "snow" | "fog" | "storm" — picks the icon. */
  kind: WeatherKind;
  /** Place the forecast is for (town). */
  place: string;
  /** ISO hour of the forecast used ("2026-10-11T15:00"). */
  at: string;
}

export type WeatherKind = "sun" | "cloud" | "rain" | "snow" | "fog" | "storm";

/** WMO code → label and icon kind (Open-Meteo convention). */
export function describeWeather(code: number): { label: string; kind: WeatherKind } {
  if (code === 0) return { label: "Sereno", kind: "sun" };
  if (code === 1) return { label: "Poco nuvoloso", kind: "sun" };
  if (code === 2) return { label: "Nuvoloso", kind: "cloud" };
  if (code === 3) return { label: "Coperto", kind: "cloud" };
  if (code === 45 || code === 48) return { label: "Nebbia", kind: "fog" };
  if (code >= 51 && code <= 57) return { label: "Pioviggine", kind: "rain" };
  if (code >= 61 && code <= 67) return { label: code >= 65 ? "Pioggia forte" : "Pioggia", kind: "rain" };
  if (code >= 71 && code <= 77) return { label: "Neve", kind: "snow" };
  if (code >= 80 && code <= 82) return { label: "Rovesci", kind: "rain" };
  if (code === 85 || code === 86) return { label: "Rovesci di neve", kind: "snow" };
  if (code >= 95) return { label: "Temporale", kind: "storm" };
  return { label: "Variabile", kind: "cloud" };
}

/** Open-Meteo gives up to 16 days of forecast: beyond that we say nothing. */
export const FORECAST_HORIZON_DAYS = 16;

export function forecastAvailable(todayIso: string, matchIso: string): boolean {
  const a = Date.parse(`${todayIso}T00:00:00Z`);
  const b = Date.parse(`${matchIso}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return false;
  const days = Math.round((b - a) / 86_400_000);
  return days >= 0 && days < FORECAST_HORIZON_DAYS;
}

/** Index of the hourly sample to use for a kick-off "15:30" → hour 15 (rounded to nearest hour). */
export function kickoffHour(time: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (h > 23 || mi > 59) return null;
  return Math.min(23, mi >= 30 ? h + 1 : h);
}

/** Pick the sample at kick-off from Open-Meteo's hourly arrays. */
export function pickHour(hourly: { time: string[]; temperature_2m: number[]; weather_code: number[]; precipitation_probability?: number[]; wind_speed_10m?: number[]; apparent_temperature?: number[] }, dateIso: string, time: string, place: string): MatchWeather | null {
  const h = kickoffHour(time);
  if (h === null) return null;
  const want = `${dateIso}T${String(h).padStart(2, "0")}:00`;
  const i = hourly.time.indexOf(want);
  if (i < 0) return null;
  const temp = hourly.temperature_2m[i];
  const code = hourly.weather_code[i];
  if (typeof temp !== "number" || typeof code !== "number") return null;
  const rain = hourly.precipitation_probability?.[i];
  const wind = hourly.wind_speed_10m?.[i];
  const feels = hourly.apparent_temperature?.[i];
  const d = describeWeather(code);
  return {
    mode: "forecast",
    temp: Math.round(temp),
    feelsLike: typeof feels === "number" ? Math.round(feels) : null,
    wind: typeof wind === "number" ? Math.round(wind) : null,
    code,
    rain: typeof rain === "number" ? rain : null,
    label: d.label,
    kind: d.kind,
    place,
    at: want,
  };
}

/** Live conditions from Open-Meteo's `current` block. */
export function pickNow(current: { time: string; temperature_2m: number; weather_code: number; wind_speed_10m?: number; apparent_temperature?: number; precipitation?: number }, place: string): MatchWeather | null {
  if (typeof current.temperature_2m !== "number" || typeof current.weather_code !== "number") return null;
  const d = describeWeather(current.weather_code);
  return {
    mode: "now",
    temp: Math.round(current.temperature_2m),
    feelsLike: typeof current.apparent_temperature === "number" ? Math.round(current.apparent_temperature) : null,
    wind: typeof current.wind_speed_10m === "number" ? Math.round(current.wind_speed_10m) : null,
    code: current.weather_code,
    rain: null,
    label: d.label,
    kind: d.kind,
    place,
    at: current.time,
  };
}

/** Minutes before kick-off from which the live conditions at the venue replace the forecast. */
export const LIVE_WINDOW_MIN = 180;
/** Minutes after kick-off during which a match still shows live conditions. */
export const MATCH_LENGTH_MIN = 120;

/**
 * Decide which weather to show: live at the venue when the match is today and within the
 * window (3 h before kick-off until 2 h after), otherwise the forecast at kick-off.
 */
export function weatherMode(nowRomeIso: string, dateIso: string, time: string): "now" | "forecast" | "none" {
  const h = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  const kick = h ? Date.parse(`${dateIso}T${h[1]!.padStart(2, "0")}:${h[2]}:00`) : Number.NaN;
  const now = Date.parse(nowRomeIso);
  if (Number.isNaN(now)) return "none";
  if (Number.isNaN(kick)) return "forecast";
  const diffMin = (kick - now) / 60_000;
  if (diffMin <= LIVE_WINDOW_MIN && diffMin >= -MATCH_LENGTH_MIN) return "now";
  if (diffMin < -MATCH_LENGTH_MIN) return "none";
  return "forecast";
}

/* --------------------------------------------------------------- ticketing */

export interface Tariff { label: string; groups: string[]; intero: number; ridotto: number }
export interface Ticketing {
  status: "CONFIRMED" | "PRICES_TO_CONFIRM";
  asOf: string;
  source: string;
  where: string;
  howToPay: string[];
  opensBefore: string;
  tariffs: Record<string, Tariff>;
  ridottoNote: string;
  bambiniNote: string;
  freeCompetitions: string;
  members: string;
  /** Same rule, phrased to follow "Tesserati S.C.D." on the match card. */
  membersShort: string;
  cup: string;
  info: string[];
  note: string;
}
export const TICKETING: Ticketing = raw as unknown as Ticketing;

export type TicketKind =
  /** Paid championship match at home: a tariff applies. */
  | { kind: "office"; tariff: Tariff; cup: boolean }
  /** Home match of a free category. */
  | { kind: "free" }
  | null;

/** Tariff of a calendar group ("prima" → Promozione), or null when the category is free. */
export function tariffFor(group: string | undefined): Tariff | null {
  if (!group) return null;
  for (const t of Object.values(TICKETING.tariffs)) if (t.groups.includes(group)) return t;
  return null;
}

/**
 * Ticket office applies to OUR home matches of the paid championships (Promozione, Juniores Élite,
 * U16 Élite); every other home match is free. Cup, play-off and play-out follow the same tariff
 * with the members' rule of the board (member free, companions pay). Away matches: nothing to say.
 */
export function ticketingFor(item: { homeAway?: string | null; group?: string; competition?: string | undefined }): TicketKind {
  if (item.homeAway !== "CASA") return null;
  const tariff = tariffFor(item.group);
  if (!tariff) return { kind: "free" };
  const cup = /COPPA|PLAY/i.test(item.competition ?? "");
  return { kind: "office", tariff, cup };
}

export function euro(n: number): string {
  return `${n.toFixed(2).replace(".", ",").replace(",00", "")}\u00a0€`;
}

/** Home matches from today with the ticket office open (paid championships and cups), in date and time order. */
export function ticketedHomeMatches<E extends { date: string; time: string; homeAway: string; group: string; type: string }>(events: readonly E[], today: string): E[] {
  return events
    .filter((e) => e.date >= today && ticketingFor({ homeAway: e.homeAway, group: e.group, competition: e.type })?.kind === "office")
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}
