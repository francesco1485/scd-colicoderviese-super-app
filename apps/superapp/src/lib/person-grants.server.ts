/**
 * Person grants on the server (r100, UD-112): feature detection and the prepared integration point.
 *
 * Fail-closed and behaviour-preserving: while migration r100 is not applied (`scd_person_grants` missing) every
 * helper answers "not-applied" and callers MUST keep today's logic. Nothing in the app calls `sectionCheck` yet:
 * switching an existing guard over to grants is a separate, explicit Direzione decision after r100 is applied.
 */
import type { CheckContext, Level } from "./person-grants";

export type GrantsEngine = "applied" | "not-applied" | "unknown";

/** Minimal shape of the Supabase client used here (keeps this module testable without the SDK). */
export interface GrantsClient {
  from(table: string): {
    select(
      columns: string,
      opts?: { head?: boolean; count?: "exact" },
    ): PromiseLike<{ error: { code?: string; message: string } | null }> & {
      limit(
        n: number,
      ): PromiseLike<{ error: { code?: string; message: string } | null }>;
    };
  };
  rpc(
    fn: string,
    args: Record<string, unknown>,
  ): PromiseLike<{
    data: unknown;
    error: { code?: string; message: string } | null;
  }>;
}

/** Errors PostgREST / Postgres give when a relation or function does not exist (yet). */
export function isMissingObjectError(
  error: { code?: string; message: string } | null | undefined,
): boolean {
  if (!error) return false;
  if (
    error.code &&
    ["42P01", "42883", "PGRST202", "PGRST205"].includes(error.code)
  )
    return true;
  return /does not exist|could not find the (table|function)/i.test(
    error.message,
  );
}

/** Is r100 applied on the connected database? "unknown" when the check itself failed for another reason. */
export async function grantsEngineState(
  sb: GrantsClient | null,
): Promise<GrantsEngine> {
  if (!sb) return "unknown";
  try {
    const { error } = await sb
      .from("scd_person_grants")
      .select("id", { head: true, count: "exact" })
      .limit(1);
    if (!error) return "applied";
    return isMissingObjectError(error) ? "not-applied" : "unknown";
  } catch {
    return "unknown";
  }
}

export type SectionCheck =
  | { engine: "applied"; allowed: boolean }
  | { engine: "not-applied" | "unknown" };

/**
 * Prepared integration (not wired): asks the database `scd_can`. When the engine is not applied or the check
 * fails, it returns the engine state WITHOUT an answer so that the caller keeps its current rule.
 */
export async function sectionCheck(
  sb: GrantsClient | null,
  organizationId: string,
  section: string,
  level: Level,
  ctx: CheckContext = {},
): Promise<SectionCheck> {
  const engine = await grantsEngineState(sb);
  if (engine !== "applied" || !sb)
    return { engine: engine === "applied" ? "unknown" : engine };
  const { data, error } = await sb.rpc("scd_can", {
    p_section_code: section,
    p_level: level,
    p_organization_id: organizationId,
    p_team_id: ctx.teamId ?? null,
    p_site: ctx.site ?? null,
    p_subject_person_id: ctx.personId ?? null,
  });
  if (error) return { engine: "unknown" };
  return { engine: "applied", allowed: data === true };
}
