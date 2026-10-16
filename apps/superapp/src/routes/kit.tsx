import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, Shirt } from "lucide-react";

import {
  PUBLIC_WRAP,
  PublicPageHeader,
} from "@/components/home/PublicPageHeader";
import {
  KITS,
  KIT_AS_OF,
  KIT_SEASON,
  euro,
  supplierOf,
  type Kit,
} from "@/lib/kit-catalog";
import { memberServices } from "@/lib/member-services";
import { PUBLIC_PAGES, pageHead } from "@/lib/share";

/**
 * Kit ufficiale 2026/27 (UD-110 "compra la tua maglia"): the kit packages from config/scd-kit-catalog.v1.json (supplier
 * boards Saglio Sport Cantù / Legea and the Nike "Insieme al Monza" kit), prices exactly as printed on the boards
 * (KEEP_LOCKED, shown untouched). Nothing is sold online: orders and delivery go through the club (member service
 * "kit-2026-27", contact role from config/scd-member-services.v1.json). Supplier phone numbers are not shown here so
 * families are not sent outside the club's ordering flow.
 */
export const Route = createFileRoute("/kit")({
  head: () => pageHead(PUBLIC_PAGES.kit),
  component: KitPage,
});

const asOf = (d: string) =>
  new Intl.DateTimeFormat("it-IT", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${d}T12:00:00Z`));

function KitCard({ kit }: { kit: Kit }) {
  const supplier = supplierOf(kit);
  return (
    <article
      aria-labelledby={`kit-${kit.id}-t`}
      className="flex flex-col overflow-hidden rounded-[16px] bg-white shadow-[0_1px_2px_rgb(11_42_91/0.06),0_8px_24px_-12px_rgb(11_42_91/0.25)]"
      data-testid="kit"
    >
      <a
        href={kit.board}
        target="_blank"
        rel="noopener noreferrer"
        className="scd-focus block border-b border-[#e6edf6] bg-[#f7f9fc]"
        aria-label={`Apri la tavola ufficiale: ${kit.title} (nuova scheda)`}
      >
        <img
          src={kit.board}
          alt={`Tavola ufficiale ${kit.title}`}
          loading="lazy"
          decoding="async"
          className="aspect-[4/3] w-full object-contain p-2"
        />
      </a>
      <div className="flex flex-1 flex-col gap-2 p-4 lg:p-5">
        <div className="flex flex-wrap items-center gap-2">
          {kit.mandatory && (
            <span className="rounded-full bg-[#ffd600] px-2.5 py-1 text-[11px] font-extrabold uppercase leading-none tracking-[0.06em] text-[#0b1e3a]">
              Obbligatorio
            </span>
          )}
          {supplier && (
            <span className="rounded-full bg-[#e6eefa] px-2.5 py-1 text-[11px] font-bold uppercase leading-none tracking-[0.06em] text-[#0b2a5b]">
              {supplier.brand}
            </span>
          )}
        </div>
        <h3
          id={`kit-${kit.id}-t`}
          className="m-0 text-[18px] font-bold leading-tight text-[#0b1e3a]"
        >
          {kit.title}
        </h3>
        <p className="m-0 text-[14px] leading-snug text-[#4a5d7a]">
          {kit.audience}
        </p>
        <ul className="m-0 grid list-none grid-cols-1 gap-1 p-0 text-[13.5px] text-[#24385a] sm:grid-cols-2">
          {kit.items.map((i) => (
            <li key={i.name} className="flex items-start gap-1.5">
              <Check
                className="mt-[3px] size-3.5 shrink-0 text-[#1556c4]"
                strokeWidth={2.4}
                aria-hidden="true"
              />
              <span>{i.name}</span>
            </li>
          ))}
        </ul>
        <p className="m-0 mt-auto flex items-baseline justify-between gap-2 border-t border-[#e6edf6] pt-3">
          <span className="text-[13px] font-semibold uppercase tracking-[0.05em] text-[#5a6b85]">
            Totale kit
          </span>
          <b className="font-uv text-[28px] leading-none text-[#0b2a5b]">
            {euro(kit.total)}
          </b>
        </p>
      </div>
    </article>
  );
}

function KitPage() {
  const service = memberServices("magazzino").find(
    (s) => s.id === "kit-2026-27",
  );
  const contact = service?.contactRole ?? "Segreteria";
  return (
    <main
      data-screen="kit"
      className="min-h-dvh bg-[#eef3f9] pb-10 text-[#0b1e3a]"
    >
      <PublicPageHeader
        eyebrow={`Stagione ${KIT_SEASON}`}
        title="Il kit"
        accent="ufficiale"
      >
        Cosa contiene ogni kit della ColicoDerviese e quanto costa, dalle tavole
        ufficiali del fornitore. Si ordina tramite la società: niente acquisti
        online.
      </PublicPageHeader>
      <div className={`${PUBLIC_WRAP} pt-5 lg:pt-8`}>
        <div className="mb-4 flex flex-col gap-3 rounded-[16px] bg-[#0b2a5b] p-4 text-white sm:flex-row sm:items-center sm:justify-between lg:p-5">
          <p className="m-0 flex items-start gap-3 text-[15px] leading-snug">
            <Shirt
              className="mt-[2px] size-6 shrink-0 text-[#ffd600]"
              strokeWidth={1.8}
              aria-hidden="true"
            />
            <span>
              <b className="font-semibold">Come si ordina:</b> taglie, ordine e
              ritiro passano dal {contact.toLowerCase()} del club.
            </span>
          </p>
          <Link
            to="/contatti"
            className="scd-focus inline-flex h-11 shrink-0 items-center gap-1.5 rounded-[12px] bg-[#ffd600] px-4 text-[15px] font-bold text-[#0b1e3a] hover:brightness-95"
          >
            Chiedi informazioni
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        <h2 className="m-0 pb-3 font-uv text-[24px] uppercase leading-none text-[#0b2a5b] lg:text-[30px]">
          I kit {KIT_SEASON}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {KITS.map((k) => (
            <KitCard key={k.id} kit={k} />
          ))}
        </div>
        <p className="m-0 mt-4 px-1 text-[12.5px] text-[#5a6b85]">
          Prezzi come stampati sulle tavole del fornitore, aggiornati al{" "}
          {asOf(KIT_AS_OF)}. Tavole e marchi appartengono ai rispettivi
          titolari.
        </p>
      </div>
    </main>
  );
}
