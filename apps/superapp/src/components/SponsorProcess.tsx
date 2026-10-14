import { ChevronDown } from "lucide-react";

import { SPONSOR_FAQ, SPONSOR_PROCESS_STEPS } from "@/lib/sponsor-process";

/**
 * "Come lavoriamo" + "Domande frequenti" on /sponsor (backlog B2). Content is pure data in lib/sponsor-process.ts.
 * Phone: the five steps as a vertical timeline, then the FAQ. Desktop: timeline on the left, FAQ on the right.
 * FAQ uses native <details>/<summary>: keyboard (Enter/Space) and screen-reader state come from the browser.
 */
export function SponsorProcess() {
  return (
    <section className="mx-auto mt-14 max-w-6xl px-4" aria-label="Come lavoriamo e domande frequenti" data-testid="sponsor-process">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12">
        <div className="min-w-0" aria-labelledby="come-lavoriamo-title" role="group">
          <p className="eyebrow">Dalla prima telefonata allo spot in onda</p>
          <h2 id="come-lavoriamo-title" className="mt-1 text-3xl font-bold">Come lavoriamo</h2>
          <ol className="m-0 mt-6 list-none p-0" data-testid="sponsor-process-steps">
            {SPONSOR_PROCESS_STEPS.map((s, i) => {
              const last = i === SPONSOR_PROCESS_STEPS.length - 1;
              return (
                <li key={s.id} id={`processo-${s.id}`} className="relative flex gap-4 pb-6 last:pb-0">
                  {!last && <span className="absolute top-10 bottom-0 left-[1.125rem] w-0.5 -translate-x-1/2 bg-primary/20" aria-hidden="true" />}
                  <span
                    className={`${last ? "surface-sun" : "surface-deep"} relative inline-flex size-9 flex-none items-center justify-center rounded-full font-display text-base font-bold`}
                    aria-hidden="true"
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 pt-1.5">
                    <p className="m-0 font-bold">
                      <span className="sr-only">Passo {i + 1}: </span>
                      {s.title}
                    </p>
                    <p className="m-0 mt-1 text-sm text-muted-foreground">{s.text}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="min-w-0" aria-labelledby="faq-sponsor-title" role="group">
          <p className="eyebrow">Prima di scriverci</p>
          <h2 id="faq-sponsor-title" className="mt-1 text-3xl font-bold">Domande frequenti</h2>
          <div className="mt-6 grid gap-2" data-testid="sponsor-faq">
            {SPONSOR_FAQ.map((f) => (
              <details key={f.id} id={`faq-${f.id}`} className="group rounded-xl border border-border bg-card open:shadow-premium">
                <summary className="scd-focus flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 font-semibold [&::-webkit-details-marker]:hidden">
                  <span className="min-w-0">{f.q}</span>
                  <ChevronDown className="size-5 flex-none text-primary transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
                </summary>
                <p className="m-0 px-4 pt-1 pb-4 text-sm text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
