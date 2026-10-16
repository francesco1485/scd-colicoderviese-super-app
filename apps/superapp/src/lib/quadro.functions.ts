/**
 * Training quadro for members (UD-100, Direzione 13/10/2026: "Le squadre sono dentro non fuori"). The data lives in
 * quadro-data.server.ts and is read only here, inside the handler, so it never reaches the browser bundle.
 * Allowed: a signed-in member (verified on the server), or the password-protected staging preview that already
 * opens the work areas (stagingPreviewEnabled, always off in production). Anyone else gets an explicit
 * not-authorized result with an empty quadro.
 */
import { createServerFn } from "@tanstack/react-start";

import type { QuadroSnapshot } from "@/features/impianti/snapshot";

import { sessionView } from "./auth.functions";
import { stagingPreviewEnabled } from "./impianti-access";
import { isSignedInMember, NOT_AUTHORIZED, type NotAuthorized, type SessionLike } from "./public-access";
import { EMPTY_QUADRO, type Quadro } from "./public-snapshots";
import { publicTrainingDay, type PublicTrainingDay } from "./public-training";

export type TrainingQuadroResult =
  | { authorized: true; quadro: Quadro; snapshot: QuadroSnapshot }
  | (NotAuthorized & { quadro: Quadro; snapshot: null });

/** Pure guard: members, or the staging preview of the work areas. */
export function quadroAllowed(session: SessionLike | null, stagingPreview: boolean): boolean {
  return isSignedInMember(session) || stagingPreview;
}

export const getTrainingQuadro = createServerFn({ method: "GET" }).handler(async (): Promise<TrainingQuadroResult> => {
  const session = await sessionView();
  if (!quadroAllowed(session, stagingPreviewEnabled(process.env, import.meta.env.PROD))) {
    return { ...NOT_AUTHORIZED, quadro: EMPTY_QUADRO, snapshot: null };
  }
  const { loadQuadro, QUADRO_SNAPSHOT } = await import("./quadro-data.server");
  return { authorized: true, quadro: loadQuadro(), snapshot: QUADRO_SNAPSHOT };
});

/**
 * Public training timetable (UD-140, Francesco 16/10/2026: «orari di tutte le squadre» visible to everyone): only
 * weekday, time, pitch and team label of one evening — never the full quadro, rooms, rotations, names or notes.
 */
export const getPublicTrainings = createServerFn({ method: "GET" })
  .inputValidator((d: { today: string }) => ({ today: /^\d{4}-\d{2}-\d{2}$/.test(d?.today ?? "") ? d.today : "" }))
  .handler(async ({ data }): Promise<PublicTrainingDay | null> => {
    if (!data.today) return null;
    const { loadQuadro } = await import("./quadro-data.server");
    return publicTrainingDay(loadQuadro().slots, data.today);
  });
