import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, FileText, IdCard, Plus, Shirt } from "lucide-react";

import { AreaTabs, DemoSpacer } from "@/components/scd/area";
import { BellAction, DemoStrip, InitialsAvatar, PageHeader, R20Note, RingProgress, SectionHead, Sheet } from "@/components/scd/board";
import { BallIcon, ConeIcon } from "@/components/scd/icons";
import { familyDemo } from "@/features/superapp/demo-content";

export const Route = createFileRoute("/core/famiglia")({
  head: () => ({ meta: [
    { title: "Area Famiglia (anteprima) — SCD CORE · S.C.D. ColicoDerviese" },
    { name: "description", content: "Anteprima grafica dell'Area Famiglia della Super App S.C.D. ColicoDerviese: dati dimostrativi, accesso riservato in arrivo con R20." },
    { name: "robots", content: "noindex" },
  ] }),
  component: AreaFamiglia,
});

const area = { to: "/aree/$area", params: { area: "famiglia" } } as const;

function AreaFamiglia() {
  const f = familyDemo;
  return (
    <main data-screen="famiglia" data-testid="core-vision-family">
      <PageHeader title="Area Riservata" action={<BellAction />} testId="family-header" />
      <Sheet overlap={14}>
        <div className="mx-auto max-w-3xl px-0 pt-[8px] sm:px-[4px]">
          <AreaTabs active="famiglia" tone="yellow" />

          <SectionHead title="I nostri figli" more={{ label: "Gestisci", target: area }} />
          <ul className="grid grid-cols-3 gap-[6px] px-[4px]" aria-label="Figli (dimostrativo)">
            {f.children.map((c) => (
              <li key={c.initials} className="flex flex-col items-center text-center">
                <InitialsAvatar initials={c.initials} size={96} ring="#e3e7ee" />
                <span className="mt-[10px] text-[17px] font-bold leading-tight text-[var(--scd-ink)]">{c.name}</span>
                <span className="text-[16px] text-[var(--scd-ink)]">{c.category}</span>
              </li>
            ))}
            <li className="flex flex-col items-center text-center">
              <Link {...area} aria-label="Aggiungi atleta (accesso R20)" className="flex size-[96px] items-center justify-center rounded-full bg-white text-[var(--scd-ink)] shadow-[0_0_0_4px_#e3e7ee,0_4px_10px_rgb(0_0_0/0.12)]"><Plus className="size-[44px]" strokeWidth={2.2} /></Link>
              <span className="mt-[10px] text-[16px] leading-tight text-[var(--scd-ink)]">Aggiungi<br />atleta</span>
            </li>
          </ul>

          <SectionHead title="Stato pagamenti" more={{ label: "Vedi dettagli", target: area }} />
          <div className="flex items-center gap-[14px] px-[4px]">
            <RingProgress value={f.payments.percent} size={124} label={`Quote versate ${f.payments.percent}% (dato dimostrativo)`} />
            <div className="min-w-0 flex-1">
              <p className="text-[17px] font-bold leading-tight text-[var(--scd-ink)]">{f.payments.title}</p>
              <p className="mt-[2px] text-[15.5px] text-[var(--scd-ink)]">{f.payments.detail}</p>
              <Link {...area} className="mt-[12px] flex h-[42px] items-center justify-center rounded-[9px] bg-[var(--scd-blue)] text-[17px] font-semibold text-white shadow-[0_3px_8px_-2px_rgb(4_87_175/0.5)]">Paga ora</Link>
            </div>
          </div>

          <div className="mt-[14px] grid grid-cols-3 gap-[8px]">
            {f.cards.map((c) => (
              <Link key={c.id} {...area} className="scd-card flex min-h-[150px] flex-col items-center px-[6px] pb-[10px] pt-[14px] text-center">
                <span className="flex h-[52px] items-center">
                  {c.id === "cert" && <span className="flex size-[46px] items-center justify-center rounded-[6px] bg-[#128a2e]"><FileText className="size-[30px] text-white" strokeWidth={2.2} aria-hidden="true" /></span>}
                  {c.id === "kit" && <Shirt className="size-[48px] fill-[#0b2f6a] text-[#ffd600]" strokeWidth={1.4} aria-hidden="true" />}
                  {c.id === "figc" && <IdCard className="size-[46px] text-[#0d1a3a]" strokeWidth={1.9} aria-hidden="true" />}
                </span>
                <span className="mt-[8px] text-[14.5px] font-bold leading-[1.15] text-[var(--scd-ink)]">{c.title}</span>
                <span className="mt-[4px] text-[13px] leading-[1.2] text-[var(--scd-sub)]">{c.sub}</span>
              </Link>
            ))}
          </div>

          <SectionHead title="Prossimi impegni dei figli" more={{ label: "Vedi tutti", target: area }} />
          <ul className="scd-card px-[12px]">
            {f.commitments.map((c) => (
              <li key={c.id}>
                <Link {...area} className="flex items-center gap-[14px] border-b border-[var(--scd-line)] py-[12px]">
                  <span className={`w-[5px] shrink-0 self-stretch rounded-full ${c.kind === "allenamento" ? "bg-[var(--scd-yellow)]" : "bg-[#0a3a9a]"}`} aria-hidden="true" />
                  <span className="flex w-[46px] shrink-0 justify-center">{c.kind === "allenamento" ? <ConeIcon size={42} className="text-[var(--scd-orange)]" /> : <BallIcon size={42} className="text-[#0d1630]" />}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-medium text-[var(--scd-ink)]">{c.when}</span>
                    <span className="block text-[16.5px] font-bold leading-tight text-[var(--scd-ink)]">{c.title}</span>
                    <span className="block text-[14px] text-[var(--scd-sub)]">{c.place}</span>
                  </span>
                  <ChevronRight className="size-[24px] shrink-0 text-[var(--scd-ink)]" strokeWidth={2.4} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
          <R20Note area="famiglia" />
          <DemoSpacer />
        </div>
      </Sheet>
      <DemoStrip />
    </main>
  );
}
