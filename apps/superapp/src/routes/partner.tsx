import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDown, ArrowRight, Check, FileText, LineChart, MonitorPlay, Shirt, Trophy, type LucideIcon } from "lucide-react";

import { AccessScreenPage, accessHead } from "@/components/scd/AccessScreen";
import { METAL_LABEL, METAL_WRAP } from "@/components/scd/MetalPageHeader";
import { ClubCrestOfficial } from "@/components/SiteChrome";
import { KIT_BASES } from "@/lib/partner-kit";
import { PARTNER_BENEFITS, PARTNER_SAMPLE } from "@/lib/partner-preview";

/**
 * /partner — before the login a company sees what partners get and a sample of the partner area, clearly labelled
 * «esempio» (Francesco 17/10/2026 08:22: «la piattaforma sponsor… fa pietà»; the old page was only a login wall).
 * Engine: SOLDI. Measured by: presses on «Diventa partner» from this page and partner logins.
 * The access screen itself (login, head, who enters) is unchanged and stays with its owner (AccessScreen, PC chat):
 * this page only adds the preview above it. The sample uses no real partner, no number and no price.
 */
export const Route = createFileRoute("/partner")({
  head: () => accessHead("partner"),
  component: PartnerPage,
});

const BENEFIT_ICON: Readonly<Record<(typeof PARTNER_BENEFITS)[number]["icon"], LucideIcon>> = {
  scheda: FileText,
  led: MonitorPlay,
  maglie: Shirt,
  tornei: Trophy,
  valore: LineChart,
};

const home = KIT_BASES.find((k) => k.id === "home");

