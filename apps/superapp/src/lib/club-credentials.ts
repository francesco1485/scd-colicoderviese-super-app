/**
 * The club's three credentials, each with its own meaning (Direzione 13/10/2026 15:55). Order by importance.
 *
 * - FIGC Settore Giovanile e Scolastico: RECOGNISED youth club, official denomination "Club Giovanile di 3° livello"
 *   (CU n.18 SGS 2025/26, Manuale Sistema di Qualità dei Club Giovanili). "Élite" is a championship name
 *   (U16 Élite, Juniores Élite), never an SGS level.
 * - LND: ENROLLED in the FIGC championships through LND, Comitato Regionale Lombardia.
 * - AC Monza: AFFILIATED club of the "Insieme al Monza" programme (AC Monza calls its affiliated clubs "Academy").
 *
 * Never a single generic "società affiliata" label in front of all three.
 */
import { AFFILIATION_ART, type LogoArt } from "./logo-art.gen";

export type CredentialId = "figc-sgs-3-livello" | "lnd" | "insieme-al-monza";

export interface Credential {
  id: CredentialId;
  /** Main caption (what the club is). */
  title: string;
  /** Who grants it. */
  issuer: string;
  /** Phone caption. */
  short: string;
  /** Accessible description of the mark + credential. */
  alt: string;
  /** Provenance; url only when it was given by the Direzione. */
  source: { label: string; url?: string };
  art: LogoArt;
}

/**
 * Height (px) of the display rendition served for each mark (B3, 2026-10-15). The marks never show taller than
 * 34 CSS px (header plaque, home bar at --logo-k 1.2, footer list), so a lossless 96 px rendition covers 2.8x screens
 * instead of the 306-342 px cut-outs (figc-sgs 183 KB -> 33 KB on every page). Same pixels resampled, no redraw;
 * registered in config/scd-assets.v1.json with derived_from the cut-out. w/h stay those of the cut-out (aspect).
 */
export const CREDENTIAL_DISPLAY_HEIGHT = 96;

export function credentialDisplaySrc(cutSrc: string): string {
  return cutSrc.replace(/\.webp$/, `-h${CREDENTIAL_DISPLAY_HEIGHT}.webp`);
}

const art = (id: CredentialId): LogoArt => {
  const a = AFFILIATION_ART.find((x) => x.id === id);
  if (!a) throw new Error(`missing affiliation art ${id}`);
  return { ...a, src: credentialDisplaySrc(a.src) };
};

export const CLUB_CREDENTIALS: readonly Credential[] = [
  {
    id: "figc-sgs-3-livello",
    title: "Club Giovanile di 3° livello",
    issuer: "FIGC Settore Giovanile e Scolastico",
    short: "3° livello SGS",
    alt: "FIGC Settore Giovanile e Scolastico: Club Giovanile di 3° livello",
    source: {
      label:
        "CU n.18 SGS 2025/26, Manuale Sistema di Qualità dei Club Giovanili",
      url: "https://figc.it/media/277940/cu-n18-sgs-manuale-sistema-di-qualit%C3%A0-club-giovanili-ed2025-ss-2025-2026-del-22-08-2025.pdf",
    },
    art: art("figc-sgs-3-livello"),
  },
  {
    id: "lnd",
    title: "Iscritta FIGC",
    issuer: "LND · Comitato Regionale Lombardia",
    short: "LND Lombardia",
    alt: "FIGC Lega Nazionale Dilettanti: società iscritta ai campionati tramite il Comitato Regionale Lombardia",
    source: {
      label:
        "Direzione 13/10/2026: iscrizione ai campionati FIGC tramite LND Comitato Regionale Lombardia",
    },
    art: art("lnd"),
  },
  {
    id: "insieme-al-monza",
    title: "Affiliata AC Monza",
    issuer: "Insieme al Monza · Academy",
    short: "Affiliata AC Monza",
    alt: "Insieme al Monza: società affiliata AC Monza (Academy)",
    source: {
      label: "AC Monza, Insieme al Monza",
      url: "https://www.acmonza.com/en/insieme-monza-dettaglio/mission/",
    },
    art: art("insieme-al-monza"),
  },
];

/** One sentence for text contexts (footer, trust card), same facts and order. */
export const CREDENTIALS_SENTENCE =
  "Club Giovanile di 3° livello FIGC SGS, iscritta ai campionati FIGC con LND Lombardia, affiliata AC Monza (Insieme al Monza).";
