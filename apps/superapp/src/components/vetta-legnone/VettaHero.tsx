import { ShareButton } from "@/components/scd/ShareButton";
import { VETTA_COUNTERS, VETTA_HERO, VETTA_SHARE } from "@/lib/vetta-legnone";

import { VettaScene } from "./VettaScene";

/** Hero: official crest, name, the line, live counters with source, share; the lake-and-mountain scene beside it. */
export function VettaHero() {
  return (
    <section aria-labelledby="vl-title" className="scd-band relative overflow-hidden text-white" data-hero="vetta">
      <span aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(60%_120%_at_95%_0%,rgb(255_216_74/0.18),transparent_70%),radial-gradient(50%_100%_at_0%_100%,rgb(27_149_211/0.25),transparent_70%)]" />
      <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[2px] bg-[linear-gradient(90deg,#8ea2c6,#ffffff_22%,#b8c5dd_50%,#ffffff_78%,#8ea2c6)]" />
      <div className="relative mx-auto grid max-w-6xl gap-5 px-4 pb-7 pt-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-center lg:gap-10 lg:pb-12 lg:pt-10">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <img src="/media/brand/logo-scd.webp" alt="S.C.D. ColicoDerviese" width={480} height={628} className="h-[52px] w-auto shrink-0 drop-shadow-[0_8px_16px_rgb(0_0_0/0.45)] lg:h-[72px]" />
            <p className="m-0 font-display text-[11.5px] font-bold uppercase leading-tight tracking-[0.1em] text-[#ffd84a] lg:text-[13px]">{VETTA_HERO.kicker}</p>
          </div>
          <h1 id="vl-title" className="m-0 mt-3 font-display text-[44px] font-bold uppercase leading-[0.95] tracking-[0.005em] lg:text-[76px]">
            Vetta <span className="text-[#ffd84a]">Legnone</span>
          </h1>
          <p className="m-0 mt-2 font-display text-[21px] font-semibold leading-[1.15] lg:text-[28px]">{VETTA_HERO.line}</p>
          <p className="m-0 mt-2 max-w-xl text-[14.5px] leading-snug text-[#dbe5f7] lg:text-[16px]">{VETTA_HERO.sub}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <a href="#vl-chi" className="scd-gold scd-focus inline-flex min-h-11 items-center rounded-[12px] px-4 font-display text-[16px] font-bold">
              Inizia la salita
            </a>
            <ShareButton page={VETTA_SHARE} />
          </div>
          <dl className="m-0 mt-5 grid grid-cols-3 gap-2" data-testid="vetta-counters">
            {VETTA_COUNTERS.map((c) => (
              <div key={c.label} className="rounded-[12px] border border-white/15 bg-black/20 px-2.5 py-2" title={`Fonte: ${c.source}`}>
                <dt className="sr-only">{c.label}</dt>
                <dd className="m-0">
                  <b className="block font-display text-[24px] font-bold leading-none text-[#ffd84a] lg:text-[30px]">{c.value}</b>
                  <span className="mt-1 block text-[11.5px] leading-tight text-[#dbe5f7] lg:text-[12.5px]">{c.label}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <VettaScene className="h-auto w-full max-w-[560px] justify-self-center drop-shadow-[0_18px_30px_rgb(0_0_0/0.35)]" />
      </div>
    </section>
  );
}
