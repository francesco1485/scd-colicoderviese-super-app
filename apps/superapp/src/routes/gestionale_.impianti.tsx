import { createFileRoute } from "@tanstack/react-router";

import { ImpiantiLayout } from "@/components/impianti-campi/ImpiantiPage";
import { getImpiantiAccess } from "@/lib/impianti.functions";

// `gestionale_` keeps this area out of the /gestionale page: it renders on its own.
// Child routes (index, colico, dervio, simulazione, nuova, approvazioni) render inside it.
export const Route = createFileRoute("/gestionale_/impianti")({
  staticData: { interior: true },
  loader: () => getImpiantiAccess(),
  head: () => ({
    meta: [
      { title: "Impianti e campi — Gestionale SCD" },
      {
        name: "description",
        content:
          "Campi di Colico e Dervio, rotazioni, simulazioni e prenotazioni. Area riservata della S.C.D. ColicoDerviese.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ImpiantiRoute,
});

function ImpiantiRoute() {
  const access = Route.useLoaderData();
  return <ImpiantiLayout access={access} />;
}
