import { createFileRoute } from "@tanstack/react-router";

import { BookingPlanner } from "@/components/impianti-campi/BookingPlanner";
import { useImpianti } from "@/components/impianti-campi/context";

export const Route = createFileRoute("/gestionale_/impianti/nuova")({
  head: () => ({
    meta: [{ title: "Nuova prenotazione · Impianti e campi — Gestionale SCD" }],
  }),
  component: NuovaRoute,
});

function NuovaRoute() {
  const { model, draft, requestedBy } = useImpianti();
  return (
    <BookingPlanner model={model} draftIn={draft} requestedBy={requestedBy} />
  );
}
