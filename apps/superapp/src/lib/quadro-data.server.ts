/**
 * Training quadro data (Quadro allenamenti, snapshot 09/10/2026). Server only: teams and training schedules are
 * inside (UD-100, Direzione 13/10/2026), so this file is imported only by server functions (dynamic import inside
 * the handler) and by tests. A guard test checks the built client bundle never contains it.
 */
import raw from "@/data/quadro-snapshot-20261009.json";

import type { QuadroSnapshot } from "@/features/impianti/snapshot";

import { parseQuadro, type Quadro } from "./public-snapshots";

/** Raw snapshot as extracted from the master workbook (used by the impianti board). */
export const QUADRO_SNAPSHOT = raw as unknown as QuadroSnapshot;

/** Parsed quadro (allowlisted fields). */
export function loadQuadro(): Quadro {
  return parseQuadro(raw);
}
