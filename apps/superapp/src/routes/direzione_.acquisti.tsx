import { createFileRoute } from "@tanstack/react-router";

import { AccessScreenPage, accessHead } from "@/components/scd/AccessScreen";

/** Access screen of area "acquisti" until its page is built (src/lib/areas.ts ACCESS_SCREEN_IDS). */
export const Route = createFileRoute("/direzione_/acquisti")({
  head: () => accessHead("acquisti"),
  component: () => <AccessScreenPage id="acquisti" />,
});
