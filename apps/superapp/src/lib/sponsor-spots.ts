/**
 * LED spots of the confirmed sponsors (UD-119, Francesco 14/10/2026 18:14): they rotate on the physical LED wall player
 * (/ledwall/player) and, clock-synced with it, on the public sponsor page (/sponsor, SponsorLedwallLive, UD-142 —
 * Francesco 16/10/2026 20:56, the only exception to UD-152); in the gestionale they are listed in /crm ("Spot LED") and
 * play on demand; never sent by e-mail. Presidente or commerciale proposes the spot, the sponsor approves or asks for
 * changes, then it goes on air: "tutto è gestito dal vivo attraverso l'app".
 *
 * Source: Drive "02_V4_SPONSOR_VALIDATI" (one folder per sponsor): master LED 20 s 1920x164 and field preview
 * 1920x1080, transcoded only (never redrawn or altered, SCD:ASSET KEEP_LOCKED), registered in config/scd-assets.v1.json.
 * Only sponsors of src/lib/sponsors.ts (confirmed by Francesco on 14/10/2026); the others are added when confirmed.
 *
 * Status: today it comes from this file. All spots start as DA_APPROVARE and are already shown (Francesco: they
 * rotate now, approval follows). A spot with MODIFICHE_RICHIESTE never reaches the home or the LED wall. When the
 * staged spot register (supabase/migrations/20261014_r106_sponsor_spots.sql) is approved and applied, the status will
 * be read from there instead.
 *
 * Pure data and functions, SSR safe, tested in sponsor-spots.test.ts.
 */
import { dailyOrder } from "./ledwall-rotation";
import { SPONSORS, type Sponsor } from "./sponsors";

export type SpotStatus = "IN_ONDA" | "DA_APPROVARE" | "MODIFICHE_RICHIESTE" | "APPROVATO";

export const SPOT_STATUS_LABEL: Readonly<Record<SpotStatus, string>> = {
  DA_APPROVARE: "Da approvare",
  MODIFICHE_RICHIESTE: "Modifiche richieste",
  APPROVATO: "Approvato",
  IN_ONDA: "In onda",
};

/** The approval flow as the gestionale shows it (UD-119). */
export const SPOT_FLOW: readonly { key: string; label: string; hint: string }[] = [
  { key: "proposto", label: "Proposto dal Presidente o dal commerciale", hint: "Lo spot viene mostrato allo sponsor dall'app." },
  { key: "risposta", label: "Approvato dallo sponsor / Modifiche richieste", hint: "Lo sponsor accetta o chiede di cambiare qualcosa." },
  { key: "in-onda", label: "In onda", hint: "Lo spot gira in app e sul LED wall del campo." },
];

/** Placeholder kept in every caption until the sponsor's official social profile is verified. Never invent a handle. */
export const HANDLE_PLACEHOLDER = "[@handle da verificare]";

export const SPOTS_DIR = "/media/ledwall/2026-27";

/** Drive folder of the validated spots (02_V4_SPONSOR_VALIDATI). */
export const SPOTS_DRIVE_ROOT = "1Gth9hGLPceeObdOJ_AQKZTVojY7SNWzE";

/** Master spot size on the LED board (px). */
export const LED_MASTER = { width: 1920, height: 164, seconds: 20 } as const;

export interface SponsorSpot {
  slug: string;
  /** Name as written in src/lib/sponsors.ts. */
  sponsorName: string;
  /** 1920x164 master for the LED board. */
  master: string;
  /** 1280x720 field preview; null when the preview is not in the repo yet (then the master is shown). */
  preview: string | null;
  /** Poster of the preview (or of the master when there is no preview). */
  poster: string;
  posterSize: { width: number; height: number };
  driveFolderId: string;
  status: SpotStatus;
  /** Official website, only when already documented (repo or the sponsor folder's contacts file). */
  website?: string;
  /** Official social handle, null until verified: the caption keeps HANDLE_PLACEHOLDER. */
  socialHandle: string | null;
  /** Social caption draft ("In arrivo a Colico ..."), with HANDLE_PLACEHOLDER until the handle is verified. */
  caption: string;
}

interface SpotSeed {
  slug: string;
  driveFolderId: string;
  hasPreview: boolean;
  status: SpotStatus;
  website?: string;
  socialHandle: string | null;
}

/**
 * The spots ready on Drive for sponsors of the list (14/10/2026). Order = order of sponsors.ts.
 * Websites: HDI Maglia, Dell'Oca and Carcano from the "CONTATTI_VERIFICATI"/"ANAGRAFICA" files in their Drive
 * folders; Saglio Sport from config/reference-sources.v1.json (SRC-0032); Dego Arredamenti from the Drive dossier
 * "05_SCHEDA_CONTATTI_FONTI - DEGO_ARREDAMENTI" (sito ufficiale VERIFICATO, 14/10/2026). ATV and nbc: none documented.
 */
