import { Check, MapPin } from "lucide-react";

import { IdeaScene } from "@/components/IdeaScene";
import {
  PACKAGE_STEPS,
  PARTNER_PACKAGES,
  PROPOSAL_ON_MEASURE,
  formatAudienceNumbers,
  type PackageIcon,
  type PartnerPackage,
} from "@/lib/sponsor-packages";
import type { IdeaScene as Scene } from "@/lib/sponsor-ideas";

/**
 * The four packages on /sponsor as «idee di sponsorizzazione» (Francesco 17/10/2026 09:42: «vanno creati pacchetti ma
 * prezzi non esposti perché li fa al momento il Presidente»). Each card: the picture of where the brand goes, the
 * places as chips, one story line, what the partner gets, who sees it, «Proposta su misura» instead of any price, and
 * one action «Parliamone» → `onChoose(id)`: the page preselects it in the #proposta form (?pacchetto=) and scrolls there.
 * No price, amount or discount is ever rendered (tested in sponsor-public-no-price.test.tsx). No router Link inside:
 * the component renders in SSR tests as is.
 */

const SCENE: Readonly<Record<PackageIcon, Scene>> = {
  ledwall: "led",
  maglia: "maglia",
  tornei: "torneo",
  digitale: "digitale",
  seggiolino: "palestra",
};

export const CTA_CLS =
  "scd-gold scd-focus inline-flex min-h-11 w-full items-center justify-center rounded-[10px] px-4 py-2 text-center font-display text-[16px] font-bold";

/** «Parliamone»: an anchor that still works without JavaScript (?pacchetto=id#proposta). */
export function TalkButton({ id, title, onChoose, testId }: { id: string; title: string; onChoose: (id: string) => void; testId: string }) {
  return (
    <a
      href={`?pacchetto=${id}#proposta`}
      onClick={(e) => {
        e.preventDefault();
        onChoose(id);
      }}
      className={CTA_CLS}
      aria-label={`Parliamone: ${title}`}
      data-testid={testId}
    >
      Parliamone
    </a>
  );
}

/** The line that stands where a price would be. */
export function OnMeasure({ testId }: { testId?: string }) {
  return (
    <p className="m-0 rounded-[10px] bg-[#fff6d6] px-3 py-2 text-[13.5px] font-semibold leading-snug text-[#13254d]" data-testid={testId}>
      {PROPOSAL_ON_MEASURE}
    </p>
  );
}

function Benefits({ items }: { items: readonly string[] }) {
  return (
    <ul className="m-0 list-none space-y-1.5 p-0 text-[14px] leading-snug text-[#24385a]">
      {items.map((b) => (
        <li key={b} className="flex gap-2">
          <Check className="mt-0.5 size-4 flex-none text-[#0457af]" strokeWidth={2.4} aria-hidden="true" />
          <span>{b}</span>
        </li>
      ))}
    </ul>
  );
}

const LABEL = "m-0 font-display text-[11px] font-bold uppercase tracking-[0.1em] text-[#52627f]";

function PackageCard({ p, onChoose }: { p: PartnerPackage; onChoose: (id: string) => void }) {
  return (
    <article aria-labelledby={`pkg-${p.id}`} className="flex min-w-0 flex-col overflow-hidden rounded-[14px] border border-[#d6deeb] bg-white shadow-[0_10px_24px_-18px_rgb(20_38_77/0.7)]" data-testid={`package-${p.id}`}>
      <IdeaScene scene={SCENE[p.icon]} label={`Dove compare il tuo marchio: ${p.placements.join(", ")}`} />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <p className="m-0 font-display text-[11px] font-bold uppercase tracking-[0.1em] text-[#0457af]">Idea di sponsorizzazione</p>
          <h3 id={`pkg-${p.id}`} className="m-0 mt-0.5 font-display text-[22px] font-bold uppercase leading-none text-[#14264d]">{p.title}</h3>
        </div>
        <p className="m-0 text-[14.5px] leading-snug text-[#14264d]">{p.story}</p>
        <div>
          <p className={LABEL}>Dove compare il tuo marchio</p>
          <ul className="m-0 mt-1.5 flex list-none flex-wrap gap-1.5 p-0">
            {p.placements.map((x) => (
              <li key={x} className="inline-flex items-center gap-1 rounded-full bg-[#eaf3fd] px-2.5 py-1 text-[12.5px] font-semibold text-[#0457af]">
                <MapPin className="size-3.5" aria-hidden="true" />
                {x}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex-1">
          <p className={`${LABEL} mb-1.5`}>Cosa ottieni</p>
          <Benefits items={p.benefits} />
        </div>
        <div>
          <p className={LABEL}>Chi lo vede</p>
          <p className="m-0 text-[13.5px] leading-snug text-[#24385a]">
            {p.audience} <span className="text-[#52627f]">{formatAudienceNumbers(p)}.</span>
          </p>
        </div>
        <OnMeasure testId={`package-measure-${p.id}`} />
        <TalkButton id={p.id} title={p.title} onChoose={onChoose} testId={`package-cta-${p.id}`} />
      </div>
    </article>
  );
}

export function PartnerPackages({ onChoose }: { onChoose: (id: string) => void }) {
  const cards = PARTNER_PACKAGES.filter((p) => !p.link);
  return (
    <section id="listino" aria-labelledby="listino-title" className="scroll-mt-20" data-testid="partner-packages">
      <p className="m-0 font-display text-[11px] font-bold uppercase tracking-[0.1em] text-[#0457af] lg:text-[12px]">Come esserci · stagione 2026/27</p>
      <h2 id="listino-title" className="m-0 mt-0.5 font-display text-[24px] font-bold leading-tight text-[#14264d] lg:text-[30px]">Quattro modi per esserci</h2>
      <p className="m-0 mt-1 max-w-3xl text-[14px] leading-snug text-[#52627f]">
        Da soli o insieme. Non c'è un listino: ogni proposta la definisce il Presidente con te, su misura per la tua azienda.
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((p) => <PackageCard key={p.id} p={p} onChoose={onChoose} />)}
      </div>

      <div className="mt-8" data-testid="package-steps">
        <h3 className="m-0 font-display text-[20px] font-bold text-[#14264d]">Come funziona, in tre passi</h3>
        <ol className="m-0 mt-3 grid list-none gap-3 p-0 md:grid-cols-3">
          {PACKAGE_STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-3 rounded-[12px] border border-[#d6deeb] bg-white p-4">
              <span className="scd-gold inline-flex size-10 flex-none items-center justify-center rounded-full font-display text-[18px] font-bold" aria-hidden="true">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="m-0 font-bold text-[#14264d]">
                  <span className="sr-only">Passo {i + 1}: </span>
                  {s.title}
                </p>
                <p className="m-0 mt-1 text-[14px] leading-snug text-[#52627f]">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
