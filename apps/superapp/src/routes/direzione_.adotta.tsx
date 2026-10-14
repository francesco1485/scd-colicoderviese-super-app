import { createFileRoute } from "@tanstack/react-router";

import { AdoptPage } from "@/components/giving/AdoptPage";
import { givingHead } from "@/components/giving/backoffice";
import { getAdoptBoard } from "@/lib/giving.functions";

/** Adotta un oggetto, catalogue (UD-113, SCD CORE). Grant «adotta». Never indexed. */
export const Route = createFileRoute("/direzione_/adotta")({
  loader: () => getAdoptBoard(),
  head: () => givingHead("adotta"),
  component: () => <AdoptPage initial={Route.useLoaderData()} />,
});
