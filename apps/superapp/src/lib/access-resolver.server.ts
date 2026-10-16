/**
 * Server side of the access resolver (access-resolver.ts). Reads ONLY through the caller's own Supabase session
 * (publishable key + httpOnly cookies, src/lib/supabase.server.ts): every function used here is SECURITY DEFINER and
 * answers for auth.uid(), so nobody can ask about another person. No service-role key.
 *
 * Fail-closed everywhere: no session, no organisation, no verified identity, a missing function or any error → the
 * grants layer opens nothing and the old rule decides alone.
 *
 * Grants are read in one call with r113 `scd_my_section_access` (STAGED, NOT APPLIED). Until r113 is applied the gate
 * asks r100 `scd_can` twice for the one section it needs (any perimeter, then perimeter ALL only: a site value that no
 * grant holds makes OWN_SITE / OWN_TEAMS / OWN_CHILDREN / SELF false), and the navigation shows no grant-only entry.
 */
import { isMissingObjectError } from "./person-grants.server";
import {
  accessNavFor,
  identityFromFamily,
  probesFromRows,
  resolveWorkAreaGate,
  sectionForArea,
  NO_IDENTITY,
  EMPTY_NAV,
  type AccessNav,
  type FamilyRowFacts,
  type IdentityFacts,
  type ResolverFacts,
  type SectionProbe,
} from "./access-resolver";
import type { WorkAreaGate } from "./access";
import { levelCovers, type Level } from "./person-grants";

type RpcResult = { data: unknown; error: { code?: string; message: string } | null };

/** Minimal client shape (the user-scoped Supabase server client satisfies it; tests use a fake). */
export interface ResolverClient {
  rpc(fn: string, args: Record<string, unknown>): PromiseLike<RpcResult>;
}

/** A site code no grant can hold: with it scd_can answers true only for perimeter ALL (or Direzione / base). */
export const ALL_ONLY_SITE = "__ALL_ONLY__";

async function safeRpc(sb: ResolverClient, fn: string, args: Record<string, unknown>): Promise<RpcResult> {
  try {
    return await sb.rpc(fn, args);
  } catch (e) {
    return { data: null, error: { message: e instanceof Error ? e.message : "rpc failed" } };
  }
}

/** Verified identity of the caller from r61 scd_my_family (verified links only). Any error → no identity. */
export async function readIdentity(sb: ResolverClient, organizationId: string): Promise<IdentityFacts> {
  const { data, error } = await safeRpc(sb, "scd_my_family", { p_organization_id: organizationId });
  if (error || !Array.isArray(data)) return NO_IDENTITY;
  const rows: FamilyRowFacts[] = (data as Array<Record<string, unknown>>).map((r) => ({
    relationship: typeof r["relationship"] === "string" ? r["relationship"] : "",
    teamCodes: Array.isArray(r["team_codes"]) ? (r["team_codes"] as unknown[]).filter((t): t is string => typeof t === "string") : [],
  }));
  return identityFromFamily(rows);
}

export type ProbeSource = "r113" | "scd_can" | "none";

/** All own grants in one call (r113). null when r113 is missing or failed. */
export async function readAllProbes(sb: ResolverClient, organizationId: string): Promise<{ probes: Map<string, SectionProbe> | null; source: ProbeSource; missing: boolean }> {
  const { data, error } = await safeRpc(sb, "scd_my_section_access", { p_organization_id: organizationId });
  if (error) return { probes: null, source: "none", missing: isMissingObjectError(error) };
  if (!Array.isArray(data)) return { probes: null, source: "none", missing: false };
  return { probes: probesFromRows(data as Array<{ section_code: unknown; level: unknown; perimeter: unknown }>), source: "r113", missing: false };
}

