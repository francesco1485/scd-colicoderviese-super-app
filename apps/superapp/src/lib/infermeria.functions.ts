/**
 * Infermeria on the server. Gate: work area "infermeria" (registry roles responsabile-infermeria and Direzione),
 * then the database (r136 scd_health_staff) decides again on every read and write. Fail-closed, unknown never zero:
 * - while r136 is not applied the new sections answer engine "not-applied" and the page says
 *   "Funzione in preparazione: serve applicare r136"; the certificate board falls back to the r66 register, which
 *   the database opens only to Direzione and Segreteria;
 * - the database answering null (no infermeria access) is "denied": values stay null, never 0;
 * - any other failure is "error" ("Lettura non riuscita, riprova");
 * - no health value is ever logged, echoed in an error or cached: errors become fixed Italian sentences.
 * The injuries register is deferred until the consent design (UD-043): nothing here reads or writes injuries.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { workAreaView, type WorkAreaGate } from "./access";
import { sessionView } from "./auth.functions";
import { toCertRow, type CertDbRow, type CertRow } from "./certificates";
import {
  SITES,
  aedProblem,
  isHealthSite,
  kitProblem,
  onePerAthlete,
  shortName,
  type AedRow,
  type HealthEngine,
  type HealthSite,
  type KitRow,
} from "./health-areas";
import { stagingPreviewEnabled } from "./impianti-access";
import { isMissingObjectError } from "./person-grants.server";
import { serverSupabase } from "./supabase.server";

export interface InfermeriaData {
  gate: WorkAreaGate;
  today: string;
  connected: boolean;
  /**
   * ok: rows read; denied: the database gives this caller no certificates (OWN_SITE grant, no access);
   * error: reading failed; unavailable: nothing read (no session, or r136 missing and r66 refused).
   */
  certs: { state: "ok" | "denied" | "error" | "unavailable"; source: "r136" | "r66" | null; rows: CertRow[] };
  engine: HealthEngine;
  board: {
    canWrite: boolean;
    canWriteSites: HealthSite[];
    seesCertificates: boolean;
    sites: HealthSite[];
    kits: KitRow[];
    aeds: AedRow[];
  } | null;
}

export interface SaveOutcome {
  ok: boolean;
  message: string;
}

