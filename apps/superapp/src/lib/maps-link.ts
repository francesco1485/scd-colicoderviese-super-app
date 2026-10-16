/**
 * Google Maps search link of one of the club's sites (name + street + town). Pure, no data import, so client
 * bundles that only need the link do not pull the facilities master. Null without a confirmed street: never a guess.
 */
export function siteMapsUrl(site: { name: string; address: string | null; municipality: string }): string | null {
  if (!site.address?.trim()) return null;
  const q = `${site.name}, ${site.address.trim()}, ${site.municipality}`.replace(/\s+/g, " ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}
