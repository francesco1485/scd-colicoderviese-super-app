import { createFileRoute } from "@tanstack/react-router";

import { CoreVisionScreen } from "@/features/vision-2026/CoreVisionScreen";

export const Route = createFileRoute("/core/famiglia")({
  head: () => ({ meta: [
    { title: "Area famiglia (anteprima) — SCD CORE · S.C.D. ColicoDerviese" },
    { name: "description", content: "Anteprima dimostrativa dell'area famiglia nella Super App S.C.D. ColicoDerviese: dati simulati, accesso riservato in arrivo con R20." },
    { name: "robots", content: "noindex" },
  ] }),
  component: () => <CoreVisionScreen id="family" intro="Insieme, ogni giorno: figli, quote e impegni del nucleo familiare." />,
});
