import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Armchair,
  Award,
  Bus,
  Dumbbell,
  Goal,
  HeartPulse,
  Home,
  Mail,
  Receipt,
  Shirt,
  Sparkles,
  Tag,
  ThumbsUp,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";

import { PageHero, heroOverlapCls } from "@/components/ui-kit";
import {
  ADOPT_CATEGORY_LABEL,
  ADOPT_ITEMS,
  ADOPT_RECOGNITION,
  ADOPT_STATE_LABEL,
  ADOPTER_KIND_LABEL,
  adoptMailto,
  catalogueTotals,
  effectiveState,
  priceLabel,
  progressPct,
  remaining,
  sortForCatalogue,
  type AdoptCategory,
  type AdoptItem,
  type AdoptState,
  type AdopterKind,
} from "@/lib/adopt-items";
import { CLUB_PROFILE } from "@/lib/club-profile";

export const Route = createFileRoute("/adotta")({
  head: () => ({
    meta: [
      { title: "Adotta un oggetto — S.C.D. ColicoDerviese" },
      {
        name: "description",
        content:
          "Porte, palloni, materiale tecnico, defibrillatore, kit di una squadra, un pulmino: scegli cosa adottare per i ragazzi della S.C.D. ColicoDerviese. Targhetta, attestato e ricevuta per ogni adozione.",
      },
      {
        property: "og:title",
        content: "Adotta un oggetto — S.C.D. ColicoDerviese",
      },
      {
        property: "og:description",
        content:
          "Il catalogo delle cose di cui il club ha bisogno, aperto a famiglie, tifosi e aziende.",
      },
    ],
  }),
  component: Adotta,
});

const CATEGORY_ICON: Readonly<Record<AdoptCategory, LucideIcon>> = {
  campo: Goal,
  allenamento: Dumbbell,
  sicurezza: HeartPulse,
  squadra: Shirt,
  trasporti: Bus,
  "club-house": Home,
};

const ITEM_ICON: Readonly<Record<string, LucideIcon>> = { panchina: Armchair };

const RECOGNITION_ICON: Readonly<Record<string, LucideIcon>> = {
  targhetta: Tag,
  attestato: Award,
  social: ThumbsUp,
  ricevuta: Receipt,
};

const STATE_CLS: Readonly<Record<AdoptState, string>> = {
  DA_ADOTTARE: "bg-scd-yellow text-[#0b1f4d]",
  IN_ADOZIONE: "bg-sky-100 text-sky-900",
  ADOTTATO: "bg-emerald-100 text-emerald-900",
  CONSEGNATO: "bg-muted text-foreground",
};

const KINDS: readonly AdopterKind[] = ["famiglia", "tifoso", "azienda"];

