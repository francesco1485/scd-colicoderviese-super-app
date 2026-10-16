import { createFileRoute } from "@tanstack/react-router";

import { PartnerForm } from "@/components/PartnerForm";
import { PageHero, heroOverlapCls } from "@/components/ui-kit";
import { PUBLIC_PAGES, pageHead } from "@/lib/share";

export const Route = createFileRoute("/fornitori")({
  head: () => pageHead(PUBLIC_PAGES.fornitori),
  component: () => (
    <main>
      <PageHero eyebrow="Fornitori & partner" title={<>Proponi il tuo <span className="text-accent">prodotto o servizio</span></>}>
        Materiale tecnico, servizi, convenzioni per tesserati e famiglie: la proposta arriva direttamente alla Direzione.
      </PageHero>
      <section className={`${heroOverlapCls} mx-auto max-w-4xl px-4`}>
        <PartnerForm tipo="fornitore" />
      </section>
    </main>
  ),
});
