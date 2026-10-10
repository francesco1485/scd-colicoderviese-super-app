import { createFileRoute } from "@tanstack/react-router";
import { Bus, ClipboardList, CreditCard, FileText, IdCard, Mail, Shield, UserRound } from "lucide-react";

import { AreaTabs, DemoSpacer } from "@/components/scd/area";
import { BellAction, CheckCircle, Crest, DateBlock, DemoStrip, IconTile, InitialsAvatar, OpponentShield, PageHeader, R20Note, SectionHead, Sheet, StatusPill } from "@/components/scd/board";
import { CalendarGridIcon } from "@/components/scd/icons";
import { athleteDemo } from "@/features/superapp/demo-content";

export const Route = createFileRoute("/core/atleta")({
  head: () => ({ meta: [
    { title: "Area Atleta (anteprima) — SCD CORE · S.C.D. ColicoDerviese" },
    { name: "description", content: "Anteprima grafica dell'Area Atleta della Super App S.C.D. ColicoDerviese: dati dimostrativi, accesso riservato in arrivo con R20." },
    { name: "robots", content: "noindex" },
  ] }),
  component: AreaAtleta,
});

const ink = "text-[#0d1a3a]";

function AreaAtleta() {
  const a = athleteDemo;
  return (
    <main data-screen="atleta" data-testid="core-vision-athlete">
      <PageHeader title="Area Atleta" action={<BellAction />} testId="athlete-header" />
      <Sheet overlap={14}>
        <div className="mx-auto max-w-3xl px-0 pt-[8px] sm:px-[4px]">
          <AreaTabs active="atleta" />

          <section className="relative -mx-[4px] mt-[12px] overflow-hidden rounded-[12px] bg-gradient-to-br from-[#0a3f86] via-[#063574] to-[#022a5e] px-[10px] py-[14px] text-white shadow-[var(--scd-card-shadow)]" aria-label="Profilo atleta (dimostrativo)">
            <div className="flex items-center gap-[16px]">
              <InitialsAvatar initials={a.initials} size={124} />
              <div className="min-w-0 flex-1 pr-[64px]">
                <p className="text-[26px] font-bold leading-tight">{a.name}</p>
                <p className="mt-[3px] text-[19px] font-semibold leading-tight">{a.category}</p>
                <p className="mt-[2px] text-[18px] leading-tight text-white/90">{a.role}</p>
                <StatusPill className="mt-[10px]">Tesserato</StatusPill>
              </div>
            </div>
            <Shield className="absolute right-[18px] top-[14px] size-[38px] text-[#2f6fc4]" strokeWidth={1.8} aria-hidden="true" />
            <span className="font-brand absolute bottom-[12px] right-[14px] text-[70px] leading-none text-[#dbe7f7]" aria-label={`Numero di maglia ${a.number} (demo)`}>{a.number}</span>
          </section>

          <nav className="mt-[12px] grid grid-cols-3 gap-[8px]" aria-label="Funzioni atleta">
            <IconTile label="Convocazioni" icon={<CalendarGridIcon size={34} className={ink} />} badge={a.badges.convocazioni} target={{ to: "/aree/$area", params: { area: "atleta" } }} className="h-[88px]" />
            <IconTile label="Pagamenti" icon={<CreditCard className={`size-[36px] ${ink}`} strokeWidth={2.3} />} target={{ to: "/aree/$area", params: { area: "atleta" } }} className="h-[88px]" />
            <IconTile label="Documenti" icon={<FileText className={`size-[36px] ${ink}`} strokeWidth={2.3} />} target={{ to: "/aree/$area", params: { area: "atleta" } }} className="h-[88px]" />
            <IconTile label="Messaggi" icon={<Mail className={`size-[36px] ${ink}`} strokeWidth={2.3} />} badge={a.badges.messaggi} target={{ to: "/aree/$area", params: { area: "atleta" } }} className="h-[88px]" />
            <IconTile label="Diario" icon={<Bus className={`size-[36px] ${ink}`} strokeWidth={2.3} />} target={{ to: "/aree/$area", params: { area: "atleta" } }} className="h-[88px]" />
            <IconTile label="Il mio Profilo" icon={<UserRound className={`size-[36px] ${ink}`} strokeWidth={2.3} />} target={{ to: "/aree/$area", params: { area: "atleta" } }} className="h-[88px]" />
          </nav>

          <SectionHead title="Prossima convocazione" more={{ label: "Vedi tutti", target: { to: "/aree/$area", params: { area: "atleta" } } }} />
          <div className="scd-card flex items-stretch gap-[10px] py-[10px] pr-[10px]">
            <span className="w-[5px] shrink-0 rounded-r-full bg-[var(--scd-yellow)]" aria-hidden="true" />
            <span className="flex w-[64px] shrink-0 items-center justify-center"><DateBlock {...a.call.date} size="lg" /></span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-[10px]">
                <Crest height={58} className="drop-shadow-none" />
                <div className="min-w-0 flex-1">
                  <p className="text-[17px] font-bold leading-[1.15] text-[var(--scd-ink)]">ColicoDerviese<br />{a.call.team}</p>
                  <p className="mt-[3px] text-[13.5px] text-[var(--scd-sub)]">{a.call.venue}</p>
                </div>
                <span className="flex shrink-0 flex-col items-center gap-[2px] text-[13px] font-bold text-[var(--scd-ink)]"><OpponentShield name={a.call.opponent} size={36} />{a.call.opponentShort}</span>
              </div>
              <StatusPill className="mt-[8px] uppercase">Convocato</StatusPill>
            </div>
          </div>

          <SectionHead title="I miei documenti" more={{ label: "Vedi tutti", target: { to: "/aree/$area", params: { area: "atleta" } } }} />
          <ul className="scd-card px-[12px]">
            {a.documents.map((d, i) => {
              const Icon = [ClipboardList, IdCard, FileText][i] ?? FileText;
              return (
                <li key={d.title} className="flex items-center gap-[14px] border-b border-[var(--scd-line)] py-[11px] last:border-0">
                  <Icon className={`size-[30px] shrink-0 ${ink}`} strokeWidth={2} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[16px] font-bold leading-tight text-[var(--scd-ink)]">{d.title}</span>
                    <span className="mt-[2px] block text-[14px] text-[var(--scd-sub)]">{d.sub}</span>
                  </span>
                  <CheckCircle label={`${d.title}: stato dimostrativo`} />
                </li>
              );
            })}
          </ul>
          <R20Note area="atleta" />
          <DemoSpacer />
        </div>
      </Sheet>
      <DemoStrip />
    </main>
  );
}
