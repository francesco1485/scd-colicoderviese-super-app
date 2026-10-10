/**
 * Sessione dell'ingresso unico, salvata solo per la scheda aperta (sessionStorage).
 * Contiene il token R20 e il profilo minimo; nessun dato personale oltre al nome.
 */
import { useEffect, useState } from "react";

import type { AccessProfile, DoorId } from "./doors";

export type StoredSession = { token: string; profile: AccessProfile; doors: DoorId[] };

const KEY = "scd-superapp-session";
const EVENT = "scd-session-change";

export function readSession(): StoredSession | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as StoredSession;
    return s && typeof s.token === "string" && s.profile ? s : null;
  } catch {
    return null;
  }
}

export function writeSession(s: StoredSession): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // archiviazione non disponibile: la sessione vale solo per questa pagina
  }
  window.dispatchEvent(new Event(EVENT));
}

export function clearSession(): void {
  try {
    sessionStorage.removeItem(KEY);
    // vecchie chiavi per area dell'Hub Lovable
    for (const a of ["famiglia", "atleta", "staff", "direzione"]) sessionStorage.removeItem(`scd-session-${a}`);
  } catch {
    // niente da pulire
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Sessione corrente, aggiornata quando si entra o si esce. `undefined` finché non è letta. */
export function useSession(): StoredSession | null | undefined {
  const [s, setS] = useState<StoredSession | null | undefined>(undefined);
  useEffect(() => {
    const sync = () => setS(readSession());
    sync();
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);
  return s;
}
