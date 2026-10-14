/**
 * Impianti e campi — planning engine (release 2, item 8). Pure functions, no React.
 *
 * (a) One booking request = pitch zone + changing room(s) + lights, checked together.
 * (b) State history of a proposal (who / when), kept in the "Note" column of the
 *     master "17 - PRENOTAZIONI IMPIANTI 2026-27" (no new columns: the column
 *     list is part of the manifest source PRENOTAZIONI_IMPIANTI_SHEET).
 * (c) Day view per pitch: prenotato / disponibile / rilasciato.
 * (d) Trainings of the weekly training board (Quadro settimanale) inside the
 *     pitch capacity check, labelled, with week A and week B checked separately
 *     (the board says the week cannot be determined automatically).
 *
 * Reuses the capacity engine of `rotation.ts` and the register helpers of
 * `bookings-register.ts`. The quadro is passed in by the caller (members-only,
 * never bundled: UD-100). Team names only, never names of minors.
 */
import {
  type BookingStatus,
  type Proposal,
  normalizeStatus,
} from "./bookings-register";
import {
  LIGHTS_AFTER_MIN,
  PITCHES,
  QUADRO_DAY,
  ROOMS,
  checkSlot,
  hhmm,
  loadAt,
  pitchUnits,
  roomClashes,
  toMinutes,
  unitsToVerify,
  type Booking,
  type PitchFormat,
  type PitchId,
  type QuadroRoom,
  type RoomClash,
  type RotationMatch,
} from "./rotation";

const EPS = 1e-9;

/* ------------------------------------------------------------------ */
/* (d) Quadro trainings as pitch uses                                  */
/* ------------------------------------------------------------------ */

export type QuadroWeek = "A" | "B";
export const QUADRO_WEEKS: readonly QuadroWeek[] = ["A", "B"];

/** The parts of a rotation of the training board this engine reads. */
export interface QuadroRotationLike {
  week: "A" | "B" | "A/B";
  days: readonly string[];
  start: number;
  end: number;
  zones: Partial<Record<string, string>>;
}

/** Training zones per Colico pitch (board "ROTAZIONE CAMPI"): campo 1 in thirds, campo 2 in halves. */
export const PITCH_ZONES: Readonly<Record<"C1" | "C2", readonly string[]>> = {
  C1: ["C1_A", "C1_B", "C1_C"],
  C2: ["C2_A", "C2_B"],
};

export const QUADRO_LABEL = "Allenamento dal Quadro settimanale";

/** A training on a pitch: one time segment with the zones in use (union, never double counted). */
export interface TrainingUse {
  pitch: "C1" | "C2";
  week: QuadroWeek;
  start: number;
  end: number;
  zones: string[];
  /** Team names as written on the board. */
  groups: string[];
  /** Share of the pitch in use (zones / zones of the pitch). */
  share: number;
}

const usedCell = (v: string | undefined): v is string =>
  typeof v === "string" && v.trim() !== "" && v.trim() !== "—";

/** Training board weekday of an ISO date ("LUNEDÌ"…), or null for an invalid date. */
export function quadroDayOf(iso: string): string | null {
  const t = Date.parse(`${iso}T12:00:00Z`);
  if (Number.isNaN(t) || new Date(t).toISOString().slice(0, 10) !== iso)
    return null;
  return QUADRO_DAY[new Date(t).getUTCDay()] ?? null;
}

/**
 * Trainings of the quadro on one Colico pitch, on the weekday of `date`, for
 * one week (rotations marked "A/B" belong to both). Overlapping rotations are
 * merged zone by zone, so a zone is never counted twice. Dervio is not on the
 * board: always empty.
 */
