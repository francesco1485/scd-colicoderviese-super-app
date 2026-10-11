/**
 * Club rhythm rules decided by Direzione on 2026-10-11 (UD-031, UD-033).
 * Pure functions: no personal data is stored here. The engine only says *when*
 * something is due and *who* gets an in-app notice; the content of a document or
 * certificate is never part of a reminder.
 */

/* ------------------------------------------------- document reminders */

export type ReminderStage = "none" | "d30" | "d7" | "due" | "overdue";
export type Recipient = "person" | "guardian" | "segreteria";

export interface ReminderPlan {
  stage: ReminderStage;
  /** Days until expiry (negative when already expired). */
  daysLeft: number;
  /** Whether a notice must go out today. */
  sendToday: boolean;
  recipients: Recipient[];
}

/** Lead times in days before expiry, decided 2026-10-11. */
export const REMINDER_LEAD_DAYS = [30, 7] as const;
/** After expiry the reminder repeats every N days until the document is delivered. */
export const OVERDUE_REPEAT_DAYS = 7;

const DAY_MS = 86_400_000;

/** Calendar days between two ISO dates (YYYY-MM-DD), timezone-safe. */
export function daysUntil(todayIso: string, targetIso: string): number {
  const a = Date.parse(`${todayIso}T00:00:00Z`);
  const b = Date.parse(`${targetIso}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return Number.NaN;
  return Math.round((b - a) / DAY_MS);
}

/**
 * What to do today for one document.
 * - 30 and 7 days before: notice to the person (or the guardian for a minor);
 * - on the expiry day: also to the secretariat;
 * - afterwards: every 7 days to person/guardian and secretariat until delivered.
 * An unknown or invalid expiry date never produces a notice (UNKNOWN is not "expired").
 */
export function reminderPlan(input: {
  todayIso: string;
  expiryIso: string | null;
  delivered: boolean;
  minor: boolean;
}): ReminderPlan {
  const holder: Recipient = input.minor ? "guardian" : "person";
  if (input.delivered || !input.expiryIso) return { stage: "none", daysLeft: Number.NaN, sendToday: false, recipients: [] };
  const left = daysUntil(input.todayIso, input.expiryIso);
  if (Number.isNaN(left)) return { stage: "none", daysLeft: Number.NaN, sendToday: false, recipients: [] };

  if (left > REMINDER_LEAD_DAYS[0]) return { stage: "none", daysLeft: left, sendToday: false, recipients: [] };
  if (left > REMINDER_LEAD_DAYS[1]) return { stage: "d30", daysLeft: left, sendToday: left === REMINDER_LEAD_DAYS[0], recipients: [holder] };
  if (left > 0) return { stage: "d7", daysLeft: left, sendToday: left === REMINDER_LEAD_DAYS[1], recipients: [holder] };
  if (left === 0) return { stage: "due", daysLeft: 0, sendToday: true, recipients: [holder, "segreteria"] };
  return {
    stage: "overdue",
    daysLeft: left,
    sendToday: -left % OVERDUE_REPEAT_DAYS === 0,
    recipients: [holder, "segreteria"],
  };
}

/** Neutral wording: never mentions what the document contains (health data stays private). */
export function reminderText(plan: ReminderPlan, documentLabel: string): string | null {
  const label = documentLabel.trim() || "un documento";
  switch (plan.stage) {
    case "d30":
    case "d7":
      return `Promemoria: ${label} scade tra ${plan.daysLeft} giorni. Consegnalo in segreteria o caricalo dall'app.`;
    case "due":
      return `${label} scade oggi. Consegnalo in segreteria o caricalo dall'app.`;
    case "overdue":
      return `${label} è scaduto da ${-plan.daysLeft} giorni. Consegnalo in segreteria il prima possibile.`;
    default:
      return null;
  }
}

/* ----------------------------------------------------- weekly rhythm */

export type RhythmSlot = "settimana" | "podcast" | "eventi" | "libero";

/**
 * Weekly editorial rhythm (UD-031): Monday/Tuesday "La settimana ColicoDerviese",
 * Wednesday virtual podcast, Thursday/Friday events and promotions. Weekends are left
 * to the matches. Every slot is published only after one-click approval.
 */
export function rhythmSlot(isoDate: string): RhythmSlot {
  const t = Date.parse(`${isoDate}T12:00:00Z`);
  if (Number.isNaN(t)) return "libero";
  const dow = new Date(t).getUTCDay(); // 0 = Sunday
  if (dow === 1 || dow === 2) return "settimana";
  if (dow === 3) return "podcast";
  if (dow === 4 || dow === 5) return "eventi";
  return "libero";
}

export const RHYTHM_LABEL: Record<RhythmSlot, string> = {
  settimana: "La settimana ColicoDerviese",
  podcast: "Podcast SCD",
  eventi: "Eventi e iniziative",
  libero: "Spazio partite",
};

/** Posters requested by Club House or secretariat stay on the page for 7 days (UD-032). */
export const POSTER_VISIBLE_DAYS = 7;

export function posterVisible(todayIso: string, approvedIso: string | null): boolean {
  if (!approvedIso) return false;
  const age = daysUntil(approvedIso, todayIso);
  return Number.isFinite(age) && age >= 0 && age < POSTER_VISIBLE_DAYS;
}

/** Sky's match report keeps at most 3 photos (UD-029); athletes post at most 1 per match (UD-028). */
export const MATCH_REPORT_MAX_PHOTOS = 3;
export const ATHLETE_PHOTOS_PER_MATCH = 1;

export function canAddPhoto(role: "athlete" | "manager", alreadyUploaded: number): boolean {
  const max = role === "athlete" ? ATHLETE_PHOTOS_PER_MATCH : MATCH_REPORT_MAX_PHOTOS;
  return Number.isFinite(alreadyUploaded) && alreadyUploaded >= 0 && alreadyUploaded < max;
}
