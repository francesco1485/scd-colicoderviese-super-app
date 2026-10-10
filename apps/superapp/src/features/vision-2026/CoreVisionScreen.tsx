import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { DemoBadge, ReservedNote } from "@/features/superapp/DemoBadge";
import { ScreenPreview } from "./ScreenPreview";
import { visionScreens, type VisionScreenId } from "./screens";
import "./vision.css";

/** Route della Super App per ogni schermata Vision (la Home Vision non è usata: la Home è SCD ONE). */
const ROUTE_FOR: Record<VisionScreenId, "/" | "/calendario" | "/core/atleta" | "/core/famiglia" | "/core/staff" | "/eventi"> = {
  home: "/", calendar: "/calendario", athlete: "/core/atleta", family: "/core/famiglia", staff: "/core/staff", communications: "/eventi",
};

/** Area R20 esistente (email + PIN) corrispondente: nessun nuovo login nella Super App. */
const R20_AREA: Partial<Record<VisionScreenId, "famiglia" | "atleta" | "staff">> = { athlete: "atleta", family: "famiglia", staff: "staff" };

/**
 * Schermata Vision 2026 (Command Center, Lovable ed6cd65) riusata dentro la shell della Super App.
 * Contenuti esclusivamente dimostrativi (`demo` in screens.ts): nessun nome, quota o documento reale.
 */
export function CoreVisionScreen({ id, intro }: { id: "athlete" | "family" | "staff"; intro: string }) {
  const navigate = useNavigate();
  const screen = visionScreens.find((s) => s.id === id)!;
  const area = R20_AREA[id];
  return (
    <main className="vision-page core-vision" data-testid={`core-vision-${id}`}>
      <div className="mx-auto grid max-w-6xl gap-6 px-0 pb-10 pt-4 sm:px-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:pt-8">
        <div className="px-4 sm:px-0 lg:order-2">
          <Link to="/core" className="inline-flex min-h-11 items-center gap-1 text-sm font-bold text-[var(--vision-blue)]"><ArrowLeft className="size-4" /> Area club</Link>
          <div className="mt-1 flex flex-wrap items-center gap-2"><span className="rounded bg-[var(--vision-navy)] px-2 py-0.5 text-[0.72rem] font-bold tracking-wider text-white">SCD CORE · {screen.family}</span><DemoBadge /></div>
          <h1 className="mt-2 font-display text-3xl font-bold uppercase leading-none text-[var(--vision-navy)] sm:text-4xl">{screen.title}</h1>
          <p className="mt-2 text-sm text-[var(--vision-subtle)]">{intro}</p>
          <div className="mt-3 grid gap-2">
            <ReservedNote>Le informazioni personali (atleti, famiglie, quote, documenti) compariranno solo dopo la verifica dell'identità sul gestionale R20.</ReservedNote>
            <p className="text-[13px] text-[var(--vision-subtle)]">Dati simulati · etichetta DEMO su ogni contenuto · nessun salvataggio.</p>
            {area && <Link to="/aree/$area" params={{ area }} className="inline-flex min-h-11 w-fit items-center rounded-lg border-2 border-[var(--vision-blue)] px-4 text-sm font-bold text-[var(--vision-blue)]">Area riservata esistente (email + PIN R20)</Link>}
          </div>
        </div>
        <div className="lg:order-1">
          <ScreenPreview screen={screen} selected onSelect={() => undefined} onNavigate={(to) => { void navigate({ to: ROUTE_FOR[to] }); }} />
        </div>
      </div>
    </main>
  );
}
