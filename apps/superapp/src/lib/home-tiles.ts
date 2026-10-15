/**
 * Tiles of the public home, from Francesco's home board (VR-009 screen 1 / VR-010, rebuilt 15/10/2026 after
 * "è una schifezza"): four big tiles under the lake band (Gare, Allenamenti, Eventi, Iniziative) and two small tiles
 * under the next game. The public home is shown to visitors only (routes/index.tsx), so no tile opens a members-only
 * page: training times are for members, the tile says so and leads to the sign-in, which then opens them.
 * Pure data, tested in home-tiles.test.ts.
 */
import { PUBLIC_FORMS_LIVE } from "./public-forms";

export type TileIcon = "gare" | "allenamenti" | "eventi" | "iniziative" | "campi" | "gioca";

export interface HomeTile {
  id: string;
  label: string;
  /** Second line of the small tiles; on big tiles only when the page is for members ("per i soci"). */
  hint?: string;
  icon: TileIcon;
  to: string;
  hash?: string;
  search?: Readonly<Record<string, string>>;
  /** The destination is for members: the visitor first passes through the sign-in. */
  members?: boolean;
}

/** Where the visitor ends after signing in from the Allenamenti tile (members-only page). */
export const TRAINING_AFTER_SIGN_IN = "/allenamenti";

export function bigTiles(): HomeTile[] {
  return [
    { id: "gare", label: "Gare", icon: "gare", to: "/calendario" },
    {
      id: "allenamenti",
      label: "Allenamenti",
      hint: "Per i soci",
      icon: "allenamenti",
      to: "/accedi",
      search: { next: TRAINING_AFTER_SIGN_IN },
      members: true,
    },
    { id: "eventi", label: "Eventi", icon: "eventi", to: "/eventi" },
    { id: "iniziative", label: "Iniziative", icon: "iniziative", to: "/eventi", hash: "iniziative" },
  ];
}

export function smallTiles(formsLive: boolean = PUBLIC_FORMS_LIVE): HomeTile[] {
  return [
    {
      id: "campi",
      label: "Dove ci alleniamo",
      hint: "Campi di Colico e Dervio",
      icon: "campi",
      to: "/impianti",
    },
    formsLive
      ? { id: "gioca", label: "Gioca con noi", hint: "Scegli la categoria e chiedi una prova", icon: "gioca", to: "/entra" }
      : { id: "gioca", label: "Gioca con noi", hint: "Scrivi alla segreteria", icon: "gioca", to: "/contatti" },
  ];
}

/** Every page a tile can open (sign-in included): used by the tests against the route tree and the members-only list. */
export function tileRoutes(formsLive: boolean = PUBLIC_FORMS_LIVE): string[] {
  return [...new Set([...bigTiles(), ...smallTiles(formsLive)].map((t) => t.to))];
}
