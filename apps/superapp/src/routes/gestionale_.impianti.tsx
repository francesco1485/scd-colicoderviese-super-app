import { createFileRoute } from "@tanstack/react-router";

import { ImpiantiPage } from "@/components/impianti-campi/ImpiantiPage";
import { getImpiantiAccess } from "@/lib/impianti.functions";

// `gestionale_` keeps this page out of a future /gestionale layout: it renders on its own.
export const Route = createFileRoute("/gestionale_/impianti")({
  staticData: { interior: true },
  loader: () => getImpiantiAccess(),
  head: () => ({
    meta: [
      { title: "Impianti e campi — Gestionale SCD" },
      {
        name: "description",
        content:
          "Campi di Colico e Dervio, rotazioni e simulazioni. Area riservata della S.C.D. ColicoDerviese.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ImpiantiRoute,
});

function ImpiantiRoute() {
  const access = Route.useLoaderData();
  return <ImpiantiPage access={access} />;
}
