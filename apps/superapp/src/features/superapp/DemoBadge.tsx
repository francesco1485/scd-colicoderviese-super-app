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

/** Testata compatta delle sezioni CORE/GROW, stesso linguaggio della Home. */
export function SectionHero({ app, title, children }: { app: "CORE" | "GROW"; title: string; children?: ReactNode }) {
  return (
    <section className="surface-deep px-4 pb-5 pt-4 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-white/10 px-2 py-0.5 font-display text-[0.72rem] font-bold tracking-wider">SCD {app}</span>
          <DemoBadge />
        </div>
        <h1 className="mt-2 text-[1.9rem] font-bold leading-none sm:text-4xl">{title}</h1>
        {children && <div className="mt-2 max-w-2xl text-sm text-primary-foreground/80">{children}</div>}
      </div>
    </section>
  );
}
