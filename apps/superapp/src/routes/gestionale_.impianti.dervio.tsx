import { createFileRoute } from "@tanstack/react-router";

import { useImpianti } from "@/components/impianti-campi/context";
import { DervioTab } from "@/components/impianti-campi/DervioTab";

export const Route = createFileRoute("/gestionale_/impianti/dervio")({
  head: () => ({
    meta: [{ title: "Dervio · Impianti e campi — Gestionale SCD" }],
  }),
  component: DervioRoute,
});

function DervioRoute() {
  const { model } = useImpianti();
  return (
    <DervioTab model={model} onTryAuto={() => model.applyPreset("auto")} />
  );
}
