import { createFileRoute } from "@tanstack/react-router";

import { InfermeriaBoard } from "@/components/scd/InfermeriaBoard";
import { WorkAreaGateView, workAreaHead } from "@/components/scd/work-area-ui";
import { getInfermeria } from "@/lib/infermeria.functions";
import { getWorkAreaGate } from "@/lib/work-areas.functions";

/**
 * Infermeria (board Infermeria.dc.html, structure VR-026): reserved to the staff with the infermeria grant
 * (responsabile-infermeria) and the Direzione, behind the work-area gate. Certificate expiry board (read-only, from the
 * certificate register, one row per athlete), first-aid kits and defibrillators per site. The injuries register is
 * deferred until the consent design (UD-043).
 * Closed gate: only the access screen renders and nothing is read. Health data never leaves this page: no public
 * output, no log, no work-queue title. Until r136 is applied the new sections say so.
 */
export const Route = createFileRoute("/infermeria")({
  loader: async () => {
    const gate = await getWorkAreaGate({ data: { area: "infermeria" } });
    if (gate.view !== "page") return { gate, interior: false as const };
    const data = await getInfermeria();
    return { gate, interior: true as const, data };
  },
  head: ({ loaderData }) => workAreaHead("infermeria", loaderData?.gate),
  component: InfermeriaRoute,
});

function InfermeriaRoute() {
  const d = Route.useLoaderData();
  return (
    <WorkAreaGateView id="infermeria" gate={d.gate}>
      {d.interior && <InfermeriaBoard initial={d.data} preview={d.gate.preview} />}
    </WorkAreaGateView>
  );
}