export function quadroTrainings(
  rotations: readonly QuadroRotationLike[],
  date: string,
  pitch: PitchId,
  week: QuadroWeek,
): TrainingUse[] {
  if (pitch === "DV") return [];
  const day = quadroDayOf(date);
  if (!day) return [];
  const zoneKeys = PITCH_ZONES[pitch];
  const active = rotations.filter(
    (r) =>
      r.days.includes(day) &&
      (r.week === week || r.week === "A/B") &&
      r.end > r.start &&
      zoneKeys.some((z) => usedCell(r.zones[z])),
  );
  const cuts = [
    ...new Set(active.flatMap((r) => [r.start, r.end])),
  ].sort((a, b) => a - b);
  const out: TrainingUse[] = [];
  for (let i = 0; i + 1 < cuts.length; i++) {
    const a = cuts[i]!;
    const b = cuts[i + 1]!;
    const covering = active.filter((r) => r.start <= a && b <= r.end);
    const zones = zoneKeys.filter((z) =>
      covering.some((r) => usedCell(r.zones[z])),
    );
    if (!zones.length) continue;
    const groups = [
      ...new Set(
        covering.flatMap((r) =>
          zoneKeys
            .map((z) => r.zones[z])
            .filter(usedCell)
            .map((v) => v.trim()),
        ),
      ),
    ];
    const prev = out[out.length - 1];
    // Same zones back to back: one use, teams listed once (board rows that hand over).
    if (prev && prev.end === a && prev.zones.join() === zones.join()) {
      prev.end = b;
      for (const g of groups) if (!prev.groups.includes(g)) prev.groups.push(g);
      continue;
    }
    out.push({
      pitch,
      week,
      start: a,
      end: b,
      zones,
      groups,
      share: zones.length / zoneKeys.length,
    });
  }
  return out;
}

/** Share of the pitch used by trainings at one minute (changeover buffer after each training). */
export function trainingShareAt(
  uses: readonly TrainingUse[],
  minute: number,
  buffer: number,
): { share: number; active: TrainingUse[] } {
  const active = uses.filter((u) => u.start <= minute && minute < u.end + buffer);
  if (!active.length) return { share: 0, active };
  const zones = new Set(active.flatMap((u) => u.zones));
  const total = PITCH_ZONES[active[0]!.pitch].length;
  return { share: zones.size / total, active };
}

export interface WeekCheck {
  week: QuadroWeek;
  fits: boolean;
  peak: number;
  /** Trainings of that week touching the slot (buffer included). */
  trainings: TrainingUse[];
}

export interface CapacityCheck {
  /** True only when the use fits in week A AND in week B. */
  fits: boolean;
  /** Highest load in the worse week (1 = pitch full). */
  peak: number;
  /** Matches and other uses of the day touching the slot (as in `checkSlot`). */
  sharing: RotationMatch[];
  byWeek: Record<QuadroWeek, WeekCheck>;
  /** Format on a pitch whose measures are still to verify (96 × 48). */
  measuresToVerify: boolean;
  /** False when no quadro was given: trainings are unknown, not absent. */
  quadroKnown: boolean;
}

/**
 * `checkSlot` plus the trainings of the quadro. The quadro cannot tell week A
 * from week B for a calendar date, so both are checked and both must fit.
 * `rotations: null` means the quadro is not available (shown as unknown).
 */
export function checkSlotWithQuadro(
  dayItems: readonly RotationMatch[],
  rotations: readonly QuadroRotationLike[] | null,
  date: string,
  pitch: PitchId,
  start: number,
  duration: number,
  format: PitchFormat,
  buffer: number,
): CapacityCheck {
  const base = checkSlot(dayItems, pitch, start, duration, format, buffer);
  const end = start + duration;
  const units = pitchUnits(pitch, format);
  const same = dayItems.filter((m) => m.pitch === pitch);
  const measuresToVerify = unitsToVerify(pitch, format);
  const byWeek = {} as Record<QuadroWeek, WeekCheck>;
  for (const week of QUADRO_WEEKS) {
    const uses = rotations ? quadroTrainings(rotations, date, pitch, week) : [];
    const touching = uses.filter(
      (u) => u.start < end + buffer && start < u.end + buffer,
    );
    // Intervals are half-open [start, end + buffer): load only rises at a start.
    const points = new Set<number>([start]);
    for (const m of same)
      if (m.start > start && m.start < end + buffer) points.add(m.start);
    for (const u of uses)
      if (u.start > start && u.start < end + buffer) points.add(u.start);
    let peak = 0;
    for (const t of points) {
      const load =
        units +
        loadAt(same, pitch, t, buffer).load +
        trainingShareAt(uses, t, buffer).share;
      peak = Math.max(peak, load);
    }
    byWeek[week] = {
      week,
      fits: peak <= 1 + EPS && !measuresToVerify,
      peak,
      trainings: touching,
    };
  }
  const peak = Math.max(byWeek.A.peak, byWeek.B.peak, base.peak);
  return {
    fits: base.fits && byWeek.A.fits && byWeek.B.fits,
    peak,
    sharing: base.sharing,
    byWeek,
    measuresToVerify,
    quadroKnown: rotations !== null,
  };
}

