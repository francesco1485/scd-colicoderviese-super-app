import { createFileRoute } from "@tanstack/react-router";

import {
  useImpianti,
  validateDaySearch,
} from "@/components/impianti-campi/context";
import { SimulazioneTab } from "@/components/impianti-campi/SimulazioneTab";

export const Route = createFileRoute("/gestionale_/impianti/simulazione")({
  validateSearch: validateDaySearch,
  head: () => ({
    meta: [{ title: "Simulazione · Impianti e campi — Gestionale SCD" }],
  }),
  component: SimulazioneRoute,
});

function SimulazioneRoute() {
  const { model } = useImpianti();
  const { giorno } = Route.useSearch();
  return <SimulazioneTab model={model} focusDate={giorno ?? null} />;
}
