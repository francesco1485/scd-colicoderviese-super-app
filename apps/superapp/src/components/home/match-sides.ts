import type { WeekItem } from "@/lib/home-week";

/** Opponent name and which side is ours, from the calendar title "SCD – Avversario" / "Avversario – SCD". */
export function sides(item: WeekItem): { opponent: string; weHome: boolean } {
  const parts = item.title.split(/\s+[–-]\s+/);
  const weFirst = /\b(scd|colico)/i.test(parts[0] ?? "");
  const opponent = (weFirst ? parts[1] : parts[0]) ?? "";
  return {
    opponent: opponent.trim(),
    weHome: item.homeAway ? item.homeAway === "CASA" : weFirst,
  };
}
