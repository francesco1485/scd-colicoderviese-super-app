import { describe, expect, it } from "vitest";

import {
  feedImageExtension,
  hasExif,
  isJpeg,
  stripJpegMetadata,
} from "./image-privacy";

function seg(marker: number, payload: number[]): number[] {
  const len = payload.length + 2;
  return [0xff, marker, (len >> 8) & 0xff, len & 0xff, ...payload];
}
const text = (s: string) => [...s].map((c) => c.charCodeAt(0));

/** A tiny synthetic JPEG: SOI, APP0 (JFIF), APP1 (Exif with a fake GPS tag), APP2 (ICC), COM, DQT, SOS data, EOI. */
function fakeJpeg(): Uint8Array {
  const bytes = [
    0xff,
    0xd8,
    ...seg(0xe0, [...text("JFIF\0"), 1, 1]),
    ...seg(0xe1, [
      ...text("Exif\0\0"),
      0x4d,
      0x4d,
      0x00,
      0x2a,
      0x00,
      0x00,
      0x00,
      0x08,
      0x88,
      0x25,
    ]),
    ...seg(0xe2, [...text("ICC_PROFILE\0"), 1, 1, 9, 9]),
    ...seg(0xfe, text("shot at the pitch")),
    ...seg(0xdb, [0, 1, 2, 3]),
    0xff,
    0xda,
    0x00,
    0x04,
    0x01,
    0x00,
    0xaa,
    0xbb,
    0xcc,
    0xff,
    0xd9,
  ];
  return new Uint8Array(bytes);
}

describe("image privacy", () => {
  it("removes EXIF, XMP-style APP segments and comments but keeps JFIF-free image data and the ICC profile", () => {
    const src = fakeJpeg();
    expect(isJpeg(src)).toBe(true);
    expect(hasExif(src)).toBe(true);
    const out = stripJpegMetadata(src);
    expect(hasExif(out)).toBe(false);
    expect(out.length).toBeLessThan(src.length);
    const s = String.fromCharCode(...out);
    expect(s).toContain("ICC_PROFILE");
    expect(s).not.toContain("Exif");
    expect(s).not.toContain("shot at the pitch");
    // Scan data and EOI are byte-identical at the end.
    expect([...out.subarray(out.length - 5)]).toEqual([
      0xaa, 0xbb, 0xcc, 0xff, 0xd9,
    ]);
    expect([...out.subarray(0, 2)]).toEqual([0xff, 0xd8]);
  });

  it("leaves non-JPEG and malformed input untouched", () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4]);
    expect(stripJpegMetadata(png)).toBe(png);
    const broken = new Uint8Array([0xff, 0xd8, 0x00, 0x11, 0x22, 0x33]);
    expect(stripJpegMetadata(broken)).toBe(broken);
    const truncated = new Uint8Array([
      0xff, 0xd8, 0xff, 0xe1, 0x10, 0x00, 0x45,
    ]);
    expect(stripJpegMetadata(truncated)).toBe(truncated);
  });

  it("maps accepted mime types to extensions", () => {
    expect(feedImageExtension("image/jpeg")).toBe("jpg");
    expect(feedImageExtension("image/webp")).toBe("webp");
    expect(feedImageExtension("image/heic")).toBeNull();
  });
});
