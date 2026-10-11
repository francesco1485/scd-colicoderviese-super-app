import { createFileRoute } from "@tanstack/react-router";

import { AccessScreenPage, accessHead } from "@/components/scd/AccessScreen";

/** Access screen of area "partner" until its page is built (src/lib/areas.ts ACCESS_SCREEN_IDS). */
export const Route = createFileRoute("/partner")({
  head: () => accessHead("partner"),
  component: () => <AccessScreenPage id="partner" />,
});
