import { Link } from "@tanstack/react-router";
import { RefreshCw, ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";

import type { Club, Match, SubmitOutcome } from "@/lib/club.types";

export const inputCls =
  "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring";

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
      {hint && <span className="block text-[0.7rem] text-muted-foreground">{hint}</span>}
    </label>
  );
}

export function PageHero({ eyebrow, title, children }: { eyebrow: string; title: ReactNode; children?: ReactNode }) {
  return (
    <section className="surface-deep relative overflow-hidden px-4 pb-14 pt-12">
      <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-accent/20 blur-3xl" />
      <div className="relative mx-auto max-w-6xl">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-bold leading-[1.02] md:text-6xl">{title}</h1>
        {children && <div className="mt-4 max-w-2xl text-sm opacity-85 md:text-base">{children}</div>}
      </div>
    </section>
  );
}

export function SyncPlaceholder({ label, className = "" }: { label: string; className?: string }) {
  return (
    <div className={`flex items-center gap-3 rounded-xl border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground ${className}`}>
      <RefreshCw className="size-4 shrink-0 animate-spin [animation-duration:3s] motion-reduce:animate-none" />
      <span>
        <strong className="text-foreground">{label}</strong> · dato in sincronizzazione
      </span>
    </div>
  );
}

export function ClubCrest({ club, name, size = 40 }: { club?: Club | undefined; name: string; size?: number }) {
  const initials = name.replace(/[^A-Za-zÀ-ú ]/g, "").split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return (
    <span className="relative inline-flex shrink-0 flex-col items-center">
      {club?.logo.url ? (
        <img src={club.logo.url} alt={`Stemma ${name}`} width={size} height={size} className="rounded-full bg-white object-contain p-0.5" style={{ width: size, height: size }} loading="lazy" />
      ) : (
        <span className="flex items-center justify-center rounded-full border border-current/30 font-display text-xs font-bold opacity-80" style={{ width: size, height: size }} aria-label={`Stemma ${name} non disponibile`}>
          {initials}
        </span>
      )}
      {club?.logo.url && !club.logo.verified && (
        <span className="mt-1 rounded bg-accent px-1 text-[0.55rem] font-bold uppercase text-accent-foreground">da verificare</span>
      )}
    </span>
  );
}

export function MatchCard({ match, label, variant }: { match: Match | null; label: string; variant: "next" | "result" }) {
  if (!match) {
    return (
      <article className={`${variant === "next" ? "surface-deep" : "card-premium"} rounded-2xl p-6`}>
        <p className="eyebrow">{label}</p>
        <div className="mt-4 space-y-3">
          <div className="h-6 w-3/4 animate-pulse rounded bg-current/10 motion-reduce:animate-none" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-current/10 motion-reduce:animate-none" />
        </div>
        <p className="mt-4 text-xs opacity-70">Dato in sincronizzazione dal gestionale R20</p>
      </article>
    );
  }
  const homeIsUs = /colico/i.test(match.casa);
  return (
    <article className={`${variant === "next" ? "surface-deep shadow-premium" : "card-premium"} rounded-2xl p-6`}>
      <p className="eyebrow">{label} · {match.squadra}</p>
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex flex-1 flex-col items-center gap-2 text-center">
          <ClubCrest name={match.casa} club={homeIsUs ? undefined : match.avversario} />
          <span className="font-display text-sm font-bold uppercase leading-tight">{match.casa}</span>
        </div>
        <span className="font-display text-3xl font-bold">
          {variant === "result" ? `${match.golCasa ?? "–"} : ${match.golOspite ?? "–"}` : <span className="text-accent">VS</span>}
        </span>
        <div className="flex flex-1 flex-col items-center gap-2 text-center">
          <ClubCrest name={match.ospite} club={homeIsUs ? match.avversario : undefined} />
          <span className="font-display text-sm font-bold uppercase leading-tight">{match.ospite}</span>
        </div>
      </div>
      <p className="mt-4 text-center text-xs uppercase tracking-widest opacity-75">
        {[match.competizione, match.dataLabel, match.campo].filter(Boolean).join(" · ")}
      </p>
    </article>
  );
}

export function OutcomeBox({ outcome }: { outcome: SubmitOutcome | null }) {
  if (!outcome) return null;
  return (
    <div role="status" className={`mt-4 rounded-xl border p-4 text-sm ${outcome.delivered ? "border-primary/30 bg-primary/5" : "border-accent bg-accent/15"}`}>
      <p className="font-semibold">{outcome.delivered ? "Inviato" : "Non ancora inviato"}</p>
      <p className="mt-1 text-muted-foreground">{outcome.message}</p>
      {outcome.reference && <p className="mt-1 text-xs">Riferimento: {outcome.reference} · Stato: {outcome.status}</p>}
    </div>
  );
}

export function SafeguardingStrip() {
  return (
    <Link to="/safeguarding" className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm">
      <ShieldAlert className="size-5 text-primary" />
      <span className="flex-1"><strong>Safeguarding</strong> · segnala in riservatezza</span>
      <span aria-hidden>→</span>
    </Link>
  );
}

export function DemoNotice({ children }: { children: ReactNode }) {
  return <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">{children}</p>;
}
