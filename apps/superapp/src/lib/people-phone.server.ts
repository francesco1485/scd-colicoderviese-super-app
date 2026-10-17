/**
 * Office read of one person's phone (UD-167, r141). Server only: since r141 the phone column of scd_people is not
 * readable directly by members; the office roles read it through scd_person_phone with their own session.
 */
type PhoneClient = {
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { code?: string | null } | null }>;
  from: (t: string) => { select: (c: string) => { eq: (k: string, v: string) => { maybeSingle: () => PromiseLike<{ data: unknown; error: unknown }> } } };
};

/**
 * Phone of one person for the office page. r141 path: scd_person_phone (office roles only). Before r141 is applied the
 * function is missing and the column is still readable: the old direct read answers.
 */
export async function officePhone(sb: PhoneClient, organizationId: string, personId: string): Promise<string | null> {
  const r = await sb.rpc("scd_person_phone", { p_organization_id: organizationId, p_person_id: personId });
  if (!r.error) return typeof r.data === "string" && r.data.trim() ? r.data : null;
  if (!["42883", "PGRST202"].includes(r.error.code ?? "")) return null;
  const legacy = await sb.from("scd_people").select("phone").eq("id", personId).maybeSingle();
  const v = (legacy.data as { phone?: unknown } | null)?.phone;
  return typeof v === "string" && v.trim() ? v : null;
}
