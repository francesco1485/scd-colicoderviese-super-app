/**
 * Sostieni (r101, UD-113) on the server: feature detection and the back-office gate.
 *
 * Fail-closed: until migration r101 is applied (`scd_giving_engine` missing) every page says "Da attivare" and no
 * server function writes or reads anything; the rest of the app is unchanged. When r101 is applied, back-office access
 * is decided ONLY by the per-person grants of r100 (scd_can through person-grants.server.ts sectionCheck): roles open
 * nothing. The database checks again inside every function.
 */
import type { Level } from "./person-grants";
import { isMissingObjectError, sectionCheck, type GrantsClient } from "./person-grants.server";

export type GivingEngine = "applied" | "not-applied" | "unknown";
export type GivingSection = "fondo-solidale" | "adotta" | "donazioni" | "proposte";
export const GIVING_SECTIONS: readonly GivingSection[] = ["fondo-solidale", "adotta", "donazioni", "proposte"];

export const GIVING_SECTION_PATH: Readonly<Record<GivingSection, string>> = {
  "fondo-solidale": "/tesoreria/fondo-solidale",
  adotta: "/direzione/adotta",
  donazioni: "/tesoreria/donazioni",
  proposte: "/direzione/proposte",
};

/** Is r101 applied on the connected database? "unknown" when the probe failed for another reason. */
export async function givingEngineState(sb: Pick<GrantsClient, "rpc"> | null): Promise<GivingEngine> {
  if (!sb) return "unknown";
  try {
    const { data, error } = await sb.rpc("scd_giving_engine", {});
    if (!error) return data === "r101" ? "applied" : "unknown";
    return isMissingObjectError(error) ? "not-applied" : "unknown";
  } catch {
    return "unknown";
  }
}

export type GateState = "signed-out" | "not-active" | "denied" | "open" | "unavailable";

export interface GivingGate {
  section: GivingSection;
  state: GateState;
  /** Staging preview: the page shows its structure (no data, writes off) even without a session. */
  preview: boolean;
  engine: GivingEngine;
}

/**
 * The gate of one back-office page. Order: no session → sign in (unless staging preview); engine not applied →
 * "Da attivare"; grants engine (r100) answers → open or denied; anything unknown → unavailable (fail-closed).
 */
export async function givingGate(input: {
  section: GivingSection;
  signedIn: boolean;
  organizationId: string | null;
  sb: GrantsClient | null;
  preview: boolean;
  level?: Level;
}): Promise<GivingGate> {
  const { section, preview } = input;
  if (!input.signedIn || !input.sb || !input.organizationId) {
    const engine = input.sb ? await givingEngineState(input.sb) : "unknown";
    return { section, state: preview ? (engine === "applied" ? "signed-out" : "not-active") : "signed-out", preview, engine };
  }
  const engine = await givingEngineState(input.sb);
  if (engine === "not-applied") return { section, state: "not-active", preview, engine };
  if (engine !== "applied") return { section, state: "unavailable", preview, engine };
  const check = await sectionCheck(input.sb, input.organizationId, section, input.level ?? "READ");
  if (check.engine !== "applied") return { section, state: "unavailable", preview, engine };
  return { section, state: check.allowed ? "open" : "denied", preview, engine };
}

/** Postgres errors of the r101 functions in plain Italian (never the raw message). */
export function givingErrorText(error: { code?: string; message: string } | null | undefined): string {
  if (!error) return "Operazione non riuscita. Riprova tra poco.";
  const m = error.message;
  if (/committee members only/.test(m)) return "Decide solo il comitato del Fondo (tre membri del Consiglio Direttivo).";
  if (/another committee member/.test(m)) return "Serve la firma di un altro membro del comitato.";
  if (/Direzione only/.test(m)) return "I posti del comitato li assegna la Direzione.";
  if (error.code === "42501") return /infermeria/.test(m) ? "Materiale sanitario: decide il responsabile dell'infermeria." : "Non sei abilitato a questa operazione: chiedi alla Direzione.";
  if (/double discount/.test(m)) return "Fondo e sconto fratelli non sono cumulabili.";
  if (/same amounts as the first/.test(m)) return "La seconda firma conferma gli stessi importi della prima.";
  if (/Consiglio Direttivo members only/.test(m)) return "Nel comitato vanno solo membri del Consiglio Direttivo (dall'organigramma).";
  if (/already holds a seat/.test(m)) return "Questa persona ha già un posto nel comitato.";
  if (/only membership fees/.test(m)) return "Il Fondo paga solo quote associative.";
  if (/medicines/.test(m)) return "Farmaci solo sigillati e non scaduti.";
  if (/more than the decided reduction/.test(m)) return "Supera la riduzione decisa per questa domanda.";
  if (/no receipt for a completely anonymous/.test(m)) return "Donazione completamente anonima: non si può rilasciare ricevuta.";
  if (/unit already adopted/.test(m) || error.code === "23505") return "Questo posto è già adottato.";
  if (/money already received/.test(m)) return "Per questo oggetto sono già arrivati soldi: non si può ritirare o riportare in bozza.";
  if (/contains a contact/.test(m)) return "Il testo pubblico non può contenere recapiti o dati personali.";
  if (/transition|not allowed/.test(m)) return "Passaggio di stato non previsto.";
  if (/reason needed|question needed/.test(m)) return "Scrivi il motivo.";
  if (/not found/.test(m) || error.code === "P0002") return "Elemento non trovato: ricarica la pagina.";
  if (isMissingObjectError(error)) return "Non ancora aperto online: per ora rivolgiti alla segreteria. Qui non viene registrato nulla.";
  return "Dati non validi: controlla i campi e riprova.";
}
