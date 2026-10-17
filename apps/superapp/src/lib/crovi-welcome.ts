/**
 * Crovi on the public home (UD-184, Francesco DG 17/10/2026 14:08: «Io voglio vedere in prima pagina app super web il
 * crovi»). Pure helpers, no I/O, all by the Europe/Rome clock:
 * - {@link croviPose}: which approved Crovi v3 cut-out to show (weekday wave, Fri–Sun match days point, Monday thumbs);
 * - {@link croviLine}: the short line of his speech bubble, by day and time of day; a match is named only when the
 *   public calendar gives one (next home game with a confirmed time), never invented;
 * - {@link isResultReport} / {@link RESULT_REPORT_REPLY}: «Segnala un risultato» never writes a score (UD-182: only
 *   official LND data is published); the Segreteria checks it against the LND source.
 * Measured on PERSONE: chat opens from the home card (chip and input) per visit.
 */
export type CroviPose = "wave" | "point" | "thumbs";

export interface CroviMatch {
  /** ISO date YYYY-MM-DD (Europe/Rome). */
  date: string;
  /** HH:MM, confirmed time only. */
  time: string;
  /** Opponent club name from the public calendar (clubs, never people). */
  opponent: string;
}

const WEEKDAYS = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"] as const;

/** Rome calendar parts of an instant: ISO date, weekday (0 = Sunday) and hour. */
export function romeClock(nowMs: number): { date: string; weekday: number; hour: number } {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  }).formatToParts(new Date(nowMs));
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(g("weekday"));
  return { date: `${g("year")}-${g("month")}-${g("day")}`, weekday: wd < 0 ? 0 : wd, hour: Number(g("hour")) % 24 };
}

/** Pose of the day: Monday after the weekend thumbs up, Friday to Sunday (match days) pointing, otherwise waving. */
export function croviPose(nowMs: number): CroviPose {
  const { weekday } = romeClock(nowMs);
  if (weekday === 1) return "thumbs";
  if (weekday === 5 || weekday === 6 || weekday === 0) return "point";
  return "wave";
}

/** Approved Crovi v3 cut-out (config/scd-assets.v1.json, UD-184) of a pose, phone (440) or large (900) width. */
export function croviPoseSrc(pose: CroviPose, width: 440 | 900 = 440): string {
  return `/media/crovi/v3/crovi-${pose}-${width}.webp`;
}

export type CroviSlot = "mattina" | "pomeriggio" | "sera" | "notte";

export function croviSlot(hour: number): CroviSlot {
  if (hour >= 5 && hour < 12) return "mattina";
  if (hour >= 12 && hour < 18) return "pomeriggio";
  if (hour >= 18 && hour < 23) return "sera";
  return "notte";
}

/**
 * The lines of Crovi (warm, a little know-it-all, never mocking, no names of people, no facts): three per moment of
 * the day, one picked by the date so the bubble changes every day and every few hours.
 */
export const CROVI_LINES: Readonly<Record<CroviSlot, readonly string[]>> = {
  mattina: [
    "Buongiorno! Caffè, giornale e calendario: io parto sempre da lì. Tu cosa cerchi?",
    "Mattina presto, campo ancora bagnato e io già qui a chiacchierare. Chiedimi pure!",
    "Ai miei tempi si giocava col pallone di cuoio pesante. Oggi c'è l'app: che lusso!",
  ],
  pomeriggio: [
    "Il pomeriggio è fatto per due cose: la merenda e sapere quando si gioca. Ti aiuto io!",
    "Ho visto più partite io che fili d'erba al campo. Cosa ti serve sapere?",
    "Ciao! Se cerchi orari, campi o pulmini sei nel posto giusto: chiedi a Crovi.",
  ],
  sera: [
    "Stasera luci accese e scarpini pronti? Dimmi la squadra e ti dico dove guardare.",
    "La sera al campo è la più bella: si sente il fischietto fino al lago.",
    "Finito l'allenamento? Bravi tutti! Se ti manca un'informazione, chiedi pure.",
  ],
  notte: [
    "A quest'ora io sogno schemi e rovesciate. Ma una domanda veloce la reggo!",
    "Notte fonda: la segreteria dorme, io no. Chiedi e domattina ci pensano loro.",
    "Anche i campioni dormono, sai? Io intanto tengo d'occhio il calendario.",
  ],
};

function dayIndex(date: string): number {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

/** Days from `from` to `to` (ISO dates). */
function daysBetween(from: string, to: string): number {
  return dayIndex(to) - dayIndex(from);
}

/**
 * Line of the bubble. A home game in the next 3 days with a confirmed time (public calendar) is named with its day,
 * time and opponent club; otherwise a line of the moment of the day, rotating by date.
 */
export function croviLine(nowMs: number, match: CroviMatch | null = null): string {
  const { date, hour } = romeClock(nowMs);
  if (match && /^\d{4}-\d{2}-\d{2}$/.test(match.date) && /^\d{2}:\d{2}$/.test(match.time)) {
    const gap = daysBetween(date, match.date);
    const opp = match.opponent.trim();
    const vs = opp ? ` contro ${opp}` : "";
    if (gap === 0) return `Oggi alle ${match.time} si gioca in casa${vs}. Io il posto in tribuna l'ho già scaldato!`;
    if (gap === 1) return `Domani alle ${match.time} si gioca in casa${vs}. Sciarpa pronta, si va al campo!`;
    if (gap > 1 && gap <= 3) {
      const wd = WEEKDAYS[new Date(`${match.date}T12:00:00Z`).getUTCDay()]!;
      return `Segnatevelo: ${wd} alle ${match.time} si gioca in casa${vs}. Io ci sarò, come sempre!`;
    }
  }
  const lines = CROVI_LINES[croviSlot(hour)];
  return lines[((dayIndex(date) % lines.length) + lines.length) % lines.length]!;
}

/** Quick questions under the home card; each opens the app chat with that text sent. */
export const CROVI_CHIPS = ["Quando si gioca?", "Allenamenti di stasera", "Pulmini", "Segnala un risultato"] as const;

/** True when the visitor wants to report a score («Segnala un risultato», «ho un risultato»…). */
export function isResultReport(message: string): boolean {
  const t = message.toLowerCase();
  return /\b(segnal\w*|comunic\w*|mand\w*|invi\w*|ho)\b[^.?!]{0,30}\brisultat\w*/.test(t) || /^\s*risultato\s*[:\d]/.test(t);
}

/**
 * Fixed answer to a result report: nothing is written or published from the chat (UD-182, official LND data only);
 * the visitor sends it to the Segreteria, which checks it against the official LND source.
 */
export const RESULT_REPORT_REPLY = {
  text:
    "Grazie, così mi piaci! Mandalo alla Segreteria con squadra, avversaria, data e punteggio: lo controllano con la fonte ufficiale LND. In app pubblichiamo solo i risultati ufficiali, così nessuno si sbaglia.",
  mood: "success" as const,
  links: [
    { label: "Contatti segreteria", to: "/contatti" },
    { label: "Risultati ufficiali", to: "/classifiche" },
  ],
};
