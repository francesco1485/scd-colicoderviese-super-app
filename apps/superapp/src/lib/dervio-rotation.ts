/**
 * G03 "Rotazione gare Dervio" — pure planning logic (no React, no network).
 *
 * Rules decided by the DG on 2026-10-16 (VERIFIED in chat, `.claude/agents/PIPELINE.md` §3):
 * - Dervio hosts ONE youth home match per week ("Dervio 1"), starting Saturday 2026-10-24.
 * - Eligible teams: from Piccoli Amici (2021-born) up to Juniores, rotating upward
 *   from the youngest (round robin over the age order).
 * - Weeks with no eligible home match are skipped; never two Dervio matches in one week.
 * - The team playing is notified 14 days before; everybody 3 days before, also on the club page.
 * - Weather check 3 days before; on grass, if rain is forecast, decide the day before
 *   whether to change day.
 * - Each move needs: change-of-field request to LND/SGS, notice to the Comune di Dervio,
 *   notice to guests and referee.
 *
 * Constraints already in `rotation.ts` are reused, not duplicated: lights after 17:00
 * (`LIGHTS_AFTER_MIN`, issue `dv-lights`), winter on natural grass (`isWinterDay`, issue
 * `dv-winter`), one month notice to the Comune (`NOTICE_DAYS`), Dervio surface (`PITCHES.DV`).
 *
 * Engine: TEMPO (hours given back to Segreteria and Direzione: one computed plan and
 * checklist instead of manual tracking). Measured by: checklist items closed on time
 * (status "done" before due date) vs "overdue" per Dervio match.
 *
 * Every output is a DRAFT/PROPOSAL: nothing here sends notices, moves matches or writes data.
 * Team names only, never names of athletes.
 */

import {
  DEFAULT_DURATION,
  GROUP_FORMAT,
  GROUP_LABEL,
  LIGHTS_AFTER_MIN,
  NOTICE_DAYS,
  PITCHES,
  daysBetween,
  isWinterDay,
  minusDays,
  toMinutes,
} from "./rotation";

/** Youth groups eligible for Dervio, youngest → oldest (calendar group ids, see `rotation.ts`). */
export const DERVIO_AGE_ORDER = [
  "piccoli",
  "primicalci",
  "pulcini",
  "2015",
  "2014",
  "u15",
  "u16",
  "u19",
] as const;

export type DervioGroup = (typeof DERVIO_AGE_ORDER)[number];

/**
 * Groups deliberately left out of the rotation with a visible reason.
 * "esordienti" is a calendar group without a birth year: the annata must be verified
 * on the Master Calendario before it can enter the age order.
 */
export const UNVERIFIED_YEAR_GROUPS: readonly string[] = ["esordienti"];

/** First Dervio match day (Saturday). */
export const DERVIO_START_DATE = "2026-10-24";

export type PitchSurface = "grass" | "synthetic" | "unknown";

/** A home match from the Master Calendario (only the fields the planner needs). */
export interface DervioCandidate {
  id: string;
  /** Calendar group id (e.g. "u16", "2014"). Unknown groups are never eligible. */
  group: string;
  /** Local match day, ISO yyyy-mm-dd (Europe/Rome calendar date). */
  date: string;
  /** Kick-off "HH:MM" if known. */
  time?: string | null;
  /** End "HH:MM" if known; otherwise kick-off + default duration of the format. */
  end?: string | null;
  /** True for home matches. Away matches are never eligible. */
  home: boolean;
}

/** Why a home match in the planning window cannot be the Dervio match. */
export type ExclusionReason =
  /** Ends after 17:00 at Dervio and the lights are not verified (`dv-lights` in `rotation.ts`). */
  | "needs-lights"
  /** December–February on natural grass and the winter policy is "skip" (`dv-winter`). */
  | "winter-grass"
  /** No kick-off time: the lights rule cannot be checked (fail-closed). */
  | "kickoff-unknown"
  /** Calendar group without a verified birth year (e.g. "esordienti"). */
  | "group-year-unverified"
  /** Not a youth group of the Dervio rotation (e.g. Prima Squadra). */
  | "group-not-in-rotation";

