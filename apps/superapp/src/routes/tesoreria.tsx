import { createFileRoute } from "@tanstack/react-router";

import { AccessScreenPage, accessHead } from "@/components/scd/AccessScreen";

/** Access screen of area "tesoreria" until its page is built (src/lib/areas.ts ACCESS_SCREEN_IDS). */
export const Route = createFileRoute("/tesoreria")({
  head: () => accessHead("tesoreria"),
  component: () => <AccessScreenPage id="tesoreria" />,
});
