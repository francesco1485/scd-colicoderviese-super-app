/**
 * Section ids of the Impianti e Calendari view, kept apart from the view itself (launch L1, 2026-10-12):
 * the route's search validation runs in the main bundle, so it must not import the whole view
 * (field plans, calendar snapshot, styles). The view checks it uses exactly these ids.
 */
export const SECTION_IDS = ["quadro", "calendario", "squadra", "settore", "rotazione", "impianti", "responsabili", "dervio"] as const;
export type SectionId = (typeof SECTION_IDS)[number];

export function isSectionId(value: unknown): value is SectionId {
  return typeof value === "string" && (SECTION_IDS as readonly string[]).includes(value);
}
