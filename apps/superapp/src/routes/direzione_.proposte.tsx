import { createFileRoute } from "@tanstack/react-router";

import { ProposalsPage } from "@/components/giving/ProposalsPage";
import { givingHead } from "@/components/giving/backoffice";
import { getProposalBoard } from "@/lib/giving.functions";

/** Proposte di miglioramento, staff triage (UD-113, SCD CORE). Grant «proposte». Never indexed. */
export const Route = createFileRoute("/direzione_/proposte")({
  loader: () => getProposalBoard(),
  head: () => givingHead("proposte"),
  component: () => <ProposalsPage initial={Route.useLoaderData()} />,
});
