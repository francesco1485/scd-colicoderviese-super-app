/**
 * Sign-in identifier (Direzione 14/10/2026, UD-118): the person types the e-mail OR the phone used at registration,
 * then the password. The phone is resolved to the account only by the database, and only together with the right
 * password (r105 `scd_login_email`), so nobody can discover an e-mail from a phone number.
 */

export type LoginIdentifier =
  | { kind: "email"; email: string }
  | { kind: "phone"; phone: string }
  | { kind: "invalid" };

const EMAIL = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;

/**
 * Italian mobile/landline in any common spelling ("333 1234567", "+39 333-123.4567", "0039 3331234567") reduced to
 * national digits; null when it is not a plausible phone number.
 */
export function normalizePhone(raw: string): string | null {
  let d = raw.replace(/[\s.\-/()]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  if (!/^\d+$/.test(d)) return null;
  if (d.startsWith("0039")) d = d.slice(4);
  else if (d.startsWith("39") && d.length >= 11) d = d.slice(2);
  if (d.length < 6 || d.length > 13) return null;
  return d;
}

export function parseLoginIdentifier(raw: string): LoginIdentifier {
  const v = raw.trim();
  if (!v) return { kind: "invalid" };
  if (v.includes("@")) {
    const email = v.toLowerCase();
    return EMAIL.test(email) && email.length <= 120 ? { kind: "email", email } : { kind: "invalid" };
  }
  const phone = normalizePhone(v);
  return phone ? { kind: "phone", phone } : { kind: "invalid" };
}
