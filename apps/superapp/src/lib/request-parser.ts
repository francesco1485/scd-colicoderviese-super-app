/**
 * Deterministic Italian parser of a request message (UD-154): the Segreteria pastes what a team wrote on WhatsApp or
 * by e-mail ("amichevole U15 sabato 25 ore 15 a Colico con Olginatese") and gets a draft to correct. Pure function,
 * no network, no AI. Every field it cannot read with certainty stays null and a plain warning says why: it never
 * invents a team, a date, a time, a venue or an opponent. Dates are resolved against `now` in Europe/Rome and are
 * never in the past.
 */
import { romeParts } from "./home-week";

export type RequestKind = "AMICHEVOLE";
export type HomeAway = "CASA" | "FUORI";

export interface ParsedRequest {
  kind: RequestKind | null;
  /** Calendar group id ("u15", "2015", "prima"...). */
  teamKey: string | null;
  /** YYYY-MM-DD, Europe/Rome. */
  date: string | null;
  /** HH:MM, Europe/Rome. */
  time: string | null;
  venue: string | null;
  homeAway: HomeAway | null;
  opponent: string | null;
  /** What could not be read, in plain Italian. */
  warnings: string[];
}

export const MAX_MESSAGE = 1000;

const TEAM_RULES: ReadonlyArray<[RegExp, string]> = [
  [/\bprima\s+squadra\b/i, "prima"],
  [/\b(?:juniores|under\s*19|u\s*-?\s*19)\b/i, "u19"],
  [/\b(?:under\s*16|u\s*-?\s*16)\b/i, "u16"],
  [/\b(?:under\s*15|u\s*-?\s*15|giovanissimi)\b/i, "u15"],
  [/\b(?:esordienti\s*(?:20)?14|2014)\b/i, "2014"],
  [/\b(?:esordienti\s*(?:20)?15|2015)\b/i, "2015"],
  [/\bpulcini\b/i, "pulcini"],
  [/\bprimi\s+calci\b/i, "primicalci"],
  [/\bpiccoli\s+amici\b/i, "piccoli"],
];

const WEEKDAYS: ReadonlyArray<[RegExp, number]> = [
  [/^domenica$/i, 0],
  [/^luned[iì]$/i, 1],
  [/^marted[iì]$/i, 2],
  [/^mercoled[iì]$/i, 3],
  [/^gioved[iì]$/i, 4],
  [/^venerd[iì]$/i, 5],
  [/^sabato$/i, 6],
];
const WEEKDAY_RE = "domenica|luned[iì]|marted[iì]|mercoled[iì]|gioved[iì]|venerd[iì]|sabato";
const MONTHS = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
const OUR_VENUES: Readonly<Record<string, string>> = { colico: "Colico", dervio: "Dervio" };

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

