import { createFileRoute } from "@tanstack/react-router";

import { AccessScreenPage, accessHead } from "@/components/scd/AccessScreen";

/** Access screen of area "club-house" until its page is built (src/lib/areas.ts ACCESS_SCREEN_IDS). */
export const Route = createFileRoute("/tesoreria_/club-house")({
  head: () => accessHead("club-house"),
  component: () => <AccessScreenPage id="club-house" />,
});
