/**
 * Vetrina richieste on the server (UD-163, migration r139 STAGED: NOT APPLIED). Every call uses the caller's own
 * Supabase session (publishable key + cookies): the r139 functions check positions on their own (chi-fa-cosa
 * deciders, UD-156 Dervio rule, Tesoreria only for payments), nothing here trusts the browser for permissions.
 *
 * Fail closed: until r139 answers the probe (registry-live.server.ts r139Live) nothing is read or written; reads say
 * "Funzione in preparazione", writes answer a plain message, never a fake "saved". Nothing is sent to anybody: notices
 * stay in the app, the reply to the external party is written by a person. Contacts are read one request at a time,
 * logged by the database (CONTATTO_LETTO), never kept in the page data.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { workAreaView, type WorkAreaGate } from "./access";
import { sessionView } from "./auth.functions";
import { stagingPreviewEnabled } from "./impianti-access";
import {
  INTAKE_ACTIONS,
  INTAKE_AREAS,
  INTAKE_KINDS,
  INTAKE_PHASES,
  INTAKE_SITES,
  PAYMENT_STATUSES,
  intakeError,
  parseIntakeNotices,
  parseIntakeRows,
  paymentsToFollow,
  phaseCounts,
  statusesOf,
  type IntakeNotice,
  type IntakePhase,
  type IntakeRow,
} from "./intake-kinds";
import { intakeFormUrl } from "./intake-links";
import { r139Live } from "./registry-live.server";
import { serverSupabase } from "./supabase.server";

export const INTAKE_OFF = "Funzione in preparazione: la Direzione deve ancora attivare la Vetrina richieste nel database (r139).";
export const INTAKE_NO_SESSION = "Entra con il tuo account del club per vedere le richieste.";
export const INTAKE_DENIED = "Nessun tipo di richiesta è affidato al tuo ruolo.";
export const INTAKE_READ_FAILED = "Lettura non riuscita, riprova più tardi.";

async function context() {
  const s = await sessionView();
  const roles = s.user ? new Set(s.roles) : null;
  const org = s.memberships[0] ?? null;
  return { s, roles, org, sb: s.configured && s.user && org ? serverSupabase() : null };
}

/* ------------------------------------------------------------------ catalogue page */

export const intakeFiltersSchema = z.object({
  kind: z.enum(INTAKE_KINDS).optional(),
  phase: z.enum(INTAKE_PHASES).optional(),
  area: z.enum(INTAKE_AREAS).optional(),
  site: z.enum(INTAKE_SITES).optional(),
});
export type IntakeFilters = z.infer<typeof intakeFiltersSchema>;

export interface IntakeDesk {
  gate: WorkAreaGate;
  /** False without Supabase keys, session or organization. */
  connected: boolean;
  /** False while r139 is not applied (probe), or when the read failed. */
  ready: boolean;
  /** Rows the caller may see; null = not read (never an empty list pretending to be zero). */
  rows: IntakeRow[] | null;
  /** The caller holds the position tesoreria (the only one who records payments). */
  canPay: boolean;
  notices: IntakeNotice[];
  /** Plain Italian reason when rows is null. */
  message: string | null;
  /** The public Tally form exists in config (otherwise links say «Modulo in preparazione»). */
  formReady: boolean;
  filters: IntakeFilters;
}

export function emptyIntakeDesk(gate: WorkAreaGate, filters: IntakeFilters = {}): IntakeDesk {
  return { gate, connected: false, ready: false, rows: null, canPay: false, notices: [], message: null, formReady: intakeFormUrl() !== null, filters };
}

/** Database filters of a page filter set (phase -> statuses). */
export function dbFilters(f: IntakeFilters): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (f.kind) out["kind"] = f.kind;
  if (f.area) out["area"] = f.area;
  if (f.site) out["site"] = f.site;
  if (f.phase) out["status"] = statusesOf(f.phase as IntakePhase);
  return out;
}

