/**
 * What the public chrome shows a visitor (pure). The Direzione rule of 2026-10-13: an anonymous
 * visitor never sees "Crea" nor the internal areas; only staff authors may write posts. The raised
 * centre tab is gone since the board shell (15/10/2026: five fixed items in the bottom bar).
 * Nothing here grants anything: /crea and every area keep their own server gate.
 */
import type { SessionView } from "./auth.functions";
import { AUTHOR_ROLES, OFFICE_ROLES } from "./social";

/** The part of the session the chrome needs (SessionView or null when signed out / unknown). */
export type ChromeSession =
  Pick<SessionView, "user" | "roles" | "memberships"> | null | undefined;

/** Positions of the session for the menu filter: null when nobody is signed in. */
export function sessionPositions(
  session: ChromeSession,
): ReadonlySet<string> | null {
  if (!session?.user) return null;
  return new Set(session.roles);
}

/**
 * Same rule as getPublicSocial.canPost (src/lib/social.functions.ts): the first active membership
 * has an author role, or the person holds an office position (direzione, segreteria).
 */
export function canCreatePosts(session: ChromeSession): boolean {
  if (!session?.user) return false;
  const org = session.memberships[0];
  if (!org) return false;
  const office =
    OFFICE_ROLES.has(org.role) ||
    session.roles.includes("direzione") ||
    session.roles.includes("segreteria");
  return AUTHOR_ROLES.has(org.role) || office;
}
