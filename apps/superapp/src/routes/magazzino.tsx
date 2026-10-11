import { createFileRoute } from "@tanstack/react-router";

import { AccessScreenPage, accessHead } from "@/components/scd/AccessScreen";

/** Access screen of area "magazzino" until its page is built (src/lib/areas.ts ACCESS_SCREEN_IDS). */
export const Route = createFileRoute("/magazzino")({
  head: () => accessHead("magazzino"),
  component: () => <AccessScreenPage id="magazzino" />,
});