/** One section through r100 scd_can (any perimeter, then ALL only). Any error → null (opens nothing). */
export async function probeSection(sb: ResolverClient, organizationId: string, section: string, level: Level = "READ"): Promise<SectionProbe | null> {
  const base = { p_section_code: section, p_level: level, p_organization_id: organizationId, p_team_id: null, p_subject_person_id: null };
  const [anyRes, allRes] = await Promise.all([safeRpc(sb, "scd_can", { ...base, p_site: null }), safeRpc(sb, "scd_can", { ...base, p_site: ALL_ONLY_SITE })]);
  if (anyRes.error || allRes.error) return null;
  return { level: anyRes.data === true ? level : null, allLevel: allRes.data === true && anyRes.data === true ? level : null };
}

/** Probes for the sections a decision needs: r113 when present, else scd_can per section. */
export async function probesFor(sb: ResolverClient, organizationId: string, sections: readonly string[], level: Level = "READ"): Promise<{ probes: Map<string, SectionProbe> | null; source: ProbeSource }> {
  const all = await readAllProbes(sb, organizationId);
  if (all.probes) return { probes: all.probes, source: "r113" };
  if (!all.missing) return { probes: null, source: "none" };
  const out = new Map<string, SectionProbe>();
  for (const s of sections) {
    const p = await probeSection(sb, organizationId, s, level);
    if (!p) return { probes: null, source: "none" };
    out.set(s, p);
  }
  return { probes: out, source: "scd_can" };
}

export interface CallerContext {
  sb: ResolverClient | null;
  /** First active membership of the verified session (same rule as the other server functions), or null. */
  organizationId: string | null;
  signedIn: boolean;
}

/** Gate of a work area: old decision OR grant (access-resolver.ts resolveWorkAreaGate). */
export async function gateWithGrants(areaId: string, old: WorkAreaGate, ctx: CallerContext): Promise<WorkAreaGate> {
  if (old.view === "page" && !old.preview) return old;
  // Base areas: a signed-in member (active membership, the same rule as getTrainingQuadro), no database call needed.
  if (!ctx.signedIn || !ctx.organizationId) return old;
  const base = resolveWorkAreaGate(areaId, old, { signedIn: true, identity: NO_IDENTITY, probes: null });
  if (base.via === "base") return base;
  const section = sectionForArea(areaId);
  if (!section || !ctx.sb) return old;
  try {
    const identity = await readIdentity(ctx.sb, ctx.organizationId);
    if (!identity.verified) return old;
    const { probes } = await probesFor(ctx.sb, ctx.organizationId, [section]);
    return resolveWorkAreaGate(areaId, old, { signedIn: true, identity, probes });
  } catch {
    return old;
  }
}

/** Does a grant give this section at `level` with perimeter ALL (for actions such as approvals)? Fail-closed. */
export async function grantAllAt(section: string, level: Level, ctx: CallerContext): Promise<boolean> {
  if (!ctx.signedIn || !ctx.sb || !ctx.organizationId) return false;
  try {
    const identity = await readIdentity(ctx.sb, ctx.organizationId);
    if (!identity.verified) return false;
    const { probes, source } = await probesFor(ctx.sb, ctx.organizationId, [section], level);
    const p = probes?.get(section);
    if (!p || source === "none") return false;
    return p.allLevel !== null && levelCovers(p.allLevel, level);
  } catch {
    return false;
  }
}

/** Navigation additions for the signed-in caller. Grant entries only with r113 (one call); auto entries always. */
export async function navFor(ctx: CallerContext): Promise<AccessNav & { engine: ProbeSource }> {
  if (!ctx.signedIn || !ctx.sb || !ctx.organizationId) return { ...EMPTY_NAV, engine: "none" };
  try {
    const identity = await readIdentity(ctx.sb, ctx.organizationId);
    if (!identity.verified) return { ...EMPTY_NAV, engine: "none" };
    const all = await readAllProbes(ctx.sb, ctx.organizationId);
    const facts: ResolverFacts = { signedIn: true, identity, probes: all.probes };
    return { ...accessNavFor(facts), engine: all.source };
  } catch {
    return { ...EMPTY_NAV, engine: "none" };
  }
}
