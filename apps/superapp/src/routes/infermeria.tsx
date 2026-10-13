import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarClock, ShieldCheck, TriangleAlert } from "lucide-react";

import crest from "@/assets/brand/logo-scd.png.asset.json";
import { Card } from "@/components/scd/interior-ui";
import {
  EmptyState,
  InsertAction,
  SourcesBox,
  StagingBanner,
  WorkAreaGateView,
  workAreaHead,
} from "@/components/scd/work-area-ui";
import { getWorkAreaGate } from "@/lib/work-areas.functions";

/**
 * Infermeria (board Infermeria.dc.html), audience families: emergency number, how to reach the staff, medical
 * certificate. It never stores symptoms or diagnoses. Booking returns when the staff publishes real hours.
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

function InfermeriaPage({ preview }: { preview: boolean }) {
  return (
    <main
      className="scd-interior bg-[var(--in-ground)] pb-10"
      data-work-area="infermeria"
    >
      <header className="bg-[linear-gradient(160deg,#05427c_0%,#0860A8_60%,#1170c4_100%)] text-white lg:rounded-b-[28px]">
        <div className="mx-auto flex max-w-[1200px] items-start justify-between gap-4 px-4 pb-7 pt-6 sm:px-6 lg:px-10 lg:pb-10 lg:pt-10">
          <div className="min-w-0">
            <h1 className="m-0 font-title text-[46px] font-black leading-[0.95] lg:text-[72px]">
              Infermeria
            </h1>
            <p className="mt-2 max-w-[44ch] text-[16px] leading-snug text-[#d6ebfb] lg:text-[19px]">
              I servizi del club per la salute di chi gioca, e un appuntamento
              quando serve.
            </p>
          </div>
          <img
            src={crest.url}
            alt="Stemma S.C.D. ColicoDerviese"
            width={46}
            height={60}
            className="h-[60px] w-auto flex-none object-contain lg:h-[96px]"
          />
        </div>
      </header>

      <div className="mx-auto flex max-w-[1200px] flex-col gap-[18px] px-4 pt-5 sm:px-6 lg:px-10 lg:pt-7">
        {preview && <StagingBanner />}
        <p
          role="note"
          className="m-0 flex gap-2.5 rounded-2xl bg-[var(--in-crit-bg)] px-4 py-3.5 text-[15px] leading-snug text-[var(--in-crit)]"
        >
          <TriangleAlert
            className="mt-[2px] size-5 flex-none"
            strokeWidth={1.8}
            aria-hidden="true"
          />
          <span>
            <b>In caso di emergenza chiama il 112.</b> L'infermeria del club non
            sostituisce il pronto soccorso.
          </span>
        </p>

        <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[minmax(0,1fr)_440px] lg:items-start">
          <div className="flex min-w-0 flex-col gap-[18px]">
            <section aria-labelledby="inf-servizi">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2
                    id="inf-servizi"
                    className="m-0 font-title text-[30px] font-extrabold leading-none"
                  >
                    Servizi
                  </h2>
                  <p className="mt-1 text-[14px] text-[var(--in-sub)]">
                    Da definire con la Direzione e lo staff sanitario.
                  </p>
                </div>
                <InsertAction id="infermeria" />
              </div>
              <div className="mt-3">
                <EmptyState title="Servizi non ancora pubblicati">
                  L'elenco dei servizi (primo soccorso al campo, controlli con
                  lo staff, dotazioni nei due centri sportivi) compare qui
                  quando la società lo conferma. Fino ad allora non mostriamo
                  proposte come se fossero attive.
                </EmptyState>
              </div>
            </section>
            <SourcesBox id="infermeria" />
          </div>

          <Card
            id="inf-contatti"
            title={
              <span className="font-title text-[28px] font-extrabold">
                Hai bisogno?
              </span>
            }
          >
            <div className="flex flex-col gap-3 px-4 pb-5 sm:px-[18px]">
              <a
                href="tel:112"
                className="flex min-h-14 items-center gap-3 rounded-[12px] bg-[var(--in-crit-bg)] px-4 text-[17px] font-bold text-[var(--in-crit)]"
              >
                <TriangleAlert
                  className="size-6 flex-none"
                  strokeWidth={1.8}
                  aria-hidden="true"
                />
                Emergenza: 112
              </a>
              <Link
                to="/contatti"
                className="flex min-h-14 items-center gap-3 rounded-[12px] bg-[#e7f0fb] px-4 text-[16px] font-bold text-[#0b2a5b]"
              >
                <CalendarClock
                  className="size-6 flex-none"
                  strokeWidth={1.8}
                  aria-hidden="true"
                />
                Chiedi un appuntamento allo staff
              </Link>
              <Link
                to="/documenti"
                className="flex min-h-14 items-center gap-3 rounded-[12px] bg-[#e7f0fb] px-4 text-[16px] font-bold text-[#0b2a5b]"
              >
                <ShieldCheck
                  className="size-6 flex-none"
                  strokeWidth={1.8}
                  aria-hidden="true"
                />
                Certificato medico e documenti
              </Link>
              <p className="m-0 flex gap-2 rounded-xl bg-[var(--in-info-bg)] px-3.5 py-3 text-[14px] leading-snug text-[var(--in-info)]">
                <ShieldCheck
                  className="mt-[1px] size-[18px] flex-none"
                  strokeWidth={1.8}
                  aria-hidden="true"
                />
                Sintomi e diagnosi non si scrivono nell'app: se ne parla di
                persona con lo staff.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
