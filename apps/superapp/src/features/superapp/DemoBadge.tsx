import { Lock } from "lucide-react";
import type { ReactNode } from "react";

/** Etichetta obbligatoria per le schermate CORE/GROW con dati dimostrativi. */
export function DemoBadge({ className = "" }: { className?: string }) {
  return <span className={`inline-flex items-center rounded bg-accent px-2 py-0.5 font-display text-[0.72rem] font-bold uppercase tracking-wider text-accent-foreground ${className}`}>DEMO · ANTEPRIMA</span>;
}

/** Avviso: i dati privati arriveranno solo con identità verificata su R20 (nessun nuovo login). */
export function ReservedNote({ children }: { children?: ReactNode }) {
  return (
    <p role="note" className="flex items-start gap-2 rounded-lg border border-accent/60 bg-accent/15 px-3 py-2 text-[13px] font-semibold text-foreground">
      <Lock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
      <span>Accesso riservato: in arrivo con R20.{children ? <> {children}</> : null}</span>
    </p>
  );
}
