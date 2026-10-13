/**
 * Training quadro of the impianti board, handed down from the route loader (getTrainingQuadro, members only).
 * The data is never imported by client code (UD-100): without a provider the board shows an empty quadro.
 */
import { createContext, useContext, type ReactNode } from 'react';

import { EMPTY_QUADRO_SNAPSHOT, type QuadroSnapshot } from './snapshot';

const QuadroContext = createContext<QuadroSnapshot>(EMPTY_QUADRO_SNAPSHOT);

export function QuadroProvider({ value, children }: { value: QuadroSnapshot | null; children: ReactNode }) {
  return <QuadroContext.Provider value={value ?? EMPTY_QUADRO_SNAPSHOT}>{children}</QuadroContext.Provider>;
}

export function useQuadro(): QuadroSnapshot {
  return useContext(QuadroContext);
}