export const getIntakeDesk = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => intakeFiltersSchema.catch({}).parse(raw ?? {}))
  .handler(async ({ data: filters }): Promise<IntakeDesk> => {
    const { s, roles, org, sb } = await context();
    const gate = workAreaView("intake", { preview: stagingPreviewEnabled(process.env, import.meta.env.PROD), sessionRoles: roles });
    const base = emptyIntakeDesk(gate, filters);
    if (gate.view !== "page") return base;
    if (!sb || !org || !s.user) return { ...base, message: INTAKE_NO_SESSION };
    if (!(await r139Live(sb))) return { ...base, connected: true, message: INTAKE_OFF };
    const orgId = org.organizationId;
    const [board, notices] = await Promise.all([
      sb.rpc("scd_intake_board", { p_organization_id: orgId, p_filters: dbFilters(filters) }),
      sb.rpc("scd_intake_notices", { p_organization_id: orgId }),
    ]);
    if (board.error) {
      const code = (board.error as { code?: string }).code ?? "unknown";
      if (code !== "42501") console.warn(`[intake] scd_intake_board non riuscita: codice ${code}`);
      return { ...base, connected: true, message: code === "42501" ? INTAKE_DENIED : INTAKE_READ_FAILED };
    }
    const b = (board.data ?? {}) as { rows?: unknown; canPay?: unknown };
    return {
      ...base,
      connected: true,
      ready: true,
      rows: parseIntakeRows(b.rows),
      canPay: b.canPay === true,
      notices: notices.error ? [] : parseIntakeNotices(notices.data).slice(0, 12),
    };
  });

/* ------------------------------------------------------------------ block on /gestionale */

export type IntakeSummary =
  /** No session or no part in the catalogue: the block shows the entry only. */
  | { state: "none"; formReady: boolean }
  /** r139 not applied or not readable: "in preparazione". */
  | { state: "off"; formReady: boolean }
  /** r139 live but the read failed (not a permission problem): "Lettura non riuscita". */
  | { state: "error"; formReady: boolean }
  | {
      state: "ok";
      formReady: boolean;
      counts: Record<IntakePhase, number>;
      payments: number;
      canPay: boolean;
      notices: IntakeNotice[];
    };

export const getIntakeSummary = createServerFn({ method: "GET" }).handler(async (): Promise<IntakeSummary> => {
  const formReady = intakeFormUrl() !== null;
  const { roles, org, sb } = await context();
  if (!roles || !org || !sb) return { state: "none", formReady };
  if (!(await r139Live(sb))) return { state: "off", formReady };
  const [board, notices] = await Promise.all([
    sb.rpc("scd_intake_board", { p_organization_id: org.organizationId, p_filters: {} }),
    sb.rpc("scd_intake_notices", { p_organization_id: org.organizationId }),
  ]);
  if (board.error) {
    const code = (board.error as { code?: string }).code ?? "unknown";
    if (code === "42501") return { state: "none", formReady };
    console.warn(`[intake] scd_intake_board non riuscita: codice ${code}`);
    return { state: "error", formReady };
  }
  const b = (board.data ?? {}) as { rows?: unknown; canPay?: unknown };
  const rows = parseIntakeRows(b.rows);
  return {
    state: "ok",
    formReady,
    counts: phaseCounts(rows)!,
    payments: paymentsToFollow(rows)!,
    canPay: b.canPay === true,
    notices: notices.error ? [] : parseIntakeNotices(notices.data).slice(0, 5),
  };
});

/* ------------------------------------------------------------------ writes */

export interface IntakeOutcome {
  ok: boolean;
  message: string;
}

const UUID = z.string().uuid();

const decideSchema = z.object({
  id: UUID,
  action: z.enum(INTAKE_ACTIONS),
  note: z.string().max(400).nullable().optional(),
  value: z.string().max(60).nullable().optional(),
});

const DONE: Readonly<Record<(typeof INTAKE_ACTIONS)[number], string>> = {
  take: "Presa in valutazione.",
  accept: "Accettata: chi la gestisce e la Tesoreria la vedono nella Vetrina.",
  reject: "Segnata come non accolta. La risposta all'esterno la scrive una persona.",
  start: "In gestione.",
  close: "Chiusa.",
  cancel: "Annullata.",
  assign: "Assegnata.",
  reclassify: "Tipo cambiato.",
};

