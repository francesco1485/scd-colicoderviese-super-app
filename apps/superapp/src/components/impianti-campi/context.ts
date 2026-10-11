/** Shared state of /gestionale/impianti and its 2D work environments (child routes). */
import { createContext, useContext } from "react";

import type { BookingDraft } from "./BookingPlanner";
import type { ImpiantiModel } from "./model";

export interface ImpiantiContextValue {
  model: ImpiantiModel;
  /** Staging preview (no verified session). */
  preview: boolean;
  /** Verified club position, or null in preview. */
  position: string | null;
  /** Plain label of who is working, for "Richiesto da" (empty when not verified). */
  requestedBy: string;
  /** May open /approvazioni (Presidente, Direttore generale, or preview). */
  canApprove: boolean;
  /** Draft handed over by Sky ("Aggiungi come ipotesi"). */
  draft: BookingDraft | null;
  setDraft: (d: BookingDraft | null) => void;
}

export const ImpiantiContext = createContext<ImpiantiContextValue | null>(null);

export function useImpianti(): ImpiantiContextValue {
  const v = useContext(ImpiantiContext);
  if (!v)
    throw new Error(
      "useImpianti must be used inside the /gestionale/impianti layout",
    );
  return v;
}

/** Validates the `?giorno=yyyy-mm-dd` search param of the 2D environments. */
export function validateDaySearch(s: Record<string, unknown>): {
  giorno?: string;
} {
  const g = s["giorno"];
  return typeof g === "string" && /^\d{4}-\d{2}-\d{2}$/.test(g)
    ? { giorno: g }
    : {};
}
