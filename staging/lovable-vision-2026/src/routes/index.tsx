import { createFileRoute, Link } from "@tanstack/react-router";
import { VisualFoundation } from "@/features/visual-foundation/VisualFoundation";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SCD Command Center — Visual Foundation" },
      { name: "description", content: "Staging visivo read only del GESTIONALE SCD e dei macro-template approvati." },
      { property: "og:title", content: "SCD Command Center — Visual Foundation" },
      { property: "og:description", content: "Laboratorio approvativo read only del nuovo GESTIONALE SCD." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return <><div className="border-b border-border bg-sidebar px-4 py-2 text-sidebar-foreground"><Link to="/vision-2026" className="inline-flex min-h-11 items-center gap-3 text-sm font-semibold text-sidebar-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">SCD 2026/27 · Apri il laboratorio visivo <span aria-hidden="true">→</span></Link><span className="ml-4 inline-block text-xs">DEMO_NOT_RUNTIME · DA REVISIONARE</span></div><VisualFoundation /></>;
}