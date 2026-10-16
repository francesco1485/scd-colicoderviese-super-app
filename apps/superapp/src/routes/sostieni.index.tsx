import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Building2,
  HeartHandshake,
  Lightbulb,
  Package,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";

import {
  CampaignCard,
  ItemCard,
  NotActiveNote,
  PledgeDialog,
  btnLine,
  btnSun,
} from "@/components/giving/public";
import { ShareButton } from "@/components/scd/ShareButton";
import { TribuneSeatsSection } from "@/components/giving/TribuneSeats";
import { PageHero, heroOverlapCls } from "@/components/ui-kit";
import {
  CATEGORY_LABEL,
  ITEM_CATEGORIES,
  ITEM_STATUS_LABEL,
  PROPOSAL_AREA_LABEL,
  PROPOSAL_STATUS_LABEL,
  type PublicItem,
} from "@/lib/giving";
import { getGivingPublic } from "@/lib/giving.functions";
import { pageHead, SHARE_PAGES } from "@/lib/share";
import { INTERNAL_ONLY } from "@/lib/internal-initiatives";
import { findTribuneItem, tribuneDraftItem } from "@/lib/tribune-seats";

/**
 * Sostieni il club (UD-113, SCD ONE): Fondo Solidale, "Adotta un oggetto", campaigns palestra / infermeria (goods),
 * improvement proposals. Public, no payment in the app. Until r101 is applied the page shows its structure and
 * "Da attivare"; no item, amount or name is invented.
 */
export const Route = createFileRoute("/sostieni/")({
  loader: () => getGivingPublic(),
  head: () => pageHead(SHARE_PAGES.sostieni),
  component: SostieniPage,
});

const HOW = [
  {
    icon: HeartHandshake,
    t: "Adotta un oggetto",
    d: "Da solo o insieme ad altri: ogni contributo avvicina l'obiettivo.",
  },
  {
    icon: Package,
    t: "Dona materiale",
    d: "Attrezzi per la palestra, materiale e arredi per l'infermeria.",
  },
  {
    icon: Lightbulb,
    t: "Proponi un'idea",
    d: "Segnala cosa servirebbe al club, anche in forma anonima.",
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
        className={`${heroOverlapCls} mx-auto grid max-w-6xl grid-cols-1 gap-3 px-4 sm:grid-cols-3`}
      >
        {HOW.map((x) => (
          <div key={x.t} className="card-premium p-4">
            <x.icon className="size-5 text-primary" aria-hidden="true" />
            <p className="mt-2 font-display text-sm font-bold uppercase">
              {x.t}
            </p>
            <p className="m-0 text-xs text-muted-foreground">{x.d}</p>
          </div>
        ))}
      </section>

      {!active && (
        <div className="mx-auto mt-8 max-w-6xl px-4">
          <NotActiveNote>
            Le pagine sono pronte: catalogo, campagne e proposte si accendono
            quando la Direzione dà l'OK.
          </NotActiveNote>
        </div>
      )}

      {!INTERNAL_ONLY.seatAdoption && (
        <TribuneSeatsSection
          item={tribune}
          active={active}
          onAdopt={(unit) => {
            // Not active: the draft item opens the same dialog, which answers "Da attivare" and sends nothing.
            const item = tribune ?? (active ? null : tribuneDraftItem());
            if (item) setPledge({ item, unit });
          }}
        />
      )}

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
            .map((s) => ITEM_STATUS_LABEL[s].toLowerCase())
            .join(", ")}
          . Più persone possono adottare lo stesso oggetto; alcuni sono divisi
          in unità.
        </p>
        {items.length > 0 ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {items.map((i) => (
              <ItemCard
                key={i.id}
                item={i}
                onAdopt={(it) => setPledge({ item: it, unit: null })}
              />
            ))}
          </div>
        ) : (
          <div
            className="mt-6 rounded-2xl border border-dashed border-border bg-card p-5"
            data-testid="adopt-empty"
          >
            <p className="m-0 font-semibold">
              {active
                ? tribune
                  ? "Altri oggetti in arrivo."
                  : "Il catalogo è in preparazione."
                : "Catalogo da attivare."}
            </p>
            <p className="m-0 mt-1 text-sm text-muted-foreground">
              Le categorie:{" "}
              {ITEM_CATEGORIES.map((c) => CATEGORY_LABEL[c]).join(" · ")}.
            </p>
          </div>
        )}
        <p className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
          <Building2 className="mt-0.5 size-4 flex-none" aria-hidden="true" />
          <span>
            Sei un'azienda?{" "}
            <Link
              to="/sponsor"
              hash="proposta"
              className="font-semibold text-primary underline"
            >
              Passa dall'area sponsor
            </Link>
            : ti proponiamo visibilità e un accordo su misura.
          </span>
        </p>
      </section>

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

      <section className="mx-auto mt-14 grid max-w-6xl gap-4 px-4 md:grid-cols-2">
        <article
          className="surface-deep rounded-2xl p-6 shadow-premium"
          data-testid="fondo-teaser"
        >
          <p className="eyebrow">Fondo Solidale</p>
          <h2 className="mt-1 text-2xl font-bold">
            Nessun ragazzo resta fuori per la quota
          </h2>
          <p className="mt-2 text-sm opacity-85">
            Il Fondo aiuta le famiglie in difficoltà a pagare la quota. Domande
            e decisioni restano riservate alla Direzione.
          </p>
          <Link to="/sostieni/fondo-solidale" className={`${btnSun} mt-4`}>
            Come funziona
          </Link>
        </article>
        <article className="card-premium p-6" data-testid="proponi-teaser">
          <p className="eyebrow">Proponi un miglioramento</p>
          <h2 className="mt-1 text-2xl font-bold">
            Hai visto qualcosa che manca?
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Campi, palestra, infermeria, club house, sicurezza: scrivici, anche
            senza nome. Le proposte non sono pubbliche finché lo staff non le
            pubblica.
          </p>
          <Link to="/sostieni/proponi" className={`${btnLine} mt-4`}>
            Proponi
          </Link>
        </article>
      </section>

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
