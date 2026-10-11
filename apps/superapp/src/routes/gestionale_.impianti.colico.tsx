import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { ColicoTab } from "@/components/impianti-campi/ColicoTab";
import {
  useImpianti,
  validateDaySearch,
} from "@/components/impianti-campi/context";

export const Route = createFileRoute("/gestionale_/impianti/colico")({
  validateSearch: validateDaySearch,
  head: () => ({
    meta: [{ title: "Colico · Impianti e campi — Gestionale SCD" }],
  }),
  component: ColicoRoute,
});

function ColicoRoute() {
  const { model } = useImpianti();
  const { giorno } = Route.useSearch();
  const navigate = useNavigate();
  return (
    <ColicoTab
      model={model}
      focusDate={giorno ?? null}
      onSimulate={(d) =>
        void navigate({
          to: "/gestionale/impianti/simulazione",
          search: { giorno: d },
        })
      }
    />
  );
}
