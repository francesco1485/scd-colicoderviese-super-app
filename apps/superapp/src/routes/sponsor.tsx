import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BarChart3, HeartHandshake, MonitorSmartphone, Trees } from "lucide-react";
import { useState } from "react";

import { LedwallFacsimile } from "@/components/LedwallFacsimile";
import { CastPresence } from "@/components/scd/CastPresence";
import { PartnerForm } from "@/components/PartnerForm";
import { ShareButton } from "@/components/scd/ShareButton";
import { PartnerPackages } from "@/components/PartnerPackages";
import { SponsorProcess } from "@/components/SponsorProcess";
import { PageHero, heroOverlapCls } from "@/components/ui-kit";
import { SPONSOR_ASSETS } from "@/lib/catalog";
import { romeDay } from "@/lib/public-window";
import { SHARE_PAGES, pageMeta } from "@/lib/share";
import { parsePackageParam } from "@/lib/sponsor-packages";

export const Route = createFileRoute("/sponsor")({
  // ?pacchetto=<id>: a listino package preselected in the proposal form (only known ids, see sponsor-packages.ts).
  validateSearch: (s: Record<string, unknown>): { pacchetto?: string | undefined } => {
    const pacchetto = parsePackageParam(s["pacchetto"]);
    return pacchetto ? { pacchetto } : {};
  },
  // Server time and Rome day for the LED wall preview: rendered on the server, reused on hydration (same first slot).
  loader: () => {
    const nowMs = Date.now();
    return { nowMs, day: romeDay(nowMs) };
  },
  head: () => ({ meta: pageMeta(SHARE_PAGES.sponsor) }),
  component: Sponsor,
});

function Sponsor() {
  const { nowMs, day } = Route.useLoaderData();
  const { pacchetto } = Route.useSearch();
  const navigate = useNavigate({ from: "/sponsor" });
  const [pick, setPick] = useState<string | undefined>(pacchetto);
  /** "Chiedi questo pacchetto": preselect in the form, keep it in the URL (shareable), scroll to the form. */
  const choose = (id: string) => {
    setPick(id);
    void navigate({ search: { pacchetto: id }, replace: true, resetScroll: false });
    const target = document.getElementById("proposta");
    if (!target) return;
    const reduce = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    target.focus({ preventScroll: true });
  };
  return (
    <main>
      <PageHero eyebrow="Commercial Hub · Sponsor & Partner" title={<>Il tuo brand, <span className="text-accent">in campo</span> ogni settimana.</>} action={<ShareButton page={SHARE_PAGES.sponsor} />}>
        Un media sportivo locale: prima squadra, settore giovanile, famiglie e tifosi dell'Alto Lario. Visibilità fisica e digitale, misurabile.
      </PageHero>

      <section className={`${heroOverlapCls} mx-auto grid max-w-6xl grid-cols-3 gap-3 px-4`}>
        {[
          { icon: MonitorSmartphone, t: "App & digitale", d: "Banner, card, ticker, notifiche" },
          { icon: Trees, t: "Campo & territorio", d: "Led, tornei, club house" },
          { icon: BarChart3, t: "Misurabile", d: "Impression, click e lead" },
        ].map((x) => (
          <div key={x.t} className="card-premium p-4">
            <x.icon className="size-5 text-primary" />
            <p className="mt-2 font-display text-sm font-bold uppercase">{x.t}</p>
            <p className="text-xs text-muted-foreground">{x.d}</p>
          </div>
        ))}
      </section>

      <LedwallFacsimile onRequest={() => setPick("ledwall")} day={day} nowMs={nowMs} />

      <PartnerPackages onChoose={choose} />

      {/* UD-121: the Volto sponsor face lives here (listino, "chiedi un pacchetto", "Chiedi a Vera"). */}
      <section id="volto-sponsor" aria-label="Il Volto sponsor" className="mx-auto mt-10 max-w-3xl scroll-mt-20 px-4" data-testid="sponsor-volto">
        <CastPresence id="volto-sponsor" day={day} />
      </section>

      <section className="mx-auto mt-14 max-w-6xl px-4">
        <p className="eyebrow">Asset disponibili</p>
        <h2 className="mt-1 text-3xl font-bold">Inventario partnership</h2>
        <div className="mt-6 grid grid-cols-2 gap-2 md:grid-cols-4">
          {SPONSOR_ASSETS.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-3 text-sm">
              <span className="font-semibold">{a.nome}</span>
              <span className="rounded bg-muted px-1.5 text-[0.6rem] font-bold uppercase">{a.digitale ? "Digitale" : "Fisico"}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Disponibilità di slot e periodi gestita dalla Direzione. Nessun pagamento online attivo: ogni accordo passa da una proposta.</p>
      </section>

      <section className="mx-auto mt-14 max-w-6xl px-4" aria-labelledby="sostieni-title" data-testid="sponsor-sostieni">
        <div className="card-premium flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <HeartHandshake className="size-8 flex-none text-primary" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="eyebrow">Sostieni il club</p>
            <h2 id="sostieni-title" className="mt-1 text-2xl font-bold">Adotta un oggetto o sostieni il Fondo Solidale</h2>
            <p className="m-0 mt-1 text-sm text-muted-foreground">Attrezzature, area giochi, tribuna, palestra e infermeria: la tua azienda può adottare qualcosa di cui il club ha bisogno, o dedicare una sponsorizzazione al Fondo Solidale.</p>
          </div>
          <Link to="/sostieni" className="surface-sun scd-focus inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2 text-sm font-bold uppercase">Vedi cosa serve</Link>
        </div>
      </section>

      {/* B2: partnership process and FAQ, right before the proposal form. */}
      <SponsorProcess />

      <section id="proposta" tabIndex={-1} aria-labelledby="proposta-title" className="mx-auto mt-14 max-w-4xl scroll-mt-20 px-4 focus:outline-none">
        <p className="eyebrow">Richiedi proposta</p>
        <h2 id="proposta-title" className="mt-1 mb-5 text-3xl font-bold">Parliamo del tuo progetto</h2>
        <PartnerForm key={pick} tipo="sponsor" preselect={pick} />
        <p className="mt-4 text-sm text-muted-foreground">
          Sei un fornitore? <Link to="/fornitori" className="scd-focus inline-flex min-h-11 items-center font-semibold text-primary underline">Proponi prodotti o servizi alla SCD</Link>
        </p>
      </section>
    </main>
  );
}
