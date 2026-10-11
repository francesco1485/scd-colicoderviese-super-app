import { createFileRoute } from "@tanstack/react-router";

import { AccessScreenPage, accessHead } from "@/components/scd/AccessScreen";

/** Access screen of area "biglietteria" until its page is built (src/lib/areas.ts ACCESS_SCREEN_IDS). */
export const Route = createFileRoute("/tesoreria_/biglietteria")({
  head: () => accessHead("biglietteria"),
  component: () => <AccessScreenPage id="biglietteria" />,
});
