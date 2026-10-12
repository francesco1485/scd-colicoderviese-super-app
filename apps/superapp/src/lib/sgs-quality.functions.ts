/**
 * Organigramma e 3° livello SGS: server-side gate and private club status.
 *
 * The public rules are bundled (config/sgs-quality-system.v1.json). Who covers
 * what is private club data: it is read on the server from env
 * SCD_SGS_STATUS_JSON (statuses, qualification codes and counts only, no names)
 * and returned only when the gate opens the page. No session or role is created.
 */
import { createServerFn } from "@tanstack/react-start";

import type { WorkAreaGate } from "./access";
import { sessionRoles } from "./auth.functions";
import type { ClubStatus, Level } from "./sgs-quality";

export interface OrganigrammaData {
  gate: WorkAreaGate;
  status: ClubStatus;
  /** Level the page evaluates: the declared level when known, otherwise the club target. */
  level: Level;
  /** True when a private status was configured on the server. */
  statusConfigured: boolean;
}

/**
 * Private status for the page. The route asks getWorkAreaGate first; this function re-checks the
 * gate on the server so the status never leaves it for a closed area.
 * The rules engine is loaded inside the handler (launch L1): the route loader runs in the main
 * client bundle and must not carry the full SGS rule set.
 */
export const getSgsStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<Omit<OrganigrammaData, "gate">> => {
    const { organigrammaData } = await import("./sgs-quality.data");
    const { gate: _gate, ...rest } = organigrammaData(process.env, import.meta.env.PROD, await sessionRoles());
    return rest;
  },
);