export const EXCLUSION_LABEL: Readonly<Record<ExclusionReason, string>> = {
  "needs-lights": "Finisce dopo le 17:00: a Dervio servono le luci (da verificare)",
  "winter-grass": "Inverno su erba naturale: Dervio chiuso",
  "kickoff-unknown": "Orario non noto: luci non verificabili",
  "group-year-unverified": "Annata da verificare sul Master Calendario",
  "group-not-in-rotation": "Squadra fuori dalla rotazione Dervio",
};

export interface DervioExclusion {
  matchId: string;
  group: string;
  date: string;
  reason: ExclusionReason;
}

export interface DervioPick {
  match: DervioCandidate;
  group: DervioGroup;
  /** Team name for display (team names only). */
  label: string;
  /** End of the match in minutes from midnight (calendar end or default duration), null if unknown. */
  endMin: number | null;
  /** December–February on natural grass: the ground must be checked (policy "flag"). */
  winterGrass: boolean;
}

export interface DervioWeek {
  /** Monday of the week (ISO). */
  weekStart: string;
  /** Sunday of the week (ISO). */
  weekEnd: string;
  pick: DervioPick | null;
  /** Why the week has no Dervio match. */
  skipReason: "no-eligible-home-match" | "all-excluded" | null;
  /** Home matches of the week that could not be picked, with the reason. */
  excluded: DervioExclusion[];
}

