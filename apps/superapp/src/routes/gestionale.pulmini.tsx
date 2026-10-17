import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Piattaforma 01 · Servizio pulmini inside the gestionale: one page only, /pulmini (the link the drivers and the
 * Responsabile servizio pulmini already use). This address keeps the gestionale naming working without a second page.
 */
export const Route = createFileRoute("/gestionale/pulmini")({
  beforeLoad: () => {
    throw redirect({ to: "/pulmini", statusCode: 302 });
  },
});
