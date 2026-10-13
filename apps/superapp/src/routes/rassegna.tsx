import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Old address of the press review: the page moved to /rassegna-stampa (UD-110). Kept as a permanent redirect so
 * links already shared (and installed shortcuts) keep working.
 */
export const Route = createFileRoute("/rassegna")({
  beforeLoad: () => {
    throw redirect({ to: "/rassegna-stampa", statusCode: 301 });
  },
});
