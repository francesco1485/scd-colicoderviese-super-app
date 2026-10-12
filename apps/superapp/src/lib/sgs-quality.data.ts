/**
 * Server-side data for Organigramma e 3° livello SGS (moved out of sgs-quality.functions.ts in launch L1).
 * Who covers what is private club data read from env SCD_SGS_STATUS_JSON and returned only when the gate opens.
 */
import { workAreaView } from "./access";
import { stagingPreviewEnabled } from "./impianti-access";
import { SGS_RULES, emptyStatus, parseStatus, type Level } from "./sgs-quality";
import type { OrganigrammaData } from "./sgs-quality.functions";

export function organigrammaData(env: Readonly<Record<string, string | undefined>>, isProd: boolean, roles: ReadonlySet<string> | null = null): OrganigrammaData {
  const gate = workAreaView("organigramma", { preview: stagingPreviewEnabled(env, isProd), sessionRoles: roles });
  const target = Math.min(5, Math.max(1, SGS_RULES.targetLevel)) as Level;
  if (gate.view !== "page") return { gate, status: emptyStatus(), level: target, statusConfigured: false };
  const raw = env["SCD_SGS_STATUS_JSON"];
  const status = parseStatus(raw);
  const declared = status.declaration.level;
  const level = (declared && declared >= 1 && declared <= 5 ? declared : target) as Level;
  return { gate, status, level, statusConfigured: Boolean(raw && raw.trim()) };
}
