/**
 * "Storia dei calciatori" on the server (r131). Same gate as /segreteria/persone (work area
 * `persone`: Direzione and Segreteria); every call uses the caller's own Supabase session, so the
 * r131 row-level security (DIRECTION / SECRETARIAT of the organization) applies on top of it.
 * Reads the two tables and computes the views here: the browser renders names already reduced
 * to "Nome C." plus the birth year (the lower-case search key with the surname is only matched,
 * never shown, and reaches only Direzione/Segreteria, who already see full names in /segreteria/persone).
 * Import goes only through scd_figc_history_import (audited).
 * Engines: PERSONE (retention and recovery) and TEMPO (no manual reconciliation of the portal).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { workAreaView, type WorkAreaGate } from "./access";
import { sessionView } from "./auth.functions";
import { MAX_EXPORT_BYTES, computeHistory, parseExportFile, type HistoryCareer, type HistoryRoster, type HistoryView, type Sector } from "./figc-history";
import { stagingPreviewEnabled } from "./impianti-access";
import { serverSupabase } from "./supabase.server";

export interface FigcHistoryData {
  gate: WorkAreaGate;
  /** False when the server has no Supabase keys or the caller has no organization. */
  connected: boolean;
  /** False while r131 is not applied (tables missing): the page says "in preparazione". */
  ready: boolean;
  canImport: boolean;
  /** Latest read_at of the stored rows (ISO), null when nothing was loaded yet. */
  lastReadAt: string | null;
  view: HistoryView | null;
  error: string | null;
}

export interface ImportOutcome {
  ok: boolean;
  message: string;
  counts?: { roster: number; career: number; linked: number };
}

/** Gate + organization of the caller (same rule as people.functions). */
async function context() {
  const s = await sessionView();
  const roles = s.user ? new Set(s.roles) : null;
  const gate = workAreaView("persone", { preview: stagingPreviewEnabled(process.env, import.meta.env.PROD), sessionRoles: roles });
  const org = s.memberships[0] ?? null;
  const canImport = Boolean(roles && (roles.has("direzione") || roles.has("segreteria")) && org && ["DIRECTION", "SECRETARIAT"].includes(org.role));
  return { gate, org, canImport, sb: s.configured && s.user ? serverSupabase() : null };
}

type RosterDb = { season: string; matricola: string; sector: Sector; last_name: string; first_name: string; birth_year: number | null; read_at: string };
type CareerDb = {
  matricola: string;
  season: string;
  movement_code: string;
  movement_label: string;
  club_code: string;
  club_name: string;
  is_own_club: boolean;
  status_code: string | null;
  event_date: string | null;
  release_code: string | null;
  release_date: string | null;
  read_at: string;
};

const PAGE = 1000;
const MAX_PAGES = 25;

/** PostgREST returns at most ~1000 rows per call: read in pages (bounded). */
async function readAll<T>(page: (from: number, to: number) => PromiseLike<{ data: unknown; error: { code?: string; message: string } | null }>): Promise<{ rows: T[]; error: { code?: string; message: string } | null }> {
  const rows: T[] = [];
  for (let i = 0; i < MAX_PAGES; i++) {
    const { data, error } = await page(i * PAGE, i * PAGE + PAGE - 1);
    if (error) return { rows, error };
    const chunk = (data ?? []) as T[];
    rows.push(...chunk);
    if (chunk.length < PAGE) break;
  }
  return { rows, error: null };
}

const missingTable = (e: { code?: string; message: string }) => e.code === "42P01" || e.code === "PGRST205" || /does not exist|schema cache/i.test(e.message);

