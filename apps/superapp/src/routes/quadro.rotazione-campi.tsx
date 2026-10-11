import { createFileRoute, redirect } from "@tanstack/react-router";

// Registry alias (quadro-rotazione-campi → impianti): the tool lives in the gestionale.
export const Route = createFileRoute("/quadro/rotazione-campi")({
  beforeLoad: () => {
    throw redirect({ to: "/gestionale/impianti", replace: true });
  },
});