/** Plain Italian line for the trainings found by a check (week labelled). */
export function trainingLines(check: CapacityCheck): string[] {
  if (!check.quadroKnown)
    return [`${QUADRO_LABEL}: non disponibile qui, allenamenti non controllati.`];
  const out: string[] = [];
  const a = check.byWeek.A.trainings;
  const b = check.byWeek.B.trainings;
  const key = (u: TrainingUse) => `${u.start}-${u.end}-${u.groups.join("|")}`;
  const inB = new Set(b.map(key));
  const inA = new Set(a.map(key));
  const zoneText = (u: TrainingUse) => {
    if (u.share >= 1 - EPS) return "campo intero";
    if (u.pitch === "C2") return "metà campo";
    return u.zones.length === 1 ? "un terzo del campo" : "due terzi del campo";
  };
  for (const u of a)
    out.push(
      `${QUADRO_LABEL} (settimana ${inB.has(key(u)) ? "A e B" : "A"}): ${u.groups.join(", ")} ${hhmm(u.start)}–${hhmm(u.end)}, ${zoneText(u)}`,
    );
  for (const u of b)
    if (!inA.has(key(u)))
      out.push(
        `${QUADRO_LABEL} (settimana B): ${u.groups.join(", ")} ${hhmm(u.start)}–${hhmm(u.end)}, ${zoneText(u)}`,
      );
  return out;
}

/* ------------------------------------------------------------------ */
/* (a) One request: pitch zone + changing rooms + lights               */
/* ------------------------------------------------------------------ */

export interface LightsAdvice {
  requested: boolean;
  /** The use ends after 17:00 (club rule already used for Dervio). */
  recommended: boolean;
  /** Minutes [from, to] the lights would be on, or null when not requested. */
  window: readonly [number, number] | null;
  /** Lights homologation recorded for Colico campo 1 only (facility register); others to verify. */
  note: string;
}

/** Lights for a draft: on from 17:00 (or from the start, if later) to the end. */
export function lightsAdvice(d: Omit<Booking, "id">): LightsAdvice {
  const start = toMinutes(d.start);
  const requested = d.lights === true;
  if (start === null)
    return { requested, recommended: false, window: null, note: "" };
  const end = start + d.duration;
  const recommended = end > LIGHTS_AFTER_MIN;
  const from =
    start < LIGHTS_AFTER_MIN && end > LIGHTS_AFTER_MIN ? LIGHTS_AFTER_MIN : start;
  const note =
    d.pitch === "C1"
      ? "Impianto luci omologato (registro impianti, campo 1)."
      : d.pitch === "C2"
        ? "Luci del campo 2: omologazione da verificare nel registro impianti."
        : "Luci di Dervio da verificare con il Comune.";
  return {
    requested,
    recommended,
    window: requested ? [from, end] : null,
    note,
  };
}

export interface RequestResource {
  kind: "campo" | "spogliatoio" | "luci";
  /** Space id of the master "16 - SEDI E IMPIANTI". */
  spaceId: string;
  label: string;
  from: number;
  to: number;
}

const zoneText = (pitch: PitchId, format: PitchFormat): string => {
  const w = pitchUnits(pitch, format);
  return w >= 0.999
    ? "campo intero"
    : w >= 0.49
      ? "metà campo"
      : w >= 0.33
        ? "un terzo"
        : "un quarto";
};

