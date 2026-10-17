import { createFileRoute } from "@tanstack/react-router";

import { InteriorShell } from "@/components/scd/InteriorShell";
import { PlatformStarter } from "@/components/scd/Piattaforme";
import { StagingBanner, WorkAreaGateView } from "@/components/scd/work-area-ui";
import { platformBySlug } from "@/lib/piattaforme";
import { getWorkAreaGate } from "@/lib/work-areas.functions";

/** Rail role set: only areas open to every staff role appear (the page itself is behind the work-area gate). */
const PREVIEW_ROLES: ReadonlySet<string> = new Set();
const PLATFORM = platformBySlug("palestra");

/** Starter page of a platform (no page before 17/10/2026): same staff gate as /gestionale. */
export const Route = createFileRoute("/gestionale/piattaforme/palestra")({
  loader: async () => {
    const gate = await getWorkAreaGate({ data: { area: "gestionale" } });
    return { gate, interior: gate.view === "page" };
  },
  head: () => ({
    meta: [
      { title: `${PLATFORM.name} — SCD Dentro · S.C.D. ColicoDerviese` },
      { name: "description", content: `Piattaforma ${PLATFORM.id} del gestionale: ${PLATFORM.purpose}` },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PalestraPageGate,
});

function PalestraPageGate() {
  const { gate } = Route.useLoaderData();
  return (
    <WorkAreaGateView id="gestionale" gate={gate}>
      {gate.preview && <StagingBanner />}
      <InteriorShell title={PLATFORM.name} path={PLATFORM.route} activeAreaId="gestionale" roles={PREVIEW_ROLES} roleLabel="Anteprima staff">
        <PlatformStarter p={PLATFORM} />
      </InteriorShell>
    </WorkAreaGateView>
  );
}
