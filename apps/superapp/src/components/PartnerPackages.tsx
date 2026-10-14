import { Link } from "@tanstack/react-router";
import { Armchair, Check, MonitorPlay, Shirt, Smartphone, Trophy, type LucideIcon } from "lucide-react";

import {
  PACKAGE_STEPS,
  PARTNER_PACKAGES,
  formatAudienceNumbers,
  formatPackagePrice,
  type PackageIcon,
  type PartnerPackage,
} from "@/lib/sponsor-packages";

/**
 * Listino partner on /sponsor (item C1). Hierarchy, not a wall of equal cards:
 * the LED wall is the main package (wide, deep surface), three packages follow in a row; packages with a link (none while
 * the tribune seat is internal, UD-132) render as slim lines. Every price is "in approvazione" until the Direzione approves it (sponsor-packages.ts).
 * "Chiedi questo pacchetto" calls `onChoose(id)`: the page preselects it in the #proposta form and scrolls there.
 */

const ICONS: Record<PackageIcon, LucideIcon> = {
  ledwall: MonitorPlay,
  maglia: Shirt,
  tornei: Trophy,
  digitale: Smartphone,
  seggiolino: Armchair,
};

const CTA_CLS =
  "surface-sun scd-focus inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2 text-center text-sm font-bold uppercase";

function ChooseButton({ p, onChoose }: { p: PartnerPackage; onChoose: (id: string) => void }) {
  return (
    <a
      href={`?pacchetto=${p.id}#proposta`}
      onClick={(e) => {
        e.preventDefault();
        onChoose(p.id);
      }}
      className={CTA_CLS}
      aria-label={`Chiedi questo pacchetto: ${p.title}`}
      data-testid={`package-cta-${p.id}`}
    >
      Chiedi questo pacchetto
    </a>
  );
}

function Benefits({ items, tone }: { items: readonly string[]; tone: "deep" | "card" }) {
  return (
    <ul className="m-0 list-none space-y-2 p-0 text-sm">
      {items.map((b) => (
        <li key={b} className="flex gap-2">
          <Check className={`mt-0.5 size-4 flex-none ${tone === "deep" ? "text-[#ffd600]" : "text-primary"}`} aria-hidden="true" />
          <span>{b}</span>
        </li>
      ))}
    </ul>
  );
}

function Meta({ p, tone }: { p: PartnerPackage; tone: "deep" | "card" }) {
  const muted = tone === "deep" ? "text-white/80" : "text-muted-foreground";
  return (
    <dl className="m-0 grid gap-2 text-sm">
      <div>
        <dt className={`text-xs font-semibold uppercase tracking-wider ${muted}`}>Chi lo vede</dt>
        <dd className="m-0">
          {p.audience} <span className={muted}>{formatAudienceNumbers(p)}.</span>
        </dd>
      </div>
      <div>
        <dt className={`text-xs font-semibold uppercase tracking-wider ${muted}`}>Prezzo</dt>
        <dd className="m-0 font-semibold" data-testid={`package-price-${p.id}`}>{formatPackagePrice(p.price)}</dd>
      </div>
    </dl>
  );
}

function FeaturedCard({ p, onChoose }: { p: PartnerPackage; onChoose: (id: string) => void }) {
  const Icon = ICONS[p.icon];
  return (
    <article
      aria-labelledby={`pkg-${p.id}`}
      className="surface-deep grid gap-6 rounded-2xl p-5 shadow-premium sm:p-7 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-x-10"
      data-testid={`package-${p.id}`}
    >
      <div className="min-w-0">
        <p className="m-0 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#ffd600]">
          <Icon className="size-4" aria-hidden="true" /> Pacchetto principale
        </p>
        <h3 id={`pkg-${p.id}`} className="mt-2 text-3xl font-bold sm:text-4xl">{p.title}</h3>
        <p className="mt-2 max-w-prose text-base text-white/90">{p.summary}</p>
        <div className="mt-5">
          <Meta p={p} tone="deep" />
        </div>
      </div>
      {/* Phone: benefits before the button. Desktop: benefits in the right column, button under the left text. */}
      <div className="min-w-0 self-start rounded-xl bg-white/[0.07] p-4 ring-1 ring-white/15 sm:p-5 lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <p className="m-0 mb-3 text-xs font-semibold uppercase tracking-wider text-white/80">Cosa comprende</p>
        <Benefits items={p.benefits} tone="deep" />
      </div>
      <div className="lg:col-start-1 lg:row-start-2">
        <ChooseButton p={p} onChoose={onChoose} />
      </div>
    </article>
  );
}

