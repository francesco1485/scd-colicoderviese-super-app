/**
 * Pulmini runs on the server: returned only when the work-area gate opens the page.
 * Source: env SCD_PULMINI_RUNS_JSON (copied from the Master Pulmini, no children's names).
 */
import { createServerFn } from "@tanstack/react-start";

import { workAreaView, type WorkAreaGate } from "./access";
import { sessionRoles, sessionView } from "./auth.functions";
import { stagingPreviewEnabled } from "./impianti-access";
import { isSignedInMember } from "./public-access";
import { parseRuns, serviceView, type PulminiRuns, type PulminoServiceRun } from "./pulmini-runs";

export interface PulminiRunsData extends PulminiRuns {
  gate: WorkAreaGate;
  configured: boolean;
}

export function pulminiRunsData(env: Readonly<Record<string, string | undefined>>, isProd: boolean, roles: ReadonlySet<string> | null = null): PulminiRunsData {
  const gate = workAreaView("pulmini", { preview: stagingPreviewEnabled(env, isProd), sessionRoles: roles });
  if (gate.view !== "page") return { gate, asOf: null, runs: [], configured: false };
  const raw = env["SCD_PULMINI_RUNS_JSON"];
  return { gate, ...parseRuns(raw), configured: Boolean(raw && raw.trim()) };
}

export const getPulminiRuns = createServerFn({ method: "GET" }).handler(async (): Promise<Omit<PulminiRunsData, "gate">> => {
  const { gate: _gate, ...rest } = pulminiRunsData(process.env, import.meta.env.PROD, await sessionRoles());
  return rest;
});

export interface PulminiService {
  state: "signed-out" | "not-configured" | "ok";
  asOf: string | null;
  runs: PulminoServiceRun[];
}

/** Base access (any signed-in account): the service view without names (serviceView). */
export function pulminiServiceFor(env: Readonly<Record<string, string | undefined>>, signedIn: boolean): PulminiService {
  if (!signedIn) return { state: "signed-out", asOf: null, runs: [] };
  const raw = env["SCD_PULMINI_RUNS_JSON"];
  if (!raw || !raw.trim()) return { state: "not-configured", asOf: null, runs: [] };
  const parsed = parseRuns(raw);
  return { state: "ok", asOf: parsed.asOf, runs: serviceView(parsed.runs) };
}

export const getPulminiService = createServerFn({ method: "GET" }).handler(async (): Promise<PulminiService> => {
  const s = await sessionView();
  return pulminiServiceFor(process.env, isSignedInMember(s));
});
