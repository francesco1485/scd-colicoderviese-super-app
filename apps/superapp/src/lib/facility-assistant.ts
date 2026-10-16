/**
 * "Chiedi a Sky" for Impianti e campi: a deterministic assistant, no LLM.
 *
 * It parses simple Italian questions (pitch, day, time, intent) and answers
 * only with results of the rotation engine over the real calendar snapshot and
 * the user's own hypothetical bookings. Unknown values are "—", never invented.
 * Every answer is a simulation: nothing is booked or moved for real.
 */
import {
  BOOKING_DEFAULTS,
  COMUNE_DERVIO_NOTE,
  LIGHTS_AFTER_MIN,
  PITCHES,
  RAIN_MOVE_NOTICE_TO,
  TEAM_NOTICE_DAYS,
  checkSlot,
  ddmm,
  freeWindows,
  groupByDay,
  hhmm,
  isWinterDay,
  loadAt,
  longDay,
  minusDays,
  type Analysis,
  type Booking,
  type PitchId,
  type RotationMatch,
} from "./rotation";

export type AssistantIntent =
  | "availability"
  | "rental"
  | "place-event"
  | "conflicts"
  | "notice"
  | "rental-procedure"
  | "help";

export interface ParsedQuestion {
  intent: AssistantIntent;
  date: string | null;
  /** Minutes from midnight. */
  time: number | null;
  pitch: PitchId | null;
}

export type AssistantAction =
  | { type: "open-day"; date: string; label: string }
  | { type: "add-booking"; draft: Omit<Booking, "id">; label: string }
  | {
      type: "open-tab";
      tab: "colico" | "dervio" | "simulazione";
      label: string;
    };

export interface AssistantAnswer {
  intent: AssistantIntent;
  text: string;
  details: string[];
  actions: AssistantAction[];
  tone: "ok" | "warn" | "crit" | "info";
}

export interface AssistantContext {
  /** Items of the current scenario (matches after simulation + valid bookings). */
  items: readonly RotationMatch[];
  analysis: Analysis;
  /** ISO date of today (Europe/Rome). */
  today: string;
  buffer: number;
  lightsVerified: boolean;
}

