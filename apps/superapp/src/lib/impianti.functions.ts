/** Impianti e campi: server-side access state and read-only bookings feed (no session or role is created here). */
import { createServerFn } from "@tanstack/react-start";

import { csvToProposals, type Proposal } from "./bookings-register";
import {
  approvalsAccess,
  bookingsCsvUrl,
  stagingPreviewEnabled,
  type VerifiedSession,
} from "./impianti-access";
import { R20_LOGIN_LIVE } from "./satellites";
import { grantAllAt, gateWithGrants } from "./access-resolver.server";
import { sessionView } from "./auth.functions";
import { serverSupabase } from "./supabase.server";

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
  /**
   * Section grants of the Direzione for "impianti-campi" (r100, read through the caller's own session by
   * access-resolver.server.ts): view = READ (any perimeter: facility plans are not personal), approve = APPROVE with
   * perimeter ALL. Both false without a verified identity, without the grants engine or on any error.
   */
  grant: { view: boolean; approve: boolean };
}

const NO_GRANT = { view: false, approve: false } as const;

async function readAccess(): Promise<ImpiantiAccessState> {
  const base = {
    stagingPreview: stagingPreviewEnabled(process.env, import.meta.env.PROD),
    loginLive: R20_LOGIN_LIVE,
    session: null,
  };
  try {
    const s = await sessionView();
    const signedIn = s.configured && !!s.user;
    const ctx = { signedIn, organizationId: s.memberships[0]?.organizationId || null, sb: signedIn ? serverSupabase() : null };
    if (!signedIn || !ctx.organizationId) return { ...base, grant: NO_GRANT };
    const closed = { view: "access" as const, preview: false };
    const [view, approve] = await Promise.all([gateWithGrants("impianti-campi", closed, ctx), grantAllAt("impianti-campi", "APPROVE", ctx)]);
    return { ...base, grant: { view: view.view === "page", approve } };
  } catch {
    return { ...base, grant: NO_GRANT };
  }
}

export const getImpiantiAccess = createServerFn({ method: "GET" }).handler(
  async (): Promise<ImpiantiAccessState> => readAccess(),
);

export type ProposalsFeed =
  | { status: "forbidden" }
  | { status: "not-configured" }
  | { status: "error"; message: string }
  | { status: "ok"; proposals: Proposal[]; fetchedAt: string };

const MAX_CSV_BYTES = 1_000_000;

/**
 * Proposals from the published CSV of "17 - PRENOTAZIONI IMPIANTI 2026-27"
 * (env SCD_BOOKINGS_CSV_URL). Returned only to whoever may open the approvals
 * page (Presidente, Direttore generale, or the staging preview). Read only.
 */
export const getBookingProposals = createServerFn({ method: "GET" }).handler(
  async (): Promise<ProposalsFeed> => {
    const access = await readAccess();
    if (
      approvalsAccess(access.session, access.stagingPreview, access.grant.approve).mode === "access"
    )
      return { status: "forbidden" };
    const url = bookingsCsvUrl(process.env);
    if (!url) return { status: "not-configured" };
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(8000),
        headers: { accept: "text/csv" },
      });
      if (!res.ok)
        return {
          status: "error",
          message: `Registro non raggiungibile (HTTP ${res.status}).`,
        };
      const text = await res.text();
      if (text.length > MAX_CSV_BYTES)
        return {
          status: "error",
          message: "Registro troppo grande per l'anteprima.",
        };
      return {
        status: "ok",
        proposals: csvToProposals(text),
        fetchedAt: new Date().toISOString(),
      };
    } catch {
      return { status: "error", message: "Registro non raggiungibile ora." };
    }
  },
);
