/** Impianti e campi: server-side access state (read only, no session or role is created here). */
import { createServerFn } from "@tanstack/react-start";

import { stagingPreviewEnabled, type VerifiedSession } from "./impianti-access";
import { R20_LOGIN_LIVE } from "./satellites";

export interface ImpiantiAccessState {
  /** Staging preview switch (SCD_STAGING_PREVIEW=1 behind the staging gateway or on a dev server). */
  stagingPreview: boolean;
  /** Whether the shared R20 login can issue sessions today. */
  loginLive: boolean;
  /**
   * Verified session with the club position. Always null while the R20 login
   * is not live: there is no login action that could verify a position.
   */
  session: VerifiedSession | null;
}

export const getImpiantiAccess = createServerFn({ method: "GET" }).handler(
  async (): Promise<ImpiantiAccessState> => {
    return {
      stagingPreview: stagingPreviewEnabled(process.env, import.meta.env.PROD),
      loginLive: R20_LOGIN_LIVE,
      session: null,
    };
  },
);