function todayRome(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

async function context() {
  const s = await sessionView();
  const roles = s.user ? new Set(s.roles) : null;
  const gate = workAreaView("infermeria", { preview: stagingPreviewEnabled(process.env, import.meta.env.PROD), sessionRoles: roles });
  const org = s.memberships[0] ?? null;
  return { gate, org, sb: s.configured && s.user ? serverSupabase() : null };
}

const str = (v: unknown): string | null => (typeof v === "string" ? v : null);

function parseBoard(raw: unknown): InfermeriaData["board"] {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const arr = (k: string) => (Array.isArray(r[k]) ? (r[k] as Record<string, unknown>[]) : []);
  return {
    canWrite: r["canWrite"] === true,
    canWriteSites: (Array.isArray(r["canWriteSites"]) ? (r["canWriteSites"] as unknown[]) : []).filter(isHealthSite),
    seesCertificates: r["seesCertificates"] === true,
    sites: (Array.isArray(r["sites"]) ? (r["sites"] as unknown[]) : []).filter(isHealthSite),
    kits: arr("kits").flatMap((k) => {
      const site = k["site"];
      if (!isHealthSite(site)) return [];
      return [{ id: String(k["id"]), site, kit: str(k["kit"]) ?? "—", lastCheck: str(k["last_check"]), nextCheck: str(k["next_check"]) }];
    }),
    aeds: arr("aeds").flatMap((d) => {
      const site = d["site"];
      if (!isHealthSite(site)) return [];
      return [{ id: String(d["id"]), site, device: str(d["device"]) ?? "—", padsExpiry: str(d["pads_expires_on"]), batteryExpiry: str(d["battery_expires_on"]), lastCheck: str(d["last_check"]) }];
    }),
  };
}

export const getInfermeria = createServerFn({ method: "GET" }).handler(async (): Promise<InfermeriaData> => {
  const today = todayRome();
  const { gate, org, sb } = await context();
  const base: InfermeriaData = { gate, today, connected: false, certs: { state: "unavailable", source: null, rows: [] }, engine: "unknown", board: null };
  // Closed gate or no verified session: nothing is read (the staging preview shows the empty frame only).
  if (gate.view !== "page" || !sb || !org) return base;

  const [board, certs136] = await Promise.all([
    sb.rpc("scd_infermeria_board", { p_organization_id: org.organizationId }),
    sb.rpc("scd_infermeria_certificate_board", { p_organization_id: org.organizationId }),
  ]);

  const engine: HealthEngine = board.error
    ? isMissingObjectError(board.error) ? "not-applied" : "error"
    : board.data === null || board.data === undefined ? "denied" : "applied";
  const parsed = engine === "applied" ? parseBoard(board.data) : null;
  const toRows = (data: unknown) => onePerAthlete(((data ?? []) as CertDbRow[]).map(toCertRow).map((r) => ({ ...r, name: shortName(r.name) })));

  let certs: InfermeriaData["certs"] = { state: "unavailable", source: null, rows: [] };
  if (!certs136.error) {
    // The r136 board answers an empty list to whoever is not whole-club health staff: that is "denied", not zero.
    certs = engine === "applied" && parsed?.seesCertificates
      ? { state: "ok", source: "r136", rows: toRows(certs136.data) }
      : engine === "error" ? { state: "error", source: null, rows: [] } : { state: "denied", source: null, rows: [] };
  } else if (isMissingObjectError(certs136.error)) {
    // r136 not applied: the r66 register (Direzione / Segreteria only in the database).
    const r66 = await sb.rpc("scd_certificate_register", { p_organization_id: org.organizationId });
    if (!r66.error) certs = { state: "ok", source: "r66", rows: toRows(r66.data) };
  } else {
    certs = { state: "error", source: null, rows: [] };
  }

  return { ...base, connected: true, certs, engine, board: parsed };
});

/** Fixed sentences: a database message is never shown (it could carry values). */
function explain(error: { code?: string; message: string }): string {
  if (isMissingObjectError(error)) return "Funzione in preparazione: serve applicare r136";
  if (error.code === "42501" || /forbidden/.test(error.message)) return "Non hai l'abilitazione per modificare questa parte dell'infermeria.";
  if (/invalid entry/.test(error.message)) return "Controlla i campi: qualcosa non è nell'elenco.";
  return "Salvataggio non riuscito, riprova.";
}

const ISO = /^(\d{4}-\d{2}-\d{2})?$/;
const enumOf = <T extends { id: string }>(xs: readonly T[]) => z.enum(xs.map((x) => x.id) as [string, ...string[]]);

const KitInput = z.object({
  site: enumOf(SITES),
  kit: z.string().min(2).max(60),
  lastCheck: z.string().regex(ISO),
  nextCheck: z.string().regex(ISO),
});

export const saveKit = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof KitInput>) => KitInput.parse(d))
  .handler(async ({ data }): Promise<SaveOutcome> => {
    const { gate, org, sb } = await context();
    if (gate.view !== "page" || !sb || !org) return { ok: false, message: "Entra con un account dello staff sanitario." };
    const invalid = kitProblem(data);
    if (invalid) return { ok: false, message: invalid };
    const { error } = await sb.rpc("scd_infermeria_kit_save", {
      p_organization_id: org.organizationId,
      p_site: data.site,
      p_kit: data.kit.trim(),
      p_last_check: data.lastCheck || null,
      p_next_check: data.nextCheck || null,
    });
    if (error) return { ok: false, message: explain(error) };
    return { ok: true, message: "Controllo salvato." };
  });

const AedInput = z.object({
  site: enumOf(SITES),
  device: z.string().min(2).max(60),
  padsExpiry: z.string().regex(ISO),
  batteryExpiry: z.string().regex(ISO),
  lastCheck: z.string().regex(ISO),
});

export const saveAed = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof AedInput>) => AedInput.parse(d))
  .handler(async ({ data }): Promise<SaveOutcome> => {
    const { gate, org, sb } = await context();
    if (gate.view !== "page" || !sb || !org) return { ok: false, message: "Entra con un account dello staff sanitario." };
    const invalid = aedProblem(data);
    if (invalid) return { ok: false, message: invalid };
    const { error } = await sb.rpc("scd_infermeria_aed_save", {
      p_organization_id: org.organizationId,
      p_site: data.site,
      p_device: data.device.trim(),
      p_pads_expires_on: data.padsExpiry || null,
      p_battery_expires_on: data.batteryExpiry || null,
      p_last_check: data.lastCheck || null,
    });
    if (error) return { ok: false, message: explain(error) };
    return { ok: true, message: "Defibrillatore salvato." };
  });
