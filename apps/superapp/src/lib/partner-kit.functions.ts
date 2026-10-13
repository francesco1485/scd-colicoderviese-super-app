/**
 * Server data of the partner kit pages (UD-109): the same gate as /crm (work area "crm", R20 roles or staging
 * preview), then only the rows of the week's official games for the calendar card. The full calendar payload never
 * reaches the browser from here: fixtures only (date, time, team label, opponent, home/away, venue), no notes, no
 * trainings, no people.
 */
import { createServerFn } from "@tanstack/react-start";

import { workAreaView, type WorkAreaGate } from "./access";
import { sessionRoles } from "./auth.functions";
import { romeParts } from "./home-week";
import { stagingPreviewEnabled } from "./impianti-access";
import { weekCalendarRows, type CalendarRow } from "./partner-kit";

export interface PartnerKitData {
  gate: WorkAreaGate;
  nowMs: number;
  today: string;
  calendar: {
    rows: CalendarRow[];
    sourceModifiedAt: string;
    origin: "mirror" | "stale" | "fallback";
  } | null;
}

export const getPartnerKitData = createServerFn({ method: "GET" }).handler(async (): Promise<PartnerKitData> => {
  const gate = workAreaView("crm", { preview: stagingPreviewEnabled(process.env, import.meta.env.PROD), sessionRoles: await sessionRoles() });
  const nowMs = Date.now();
  const at = romeParts(new Date(nowMs).toISOString());
  const today = at?.date ?? new Date(nowMs).toISOString().slice(0, 10);
  if (gate.view !== "page") return { gate, nowMs, today, calendar: null };
  try {
    const { getCalendar } = await import("./calendar-bridge.server");
    const r = await getCalendar();
    if (r.reason) console.warn(`[kit partner] calendario ${r.origin}: ${r.reason}`);
    return {
      gate,
      nowMs,
      today,
      calendar: { rows: weekCalendarRows(r.events, r.groups, today, at?.time ?? "00:00"), sourceModifiedAt: r.sourceModifiedAt, origin: r.origin },
    };
  } catch (e) {
    console.warn(`[kit partner] calendario non disponibile: ${e instanceof Error ? e.message : String(e)}`);
    return { gate, nowMs, today, calendar: null };
  }
});