async function guarded<T>(fn: (orgId: string, sb: NonNullable<Awaited<ReturnType<typeof context>>["sb"]>) => Promise<T>, off: T, noSession: T): Promise<T> {
  const { org, sb } = await context();
  if (!sb || !org) return noSession;
  if (!(await r139Live(sb))) return off;
  return fn(org.organizationId, sb);
}

export const decideIntake = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => decideSchema.parse(raw))
  .handler(async ({ data }): Promise<IntakeOutcome> =>
    guarded(
      async (orgId, sb) => {
        const { data: out, error } = await sb.rpc("scd_intake_decide", {
          p_organization_id: orgId,
          p_request_id: data.id,
          p_action: data.action,
          p_note: data.note ?? null,
          p_value: data.value ?? null,
        });
        if (error) return { ok: false, message: intakeError(null) };
        const r = (out ?? {}) as { ok?: boolean; code?: string };
        return r.ok ? { ok: true, message: DONE[data.action] } : { ok: false, message: intakeError(r.code) };
      },
      { ok: false, message: INTAKE_OFF },
      { ok: false, message: INTAKE_NO_SESSION },
    ),
  );

const paymentSchema = z.object({
  id: UUID,
  status: z.enum(PAYMENT_STATUSES),
  amountCents: z.number().int().min(0).max(10_000_000).nullable(),
  link: z.string().max(300).nullable(),
});

export const setIntakePayment = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => paymentSchema.parse(raw))
  .handler(async ({ data }): Promise<IntakeOutcome> =>
    guarded(
      async (orgId, sb) => {
        const payload: Record<string, unknown> = { status: data.status };
        if (data.amountCents !== null) payload["amountCents"] = data.amountCents;
        if (data.link) payload["link"] = data.link;
        const { data: out, error } = await sb.rpc("scd_intake_payment_set", { p_organization_id: orgId, p_request_id: data.id, p: payload });
        if (error) return { ok: false, message: intakeError(null) };
        const r = (out ?? {}) as { ok?: boolean; code?: string };
        return r.ok ? { ok: true, message: "Pagamento registrato." } : { ok: false, message: intakeError(r.code) };
      },
      { ok: false, message: INTAKE_OFF },
      { ok: false, message: INTAKE_NO_SESSION },
    ),
  );

export type IntakeContactOutcome =
  | { ok: true; purged: true }
  | { ok: true; purged: false; contact: { orgName: string | null; name: string; role: string | null; email: string | null; phone: string | null; purgeAfter: string | null } }
  | { ok: false; message: string };

/** One contact, on demand, for who decides or prepares that request; the database logs the read. */
export const readIntakeContact = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => z.object({ id: UUID }).parse(raw))
  .handler(async ({ data }): Promise<IntakeContactOutcome> =>
    guarded<IntakeContactOutcome>(
      async (orgId, sb) => {
        const { data: out, error } = await sb.rpc("scd_intake_contact", { p_organization_id: orgId, p_request_id: data.id });
        if (error) return { ok: false, message: intakeError(null) };
        const r = (out ?? {}) as { ok?: boolean; code?: string; purged?: boolean; contact?: Record<string, unknown> };
        if (!r.ok) return { ok: false, message: intakeError(r.code) };
        if (r.purged || !r.contact) return { ok: true, purged: true };
        const s = (v: unknown) => (typeof v === "string" && v ? v : null);
        return {
          ok: true,
          purged: false,
          contact: {
            orgName: s(r.contact["orgName"]),
            name: s(r.contact["name"]) ?? "—",
            role: s(r.contact["role"]),
            email: s(r.contact["email"]),
            phone: s(r.contact["phone"]),
            purgeAfter: s(r.contact["purgeAfter"]),
          },
        };
      },
      { ok: false, message: INTAKE_OFF },
      { ok: false, message: INTAKE_NO_SESSION },
    ),
  );
