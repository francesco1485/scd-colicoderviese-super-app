import { createFileRoute } from "@tanstack/react-router";

import { AccessScreenPage, accessHead } from "@/components/scd/AccessScreen";

/** Access screen of area "segreteria" until its page is built (src/lib/areas.ts ACCESS_SCREEN_IDS). */
export const Route = createFileRoute("/segreteria")({
  head: () => accessHead("segreteria"),
  component: () => <AccessScreenPage id="segreteria" />,
});
