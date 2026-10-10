import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3, Briefcase, Lock, MonitorSmartphone, Trees } from "lucide-react";

import crest from "@/assets/brand/logo-scd.png.asset.json";
import { BellAction, PageHeader } from "@/components/scd/board";
import { DemoBadge, ReservedNote } from "@/features/superapp/DemoBadge";
import { appFamilies, HERO_PHOTO, visionData } from "@/features/vision-2026/screens";
import { CRM_STAGES, REVENUE_MODULES, SPONSOR_ASSETS, SPONSOR_PACKAGES } from "@/lib/catalog";
import "@/features/vision-2026/vision.css";

export const Route = createFileRoute("/grow")({
  head: () => ({ meta: [
    { title: "Sponsor & Partner — SCD GROW · S.C.D. ColicoDerviese" },
    { name: "description", content: "SCD GROW: pacchetti sponsor, inventario partnership e percorso delle richieste della S.C.D. ColicoDerviese. Nessun marchio pubblicato senza conferma." },
    { property: "og:title", content: "Sponsor & Partner — S.C.D. ColicoDerviese" },
    { property: "og:description", content: "Pacchetti, asset digitali e fisici, richiesta proposta." },
  ] }),
  component: Grow,
});

const grow = appFamilies.find((a) => a.id === "grow")!;

function Grow() {
  const digitali = SPONSOR_ASSETS.filter((a) => a.digitale).length;
  return (
    <main className="pb-10" data-screen="grow">
      <PageHeader title="Sponsor & Partner" action={<BellAction dot={false} />} testId="grow-header" />
      <div className="relative z-[5] -mt-[14px] rounded-t-[18px] bg-[var(--scd-page)]">
      <div className="mx-auto max-w-6xl px-4 pt-[14px] sm:px-6">
        <div className="flex flex-wrap items-center gap-2"><span className="rounded-[6px] bg-[var(--scd-blue)] px-2 py-0.5 text-[0.72rem] font-bold tracking-wider text-white">SCD GROW</span><DemoBadge /></div>
        <p className="mb-4 mt-2 text-[14px] text-[var(--scd-sub)]">Sviluppo commerciale del club e del territorio: pacchetti, asset in campo e in app, richieste di partnership.</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: MonitorSmartphone, t: "App & digitale", d: `${digitali} asset digitali` },
            { icon: Trees, t: "Campo & territorio", d: `${SPONSOR_ASSETS.length - digitali} asset fisici` },
            { icon: BarChart3, t: "Misurabile", d: "Impression, click e lead" },
          ].map((x) => (
            <div key={x.t} className="scd-card p-3">
              <x.icon className="size-5 text-primary" aria-hidden="true" />
              <p className="mt-1.5 font-display text-sm font-bold uppercase leading-tight">{x.t}</p>
              <p className="text-xs text-muted-foreground">{x.d}</p>
            </div>
          ))}
        </div>

        {/* Slot GROW dalla Vision 2026 (Command Center): segnaposto onesti, nessun logo inventato. */}
        <div className="vision-page core-vision mt-6" data-testid="grow-slots">
          <article className={`vision-app is-${grow.id}`} style={{ backgroundImage: `linear-gradient(160deg, color-mix(in oklab, var(--vision-blue) 78%, transparent), var(--vision-navy)), url(${HERO_PHOTO})` }}>
            <img src={crest.url} alt="Stemma ufficiale S.C.D. ColicoDerviese" />
            <h3>{grow.name}</h3>
            <p>{grow.role}</p>
            <div className="vision-grow">{["Partner principale", "Partner tecnico", "Partner territorio"].map((t) => <span key={t}>{t}<small>SLOT DA APPROVARE</small></span>)}</div>
          </article>
          <p className="vision-apps-note">GROW: nessun logo sponsor inventato · catalogo sponsor {visionData.sponsors === null ? "NULL" : ""} · stessa identità di ONE e CORE.</p>
        </div>

        <div className="mt-8 flex items-end justify-between gap-3">
          <div><p className="eyebrow !text-primary">Pacchetti</p><h2 className="text-2xl font-bold">Livelli di partnership</h2></div>
          <Link to="/sponsor" hash="proposta" className="shrink-0 text-sm font-bold text-primary">Richiedi proposta →</Link>
        </div>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {SPONSOR_PACKAGES.map((p) => (
            <li key={p.id} className={`rounded-[14px] p-4 ${p.tier === "Top" ? "surface-deep" : "scd-card"}`}>
              <p className="eyebrow">{p.tier}</p>
              <h3 className="mt-0.5 text-xl font-bold">{p.nome}</h3>
              <p className="mt-1 text-sm opacity-80">{p.pitch}</p>
              <p className="mt-2 text-xs opacity-70">Valore su proposta personalizzata</p>
            </li>
          ))}
        </ul>

        <h2 className="mt-8 text-2xl font-bold">Spazi in Home</h2>
        <div className="-mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">{["Main sponsor", "Partner", "Istituzionali", "Sponsor evento"].map((slot) => <div key={slot} className="flex h-20 min-w-44 shrink-0 flex-col justify-center border border-border bg-card px-5"><span className="text-[0.65rem] font-bold uppercase text-muted-foreground">{slot}</span><span className="font-display text-xl font-bold uppercase text-primary">Sponsor</span></div>)}</div>
        <p className="mt-1 text-xs text-muted-foreground">Spazi disponibili · nessun marchio pubblicato senza conferma.</p>

        <section className="mt-8 rounded-2xl border border-border bg-card p-4" aria-labelledby="crm-title">
          <div className="flex flex-wrap items-center gap-2"><Briefcase className="size-5 text-primary" aria-hidden="true" /><h2 id="crm-title" className="text-xl font-bold">Percorso di una richiesta</h2><DemoBadge /></div>
          <p className="mt-1 text-sm text-muted-foreground">Le fasi del CRM commerciale previste per la Direzione. Nessun lead reale è mostrato qui.</p>
          <ol className="mt-3 flex flex-wrap gap-1.5">{CRM_STAGES.map((s, i) => <li key={s.id} className="rounded-full border border-border bg-secondary px-3 py-1 text-xs font-bold">{i + 1}. {s.label}</li>)}</ol>
          <div className="mt-3"><ReservedNote>Pipeline e contatti dei partner sono visibili solo alla Direzione, tramite l'area riservata R20.</ReservedNote></div>
        </section>

        <h2 className="mt-8 text-2xl font-bold">Moduli commerciali predisposti</h2>
        <ul className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">{REVENUE_MODULES.map((m) => <li key={m.id} className="rounded-xl border border-dashed border-border p-3"><strong className="block text-sm">{m.nome}</strong><span className="text-xs text-muted-foreground">{m.desc}</span><span className="mt-1 flex items-center gap-1 text-[0.65rem] font-bold uppercase text-muted-foreground"><Lock className="size-3" aria-hidden="true" />non attivo</span></li>)}</ul>

        <div className="mt-8 grid gap-2 sm:grid-cols-2">
          <Link to="/sponsor" className="flex items-center justify-between gap-3 rounded-xl surface-sun p-4 font-display text-lg font-bold uppercase">Diventa sponsor <ArrowRight className="size-5" /></Link>
          <Link to="/fornitori" className="flex items-center justify-between gap-3 rounded-xl border-2 border-primary p-4 font-display text-lg font-bold uppercase text-primary">Proponiti come fornitore <ArrowRight className="size-5" /></Link>
        </div>
      </div>
      </div>
    </main>
  );
}
