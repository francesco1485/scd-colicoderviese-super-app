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
 * Listino partner on /sponsor (item C1). Every package is the same plain card, in listino order (no "pacchetto
 * principale" promo card: no vetrine, Francesco 15/10/2026); packages with a link (none while the tribune seat is
 * internal, UD-132) render as slim lines. Every price is "in approvazione" until the Direzione approves it (sponsor-packages.ts).
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
  "scd-gold scd-focus inline-flex min-h-11 w-full items-center justify-center rounded-[10px] px-4 py-2 text-center font-display text-[15px] font-bold";

/** One club colour per package header (METAL palette: navy, azzurro, sole), so the four cards read apart at a glance. */
const HEAD: Readonly<Record<PackageIcon, string>> = {
  ledwall: "scd-band text-white",
  maglia: "scd-band-azzurro text-white",
  tornei: "scd-band-sole",
  digitale: "scd-band text-white",
  seggiolino: "scd-band-azzurro text-white",
};

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

function Benefits({ items }: { items: readonly string[] }) {
  return (
    <ul className="m-0 list-none space-y-2 p-0 text-[14px] leading-snug text-[#24385a]">
      {items.map((b) => (
        <li key={b} className="flex gap-2">
          <Check className="mt-0.5 size-4 flex-none text-[#0457af]" strokeWidth={2.4} aria-hidden="true" />
          <span>{b}</span>
        </li>
      ))}
    </ul>
  );
}

function Meta({ p }: { p: PartnerPackage }) {
  return (
    <dl className="m-0 grid gap-2 text-[13.5px] leading-snug">
      <div>
        <dt className="font-display text-[11px] font-bold uppercase tracking-[0.1em] text-[#52627f]">Chi lo vede</dt>
        <dd className="m-0 text-[#24385a]">
          {p.audience} <span className="text-[#52627f]">{formatAudienceNumbers(p)}.</span>
        </dd>
      </div>
      <div>
        <dt className="font-display text-[11px] font-bold uppercase tracking-[0.1em] text-[#52627f]">Prezzo</dt>
        <dd className="m-0 font-semibold text-[#14264d]" data-testid={`package-price-${p.id}`}>{formatPackagePrice(p.price)}</dd>
      </div>
    </dl>
  );
}

function PackageCard({ p, onChoose }: { p: PartnerPackage; onChoose: (id: string) => void }) {
  const Icon = ICONS[p.icon];
  return (
    <article aria-labelledby={`pkg-${p.id}`} className="flex min-w-0 flex-col overflow-hidden rounded-[14px] border border-[#d6deeb] bg-white shadow-[0_10px_24px_-18px_rgb(20_38_77/0.7)]" data-testid={`package-${p.id}`}>
      <header className={`${HEAD[p.icon]} flex items-center gap-3 px-4 py-3.5`}>
        <span className="inline-flex size-11 flex-none items-center justify-center rounded-full bg-white/90 text-[#13254d]" aria-hidden="true">
          <Icon className="size-[22px]" strokeWidth={2} />
        </span>
        <h3 id={`pkg-${p.id}`} className="m-0 font-display text-[21px] font-bold uppercase leading-none">{p.title}</h3>
      </header>
      <div className="flex flex-1 flex-col p-4">
        <p className="m-0 text-[14.5px] font-semibold leading-snug text-[#14264d]">{p.summary}</p>
        <div className="mt-3 flex-1">
          <Benefits items={p.benefits} />
        </div>
        <div className="mt-4 border-t border-[#edf1f7] pt-3">
          <Meta p={p} />
        </div>
        <div className="mt-4">
          <ChooseButton p={p} onChoose={onChoose} />
        </div>
      </div>
    </article>
  );
}

function LinkRow({ p }: { p: PartnerPackage }) {
  const Icon = ICONS[p.icon];
  return (
    <article
      aria-labelledby={`pkg-${p.id}`}
      className="flex flex-col gap-4 rounded-[14px] border border-dashed border-[#c3cee0] bg-white p-5 sm:flex-row sm:items-center"
      data-testid={`package-${p.id}`}
    >
      <Icon className="size-7 flex-none text-[#0457af]" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <h3 id={`pkg-${p.id}`} className="text-lg font-bold">{p.title}</h3>
        <p className="m-0 mt-1 text-sm text-[#52627f]">
          {p.summary} {p.benefits.slice(1).join(". ")}. <span className="font-semibold text-[#14264d]">{formatPackagePrice(p.price)}</span>
        </p>
      </div>
      {p.link && (
        <Link to={p.link.to} className="scd-focus inline-flex min-h-11 items-center justify-center rounded-lg border border-[#0457af] px-4 py-2 text-sm font-bold uppercase text-[#0457af]">
          {p.link.label}
        </Link>
      )}
    </article>
  );
}

export function PartnerPackages({ onChoose }: { onChoose: (id: string) => void }) {
  const cards = PARTNER_PACKAGES.filter((p) => !p.link);
  const linked = PARTNER_PACKAGES.filter((p) => p.link);
  return (
    <section id="listino" aria-labelledby="listino-title" className="scroll-mt-20" data-testid="partner-packages">
      <p className="m-0 font-display text-[11px] font-bold uppercase tracking-[0.1em] text-[#0457af] lg:text-[12px]">Listino partner · stagione 2026/27</p>
      <h2 id="listino-title" className="m-0 mt-0.5 font-display text-[24px] font-bold leading-tight text-[#14264d] lg:text-[30px]">Cosa puoi avere come partner</h2>
      <p className="m-0 mt-1 max-w-3xl text-[14px] leading-snug text-[#52627f]">
        {cards.length === 4 ? "Quattro" : cards.length} pacchetti, da soli o insieme. I prezzi sono in approvazione dalla Direzione: chiedi il pacchetto e ti facciamo una proposta.
      </p>

      <div className="mt-4 grid gap-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((p) => <PackageCard key={p.id} p={p} onChoose={onChoose} />)}
        </div>
        {linked.map((p) => <LinkRow key={p.id} p={p} />)}
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