function PackageCard({ p, onChoose }: { p: PartnerPackage; onChoose: (id: string) => void }) {
  const Icon = ICONS[p.icon];
  return (
    <article aria-labelledby={`pkg-${p.id}`} className="card-premium flex min-w-0 flex-col p-5" data-testid={`package-${p.id}`}>
      <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden="true">
        <Icon className="size-5" />
      </span>
      <h3 id={`pkg-${p.id}`} className="mt-3 text-xl font-bold">{p.title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{p.summary}</p>
      <div className="mt-4 flex-1">
        <Benefits items={p.benefits} tone="card" />
      </div>
      <div className="mt-5 border-t border-border pt-4">
        <Meta p={p} tone="card" />
      </div>
      <div className="mt-4">
        <ChooseButton p={p} onChoose={onChoose} />
      </div>
    </article>
  );
}

function LinkRow({ p }: { p: PartnerPackage }) {
  const Icon = ICONS[p.icon];
  return (
    <article
      aria-labelledby={`pkg-${p.id}`}
      className="flex flex-col gap-4 rounded-2xl border border-dashed border-border bg-card p-5 sm:flex-row sm:items-center"
      data-testid={`package-${p.id}`}
    >
      <Icon className="size-7 flex-none text-primary" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <h3 id={`pkg-${p.id}`} className="text-lg font-bold">{p.title}</h3>
        <p className="m-0 mt-1 text-sm text-muted-foreground">
          {p.summary} {p.benefits.slice(1).join(". ")}. <span className="font-semibold text-foreground">{formatPackagePrice(p.price)}</span>
        </p>
      </div>
      {p.link && (
        <Link to={p.link.to} className="scd-focus inline-flex min-h-11 items-center justify-center rounded-lg border border-primary px-4 py-2 text-sm font-bold uppercase text-primary">
          {p.link.label}
        </Link>
      )}
    </article>
  );
}

export function PartnerPackages({ onChoose }: { onChoose: (id: string) => void }) {
  const featured = PARTNER_PACKAGES.filter((p) => p.featured);
  const regular = PARTNER_PACKAGES.filter((p) => !p.featured && !p.link);
  const linked = PARTNER_PACKAGES.filter((p) => !p.featured && p.link);
  return (
    <section id="listino" aria-labelledby="listino-title" className="mx-auto mt-14 max-w-6xl scroll-mt-20 px-4" data-testid="partner-packages">
      <p className="eyebrow">Listino partner · stagione 2026/27</p>
      <h2 id="listino-title" className="mt-1 text-3xl font-bold">Cosa puoi avere come partner</h2>
      <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
        Quattro pacchetti, da soli o insieme. I prezzi sono in approvazione dalla Direzione: chiedi il pacchetto e ti facciamo una proposta.
      </p>

      <div className="mt-6 grid gap-4">
        {featured.map((p) => <FeaturedCard key={p.id} p={p} onChoose={onChoose} />)}
        <div className="grid gap-4 md:grid-cols-3">
          {regular.map((p) => <PackageCard key={p.id} p={p} onChoose={onChoose} />)}
        </div>
        {linked.map((p) => <LinkRow key={p.id} p={p} />)}
      </div>

      <div className="mt-10" data-testid="package-steps">
        <h3 className="text-xl font-bold">Come funziona</h3>
        <ol className="m-0 mt-4 grid list-none gap-3 p-0 md:grid-cols-3">
          {PACKAGE_STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-3 rounded-xl border border-border bg-card p-4">
              <span className="surface-sun inline-flex size-9 flex-none items-center justify-center rounded-full font-display text-base font-bold" aria-hidden="true">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="m-0 font-bold">
                  <span className="sr-only">Passo {i + 1}: </span>
                  {s.title}
                </p>
                <p className="m-0 mt-1 text-sm text-muted-foreground">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
