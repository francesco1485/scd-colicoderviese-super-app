import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Info } from "lucide-react";

import { SATELLITE_TONE } from "@/components/scd/satellite-tone";
import { DOORS, LOGIN_LABEL } from "@/lib/audiences";
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


function Gateway() {
  const bySlug = new Map(SATELLITES.map((s) => [s.slug, s]));
  return (
    <main data-screen="gateway" className="bg-[var(--scd-page)] pb-12">
      <header className="relative isolate overflow-hidden bg-[var(--scd-navy)] text-white" data-testid="gateway-hero">
        <div aria-hidden="true" data-motif="forte" className="scd-kit-stripes absolute inset-0 -z-10" />
        <div className="mx-auto grid max-w-6xl items-end gap-4 px-4 pt-4 sm:px-6 lg:pt-6">
          <div className="pb-6 lg:pb-8">
            <h1 className="font-brand mt-3 text-[36px] uppercase leading-[0.92] sm:text-[44px] lg:text-[52px]">Il tuo <span className="scd-brush">ingresso</span></h1>
            <p className="mt-2 max-w-[48ch] text-[16px] leading-snug text-white/90 sm:text-[17px]">
              Un solo accesso alla Super App: ognuno entra nella sua area e vede solo quello che gli serve.
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {!R20_LOGIN_LIVE && (
          <p role="status" className="mt-4 flex gap-3 rounded-[12px] border border-[#f2d675] bg-[#fffbea] p-3 text-[14.5px] leading-snug text-[#5a4500]" data-testid="gateway-login-status">
            <Info className="mt-[2px] size-5 shrink-0" aria-hidden="true" />
            <span>
              Chi è registrato dalla società entra con la propria e-mail da <Link to="/accedi" search={{ next: undefined }} className="font-bold underline underline-offset-2">Accedi</Link>. Senza accesso ogni area mostra solo cosa conterrà e le anteprime pubbliche: nessun dato personale.
            </span>
          </p>
        )}

        <div className="lg:grid lg:grid-cols-2 lg:gap-x-8">
          {DOORS.map((g) => (
            <section key={g.id} aria-labelledby={`grp-${g.id}`} className="mt-7" data-door={g.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h2 id={`grp-${g.id}`} className="text-[21px] font-bold text-[var(--scd-ink)]">{g.label}</h2>
                <span className="rounded-full bg-[#eef4ff] px-2.5 py-[2px] text-[12px] font-semibold text-[var(--scd-blue)]">{LOGIN_LABEL[g.login]}</span>
              </div>
              <p className="text-[14.5px] leading-snug text-[#33405a]">{g.promise}</p>
              <p className="text-[12.5px] text-[var(--scd-sub)]">{g.who}</p>
              <ul className="mt-3 grid list-none grid-cols-1 gap-1.5 p-0 sm:grid-cols-2" data-testid={`gateway-tasks-${g.id}`}>
                {g.tasks.map((t) => (
                  <li key={t.to + t.label}>
                    <Link to={t.to as never} className="group flex h-full min-h-[52px] items-center gap-2 rounded-[12px] border border-[var(--scd-line)] bg-white px-3 py-2 transition-colors hover:border-[var(--scd-blue)] focus-visible:border-[var(--scd-blue)]">
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-semibold leading-tight text-[var(--scd-ink)]">{t.label}</span>
                        <span className="block text-[12.5px] leading-snug text-[var(--scd-sub)]">{t.hint}{t.login ? " · con accesso" : ""}</span>
                      </span>
                      <ChevronRight aria-hidden="true" className="size-4 flex-none text-[var(--scd-blue)]" />
                    </Link>
                  </li>
                ))}
              </ul>
              <ul className="scd-card mt-3 overflow-hidden" data-testid={`gateway-${g.id}`}>
                {g.satellites.map((slug) => {
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
