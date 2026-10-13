/**
 * Presentation rules of "Si gioca questa settimana" (Direzione 13/10/2026 15:31: "manca di spinta e colore").
 * Pure functions on real calendar fields only: day chip (Oggi / Domani / weekday), home/away tone, competition
 * badge. Nothing is invented: an empty field gives no badge.
 */
export type DayTone = "today" | "tomorrow" | "day";

const DAY_FMT = new Intl.DateTimeFormat("it-IT", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
});

function addDaysIso(date: string, n: number): string | null {
  const t = Date.parse(`${date}T12:00:00Z`);
  return Number.isFinite(t)
    ? new Date(t + n * 86_400_000).toISOString().slice(0, 10)
    : null;
}

/** Day header: "Oggi" / "Domani" chip plus the full date; other days only the date. */
export function dayChip(
  date: string,
  today: string,
): { tone: DayTone; label: string; date: string } {
  const full = DAY_FMT.format(new Date(`${date}T12:00:00Z`));
  const dateLabel = full.charAt(0).toUpperCase() + full.slice(1);
  if (date === today) return { tone: "today", label: "Oggi", date: dateLabel };
  if (date === addDaysIso(today, 1))
    return { tone: "tomorrow", label: "Domani", date: dateLabel };
  const weekday = dateLabel.split(" ")[0] ?? dateLabel;
  return {
    tone: "day",
    label: weekday,
    date: dateLabel.slice(weekday.length).trim(),
  };
}

const COMPETITION: Readonly<Record<string, string>> = {
  CAMPIONATO: "Campionato",
  COPPA: "Coppa",
  TORNEO: "Torneo",
  AMICHEVOLE: "Amichevole",
};

/** Badge for the calendar competition field; null when the field is empty or unknown. */
export function competitionBadge(c: string | undefined): string | null {
  return (c && COMPETITION[c.trim().toUpperCase()]) || null;
}

/** Home/away colour key of a row: casa = club blue, fuori = light blue, unknown = neutral. */
export function sideTone(
  homeAway: "CASA" | "FUORI" | "",
): "home" | "away" | "none" {
  return homeAway === "CASA" ? "home" : homeAway === "FUORI" ? "away" : "none";
}

/** Short count line of a day ("3 gare · 2 in casa"), from the rows actually listed. */
export function dayCount(
  rows: ReadonlyArray<{ homeAway: "CASA" | "FUORI" | "" }>,
): string {
  const n = rows.length;
  const home = rows.filter((r) => r.homeAway === "CASA").length;
  const base = `${n} ${n === 1 ? "gara" : "gare"}`;
  return home > 0 ? `${base} · ${home} in casa` : base;
}
