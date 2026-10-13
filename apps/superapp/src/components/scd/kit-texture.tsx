/**
 * Kit 2026/27 texture layer (Direzione 13/10/2026): the "C" monogram, the lake-and-mountains line art and the
 * Colico fort line art of the kits, with the gold/white collar piping at the bottom. One shared layer for every
 * hero band, so pages keep their structure and only the background changes. Assets and rules: styles.css
 * (`.scd-kit-stripes`, `data-motif`) and public/media/brand/tex/ (KIT_TEXTURE in config/scd-assets.v1.json).
 *
 * The parent must be `relative isolate` (the layer sits at -z-10 behind the content), or use `inline`.
 */
export type KitMotif = "monogram" | "mountains-lake" | "forte";

export const KIT_TEXTURE_CLASS = "scd-kit-stripes";

export function KitTexture({
  motif = "monogram",
  overlay = false,
  inline = false,
  className = "",
}: {
  motif?: KitMotif;
  /** Only the line art and monogram, no band colour: for heroes with their own photo (event posters). */
  overlay?: boolean;
  /** z-0 instead of -z-10: for a parent that must not become `isolate` (content after it must be `relative`). */
  inline?: boolean;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      data-motif={motif}
      data-kit-texture=""
      className={`${KIT_TEXTURE_CLASS}${overlay ? " scd-kit-stripes--overlay" : ""} pointer-events-none absolute inset-0 ${inline ? "z-0" : "-z-10"} ${className}`.trim()}
    />
  );
}
