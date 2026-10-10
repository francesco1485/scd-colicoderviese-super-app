import { createFileRoute } from "@tanstack/react-router";

import { ImpiantiCalendari, SECTION_IDS, type SectionId } from "@/features/impianti/ImpiantiCalendari";

type Search = { sezione?: SectionId | undefined };

export const Route = createFileRoute("/core/impianti-calendari")({
  validateSearch: (s: Record<string, unknown>): Search =>
    SECTION_IDS.includes(s["sezione"] as SectionId) ? { sezione: s["sezione"] as SectionId } : {},
  head: () => ({ meta: [
    { title: "Impianti e Calendari — SCD CORE · S.C.D. ColicoDerviese" },
    { name: "description", content: "Consultazione read-only di campi Colico e Dervio, quadro allenamenti, calendario annuale e rotazione: anteprima, nessun dato live." },
    { property: "og:title", content: "Impianti e Calendari — SCD CORE" },
    { property: "og:description", content: "Anteprima di consultazione fonti: nessun dato live, nessuna scrittura." },
    { name: "robots", content: "noindex" },
  ] }),
  component: ImpiantiRoute,
});

function ImpiantiRoute() {
  const { sezione } = Route.useSearch();
  // key: cambiando ?sezione= dal menu Area club la vista riparte dalla sezione richiesta.
  return <div className="sa-core"><ImpiantiCalendari key={sezione ?? "quadro"} initialSection={sezione ?? "quadro"} /></div>;
}
