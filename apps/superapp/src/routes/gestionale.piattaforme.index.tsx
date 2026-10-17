import { createFileRoute } from "@tanstack/react-router";

import { InteriorShell } from "@/components/scd/InteriorShell";
import { PlatformHub } from "@/components/scd/Piattaforme";
import { StagingBanner, WorkAreaGateView } from "@/components/scd/work-area-ui";
import { HUB_PATH, statusCounts } from "@/lib/piattaforme";
import { getWorkAreaGate } from "@/lib/work-areas.functions";

/** Rail role set: only areas open to every staff role appear (the page itself is behind the work-area gate). */
const PREVIEW_ROLES: ReadonlySet<string> = new Set();

/**
 * Le 26 piattaforme del gestionale (SCD_COMANDI_PERMANENTI §1, Francesco 16/10/2026 22:58): one hub grouped by the
 * 5 sector directors, same staff gate as /gestionale. Data: src/lib/piattaforme.ts (no personal data).
 */
export const Route = createFileRoute("/gestionale/piattaforme/")({
  loader: async () => {
    const gate = await getWorkAreaGate({ data: { area: "gestionale" } });
    return { gate, interior: gate.view === "page" };
  },
  head: () => ({
    meta: [
      { title: "Le 26 piattaforme — SCD Dentro · S.C.D. ColicoDerviese" },
      {
        name: "description",
        content: "Le 26 piattaforme del gestionale divise nei 5 settori: cosa fa ognuna, a che punto è e dove si apre. Solo per lo staff con accesso.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PiattaformePageGate,
});

function PiattaformePage() {
  const c = statusCounts();
  return (
    <InteriorShell
      title="Le 26 piattaforme"
      path={HUB_PATH}
      activeAreaId="gestionale"
      roles={PREVIEW_ROLES}
      roleLabel="Anteprima staff"
      highlights={[
        { value: c.live, label: "attive" },
        { value: c.parziale, label: "in parte" },
        { value: c["in-costruzione"], label: "in costruzione" },
      ]}
    >
      <PlatformHub />
    </InteriorShell>
  );
}

/** Staff only (Direzione 15/10/2026): without an allowed session the area's access screen, never the preview. */
function PiattaformePageGate() {
  const { gate } = Route.useLoaderData();
  return (
    <WorkAreaGateView id="gestionale" gate={gate}>
      {gate.preview && <StagingBanner />}
      <PiattaformePage />
    </WorkAreaGateView>
  );
}
