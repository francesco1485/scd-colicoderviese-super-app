import { createFileRoute } from "@tanstack/react-router";

import { FundPage } from "@/components/giving/FundPage";
import { givingHead } from "@/components/giving/backoffice";
import { getFundBoard } from "@/lib/giving.functions";

/**
 * Gestionale Fondo Solidale (UD-113, SCD CORE). Per-person grant «fondo-solidale» (r100 scd_can); "Da attivare" until
 * migration r101 is applied. Never indexed.
 */
export const Route = createFileRoute("/tesoreria_/fondo-solidale")({
  loader: () => getFundBoard({ data: {} }),
  head: () => givingHead("fondo-solidale"),
  component: () => <FundPage initial={Route.useLoaderData()} />,
});
