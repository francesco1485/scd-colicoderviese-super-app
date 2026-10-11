import { createFileRoute } from "@tanstack/react-router";

import { AccessScreenPage, accessHead } from "@/components/scd/AccessScreen";

/** Access screen of area "famiglia" until its page is built (src/lib/areas.ts ACCESS_SCREEN_IDS). */
export const Route = createFileRoute("/famiglia")({
  head: () => accessHead("famiglia"),
  component: () => <AccessScreenPage id="famiglia" />,
});
