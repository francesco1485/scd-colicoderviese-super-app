import { Check } from "lucide-react";

import { IdeaScene } from "@/components/IdeaScene";
import { OnMeasure, TalkButton } from "@/components/PartnerPackages";
import { SPONSOR_IDEAS, ideaAudience, type SponsorIdea } from "@/lib/sponsor-ideas";

/**
 * «Idee da sponsorizzare» on /sponsor: one card per real asset of the club (lib/sponsor-ideas.ts), each with the picture
 * of where the brand goes, what it means for the community, what the sponsor gets, who sees it («da confermare» when
 * unknown), the sourced facts, «Proposta su misura» and «Parliamone» → the #proposta form with ?pacchetto=<idea id>.
 * Engine: SOLDI. Measured by: proposals per idea id. No price ever; no router Link (renders in SSR tests).
 */

function IdeaCard({ idea, onChoose }: { idea: SponsorIdea; onChoose: (id: string) => void }) {
  return (
    <article aria-labelledby={`idea-${idea.id}`} className="flex min-w-0 flex-col overflow-hidden rounded-[14px] border border-[#d6deeb] bg-white shadow-[0_10px_24px_-18px_rgb(20_38_77/0.7)]" data-testid={idea.id}>
      <IdeaScene scene={idea.scene} label={`${idea.where}: qui compare il tuo marchio`} className="h-[96px]" />
      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <div>
          <p className="m-0 font-display text-[11px] font-bold uppercase tracking-[0.1em] text-[#0457af]">{idea.where}</p>
          <h3 id={`idea-${idea.id}`} className="m-0 mt-0.5 font-display text-[20px] font-bold leading-tight text-[#14264d]">{idea.title}</h3>
        </div>
        <p className="m-0 text-[14px] leading-snug text-[#24385a]">{idea.community}</p>
        {idea.facts.length > 0 && (
          <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0" aria-label="Dati pubblicati">
            {idea.facts.map((f) => (
              <li key={f} className="rounded-full bg-[#eaf3fd] px-2.5 py-1 text-[12px] font-semibold text-[#0457af]">{f}</li>
            ))}
          </ul>
        )}
        <div className="flex-1">
          <p className="m-0 mb-1 font-display text-[11px] font-bold uppercase tracking-[0.1em] text-[#52627f]">Cosa ottieni</p>
          <ul className="m-0 list-none space-y-1.5 p-0 text-[13.5px] leading-snug text-[#24385a]">
            {idea.gets.map((g) => (
              <li key={g} className="flex gap-2">
                <Check className="mt-0.5 size-4 flex-none text-[#0457af]" strokeWidth={2.4} aria-hidden="true" />
                <span>{g}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="m-0 text-[13px] leading-snug text-[#24385a]">
          <span className="font-display text-[11px] font-bold uppercase tracking-[0.1em] text-[#52627f]">Chi lo vede · </span>
          <span data-known={idea.audience ? "true" : "false"}>{ideaAudience(idea)}</span>
        </p>
        <p className="m-0 text-[11.5px] leading-snug text-[#5b6b85]">Fonte: {idea.source}</p>
        <OnMeasure />
        <TalkButton id={idea.id} title={idea.title} onChoose={onChoose} testId={`idea-cta-${idea.id}`} />
        {idea.sostieni && (
          <a href={idea.sostieni.href} className="scd-focus inline-flex min-h-11 items-center justify-center rounded-[10px] font-display text-[14.5px] font-semibold text-[#0457af] underline">
            {idea.sostieni.label}
          </a>
        )}
      </div>
    </article>
  );
}

export function SponsorIdeas({ onChoose, ideas = SPONSOR_IDEAS }: { onChoose: (id: string) => void; ideas?: readonly SponsorIdea[] }) {
  if (ideas.length === 0) return null;
  return (
    <section id="idee" aria-labelledby="idee-title" className="scroll-mt-20" data-testid="sponsor-ideas">
      <p className="m-0 font-display text-[11px] font-bold uppercase tracking-[0.1em] text-[#0457af] lg:text-[12px]">Una cosa sola, fatta bene</p>
      <h2 id="idee-title" className="m-0 mt-0.5 font-display text-[24px] font-bold leading-tight text-[#14264d] lg:text-[30px]">Idee da sponsorizzare</h2>
      <p className="m-0 mt-1 max-w-3xl text-[14px] leading-snug text-[#52627f]">
        Tornei, pulmini, palestra, infermeria, Fondo Solidale e kit: scegli quello che somiglia alla tua azienda. Ne parli con il Presidente e la proposta la costruite insieme.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {ideas.map((i) => <IdeaCard key={i.id} idea={i} onChoose={onChoose} />)}
      </div>
    </section>
  );
}
