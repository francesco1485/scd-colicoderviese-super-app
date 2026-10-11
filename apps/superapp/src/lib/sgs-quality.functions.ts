/**
 * Organigramma e 3° livello SGS: server-side gate and private club status.
 *
 * The public rules are bundled (config/sgs-quality-system.v1.json). Who covers
 * what is private club data: it is read on the server from env
 * SCD_SGS_STATUS_JSON (statuses, qualification codes and counts only, no names)
 * and returned only when the gate opens the page. No session or role is created.
 */
import { createServerFn } from "@tanstack/react-start";

import { workAreaView, type WorkAreaGate } from "./access";
import { stagingPreviewEnabled } from "./impianti-access";
import { SGS_RULES, emptyStatus, parseStatus, type ClubStatus, type Level } from "./sgs-quality";

export interface OrganigrammaData {
  gate: WorkAreaGate;
  status: ClubStatus;
  /** Level the page evaluates: the declared level when known, otherwise the club target. */
  level: Level;
  /** True when a private status was configured on the server. */
  statusConfigured: boolean;
}

export function organigrammaData(env: Readonly<Record<string, string | undefined>>, isProd: boolean): OrganigrammaData {
  const gate = workAreaView("organigramma", { preview: stagingPreviewEnabled(env, isProd), sessionRoles: null });
  const target = Math.min(5, Math.max(1, SGS_RULES.targetLevel)) as Level;
  if (gate.view !== "page") return { gate, status: emptyStatus(), level: target, statusConfigured: false };
  const raw = env["SCD_SGS_STATUS_JSON"];
  const status = parseStatus(raw);
  const declared = status.declaration.level;
  const level = (declared && declared >= 1 && declared <= 5 ? declared : target) as Level;
  return { gate, status, level, statusConfigured: Boolean(raw && raw.trim()) };
}

/**
 * Private status for the page. The route asks getWorkAreaGate first; this function re-checks the
 * gate on the server so the status never leaves it for a closed area.
 */
export const getSgsStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<Omit<OrganigrammaData, "gate">> => {
    const { gate: _gate, ...rest } = organigrammaData(process.env, import.meta.env.PROD);
    return rest;
  },
);