/** Everything one request reserves, in order: pitch zone, rooms, lights. */
export function requestResources(d: Omit<Booking, "id">): RequestResource[] {
  const start = toMinutes(d.start);
  if (start === null) return [];
  const end = start + d.duration;
  const p = PITCHES[d.pitch];
  const out: RequestResource[] = [
    {
      kind: "campo",
      spaceId: p.spaceId,
      label: `${p.site} ${p.name.toLowerCase()} · ${zoneText(d.pitch, d.format)}`,
      from: start,
      to: end,
    },
  ];
  if (d.pitch !== "DV")
    for (const r of d.rooms ?? []) {
      const room = ROOMS.find((x) => x.id === r);
      if (room)
        out.push({
          kind: "spogliatoio",
          spaceId: room.spaceId,
          label: r === "ARB" ? "Spogliatoio arbitri" : `Spogliatoio ${r}`,
          from: start,
          to: end,
        });
    }
  const l = lightsAdvice(d);
  if (l.window)
    out.push({
      kind: "luci",
      spaceId: p.spaceId,
      label: `Luci ${p.site} ${p.name.toLowerCase()}`,
      from: l.window[0],
      to: l.window[1],
    });
  return out;
}

export interface RequestCheck {
  resources: RequestResource[];
  pitch: CapacityCheck | null;
  rooms: RoomClash[];
  lights: LightsAdvice;
  /** Blocking problems: the request cannot be confirmed as it is. */
  problems: string[];
  /** Points to look at; they do not block. */
  warnings: string[];
  /** All resources free together (pitch in both weeks, rooms, no problems). */
  ok: boolean;
}

export interface RequestContext {
  /** Uses of the same day (matches of the scenario + other ipotesi), without this draft. */
  dayItems: readonly RotationMatch[];
  others: readonly Booking[];
  quadroRooms: readonly QuadroRoom[];
  rotations: readonly QuadroRotationLike[] | null;
  buffer: number;
}

/** Checks pitch zone, rooms and lights of one request together: all or nothing. */
export function checkRequest(
  d: Omit<Booking, "id">,
  ctx: RequestContext,
): RequestCheck {
  const start = toMinutes(d.start);
  const lights = lightsAdvice(d);
  const resources = requestResources(d);
  const problems: string[] = [];
  const warnings: string[] = [];
  if (start === null || !Number.isFinite(d.duration) || d.duration < 15)
    return {
      resources,
      pitch: null,
      rooms: [],
      lights,
      problems: ["Orario da completare."],
      warnings,
      ok: false,
    };
  const pitch = checkSlotWithQuadro(
    ctx.dayItems,
    ctx.rotations,
    d.date,
    d.pitch,
    start,
    d.duration,
    d.format,
    ctx.buffer,
  );
  if (pitch.measuresToVerify)
    problems.push("Formato da verificare sulle misure del campo (96 × 48).");
  else if (!pitch.fits) {
    const weeks = QUADRO_WEEKS.filter((w) => !pitch.byWeek[w].fits);
    problems.push(
      weeks.length === 2 || !pitch.quadroKnown
        ? "Il campo non basta in quell'orario."
        : `Il campo non basta in settimana ${weeks[0]} (Quadro settimanale).`,
    );
  }
  const rooms = roomClashes(d, ctx.others, ctx.quadroRooms, ctx.buffer);
  if (rooms.length)
    problems.push(
      `Spogliatoi già assegnati: ${[...new Set(rooms.map((r) => (r.room === "ARB" ? "arbitri" : r.room)))].join(", ")}.`,
    );
  if (lights.recommended && !lights.requested)
    warnings.push(
      `Finisce dopo le ${hhmm(LIGHTS_AFTER_MIN)}: chiedi anche le luci.`,
    );
  if (lights.requested && d.pitch !== "C1") warnings.push(lights.note);
  if (!pitch.quadroKnown)
    warnings.push("Quadro settimanale non disponibile: allenamenti non controllati.");
  return {
    resources,
    pitch,
    rooms,
    lights,
    problems,
    warnings,
    ok: problems.length === 0,
  };
}

/* ------------------------------------------------------------------ */
/* (b) State history (who / when) in the Note column                   */
/* ------------------------------------------------------------------ */

