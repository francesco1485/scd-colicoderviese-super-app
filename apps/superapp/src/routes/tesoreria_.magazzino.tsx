import { createFileRoute } from "@tanstack/react-router";

import { AccessScreenPage, accessHead } from "@/components/scd/AccessScreen";

/** Access screen of area "magazzino-cassa" until its page is built (src/lib/areas.ts ACCESS_SCREEN_IDS). */
export const Route = createFileRoute("/tesoreria_/magazzino")({
  head: () => accessHead("magazzino-cassa"),
  component: () => <AccessScreenPage id="magazzino-cassa" />,
});
