/**
 * Access rule for `/gestionale/impianti` ("Impianti e campi").
 *
 * Who may work on it was decided by Francesco on 2026-10-11 and lives in
 * `config/superapp-areas.v1.json` (area `impianti`: club positions mapped onto
 * the coarse manifest roles). This module only DECIDES what to render from a
 * verified session that the shared login (R20) provides: it does not create
 * sessions, roles or permissions. While the R20 login is not live
 * (`R20_LOGIN_LIVE = false`) nobody has a verified session, so everyone sees
 * the access screen, except on staging with the explicit preview flag.
 */
import { findArea } from "./areas";

export interface VerifiedSession {
  /** Club position (ABAC attribute), e.g. "presidente". */
  position: string | null;
  /** Coarse manifest role, e.g. "DIRECTION". Informative only: access goes by position. */
  role: string | null;
}

const area = findArea("impianti-campi");

/** Positions allowed on the area (registry). */
export const IMPIANTI_POSITIONS: readonly string[] = area?.roles ?? [];

export const POSITION_LABEL: Readonly<Record<string, string>> = {
  presidente: "Presidente",
  "direttore-generale": "Direttore generale",
  "responsabile-attivita-base": "Responsabile attività di base",
  "coordinatore-attivita-sportiva": "Coordinatore attività sportiva",
};

export type ImpiantiAccess =
  | { mode: "tool"; position: string }
  | { mode: "preview" }
  | { mode: "access"; reason: "no-session" | "position" };

/**
 * A verified session with an allowed position opens the tool. Otherwise the
 * staging preview (if enabled server side) shows it with a banner; everyone
 * else gets the access screen.
 */
export function impiantiAccess(
  session: VerifiedSession | null,
  stagingPreview: boolean,
): ImpiantiAccess {
  if (session?.position && IMPIANTI_POSITIONS.includes(session.position))
    return { mode: "tool", position: session.position };
  if (stagingPreview) return { mode: "preview" };
  return { mode: "access", reason: session ? "position" : "no-session" };
}

/**
 * Staging-only preview switch, read on the server.
 * On only when `SCD_STAGING_PREVIEW=1` AND the process is either a dev server
 * or runs behind the password-protected staging gateway
 * (`scripts/staging-gateway.mjs` refuses to start without an `SCD_STAGING_PASSWORD`
 * of at least 20 characters and passes its env to the app). A production
 * deploy has no staging password, so the flag alone never opens the tool.
 * `SCD_ENV=production` forces it off in any case.
 */
export function stagingPreviewEnabled(
  env: Readonly<Record<string, string | undefined>>,
  isProductionBuild: boolean,
): boolean {
  if (env["SCD_STAGING_PREVIEW"] !== "1") return false;
  if ((env["SCD_ENV"] ?? "").toLowerCase() === "production") return false;
  if (!isProductionBuild) return true;
  return (env["SCD_STAGING_PASSWORD"] ?? "").length >= 20;
}

/** Positions that decide on booking proposals (registry area `impianti-approvazioni`). */
export const APPROVER_POSITIONS: readonly string[] =
  findArea("impianti-approvazioni")?.roles ?? [];

/**
 * Approvals page: only Presidente and Direttore generale with a verified
 * session; the staging preview shows it with the banner.
 */
export function approvalsAccess(
  session: VerifiedSession | null,
  stagingPreview: boolean,
): ImpiantiAccess {
  if (session?.position && APPROVER_POSITIONS.includes(session.position))
    return { mode: "tool", position: session.position };
  if (stagingPreview) return { mode: "preview" };
  return { mode: "access", reason: session ? "position" : "no-session" };
}

/**
 * Published-CSV URL of the bookings master (env SCD_BOOKINGS_CSV_URL). Only
 * https Google Sheets "publish to web" addresses are accepted.
 */
export function bookingsCsvUrl(
  env: Readonly<Record<string, string | undefined>>,
): string | null {
  const raw = (env["SCD_BOOKINGS_CSV_URL"] ?? "").trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" || u.hostname !== "docs.google.com")
      return null;
    if (!u.pathname.startsWith("/spreadsheets/")) return null;
    return u.toString();
  } catch {
    return null;
  }
}