function validDay(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

function weekdayOf(day: string): number {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function weekdayIndex(word: string): number | null {
  for (const [re, i] of WEEKDAYS) if (re.test(word)) return i;
  return null;
}

/** Next date (>= today) whose day of month is `d`: this month, else the following ones. */
function nextDayOfMonth(today: string, d: number): string | null {
  const [y, m] = today.split("-").map(Number) as [number, number, number];
  for (let k = 0; k < 3; k++) {
    const mm = ((m - 1 + k) % 12) + 1;
    const yy = y + Math.floor((m - 1 + k) / 12);
    if (validDay(yy, mm, d) && iso(yy, mm, d) >= today) return iso(yy, mm, d);
  }
  return null;
}

/** Day/month without a year: this year, or next year when already past. */
function resolveDayMonth(today: string, d: number, m: number): string | null {
  const y = Number(today.slice(0, 4));
  if (validDay(y, m, d) && iso(y, m, d) >= today) return iso(y, m, d);
  if (validDay(y + 1, m, d)) return iso(y + 1, m, d);
  return null;
}

function cut(text: string, match: RegExpExecArray): string {
  return text.slice(0, match.index) + " ".repeat(match[0].length) + text.slice(match.index + match[0].length);
}

function cleanName(s: string): string | null {
  const v = s.replace(/\s+/g, " ").replace(/^[\s"'“”«»-]+|[\s"'“”«».,;:!?-]+$/g, "").trim();
  return v.length >= 2 ? v.slice(0, 120) : null;
}

export function parseRequestMessage(input: string, now: Date): ParsedRequest {
  const warnings: string[] = [];
  let text = (input ?? "").slice(0, MAX_MESSAGE).replace(/[\r\n\t]+/g, " ");
  const today = romeParts(now.toISOString())?.date ?? now.toISOString().slice(0, 10);

  // kind
  const kind: RequestKind | null = /\bamichevol[ei]\b/i.test(text) ? "AMICHEVOLE" : null;
  if (!kind) warnings.push("Tipo di richiesta non riconosciuto: oggi l'app gestisce solo le amichevoli.");

  // time first (so "ore 15.30" is never read as a date)
  let time: string | null = null;
  const timeRes = [
    /\b(?:ore|alle|h\.?)\s*(\d{1,2})(?:\s*[:.,]\s*(\d{2}))?(?:\s+e\s+(mezza|30|trenta|un\s+quarto|15|quindici|45|tre\s+quarti))?(?!\s*[/-]\d)\b/i,
    /\b(\d{1,2}):(\d{2})\b/,
  ];
  for (const re of timeRes) {
    const m = re.exec(text);
    if (!m) continue;
    const h = Number(m[1]);
    let min = m[2] ? Number(m[2]) : 0;
    const extra = (m[3] ?? "").toLowerCase().replace(/\s+/g, " ");
    if (extra === "mezza" || extra === "30" || extra === "trenta") min = 30;
    else if (extra === "un quarto" || extra === "15" || extra === "quindici") min = 15;
    else if (extra === "tre quarti" || extra === "45") min = 45;
    if (h <= 23 && min <= 59) time = `${pad(h)}:${pad(min)}`;
    else warnings.push("Orario non valido: da indicare.");
    text = cut(text, m);
    break;
  }
  if (!time && !warnings.some((w) => w.startsWith("Orario"))) warnings.push("Orario non indicato.");

  // date
  let date: string | null = null;
  let dateSeen = false;
  const full = /\b(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2}|\d{4}))?\b/.exec(text);
  if (full) {
    dateSeen = true;
    const d = Number(full[1]);
    const mo = Number(full[2]);
    if (full[3]) {
      const y = full[3].length === 2 ? 2000 + Number(full[3]) : Number(full[3]);
      if (!validDay(y, mo, d)) warnings.push("Data non valida: da indicare.");
      else if (iso(y, mo, d) < today) warnings.push("La data indicata è già passata: da correggere.");
      else date = iso(y, mo, d);
    } else {
      date = resolveDayMonth(today, d, mo);
      if (!date) warnings.push("Data non valida: da indicare.");
    }
    text = cut(text, full);
  }
  if (!dateSeen) {
    const named = new RegExp(`\\b(\\d{1,2})\\s+(${MONTHS.join("|")})(?:\\s+(\\d{4}))?\\b`, "i").exec(text);
    if (named) {
      dateSeen = true;
      const d = Number(named[1]);
      const mo = MONTHS.indexOf(named[2]!.toLowerCase()) + 1;
      if (named[3]) {
        const y = Number(named[3]);
        if (!validDay(y, mo, d)) warnings.push("Data non valida: da indicare.");
        else if (iso(y, mo, d) < today) warnings.push("La data indicata è già passata: da correggere.");
        else date = iso(y, mo, d);
      } else {
        date = resolveDayMonth(today, d, mo);
        if (!date) warnings.push("Data non valida: da indicare.");
      }
      text = cut(text, named);
    }
  }
  if (!dateSeen) {
    const rel = /\b(oggi|domani|dopodomani)\b/i.exec(text);
    const wd = new RegExp(`\\b(${WEEKDAY_RE})(?:\\s+(\\d{1,2})\\b)?(?![\\p{L}\\d])`, "iu").exec(text);
    const dayOnly = /\b(?:il|del|per\s+il)\s+(\d{1,2})\b/i.exec(text);
    if (rel) {
      dateSeen = true;
      const w = rel[1]!.toLowerCase();
      date = w === "oggi" ? today : addDays(today, w === "domani" ? 1 : 2);
      text = cut(text, rel);
    } else if (wd) {
      dateSeen = true;
      const target = weekdayIndex(wd[1]!)!;
      if (wd[2]) {
        const cand = nextDayOfMonth(today, Number(wd[2]));
        if (cand && weekdayOf(cand) === target) date = cand;
        else warnings.push(`"${wd[0].trim()}" non corrisponde a una data dei prossimi giorni: da controllare.`);
      } else {
        // the next such weekday after today
        let cand = addDays(today, 1);
        while (weekdayOf(cand) !== target) cand = addDays(cand, 1);
        date = cand;
      }
      text = cut(text, wd);
    } else if (dayOnly) {
      dateSeen = true;
      date = nextDayOfMonth(today, Number(dayOnly[1]));
      if (!date) warnings.push("Data non valida: da indicare.");
      text = cut(text, dayOnly);
    }
  }
  if (!dateSeen) warnings.push("Data non indicata.");

  // team
  const teams = new Set<string>();
  for (const [re, key] of TEAM_RULES) if (re.test(text)) teams.add(key);
  let teamKey: string | null = null;
  if (teams.size === 1) teamKey = [...teams][0]!;
  else if (teams.size > 1) warnings.push("Più squadre nel messaggio: scegliere quella giusta.");
  else if (/\besordienti\b/i.test(text)) warnings.push("Esordienti: indicare l'annata (2014 o 2015).");
  else warnings.push("Squadra non indicata.");

  // venue and home/away
  let venue: string | null = null;
  let homeAway: HomeAway | null = null;
  const ours = /\b(?:a|al|presso(?:\s+il)?)\s+(?:campo\s+(?:di\s+)?)?(colico|dervio)\b(?:\s*[-,]?\s*campo\s*([12]))?/i.exec(text);
  if (ours) {
    venue = OUR_VENUES[ours[1]!.toLowerCase()]! + (ours[2] ? ` · Campo ${ours[2]}` : "");
    homeAway = "CASA";
    text = cut(text, ours);
  } else {
    const away = /\b(?:a|presso)\s+([A-ZÀ-Ý][\p{L}'’]+(?:\s+(?:[A-ZÀ-Ý][\p{L}'’]+|di|del|sul|d'))*)/u.exec(text);
    if (away) {
      venue = cleanName(away[1]!);
      homeAway = "FUORI";
      text = cut(text, away);
    }
  }
  if (/\bin\s+casa\b/i.test(text)) homeAway = homeAway ?? "CASA";
  if (/\b(?:fuori\s+casa|in\s+trasferta|da\s+loro)\b/i.test(text)) homeAway = homeAway === "CASA" && venue ? "CASA" : "FUORI";
  if (!venue) warnings.push("Campo non indicato.");

  // opponent
  let opponent: string | null = null;
  const opp = /\b(?:contro|con|vs\.?|v\.)\s+(?:(?:la|il|lo|i|gli|le)\s+|l['’]\s*)?(.+?)(?=\s*(?:[,;.!?]|\b(?:ore|alle|il|per|a|al|in|presso|da|e|che|se)\b|$))/i.exec(text);
  if (opp) {
    const name = cleanName(opp[1]!);
    if (name && !/^(?:la|il|squadra|noi|voi|loro)$/i.test(name)) opponent = name;
  }
  if (!opponent) warnings.push("Squadra avversaria non indicata.");

  return { kind, teamKey, date, time, venue, homeAway, opponent, warnings };
}
