import { createFileRoute } from "@tanstack/react-router";

import { BellAction, PageHeader } from "@/components/scd/board";
import { ImpiantiCalendari } from "@/features/impianti/ImpiantiCalendari";
import { isSectionId, type SectionId } from "@/features/impianti/section-ids";
import { getTrainingQuadro } from "@/lib/quadro.functions";

type Search = { sezione?: SectionId | undefined };

export const Route = createFileRoute("/core/impianti-calendari")({
  validateSearch: (s: Record<string, unknown>): Search => (isSectionId(s["sezione"]) ? { sezione: s["sezione"] } : {}),
  // Training quadro from the server, members only (UD-100): never bundled in the browser.
  loader: async () => ({ quadro: (await getTrainingQuadro()).snapshot }),
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
  const { quadro } = Route.useLoaderData();
  // key: cambiando ?sezione= dal menu Area club la vista riparte dalla sezione richiesta.
  return (
    <main data-screen="impianti">
      <PageHeader title="Impianti e calendari" action={<BellAction dot={false} />} testId="impianti-header" />
      <div className="sa-core relative z-[5] -mt-[14px]"><ImpiantiCalendari key={sezione ?? "quadro"} initialSection={sezione ?? "quadro"} quadro={quadro} /></div>
    </main>
  );
}
