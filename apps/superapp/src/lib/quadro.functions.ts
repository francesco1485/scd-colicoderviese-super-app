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
