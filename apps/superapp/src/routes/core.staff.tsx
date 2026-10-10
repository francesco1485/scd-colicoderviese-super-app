import { createFileRoute } from "@tanstack/react-router";

import { CoreVisionScreen } from "@/features/vision-2026/CoreVisionScreen";

export const Route = createFileRoute("/core/staff")({
  head: () => ({ meta: [
    { title: "Staff e direzione (anteprima) — SCD CORE · S.C.D. ColicoDerviese" },
    { name: "description", content: "Anteprima dimostrativa dell'area staff nella Super App S.C.D. ColicoDerviese: dati simulati, accesso riservato in arrivo con R20." },
    { name: "robots", content: "noindex" },
  ] }),
  component: () => <CoreVisionScreen id="staff" intro="Una regia, un solo club: gruppi, presenze e agenda dello staff." />,
});
