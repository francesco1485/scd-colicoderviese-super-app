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
 * Engine: TEMPO (hours given back to Segreteria and Direzione: one computed plan and
 * checklist instead of manual tracking). Measured by: checklist items closed on time
 * (status "done" before due date) vs "overdue" per Dervio match.
 *
 * Every output is a DRAFT/PROPOSAL: nothing here sends notices, moves matches or writes data.
 * Team names only, never names of athletes.
 */

import { GROUP_LABEL, NOTICE_DAYS, daysBetween, minusDays } from "./rotation";

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

/** First Dervio match day (Saturday). */
export const DERVIO_START_DATE = "2026-10-24";

/** A home match from the Master Calendario (only the fields the planner needs). */
export interface DervioCandidate {
  id: string;
  /** Calendar group id (e.g. "u16", "2014"). Unknown groups are never eligible. */
  group: string;
  /** Local match day, ISO yyyy-mm-dd (Europe/Rome calendar date). */
  date: string;
  /** Kick-off "HH:MM" if known. */
  time?: string | null;
  /** True for home matches. Away matches are never eligible. */
  home: boolean;
}

export interface DervioPick {
  match: DervioCandidate;
  group: DervioGroup;
  /** Team name for display (team names only). */
  label: string;
}

export interface DervioWeek {
  /** Monday of the week (ISO). */
  weekStart: string;
  /** Sunday of the week (ISO). */
  weekEnd: string;
  pick: DervioPick | null;
  /** Why the week has no Dervio match. */
  skipReason: "no-eligible-home-match" | null;
}

export interface RotationOptions {
  /** First day that may host a Dervio match. Default {@link DERVIO_START_DATE}. */
  startDate?: string;
  /** Last day to plan (inclusive). Default: day of the last eligible candidate. */
  endDate?: string;
  /**
   * Group that played the last Dervio match before `startDate` (to resume the rotation).
   * Default null: the rotation starts from the youngest group.
   */
  lastGroup?: DervioGroup | null;
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

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

/** Sort key for a kick-off time; unknown times sort last within the day. */
function timeKey(t: string | null | undefined): string {
  return t && /^\d{1,2}:\d{2}$/.test(t.trim()) ? t.trim().padStart(5, "0") : "99:99";
}

/** Eligible candidates: home, known Dervio group, valid date, inside [start, end]. */
export function eligibleCandidates(
  candidates: readonly DervioCandidate[],
  startDate: string,
  endDate?: string,
): DervioCandidate[] {
  return candidates
    .filter(
      (c) =>
        c.home &&
        isDervioGroup(c.group) &&
        ISO_DAY.test(c.date) &&
        c.date >= startDate &&
        (endDate === undefined || c.date <= endDate),
    )
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        timeKey(a.time).localeCompare(timeKey(b.time)) ||
        a.id.localeCompare(b.id),
    );
}

/**
 * Picks the Dervio match of each week (round robin over {@link DERVIO_AGE_ORDER}).
 *
 * In each week, starting from the group after the last one that played at Dervio
 * (the youngest at the start), the first group in cyclic age order that has an eligible
 * home match that week plays; if it has more than one, the earliest one. Weeks with no
 * eligible match are returned with `pick: null` and are skipped by the rotation.
 */
export function planDervioRotation(
  candidates: readonly DervioCandidate[],
  options: RotationOptions = {},
): DervioWeek[] {
  const startDate = options.startDate ?? DERVIO_START_DATE;
  const eligible = eligibleCandidates(candidates, startDate, options.endDate);
  const endDate = options.endDate ?? eligible.at(-1)?.date;
  if (!endDate || endDate < startDate) return [];

  const byWeek = new Map<string, DervioCandidate[]>();
  for (const c of eligible) {
    const w = weekStartOf(c.date);
    const list = byWeek.get(w);
    if (list) list.push(c);
    else byWeek.set(w, [c]);
  }

  const n = DERVIO_AGE_ORDER.length;
  let pointer =
    options.lastGroup != null ? (DERVIO_AGE_ORDER.indexOf(options.lastGroup) + 1) % n : 0;
  const weeks: DervioWeek[] = [];
  for (let w = weekStartOf(startDate); w <= endDate; w = addDays(w, 7)) {
    const inWeek = byWeek.get(w) ?? [];
    let pick: DervioPick | null = null;
    for (let step = 0; step < n && !pick; step++) {
      const group = DERVIO_AGE_ORDER[(pointer + step) % n];
      if (group === undefined) continue;
      const match = inWeek.find((c) => c.group === group);
      if (match) {
        pick = { match, group, label: GROUP_LABEL[group] ?? group };
        pointer = (DERVIO_AGE_ORDER.indexOf(group) + 1) % n;
      }
    }
    weeks.push({
      weekStart: w,
      weekEnd: addDays(w, 6),
      pick,
      skipReason: pick ? null : "no-eligible-home-match",
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

export type PitchSurface = "grass" | "synthetic" | "unknown";

/**
 * Lead days before the match. `null` = deadline not decided: the item still appears,
 * with status "no-deadline" (never a guessed date).
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

export interface ChecklistInput {
  /** Match day (ISO). */
  matchDate: string;
  /** Today (Europe/Rome calendar date, ISO), injected. */
  today: string;
  /** Items already completed (from the gestionale). */
  done?: ReadonlySet<ChecklistItemId> | readonly ChecklistItemId[];
  /** Dervio pitch surface. Unknown keeps the weather items (fail-safe). */
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

/** Checklist with due dates and statuses for one Dervio match. */
export function dervioChecklist(input: ChecklistInput): ChecklistItem[] {
  const lead: ChecklistLeadDays = { ...DEFAULT_LEAD_DAYS, ...input.leadDays };
  const done = new Set<ChecklistItemId>(input.done ?? []);
  const grassOrUnknown = (input.surface ?? "grass") !== "synthetic";
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
 * Thresholds for "rain is forecast". PROPOSED defaults (not decided by the DG yet):
 * probability ≥ 50% or ≥ 1 mm.
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

/** Rain rule: forecast → "valuta cambio giorno" flag, decided the day before. */
export function rainDecision(
  matchDate: string,
  forecast: RainForecast | null | undefined,
  options: {
    surface?: PitchSurface;
    thresholds?: Partial<RainThresholds>;
    leadDays?: Partial<Pick<ChecklistLeadDays, "weatherCheck" | "weatherDecision">>;
  } = {},
): RainDecision {
  const lead = { ...DEFAULT_LEAD_DAYS, ...options.leadDays };
  const t = { ...DEFAULT_RAIN_THRESHOLDS, ...options.thresholds };
  const base = {
    checkOn: minusDays(matchDate, lead.weatherCheck),
    decideOn: minusDays(matchDate, lead.weatherDecision),
  };
  const make = (verdict: RainVerdict): RainDecision => ({
    verdict,
    evaluateDayChange: verdict === "valuta-cambio-giorno",
    ...base,
  });

  if (options.surface === "synthetic") return make("non-erba");
  if (!forecast || forecast.date !== matchDate) return make("previsione-mancante");

  const p = forecast.precipitationProbability;
  const mm = forecast.precipitationMm;
  const hasP = typeof p === "number" && Number.isFinite(p);
  const hasMm = typeof mm === "number" && Number.isFinite(mm);
  if (!hasP && !hasMm) return make("previsione-mancante");
  const rain = (hasP && p >= t.minProbability) || (hasMm && mm >= t.minMm);
  return make(rain ? "valuta-cambio-giorno" : "nessuna-pioggia");
}
