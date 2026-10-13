import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { FacilityCorrection, FacilityMap } from "@/components/scd/FacilityMap";
import { InteriorShell } from "@/components/scd/InteriorShell";
import { Card, SnapshotNotice, SourceLine } from "@/components/scd/interior-ui";
import { FACILITIES } from "@/lib/facilities";
import { freshnessLabel } from "@/lib/public-snapshots";
import { getTrainingQuadro } from "@/lib/quadro.functions";

/** Role set of this preview: no login yet, so only areas open to every staff role appear in the rail. */
const PREVIEW_ROLES: ReadonlySet<string> = new Set();

export const Route = createFileRoute("/gestionale/mappa")({
  staticData: { interior: true },
  loader: async () => {
    const { quadro: q } = await getTrainingQuadro();
    return { slots: q.slots, quadroUTC: q.generatedUTC };
  },
  head: () => ({
    meta: [
      { title: "Mappa impianti — SCD Dentro · S.C.D. ColicoDerviese" },
      {
        name: "description",
        content:
          "Mappa 2D dei centri di Colico e Dervio: spazi, orari, ingressi, chi può entrare, campi e spogliatoi in uso secondo il quadro allenamenti. Anteprima di sola lettura.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MappaPage,
});

function MappaPage() {
  const { slots, quadroUTC } = Route.useLoaderData();
  const [correctId, setCorrectId] = useState<string | null>(null);
  const spaces = FACILITIES.spaces;
  const missingHours = spaces.filter((s) => s.hours === null).length;
  const missingEntrances = spaces.filter((s) => s.entrances === null).length;

  const propose = (id: string) => {
    setCorrectId(id);
    window.setTimeout(() => {
      const el = document.getElementById("mappa-correggi");
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
      el?.querySelector<HTMLElement>("select, input")?.focus({ preventScroll: true });
    }, 0);
  };

  return (
    <InteriorShell
      title="Mappa impianti"
      path="/gestionale/mappa"
      activeAreaId="mappa"
      roles={PREVIEW_ROLES}
      roleLabel="Anteprima staff"
      highlights={[
        { value: spaces.length, label: "spazi nel master impianti e nei board" },
        { value: missingHours, label: "spazi senza orari inseriti" },
        { value: missingEntrances, label: "spazi senza ingresso indicato" },
      ]}
    >
      <div className="flex flex-col gap-[18px]">
        <SnapshotNotice>
          Spazi dal master "16 - SEDI E IMPIANTI" (letto il {FACILITIES.sources.master.read_on.split("-").reverse().join("/")}) · campi e spogliatoi in uso dal
          quadro allenamenti, copia del {freshnessLabel(quadroUTC)}. Sola lettura.
        </SnapshotNotice>

        <FacilityMap mode="staff" slots={slots} onPropose={propose} />

        <div id="mappa-correggi" className="scroll-mt-4">
          <Card
            id="mappa-correggi-card"
            title="Inserisci o correggi"
            sub="Orari, ingressi, regole e ruoli responsabili mancano ancora nel master: proponili qui e incolla la riga nel registro INSERIMENTI."
          >
            <FacilityCorrection spaceId={correctId} onSpaceChange={setCorrectId} />
            <SourceLine>
              Registro: {FACILITIES.sources.corrections_register.label}. Colonne: {FACILITIES.sources.corrections_register.columns.join(", ")}.
            </SourceLine>
          </Card>
        </div>
      </div>
    </InteriorShell>
  );
}