export interface HistoryEntry {
  status: BookingStatus;
  /** Club position (never a personal name), "—" when unknown. */
  who: string;
  /** "yyyy-mm-ddThh:mm" (Europe/Rome), or null when not recorded. */
  when: string | null;
  /** "registro": written in the Storico of the Note; "dedotto": read from Stato / Richiesto da / Approvato da. */
  basis: "registro" | "dedotto";
  reason?: string;
}

const SEP = " | ";
const NOTE_KEYS = ["Luci:", "Storico:", "Respinta:"] as const;

/** Note column split in its segments ("Luci: …", "Storico: …", "Respinta: …", free text). */
export function noteSegments(note: string): string[] {
  return note
    .split(/\s\|\s/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function segment(note: string, key: (typeof NOTE_KEYS)[number]): string | null {
  const s = noteSegments(note).find((x) => x.startsWith(key));
  return s ? s.slice(key.length).trim() : null;
}

/** Free text of the note without the structured segments. */
export function noteFreeText(note: string): string {
  return noteSegments(note)
    .filter((s) => !NOTE_KEYS.some((k) => s.startsWith(k)))
    .join(SEP);
}

/** Lights requested in the note ("Luci: 17:00–19:30"), or "" when none. */
export function noteLights(note: string): string {
  return segment(note, "Luci:") ?? "";
}

const cleanCell = (v: string) =>
  v.replace(/[\t\r\n|;]+/g, " ").replace(/\s{2,}/g, " ").trim();

/** Rome local "dd/mm/yyyy hh:mm" for an instant. */
export function romeStamp(at: Date): string {
  const p = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return `${g("day")}/${g("month")}/${g("year")} ${g("hour")}:${g("minute")}`;
}

/** One history entry as written in the note: "14/10/2026 18:30 CONFERMATA (Presidente)". */
export function historyStamp(status: BookingStatus, who: string, at: Date): string {
  return `${romeStamp(at)} ${status} (${cleanCell(who) || "—"})`;
}

const STAMP_RE =
  /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}) ([A-Za-zÀ-ÿ ]+?) \(([^)]*)\)(?:\s*[—-]\s*(.+))?$/;

/** Entries of the "Storico:" segment; unreadable entries are skipped. */
export function parseHistory(note: string): HistoryEntry[] {
  const raw = segment(note, "Storico:");
  if (!raw) return [];
  const out: HistoryEntry[] = [];
  for (const part of raw.split(";")) {
    const m = STAMP_RE.exec(part.trim());
    if (!m) continue;
    const status = normalizeStatus(m[6]!);
    if (!status) continue;
    out.push({
      status,
      who: m[7]!.trim() || "—",
      when: `${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}`,
      basis: "registro",
      ...(m[8] ? { reason: m[8].trim() } : {}),
    });
  }
  return out.sort((a, b) => (a.when ?? "").localeCompare(b.when ?? ""));
}

/** Note with one more history entry (other segments kept, in order). */
export function appendHistory(note: string, stamp: string): string {
  const segs = noteSegments(note);
  const i = segs.findIndex((s) => s.startsWith("Storico:"));
  if (i >= 0) segs[i] = `${segs[i]}; ${stamp}`;
  else segs.push(`Storico: ${stamp}`);
  return segs.join(SEP);
}

/** Note with a segment set or replaced (empty value removes it). */
export function setNoteSegment(
  note: string,
  key: "Luci:" | "Respinta:",
  value: string,
): string {
  const segs = noteSegments(note).filter((s) => !s.startsWith(key));
  const v = cleanCell(value);
  if (v) segs.unshift(`${key} ${v}`);
  return segs.join(SEP);
}

/**
 * History of a proposal: the dated entries of the Storico, completed with what
 * the row says today. When the current Stato is missing from the Storico it is
 * added as "dedotto" with no date (never invented).
 */
export function proposalHistory(p: Proposal): HistoryEntry[] {
  const logged = parseHistory(p.note);
  const reason = segment(p.note, "Respinta:") ?? undefined;
  const out = [...logged];
  if (!out.some((e) => e.status === "PROPOSTA"))
    out.unshift({
      status: "PROPOSTA",
      who: p.requestedBy || "—",
      when: null,
      basis: "dedotto",
    });
  const last = out[out.length - 1]!;
  if (p.status && p.status !== last.status)
    out.push({
      status: p.status,
      who: p.status === "PROPOSTA" ? p.requestedBy || "—" : p.approvedBy || "—",
      when: null,
      basis: "dedotto",
      ...(p.status === "RESPINTA" && reason ? { reason } : {}),
    });
  return out;
}

