import { createFileRoute } from "@tanstack/react-router";

import { CoreVisionScreen } from "@/features/vision-2026/CoreVisionScreen";

export const Route = createFileRoute("/core/atleta")({
  head: () => ({ meta: [
    { title: "Area atleta (anteprima) — SCD CORE · S.C.D. ColicoDerviese" },
    { name: "description", content: "Anteprima dimostrativa dell'area atleta nella Super App S.C.D. ColicoDerviese: dati simulati, accesso riservato in arrivo con R20." },
    { name: "robots", content: "noindex" },
  ] }),
  component: () => <CoreVisionScreen id="athlete" intro="Il tuo spazio in squadra: convocazioni, quote e documenti dell'atleta." />,
});
