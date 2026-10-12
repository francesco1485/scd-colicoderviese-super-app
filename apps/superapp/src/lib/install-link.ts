/**
 * The one address families and staff can find, type and print everywhere (UD-071).
 * Definitive: app.colicoderviese.it (club domain, DNS record pending). Until then the production
 * service runs at colicoderviese.onrender.com. Both stay valid: the old one redirects to the new one.
 */
export const PLANNED_ADDRESS = "app.colicoderviese.it";
export const INTERIM_ADDRESS = "colicoderviese.onrender.com";

/** Address shown on the install page: the configured site, else the host the page was opened from. */
export function displayAddress(siteUrl: string | null, currentOrigin: string | null): string {
  const source = siteUrl ?? currentOrigin;
  if (!source) return PLANNED_ADDRESS;
  try {
    return new URL(source).host;
  } catch {
    return PLANNED_ADDRESS;
  }
}

/** Absolute URL encoded in the printable QR code: the install page itself, so a scan explains what to do. */
export function installUrl(siteUrl: string | null, currentOrigin: string | null): string {
  const base = (siteUrl ?? currentOrigin ?? `https://${PLANNED_ADDRESS}`).replace(/\/+$/, "");
  return `${base}/installa`;
}
