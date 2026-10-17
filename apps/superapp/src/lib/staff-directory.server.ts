/**
 * Rubrica staff, server only (UD-167, r141): the reads and the write with the CALLER'S session. No service key.
 */
import { sessionView } from "./auth.functions";
import { parseStaffDirectory } from "./staff-directory";
import { isMissingFunction, type DirectoryView } from "./staff-directory.functions";
import { serverSupabase } from "./supabase.server";

/** Organization of the caller: office membership first (same rule as the other gestionale reads). */
function pickOrg<M extends { organizationId: string; role: string }>(memberships: readonly M[]): M | null {
  return memberships.find((m) => m.role === "DIRECTION") ?? memberships.find((m) => m.role === "SECRETARIAT") ?? memberships[0] ?? null;
}

/** Shared by the pages and Iride: the caller's own directory, or a status that explains why there is none. */
export async function loadMyDirectory(): Promise<DirectoryView> {
  const s = await sessionView();
  const org = pickOrg(s.memberships);
  if (!s.configured || !s.user || !org) return { status: "signed-out", directory: null };
  const sb = serverSupabase();
  if (!sb) return { status: "unavailable", directory: null };
  const { data, error } = await sb.rpc("scd_staff_directory", { p_organization_id: org.organizationId });
  if (error) {
    if (isMissingFunction(error)) return { status: "not-applied", directory: null };
    console.warn(`[rubrica-staff] scd_staff_directory non riuscita: codice ${error.code || "unknown"}`);
    return { status: "unavailable", directory: null };
  }
  // null = signed in without a verified role (USER_BASE): nothing to show, not an error.
  if (data === null) return { status: "live", directory: null };
  const directory = parseStaffDirectory(data);
  return directory ? { status: "live", directory } : { status: "unavailable", directory: null };
}


type RpcResult = { data: unknown; error: { code?: string | null; message?: string | null } | null };

/** Calls scd_set_my_phone_share for the caller; the database checks the caller is an adult staff member. */
export async function saveMyPhoneShare(share: boolean): Promise<RpcResult | "signed-out" | "unavailable"> {
  const s = await sessionView();
  const org = pickOrg(s.memberships);
  if (!s.configured || !s.user || !org) return "signed-out";
  const sb = serverSupabase();
  if (!sb) return "unavailable";
  return (await sb.rpc("scd_set_my_phone_share", { p_organization_id: org.organizationId, p_share: share })) as RpcResult;
}