export interface DecisionNote {
  stato: BookingStatus;
  /** Full new value for the Note column (history entry appended). */
  note: string;
  stamp: string;
}

/**
 * Cells for a Direzione decision with the history entry: Stato, and the whole
 * Note column (previous segments kept, "Respinta: motivo" for a rejection).
 */
export function decisionWithHistory(
  decision: "CONFERMATA" | "RESPINTA" | "IN VALUTAZIONE",
  opts: { note: string; who: string; at: Date; reason?: string },
): DecisionNote {
  let note = opts.note;
  if (decision === "RESPINTA")
    note = setNoteSegment(
      note,
      "Respinta:",
      cleanCell(opts.reason ?? "") || "motivo da indicare",
    );
  const stamp = historyStamp(decision, opts.who, opts.at);
  return { stato: decision, note: appendHistory(note, stamp), stamp };
}

/** Note of a new request: lights (when asked) and the first history entry. */
export function requestNote(
  d: Omit<Booking, "id">,
  requestedBy: string,
  at: Date | null,
): string {
  const l = lightsAdvice(d);
  let note = l.window
    ? `Luci: ${hhmm(l.window[0])}–${hhmm(l.window[1])}`
    : "";
  if (at) note = appendHistory(note, historyStamp("PROPOSTA", requestedBy, at));
  return note;
}

/* ------------------------------------------------------------------ */
/* (c) Day view per pitch                                              */
/* ------------------------------------------------------------------ */

export type DayState = "prenotato" | "disponibile" | "rilasciato";

export interface DayUse {
  label: string;
  source: "gara" | "quadro" | "registro" | "ipotesi";
  start: number;
  end: number;
  share: number;
}

export interface DayBlock {
  start: number;
  end: number;
  state: DayState;
  /** Share of the pitch in use (0..1+; above 1 = over capacity). */
  used: number;
  uses: DayUse[];
  /** Confirmed bookings later cancelled (ANNULLATA) over this time. */
  released: DayUse[];
  /** Requests still waiting (PROPOSTA, IN VALUTAZIONE, local ipotesi): they do not reserve. */
  pending: DayUse[];
}

export interface DayViewInput {
  date: string;
  pitch: PitchId;
  /** Calendar matches and local ipotesi of the scenario (any day: filtered here). */
  items: readonly RotationMatch[];
  /** Rows of the register (any day); null when the register is not read here. */
  proposals: readonly Proposal[] | null;
  rotations: readonly QuadroRotationLike[] | null;
  week: QuadroWeek;
  /** Window shown, minutes. Default 08:00–23:00. */
  from?: number;
  to?: number;
}

export interface DayView {
  date: string;
  pitch: PitchId;
  week: QuadroWeek;
  blocks: DayBlock[];
  registryKnown: boolean;
  quadroKnown: boolean;
  totals: Record<DayState, number>;
}

const proposalUse = (p: Proposal): DayUse | null =>
  p.date && p.start !== null && p.end !== null && p.pitch && p.format
    ? {
        label: `${p.kindLabel || "Prenotazione"}${p.subject ? ` · ${p.subject}` : ""} (${p.id})`,
        source: "registro",
        start: p.start,
        end: p.end,
        share: pitchUnits(p.pitch, p.format),
      }
    : null;

/**
 * The day of one pitch in blocks: "prenotato" where something holds the pitch
 * (calendar match, confirmed register row, quadro training of the chosen
 * week), "rilasciato" where a cancelled booking freed it and nothing else is
 * there, "disponibile" elsewhere. Pending requests are listed, never reserve.
 */