const SEEDS: readonly SpotSeed[] = [
  { slug: "hdi-maglia", driveFolderId: "154U0A3wua7vyWW0ZhLILiBaV3z6OqI0f", hasPreview: true, status: "DA_APPROVARE", website: "https://www.assicurazionimaglia.it/", socialHandle: null },
  { slug: "dell-oca", driveFolderId: "1RRmyNNWrUtzvVnroZ12_zLofFtVzvHS8", hasPreview: true, status: "DA_APPROVARE", website: "https://www.dellocapetroli.com/", socialHandle: null },
  { slug: "atv", driveFolderId: "1Y3VfsQvexe069Xyo8dIRC4GBrCWZRYPe", hasPreview: true, status: "DA_APPROVARE", socialHandle: null },
  { slug: "carcano", driveFolderId: "17VYuiQuwvMUaG3bfBavYUxe8ULb_kZEz", hasPreview: true, status: "DA_APPROVARE", website: "https://carcano.com/", socialHandle: null },
  { slug: "nbc", driveFolderId: "12wztzSMaWwwhwoZTBDA56J9uNVoNd6mr", hasPreview: true, status: "DA_APPROVARE", socialHandle: null },
  // Field preview on Drive (11.2 MB) not in the repo yet: the master is shown instead.
  { slug: "saglio-sport", driveFolderId: "1c9I7KJT6F0qSEFqyU_bfAxfKJ0SjvA_K", hasPreview: false, status: "DA_APPROVARE", website: "https://www.sagliosport.it/", socialHandle: null },
  { slug: "dego-arredamenti", driveFolderId: "1pZRvWzu0AgDFaW64vuw93wQruFCZ1ZMK", hasPreview: true, status: "DA_APPROVARE", website: "https://www.degoarredamenti.it/", socialHandle: null },
];

function sponsorOf(slug: string, list: readonly Sponsor[]): Sponsor | undefined {
  return list.find((s) => s.slug === slug);
}

/** Builds the spot list; a seed whose sponsor is not in the list (not confirmed) is left out. */
export function buildSpots(seeds: readonly SpotSeed[] = SEEDS, list: readonly Sponsor[] = SPONSORS): SponsorSpot[] {
  const out: SponsorSpot[] = [];
  for (const seed of seeds) {
    const sponsor = sponsorOf(seed.slug, list);
    if (!sponsor || !sponsor.name) continue;
    const master = `${SPOTS_DIR}/${seed.slug}-master.mp4`;
    out.push({
      caption: socialCaption({ sponsorName: sponsor.name, socialHandle: seed.socialHandle }),
      slug: seed.slug,
      sponsorName: sponsor.name,
      master,
      preview: seed.hasPreview ? `${SPOTS_DIR}/${seed.slug}-preview-720.mp4` : null,
      poster: seed.hasPreview ? `${SPOTS_DIR}/${seed.slug}-preview-poster.webp` : `${SPOTS_DIR}/${seed.slug}-master-poster.webp`,
      posterSize: seed.hasPreview ? { width: 1280, height: 720 } : { width: LED_MASTER.width, height: LED_MASTER.height },
      driveFolderId: seed.driveFolderId,
      status: seed.status,
      ...(seed.website ? { website: seed.website } : {}),
      socialHandle: seed.socialHandle,
    });
  }
  return out;
}

export const SPONSOR_SPOTS: readonly SponsorSpot[] = buildSpots();

/** Whether a spot may be shown in public (home) and on the LED wall: confirmed sponsor, no changes requested. */
export function isShowable(spot: Pick<SponsorSpot, "slug" | "status">, list: readonly Sponsor[] = SPONSORS): boolean {
  return spot.status !== "MODIFICHE_RICHIESTE" && list.some((s) => s.slug === spot.slug);
}

/** Spots of the public home: sponsor in sponsors.ts and status other than MODIFICHE_RICHIESTE. */
export function spotsForHome(spots: readonly SponsorSpot[] = SPONSOR_SPOTS, list: readonly Sponsor[] = SPONSORS): SponsorSpot[] {
  return spots.filter((s) => isShowable(s, list));
}

/** Spots of the LED wall player: the same rule as the home. */
export const spotsForLedwall = spotsForHome;

/** Rotation order of a Rome day (same deterministic day logic as the logo LED wall): same day → same order for all. */
export function spotsInDayOrder(spots: readonly SponsorSpot[], day: string): SponsorSpot[] {
  return dailyOrder(spots, day);
}

/** Link "Scopri il partner": the official website when documented, otherwise the partner page. */
export function partnerHref(spot: Pick<SponsorSpot, "website">): { href: string; external: boolean } {
  return spot.website ? { href: spot.website, external: true } : { href: "/sponsor", external: false };
}

/** Short Italian social caption (draft only, never published by the app). */
export function socialCaption(spot: Pick<SponsorSpot, "sponsorName" | "socialHandle">): string {
  const tag = spot.socialHandle ?? HANDLE_PLACEHOLDER;
  return (
    `In arrivo a Colico: il nuovo LED wall del campo. Grazie a ${spot.sponsorName} ${tag} ` +
    "che sostiene la S.C.D. ColicoDerviese nella stagione 2026/27. Lo spot gira già nell'app del club."
  );
}
