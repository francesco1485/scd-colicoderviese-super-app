/**
 * Public training evening of the home (Francesco 15/10/2026 «allenamenti visibili a tutti» and 16/10/2026 07:18–07:20:
 * timetable of every team visible to everyone, Club House open Mon–Fri 17:00–21:00, minibus service; UD-140).
 * Only the timetable leaves the server: weekday, time, pitch and team label. No names, no rosters, no notes.
 * Pure functions on the weekly Quadro allenamenti (a weekly template: the coach's notice always wins).
 */
import { addDays, quadroDay, trainingRowsFor } from "./board-data";
import type { TrainingSlot } from "./public-snapshots";

export interface PublicTrainingRow {
  id: string;
  /** "17:30" */
  time: string;
  /** "19:00" or "" */
  end: string;
  /** "Campo 1" / "Campo 2" (centro sportivo di Colico) */
  field: string;
  /** Short team label from the quadro ("U15 + U12", "Prima Squadra"). */
  teams: string;
}

export interface PublicTrainingDay {
  /** Rome day YYYY-MM-DD of the evening shown. */
  date: string;
  rows: PublicTrainingRow[];
}

/** Club House opening during the training evenings, as stated by Francesco on 16/10/2026 07:20. */
export const CLUB_HOUSE_HOURS = { days: "Lunedì–venerdì", from: "17:00", to: "21:00" } as const;

/** Minibus zones of the club (Pulmini 1–4). The pulmino badges are internal graphics: never on public pages. */
export const PULMINO_ZONES = [
  { id: "lago", label: "Lago" },
  { id: "lecco", label: "Lecco" },
  { id: "valtellina", label: "Valtellina" },
  { id: "chiavenna", label: "Chiavenna" },
] as const;

/** The training evening to show: today if it is a training day with sessions, otherwise the next one within a week. */
export function publicTrainingDay(slots: readonly TrainingSlot[], today: string): PublicTrainingDay | null {
  for (let i = 0; i < 7; i++) {
    const date = addDays(today, i);
    if (!quadroDay(date)) continue;
    const rows = trainingRowsFor(date, slots).map((r) => ({
      id: r.id,
      time: r.time,
      end: r.end,
      field: r.field === "C1" ? "Campo 1" : "Campo 2",
      teams: r.teams,
    }));
    if (rows.length > 0) return { date, rows };
  }
  return null;
}
