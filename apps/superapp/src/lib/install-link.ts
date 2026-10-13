/**
 * The one address families and staff can find, type and print everywhere (UD-071).
 * Official since 13/10/2026 (Direzione): app.colicoderviese.it — club domain on Vercel, proxied to the
 * Render service. Everything printable (install link, Club House cards, QR codes) always points here,
 * whatever host the page was opened from, so a printed code never carries a temporary address.
 * The Render host stays reachable as the technical origin (Android test builds keep it until the switch).
 */
export const OFFICIAL_ADDRESS = "app.colicoderviese.it";
export const OFFICIAL_ORIGIN = `https://${OFFICIAL_ADDRESS}`;
/** @deprecated use OFFICIAL_ADDRESS */
export const PLANNED_ADDRESS = OFFICIAL_ADDRESS;
export const INTERIM_ADDRESS = "scd-superapp-staging.onrender.com";

/** Origin used for every shared or printed link: an explicitly configured site URL, else the official one. */
export function officialOrigin(siteUrl?: string | null): string {
  if (siteUrl) {
    try {
      const url = new URL(siteUrl);
      if (url.protocol === "https:" || url.protocol === "http:") return url.origin;
    } catch {
      // fall through to the official origin
    }
  }
  return OFFICIAL_ORIGIN;
}

/** Address shown on the install page and on printed material. */
export function displayAddress(siteUrl?: string | null): string {
  return new URL(officialOrigin(siteUrl)).host;
}

/** Absolute URL encoded in the printable QR code: the install page itself, so a scan explains what to do. */
export function installUrl(siteUrl?: string | null): string {
  return `${officialOrigin(siteUrl)}/installa`;
}
