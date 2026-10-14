import { createFileRoute } from "@tanstack/react-router";

import { DonationsPage } from "@/components/giving/DonationsPage";
import { givingHead } from "@/components/giving/backoffice";
import { getDonationBoard } from "@/lib/giving.functions";

/** Donazioni (UD-113, SCD CORE): money recorded by the treasury, receipts, goods offered. Grant «donazioni». Never indexed. */
export const Route = createFileRoute("/tesoreria_/donazioni")({
  loader: () => getDonationBoard(),
  head: () => givingHead("donazioni"),
  component: () => <DonationsPage initial={Route.useLoaderData()} />,
});
