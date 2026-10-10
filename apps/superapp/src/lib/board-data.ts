/**
 * Dati delle schermate "tavole" (Home, Calendario, Staff, Comunicazioni) derivati SOLO dalle fonti
 * reali già presenti: calendario pubblico validato (mirror Drive / copia di sicurezza) e fotografia
 * del quadro allenamenti. Funzioni pure, senza rete: testate in board-data.test.ts.
 * Nessun numero inventato: dove la fonte non esiste si restituisce null ("—" in UI, mai zero).
 */
import type { PublicEvent, PublicGroup, TrainingSlot } from "./public-snapshots";
import { findSessions } from "./public-snapshots";

const DAY_MS = 86_400_000;
const WEEKDAYS_IT = ["DOMENICA", "LUNEDÌ", "MARTEDÌ", "MERCOLEDÌ", "GIOVEDÌ", "VENERDÌ", "SABATO"] as const;

const atNoon = (iso: string) => new Date(`${iso}T12:00:00Z`);
const isoOf = (d: Date) => d.toISOString().slice(0, 10);
const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("it-IT", { timeZone: "UTC", ...o }).format(atNoon(iso));
const clean = (t: string) => t.replace(/\.$/, "").toUpperCase();

/** Parti del blocco data delle tavole: { weekday: "SAB", day: "10", month: "OTT" }. */
export function dateParts(iso: string): { weekday: string; day: string; month: string } {
  return { weekday: clean(fmt(iso, { weekday: "short" })), day: String(atNoon(iso).getUTCDate()), month: clean(fmt(iso, { month: "short" })) };
}

export function addDays(iso: string, n: number): string {
  return isoOf(new Date(atNoon(iso).getTime() + n * DAY_MS));
}

/** Lunedì–domenica della settimana di `today` spostata di `offset` settimane, con etichetta "5 – 11 ottobre 2026". */
export function weekRange(today: string, offset = 0): { from: string; to: string; label: string } {
  const base = atNoon(today);
  const mon = new Date(base.getTime() - ((base.getUTCDay() + 6) % 7) * DAY_MS + offset * 7 * DAY_MS);
  const from = isoOf(mon);
  const to = addDays(from, 6);
  const sameMonth = from.slice(0, 7) === to.slice(0, 7);
  const sameYear = from.slice(0, 4) === to.slice(0, 4);
  const left = sameMonth ? String(atNoon(from).getUTCDate()) : fmt(from, sameYear ? { day: "numeric", month: "long" } : { day: "numeric", month: "long", year: "numeric" });
  return { from, to, label: `${left} – ${fmt(to, { day: "numeric", month: "long", year: "numeric" })}` };
}

/** Mese di `today` spostato di `offset`, con etichetta "ottobre 2026". */
export function monthRange(today: string, offset = 0): { from: string; to: string; label: string } {
  const base = atNoon(today);
  const m = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + offset, 1, 12));
  const end = new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth() + 1, 0, 12));
  return { from: isoOf(m), to: isoOf(end), label: fmt(isoOf(m), { month: "long", year: "numeric" }) };
}

/** Nome del giorno nel quadro (LUNEDÌ…VENERDÌ); null per sabato e domenica (il quadro copre lun–ven). */
export function quadroDay(iso: string): string | null {
  const d = WEEKDAYS_IT[atNoon(iso).getUTCDay()]!;
  return d === "SABATO" || d === "DOMENICA" ? null : d;
}

/** Etichetta breve di un gruppo del quadro: "U15 2012/2013 + U12 2015" -> "U15 + U12". */
export function shortTeams(text: string): string {
  return text
    .split("\n")[0]!
    .replace(/^INTERO\s+—\s+/i, "")
    .replace(/\s*\(.*?\)\s*/g, " ")
    .replace(/\s*•\s*Promozione/i, "")
    .replace(/Under\s+(\d{2})/gi, "U$1")
    .replace(/\b(U\d{2})\s+\d{4}(?:[/-]\d{4})?/g, "$1")
    .replace(/Primi Calci\s+\d{4}-\d{4}/i, "Primi Calci")
    .replace(/Piccoli Amici\s+\d{4}-\d{4}/i, "Piccoli Amici")
    .replace(/^PICCOLI AMICI$/i, "Piccoli Amici")
    .replace(/Juniores Élite U19/i, "Juniores U19")
    .replace(/Under\s+(\d{2})/gi, "U$1")
    .replace(/\s+/g, " ")
    .trim();
}

export type TrainingRow = { id: string; day: string; time: string; end: string; field: "C1" | "C2"; teams: string; text: string };

