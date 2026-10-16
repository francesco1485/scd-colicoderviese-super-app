import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Building2,
  Lightbulb,
  Package,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";

import {
  CampaignCard,
  ItemCard,
  PledgeDialog,
} from "@/components/giving/public";
import { ShareButton } from "@/components/scd/ShareButton";
import { TribuneSeatsSection } from "@/components/giving/TribuneSeats";
import { PageHero, heroOverlapCls } from "@/components/ui-kit";
import {
  ITEM_STATUS_LABEL,
  PROPOSAL_AREA_LABEL,
  PROPOSAL_STATUS_LABEL,
  type PublicItem,
} from "@/lib/giving";
import { getGivingPublic } from "@/lib/giving.functions";
import { pageHead, SHARE_PAGES } from "@/lib/share";
import { INTERNAL_ONLY } from "@/lib/internal-initiatives";
import { findTribuneItem } from "@/lib/tribune-seats";
import { readyActions } from "@/lib/has-content";

/**
 * Sostieni il club (UD-113, SCD ONE): Fondo Solidale, "Adotta un oggetto", campaigns palestra / infermeria (goods),
 * improvement proposals. Public, no payment in the app; no item, amount or name is invented.
 * "Pagine piene" (Francesco 16/10/2026 23:08): a visitor sees only what works today. Until r101 is applied the
 * catalogue, campaigns, tribune and proposal form stay hidden (they would only answer "Da attivare"); the page offers
 * the sponsor proposal, the Fondo Solidale explanation and the secretariat for goods and adoptions.
 */
export const Route = createFileRoute("/sostieni/")({
  loader: () => getGivingPublic(),
  head: () => pageHead(SHARE_PAGES.sostieni),
  component: SostieniPage,
});

/** What a visitor can do today, whether or not the giving engine (r101) is open. */
const TODAY = [
  {
    id: "sponsor",
    icon: Building2,
    t: "Sei un'azienda?",
    d: "Visibilità al campo, sulle maglie e nell'app: proponi un accordo su misura.",
    cta: "Proponi una sponsorizzazione",
    to: "/sponsor",
    hash: "proposta",
  },
  {
    id: "fondo",
    icon: ShieldCheck,
    t: "Fondo Solidale",
    d: "Nessun ragazzo resta fuori per la quota: il Fondo aiuta le famiglie in difficoltà. Domande e decisioni restano riservate.",
    cta: "Come funziona",
    to: "/sostieni/fondo-solidale",
    hash: undefined,
  },
  {
    id: "segreteria",
    icon: Package,
    t: "Materiale e oggetti",
    d: "Attrezzi per la palestra, materiale per l'infermeria o un oggetto da adottare: scrivi alla segreteria.",
    cta: "Contatta la segreteria",
    to: "/contatti",
    hash: undefined,
  },
  {
    id: "proponi",
    icon: Lightbulb,
    t: "Proponi un miglioramento",
    d: "Campi, palestra, infermeria, club house, sicurezza: scrivici, anche senza nome.",
    cta: "Proponi",
    to: "/sostieni/proponi",
    hash: undefined,
  },
] as const;