const MONTHS = [
  "gennaio",
  "febbraio",
  "marzo",
  "aprile",
  "maggio",
  "giugno",
  "luglio",
  "agosto",
  "settembre",
  "ottobre",
  "novembre",
  "dicembre",
];
const WEEKDAYS = [
  "domenica",
  "lunedi",
  "martedi",
  "mercoledi",
  "giovedi",
  "venerdi",
  "sabato",
];

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[’`]/g, "'");

const iso = (y: number, m: number, d: number): string | null => {
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  if (dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return dt.toISOString().slice(0, 10);
};

const addDays = (isoDay: string, n: number) => minusDays(isoDay, -n);

/** Season year for a month: July–December belong to the season's first year. */
function seasonYear(month: number, today: string): number {
  const ty = Number(today.slice(0, 4));
  const tm = Number(today.slice(5, 7));
  const start = tm >= 7 ? ty : ty - 1;
  return month >= 7 ? start : start + 1;
}

/** Day in the question: "17/10", "17 ottobre", "sabato 17", "domenica", "oggi", "domani". */
export function parseDate(text: string, today: string): string | null {
  const t = norm(text);
  if (/\bdopodomani\b/.test(t)) return addDays(today, 2);
  if (/\bdomani\b/.test(t)) return addDays(today, 1);
  if (/\boggi\b/.test(t)) return today;
  const numeric = /\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/.exec(t);
  if (numeric) {
    const d = Number(numeric[1]);
    const m = Number(numeric[2]);
    const y = numeric[3]
      ? numeric[3].length === 2
        ? 2000 + Number(numeric[3])
        : Number(numeric[3])
      : seasonYear(m, today);
    return iso(y, m, d);
  }
  const named = new RegExp(
    `\\b(\\d{1,2})\\s+(${MONTHS.join("|")})(?:\\s+(\\d{4}))?`,
  ).exec(t);
  if (named) {
    const d = Number(named[1]);
    const m = MONTHS.indexOf(named[2]!) + 1;
    return iso(named[3] ? Number(named[3]) : seasonYear(m, today), m, d);
  }
  const wd = new RegExp(
    `\\b(${WEEKDAYS.join("|")})\\b(?:\\s+(\\d{1,2})\\b)?`,
  ).exec(t);
  if (wd) {
    const target = WEEKDAYS.indexOf(wd[1]!);
    if (wd[2]) {
      // "sabato 17": the next day numbered 17 (this month or the next) falling on that weekday, else the next 17.
      const day = Number(wd[2]);
      let y = Number(today.slice(0, 4));
      let m = Number(today.slice(5, 7));
      for (let i = 0; i < 12; i++) {
        const cand = iso(y, m, day);
        if (
          cand &&
          cand >= today &&
          new Date(`${cand}T12:00:00Z`).getUTCDay() === target
        )
          return cand;
        m++;
        if (m > 12) {
          m = 1;
          y++;
        }
      }
      return null;
    }
    const cur = new Date(`${today}T12:00:00Z`).getUTCDay();
    return addDays(today, (target - cur + 7) % 7);
  }
  return null;
}

/** Time in the question: "alle 15", "ore 18:30", "15:00", "alle 10.30". */
export function parseTime(text: string): number | null {
  const t = norm(text);
  const m =
    /\b(?:alle|ore|dalle|per le|verso le)\s+(\d{1,2})(?:[:.](\d{2}))?\b/.exec(
      t,
    ) ?? /\b(\d{1,2})[:.](\d{2})\b/.exec(t);
  if (!m) return null;
  const h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

export function parsePitch(text: string): PitchId | null {
  const t = norm(text);
  if (/\bdervio\b/.test(t)) return "DV";
  if (/\b(campo\s*2|c2|campetto)\b/.test(t)) return "C2";
  if (/\b(campo\s*1|c1|campo grande|sintetico)\b/.test(t)) return "C1";
  return null;
}

export function detectIntent(text: string): AssistantIntent {
  const t = norm(text);
  if (
    /\b(come|procedura|cosa (devo|serve)|passaggi)\b/.test(t) &&
    /(affitt|terz|noleggi)/.test(t)
  )
    return "rental-procedure";
  if (/(avvis|preavvis|comune)/.test(t)) return "notice";
  if (/(conflitt|sovrappost|accavall|problem)/.test(t)) return "conflicts";
  if (
    /(torneo|evento|festa|camp estivo|dove (metto|posso mettere|faccio)|finestr)/.test(
      t,
    )
  )
    return "place-event";
  if (/(affitt|noleggi|terzi)/.test(t)) return "rental";
  if (
    /(liber|disponibil|occupat|posso (usare|mettere|prenotare)|chi (c'e|gioca|usa)|c'e (qualcuno|posto))/.test(
      t,
    )
  )
    return "availability";
  return "help";
}

export function parseQuestion(text: string, today: string): ParsedQuestion {
  return {
    intent: detectIntent(text),
    date: parseDate(text, today),
    time: parseTime(text),
    pitch: parsePitch(text),
  };
}

const pitchName = (p: PitchId) =>
  `${PITCHES[p].site} ${PITCHES[p].name.toLowerCase()}`;

function dayItems(ctx: AssistantContext, date: string): RotationMatch[] {
  return groupByDay(ctx.items).get(date) ?? [];
}

const weekdayNote = (date: string) => {
  const wd = new Date(`${date}T12:00:00Z`).getUTCDay();
  return wd >= 1 && wd <= 5
    ? "Gli allenamenti infrasettimanali del quadro non sono in questo controllo: verifica il Quadro settimanale."
    : null;
};

function describeUse(m: RotationMatch): string {
  const fmt = m.format === "full" ? "campo intero" : `gara a ${m.format}`;
  return `${hhmm(m.start)}–${hhmm(m.end)} ${m.label}${m.kind === "match" ? "" : " (ipotesi)"} · ${fmt}`;
}

const HELP_EXAMPLES = [
  "Il campo 1 è libero sabato 17 ottobre alle 15?",
  "Posso affittare il campo 2 domenica alle 18?",
  "Dove metto un torneo il 13 dicembre?",
  "Quali giorni hanno conflitti?",
  "Chi devo avvisare per le gare a Dervio?",
  "Come gestisco un affitto a terzi?",
];

export const ASSISTANT_EXAMPLES: readonly string[] = HELP_EXAMPLES;

function missing(intent: AssistantIntent, what: string): AssistantAnswer {
  return {
    intent,
    text: `Mi serve ${what}. Esempio: "${intent === "place-event" ? HELP_EXAMPLES[2] : HELP_EXAMPLES[0]}"`,
    details: [],
    actions: [],
    tone: "info",
  };
}

function answerAvailability(
  q: ParsedQuestion,
  ctx: AssistantContext,
  rental: boolean,
): AssistantAnswer {
  const intent = rental ? "rental" : "availability";
  if (!q.date && q.time === null)
    return missing(intent, "il giorno e l'orario");
  if (!q.date) return missing(intent, "il giorno");
  if (q.time === null) return missing(intent, "l'orario");
  const pitch = q.pitch ?? "C1";
  const items = dayItems(ctx, q.date);
  const details: string[] = [];
  if (!q.pitch)
    details.push("Non hai indicato il campo: ho controllato Colico campo 1.");
  const note = weekdayNote(q.date);
  const when = `${longDay(q.date)} alle ${hhmm(q.time)}`;
  if (rental) {
    const { duration, format } = BOOKING_DEFAULTS.affitto;
    const check = checkSlot(items, pitch, q.time, duration, format, ctx.buffer);
    for (const m of check.sharing) details.push(describeUse(m));
    if (
      pitch === "DV" &&
      !ctx.lightsVerified &&
      q.time + duration > LIGHTS_AFTER_MIN
    )
      details.push("A Dervio dopo le 17:00 le luci sono da verificare.");
    if (pitch === "DV")
      details.push(
        "Dervio: un affitto è fuori dal programma stagionale comunicato al Comune; se avvisarlo lo decide la Direzione.",
      );
    if (note) details.push(note);
    details.push(
      'Un affitto passa da proposta e approvazione della Direzione: chiedimi "come gestisco un affitto a terzi?".',
    );
    const draft: Omit<Booking, "id"> = {
      kind: "affitto",
      pitch,
      date: q.date,
      start: hhmm(q.time),
      duration,
      format,
      title: "",
    };
    return {
      intent,
      text: check.fits
        ? `Sì: ${pitchName(pitch)} risulta libero ${when} per ${duration} minuti a campo intero, cambio campo compreso.`
        : `No: ${pitchName(pitch)} ${when} è già in uso, a campo intero non ci sta.`,
      details,
      actions: [
        { type: "add-booking", draft, label: "Aggiungi come ipotesi" },
        { type: "open-day", date: q.date, label: "Apri il giorno" },
      ],
      tone: check.fits ? "ok" : "crit",
    };
  }
  const { load, active } = loadAt(items, pitch, q.time, ctx.buffer);
  for (const m of active) details.push(describeUse(m));
  if (note) details.push(note);
  const free = active.length === 0;
  const text = free
    ? `Sì: ${pitchName(pitch)} è libero ${when}, nel calendario e nelle tue ipotesi.`
    : load > 1 + 1e-9
      ? `No: ${pitchName(pitch)} ${when} è oltre la capienza (conflitto).`
      : load >= 1 - 1e-9
        ? `No: ${pitchName(pitch)} ${when} è pieno.`
        : `In parte: ${pitchName(pitch)} ${when} è occupato per ${Math.round(load * 100)}%, resta spazio per un formato piccolo.`;
  return {
    intent,
    text,
    details,
    actions: [{ type: "open-day", date: q.date, label: "Apri il giorno" }],
    tone: free ? "ok" : load > 1 + 1e-9 ? "crit" : "warn",
  };
}

function answerPlaceEvent(
  q: ParsedQuestion,
  ctx: AssistantContext,
): AssistantAnswer {
  if (!q.date) return missing("place-event", "il giorno");
  const items = dayItems(ctx, q.date);
  const minLength = 180;
  const details: string[] = [];
  const pitches: PitchId[] = q.pitch ? [q.pitch] : ["C1", "C2", "DV"];
  let first: { pitch: PitchId; start: number } | null = null;
  for (const p of pitches) {
    const to = p === "DV" && !ctx.lightsVerified ? LIGHTS_AFTER_MIN : 22 * 60;
    const wins = freeWindows(items, p, {
      from: 9 * 60,
      to,
      minLength,
      buffer: ctx.buffer,
    });
    const extra: string[] = [];
    if (p === "C2")
      extra.push("96 × 48: per l'11 contro 11 misure da verificare");
    if (p === "DV") {
      extra.push(
        "fuori dal programma stagionale comunicato al Comune: decide la Direzione",
      );
      if (isWinterDay(q.date))
        extra.push("erba in inverno: controllo del fondo");
      if (!ctx.lightsVerified)
        extra.push("fino alle 17:00, luci da verificare");
    }
    const list = wins.length
      ? wins.map((w) => `${hhmm(w.start)}–${hhmm(w.end)}`).join(", ")
      : "nessuna finestra di 3 ore";
    details.push(
      `${pitchName(p)}: ${list}${extra.length ? ` · ${extra.join("; ")}` : ""}`,
    );
    if (!first && wins.length) first = { pitch: p, start: wins[0]!.start };
  }
  const note = weekdayNote(q.date);
  if (note) details.push(note);
  const actions: AssistantAction[] = [
    { type: "open-day", date: q.date, label: "Apri il giorno" },
  ];
  if (first) {
    actions.unshift({
      type: "add-booking",
      draft: {
        kind: "torneo",
        pitch: first.pitch,
        date: q.date,
        start: hhmm(first.start),
        duration: BOOKING_DEFAULTS.torneo.duration,
        format: "full",
        title: "",
      },
      label: `Ipotesi torneo su ${pitchName(first.pitch)}`,
    });
  }
  return {
    intent: "place-event",
    text: first
      ? `${longDay(q.date)}: ecco le finestre libere di almeno 3 ore a campo intero, cambio campo compreso.`
      : `${longDay(q.date)}: nessun campo ha 3 ore libere a campo intero.`,
    details,
    actions,
    tone: first ? "ok" : "warn",
  };
}

function answerConflicts(ctx: AssistantContext): AssistantAnswer {
  const upcoming = ctx.analysis.days.filter(
    (d) => d.over.C1.size > 0 && d.date >= ctx.today,
  );
  if (!upcoming.length) {
    return {
      intent: "conflicts",
      text: "Nello scenario scelto non ci sono sovrapposti sul campo 1 di Colico da oggi in poi.",
      details: [],
      actions: [
        { type: "open-tab", tab: "simulazione", label: "Apri la simulazione" },
      ],
      tone: "ok",
    };
  }
  const details = upcoming.slice(0, 8).map((d) => {
    const teams = d.matches
      .filter((m) => d.over.C1.has(m.id))
      .map((m) => `${m.short} ${hhmm(m.start)}`)
      .join(", ");
    return `${longDay(d.date)}: ${teams}`;
  });
  if (upcoming.length > 8)
    details.push(`e altri ${upcoming.length - 8} giorni.`);
  return {
    intent: "conflicts",
    text: `${upcoming.length} ${upcoming.length === 1 ? "giorno" : "giorni"} con sovrapposti sul campo 1 di Colico da oggi, nello scenario scelto.`,
    details,
    actions: [
      {
        type: "open-day",
        date: upcoming[0]!.date,
        label: `Apri ${longDay(upcoming[0]!.date)}`,
      },
      { type: "open-tab", tab: "simulazione", label: "Prova le soluzioni" },
    ],
    tone: "crit",
  };
}

/** Who is notified for a Dervio match (DG decision 2026-10-16). */
const NOTICE_RULES: readonly string[] = [
  `Avviso alla squadra che gioca ${TEAM_NOTICE_DAYS} giorni prima, a tutti 3 giorni prima.`,
  `Se piove e la gara torna a Colico: avviso solo a ${RAIN_MOVE_NOTICE_TO}.`,
];

function answerNotice(ctx: AssistantContext): AssistantAnswer {
  const list = ctx.analysis.dervio
    .filter((d) => d.match.kind === "match")
    .sort((a, b) => a.noticeBy.localeCompare(b.noticeBy));
  if (!list.length) {
    return {
      intent: "notice",
      text: `Nello scenario scelto nessuna gara è a Dervio, quindi nessun avviso. ${COMUNE_DERVIO_NOTE}`,
      details: [
        ...NOTICE_RULES,
        'Prova lo scenario "Solo i conflitti a Dervio" nella simulazione.',
      ],
      actions: [
        { type: "open-tab", tab: "simulazione", label: "Apri la simulazione" },
      ],
      tone: "info",
    };
  }
  const late = list.filter((d) => d.late).length;
  const details = list.slice(0, 10).map((d) => {
    const when = d.late
      ? "già in ritardo"
      : d.daysToNotice === 0
        ? "oggi"
        : `fra ${d.daysToNotice} ${d.daysToNotice === 1 ? "giorno" : "giorni"}`;
    return `${d.match.label} ${ddmm(d.match.date)} ${hhmm(d.match.start)} → avviso alla squadra entro il ${ddmm(d.noticeBy)} (${when})`;
  });
  return {
    intent: "notice",
    text: `${COMUNE_DERVIO_NOTE} Primo avviso alla squadra entro il ${ddmm(list[0]!.noticeBy)}${late ? `; ${late} ${late === 1 ? "avviso è" : "avvisi sono"} già oltre i ${TEAM_NOTICE_DAYS} giorni` : ""}. Sono date della simulazione: nessuna gara è spostata davvero.`,
    details: [...details, ...NOTICE_RULES],
    actions: [{ type: "open-tab", tab: "dervio", label: "Apri Dervio" }],
    tone: late ? "crit" : "warn",
  };
}

function answerRentalProcedure(): AssistantAnswer {
  return {
    intent: "rental-procedure",
    text: "Un affitto a terzi in quattro passi:",
    details: [
      "1. Verifica la disponibilità qui (campo, giorno, orario, cambio campo) e salva l'ipotesi.",
      "2. Prepara la proposta: ente richiedente, campo, orari, spogliatoi e uso delle luci.",
      "3. Approvazione della Direzione (Presidente o Direttore generale).",
      "4. Comunicazione all'ente. Per Dervio l'affitto è fuori dal programma stagionale comunicato al Comune: se avvisarlo lo decide la Direzione.",
      "Servono un accordo scritto e la verifica dell'assicurazione dell'ente: chiedi alla segreteria. Questa non è una consulenza legale.",
    ],
    actions: [
      { type: "open-tab", tab: "simulazione", label: "Aggiungi un'ipotesi" },
    ],
    tone: "info",
  };
}

function answerHelp(): AssistantAnswer {
  return {
    intent: "help",
    text: "Rispondo su campi, orari e avvisi usando il calendario reale e le tue ipotesi. Prova a chiedere:",
    details: HELP_EXAMPLES,
    actions: [],
    tone: "info",
  };
}

export function answerQuestion(
  text: string,
  ctx: AssistantContext,
): AssistantAnswer {
  const q = parseQuestion(text, ctx.today);
  switch (q.intent) {
    case "availability":
      return answerAvailability(q, ctx, false);
    case "rental":
      return answerAvailability(q, ctx, true);
    case "place-event":
      return answerPlaceEvent(q, ctx);
    case "conflicts":
      return answerConflicts(ctx);
    case "notice":
      return answerNotice(ctx);
    case "rental-procedure":
      return answerRentalProcedure();
    default:
      return answerHelp();
  }
}