function SampleArea() {
  return (
    <figure className="m-0 overflow-hidden rounded-[18px] bg-white text-[#14264d] shadow-[0_24px_50px_-20px_rgb(2_20_51/0.6)]" aria-labelledby="partner-esempio-t" data-testid="partner-sample">
      <div className="flex items-center justify-between gap-2 bg-[#ffd84a] px-4 py-2">
        <span className="font-display text-[12px] font-extrabold uppercase tracking-[0.1em] text-[#13254d]">Esempio · dati non reali</span>
        <span className="text-[12px] font-semibold text-[#13254d]">Area partner</span>
      </div>
      <div className="grid gap-3 p-4">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-[10px] border-2 border-dashed border-[#c3cee0] font-display text-[11px] font-bold uppercase leading-tight text-[#52627f]">
            Logo
          </span>
          <div className="min-w-0">
            <p id="partner-esempio-t" className="m-0 font-display text-[19px] font-bold leading-tight">{PARTNER_SAMPLE.company}</p>
            <p className="m-0 text-[13px] text-[#52627f]">{PARTNER_SAMPLE.season}</p>
          </div>
        </div>
        <ol className="m-0 grid list-none gap-1.5 p-0" aria-label="Stato dello spot LED (esempio)">
          {PARTNER_SAMPLE.spot.map((s) => (
            <li key={s.key} className="flex items-center gap-2 text-[13.5px]">
              <span aria-hidden="true" className={`grid size-6 shrink-0 place-items-center rounded-full ${s.done ? "bg-[#13254d] text-[#ffd84a]" : "border-2 border-[#c3cee0] bg-white"}`}>
                {s.done && <Check className="size-3.5" strokeWidth={3} />}
              </span>
              <span className={s.done ? "font-semibold" : "text-[#52627f]"}>{s.label}</span>
            </li>
          ))}
        </ol>
        {home && (
          <div className="relative overflow-hidden rounded-[12px] bg-[#eef2f8]">
            <img src={home.src} alt="Maglia Home ufficiale della S.C.D. ColicoDerviese, esempio di posizione del marchio partner" width={home.w} height={home.h} loading="lazy" decoding="async" className="block h-auto w-full" />
            <span
              className="absolute grid place-items-center rounded-[6px] border-2 border-dashed border-[#0457af] bg-white/85 text-center font-display text-[10px] font-bold uppercase leading-tight text-[#0457af] lg:text-[12px]"
              style={{
                left: `${home.sponsor.cx - home.sponsor.maxW / 2}%`,
                top: `${home.sponsor.cy - home.sponsor.maxH / 2}%`,
                width: `${home.sponsor.maxW}%`,
                height: `${home.sponsor.maxH}%`,
              }}
            >
              Il tuo marchio
            </span>
          </div>
        )}
        <ul className="m-0 grid list-none grid-cols-2 gap-1.5 p-0">
          {PARTNER_SAMPLE.tiles.map((t) => (
            <li key={t.label} className="rounded-[10px] bg-[#eef4fc] px-2.5 py-2">
              <span className="block font-display text-[11px] font-bold uppercase tracking-[0.08em] text-[#52627f]">{t.label}</span>
              <span className="block text-[13.5px] font-semibold leading-snug">{t.value}</span>
            </li>
          ))}
        </ul>
      </div>
      <figcaption className="border-t border-[#edf1f7] px-4 py-2.5 text-[12px] leading-snug text-[#52627f]">
        Anteprima illustrativa: nell'area vera trovi i dati della tua azienda, visibili solo a te e alla società.
      </figcaption>
    </figure>
  );
}

function PartnerPreview() {
  return (
    <section aria-labelledby="partner-cosa-t" className="scd-band relative overflow-hidden text-white lg:-mr-12 2xl:mr-0" data-testid="partner-preview">
      <span aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(55%_120%_at_92%_0%,rgb(255_216_74/0.18),transparent_70%)]" />
      <div className={`${METAL_WRAP} relative grid gap-6 py-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:items-start lg:gap-12 lg:py-10`}>
        <div className="grid content-start gap-3">
          <div className="flex items-center gap-3">
            <ClubCrestOfficial size={46} className="shrink-0 drop-shadow-[0_8px_16px_rgb(0_0_0/0.45)]" />
            <span className={`${METAL_LABEL} text-[#ffd84a]`}>Per le aziende partner della S.C.D. ColicoDerviese</span>
          </div>
          <h2 id="partner-cosa-t" className="m-0 font-display text-[30px] font-bold uppercase leading-[0.95] lg:text-[46px]">
            Tutto della tua partnership, <span className="text-[#ffd84a]">in un posto solo</span>
          </h2>
          <p className="m-0 max-w-[56ch] text-[15px] leading-snug text-[#dbe5f7]">
            Spot, maglie, tornei e materiali: li prepara la società, tu li vedi, li approvi o chiedi una modifica dall'app.
          </p>
          <ul className="m-0 mt-1 grid list-none gap-2 p-0" data-testid="partner-benefits">
            {PARTNER_BENEFITS.map((b) => {
              const Icon = BENEFIT_ICON[b.icon];
              return (
                <li key={b.icon} className="flex gap-3 rounded-[12px] bg-white/[0.08] p-3 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.14)]">
                  <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-[#ffd84a] text-[#13254d]">
                    <Icon className="size-5" strokeWidth={2} />
                  </span>
                  <span className="grid gap-0.5">
                    <b className="text-[15.5px] font-bold leading-tight">{b.title}</b>
                    <span className="text-[13.5px] leading-snug text-[#dbe5f7]">{b.text}</span>
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="mt-1 flex flex-wrap gap-2">
            <a href="#accesso-partner" className="scd-gold scd-focus inline-flex min-h-12 items-center gap-2 rounded-[12px] px-5 font-display text-[16px] font-bold" data-testid="partner-go-login">
              Sei già partner? Entra
              <ArrowDown className="size-5" aria-hidden="true" />
            </a>
            <Link to="/sponsor" hash="proposta" className="scd-focus inline-flex min-h-12 items-center gap-2 rounded-[12px] bg-white/10 px-4 font-display text-[15px] font-semibold text-white shadow-[inset_0_0_0_2px_rgb(255_255_255/0.45)] hover:bg-white/20" data-testid="partner-become">
              Diventa partner
              <ArrowRight className="size-5" aria-hidden="true" />
            </Link>
          </div>
        </div>
        <SampleArea />
      </div>
    </section>
  );
}

function PartnerPage() {
  return (
    <>
      <PartnerPreview />
      <div id="accesso-partner" className="scroll-mt-16">
        <AccessScreenPage id="partner" />
      </div>
    </>
  );
}
