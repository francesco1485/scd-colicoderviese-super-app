import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Bus, CalendarDays, ClipboardList, Dumbbell, KeyRound, LayoutGrid, MapPin, RefreshCw, Shirt, UserRound, Users, UsersRound } from "lucide-react";

import { BellAction, PageHeader } from "@/components/scd/board";
import { DemoBadge, ReservedNote } from "@/features/superapp/DemoBadge";

export const Route = createFileRoute("/core/")({
  head: () => ({ meta: [
    { title: "Area club — SCD CORE · S.C.D. ColicoDerviese" },
    { name: "description", content: "Area club della Super App S.C.D. ColicoDerviese: impianti e calendari, rotazione campi, staff e famiglie. Anteprima dimostrativa." },
    { name: "robots", content: "noindex" },
  ] }),
  component: CoreHome,
});

/** Sezioni del modulo Impianti e Calendari (Command Center) apribili direttamente. */
const IMPIANTI = [
  { sezione: "quadro", label: "Quadro allenamenti", text: "Campi e spogliatoi lun–ven (snapshot 09/10)", icon: Dumbbell },
  { sezione: "calendario", label: "Calendario annuale", text: "Gare per mese e categoria", icon: CalendarDays },
  { sezione: "squadra", label: "La mia squadra", text: "Prossimi impegni del gruppo", icon: Shirt },
  { sezione: "settore", label: "Il mio settore", text: "Vista per settore e sovrapposizioni", icon: LayoutGrid },
  { sezione: "rotazione", label: "Rotazione annuale", text: "Proposte di variazione (bozza locale)", icon: RefreshCw },
  { sezione: "impianti", label: "Impianti", text: "Colico Campo 1 e 2, Dervio", icon: MapPin },
  { sezione: "responsabili", label: "Piramide referenti", text: "Ruoli, senza nomi né contatti", icon: Users },
  { sezione: "dervio", label: "Dervio e pulmini", text: "Schema impianto e corse confermate", icon: Bus },
] as const;

const PREVIEWS = [
  { to: "/core/atleta", label: "Area atleta", text: "Convocazioni, quote, documenti", icon: UserRound },
  { to: "/core/famiglia", label: "Area famiglia", text: "Figli, quote, impegni", icon: UsersRound },
  { to: "/core/staff", label: "Staff e direzione", text: "Gruppi, presenze, agenda", icon: ClipboardList },
] as const;

function CoreHome() {
  return (
    <main className="pb-10" data-screen="core">
      <PageHeader title="Area club" action={<BellAction dot={false} />} testId="core-header" />
      <div className="relative z-[5] -mt-[14px] rounded-t-[18px] bg-[var(--scd-page)]">
      <div className="mx-auto max-w-6xl px-4 pt-[14px] sm:px-6">
        <div className="mb-2 flex flex-wrap items-center gap-2"><span className="rounded-[6px] bg-[var(--scd-blue)] px-2 py-0.5 text-[0.72rem] font-bold tracking-wider text-white">SCD CORE</span><DemoBadge /></div>
        <p className="mb-3 text-[14px] text-[var(--scd-sub)]">Gestione interna della società: impianti, calendari, rotazione campi, staff e famiglie. Qui solo consultazione e dati dimostrativi.</p>
        <ReservedNote>Nessun nuovo login: l'identità resta quella del gestionale R20 (email + PIN).</ReservedNote>

        <h2 className="mt-6 text-xl font-bold">Impianti e calendari</h2>
        <p className="text-sm text-muted-foreground">Modulo del Command Center: fonti pubbliche in sola lettura, nessuna scrittura.</p>
        <ul className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
          {IMPIANTI.map((s) => (
            <li key={s.sezione}>
              <Link to="/core/impianti-calendari" search={{ sezione: s.sezione }} className="scd-card flex h-full min-h-24 flex-col gap-1 p-3 transition-colors hover:ring-2 hover:ring-[var(--scd-blue)]">
                <s.icon className="size-5 text-primary" aria-hidden="true" />
                <strong className="text-[15px] font-bold leading-tight">{s.label}</strong>
                <span className="text-xs text-muted-foreground">{s.text}</span>
              </Link>
            </li>
          ))}
        </ul>

        <h2 className="mt-8 text-xl font-bold">Persone e ruoli · anteprima</h2>
        <p className="text-sm text-muted-foreground">Schermate Vision 2026: stessa identità visiva, contenuti simulati.</p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-3">
          {PREVIEWS.map((p) => (
            <li key={p.to}>
              <Link to={p.to} className="flex items-center gap-3 rounded-xl surface-deep p-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-white/10"><p.icon className="size-5 text-accent" aria-hidden="true" /></span>
                <span className="min-w-0 flex-1"><strong className="block text-[17px] font-bold leading-tight">{p.label}</strong><small className="text-primary-foreground/75">{p.text}</small></span>
                <ArrowRight className="size-4 shrink-0 text-accent" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>

        <h2 className="mt-8 text-xl font-bold">Aree riservate attive</h2>
        <Link to="/aree" className="scd-card mt-3 flex items-center gap-3 border-2 border-[var(--scd-blue)] p-4">
          <KeyRound className="size-6 shrink-0 text-primary" aria-hidden="true" />
          <span className="min-w-0 flex-1"><strong className="block text-[16px] font-bold">Famiglia · Atleta · Staff · Direzione</strong><small className="text-muted-foreground">Accesso esistente con email e PIN verificati sul gestionale R20.</small></span>
          <ArrowRight className="size-4 shrink-0 text-primary" aria-hidden="true" />
        </Link>
      </div>
      </div>
    </main>
  );
}