/** Allenamenti del giorno dal quadro: una riga per campo occupato, ordinate per orario. Query opzionale = annata/categoria. */
export function trainingRowsFor(iso: string, slots: readonly TrainingSlot[], query?: string): TrainingRow[] {
  const day = quadroDay(iso);
  if (!day) return [];
  const list = query
    ? findSessions([...slots], query).filter((s) => s.day === day).map((s) => ({ slot: slots.find((x) => x.day === s.day && x.timeLabel === s.timeLabel)!, field: s.field }))
    : slots.filter((s) => s.day === day).flatMap((slot) => (["C1", "C2"] as const).filter((f) => slot.fields[f].trim()).map((field) => ({ slot, field })));
  return list
    .map(({ slot, field }) => {
      const [time = "", end = ""] = slot.timeLabel.split(/[–-]/).map((t) => t.trim());
      return { id: `${iso}-${slot.timeLabel}-${field}`, day, time, end, field, teams: shortTeams(slot.fields[field]), text: slot.fields[field] };
    })
    .sort((a, b) => a.time.localeCompare(b.time) || a.field.localeCompare(b.field));
}

/** Gare di oggi in casa al centro sportivo (Colico/Dervio), come "attività di oggi". */
export function homeMatchesOn(events: readonly PublicEvent[], iso: string): PublicEvent[] {
  return events.filter((e) => e.date === iso && e.homeAway === "CASA" && /\b(colico|dervio)\b/i.test(e.venue));
}

/** Prossime gare da adesso (oggi con orario non passato o giorni successivi). */
export function upcomingMatches(events: readonly PublicEvent[], today: string, nowHHMM: string): PublicEvent[] {
  return events.filter((e) => e.date > today || (e.date === today && (e.time === "" || e.time >= nowHHMM)));
}

/** Contatori reali per l'Area Staff: solo quelli derivabili dal calendario validato. */
export function staffCounters(groups: readonly PublicGroup[], events: readonly PublicEvent[]): { teams: number | null; seasonMatches: number | null } {
  const teams = groups.filter((g) => g.count > 0 && g.id !== "other").length;
  return { teams: teams || null, seasonMatches: events.length || null };
}

/** Etichetta corta di un gruppo del calendario per pill e titoli ("U15", "Prima Squadra", "2015"). */
export function groupShort(g: Pick<PublicGroup, "id" | "label" | "years"> | undefined, fallback = ""): string {
  if (!g) return fallback;
  if (/juniores/i.test(g.label)) return "Juniores";
  if (/prima squadra/i.test(g.label)) return "Prima Squadra";
  const m = g.label.match(/\b(U\d{2})\b/);
  if (m) return m[1]!;
  const base = g.label.split("·")[0]!.trim();
  // Anno solo se scritto nell'etichetta del master (non dedotto dal nome del file logo).
  const year = g.label.match(/(?<!\d)20[0-2]\d(?!\d)/g);
  return year ? `${base} ${year.join("/")}` : base;
}

/** Titolo partita delle tavole: "Prima Squadra vs Alta Brianza Tavernerio" (casa) / "Meda 1913 vs Juniores U19" (trasferta). */
export function matchTitle(e: Pick<PublicEvent, "homeAway" | "opponent">, team: string): string {
  const opp = titleCase(e.opponent || "Avversario da definire");
  return e.homeAway === "CASA" ? `${team} vs ${opp}` : `${opp} vs ${team}`;
}

const KEEP_UPPER = /^(A\.?S\.?D\.?|S\.?S\.?D\.?|G\.?S\.?O\.?|G\.?S\.?|U\.?S\.?|A\.?C\.?|F\.?C\.?|S\.?C\.?|POL\.?|C\.?S\.?|SCD|II|III|1913|1921)$/;
/** "ALTA BRIANZA TAVERNERIO" -> "Alta Brianza Tavernerio" (sigle societarie lasciate maiuscole). */
export function titleCase(t: string): string {
  if (t !== t.toUpperCase()) return t;
  return t.split(/(\s+)/).map((w) => (KEEP_UPPER.test(w) || /\d/.test(w) ? (w === "POL." ? "Pol." : w) : w.charAt(0) + w.slice(1).toLowerCase())).join("");
}

const ACRONYMS = /^(CONI|FIGC|LND|CSI|ASD|SSD|SCD|PSG|USD|ASDC)$/;
/**
 * Sedi leggibili: "Meda - COMUNALE \"BUSNELLI\"" -> "Meda - Comunale \"Busnelli\"". Solo le parole tutte
 * maiuscole di almeno 3 lettere senza punti; sigle (C.S., E.A., CONI) restano invariate. Lo spazio
 * prima di un numero diventa non separabile ("Campo 1" non va a capo).
 */
export function venueCase(t: string): string {
  return t
    .split(/(\s+)/)
    .map((w) => {
      const core = w.replace(/^[("'“]+|[)"'”,.]+$/g, "");
      if (core.length < 3 || /[.\d]/.test(core) || core !== core.toUpperCase() || ACRONYMS.test(core) || !/[A-Z]/.test(core)) return w;
      return w.replace(core, core.charAt(0) + core.slice(1).toLowerCase());
    })
    .join("")
    .replace(/ (\d)/g, "\u00a0$1");
}

/** Il calendario è stato aggiornato di recente (per il pallino della campanella): entro `days` giorni. */
export function recentlyUpdated(sourceModifiedAt: string, now: Date, days = 3): boolean {
  const t = Date.parse(sourceModifiedAt);
  return Number.isFinite(t) && now.getTime() - t >= 0 && now.getTime() - t <= days * DAY_MS;
}
