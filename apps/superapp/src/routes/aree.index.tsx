import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Info } from "lucide-react";

import skyKit from "@/assets/brand/sky-divisa-gara.webp.asset.json";
import { SATELLITE_TONE } from "@/components/scd/satellite-tone";
import { R20_LOGIN_LIVE, SATELLITES, STATUS_LABEL } from "@/lib/satellites";

export const Route = createFileRoute("/aree/")({
  head: () => ({
    meta: [
      { title: "Il tuo ingresso — S.C.D. ColicoDerviese" },
      {
        name: "description",
        content:
          "Un solo accesso alla Super App S.C.D. ColicoDerviese: atleta, famiglia, tifoso, staff, segreteria, tesoreria, pulmini, direzione e sponsor.",
      },
      { property: "og:title", content: "Il tuo ingresso — S.C.D. ColicoDerviese" },
      { property: "og:description", content: "Scegli la tua area: ognuno vede solo quello che gli serve." },
    ],
  }),
  component: Gateway,
});

const GROUPS: { id: string; title: string; text: string; slugs: string[] }[] = [
  { id: "vive", title: "Per chi vive il club", text: "Ragazzi, famiglie e tifosi.", slugs: ["atleta", "famiglia", "tifoso"] },
  { id: "funziona", title: "Per chi lo fa funzionare", text: "Ogni ruolo ha il suo cruscotto.", slugs: ["staff", "segreteria", "tesoreria", "pulmini", "direzione"] },
  { id: "sostiene", title: "Per chi lo sostiene", text: "Aziende e partner del territorio.", slugs: ["sponsor"] },
];

function Gateway() {
  const bySlug = new Map(SATELLITES.map((s) => [s.slug, s]));
  return (
    <main data-screen="gateway" className="bg-[var(--scd-page)] pb-12">
      <header className="relative isolate overflow-hidden bg-[var(--scd-navy)] text-white" data-testid="gateway-hero">
        <div aria-hidden="true" className="scd-kit-stripes absolute inset-0 -z-10" />
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-end gap-4 px-4 pt-5 sm:px-6 lg:pt-10">
          <div className="pb-8 lg:pb-14">
            <h1 className="font-brand mt-6 text-[46px] uppercase leading-[0.92] sm:text-[64px] lg:text-[84px]">
              Il tuo<br />ingresso
            </h1>
            <p className="mt-3 max-w-[34ch] text-[17px] leading-snug text-white/90 sm:text-[19px]">
              Un solo accesso alla Super App. Ognuno entra nella sua area e vede solo quello che gli serve.
            </p>
          </div>
          <figure className="relative -mb-px w-[128px] self-end sm:w-[190px] lg:w-[250px]">
            <div className="rounded-t-[28px] bg-white px-2 pt-3 shadow-[0_-12px_40px_-12px_rgb(0_0_0/0.5)]">
              <img src={skyKit.url} width={skyKit.width} height={skyKit.height} alt="Sky, la mascotte del club, in divisa ufficiale da gara" className="mx-auto h-auto w-full" loading="eager" decoding="async" />
            </div>
          </figure>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {!R20_LOGIN_LIVE && (
          <p role="status" className="mt-4 flex gap-3 rounded-[12px] border border-[#f2d675] bg-[#fffbea] p-3 text-[14.5px] leading-snug text-[#5a4500]" data-testid="gateway-login-status">
            <Info className="mt-[2px] size-5 shrink-0" aria-hidden="true" />
            <span>Gli accessi personali si stanno attivando. Oggi puoi aprire ogni area per vedere cosa conterrà e le anteprime già pronte. Nessun dato personale è visibile senza accesso.</span>
          </p>
        )}

        <div className="lg:grid lg:grid-cols-3 lg:gap-x-8">
          {GROUPS.map((g) => (
            <section key={g.id} aria-labelledby={`grp-${g.id}`} className="mt-7">
              <h2 id={`grp-${g.id}`} className="text-[21px] font-bold text-[var(--scd-ink)]">{g.title}</h2>
              <p className="text-[14px] text-[var(--scd-sub)]">{g.text}</p>
              <ul className="scd-card mt-3 overflow-hidden" data-testid={`gateway-${g.id}`}>
                {g.slugs.map((slug) => {
                  const s = bySlug.get(slug);
                  if (!s) return null;
                  const tone = SATELLITE_TONE[s.tone];
                  return (
                    <li key={s.slug} className="border-b border-[var(--scd-line)] last:border-0">
                      <Link
                        to="/aree/$area"
                        params={{ area: s.slug }}
                        className="group grid grid-cols-[6px_minmax(0,1fr)_auto] items-center gap-3 py-[14px] pr-3 transition-colors hover:bg-[#f7f9fc] focus-visible:bg-[#f7f9fc]"
                        data-area={s.slug}
                      >
                        <span aria-hidden="true" className="h-full min-h-[52px] rounded-r-full" style={{ background: tone.bar }} />
                        <span className="min-w-0">
                          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="text-[18px] font-bold text-[var(--scd-ink)]">{s.name}</span>
                            <span className={`rounded-full px-2 py-[1px] text-[11.5px] font-semibold ${tone.chip}`}>{STATUS_LABEL[s.status]}</span>
                          </span>
                          <span className="mt-[2px] block text-[14.5px] leading-snug text-[#33405a]">{s.promise}</span>
                          <span className="mt-[2px] block text-[12.5px] text-[var(--scd-sub)]">{s.who}</span>
                        </span>
                        <ChevronRight aria-hidden="true" className="size-6 text-[var(--scd-blue)] transition-transform group-hover:translate-x-1 motion-reduce:transition-none" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>

        <p className="mt-8 max-w-[70ch] text-[13px] text-[var(--scd-sub)]">
          Le aree non sono app separate: sono stanze della stessa Super App, con lo stesso accesso. Ruoli e permessi li assegna solo la società; i dati arrivano dai fogli ufficiali del club.
        </p>
      </div>
    </main>
  );
}
