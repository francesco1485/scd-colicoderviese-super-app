import { createFileRoute, redirect } from "@tanstack/react-router";

// Registry alias (rotazione-campi → impianti): the tool lives in the gestionale.
export const Route = createFileRoute("/calendario_/rotazione-campi")({
  beforeLoad: () => {
    throw redirect({ to: "/gestionale/impianti", replace: true });
  },
});
