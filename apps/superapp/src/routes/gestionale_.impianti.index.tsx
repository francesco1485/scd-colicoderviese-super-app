import { createFileRoute } from "@tanstack/react-router";

import { OverviewView } from "@/components/impianti-campi/OverviewView";

export const Route = createFileRoute("/gestionale_/impianti/")({
  component: OverviewView,
});