export function pitchDayView(input: DayViewInput): DayView {
  const from = input.from ?? 8 * 60;
  const to = input.to ?? 23 * 60;
  const { date, pitch } = input;
  const held: DayUse[] = [];
  const pending: DayUse[] = [];
  const released: DayUse[] = [];
  for (const m of input.items) {
    if (m.date !== date || m.pitch !== pitch) continue;
    const use: DayUse = {
      label: m.kind === "match" ? `${m.label}${m.opponent ? ` – ${m.opponent}` : ""}` : m.label,
      source: m.kind === "match" ? "gara" : "ipotesi",
      start: m.start,
      end: m.end,
      share: pitchUnits(pitch, m.format),
    };
    (m.kind === "match" ? held : pending).push(use);
  }
  for (const p of input.proposals ?? []) {
    if (p.date !== date || p.pitch !== pitch) continue;
    const use = proposalUse(p);
    if (!use) continue;
    if (p.status === "CONFERMATA") held.push(use);
    else if (p.status === "ANNULLATA") released.push(use);
    else if (p.status === "PROPOSTA" || p.status === "IN VALUTAZIONE")
      pending.push(use);
  }
  const trainings = input.rotations
    ? quadroTrainings(input.rotations, date, pitch, input.week)
    : [];
  for (const t of trainings)
    held.push({
      label: `${QUADRO_LABEL}: ${t.groups.join(", ")}`,
      source: "quadro",
      start: t.start,
      end: t.end,
      share: t.share,
    });
  const clip = (u: DayUse) => u.end > from && u.start < to;
  const all = [...held, ...pending, ...released].filter(clip);
  const cuts = [
    ...new Set([
      from,
      to,
      ...all.flatMap((u) => [u.start, u.end]).filter((x) => x > from && x < to),
    ]),
  ].sort((a, b) => a - b);
  const blocks: DayBlock[] = [];
  const over = (u: DayUse, a: number, b: number) => u.start < b && a < u.end;
  for (let i = 0; i + 1 < cuts.length; i++) {
    const a = cuts[i]!;
    const b = cuts[i + 1]!;
    const uses = held.filter((u) => over(u, a, b));
    // Trainings are already a zone union; matches and bookings add their share.
    const used = uses.reduce((s, u) => s + u.share, 0);
    const rel = released.filter((u) => over(u, a, b));
    const pend = pending.filter((u) => over(u, a, b));
    const state: DayState =
      used > EPS ? "prenotato" : rel.length ? "rilasciato" : "disponibile";
    const prev = blocks[blocks.length - 1];
    const sig = (x: DayUse[]) => x.map((u) => u.label).join("|");
    if (
      prev &&
      prev.end === a &&
      prev.state === state &&
      Math.abs(prev.used - used) < EPS &&
      sig(prev.uses) === sig(uses) &&
      sig(prev.released) === sig(rel) &&
      sig(prev.pending) === sig(pend)
    ) {
      prev.end = b;
      continue;
    }
    blocks.push({ start: a, end: b, state, used, uses, released: rel, pending: pend });
  }
  const totals: Record<DayState, number> = {
    prenotato: 0,
    disponibile: 0,
    rilasciato: 0,
  };
  for (const bl of blocks) totals[bl.state] += bl.end - bl.start;
  return {
    date,
    pitch,
    week: input.week,
    blocks,
    registryKnown: input.proposals !== null,
    quadroKnown: input.rotations !== null,
    totals,
  };
}

export const DAY_STATE_LABEL: Readonly<Record<DayState, string>> = {
  prenotato: "Prenotato",
  disponibile: "Disponibile",
  rilasciato: "Rilasciato",
};

/** "metà campo libera", "campo pieno"… for a block. */
export function freeShareText(used: number): string {
  const free = Math.max(0, 1 - used);
  if (used > 1 + EPS) return "oltre la capienza";
  if (free < EPS) return "campo pieno";
  if (free > 1 - EPS) return "campo libero";
  if (Math.abs(free - 0.5) < 0.02) return "resta metà campo";
  if (Math.abs(free - 1 / 3) < 0.02) return "resta un terzo";
  if (Math.abs(free - 2 / 3) < 0.02) return "restano due terzi";
  if (Math.abs(free - 0.25) < 0.02) return "resta un quarto";
  if (Math.abs(free - 0.75) < 0.02) return "restano tre quarti";
  return `resta il ${Math.round(free * 100)}%`;
}
