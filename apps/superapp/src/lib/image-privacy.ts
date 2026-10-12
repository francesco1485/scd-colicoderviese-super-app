/**
 * Privacy delle foto (r88): prima di salvare una foto nel feed si tolgono i metadati del JPEG (posizione GPS,
 * fotocamera, data e ora). Una foto di un ragazzo non deve mai dire dove è stata scattata. Si tengono solo i
 * segmenti necessari all'immagine (tabelle, frame, dati) e il profilo colore ICC, così i colori non cambiano.
 * Niente dipendenze: lettura dei marker JPEG byte per byte.
 */

const SOI = 0xffd8;
const EOI = 0xffd9;
const SOS = 0xffda;

/** Markers to drop: APP0..APP15 except APP2 when it carries an ICC profile, and COM (comments). */
function dropSegment(marker: number, payload: Uint8Array): boolean {
  if (marker === 0xfffe) return true; // COM
  if (marker >= 0xffe0 && marker <= 0xffef) {
    if (
      marker === 0xffe2 &&
      payload.length >= 11 &&
      String.fromCharCode(...payload.subarray(0, 11)) === "ICC_PROFILE"
    )
      return false;
    return true;
  }
  return false;
}

export function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length > 4 && ((bytes[0]! << 8) | bytes[1]!) === SOI;
}

/**
 * Returns a copy of the JPEG without APPn/COM segments (EXIF, XMP, IPTC...). Anything that is not a well-formed JPEG
 * comes back untouched, so a corrupt file never becomes a different corrupt file.
 */
export function stripJpegMetadata(bytes: Uint8Array): Uint8Array {
  if (!isJpeg(bytes)) return bytes;
  const parts: Uint8Array[] = [bytes.subarray(0, 2)];
  let i = 2;
  while (i + 4 <= bytes.length) {
    if (bytes[i] !== 0xff) return bytes;
    const marker = (bytes[i]! << 8) | bytes[i + 1]!;
    if (marker === EOI) {
      parts.push(bytes.subarray(i));
      return concat(parts);
    }
    if (marker === SOS) {
      // From the scan start to the end the data is entropy-coded: keep everything as is.
      parts.push(bytes.subarray(i));
      return concat(parts);
    }
    const len = (bytes[i + 2]! << 8) | bytes[i + 3]!;
    if (len < 2 || i + 2 + len > bytes.length) return bytes;
    const segment = bytes.subarray(i, i + 2 + len);
    const payload = bytes.subarray(i + 4, i + 2 + len);
    if (!dropSegment(marker, payload)) parts.push(segment);
    i += 2 + len;
  }
  return bytes;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

/** True when the JPEG still carries an EXIF (APP1 "Exif") segment before the scan. */
export function hasExif(bytes: Uint8Array): boolean {
  if (!isJpeg(bytes)) return false;
  let i = 2;
  while (i + 4 <= bytes.length && bytes[i] === 0xff) {
    const marker = (bytes[i]! << 8) | bytes[i + 1]!;
    if (marker === SOS || marker === EOI) return false;
    const len = (bytes[i + 2]! << 8) | bytes[i + 3]!;
    if (len < 2) return false;
    if (
      marker === 0xffe1 &&
      String.fromCharCode(...bytes.subarray(i + 4, i + 8)) === "Exif"
    )
      return true;
    i += 2 + len;
  }
  return false;
}

export const FEED_IMAGE_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export const FEED_IMAGE_MAX_BYTES = 8 * 1024 * 1024;

export function feedImageExtension(mime: string): string | null {
  return mime === "image/jpeg"
    ? "jpg"
    : mime === "image/png"
      ? "png"
      : mime === "image/webp"
        ? "webp"
        : null;
}