function Adotta() {
  const [kind, setKind] = useState<AdopterKind>("famiglia");
  const [cat, setCat] = useState<AdoptCategory | "tutte">("tutte");
  const items = sortForCatalogue(ADOPT_ITEMS).filter(
    (i) => cat === "tutte" || i.category === cat,
  );
  const totals = catalogueTotals(ADOPT_ITEMS);
  const usedCats = (
    Object.keys(ADOPT_CATEGORY_LABEL) as AdoptCategory[]
  ).filter((c) => ADOPT_ITEMS.some((i) => i.category === c));

  return (
    <main>
      <PageHero
        eyebrow="Adotta un oggetto"
        title={
          <>
            Un gesto concreto, <span className="text-accent">in campo</span>{" "}
            ogni giorno.
          </>
        }
        motif="mountains-lake"
        clamp={false}
      >
        Scegli una cosa di cui i ragazzi hanno bisogno e adottala. Nessun
        pagamento online: ci scrivi, la società ti risponde e la tesoreria
        rilascia la ricevuta.
      </PageHero>

      <section
        className={`${heroOverlapCls} mx-auto grid max-w-6xl grid-cols-3 gap-3 px-4`}
        aria-label="Come funziona"
      >
        {[
          { n: "1", t: "Scegli", d: "Un oggetto dal catalogo" },
          { n: "2", t: "Scrivici", d: "Mail già pronta alla società" },
          { n: "3", t: "Ricevi", d: "Targhetta, attestato, ricevuta" },
        ].map((s) => (
          <div key={s.n} className="card-premium p-4">
            <p className="font-display text-2xl font-bold text-primary">
              {s.n}
            </p>
            <p className="mt-1 font-display text-sm font-bold uppercase">
              {s.t}
            </p>
            <p className="text-xs text-muted-foreground">{s.d}</p>
          </div>
        ))}
      </section>

      <section
        className="mx-auto mt-10 max-w-6xl px-4"
        aria-labelledby="adotta-chi"
      >
        <h2
          id="adotta-chi"
          className="text-sm font-semibold uppercase tracking-wider text-muted-foreground"
        >
          Adotto come
        </h2>
        <div
          className="mt-2 flex flex-wrap gap-2"
          role="radiogroup"
          aria-label="Adotto come"
        >
          {KINDS.map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              onClick={() => setKind(k)}
              className={`min-h-11 rounded-full border px-4 text-sm font-semibold ${kind === k ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
            >
              {ADOPTER_KIND_LABEL[k]}
            </button>
          ))}
        </div>
        {kind === "azienda" && (
          <p className="mt-2 text-sm text-muted-foreground">
            Per le aziende l'adozione entra nei pacchetti partner:{" "}
            <Link
              to="/sponsor"
              className="font-semibold text-primary underline"
            >
              vedi tutte le formule sponsor
            </Link>
            .
          </p>
        )}
      </section>

      <section
        className="mx-auto mt-8 max-w-6xl px-4"
        aria-labelledby="adotta-catalogo"
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Catalogo 2026/27</p>
            <h2 id="adotta-catalogo" className="mt-1 text-3xl font-bold">
              Cosa serve ai ragazzi
            </h2>
          </div>
          <p
            className="text-sm text-muted-foreground"
            data-testid="adotta-totals"
          >
            {totals.open} da adottare · {totals.adopted} adottati ·{" "}
            {totals.delivered} consegnati
          </p>
        </div>

        <div
          className="mt-4 flex gap-2 overflow-x-auto pb-1"
          role="tablist"
          aria-label="Categorie"
        >
          {(["tutte", ...usedCats] as const).map((c) => (
            <button
              key={c}
              type="button"
              role="tab"
              aria-selected={cat === c}
              onClick={() => setCat(c)}
              className={`min-h-10 shrink-0 rounded-lg border px-3 text-sm font-semibold ${cat === c ? "border-primary bg-primary/10 text-primary" : "border-border bg-card"}`}
            >
              {c === "tutte" ? "Tutte" : ADOPT_CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>

        <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((i) => (
            <AdoptCard key={i.id} item={i} kind={kind} />
          ))}
        </ul>
        <p className="mt-4 text-xs text-muted-foreground">
          Prezzi e quantità li indica la società: dove non c'è un importo ti
          rispondiamo con il valore aggiornato. Lo stato degli oggetti si
          aggiorna quando la tesoreria registra l'adozione.
        </p>
      </section>

      <section
        className="mx-auto mt-14 max-w-6xl px-4"
        aria-labelledby="adotta-grazie"
      >
        <p className="eyebrow">Il nostro grazie</p>
        <h2 id="adotta-grazie" className="mt-1 text-3xl font-bold">
          Cosa ricevi
        </h2>
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          {ADOPT_RECOGNITION.map((r) => {
            const Icon = RECOGNITION_ICON[r.id] ?? Sparkles;
            return (
              <div
                key={r.id}
                className="rounded-2xl border border-border bg-card p-4"
              >
                <Icon className="size-5 text-primary" aria-hidden="true" />
                <p className="mt-2 font-display text-sm font-bold uppercase">
                  {r.title}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{r.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto my-14 max-w-6xl px-4">
        <div className="surface-deep flex flex-col gap-3 rounded-2xl p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-xl font-bold">
              Hai un'idea che non è in elenco?
            </p>
            <p className="text-sm text-white/85">
              Scrivici: valutiamo insieme dove serve di più.
            </p>
          </div>
          <a
            href={`mailto:${CLUB_PROFILE.contacts.email}?subject=${encodeURIComponent("Adotta un oggetto · proposta")}`}
            className="surface-sun inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold uppercase"
          >
            <Mail className="size-4" aria-hidden="true" />
            Scrivi alla società
          </a>
        </div>
      </section>
    </main>
  );
}

function AdoptCard({ item, kind }: { item: AdoptItem; kind: AdopterKind }) {
  const state = effectiveState(item);
  const Icon = ITEM_ICON[item.id] ?? CATEGORY_ICON[item.category];
  const open = state === "DA_ADOTTARE" || state === "IN_ADOZIONE";
  const left = remaining(item);
  return (
    <li
      className="flex flex-col rounded-2xl border border-border bg-card p-5"
      data-testid={`adotta-${item.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className="grid size-14 place-items-center rounded-xl bg-primary/10 text-primary"
          aria-hidden="true"
        >
          <Icon className="size-7" />
        </span>
        <span
          className={`rounded-full px-2.5 py-1 text-[0.7rem] font-bold uppercase ${STATE_CLS[state]}`}
        >
          {ADOPT_STATE_LABEL[state]}
        </span>
      </div>
      <p className="mt-3 text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">
        {ADOPT_CATEGORY_LABEL[item.category]}
      </p>
      <h3 className="mt-0.5 text-lg font-bold leading-tight">{item.name}</h3>
      <p className="mt-1 flex-1 text-sm text-muted-foreground">
        {item.purpose}
      </p>
      <p className="mt-3 font-display text-base font-bold">
        {priceLabel(item.priceEur)}
      </p>
      {item.needed > 1 && (
        <div className="mt-2">
          <div
            className="h-2 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPct(item)}
            aria-label={`${item.name}: adottati ${item.adopted} su ${item.needed}`}
          >
            <div
              className="h-full bg-primary"
              style={{ width: `${progressPct(item)}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {left > 0 ? `Ne mancano ${left} su ${item.needed}` : "Completato"}
          </p>
        </div>
      )}
      {item.publicName && state !== "DA_ADOTTARE" && (
        <p className="mt-2 text-sm">
          Grazie a <b>{item.publicName}</b>
        </p>
      )}
      {item.shareable && open && (
        <p className="mt-2 text-xs text-muted-foreground">
          Si può adottare anche in più persone.
        </p>
      )}
      {open ? (
        <a
          href={adoptMailto(item, kind)}
          className="surface-sun mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold uppercase"
          aria-label={`Adotta ${item.name}: apre una mail alla società`}
        >
          <Mail className="size-4" aria-hidden="true" />
          Adotto io
        </a>
      ) : (
        <p className="mt-4 rounded-lg bg-muted px-3 py-2 text-center text-sm font-semibold">
          Grazie! Già adottato
        </p>
      )}
    </li>
  );
}
