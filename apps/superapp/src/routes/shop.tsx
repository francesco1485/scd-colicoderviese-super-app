import { createFileRoute, Link } from "@tanstack/react-router";

import { PageHero } from "@/components/ui-kit";
import { REVENUE_MODULES } from "@/lib/catalog";

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Shop, membership e convenzioni — SCD ColicoDerviese" },
      { name: "description", content: "Shop ufficiale, tessera sostenitore, convenzioni per famiglie e progetti solidali della S.D.C. ColicoDerviese: in arrivo." },
      { property: "og:title", content: "Shop & membership — SCD ColicoDerviese" },
      { property: "og:description", content: "Merchandising, tessera sostenitore e convenzioni in arrivo." },
    ],
  }),
  component: () => (
    <main>
      <PageHero eyebrow="Club store · in arrivo" title={<>Shop, membership <span className="text-accent">e convenzioni</span></>}>
        Stiamo preparando shop ufficiale, tessera sostenitore e convenzioni con i partner locali. Nessun acquisto o pagamento è attivo oggi.
      </PageHero>
      <section className="mx-auto -mt-8 grid max-w-6xl gap-3 px-4 md:grid-cols-4">
        {REVENUE_MODULES.map((m) => (
          <article key={m.id} className="card-premium p-5">
            <span className="rounded bg-muted px-1.5 py-0.5 text-[0.6rem] font-bold uppercase">In preparazione</span>
            <h2 className="mt-3 text-xl font-bold">{m.nome}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{m.desc}</p>
          </article>
        ))}
      </section>
      <section className="mx-auto mt-10 max-w-6xl px-4">
        <Link to="/fornitori" className="surface-deep block rounded-2xl p-6">
          <p className="eyebrow">Attività locali</p>
          <p className="mt-1 font-display text-2xl font-bold uppercase">Offri una convenzione alle famiglie biancoblù →</p>
        </Link>
      </section>
    </main>
  ),
});
