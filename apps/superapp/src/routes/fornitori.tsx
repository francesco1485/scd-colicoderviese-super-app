import { createFileRoute } from "@tanstack/react-router";

import { PartnerForm } from "@/components/PartnerForm";
import { PageHero } from "@/components/ui-kit";

export const Route = createFileRoute("/fornitori")({
  head: () => ({
    meta: [
      { title: "Proponi prodotti o servizi — SCD ColicoDerviese" },
      { name: "description", content: "Fornitori e aziende: proponi alla S.C.D. ColicoDerviese prodotti, servizi, convenzioni per famiglie e collaborazioni." },
      { property: "og:title", content: "Proponi il tuo prodotto o servizio alla SCD" },
      { property: "og:description", content: "Canale dedicato a fornitori e partner della S.C.D. ColicoDerviese." },
    ],
  }),
  component: () => (
    <main>
      <PageHero eyebrow="Fornitori & partner" title={<>Proponi il tuo <span className="text-accent">prodotto o servizio</span></>}>
        Materiale tecnico, servizi, convenzioni per tesserati e famiglie: la proposta arriva direttamente alla Direzione.
      </PageHero>
      <section className="mx-auto -mt-8 max-w-4xl px-4">
        <PartnerForm tipo="fornitore" />
      </section>
    </main>
  ),
});