export const getFigcHistory = createServerFn({ method: "GET" }).handler(async (): Promise<FigcHistoryData> => {
  const { gate, org, canImport, sb } = await context();
  const base: FigcHistoryData = { gate, connected: false, ready: false, canImport: false, lastReadAt: null, view: null, error: null };
  if (gate.view !== "page" || !sb || !org) return base;
  const orgId = org.organizationId;
  const [roster, career] = await Promise.all([
    readAll<RosterDb>((from, to) =>
      sb.from("scd_figc_roster").select("season,matricola,sector,last_name,first_name,birth_year,read_at").eq("organization_id", orgId).order("id").range(from, to),
    ),
    readAll<CareerDb>((from, to) =>
      sb
        .from("scd_figc_career")
        .select("matricola,season,movement_code,movement_label,club_code,club_name,is_own_club,status_code,event_date,release_code,release_date,read_at")
        .eq("organization_id", orgId)
        .order("id")
        .range(from, to),
    ),
  ]);
  const err = roster.error ?? career.error;
  if (err) {
    if (missingTable(err)) return { ...base, connected: true, canImport, error: null };
    return { ...base, connected: true, ready: true, canImport, error: "Lettura non riuscita dal database." };
  }
  const r: HistoryRoster[] = roster.rows.map((x) => ({ season: x.season, matricola: x.matricola, sector: x.sector, lastName: x.last_name, firstName: x.first_name, birthYear: x.birth_year }));
  const c: HistoryCareer[] = career.rows.map((x) => ({
    matricola: x.matricola,
    season: x.season,
    movementCode: x.movement_code,
    movementLabel: x.movement_label,
    clubCode: x.club_code,
    clubName: x.club_name,
    own: x.is_own_club,
    statusCode: x.status_code,
    eventDate: x.event_date,
    releaseCode: x.release_code,
    releaseDate: x.release_date,
  }));
  const reads = [...roster.rows, ...career.rows].map((x) => x.read_at).sort();
  return {
    ...base,
    connected: true,
    ready: true,
    canImport,
    lastReadAt: reads[reads.length - 1] ?? null,
    view: r.length > 0 || c.length > 0 ? computeHistory(r, c) : null,
  };
});

function explain(error: { code?: string; message: string }): string {
  if (error.code === "42501" || /not allowed/i.test(error.message)) return "Solo Direzione e Segreteria possono caricare la storia FIGC.";
  if (missingTable(error) || error.code === "PGRST202" || /function .* does not exist/i.test(error.message)) return "Funzione in preparazione: la Direzione deve ancora attivare la storia FIGC nel database.";
  if (/too many rows/i.test(error.message)) return "Il file ha troppe righe: dividilo per settore.";
  if (/invalid/i.test(error.message)) return "Il database ha rifiutato alcune righe del file: rifai l'esportazione dal portale.";
  return "Caricamento non riuscito, riprova.";
}

/** Upload of the export file (JSON text): validated here with the same schema, then the audited r131 function. */
export const importFigcHistory = createServerFn({ method: "POST" })
  .inputValidator((d: { text: string }) => z.object({ text: z.string().min(2).max(MAX_EXPORT_BYTES) }).parse(d))
  .handler(async ({ data }): Promise<ImportOutcome> => {
    const { gate, org, canImport, sb } = await context();
    if (gate.view !== "page" || !sb || !org) return { ok: false, message: "Accesso non valido." };
    if (!canImport) return { ok: false, message: "Solo Direzione e Segreteria possono caricare la storia FIGC." };
    const parsed = parseExportFile(data.text);
    if (!parsed.ok) return { ok: false, message: parsed.error };
    const p = parsed.data;
    if (p.roster.length === 0 && p.career.length === 0) return { ok: false, message: "Il file non contiene atleti." };
    const { data: out, error } = await sb.rpc("scd_figc_history_import", {
      p_organization_id: org.organizationId,
      p_read_at: p.readAt,
      p_roster: p.roster,
      p_career: p.career,
    });
    if (error) return { ok: false, message: explain(error) };
    const counts = (out ?? {}) as { roster?: number; career?: number; linked?: number };
    const n = { roster: counts.roster ?? 0, career: counts.career ?? 0, linked: counts.linked ?? 0 };
    const skipped = p.skipped > 0 ? ` ${p.skipped} righe non leggibili sono state saltate.` : "";
    return { ok: true, message: `Caricati ${n.roster} righe di tabulato e ${n.career} movimenti; ${n.linked} atleti collegati all'anagrafica.${skipped}`, counts: n };
  });
