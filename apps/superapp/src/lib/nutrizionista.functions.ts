/**
 * Nutrizionista on the server. Gate: work area "nutrizionista" (nutrizionista, Direzione, famiglia, atleta), then:
 * - staff view (nutrizionista or Direzione): open consultation requests from r136 scd_nutrition_requests (the database
 *   checks the nutrizione access again);
 * - family view: general guidance for the age groups of the caller's OWN circle only (scd_my_family, scoped to
 *   auth.uid() in the database), and the consultation request (r136 scd_nutrition_request → existing work queue).
 * Requests are RISERVATO and excluded from the office work queue: only the nutritionist (and Direzione) reads them and
 * the nutritionist calls the parent back.
 * Nothing personal is stored: no plan, no diet, no health detail. Unknown or failing states are shown as such:
 * denied (null from the database) and error are never shown as zero.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { workAreaView, type WorkAreaGate } from "./access";
import { sessionView } from "./auth.functions";
import {
  asConsultOutcome,
  familyChildren,
  nutritionView,
  type ConsultOutcome,
  type FamilyChild,
  type HealthEngine,
  type NutritionRequestRow,
  type NutritionView,
} from "./health-areas";
import { stagingPreviewEnabled } from "./impianti-access";
import { isMissingObjectError } from "./person-grants.server";
import { serverSupabase } from "./supabase.server";

export interface NutritionData {
  gate: WorkAreaGate;
  view: NutritionView;
  connected: boolean;
  /** Family view: the caller's own children only. */
  children: FamilyChild[];
  familyState: "ok" | "error" | "none";
  /** Staff view. */
  engine: HealthEngine;
  canWrite: boolean;
  requests: NutritionRequestRow[];
}

async function context() {
  const s = await sessionView();
  const roles = s.user ? new Set(s.roles) : null;
  const gate = workAreaView("nutrizionista", { preview: stagingPreviewEnabled(process.env, import.meta.env.PROD), sessionRoles: roles });
  const org = s.memberships[0] ?? null;
  return { gate, roles, org, sb: s.configured && s.user ? serverSupabase() : null };
}

type FamilyDbRow = {
  person_id: string;
  display_name: string | null;
  relationship: string;
  birth_year: number | null;
  is_minor: boolean | null;
  team_codes: string[] | null;
};

const OPEN = new Set(["NEW", "IN_PROGRESS", "NEEDS_INFO", "SNOOZED"]);

function parseRequests(raw: unknown): { canWrite: boolean; items: NutritionRequestRow[] } {
  if (!raw || typeof raw !== "object") return { canWrite: false, items: [] };
  const r = raw as Record<string, unknown>;
  const items = (Array.isArray(r["items"]) ? (r["items"] as Record<string, unknown>[]) : []).flatMap((x) => {
    const status = String(x["status"] ?? "");
    if (!OPEN.has(status)) return [];
    return [{
      id: String(x["id"]),
      title: String(x["title"] ?? ""),
      status: status as NutritionRequestRow["status"],
      createdAt: String(x["created_at"] ?? ""),
      contact: typeof x["contact"] === "string" ? x["contact"] : null,
      mine: x["mine"] === true,
    }];
  });
  return { canWrite: r["canWrite"] === true, items };
}

export const getNutrition = createServerFn({ method: "GET" }).handler(async (): Promise<NutritionData> => {
  const { gate, roles, org, sb } = await context();
  const view: NutritionView = gate.preview ? "staff" : nutritionView(roles);
  const base: NutritionData = { gate, view, connected: false, children: [], familyState: "none", engine: "unknown", canWrite: false, requests: [] };
  if (gate.view !== "page" || !sb || !org || view === "access") return base;

  if (view === "staff") {
    const { data, error } = await sb.rpc("scd_nutrition_requests", { p_organization_id: org.organizationId });
    if (error) return { ...base, connected: true, engine: isMissingObjectError(error) ? "not-applied" : "error" };
    // Null = the database gives this caller no nutrition access: "denied", never "0 requests".
    if (data === null || data === undefined) return { ...base, connected: true, engine: "denied" };
    const parsed = parseRequests(data);
    return { ...base, connected: true, engine: "applied", canWrite: parsed.canWrite, requests: parsed.items };
  }

  // Family: scd_my_family returns only the caller's own circle (the database scopes it to auth.uid()).
  const { data, error } = await sb.rpc("scd_my_family", { p_organization_id: org.organizationId });
  if (error) return { ...base, connected: true, familyState: "error" };
  const children = familyChildren(
    ((data ?? []) as FamilyDbRow[]).map((m) => ({
      personId: m.person_id,
      displayName: m.display_name ?? "",
      relationship: m.relationship,
      birthYear: m.birth_year,
      minor: m.is_minor,
      teamCodes: m.team_codes ?? [],
    })),
  );
  return { ...base, connected: true, familyState: "ok", children };
});

export const requestNutritionConsult = createServerFn({ method: "POST" })
  .inputValidator((d: { personId: string }) => z.object({ personId: z.string().uuid() }).parse(d))
  .handler(async ({ data }): Promise<{ outcome: ConsultOutcome }> => {
    const { gate, org, sb } = await context();
    if (!sb || !org) return { outcome: "NOT_SIGNED_IN" };
    if (gate.view !== "page" || gate.preview) return { outcome: "NOT_ALLOWED" };
    const { data: res, error } = await sb.rpc("scd_nutrition_request", { p_organization_id: org.organizationId, p_person_id: data.personId });
    if (error) return { outcome: isMissingObjectError(error) ? "NOT_APPLIED" : "ERROR" };
    return { outcome: asConsultOutcome(res) };
  });

export const updateNutritionRequest = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; action: "take" | "close" }) => z.object({ id: z.string().uuid(), action: z.enum(["take", "close"]) }).parse(d))
  .handler(async ({ data }): Promise<{ ok: boolean; message: string }> => {
    const { gate, roles, org, sb } = await context();
    if (gate.view !== "page" || !sb || !org || nutritionView(roles) !== "staff") return { ok: false, message: "Solo la nutrizionista e la Direzione." };
    const { data: done, error } = await sb.rpc("scd_nutrition_request_update", { p_organization_id: org.organizationId, p_id: data.id, p_action: data.action });
    if (error) return { ok: false, message: isMissingObjectError(error) ? "Funzione in preparazione: serve applicare r136" : error.code === "42501" ? "Non hai l'abilitazione per gestire le richieste." : "Operazione non riuscita, riprova." };
    if (done !== true) return { ok: false, message: "Richiesta già chiusa o non trovata: ricarica la pagina." };
    return { ok: true, message: data.action === "take" ? "Presa in carico." : "Richiesta chiusa." };
  });
