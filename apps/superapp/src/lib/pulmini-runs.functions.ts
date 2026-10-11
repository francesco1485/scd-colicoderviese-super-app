/**
 * Pulmini runs on the server: returned only when the work-area gate opens the page.
 * Source: env SCD_PULMINI_RUNS_JSON (copied from the Master Pulmini, no children's names).
 */
import { createServerFn } from "@tanstack/react-start";

import { workAreaView, type WorkAreaGate } from "./access";
import { stagingPreviewEnabled } from "./impianti-access";
import { parseRuns, type PulminiRuns } from "./pulmini-runs";

export interface PulminiRunsData extends PulminiRuns {
  gate: WorkAreaGate;
  configured: boolean;
}

export function pulminiRunsData(env: Readonly<Record<string, string | undefined>>, isProd: boolean): PulminiRunsData {
  const gate = workAreaView("pulmini", { preview: stagingPreviewEnabled(env, isProd), sessionRoles: null });
  if (gate.view !== "page") return { gate, asOf: null, runs: [], configured: false };
  const raw = env["SCD_PULMINI_RUNS_JSON"];
  return { gate, ...parseRuns(raw), configured: Boolean(raw && raw.trim()) };
}

export const getPulminiRuns = createServerFn({ method: "GET" }).handler(async (): Promise<Omit<PulminiRunsData, "gate">> => {
  const { gate: _gate, ...rest } = pulminiRunsData(process.env, import.meta.env.PROD);
  return rest;
});
