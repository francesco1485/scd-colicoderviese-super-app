/**
 * Club communications for the home (UD-116). Empty by default: only the Direzione adds an entry, with showFrom and
 * showUntil (Rome days, inclusive). The first valid entry of the day is shown; expired entries can stay here as a
 * record because the window hides them. Server only (imported inside club-notice.functions.ts handlers).
 *
 * Example (do not uncomment without a Direzione decision):
 * {
 *   id: "campo-dervio-chiuso", title: "Campo di Dervio chiuso sabato", text: "…", tone: "urgente", audience: "tutti",
 *   decidedBy: "Direzione", decidedOn: "2026-10-14", showFrom: "2026-10-15", showUntil: "2026-10-17",
 * }
 */
import type { ClubNotice } from "./club-notice";

export const CLUB_NOTICES: readonly ClubNotice[] = [];
