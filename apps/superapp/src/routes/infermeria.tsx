import { createFileRoute } from "@tanstack/react-router";
import { CalendarClock, ShieldCheck, TriangleAlert } from "lucide-react";

import crest from "@/assets/brand/logo-scd.png.asset.json";
import { Card } from "@/components/scd/interior-ui";
import { EmptyState, InsertAction, SourcesBox, StagingBanner, WorkAreaGateView, workAreaHead } from "@/components/scd/work-area-ui";
import { getWorkAreaGate } from "@/lib/work-areas.functions";

/**
 * Infermeria (board Infermeria.dc.html), audience families: services and booking. It never
 * stores symptoms or diagnoses; booking stays disabled until the staff publishes hours.
 * Keeps the public chrome (family-facing page), so the loader does not mark it interior.
 */
export const Route = createFileRoute("/infermeria")({
  loader: async () => {
    const gate = await getWorkAreaGate({ data: { area: "infermeria" } });
    return { gate, interior: false };
  },
  head: ({ loaderData }) => workAreaHead("infermeria", loaderData?.gate),
  component: InfermeriaRoute,
});

function InfermeriaRoute() {
  const { gate } = Route.useLoaderData();
  return (
    <WorkAreaGateView id="infermeria" gate={gate}>
      <InfermeriaPage preview={gate.preview} />
    </WorkAreaGateView>
  );
}

const fieldCls = "mt-1 flex min-h-11 w-full items-center rounded-[10px] border border-[var(--in-line)] bg-[#f7fbff] px-3 text-[15px] text-[var(--in-sub)]";

function InfermeriaPage({ preview }: { preview: boolean }) {
  return (
    <main className="scd-interior bg-[var(--in-ground)] pb-10" data-work-area="infermeria">
      <header className="bg-[linear-gradient(160deg,#05427c_0%,#0860A8_60%,#1170c4_100%)] text-white lg:rounded-b-[28px]">
        <div className="mx-auto flex max-w-[1200px] items-start justify-between gap-4 px-4 pb-7 pt-6 sm:px-6 lg:px-10 lg:pb-10 lg:pt-10">
          <div className="min-w-0">
            <h1 className="m-0 font-title text-[46px] font-black leading-[0.95] lg:text-[72px]">Infermeria</h1>
            <p className="mt-2 max-w-[44ch] text-[16px] leading-snug text-[#d6ebfb] lg:text-[19px]">I servizi del club per la salute di chi gioca, e un appuntamento quando serve.</p>
          </div>
          <img src={crest.url} alt="Stemma S.C.D. ColicoDerviese" width={46} height={60} className="h-[60px] w-auto flex-none object-contain lg:h-[96px]" />
        </div>
      </header>

      <div className="mx-auto flex max-w-[1200px] flex-col gap-[18px] px-4 pt-5 sm:px-6 lg:px-10 lg:pt-7">
        {preview && <StagingBanner />}
        <p role="note" className="m-0 flex gap-2.5 rounded-2xl bg-[var(--in-crit-bg)] px-4 py-3.5 text-[15px] leading-snug text-[var(--in-crit)]">
          <TriangleAlert className="mt-[2px] size-5 flex-none" strokeWidth={1.8} aria-hidden="true" />
          <span><b>In caso di emergenza chiama il 112.</b> L'infermeria del club non sostituisce il pronto soccorso.</span>
        </p>

        <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[minmax(0,1fr)_440px] lg:items-start">
          <div className="flex min-w-0 flex-col gap-[18px]">
            <section aria-labelledby="inf-servizi">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 id="inf-servizi" className="m-0 font-title text-[30px] font-extrabold leading-none">Servizi</h2>
                  <p className="mt-1 text-[14px] text-[var(--in-sub)]">Da definire con la Direzione e lo staff sanitario.</p>
                </div>
                <InsertAction id="infermeria" />
              </div>
              <div className="mt-3">
                <EmptyState title="Servizi non ancora pubblicati">
                  L'elenco dei servizi (primo soccorso al campo, controlli con lo staff, dotazioni nei due centri sportivi) compare qui quando la società lo conferma. Fino ad allora non mostriamo proposte come se fossero attive.
                </EmptyState>
              </div>
            </section>
            <SourcesBox id="infermeria" />
          </div>

          <Card id="inf-prenota" title={<span className="font-title text-[28px] font-extrabold">Prenota un appuntamento</span>}>
            <form className="flex flex-col gap-3.5 px-4 pb-5 sm:px-[18px]" aria-describedby="inf-prenota-off" onSubmit={(e) => e.preventDefault()}>
              <div>
                <span className="text-[14px] font-semibold">Servizio</span>
                <div className={fieldCls} aria-disabled="true">Servizi da pubblicare</div>
              </div>
              <div>
                <span className="text-[14px] font-semibold">Per chi</span>
                <div className={fieldCls} aria-disabled="true">Atleta della tua famiglia, dopo l'accesso</div>
              </div>
              <div>
                <span className="text-[14px] font-semibold">Giorno e ora</span>
                <div className="mt-1">
                  <EmptyState title="Orari non ancora pubblicati">La prenotazione si attiva appena lo staff inserisce le disponibilità.</EmptyState>
                </div>
              </div>
              <p className="m-0 flex gap-2 rounded-xl bg-[var(--in-info-bg)] px-3.5 py-3 text-[14px] leading-snug text-[var(--in-info)]">
                <ShieldCheck className="mt-[1px] size-[18px] flex-none" strokeWidth={1.8} aria-hidden="true" />
                Non scrivere qui sintomi o diagnosi: ne parli di persona con lo staff. Si salvano solo servizio, giorno e ora.
              </p>
              <button type="submit" disabled className="inline-flex h-12 cursor-not-allowed items-center justify-center gap-2 rounded-[10px] bg-[#e2edf8] text-[17px] font-semibold text-[var(--in-sub)]">
                <CalendarClock className="size-5" strokeWidth={1.8} aria-hidden="true" />
                Prenota
              </button>
              <p id="inf-prenota-off" className="m-0 text-center text-[13.5px] text-[var(--in-sub)]">Prenotazione non attiva: mancano gli orari. Per prenotare servirà l'account SCD della famiglia.</p>
            </form>
          </Card>
        </div>
      </div>
    </main>
  );
}