export interface RotationOptions {
  /** First day that may host a Dervio match. Default {@link DERVIO_START_DATE}. */
  startDate?: string;
  /** Last day to plan (inclusive). Default: day of the last home match considered. */
  endDate?: string;
  /**
   * Group that played the last Dervio match before `startDate` (to resume the rotation).
   * Default null: the rotation starts from the youngest group.
   */
  lastGroup?: DervioGroup | null;
  /** Dervio lights verified: late matches allowed. Default false (as in `rotation.ts`). */
  lightsVerified?: boolean;
  /**
   * Winter (Dec–Feb) on natural grass: "flag" keeps the match with `winterGrass: true`
   * (default, same as the `dv-winter` warning in `rotation.ts`), "skip" excludes it.
   */
  winterPolicy?: "flag" | "skip";
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** True for a real calendar day in ISO yyyy-mm-dd form. */
export function isIsoDay(value: unknown): value is string {
  if (typeof value !== "string" || !ISO_DAY.test(value)) return false;
  const d = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function assertIsoDay(name: string, value: unknown): asserts value is string {
  if (!isIsoDay(value)) throw new RangeError(`${name} must be an ISO day (yyyy-mm-dd)`);
}

/** Day of week of an ISO date, 0 = Monday … 6 = Sunday (timezone independent). */
export function weekdayOf(iso: string): number {
  const d = new Date(`${iso}T12:00:00Z`).getUTCDay();
  return (d + 6) % 7;
}

/** Adds n days (n may be negative) to an ISO date; DST-safe (works on calendar dates). */
export const addDays = (iso: string, n: number): string => minusDays(iso, -n);

/** Monday of the week that contains `iso`. */
export const weekStartOf = (iso: string): string => minusDays(iso, weekdayOf(iso));

export function isDervioGroup(group: string): group is DervioGroup {
  return (DERVIO_AGE_ORDER as readonly string[]).includes(group);
}

/** Pitch surface from the facility registry text (`PITCHES[...].surface`). */
export function surfaceFromText(text: string | null | undefined): PitchSurface {
  const t = (text ?? "").toLowerCase();
  if (t.includes("sintetic")) return "synthetic";
  if (t.includes("erba")) return "grass";
  return "unknown";
}

/** Dervio pitch surface, from the facility registry (`PITCHES.DV.surface` = "erba naturale"). */
export const DERVIO_SURFACE: PitchSurface = surfaceFromText(PITCHES.DV.surface);

/** Sort key for a kick-off time; unknown times sort last within the day. */
function timeKey(t: string | null | undefined): string {
  return t && /^\d{1,2}:\d{2}$/.test(t.trim()) ? t.trim().padStart(5, "0") : "99:99";
}

const byDayAndTime = (a: DervioCandidate, b: DervioCandidate): number =>
  a.date.localeCompare(b.date) ||
  timeKey(a.time).localeCompare(timeKey(b.time)) ||
  a.id.localeCompare(b.id);

/** Home matches with a valid day inside [start, end], any group, sorted by day and time. */
function homeInWindow(
  candidates: readonly DervioCandidate[],
  startDate: string,
  endDate?: string,
): DervioCandidate[] {
  return candidates
    .filter(
      (c) =>
        c.home &&
        isIsoDay(c.date) &&
        c.date >= startDate &&
        (endDate === undefined || c.date <= endDate),
    )
    .sort(byDayAndTime);
}

/** Candidates of the Dervio groups: home, valid date, inside [start, end] (constraints not applied). */
export function eligibleCandidates(
  candidates: readonly DervioCandidate[],
  startDate: string,
  endDate?: string,
): DervioCandidate[] {
  return homeInWindow(candidates, startDate, endDate).filter((c) => isDervioGroup(c.group));
}

/** End of a match in minutes (calendar end, else kick-off + default duration), null if unknown. */
export function matchEndMin(c: DervioCandidate): number | null {
  const start = toMinutes(c.time ?? "");
  if (start === null) return null;
  const end = c.end ? toMinutes(c.end) : null;
  if (end !== null && end > start) return end;
  const format = GROUP_FORMAT[c.group];
  return format ? start + DEFAULT_DURATION[format] : null;
}

/** Why a home match cannot be the Dervio match, or null if it can. */
export function exclusionReason(
  c: DervioCandidate,
  options: Pick<RotationOptions, "lightsVerified" | "winterPolicy"> = {},
): ExclusionReason | null {
  if (UNVERIFIED_YEAR_GROUPS.includes(c.group)) return "group-year-unverified";
  if (!isDervioGroup(c.group)) return "group-not-in-rotation";
  if (options.winterPolicy === "skip" && DERVIO_SURFACE !== "synthetic" && isWinterDay(c.date))
    return "winter-grass";
  if (!options.lightsVerified) {
    const end = matchEndMin(c);
    if (end === null) return "kickoff-unknown";
    if (end > LIGHTS_AFTER_MIN) return "needs-lights";
  }
  return null;
}

/**
 * Picks the Dervio match of each week (round robin over {@link DERVIO_AGE_ORDER}).
 *
 * In each week, starting from the group after the last one that played at Dervio
 * (the youngest at the start), the first group in cyclic age order that has an allowed
 * home match that week plays; if it has more than one, the earliest one. Matches that
 * need lights (or winter grass with policy "skip") are excluded with a visible reason and
 * the next group in order is tried. Weeks with no allowed match are returned with
 * `pick: null` and do not advance the rotation.
 */
export function planDervioRotation(
  candidates: readonly DervioCandidate[],
  options: RotationOptions = {},
): DervioWeek[] {
  const startDate = options.startDate ?? DERVIO_START_DATE;
  assertIsoDay("startDate", startDate);
  if (options.endDate !== undefined) assertIsoDay("endDate", options.endDate);
  const considered = homeInWindow(candidates, startDate, options.endDate);
  const endDate = options.endDate ?? considered.at(-1)?.date;
  if (!endDate || endDate < startDate) return [];

  const byWeek = new Map<string, { allowed: DervioCandidate[]; excluded: DervioExclusion[] }>();
  for (const c of considered) {
    const w = weekStartOf(c.date);
    const bucket = byWeek.get(w) ?? { allowed: [], excluded: [] };
    byWeek.set(w, bucket);
    const reason = exclusionReason(c, options);
    if (reason) bucket.excluded.push({ matchId: c.id, group: c.group, date: c.date, reason });
    else bucket.allowed.push(c);
  }

  const n = DERVIO_AGE_ORDER.length;
  let pointer =
    options.lastGroup != null ? (DERVIO_AGE_ORDER.indexOf(options.lastGroup) + 1) % n : 0;
  const weeks: DervioWeek[] = [];
  for (let w = weekStartOf(startDate); w <= endDate; w = addDays(w, 7)) {
    const bucket = byWeek.get(w) ?? { allowed: [], excluded: [] };
    let pick: DervioPick | null = null;
    for (let step = 0; step < n && !pick; step++) {
      const group = DERVIO_AGE_ORDER[(pointer + step) % n];
      if (group === undefined) continue;
      const match = bucket.allowed.find((c) => c.group === group);
      if (match) {
        pick = {
          match,
          group,
          label: GROUP_LABEL[group] ?? group,
          endMin: matchEndMin(match),
          winterGrass: DERVIO_SURFACE !== "synthetic" && isWinterDay(match.date),
        };
        pointer = (DERVIO_AGE_ORDER.indexOf(group) + 1) % n;
      }
    }
    weeks.push({
      weekStart: w,
      weekEnd: addDays(w, 6),
      pick,
      skipReason: pick
        ? null
        : bucket.excluded.length > 0
          ? "all-excluded"
          : "no-eligible-home-match",
      excluded: bucket.excluded,
    });
  }
  return weeks;
}

/** Only the weeks that host a Dervio match. */
export const dervioPicks = (weeks: readonly DervioWeek[]): DervioPick[] =>
  weeks.flatMap((w) => (w.pick ? [w.pick] : []));

// ---------------------------------------------------------------------------
// Checklist
// ---------------------------------------------------------------------------

export type ChecklistItemId =
  | "team-notice"
  | "all-notice"
  | "club-page"
  | "weather-check"
  | "weather-decision"
  | "lnd-sgs-field-change"
  | "comune-notice"
  | "guests-referee-notice";

export type ChecklistStatus =
  | "done"
  | "overdue"
  | "due-today"
  | "upcoming"
  | "no-deadline"
  | "not-applicable";

export interface ChecklistItem {
  id: ChecklistItemId;
  /** Italian label for the UI. */
  label: string;
  /** Who acts (role, never a person's name). */
  owner: "segreteria" | "responsabile-impianti" | "direzione";
  /** Last useful day (ISO), null when no deadline is decided yet. */
  dueDate: string | null;
  /** Days from `today` to `dueDate` (negative = late), null without deadline. */
  daysLeft: number | null;
  status: ChecklistStatus;
}

/**
 * Lead days before the match (integers, clamped to 0–{@link MAX_LEAD_DAYS}).
 * `null` = deadline not decided: the item still appears, with status "no-deadline"
 * (never a guessed date).
 */
export interface ChecklistLeadDays {
  teamNotice: number;
  allNotice: number;
  weatherCheck: number;
  weatherDecision: number;
  /** Default {@link NOTICE_DAYS} (one month notice to the Comune, already used by `rotation.ts`). */
  comuneNotice: number | null;
  /** Not decided yet (open point for the Segreteria / LND rules). */
  lndSgsFieldChange: number | null;
  /** Not decided yet. */
  guestsRefereeNotice: number | null;
}

export const DEFAULT_LEAD_DAYS: Readonly<ChecklistLeadDays> = {
  teamNotice: 14,
  allNotice: 3,
  weatherCheck: 3,
  weatherDecision: 1,
  comuneNotice: NOTICE_DAYS,
  lndSgsFieldChange: null,
  guestsRefereeNotice: null,
};

export const MAX_LEAD_DAYS = 60;

/** Integer in [0, MAX_LEAD_DAYS]; non-finite values fall back to `fallback`. */
function clampLead<T extends number | null>(value: unknown, fallback: T): number | T {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(MAX_LEAD_DAYS, Math.max(0, Math.round(value)));
}

/** Lead days with injected overrides, clamped to integers 0–60 (null stays "no deadline"). */
export function resolveLeadDays(overrides: Partial<ChecklistLeadDays> = {}): ChecklistLeadDays {
  const d = DEFAULT_LEAD_DAYS;
  const req = (k: "teamNotice" | "allNotice" | "weatherCheck" | "weatherDecision"): number =>
    clampLead(overrides[k], d[k]);
  const opt = (k: "comuneNotice" | "lndSgsFieldChange" | "guestsRefereeNotice"): number | null => {
    const v = overrides[k] === undefined ? d[k] : overrides[k];
    return v === null ? null : clampLead(v, d[k]);
  };
  return {
    teamNotice: req("teamNotice"),
    allNotice: req("allNotice"),
    weatherCheck: req("weatherCheck"),
    weatherDecision: req("weatherDecision"),
    comuneNotice: opt("comuneNotice"),
    lndSgsFieldChange: opt("lndSgsFieldChange"),
    guestsRefereeNotice: opt("guestsRefereeNotice"),
  };
}

export interface ChecklistInput {
  /** Match day (ISO). */
  matchDate: string;
  /** Today (Europe/Rome calendar date, ISO), injected. */
  today: string;
  /** Items already completed (from the gestionale). */
  done?: ReadonlySet<ChecklistItemId> | readonly ChecklistItemId[];
  /** Pitch surface. Default {@link DERVIO_SURFACE}; unknown keeps the weather items (fail-safe). */
  surface?: PitchSurface;
  leadDays?: Partial<ChecklistLeadDays>;
}

const ITEM_META: Readonly<
  Record<ChecklistItemId, { label: string; owner: ChecklistItem["owner"] }>
> = {
  "team-notice": { label: "Avviso alla squadra (14 giorni prima)", owner: "segreteria" },
  "all-notice": { label: "Avviso a tutti (3 giorni prima)", owner: "segreteria" },
  "club-page": { label: "Pubblicazione sulla pagina del club", owner: "segreteria" },
  "weather-check": { label: "Controllo meteo (3 giorni prima)", owner: "responsabile-impianti" },
  "weather-decision": {
    label: "Meteo: decisione sul cambio giorno (giorno prima)",
    owner: "direzione",
  },
  "lnd-sgs-field-change": { label: "Richiesta cambio campo a LND/SGS", owner: "segreteria" },
  "comune-notice": { label: "Avviso al Comune di Dervio", owner: "segreteria" },
  "guests-referee-notice": { label: "Avviso a ospiti e arbitro", owner: "segreteria" },
};

/** Fixed display order. */
export const CHECKLIST_ORDER: readonly ChecklistItemId[] = [
  "comune-notice",
  "lnd-sgs-field-change",
  "team-notice",
  "guests-referee-notice",
  "weather-check",
  "all-notice",
  "club-page",
  "weather-decision",
];

/** Status of one item from its due date, `today` and completion. */
export function itemStatus(
  dueDate: string | null,
  today: string,
  isDone: boolean,
  applicable = true,
): ChecklistStatus {
  if (!applicable) return "not-applicable";
  if (isDone) return "done";
  if (dueDate === null) return "no-deadline";
  if (dueDate < today) return "overdue";
  if (dueDate === today) return "due-today";
  return "upcoming";
}

/** Checklist with due dates and statuses for one Dervio match. Throws on invalid ISO days. */
export function dervioChecklist(input: ChecklistInput): ChecklistItem[] {
  assertIsoDay("matchDate", input.matchDate);
  assertIsoDay("today", input.today);
  const lead = resolveLeadDays(input.leadDays);
  const done = new Set<ChecklistItemId>(input.done ?? []);
  const grassOrUnknown = (input.surface ?? DERVIO_SURFACE) !== "synthetic";
  const due = (days: number | null): string | null =>
    days === null ? null : minusDays(input.matchDate, days);

  const dueById: Record<ChecklistItemId, string | null> = {
    "team-notice": due(lead.teamNotice),
    "all-notice": due(lead.allNotice),
    "club-page": due(lead.allNotice),
    "weather-check": due(lead.weatherCheck),
    "weather-decision": due(lead.weatherDecision),
    "lnd-sgs-field-change": due(lead.lndSgsFieldChange),
    "comune-notice": due(lead.comuneNotice),
    "guests-referee-notice": due(lead.guestsRefereeNotice),
  };
  const applicable = (id: ChecklistItemId): boolean =>
    id === "weather-decision" ? grassOrUnknown : true;

  return CHECKLIST_ORDER.map((id) => {
    const dueDate = dueById[id];
    return {
      id,
      label: ITEM_META[id].label,
      owner: ITEM_META[id].owner,
      dueDate,
      daysLeft: dueDate === null ? null : daysBetween(input.today, dueDate),
      status: itemStatus(dueDate, input.today, done.has(id), applicable(id)),
    };
  });
}

/** Counts per status (for the Direzione overview). */
export function checklistSummary(
  items: readonly ChecklistItem[],
): Record<ChecklistStatus, number> {
  const out: Record<ChecklistStatus, number> = {
    done: 0,
    overdue: 0,
    "due-today": 0,
    upcoming: 0,
    "no-deadline": 0,
    "not-applicable": 0,
  };
  for (const i of items) out[i.status] += 1;
  return out;
}

// ---------------------------------------------------------------------------
// Rain rule
// ---------------------------------------------------------------------------

/** Forecast for the match day, injected by the caller (no network here). */
export interface RainForecast {
  /** Day the forecast refers to (must be the match day). */
  date: string;
  /** Probability of precipitation 0–100, null if not provided. */
  precipitationProbability?: number | null;
  /** Expected precipitation in mm, null if not provided. */
  precipitationMm?: number | null;
}

/**
 * Thresholds for "rain is forecast" (clamped to 0–100). PROPOSED defaults (not decided
 * by the DG yet): probability ≥ 50% or ≥ 1 mm.
 */
export interface RainThresholds {
  minProbability: number;
  minMm: number;
}

export const DEFAULT_RAIN_THRESHOLDS: Readonly<RainThresholds> = {
  minProbability: 50,
  minMm: 1,
};

export type RainVerdict =
  /** Grass pitch and rain forecast: decide the day before whether to change day. */
  | "valuta-cambio-giorno"
  /** Forecast available and no rain over the thresholds. */
  | "nessuna-pioggia"
  /** No usable forecast: unknown is never "no rain". */
  | "previsione-mancante"
  /** Not a grass pitch: the rain rule does not apply. */
  | "non-erba";

export interface RainDecision {
  verdict: RainVerdict;
  /** True only for "valuta-cambio-giorno". */
  evaluateDayChange: boolean;
  /** Day of the weather check (T-3). */
  checkOn: string;
  /** Day the change-of-day decision is taken (T-1). */
  decideOn: string;
}

const clampThreshold = (v: number | undefined, fallback: number): number =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : fallback;

/** Rain rule: forecast → "valuta cambio giorno" flag, decided the day before. */
export function rainDecision(
  matchDate: string,
  forecast: RainForecast | null | undefined,
  options: {
    /** Default {@link DERVIO_SURFACE}. */
    surface?: PitchSurface;
    thresholds?: Partial<RainThresholds>;
    leadDays?: Partial<Pick<ChecklistLeadDays, "weatherCheck" | "weatherDecision">>;
  } = {},
): RainDecision {
  assertIsoDay("matchDate", matchDate);
  const lead = resolveLeadDays(options.leadDays);
  const t: RainThresholds = {
    minProbability: clampThreshold(
      options.thresholds?.minProbability,
      DEFAULT_RAIN_THRESHOLDS.minProbability,
    ),
    minMm: clampThreshold(options.thresholds?.minMm, DEFAULT_RAIN_THRESHOLDS.minMm),
  };
  const base = {
    checkOn: minusDays(matchDate, lead.weatherCheck),
    decideOn: minusDays(matchDate, lead.weatherDecision),
  };
  const make = (verdict: RainVerdict): RainDecision => ({
    verdict,
    evaluateDayChange: verdict === "valuta-cambio-giorno",
    ...base,
  });

  if ((options.surface ?? DERVIO_SURFACE) === "synthetic") return make("non-erba");
  if (!forecast || forecast.date !== matchDate) return make("previsione-mancante");

  const p = forecast.precipitationProbability;
  const mm = forecast.precipitationMm;
  const hasP = typeof p === "number" && Number.isFinite(p);
  const hasMm = typeof mm === "number" && Number.isFinite(mm);
  if (!hasP && !hasMm) return make("previsione-mancante");
  const rain = (hasP && p >= t.minProbability) || (hasMm && mm >= t.minMm);
  return make(rain ? "valuta-cambio-giorno" : "nessuna-pioggia");
}
