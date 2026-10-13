/**
 * Assistant cast of the Super App (UD "assistant cast", Direzione "Ci siamo" on the round-4 Canva
 * images and "Vai A B C" 13/10/2026): realistic original characters, never cartoon, no real-person
 * likeness. Sky stays the official lucky mascot and Crovi (public/media/crovi/v3) is unchanged.
 *
 * - Era: helper of the reserved areas for staff and members aged 15+ (elegant, professional);
 * - Genny: general healthy-eating habits for young athletes (never personal plans, never numbers);
 * - Dottor Acanfora: the "infermeria" corner, general first-aid information, never a diagnosis.
 *
 * Image readiness is a feature check, not a placeholder: a character's picture appears only when
 * its optimized files exist in public/media/cast/<id>/ AND are registered in
 * config/scd-assets.v1.json (asset test enforces both). Until then the text features work and no
 * drawing stands in for the approved face.
 *
 * 13/10/2026: the round-4 media were placed full size (1136 x 1408) in one Canva design each
 * ("SCD cast export · <name> · 2026-10-13"), exported as PNG, cut out (rembg isnet-general-use;
 * faces untouched) and encoded as WebP: <id>-440/-900 cut-outs and <id>-avatar-256 tile.
 */

export type CastId = "era" | "genny" | "acanfora";

export const CAST_IDS: readonly CastId[] = ["era", "genny", "acanfora"];

export interface CastMember {
  id: CastId;
  name: string;
  /** What the character does in the app, in plain Italian. */
  role: string;
  /** Accessible description of the portrait (no likeness claims). */
  alt: string;
  /** Canva media id of the approved round-4 image (provenance). */
  canvaAssetId: string;
  /** Canva design used to export the image at full size (provenance). */
  canvaExportDesignId: string;
  /** Public folder of the optimized variants. */
  mediaDir: `/media/cast/${CastId}/`;
  /** True only once the optimized variants are committed and registered. */
  ready: boolean;
}

export const CAST: Readonly<Record<CastId, CastMember>> = {
  era: {
    id: "era",
    name: "Era",
    role: "Assistente delle aree riservate per staff e tesserati dai 15 anni",
    alt: "Era, l'assistente del club, in tuta blu della società",
    canvaAssetId: "MAHX1G12gBc",
    canvaExportDesignId: "DAHX4vg-ENE",
    mediaDir: "/media/cast/era/",
    ready: true,
  },
  genny: {
    id: "genny",
    name: "Genny",
    role: "Consigli generali di sana alimentazione per i giovani atleti",
    alt: "Genny, la ragazza dei consigli, con un frutto in mano al campo",
    canvaAssetId: "MAHX1KTH6yk",
    canvaExportDesignId: "DAHX4uTHmCs",
    mediaDir: "/media/cast/genny/",
    ready: true,
  },
  acanfora: {
    id: "acanfora",
    name: "Dottor Acanfora",
    role: "L'angolo infermeria: informazioni generali di primo soccorso",
    alt: "Il Dottor Acanfora con camice e borsa del club",
    canvaAssetId: "MAHX1M4GK7g",
    canvaExportDesignId: "DAHX4j7HujU",
    mediaDir: "/media/cast/acanfora/",
    ready: true,
  },
};

export type CastPortraitSize = 440 | 900;

export function castReady(id: CastId, cast: Readonly<Record<CastId, CastMember>> = CAST): boolean {
  return cast[id].ready;
}

/** Round avatar file (256px, like Crovi v3). */
export function castAvatarSrc(id: CastId): string {
  return `${CAST[id].mediaDir}${id}-avatar-256.webp`;
}

/** Portrait file in one of the two widths (like Crovi v3). */
export function castPortraitSrc(id: CastId, size: CastPortraitSize): string {
  return `${CAST[id].mediaDir}${id}-${size}.webp`;
}

/** Every file a ready character must ship (the asset test checks existence and registration). */
export function castFiles(id: CastId): string[] {
  return [castAvatarSrc(id), castPortraitSrc(id, 440), castPortraitSrc(id, 900)];
}