function SostieniPage() {
  const { engine, data } = Route.useLoaderData();
  const active = engine === "applied" && data !== null;
  const [pledge, setPledge] = useState<{
    item: PublicItem;
    unit: number | null;
  } | null>(null);
  const allItems = data?.items ?? [];
  // C2 "Adotta un seggiolino": the tribune is an item of the same catalogue, shown in its own section with the seat map.
  const tribune = findTribuneItem(allItems);
  const items = allItems.filter((i) => i !== tribune);
  // Only what works today: the secretariat while the online catalogue is closed, the proposal form once it is open.
  const today = readyActions(
    TODAY.map((a) => ({
      ...a,
      ready: a.id === "segreteria" ? !active : a.id === "proponi" ? active : true,
    })),
  );
  return (
    <main>
      <PageHero
        eyebrow="Sostieni il club"
        title={
          <>
            Aiutaci a <span className="text-accent">crescere</span>, come puoi.
          </>
        }
        clamp={false}
        action={<ShareButton page={SHARE_PAGES.sostieni} />}
      >
        Cose di cui la S.C.D. ColicoDerviese ha bisogno, materiale da donare, il
        Fondo Solidale e le tue proposte. L'app non incassa nulla: i versamenti
        passano dalla Tesoreria.
      </PageHero>

      <section
        aria-label="Cosa puoi fare oggi"
        className={`${heroOverlapCls} mx-auto grid max-w-6xl grid-cols-1 gap-3 px-4 sm:grid-cols-3`}
        data-testid="sostieni-today"
      >
        {today.map((x) => (
          <Link
            key={x.id}
            to={x.to}
            {...(x.hash ? { hash: x.hash } : {})}
            className="scd-focus group flex flex-col rounded-[20px] bg-white p-4 shadow-premium transition-shadow hover:shadow-[0_8px_22px_rgb(11_42_91/0.16)] sm:p-5"
            data-testid={`sostieni-today-${x.id}`}
          >
            <span aria-hidden="true" className="scd-band grid size-10 place-items-center rounded-[12px] text-[#ffd84a]">
              <x.icon className="size-5" />
            </span>
            <b className="mt-3 block text-[17px] leading-tight text-[#13254d]">{x.t}</b>
            <span className="mt-1 block flex-1 text-[14px] leading-snug text-[#3e5272]">{x.d}</span>
            <span className="mt-3 inline-flex items-center gap-1 text-[14.5px] font-bold text-[#0457af]">
              {x.cta}
              <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">›</span>
            </span>
          </Link>
        ))}
      </section>

      {active && tribune && !INTERNAL_ONLY.seatAdoption && (
        <TribuneSeatsSection
          item={tribune}
          active={active}
          onAdopt={(unit) => setPledge({ item: tribune, unit })}
        />
      )}

      {active && items.length > 0 && (
        <section
          className="mx-auto mt-14 max-w-6xl px-4"
          aria-labelledby="adotta-title"
        >
          <p className="eyebrow">Adotta un oggetto</p>
          <h2 id="adotta-title" className="mt-1 text-3xl font-bold">
            Cose di cui il club ha bisogno
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Ogni oggetto ha prezzo o «da preventivo», fornitore e stato:{" "}
            {(["DA_ADOTTARE", "IN_RACCOLTA", "ADOTTATO", "CONSEGNATO"] as const)
              .map((st) => ITEM_STATUS_LABEL[st].toLowerCase())
              .join(", ")}
            . Più persone possono adottare lo stesso oggetto; alcuni sono
            divisi in unità.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {items.map((i) => (
              <ItemCard
                key={i.id}
                item={i}
                onAdopt={(it) => setPledge({ item: it, unit: null })}
              />
            ))}
          </div>
        </section>
      )}

      {active && (
      <section
        className="mx-auto mt-14 max-w-6xl px-4"
        aria-labelledby="campagne-title"
      >
        <p className="eyebrow">Campagne</p>
        <h2 id="campagne-title" className="mt-1 text-3xl font-bold">
          Dona materiale in buono stato
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <CampaignCard
            campaign="PALESTRA"
            received={data?.campaigns.PALESTRA.received ?? null}
            active={active}
          />
          <CampaignCard
            campaign="INFERMERIA"
            received={data?.campaigns.INFERMERIA.received ?? null}
            active={active}
          />
        </div>
      </section>
      )}


      {data && data.proposals.length > 0 && (
        <section
          className="mx-auto mt-14 max-w-6xl px-4"
          aria-labelledby="proposte-title"
        >
          <p className="eyebrow">Dalle vostre proposte</p>
          <h2 id="proposte-title" className="mt-1 text-3xl font-bold">
            Su cosa stiamo lavorando
          </h2>
          <ul className="mt-6 grid list-none gap-3 p-0 md:grid-cols-2">
            {data.proposals.map((p) => (
              <li key={p.code} className="card-premium p-4">
                <p className="eyebrow">
                  {PROPOSAL_AREA_LABEL[p.area]} ·{" "}
                  {PROPOSAL_STATUS_LABEL[p.status]}
                </p>
                <h3 className="mt-1 text-lg font-bold">{p.title}</h3>
                <p className="m-0 mt-1 text-sm text-muted-foreground">
                  {p.text}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mx-auto mb-16 mt-14 max-w-4xl px-4">
        <p className="flex items-start gap-2 rounded-xl bg-muted px-4 py-3 text-sm">
          <ShieldCheck
            className="mt-0.5 size-4 flex-none text-primary"
            aria-hidden="true"
          />
          <span>
            Donare non dà diritto a tessere, ruoli o posti in squadra. Chi dona
            sceglie se comparire con il nome, restare anonimo in pubblico o
            completamente anonimo. Nessun volto o nome di ragazzi in queste
            pagine.
          </span>
        </p>
      </section>

      {pledge && (
        <PledgeDialog
          item={pledge.item}
          initialUnit={pledge.unit}
          onClose={() => setPledge(null)}
          active={active}
        />
      )}
    </main>
  );
}
