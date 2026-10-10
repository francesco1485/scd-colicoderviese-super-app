import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, Check, MonitorSmartphone, Trees } from "lucide-react";
import { useState } from "react";

import { PartnerForm } from "@/components/PartnerForm";
import { PageHero } from "@/components/ui-kit";
import { SPONSOR_ASSETS, SPONSOR_PACKAGES } from "@/lib/catalog";

export const Route = createFileRoute("/sponsor")({
  head: () => ({
    meta: [
      { title: "Diventa Sponsor — Commercial Hub | SCD ColicoDerviese" },
      { name: "description", content: "Pacchetti Naming Event, Main Partner, Team, Digital, Local e Sponsor Tecnico: porta il tuo brand in campo con la S.D.C. ColicoDerviese." },
      { property: "og:title", content: "Diventa Sponsor della SCD ColicoDerviese" },
      { property: "og:description", content: "Commercial Hub: pacchetti, asset digitali e fisici, richiesta proposta." },
    ],
  }),
  component: Sponsor,
});

function Sponsor() {
  const [pick, setPick] = useState<string | undefined>();
  return (
    <main>
      <PageHero eyebrow="Commercial Hub · Sponsor & Partner" title={<>Il tuo brand, <span className="text-accent">in campo</span> ogni settimana.</>}>
        Un media sportivo locale: prima squadra, settore giovanile, famiglie e tifosi dell'Alto Lario. Visibilità fisica e digitale, misurabile.
      </PageHero>

      <section className="mx-auto -mt-8 grid max-w-6xl grid-cols-3 gap-3 px-4">
        {[
          { icon: MonitorSmartphone, t: "App & digitale", d: "Banner, card, ticker, notifiche" },
          { icon: Trees, t: "Campo & territorio", d: "Led, tornei, club house" },
          { icon: BarChart3, t: "Misurabile", d: "Impression, click e lead" },
        ].map((x) => (
          <div key={x.t} className="card-premium p-4">
            <x.icon className="size-5 text-primary" />
            <p className="mt-2 font-display text-sm font-bold uppercase">{x.t}</p>
            <p className="text-xs text-muted-foreground">{x.d}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto mt-14 max-w-6xl px-4">
        <p className="eyebrow">Pacchetti</p>
        <h2 className="mt-1 text-3xl font-bold">Scegli il livello di partnership</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {SPONSOR_PACKAGES.map((p) => (
            <article key={p.id} className={`flex flex-col rounded-2xl p-5 ${p.tier === "Top" ? "surface-deep shadow-premium" : "card-premium"}`}>
              <p className="eyebrow">{p.tier}</p>
              <h3 className="mt-1 text-2xl font-bold">{p.nome}</h3>
              <p className="mt-2 text-sm opacity-80">{p.pitch}</p>
              <ul className="mt-4 flex-1 space-y-1.5 text-sm">
                {p.include.map((i) => <li key={i} className="flex gap-2"><Check className="size-4 text-accent" />{i}</li>)}
              </ul>
              <p className="mt-4 text-xs opacity-70">Valore su proposta personalizzata</p>
              <a href="#proposta" onClick={() => setPick(p.id)} className="surface-sun mt-3 rounded-lg px-4 py-2 text-center text-sm font-bold uppercase">Richiedi proposta</a>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-14 max-w-6xl px-4">
        <p className="eyebrow">Asset disponibili</p>
        <h2 className="mt-1 text-3xl font-bold">Inventario partnership</h2>
        <div className="mt-6 grid grid-cols-2 gap-2 md:grid-cols-4">
          {SPONSOR_ASSETS.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-3 text-sm">
              <span className="font-semibold">{a.nome}</span>
              <span className="rounded bg-muted px-1.5 text-[0.6rem] font-bold uppercase">{a.digitale ? "Digitale" : "Fisico"}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Disponibilità di slot e periodi gestita dalla Direzione. Nessun pagamento online attivo: ogni accordo passa da una proposta.</p>
      </section>

      <section id="proposta" className="mx-auto mt-14 max-w-4xl scroll-mt-20 px-4">
        <p className="eyebrow">Richiedi proposta</p>
        <h2 className="mt-1 mb-5 text-3xl font-bold">Parliamo del tuo progetto</h2>
        <PartnerForm key={pick} tipo="sponsor" preselect={pick} />
        <p className="mt-4 text-sm text-muted-foreground">
          Sei un fornitore? <Link to="/fornitori" className="font-semibold text-primary underline">Proponi prodotti o servizi alla SCD</Link>
        </p>
      </section>
    </main>
  );
}
