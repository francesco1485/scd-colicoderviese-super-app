import { createFileRoute } from "@tanstack/react-router";

import { FundHub, HUB_TITLE, parseHubView, type HubView } from "@/components/giving/FundHub";
import { getFundBoard } from "@/lib/giving.functions";

/**
 * Fondo Solidale hub, «piattaforma a sé» (Francesco 16/10/2026). Internal: the same loader and gate as
 * /tesoreria/fondo-solidale (per-person grant «fondo-solidale», r100 scd_can; "Da attivare" until r101 is applied).
 * Not a public prefix (http-policy): private, no-store, never indexed.
 */
export const Route = createFileRoute("/fondo")({
  validateSearch: (s: Record<string, unknown>): { vista?: HubView | undefined } => (s["vista"] === undefined ? {} : { vista: parseHubView(s["vista"]) }),
  loader: () => getFundBoard({ data: {} }),
  head: () => ({
    meta: [
      { title: `${HUB_TITLE} — SCD Dentro · S.C.D. ColicoDerviese` },
      { name: "description", content: "Fondo Solidale: gestione riservata, portale sostenitori e vetrina pubblica." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FondoHubRoute,
});

function FondoHubRoute() {
  const { vista } = Route.useSearch();
  return <FundHub view={parseHubView(vista)} initial={Route.useLoaderData()} />;
}
