import { createFileRoute } from "@tanstack/react-router";

import { ApprovazioniView } from "@/components/impianti-campi/ApprovazioniView";
import { getBookingProposals } from "@/lib/impianti.functions";

export const Route = createFileRoute("/gestionale_/impianti/approvazioni")({
  loader: () => getBookingProposals(),
  head: () => ({
    meta: [{ title: "Approvazioni · Impianti e campi — Gestionale SCD" }],
  }),
  component: ApprovazioniRoute,
});

function ApprovazioniRoute() {
  const feed = Route.useLoaderData();
  return <ApprovazioniView feed={feed} />;
}
